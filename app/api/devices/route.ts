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
    const devices = db.collection("devices")
    const zones = db.collection("zones")

    // Les utilisateurs ne voient que leurs devices
    const filter = user.role === "user" ? { ownerUserId: new ObjectId(user.userId) } : {}

    const userDevices = await devices.find(filter).toArray()

    // Enrichir avec les données des zones
    const enrichedDevices = await Promise.all(
      userDevices.map(async (device) => {
        const deviceZones = await zones.find({ deviceId: device.deviceId }).toArray()
        return {
          ...device,
          zones: deviceZones,
          configuredZones: deviceZones.length,
        }
      }),
    )

    return NextResponse.json({
      devices: enrichedDevices,
      count: enrichedDevices.length,
    })
  } catch (error) {
    console.error("Get devices error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user || (user.role !== "technician" && user.role !== "developer")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { deviceId, ownerUserId } = await request.json()

    if (!deviceId || !ownerUserId) {
      return NextResponse.json({ error: "deviceId et ownerUserId requis" }, { status: 400 })
    }

    const db = await connectDB()
    const devices = db.collection("devices")
    const users = db.collection("users")

    // Vérifier que l'utilisateur propriétaire existe
    const owner = await users.findOne({ _id: new ObjectId(ownerUserId) })
    if (!owner) {
      return NextResponse.json({ error: "Utilisateur propriétaire non trouvé" }, { status: 404 })
    }

    // Vérifier que le device n'existe pas déjà
    const existingDevice = await devices.findOne({ deviceId })
    if (existingDevice) {
      return NextResponse.json({ error: "Ce dispositif est déjà enregistré" }, { status: 409 })
    }

    // Créer le device
    const device = {
      deviceId,
      ownerUserId: new ObjectId(ownerUserId),
      maxZones: 4,
      maxSensors: 12,
      configuredZones: 0,
      status: "offline",
      lastSeen: new Date(),
      firmwareVersion: "1.0.0",
      zones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await devices.insertOne(device)

    // Ajouter le device à l'utilisateur
    await users.updateOne(
      { _id: new ObjectId(ownerUserId) },
      {
        $addToSet: { devices: deviceId },
        $set: { updatedAt: new Date() },
      },
    )

    return NextResponse.json(
      {
        message: "Dispositif enregistré avec succès",
        device: { ...device, _id: result.insertedId },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Register device error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
