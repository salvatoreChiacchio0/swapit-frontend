"use client"

import { auth } from "./firebase"

const CHAT_BASE_URL = "http://localhost:3001"

async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user for chat API")
  return user.getIdToken()
}

export async function getUserChats(userId: string) {
  const token = await getIdToken()
  const res = await fetch(`${CHAT_BASE_URL}/chat/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error(`Chat API error ${res.status}`)
  return res.json()
}

export async function createMessage(receiverId: string, content: string) {
  const token = await getIdToken()
  const res = await fetch(`${CHAT_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ receiverId, content }),
  })
  if (!res.ok) throw new Error(`Chat API error ${res.status}`)
  return res.json()
}



