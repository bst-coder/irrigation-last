"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Droplets, Thermometer, Cloud, Zap, MapPin, Settings } from "lucide-react"
import Link from "next/link"

interface Zone {
  _id: string
  name: string
  plantType: string
  soilType: string
  location: { lat: number; lng: number }
  area: number
  plantCount: number
  aiEnabled: boolean
  status: "active" | "inactive" | "warning"
  lastWatered: string
  soilMoisture: number
  temperature: number
  humidity: number
}

interface Device {
  deviceId: string
  status: "online" | "offline"
  lastSeen: string
  zones: Zone[]
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [weather, setWeather] = useState<any>(null)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [devicesRes, weatherRes, aiRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/weather/forecast"),
        fetch("/api/ai/suggestions"),
      ])

      const devicesData = await devicesRes.json()
      const weatherData = await weatherRes.json()
      const aiData = await aiRes.json()

      setDevices(devicesData.devices || [])
      setWeather(weatherData)
      setAiSuggestions(aiData.suggestions || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Irrigation</h1>
          <p className="text-gray-600">Système d'irrigation automatique avec IA</p>
        </div>
        <div className="flex gap-2">
          <Link href="/zones">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Gérer les Zones
            </Button>
          </Link>
          <Link href="/chat">
            <Button>
              <Zap className="w-4 h-4 mr-2" />
              Assistant IA
            </Button>
          </Link>
        </div>
      </div>

      {/* Weather Card */}
      {weather && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Prévisions Météo (7 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {weather.forecast?.slice(0, 7).map((day: any, index: number) => (
                <div key={index} className="text-center">
                  <p className="font-medium">{new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short" })}</p>
                  <div className="text-2xl my-2">☀️</div>
                  <p className="text-sm">{day.temp}°C</p>
                  <p className="text-xs text-gray-500">{day.humidity}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Suggestions IA Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div>
                    <p className="font-medium text-yellow-800">{suggestion.message}</p>
                    <p className="text-sm text-yellow-600">Zone: {suggestion.zoneName}</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {suggestion.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devices and Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card key={device.deviceId} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Device {device.deviceId}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                  <span className="text-sm text-gray-500">{device.status}</span>
                </div>
              </div>
              <CardDescription>Dernière connexion: {new Date(device.lastSeen).toLocaleString("fr-FR")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {device.zones.map((zone) => (
                  <div key={zone._id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{zone.name}</h4>
                      <div className="flex items-center gap-2">
                        {zone.aiEnabled && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            IA
                          </Badge>
                        )}
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(zone.status)}`}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span>{zone.soilMoisture}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-4 h-4 text-red-500" />
                        <span>{zone.temperature}°C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cloud className="w-4 h-4 text-gray-500" />
                        <span>{zone.humidity}%</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {zone.plantType} • {zone.area}m² • {zone.plantCount} plants
                        </span>
                      </div>
                      <p>Dernier arrosage: {new Date(zone.lastWatered).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {devices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun dispositif connecté</h3>
            <p className="text-gray-500 mb-4">Connectez votre premier ESP32 pour commencer</p>
            <Link href="/config">
              <Button>Configurer un dispositif</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
