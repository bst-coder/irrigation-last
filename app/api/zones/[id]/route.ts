import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const zoneData = await request.json()
    const zoneId = params.id

    if (!ObjectId.isValid(zoneId)) {
      return NextResponse.json({ error: "ID de zone invalide" }, { status: 400 })
    }

    const db = await connectDB()
    const zones = db.collection("zones")

    // Vérifier que la zone existe et appartient à l'utilisateur
    const filter =
      user.role === "user"
        ? { _id: new ObjectId(zoneId), ownerUserId: new ObjectId(user.userId) }
        : { _id: new ObjectId(zoneId) }

    const existingZone = await zones.findOne(filter)
    if (!existingZone) {
      return NextResponse.json({ error: "Zone non trouvée" }, { status: 404 })
    }

    // Mettre à jour la zone
    const updateData = {
      ...zoneData,
      updatedAt: new Date(),
    }

    const result = await zones.updateOne({ _id: new ObjectId(zoneId) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Zone non trouvée" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Zone mise à jour avec succès",
    })
  } catch (error) {
    console.error("Update zone error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const zoneId = params.id

    if (!ObjectId.isValid(zoneId)) {
      return NextResponse.json({ error: "ID de zone invalide" }, { status: 400 })
    }

    const db = await connectDB()
    const zones = db.collection("zones")
    const devices = db.collection("devices")

    // Vérifier que la zone existe et appartient à l'utilisateur
    const filter =
      user.role === "user"
        ? { _id: new ObjectId(zoneId), ownerUserId: new ObjectId(user.userId) }
        : { _id: new ObjectId(zoneId) }

    const zone = await zones.findOne(filter)
    if (!zone) {
      return NextResponse.json({ error: "Zone non trouvée" }, { status: 404 })
    }

    // Supprimer la zone
    await zones.deleteOne({ _id: new ObjectId(zoneId) })

    // Mettre à jour le compteur de zones du device
    await devices.updateOne(
      { deviceId: zone.deviceId },
      {
        $inc: { configuredZones: -1 },
        $pull: { zones: new ObjectId(zoneId) },
        $set: { updatedAt: new Date() },
      },
    )

    return NextResponse.json({
      message: "Zone supprimée avec succès",
    })
  } catch (error) {
    console.error("Delete zone error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
