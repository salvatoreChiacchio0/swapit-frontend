"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { Calendar, Clock, CheckCircle, X, MessageSquare, ArrowRight, Send } from "lucide-react"
import { useApiCall, apiClient } from "@/lib/api"

// UI model remains, but we'll map from backend DTOs
interface UISwapProposal {
  id: number
  fromUserUid: string
  toUserUid: string
  skillOfferedId: number
  skillRequestedId: number
  presentationLetter?: string | null
  date: string
  startTime: string
  endTime: string
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED"
  type: "sent" | "received"
}

// Mock data for proposals
const mockProposals: SwapProposal[] = [
  {
    id: "1",
    fromUser: {
      id: "2",
      name: "Sarah Chen",
      avatar: "/professional-woman.png",
      rating: 4.9,
    },
    toUser: {
      id: "1",
      name: "John Doe",
      avatar: "/professional-headshot.png",
      rating: 4.8,
    },
    skillOffered: "Spanish",
    skillWanted: "JavaScript",
    message:
      "Hi! I'd love to help you learn Spanish in exchange for JavaScript lessons. I'm particularly interested in React and modern web development. I'm available most evenings and weekends.",
    proposedDate: "2025-01-15",
    proposedTime: "18:00",
    duration: "1 hour",
    status: "pending",
    createdAt: "2025-01-10",
    type: "received",
    proposerId: "2",
    receiverId: "1",
  },
  {
    id: "2",
    fromUser: {
      id: "1",
      name: "John Doe",
      avatar: "/professional-headshot.png",
      rating: 4.8,
    },
    toUser: {
      id: "3",
      name: "Marcus Johnson",
      avatar: "/man-photographer.png",
      rating: 4.7,
    },
    skillOffered: "React",
    skillWanted: "Photography",
    message:
      "Hey Marcus! I saw your photography portfolio and I'm really impressed. I'd love to learn some photography basics from you, and I can teach you React in return. Let me know if you're interested!",
    proposedDate: "2025-01-12",
    proposedTime: "14:00",
    duration: "1.5 hours",
    status: "accepted",
    createdAt: "2025-01-08",
    type: "sent",
    proposerId: "1",
    receiverId: "3",
  },
  {
    id: "3",
    fromUser: {
      id: "4",
      name: "Elena Rodriguez",
      avatar: "/woman-chef-preparing-food.png",
      rating: 4.8,
    },
    toUser: {
      id: "1",
      name: "John Doe",
      avatar: "/professional-headshot.png",
      rating: 4.8,
    },
    skillOffered: "Cooking",
    skillWanted: "Node.js",
    message:
      "I'd love to teach you some authentic Spanish cooking techniques! In exchange, could you help me understand Node.js better? I'm working on a food blog and want to build a proper backend.",
    proposedDate: "2025-01-20",
    proposedTime: "16:00",
    duration: "2 hours",
    status: "pending",
    createdAt: "2025-01-09",
    type: "received",
    proposerId: "4",
    receiverId: "1",
  },
  {
    id: "4",
    fromUser: {
      id: "1",
      name: "John Doe",
      avatar: "/professional-headshot.png",
      rating: 4.8,
    },
    toUser: {
      id: "5",
      name: "David Kim",
      avatar: "/professional-headshot.png",
      rating: 4.6,
    },
    skillOffered: "JavaScript",
    skillWanted: "Piano",
    message:
      "Hi David! I've always wanted to learn piano and I see you're looking to improve your JavaScript skills. Would you be interested in a skill swap? I have 5+ years of JS experience.",
    proposedDate: "2025-01-18",
    proposedTime: "19:00",
    duration: "1 hour",
    status: "declined",
    createdAt: "2025-01-07",
    type: "sent",
    proposerId: "1",
    receiverId: "5",
  },
]

export function SwapProposals() {
  const { user } = useAuth()

  // Recupera le proposte reali dal backend (both sent and received)
  const { data: sent, loading: sentLoading, error: sentError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByRequestUser(user.uid) : Promise.resolve([])),
    [user?.uid],
  )
  const { data: received, loading: recvLoading, error: recvError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByOfferUser(user.uid) : Promise.resolve([])),
    [user?.uid],
  )

  const sentProposals: UISwapProposal[] = (sent || []).map((p) => ({
    id: p.id,
    fromUserUid: p.requestUserUid,
    toUserUid: p.offerUserUid,
    skillOfferedId: p.skillOfferedId,
    skillRequestedId: p.skillRequestedId,
    presentationLetter: p.presentationLetter,
    date: p.date,
    startTime: p.startTime,
    endTime: p.endTime,
    status: p.status,
    type: "sent",
  }))
  const receivedProposals: UISwapProposal[] = (received || []).map((p) => ({
    id: p.id,
    fromUserUid: p.requestUserUid,
    toUserUid: p.offerUserUid,
    skillOfferedId: p.skillOfferedId,
    skillRequestedId: p.skillRequestedId,
    presentationLetter: p.presentationLetter,
    date: p.date,
    startTime: p.startTime,
    endTime: p.endTime,
    status: p.status,
    type: "received",
  }))

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      // Trova la proposta da aggiornare
      const proposal = receivedProposals.find(p => p.id === proposalId)
      if (!proposal) return

      // Backend richiede tutti i campi per update
      await apiClient.updateSwapProposal(proposalId, {
        date: proposal.date,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        presentationLetter: proposal.presentationLetter,
        status: "ACCEPTED",
        skillOfferedId: proposal.skillOfferedId,
        skillRequestedId: proposal.skillRequestedId,
        requestUserUid: proposal.fromUserUid,
        offerUserUid: proposal.toUserUid,
      })
      // Forza refresh delle proposte
      window.location.reload()
    } catch (e) {
      console.error("Failed to accept proposal:", e)
    }
  }
  const handleDeclineProposal = async (proposalId: number) => {
    try {
      // Trova la proposta da aggiornare
      const proposal = receivedProposals.find(p => p.id === proposalId)
      if (!proposal) return

      // Backend richiede tutti i campi per update
      await apiClient.updateSwapProposal(proposalId, {
        date: proposal.date,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        presentationLetter: proposal.presentationLetter,
        status: "DECLINED",
        skillOfferedId: proposal.skillOfferedId,
        skillRequestedId: proposal.skillRequestedId,
        requestUserUid: proposal.fromUserUid,
        offerUserUid: proposal.toUserUid,
      })
      window.location.reload()
    } catch (e) {
      console.error("Failed to decline proposal:", e)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "ACCEPTED":
        return "bg-green-100 text-green-800"
      case "DECLINED":
        return "bg-red-100 text-red-800"
      case "COMPLETED":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (!user) return null

  if (sentLoading || recvLoading) return <div className="text-center py-8">Loading proposals...</div>
  if (sentError || recvError) return <div className="text-center py-8 text-red-500">Failed to load proposals</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Swap Proposals
          </CardTitle>
          <CardDescription>Manage your skill exchange proposals and schedule sessions</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="received" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Received ({receivedProposals.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Sent ({sentProposals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedProposals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No proposals received</h3>
                <p className="text-gray-600">When others want to swap skills with you, they'll appear here</p>
              </CardContent>
            </Card>
          ) : (
            receivedProposals.map((proposal) => (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Proposal Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={proposal.fromUser.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {proposal.fromUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{proposal.fromUser.name}</h3>
                            <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">Proposal details</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">{proposal.message}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(proposal.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(proposal.startTime)} - {formatTime(proposal.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {proposal.status === "pending" && (
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button onClick={() => handleAcceptProposal(proposal.id)} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeclineProposal(proposal.id)}
                          className="w-full bg-transparent"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                        <Button variant="ghost" className="w-full">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    )}

                    {proposal.status === "accepted" && (
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button className="w-full">
                          <Calendar className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                        <Button variant="outline" className="w-full bg-transparent">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentProposals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Send className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No proposals sent</h3>
                <p className="text-gray-600">Find matches and send your first skill swap proposal!</p>
                <Button className="mt-4">
                  Find Matches
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            sentProposals.map((proposal) => (
              <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Proposal Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={proposal.toUser.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {proposal.toUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{proposal.toUser.name}</h3>
                            <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            You offered <span className="font-medium text-green-600">{proposal.skillOffered}</span> for{" "}
                            <span className="font-medium text-blue-600">{proposal.skillWanted}</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">{proposal.message}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(proposal.proposedDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatTime(proposal.proposedTime)} ({proposal.duration})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      {proposal.status === "pending" && (
                        <>
                          <div className="text-center text-sm text-gray-600 mb-2">Waiting for response...</div>
                          <Button variant="outline" className="w-full bg-transparent">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}

                      {proposal.status === "accepted" && (
                        <>
                          <Button className="w-full">
                            <Calendar className="w-4 h-4 mr-2" />
                            Join Session
                          </Button>
                          <Button variant="outline" className="w-full bg-transparent">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}

                      {proposal.status === "declined" && (
                        <div className="text-center text-sm text-gray-600">Proposal declined</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
