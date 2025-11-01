"use client"

import { io, Socket } from "socket.io-client"
import { auth } from "./firebase"

let socket: Socket | null = null

async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("No authenticated user for chat connection")
  return user.getIdToken()
}

export async function connectChat(): Promise<Socket> {
  if (socket && socket.connected) return socket
  const token = await getIdToken()
  socket = io("ws://localhost:3001", {
    transports: ["websocket"],
    auth: { token },
    withCredentials: true,
  })
  return socket
}

export function onReceive(handler: (message: any) => void) {
  if (!socket) return
  socket.on("receive", handler)
}

export async function sendMessage(receiverId: string, content: string) {
  if (!socket || !socket.connected) {
    await connectChat()
  }
  socket!.emit("send", { receiverId, content })
}

export function disconnectChat() {
  if (socket) {
    socket.off("receive")
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}



