import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

// Cache simple en mémoire (en production, utiliser Redis)
let weatherCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier le cache
    if (weatherCache && Date.now() - weatherCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(weatherCache.data)
    }

    // Simuler des données météo (en production, utiliser une vraie API météo)
    const forecast = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      forecast.push({
        date: date.toISOString(),
        temp: Math.round(15 + Math.random() * 20), // 15-35°C
        humidity: Math.round(40 + Math.random() * 40), // 40-80%
        precipitation: Math.random() > 0.7 ? Math.round(Math.random() * 10) : 0, // 0-10mm
        windSpeed: Math.round(Math.random() * 20), // 0-20 km/h
        condition: ["sunny", "cloudy", "rainy", "partly-cloudy"][Math.floor(Math.random() * 4)],
      })
    }

    const weatherData = {
      location: "Votre région",
      forecast,
      lastUpdated: new Date(),
      source: "Service météo simulé",
    }

    // Mettre en cache
    weatherCache = {
      data: weatherData,
      timestamp: Date.now(),
    }

    return NextResponse.json(weatherData)
  } catch (error) {
    console.error("Weather forecast error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des prévisions météo" }, { status: 500 })
  }
}
