"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, MapPin, Droplets, Zap, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Zone {
  _id?: string
  name: string
  plantType: string
  soilType: string
  location: { lat: number; lng: number }
  area: number
  plantCount: number
  aiEnabled: boolean
  deviceId: string
  description?: string
}

interface Device {
  deviceId: string
  maxZones: number
  configuredZones: number
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [formData, setFormData] = useState<Zone>({
    name: "",
    plantType: "",
    soilType: "",
    location: { lat: 0, lng: 0 },
    area: 0,
    plantCount: 0,
    aiEnabled: false,
    deviceId: "",
    description: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [zonesRes, devicesRes] = await Promise.all([fetch("/api/zones"), fetch("/api/devices")])

      const zonesData = await zonesRes.json()
      const devicesData = await devicesRes.json()

      setZones(zonesData.zones || [])
      setDevices(devicesData.devices || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Vérifier les limites
    const selectedDevice = devices.find((d) => d.deviceId === formData.deviceId)
    if (selectedDevice && selectedDevice.configuredZones >= selectedDevice.maxZones && !editingZone) {
      toast({
        title: "Limite atteinte",
        description: `Ce dispositif a atteint sa limite de ${selectedDevice.maxZones} zones`,
        variant: "destructive",
      })
      return
    }

    try {
      const url = editingZone ? `/api/zones/${editingZone._id}` : "/api/zones"
      const method = editingZone ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la sauvegarde")
      }

      toast({
        title: "Succès",
        description: editingZone ? "Zone modifiée avec succès" : "Zone créée avec succès",
      })

      setIsDialogOpen(false)
      setEditingZone(null)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (zoneId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette zone ?")) return

    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      toast({
        title: "Succès",
        description: "Zone supprimée avec succès",
      })

      fetchData()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la zone",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      plantType: "",
      soilType: "",
      location: { lat: 0, lng: 0 },
      area: 0,
      plantCount: 0,
      aiEnabled: false,
      deviceId: "",
      description: "",
    })
  }

  const openEditDialog = (zone: Zone) => {
    setEditingZone(zone)
    setFormData(zone)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingZone(null)
    resetForm()
    setIsDialogOpen(true)
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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Zones</h1>
          <p className="text-gray-600">Configurez et gérez vos zones d'irrigation</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingZone ? "Modifier la Zone" : "Créer une Nouvelle Zone"}</DialogTitle>
              <DialogDescription>Configurez les paramètres de votre zone d'irrigation</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de la zone</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deviceId">Dispositif</Label>
                  <Select
                    value={formData.deviceId}
                    onValueChange={(value) => setFormData({ ...formData, deviceId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un dispositif" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.deviceId} ({device.configuredZones}/{device.maxZones} zones)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="plantType">Type de plante</Label>
                  <Select
                    value={formData.plantType}
                    onValueChange={(value) => setFormData({ ...formData, plantType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tomates">Tomates</SelectItem>
                      <SelectItem value="laitue">Laitue</SelectItem>
                      <SelectItem value="carottes">Carottes</SelectItem>
                      <SelectItem value="herbes">Herbes aromatiques</SelectItem>
                      <SelectItem value="fleurs">Fleurs</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="soilType">Type de sol</Label>
                  <Select
                    value={formData.soilType}
                    onValueChange={(value) => setFormData({ ...formData, soilType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="argileux">Argileux</SelectItem>
                      <SelectItem value="sableux">Sableux</SelectItem>
                      <SelectItem value="limoneux">Limoneux</SelectItem>
                      <SelectItem value="humifere">Humifère</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="area">Surface (m²)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="plantCount">Nombre de plants</Label>
                  <Input
                    id="plantCount"
                    type="number"
                    value={formData.plantCount}
                    onChange={(e) => setFormData({ ...formData, plantCount: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="aiEnabled"
                    checked={formData.aiEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
                  />
                  <Label htmlFor="aiEnabled">IA activée</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    value={formData.location.lat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, lat: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.000001"
                    value={formData.location.lng}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location: { ...formData.location, lng: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la zone..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">{editingZone ? "Modifier" : "Créer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <Card key={zone._id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{zone.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {zone.aiEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      IA
                    </Badge>
                  )}
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(zone)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(zone._id!)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardDescription>Device: {zone.deviceId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Type de plante</p>
                  <p className="text-gray-600">{zone.plantType}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Type de sol</p>
                  <p className="text-gray-600">{zone.soilType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{zone.area}m²</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span>{zone.plantCount} plants</span>
                </div>
              </div>

              {zone.location.lat !== 0 && zone.location.lng !== 0 && (
                <div className="text-xs text-gray-500">
                  <p>
                    Coordonnées: {zone.location.lat.toFixed(6)}, {zone.location.lng.toFixed(6)}
                  </p>
                </div>
              )}

              {zone.description && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{zone.description}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone configurée</h3>
            <p className="text-gray-500 mb-4">Créez votre première zone d'irrigation</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une zone
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Device Limits Warning */}
      {devices.some((d) => d.configuredZones >= d.maxZones) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Attention: Certains dispositifs ont atteint leur limite de zones</p>
            </div>
            <div className="mt-2 space-y-1">
              {devices
                .filter((d) => d.configuredZones >= d.maxZones)
                .map((device) => (
                  <p key={device.deviceId} className="text-sm text-yellow-700">
                    • {device.deviceId}: {device.configuredZones}/{device.maxZones} zones utilisées
                  </p>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
