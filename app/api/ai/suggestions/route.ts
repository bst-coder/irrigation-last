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
    const sensorsData = db.collection("sensorsData")

    // Récupérer les zones de l'utilisateur
    const userZones = await zones.find({ ownerUserId: new ObjectId(user.userId) }).toArray()

    // Récupérer les données récentes des capteurs
    const recentData = await sensorsData
      .find({
        zoneId: { $in: userZones.map((z) => z._id) },
        timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Dernières 2h
      })
      .sort({ timestamp: -1 })
      .toArray()

    const suggestions = []

    // Analyser chaque zone pour générer des suggestions
    for (const zone of userZones) {
      const zoneData = recentData.filter((d) => d.zoneId.toString() === zone._id.toString())

      if (zoneData.length === 0) {
        suggestions.push({
          id: `${zone._id}_no_data`,
          type: "warning",
          message: "Aucune donnée récente reçue des capteurs",
          zoneName: zone.name,
          priority: "medium",
          acknowledged: false,
        })
        continue
      }

      const latestData = zoneData[0]
      const soilMoisture = latestData.locals?.[0]?.soilMoisture || 0
      const temperature = latestData.global?.temp || 0

      // Suggestions basées sur l'humidité du sol
      if (soilMoisture < 20) {
        suggestions.push({
          id: `${zone._id}_low_moisture`,
          type: "critical",
          message: `Humidité du sol très faible (${soilMoisture}%) - Arrosage urgent requis`,
          zoneName: zone.name,
          action: "START_IRRIGATION",
          priority: "high",
          acknowledged: false,
        })
      } else if (soilMoisture > 80) {
        suggestions.push({
          id: `${zone._id}_high_moisture`,
          type: "warning",
          message: `Humidité du sol très élevée (${soilMoisture}%) - Risque de sur-arrosage`,
          zoneName: zone.name,
          action: "STOP_IRRIGATION",
          priority: "medium",
          acknowledged: false,
        })
      }

      // Suggestions basées sur la température
      if (temperature > 35) {
        suggestions.push({
          id: `${zone._id}_high_temp`,
          type: "warning",
          message: `Température élevée (${temperature}°C) - Augmenter la fréquence d'arrosage`,
          zoneName: zone.name,
          priority: "medium",
          acknowledged: false,
        })
      } else if (temperature < 5) {
        suggestions.push({
          id: `${zone._id}_low_temp`,
          type: "info",
          message: `Température basse (${temperature}°C) - Réduire l'arrosage`,
          zoneName: zone.name,
          priority: "low",
          acknowledged: false,
        })
      }
    }

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Get AI suggestions error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
