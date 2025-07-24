"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Zap, AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  suggestions?: AISuggestion[]
}

interface AISuggestion {
  id: string
  type: "critical" | "warning" | "info"
  message: string
  zoneName: string
  action?: string
  acknowledged: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchSuggestions()
    // Message de bienvenue
    setMessages([
      {
        id: "1",
        type: "ai",
        content:
          "Bonjour ! Je suis votre assistant IA pour le système d'irrigation. Je peux vous aider à optimiser l'arrosage de vos zones, analyser les données des capteurs et vous donner des conseils personnalisés. Comment puis-je vous aider aujourd'hui ?",
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchSuggestions = async () => {
    try {
      const response = await fetch("/api/ai/suggestions")
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error("Erreur lors de la communication avec l'IA")

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions,
      }

      setMessages((prev) => [...prev, aiMessage])

      if (data.suggestions) {
        setSuggestions((prev) => [...prev, ...data.suggestions])
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch("/api/ai/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      })

      if (!response.ok) throw new Error("Erreur lors de l'accusé de réception")

      setSuggestions((prev) => prev.map((s) => (s.id === suggestionId ? { ...s, acknowledged: true } : s)))

      toast({
        title: "Succès",
        description: "Suggestion prise en compte",
      })
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Zap className="w-4 h-4 text-blue-500" />
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Assistant IA Irrigation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            message.type === "user" ? "bg-blue-500" : "bg-green-500"
                          }`}
                        >
                          {message.type === "user" ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.type === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.type === "user" ? "text-blue-100" : "text-gray-500"}`}>
                            {message.timestamp.toLocaleTimeString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question sur l'irrigation..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Suggestions Actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {suggestions
                    .filter((s) => !s.acknowledged)
                    .map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`p-3 rounded-lg border ${getSuggestionColor(suggestion.type)}`}
                      >
                        <div className="flex items-start gap-2">
                          {getSuggestionIcon(suggestion.type)}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{suggestion.message}</p>
                            <p className="text-xs text-gray-600 mt-1">Zone: {suggestion.zoneName}</p>
                            {suggestion.action && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                Action: {suggestion.action}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 bg-transparent"
                          onClick={() => acknowledgeSuggestion(suggestion.id)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accusé de réception
                        </Button>
                      </div>
                    ))}
                  {suggestions.filter((s) => !s.acknowledged).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Aucune suggestion active</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suggestions Traitées</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {suggestions
                    .filter((s) => s.acknowledged)
                    .map((suggestion) => (
                      <div key={suggestion.id} className="p-2 rounded border border-gray-200 bg-gray-50 opacity-75">
                        <p className="text-xs">{suggestion.message}</p>
                        <p className="text-xs text-gray-500">Zone: {suggestion.zoneName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600">Traité</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
