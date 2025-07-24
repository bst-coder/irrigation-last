import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"

export interface User {
  userId: string
  email: string
  role: "user" | "technician" | "developer"
}

export async function verifyToken(request: NextRequest): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

export function generateTokens(user: { _id: string; email: string; role: string }) {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "15m" },
  )

  const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret", {
    expiresIn: "7d",
  })

  return { accessToken, refreshToken }
}
