import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    // Authentification par token device ou utilisateur
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Token d'authentification requis" }, { status: 401 })
    }

    const sensorData = await request.json()
    const { deviceId, timestamp, sensorData: data } = sensorData

    if (!deviceId || !data) {
      return NextResponse.json({ error: "deviceId et sensorData requis" }, { status: 400 })
    }

    const db = await connectDB()
    const devices = db.collection("devices")
    const zones = db.collection("zones")
    const sensorsData = db.collection("sensorsData")

    // Vérifier que le device existe
    const device = await devices.findOne({ deviceId })
    if (!device) {
      return NextResponse.json({ error: "Dispositif non trouvé" }, { status: 404 })
    }

    // Récupérer les zones du device
    const deviceZones = await zones.find({ deviceId }).toArray()

    // Enregistrer les données pour chaque zone
    const insertPromises = deviceZones.map(async (zone, index) => {
      const zoneData = {
        zoneId: zone._id,
        deviceId,
        timestamp: new Date(timestamp || Date.now()),
        global: data.global || {},
        locals: data.locals || [],
      }

      return sensorsData.insertOne(zoneData)
    })

    await Promise.all(insertPromises)

    // Mettre à jour le statut du device
    await devices.updateOne(
      { deviceId },
      {
        $set: {
          status: "online",
          lastSeen: new Date(),
          updatedAt: new Date(),
        },
      },
    )

    // Mettre à jour les données en temps réel des zones
    if (data.locals && data.locals.length > 0) {
      const updatePromises = deviceZones.map(async (zone, index) => {
        const localData = data.locals[index] || data.locals[0]

        return zones.updateOne(
          { _id: zone._id },
          {
            $set: {
              soilMoisture: localData.soilMoisture || 0,
              temperature: data.global?.temp || localData.temp || 0,
              humidity: localData.humidity || 0,
              updatedAt: new Date(),
            },
          },
        )
      })

      await Promise.all(updatePromises)
    }

    return NextResponse.json({
      message: "Données enregistrées avec succès",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Sensor data error:", error)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement des données" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get("zoneId")
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!zoneId) {
      return NextResponse.json({ error: "zoneId requis" }, { status: 400 })
    }

    const db = await connectDB()
    const sensorsData = db.collection("sensorsData")
    const zones = db.collection("zones")

    // Vérifier que la zone appartient à l'utilisateur
    const zone = await zones.findOne({
      _id: new ObjectId(zoneId),
      ownerUserId: new ObjectId(user.userId),
    })

    if (!zone) {
      return NextResponse.json({ error: "Zone non trouvée" }, { status: 404 })
    }

    // Construire le filtre de date
    const dateFilter: any = { zoneId: new ObjectId(zoneId) }
    if (start || end) {
      dateFilter.timestamp = {}
      if (start) dateFilter.timestamp.$gte = new Date(start)
      if (end) dateFilter.timestamp.$lte = new Date(end)
    }

    // Récupérer les données
    const data = await sensorsData
      .find(dateFilter)
      .sort({ timestamp: -1 })
      .limit(1000) // Limiter à 1000 points de données
      .toArray()

    return NextResponse.json({
      data,
      count: data.length,
      zone: {
        id: zone._id,
        name: zone.name,
        plantType: zone.plantType,
      },
    })
  } catch (error) {
    console.error("Get sensor data error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des données" }, { status: 500 })
  }
}
