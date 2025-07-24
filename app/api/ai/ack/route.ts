import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { suggestionId } = await request.json()

    if (!suggestionId) {
      return NextResponse.json({ error: "ID de suggestion requis" }, { status: 400 })
    }

    const db = await connectDB()
    const aiCommands = db.collection("aiCommands")

    // Enregistrer l'accusé de réception
    const ackRecord = {
      suggestionId,
      userId: user.userId,
      acknowledgedAt: new Date(),
      status: "acknowledged",
    }

    await aiCommands.insertOne(ackRecord)

    return NextResponse.json({
      message: "Suggestion accusée de réception",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("AI acknowledgment error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
