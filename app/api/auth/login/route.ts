import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 })
    }

    const db = await connectDB()
    const users = db.collection("users")

    // Trouver l'utilisateur
    const user = await users.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 })
    }

    // Générer les tokens JWT
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "15m" },
    )

    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret", {
      expiresIn: "7d",
    })

    // Sauvegarder le refresh token
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          refreshToken,
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      message: "Connexion réussie",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
