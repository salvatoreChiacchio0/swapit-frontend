"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/hooks/use-auth"
import { Calendar, Clock, CheckCircle, X, ArrowRight, Send, CheckCircle2, MessageSquare, Star } from "lucide-react"
import { useApiCall, apiClient } from "@/lib/api"
import { normalizeProfilePicture } from "@/lib/utils"
import { RatingModal } from "@/components/rating-modal"

// Extended UI model with fetched user and skill data
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
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REJECTED" | "COMPLETED"
  type: "sent" | "received"
  // Fetched data
  fromUser?: {
    uid: string
    username: string
    profilePicture?: string | null
  } | null
  toUser?: {
    uid: string
    username: string
    profilePicture?: string | null
  } | null
  skillOffered?: {
    id: number
    label: string
  } | null
  skillRequested?: {
    id: number
    label: string
  } | null
}

// Mock data for proposals (not currently used - using real API data instead)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockProposals: any[] = [
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
  const [refreshKey, setRefreshKey] = useState(0)

  // Recupera le proposte reali dal backend (both sent and received)
  const { data: sent, loading: sentLoading, error: sentError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByRequestUser(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )
  const { data: received, loading: recvLoading, error: recvError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByOfferUser(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )

  // Fetch skills data
  const { data: skills } = useApiCall(() => apiClient.getSkills(), [])

  // State for enriched proposals with user and skill data
  const [sentProposals, setSentProposals] = useState<UISwapProposal[]>([])
  const [receivedProposals, setReceivedProposals] = useState<UISwapProposal[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  // State for mark as completed modal
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false)
  const [proposalToComplete, setProposalToComplete] = useState<UISwapProposal | null>(null)
  
  // State for rating modal
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [proposalToRate, setProposalToRate] = useState<UISwapProposal | null>(null)
  
  // Fetch feedbacks to check if user already rated
  const { data: userFeedbacks } = useApiCall(
    () => (user ? apiClient.getFeedbacksByReviewer(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )

  // Enrich proposals with user and skill data
  useEffect(() => {
    if (!sent || !received || !skills) return

    const enrichProposals = async (proposals: typeof sent) => {
      // Collect unique user UIDs and skill IDs
      const userUids = new Set<string>()
      const skillIds = new Set<number>()
      
      proposals.forEach((p) => {
        userUids.add(p.requestUserUid)
        userUids.add(p.offerUserUid)
        skillIds.add(p.skillOfferedId)
        skillIds.add(p.skillRequestedId)
      })

      // Fetch all users and create a map
      const userMap = new Map<string, { uid: string; username: string; profilePicture?: string | null }>()
      setLoadingUsers(true)
      try {
        await Promise.all(
          Array.from(userUids).map(async (uid) => {
            try {
              const userData = await apiClient.getUserById(uid)
              userMap.set(uid, {
                uid: userData.uid,
                username: userData.username,
                profilePicture: normalizeProfilePicture(userData.profilePicture),
              })
            } catch (e) {
              console.error(`Failed to fetch user ${uid}:`, e)
            }
          })
        )
      } finally {
        setLoadingUsers(false)
      }

      // Create skill map
      const skillMap = new Map<number, { id: number; label: string }>()
      skills.forEach((skill) => {
        skillMap.set(skill.id, { id: skill.id, label: skill.label })
      })

      // Map proposals with enriched data
      return proposals.map((p) => ({
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
        type: "sent" as const,
        fromUser: userMap.get(p.requestUserUid) || null,
        toUser: userMap.get(p.offerUserUid) || null,
        skillOffered: skillMap.get(p.skillOfferedId) || null,
        skillRequested: skillMap.get(p.skillRequestedId) || null,
      }))
    }

    enrichProposals(sent).then(setSentProposals)
    
    // For received proposals, swap the from/to logic
    enrichProposals(received).then((enriched) => {
      return enriched.map((p) => ({
        ...p,
        type: "received" as const,
        // For received proposals, fromUser is the one who sent it (requestUser), toUser is us (offerUser)
        fromUser: p.fromUser, // requestUser is the one who sent the proposal
        toUser: p.toUser, // offerUser is us (the receiver)
      }))
    }).then(setReceivedProposals)
  }, [sent, received, skills])

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
      setRefreshKey((prev) => prev + 1)
    } catch (e) {
      console.error("Failed to accept proposal:", e)
      alert("Failed to accept proposal. Please try again.")
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
        status: "REJECTED",
        skillOfferedId: proposal.skillOfferedId,
        skillRequestedId: proposal.skillRequestedId,
        requestUserUid: proposal.fromUserUid,
        offerUserUid: proposal.toUserUid,
      })
      // Forza refresh delle proposte
      setRefreshKey((prev) => prev + 1)
    } catch (e) {
      console.error("Failed to decline proposal:", e)
      alert("Failed to decline proposal. Please try again.")
    }
  }

  // Check if the session date and time have passed
  const isSessionPassed = (date: string, endTime: string): boolean => {
    try {
      const sessionDateTime = new Date(`${date}T${endTime}`)
      const now = new Date()
      return now >= sessionDateTime
    } catch (e) {
      console.error("Error parsing session date/time:", e)
      return false
    }
  }

  // Check if user has already rated this proposal
  const hasUserRated = (proposal: UISwapProposal): boolean => {
    if (!user || !userFeedbacks) return false
    
    // Determine the partner UID (the other user in the proposal)
    const partnerUid = proposal.type === "sent" 
      ? proposal.toUserUid  // If I sent it, partner is toUser
      : proposal.fromUserUid  // If I received it, partner is fromUser
    
    // Check if there's a feedback from current user to partner
    return userFeedbacks.some(
      (feedback: any) => feedback.reviewedUid === partnerUid
    )
  }

  // Get partner UID for rating
  const getPartnerUid = (proposal: UISwapProposal): string => {
    return proposal.type === "sent" 
      ? proposal.toUserUid
      : proposal.fromUserUid
  }

  // Get partner info for rating
  const getPartnerInfo = (proposal: UISwapProposal) => {
    const partner = proposal.type === "sent" ? proposal.toUser : proposal.fromUser
    return partner || null
  }

  // Open rating modal
  const handleRateSession = (proposal: UISwapProposal) => {
    const partner = getPartnerInfo(proposal)
    if (!partner) {
      alert("Partner information is still loading. Please try again in a moment.")
      return
    }
    setProposalToRate(proposal)
    setRatingModalOpen(true)
  }

  // Handle rating submission
  const handleRatingSubmitted = (rating: number, feedback: string) => {
    setRatingModalOpen(false)
    setProposalToRate(null)
    // Refresh to show updated feedback status
    setRefreshKey((prev) => prev + 1)
  }

  // Open the mark as completed dialog
  const handleMarkAsCompletedClick = (proposal: UISwapProposal) => {
    setProposalToComplete(proposal)
    setCompletedDialogOpen(true)
  }

  // Mark proposal as completed
  const handleMarkAsCompleted = async () => {
    if (!proposalToComplete) return

    try {
      await apiClient.updateSwapProposal(proposalToComplete.id, {
        date: proposalToComplete.date,
        startTime: proposalToComplete.startTime,
        endTime: proposalToComplete.endTime,
        presentationLetter: proposalToComplete.presentationLetter,
        status: "COMPLETED",
        skillOfferedId: proposalToComplete.skillOfferedId,
        skillRequestedId: proposalToComplete.skillRequestedId,
        requestUserUid: proposalToComplete.fromUserUid,
        offerUserUid: proposalToComplete.toUserUid,
      })
      
      setCompletedDialogOpen(false)
      setProposalToComplete(null)
      // Forza refresh delle proposte
      setRefreshKey((prev) => prev + 1)
    } catch (e) {
      console.error("Failed to mark proposal as completed:", e)
      alert("Failed to mark proposal as completed. Please try again.")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "ACCEPTED":
        return "bg-green-100 text-green-800"
      case "DECLINED":
      case "REJECTED":
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

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours < 1) {
      const minutes = Math.round(diffHours * 60)
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
    } else if (diffHours < 2) {
      return "1 hour"
    } else {
      const hours = Math.floor(diffHours)
      const minutes = Math.round((diffHours - hours) * 60)
      if (minutes === 0) {
        return `${hours} hours`
      } else {
        return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${minutes === 1 ? "minute" : "minutes"}`
      }
    }
  }

    if (!user) return null

  if (sentLoading || recvLoading || loadingUsers) return <div className="text-center py-8">Loading proposals...</div>
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
                          <AvatarImage src={normalizeProfilePicture(proposal.fromUser?.profilePicture) || "/placeholder.svg"} />                                                         
                          <AvatarFallback>
                            {proposal.fromUser?.username
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{proposal.fromUser?.username}</h3>
                            <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">Proposal details</p>
                        </div>
                      </div>

                                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">{proposal.presentationLetter || "No message provided"}</p>     
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">                                                                              
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(proposal.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(proposal.startTime)} - {formatTime(proposal.endTime)} ({calculateDuration(proposal.startTime, proposal.endTime)})</span>                                                        
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {proposal.status === "PENDING" && (
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

                                        {proposal.status === "ACCEPTED" && (
                      <div className="flex flex-col gap-2 lg:w-48">
                        <Button className="w-full">
                          <Calendar className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          onClick={() => handleMarkAsCompletedClick(proposal)}
                          disabled={!isSessionPassed(proposal.date, proposal.endTime)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark as Completed
                        </Button>
                      </div>
                    )}

                    {proposal.status === "COMPLETED" && (
                      <div className="flex flex-col gap-2 lg:w-48">
                        {hasUserRated(proposal) ? (
                          <Button className="w-full" disabled>
                            <Star className="w-4 h-4 mr-2" />
                            Already Rated
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => handleRateSession(proposal)}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate Session
                          </Button>
                        )}
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
                          <AvatarImage src={normalizeProfilePicture(proposal.toUser?.profilePicture) || "/placeholder.svg"} />                                                           
                          <AvatarFallback>
                            {proposal.toUser?.username
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{proposal.toUser?.username}</h3>
                            <Badge className={getStatusColor(proposal.status)}>{proposal.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            You offered <span className="font-medium text-green-600">{proposal.skillOffered?.label}</span> for{" "}
                            <span className="font-medium text-blue-600">{proposal.skillRequested?.label}</span>
                          </p>
                        </div>
                      </div>

                                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700">{proposal.presentationLetter || "No message provided"}</p>     
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">                                                                              
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(proposal.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatTime(proposal.startTime)} - {formatTime(proposal.endTime)} ({calculateDuration(proposal.startTime, proposal.endTime)})                                                                              
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      {proposal.status === "PENDING" && (
                        <>
                          <div className="text-center text-sm text-gray-600 mb-2">Waiting for response...</div>                                                 
                          <Button variant="outline" className="w-full bg-transparent">                                                                          
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}

                      {proposal.status === "ACCEPTED" && (
                        <>
                          <Button className="w-full">
                            <Calendar className="w-4 h-4 mr-2" />
                            Join Session
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full bg-transparent"
                            onClick={() => handleMarkAsCompletedClick(proposal)}
                            disabled={!isSessionPassed(proposal.date, proposal.endTime)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Completed
                          </Button>
                        </>
                      )}

                      {proposal.status === "COMPLETED" && (
                        <>
                          {hasUserRated(proposal) ? (
                            <Button className="w-full" disabled>
                              <Star className="w-4 h-4 mr-2" />
                              Already Rated
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={() => handleRateSession(proposal)}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Rate Session
                            </Button>
                          )}
                        </>
                      )}

                      {(proposal.status === "DECLINED" || proposal.status === "REJECTED") && (
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

      {/* Mark as Completed Confirmation Dialog */}
      <AlertDialog open={completedDialogOpen} onOpenChange={setCompletedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Proposal as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this proposal as completed? Once marked as completed, 
              you will not be able to modify or change the status of this proposal. This action 
              confirms that the skill swap session has been successfully completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsCompleted}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rating Modal */}
      {proposalToRate && (() => {
        const partner = getPartnerInfo(proposalToRate)
        if (!partner) return null
        
        return (
          <RatingModal
            open={ratingModalOpen}
            onOpenChange={setRatingModalOpen}
            session={{
              id: proposalToRate.id.toString(),
              partner: {
                id: getPartnerUid(proposalToRate),
                name: partner.username || "Unknown User",
                avatar: normalizeProfilePicture(partner.profilePicture) || "/placeholder.svg",
              },
              skillTaught: proposalToRate.type === "sent"
                ? proposalToRate.skillOffered?.label || "Skill Offered"
                : proposalToRate.skillRequested?.label || "Skill Requested",
              skillLearned: proposalToRate.type === "sent"
                ? proposalToRate.skillRequested?.label || "Skill Requested"
                : proposalToRate.skillOffered?.label || "Skill Offered",
              date: proposalToRate.date,
            }}
            onSubmitRating={handleRatingSubmitted}
          />
        )
      })()}
    </div>
  )
}


