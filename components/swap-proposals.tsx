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

interface SwapProposalsProps {
  onNavigateToChat?: (userId: string) => void;
}

export function SwapProposals({ onNavigateToChat }: SwapProposalsProps = {}) {
  const { user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: sent, loading: sentLoading, error: sentError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByRequestUser(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )
  const { data: received, loading: recvLoading, error: recvError } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByOfferUser(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )

  const { data: skills } = useApiCall(() => apiClient.getSkills(), [])

  const [sentProposals, setSentProposals] = useState<UISwapProposal[]>([])
  const [receivedProposals, setReceivedProposals] = useState<UISwapProposal[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false)
  const [proposalToComplete, setProposalToComplete] = useState<UISwapProposal | null>(null)
  
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [proposalToRate, setProposalToRate] = useState<UISwapProposal | null>(null)
  
  const { data: userFeedbacks } = useApiCall(
    () => (user ? apiClient.getFeedbacksByReviewer(user.uid) : Promise.resolve([])),
    [user?.uid, refreshKey],
  )

  useEffect(() => {
    if (!sent || !received || !skills) return

    const enrichProposals = async (proposals: typeof sent) => {
      const userUids = new Set<string>()
      const skillIds = new Set<number>()
      
      proposals.forEach((p) => {
        userUids.add(p.requestUserUid)
        userUids.add(p.offerUserUid)
        skillIds.add(p.skillOfferedId)
        skillIds.add(p.skillRequestedId)
      })

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
              // Failed to fetch user
            }
          })
        )
      } finally {
        setLoadingUsers(false)
      }

      const skillMap = new Map<number, { id: number; label: string }>()
      skills.forEach((skill) => {
        skillMap.set(skill.id, { id: skill.id, label: skill.label })
      })

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
    
    enrichProposals(received).then((enriched) => {
      return enriched.map((p) => ({
        ...p,
        type: "received" as const,
        fromUser: p.fromUser,
        toUser: p.toUser,
      }))
    }).then(setReceivedProposals)
  }, [sent, received, skills])

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      const proposal = receivedProposals.find(p => p.id === proposalId)
      if (!proposal) return

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
      alert("Failed to accept proposal. Please try again.")
    }
  }
  const handleDeclineProposal = async (proposalId: number) => {
    try {
      const proposal = receivedProposals.find(p => p.id === proposalId)
      if (!proposal) return

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
      alert("Failed to decline proposal. Please try again.")
    }
  }

  const isSessionPassed = (date: string, endTime: string): boolean => {
    try {
      const sessionDateTime = new Date(`${date}T${endTime}`)
      const now = new Date()
      return now >= sessionDateTime
    } catch (e) {
      return false
    }
  }

  const hasUserRated = (proposal: UISwapProposal): boolean => {
    if (!user || !userFeedbacks) return false
    
    const partnerUid = proposal.type === "sent" 
      ? proposal.toUserUid
      : proposal.fromUserUid
    
    return userFeedbacks.some(
      (feedback: any) => feedback.reviewedUid === partnerUid
    )
  }

  const getPartnerUid = (proposal: UISwapProposal): string => {
    return proposal.type === "sent" 
      ? proposal.toUserUid
      : proposal.fromUserUid
  }

  const getPartnerInfo = (proposal: UISwapProposal) => {
    const partner = proposal.type === "sent" ? proposal.toUser : proposal.fromUser
    return partner || null
  }

  const handleRateSession = (proposal: UISwapProposal) => {
    const partner = getPartnerInfo(proposal)
    if (!partner) {
      alert("Partner information is still loading. Please try again in a moment.")
      return
    }
    setProposalToRate(proposal)
    setRatingModalOpen(true)
  }

  const handleRatingSubmitted = async (rating: number, feedback: string) => {
    if (!user || !proposalToRate) {
      throw new Error("Missing user or proposal to rate")
    }
    
    const partnerUid = getPartnerUid(proposalToRate)
    if (!partnerUid) {
      throw new Error("Could not determine partner UID")
    }
    
    try {
      const feedbackData = {
        rating: rating,
        review: feedback || "",
        reviewerUid: user.uid,
        reviewedUid: partnerUid,
      }
      
      await apiClient.createFeedback(feedbackData)
      
      setRatingModalOpen(false)
      setProposalToRate(null)
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      throw error
    }
  }

  const handleMarkAsCompletedClick = (proposal: UISwapProposal) => {
    setProposalToComplete(proposal)
    setCompletedDialogOpen(true)
  }

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
      setRefreshKey((prev) => prev + 1)
    } catch (e) {
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
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          onClick={() => {
                            if (onNavigateToChat && proposal.fromUser?.uid) {
                              onNavigateToChat(proposal.fromUser.uid)
                            }
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </div>
                    )}

                                        {proposal.status === "ACCEPTED" && (
                      <div className="flex flex-col gap-2 lg:w-48">
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

                    <div className="flex flex-col gap-2 lg:w-48">
                      {proposal.status === "PENDING" && (
                        <>
                          <div className="text-center text-sm text-gray-600 mb-2">Waiting for response...</div>                                                 
                          <Button 
                            variant="outline" 
                            className="w-full bg-transparent"
                            onClick={() => {
                              if (onNavigateToChat && proposal.toUser?.uid) {
                                onNavigateToChat(proposal.toUser.uid)
                              }
                            }}
                          >                                                                          
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}

                      {proposal.status === "ACCEPTED" && (
                        <>
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


