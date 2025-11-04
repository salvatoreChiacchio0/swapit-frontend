"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useApiCall, apiClient } from "@/lib/api"
import { normalizeProfilePicture } from "@/lib/utils"
import {
  Users,
  Calendar,
  Star,
  LogOut,
  MessageSquare,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  Award,
  Target,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { ProfileSetup } from "@/components/profile-setup"
import { SkillMatcher } from "@/components/skill-matcher"
import { SwapProposals } from "@/components/swap-proposals"
import { RatingModal } from "@/components/rating-modal"
import { CreateSwapModal } from "@/components/create-swap-modal"
import { ChatSection } from "@/components/chat-section"

export function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'home'
    return localStorage.getItem('dashboardActiveTab') || 'home'
  })
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [createSwapModalOpen, setCreateSwapModalOpen] = useState(false)
  const [sessionToRate, setSessionToRate] = useState<any>(null)

    const [refreshKey, setRefreshKey] = useState(0)

  // Fetch both sent and received proposals
  const {
    data: sentProposals,
    loading: sentLoading,
    error: sentError,
  } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByRequestUser(user.uid) : Promise.resolve([])),                                                                     
    [user?.uid, refreshKey],
  )
  
  const {
    data: receivedProposals,
    loading: receivedLoading,
    error: receivedError,
  } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByOfferUser(user.uid) : Promise.resolve([])),                                                                     
    [user?.uid, refreshKey],
  )

  // Fetch skills data
  const { data: skills } = useApiCall(() => apiClient.getSkills(), [])

  // Combine all proposals
  const allProposals = [...(sentProposals || []), ...(receivedProposals || [])]

  // Fetch feedbacks received by the user
  const {
    data: feedbacksReceived,
    loading: feedbacksReceivedLoading,
    error: feedbacksReceivedError,
  } = useApiCall(() => (user ? apiClient.getFeedbacksByReviewed(user.uid) : Promise.resolve([])), [user?.uid, refreshKey])
  
  // Fetch feedbacks given by the user
  const {
    data: feedbacksGiven,
    loading: feedbacksGivenLoading,
    error: feedbacksGivenError,
  } = useApiCall(() => (user ? apiClient.getFeedbacksByReviewer(user.uid) : Promise.resolve([])), [user?.uid, refreshKey])
  
  // Combine both for convenience
  const allFeedbacks = [...(feedbacksReceived || []), ...(feedbacksGiven || [])]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('dashboardActiveTab', String(activeTab)) } catch {}
    }
  }, [activeTab])

  if (!user) return null

  const needsProfileSetup = user.skillsOffered.length === 0 && user.skillsWanted.length === 0

  if (needsProfileSetup) {
    return <ProfileSetup />
  }

    const handleSubmitRating = async (rating: number, feedback: string) => {      
    if (!sessionToRate || !user || !sessionToRate.partner?.id) {
      console.error("Missing data for rating submission:", { sessionToRate, user })
      return
    }

    try {
      const feedbackData = {
        rating,
        review: feedback,
        reviewerUid: user.uid,
        reviewedUid: sessionToRate.partner.id,
      }
      console.log("Submitting feedback:", feedbackData)
      
      await apiClient.createFeedback(feedbackData)
      console.log("Rating submitted successfully")
      
      // Refresh proposals to show updated data
      setRefreshKey((prev) => prev + 1)
      setRatingModalOpen(false)
      setSessionToRate(null)
    } catch (error) {
      console.error("Failed to submit rating:", error)
      alert(`Failed to submit rating: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const openRatingModal = (proposal: any) => {
    // Transform proposal to the format expected by RatingModal
    if (!proposal.receiver || !proposal.receiver.uid) {
      alert("Partner information is not available. Please try again in a moment.")
      return
    }
    
    // Determine which skill was taught and which was learned based on proposal type
    const skillTaught = proposal.isSent
      ? proposal.skillOffered?.label || "Skill Offered"
      : proposal.skillRequested?.label || "Skill Requested"
    
    const skillLearned = proposal.isSent
      ? proposal.skillRequested?.label || "Skill Requested"
      : proposal.skillOffered?.label || "Skill Offered"
    
    const sessionData = {
      id: proposal.id.toString(),
      partner: {
        id: proposal.receiver.uid,
        name: proposal.receiver.username || "Unknown User",
        avatar: normalizeProfilePicture(proposal.receiver.profilePicture) || "/placeholder.svg",
      },
      skillTaught,
      skillLearned,
      date: proposal.date,
    }
    
    console.log("Opening rating modal with session data:", sessionData)
    setSessionToRate(sessionData)
    setRatingModalOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  

  // Helper function to check if user has already rated a proposal
  const hasUserRatedProposal = (proposal: any) => {
    if (!user || !feedbacksGiven || !proposal.receiver?.uid) return false
    return feedbacksGiven.some((f: any) => f.reviewedUid === proposal.receiver.uid)                                                                             
  }

  // State for enriched proposals with user and skill data
  const [enrichedProposals, setEnrichedProposals] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Enrich proposals with user and skill data
  useEffect(() => {
    if (!sentProposals || !receivedProposals || !skills) return

    const enrichProposals = async () => {
      // Combine proposals
      const allProposals = [...(sentProposals || []), ...(receivedProposals || [])]
      
      // Collect unique user UIDs and skill IDs
      const userUids = new Set<string>()
      const skillIds = new Set<number>()
      
      allProposals.forEach((p: any) => {
        userUids.add(p.requestUserUid)
        userUids.add(p.offerUserUid)
        skillIds.add(p.skillOfferedId)
        skillIds.add(p.skillRequestedId)
      })

      // Fetch all users and create a map
      const userMap = new Map<string, any>()
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
      const skillMap = new Map<number, any>()
      skills.forEach((skill) => {
        skillMap.set(skill.id, { id: skill.id, label: skill.label })
      })

      // Map proposals with enriched data
      const enriched = allProposals.map((p: any) => {
        const requestUser = userMap.get(p.requestUserUid)
        const offerUser = userMap.get(p.offerUserUid)
        const skillOffered = skillMap.get(p.skillOfferedId)
        const skillRequested = skillMap.get(p.skillRequestedId)
        
        // Determine if this is a sent or received proposal from current user's perspective
        const isSent = p.requestUserUid === user?.uid
        const receiver = isSent ? offerUser : requestUser
        
        return {
          ...p,
          requestUser,
          offerUser,
          receiver,
          skillOffered,
          skillRequested,
          isSent,
        }
      })

      setEnrichedProposals(enriched)
    }

    enrichProposals()
  }, [sentProposals, receivedProposals, skills, user?.uid])

  const upcomingProposals =
    enrichedProposals?.filter((p: any) => p.status === "ACCEPTED") || []

  const completedProposals = enrichedProposals?.filter((p) => p.status === "COMPLETED") || []

  const recentActivity = (enrichedProposals || []).slice(0, 5).map((p: any) => ({
    id: p.id,
    type: p.status,
    message: `Proposal ${p.status.toLowerCase()}`,
    timestamp: new Date(p.creationTime || Date.now()).toLocaleDateString(),
  }))

  // Loading state
  if (sentLoading || receivedLoading || feedbacksReceivedLoading || feedbacksGivenLoading || loadingUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (sentError || receivedError || feedbacksReceivedError || feedbacksGivenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
            <p className="text-gray-600 mb-4">
              Unable to connect to the server. Please check if the backend is running on http://localhost:3001
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SwapIt</span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => setCreateSwapModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Swap
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={normalizeProfilePicture(user.profilePicture) || "/placeholder.svg"} />
                <AvatarFallback>{user.username?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="matches">Find Matches</TabsTrigger>
                          <TabsTrigger value="proposals">Proposals</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="review-history">Review History</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Welcome back, {user.username}!</h1>
                  <p className="text-blue-100">Ready to learn something new today?</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{user.rating || "0.0"}</div>
                  <div className="text-blue-100 text-sm">Your Rating</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">{user.rating || "0.0"}</div>
                      <div className="text-sm text-gray-500">Rating</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{completedProposals.length}</div>
                      <div className="text-sm text-gray-500">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{upcomingProposals.length}</div>
                      <div className="text-sm text-gray-500">Upcoming</div>
                    </div>
                  </div>
                </CardContent>
                            </Card>
            </div>

            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>Your scheduled skill exchange sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingProposals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming sessions scheduled</p>
                    <p className="text-sm">Accept a swap proposal to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingProposals.map((proposal: any) => (
                      <div key={proposal.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">Scheduled Session</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(proposal.date)} at {formatTime(proposal.startTime)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm">Join Session</Button>
                          <Button size="sm" variant="outline">
                            Message
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your skill exchange network</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start creating swap proposals to see activity here!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{activity.message}</p>
                          <p className="text-sm text-gray-500">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <SkillMatcher />
          </TabsContent>

          <TabsContent value="proposals">
            <SwapProposals />
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
                <CardDescription>View and manage all your skill exchange sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Upcoming Sessions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Upcoming Sessions</h3>
                    {upcomingProposals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No upcoming sessions scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingProposals.map((proposal: any) => (
                          <div key={proposal.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={normalizeProfilePicture(proposal.receiver?.profilePicture) || "/placeholder.svg"} />
                              <AvatarFallback>
                                {proposal.receiver?.firstName?.[0] || proposal.receiver?.username?.[0] || ""}
                                {proposal.receiver?.lastName?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">
                                {proposal.receiver?.firstName && proposal.receiver?.lastName
                                  ? `${proposal.receiver.firstName} ${proposal.receiver.lastName}`
                                  : proposal.receiver?.username || "Unknown User"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {proposal.offeredSkill?.label ? (
                                  <>
                                    Teaching:{" "}
                                    <span className="text-green-600 font-medium">{proposal.offeredSkill.label}</span>
                                    {proposal.wantedSkill?.label && " • "}
                                  </>
                                ) : null}
                                {proposal.wantedSkill?.label ? (
                                  <>
                                    Learning:{" "}
                                    <span className="text-blue-600 font-medium">{proposal.wantedSkill.label}</span>
                                  </>
                                ) : null}
                                {!proposal.offeredSkill?.label && !proposal.wantedSkill?.label && "Session details"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {proposal.proposedDateTime
                                  ? `${formatDate(proposal.proposedDateTime)}${proposal.duration ? ` (${proposal.duration} minutes)` : ""}`
                                  : proposal.date
                                  ? `${formatDate(proposal.date)}${proposal.startTime ? ` at ${formatTime(proposal.startTime)}` : ""}`
                                  : "Date not available"}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm">Join Session</Button>
                              <Button size="sm" variant="outline">
                                Reschedule
                              </Button>
                              <Button size="sm" variant="outline">
                                Message
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed Sessions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Completed Sessions</h3>
                    {completedProposals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No completed sessions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedProposals.map((proposal: any) => (
                          <div key={proposal.id} className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={normalizeProfilePicture(proposal.receiver?.profilePicture) || "/placeholder.svg"} />
                              <AvatarFallback>
                                {proposal.receiver?.firstName?.[0] || proposal.receiver?.username?.[0] || ""}
                                {proposal.receiver?.lastName?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">
                                {proposal.receiver?.firstName && proposal.receiver?.lastName
                                  ? `${proposal.receiver.firstName} ${proposal.receiver.lastName}`
                                  : proposal.receiver?.username || "Unknown User"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {proposal.offeredSkill?.label ? (
                                  <>
                                    Taught:{" "}
                                    <span className="text-green-600 font-medium">{proposal.offeredSkill.label}</span>
                                    {proposal.wantedSkill?.label && " • "}
                                  </>
                                ) : null}
                                {proposal.wantedSkill?.label ? (
                                  <>
                                    Learned: <span className="text-blue-600 font-medium">{proposal.wantedSkill.label}</span>
                                  </>
                                ) : null}
                                {!proposal.offeredSkill?.label && !proposal.wantedSkill?.label && "Session details"}
                              </div>
                              <div className="text-sm text-gray-500">
                                Completed on{" "}
                                {proposal.proposedDateTime
                                  ? formatDate(proposal.proposedDateTime)
                                  : proposal.date
                                  ? formatDate(proposal.date)
                                  : "Date not available"}
                              </div>
                                                        </div>
                            <div className="flex gap-2">
                              {hasUserRatedProposal(proposal) ? (
                                <Button size="sm" disabled>
                                  Already Rated
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => openRatingModal(proposal)}>                                                                      
                                  Rate Session
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <ChatSection />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup isEdit={true} />
          </TabsContent>

          <TabsContent value="review-history">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Storico dei tuoi match con review lasciate
                  </CardTitle>
                  <CardDescription>Visualizza lo storico delle sessioni completate e le review che hai fornito</CardDescription>
                </CardHeader>
                                <CardContent>
                  <div className="space-y-3">
                    {enrichedProposals?.filter((p: any) => p.status === "COMPLETED").length === 0 ? (                                                                   
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />                                                                           
                        <p>Nessun match terminato trovato.</p>
                      </div>
                    ) : (
                      enrichedProposals
                        .filter((p: any) => p.status === "COMPLETED")
                        .map((p: any) => (
                                                    <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">                                                
                            <div className="flex-1">
                              <div className="font-medium mb-1">
                                Swap Deal Done with {p.receiver?.firstName && p.receiver?.lastName
                                  ? `${p.receiver.firstName} ${p.receiver.lastName}`
                                  : p.receiver?.username || "Unknown User"}
                              </div>                                                                           
                              <div className="text-gray-600 text-sm">
                                Data: {formatDate(p.date)} | Orario: {formatTime(p.startTime)}
                              </div>
                            </div>
                                                        <div className="flex flex-col items-end gap-1">     
                              {/* Review che hai lasciato (se disponibile) */}  
                              {(() => {
                                const partnerUid = p.isSent ? p.offerUser?.uid : p.requestUser?.uid
                                const userFeedback = feedbacksGiven?.find((f: any) => 
                                  f.reviewerUid === user?.uid && f.reviewedUid === partnerUid
                                )
                                
                                return userFeedback ? (
                                  <div key={userFeedback.id} className="bg-white p-2 rounded shadow text-sm text-gray-800">                                              
                                    <div><span className="font-semibold">La tua recensione:</span> {userFeedback.review}</div>
                                    <div>Rating: {userFeedback.rating}/5</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">Nessuna review fornita</div>
                                )
                              })()}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Recensioni ricevute sulle tue skill
                  </CardTitle>
                  <CardDescription>Visualizza il feedback che hai ricevuto dagli altri utenti per ciascuna delle tue skill offerte</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {feedbacksReceived?.filter((f: any) => f.reviewedUid === user.uid).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nessuna review ricevuta.</p>
                      </div>
                    ) : (
                      feedbacksReceived
                        .filter((f: any) => f.reviewedUid === user.uid)
                        .map((f: any) => (
                          <div key={f.id} className="flex flex-col gap-1 p-3 border rounded bg-yellow-50">
                            <div>
                              <span className="font-medium">Recensione:</span> {f.review}
                            </div>
                            <div>Rating: {f.rating}/5</div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

              {sessionToRate && (
          <RatingModal
            open={ratingModalOpen}
            onOpenChange={(open) => {
              setRatingModalOpen(open)
              if (!open) {
                setSessionToRate(null)
              }
            }}
            session={sessionToRate}
            onSubmitRating={handleSubmitRating}
          />
        )}

      <CreateSwapModal open={createSwapModalOpen} onOpenChange={setCreateSwapModalOpen} />
    </div>
  )
}

