import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 })
    }

    // Récupérer le contexte des zones et capteurs de l'utilisateur
    const db = await connectDB()
    const zones = db.collection("zones")
    const sensorsData = db.collection("sensorsData")

    const userZones = await zones.find({ ownerUserId: user.userId }).toArray()
    const recentSensorData = await sensorsData
      .find({
        zoneId: { $in: userZones.map((z) => z._id) },
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Dernières 24h
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray()

    // Construire le contexte pour l'IA
    const context = {
      zones: userZones.map((zone) => ({
        name: zone.name,
        plantType: zone.plantType,
        soilType: zone.soilType,
        area: zone.area,
        plantCount: zone.plantCount,
        aiEnabled: zone.aiEnabled,
        status: zone.status,
      })),
      recentData: recentSensorData.map((data) => ({
        zoneName: userZones.find((z) => z._id.toString() === data.zoneId.toString())?.name,
        timestamp: data.timestamp,
        soilMoisture: data.locals?.[0]?.soilMoisture,
        temperature: data.global?.temp,
        humidity: data.locals?.[0]?.humidity,
      })),
    }

    const systemPrompt = `Tu es un assistant IA spécialisé dans l'irrigation automatique et l'agriculture de précision. 

Contexte de l'utilisateur:
- Zones: ${JSON.stringify(context.zones, null, 2)}
- Données récentes des capteurs: ${JSON.stringify(context.recentData, null, 2)}

Tu peux:
1. Analyser les données des capteurs et donner des conseils d'irrigation
2. Suggérer des optimisations pour chaque zone
3. Alerter sur les anomalies (sol trop sec/humide, températures extrêmes)
4. Donner des conseils spécifiques selon le type de plante et de sol
5. Proposer des ajustements de planning d'arrosage

Réponds de manière concise et pratique. Si tu détectes des problèmes critiques, propose des actions concrètes.`

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: systemPrompt,
      prompt: message,
    })

    // Analyser la réponse pour détecter des suggestions critiques
    const suggestions = []
    if (text.toLowerCase().includes("urgent") || text.toLowerCase().includes("critique")) {
      suggestions.push({
        id: Date.now().toString(),
        type: "critical",
        message: "Action urgente détectée par l'IA",
        zoneName: "Multiple",
        acknowledged: false,
      })
    }

    return NextResponse.json({
      response: text,
      suggestions,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("AI chat error:", error)
    return NextResponse.json({ error: "Erreur lors de la communication avec l'IA" }, { status: 500 })
  }
}
