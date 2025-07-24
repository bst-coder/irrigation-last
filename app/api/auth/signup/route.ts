import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = "user" } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 })
    }

    const db = await connectDB()
    const users = db.collection("users")

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà" }, { status: 409 })
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = {
      name,
      email,
      passwordHash,
      role,
      devices: [],
      zones: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await users.insertOne(user)

    // Générer les tokens JWT
    const accessToken = jwt.sign(
      { userId: result.insertedId, email, role },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "15m" },
    )

    const refreshToken = jwt.sign(
      { userId: result.insertedId },
      process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret",
      { expiresIn: "7d" },
    )

    // Sauvegarder le refresh token
    await users.updateOne({ _id: result.insertedId }, { $set: { refreshToken, updatedAt: new Date() } })

    return NextResponse.json(
      {
        message: "Utilisateur créé avec succès",
        user: {
          id: result.insertedId,
          name,
          email,
          role,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
