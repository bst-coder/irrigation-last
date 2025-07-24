import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const db = await connectDB()
    const zones = db.collection("zones")

    // Les utilisateurs ne voient que leurs zones
    // Les techniciens et développeurs voient toutes les zones
    const filter = user.role === "user" ? { ownerUserId: new ObjectId(user.userId) } : {}

    const userZones = await zones.find(filter).toArray()

    return NextResponse.json({
      zones: userZones,
      count: userZones.length,
    })
  } catch (error) {
    console.error("Get zones error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const zoneData = await request.json()
    const { name, plantType, soilType, location, area, plantCount, aiEnabled, deviceId, description } = zoneData

    if (!name || !plantType || !soilType || !deviceId) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
    }

    const db = await connectDB()
    const zones = db.collection("zones")
    const devices = db.collection("devices")

    // Vérifier que le device existe et appartient à l'utilisateur
    const device = await devices.findOne({ deviceId })
    if (!device) {
      return NextResponse.json({ error: "Dispositif non trouvé" }, { status: 404 })
    }

    // Vérifier les limites de zones (4 max par device)
    const existingZones = await zones.countDocuments({ deviceId })
    if (existingZones >= device.maxZones) {
      return NextResponse.json(
        { error: `Ce dispositif a atteint sa limite de ${device.maxZones} zones` },
        { status: 400 },
      )
    }

    // Créer la zone
    const zone = {
      name,
      plantType,
      soilType,
      location: location || { lat: 0, lng: 0 },
      area: Number(area),
      plantCount: Number(plantCount),
      aiEnabled: Boolean(aiEnabled),
      deviceId,
      description: description || "",
      ownerUserId: new ObjectId(user.userId),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastWatered: new Date(),
      soilMoisture: 0,
      temperature: 0,
      humidity: 0,
    }

    const result = await zones.insertOne(zone)

    // Mettre à jour le compteur de zones du device
    await devices.updateOne(
      { deviceId },
      {
        $inc: { configuredZones: 1 },
        $addToSet: { zones: result.insertedId },
        $set: { updatedAt: new Date() },
      },
    )

    return NextResponse.json(
      {
        message: "Zone créée avec succès",
        zone: { ...zone, _id: result.insertedId },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Create zone error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
