"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useApiCall, apiClient } from "@/lib/api"
import { normalizeProfilePicture } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
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
  const [chatInitialUserId, setChatInitialUserId] = useState<string | null>(null)

    const [refreshKey, setRefreshKey] = useState(0)

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

  const { data: skills } = useApiCall(() => apiClient.getSkills(), [])

  const allProposals = [...(sentProposals || []), ...(receivedProposals || [])]

  const {
    data: feedbacksReceived,
    loading: feedbacksReceivedLoading,
    error: feedbacksReceivedError,
  } = useApiCall(() => (user ? apiClient.getFeedbacksByReviewed(user.uid) : Promise.resolve([])), [user?.uid, refreshKey])
  
  const {
    data: feedbacksGiven,
    loading: feedbacksGivenLoading,
    error: feedbacksGivenError,
  } = useApiCall(() => (user ? apiClient.getFeedbacksByReviewer(user.uid) : Promise.resolve([])), [user?.uid, refreshKey])
  
  const allFeedbacks = [...(feedbacksReceived || []), ...(feedbacksGiven || [])]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('dashboardActiveTab', String(activeTab)) } catch {}
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'sessions' && user) {
      setRefreshKey((prev) => prev + 1)
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'review-history' && user) {
      setRefreshKey((prev) => prev + 1)
    }
  }, [activeTab, user])

  if (!user) return null

  const needsProfileSetup = user.skillsOffered.length === 0 && user.skillsWanted.length === 0

  if (needsProfileSetup) {
    return <ProfileSetup />
  }

  const handleSubmitRating = async (rating: number, feedback: string) => {
    if (!sessionToRate || !user || !sessionToRate.partner?.id) {
      alert("Missing data for rating submission. Please try again.")
      throw new Error("Missing data for rating submission")
    }

    if (rating === 0) {
      alert("Please select a rating before submitting.")
      throw new Error("Rating is 0")
    }

    try {
      const feedbackData = {
        rating: rating,
        review: feedback || "",
        reviewerUid: user.uid,
        reviewedUid: sessionToRate.partner.id,
      }
      
      await apiClient.createFeedback(feedbackData)
      
      toast({
        title: "Success",
        description: "Your review has been submitted successfully!",
        variant: "default",
      })
      
      setRefreshKey((prev) => prev + 1)
      setRatingModalOpen(false)
      setSessionToRate(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast({
        title: "Error",
        description: `Failed to submit rating: ${errorMessage}`,
        variant: "destructive",
      })
      alert(`Failed to submit rating: ${errorMessage}`)
      throw error
    }
  }

  const openRatingModal = (proposal: any) => {
    if (!proposal.receiver || !proposal.receiver.uid) {
      alert("Partner information is not available. Please try again in a moment.")
      return
    }
    
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

  

  const hasUserRatedProposal = (proposal: any) => {
    if (!user || !feedbacksGiven || !proposal.receiver?.uid) return false
    return feedbacksGiven.some((f: any) => f.reviewedUid === proposal.receiver.uid)                                                                             
  }

  const [enrichedProposals, setEnrichedProposals] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [reviewersMap, setReviewersMap] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!sentProposals || !receivedProposals || !skills) return

    const enrichProposals = async () => {
      const allProposals = [...(sentProposals || []), ...(receivedProposals || [])]
      
      const userUids = new Set<string>()
      const skillIds = new Set<number>()
      
      allProposals.forEach((p: any) => {
        userUids.add(p.requestUserUid)
        userUids.add(p.offerUserUid)
        skillIds.add(p.skillOfferedId)
        skillIds.add(p.skillRequestedId)
      })

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
              // Failed to fetch user
            }
          })
        )
      } finally {
        setLoadingUsers(false)
      }

      const skillMap = new Map<number, any>()
      skills.forEach((skill) => {
        skillMap.set(skill.id, { id: skill.id, label: skill.label })
      })

      const enriched = allProposals.map((p: any) => {
        const requestUser = userMap.get(p.requestUserUid)
        const offerUser = userMap.get(p.offerUserUid)
        const skillOffered = skillMap.get(p.skillOfferedId)
        const skillRequested = skillMap.get(p.skillRequestedId)
        
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

  useEffect(() => {
    if (!feedbacksReceived || !user) return

    const loadReviewers = async () => {
      const uniqueReviewerUids = new Set<string>()
      feedbacksReceived
        .filter((f: any) => f.reviewedUid === user.uid)
        .forEach((f: any) => {
          if (f.reviewerUid) uniqueReviewerUids.add(f.reviewerUid)
        })

      const reviewers: Record<string, any> = {}
      await Promise.all(
        Array.from(uniqueReviewerUids).map(async (uid) => {
          try {
            const reviewerData = await apiClient.getUserById(uid)
            reviewers[uid] = {
              uid: reviewerData.uid,
              username: reviewerData.username,
              profilePicture: normalizeProfilePicture(reviewerData.profilePicture),
            }
            } catch (e) {
              // Failed to fetch reviewer
            }
        })
      )
      setReviewersMap(reviewers)
    }

    loadReviewers()
  }, [feedbacksReceived, user?.uid])

  const upcomingProposals =
    enrichedProposals?.filter((p: any) => p.status === "ACCEPTED") || []

  const completedProposals = enrichedProposals?.filter((p) => p.status === "COMPLETED") || []

  const recentActivity = (enrichedProposals || []).slice(0, 5).map((p: any) => ({
    id: p.id,
    type: p.status,
    message: `Proposal ${p.status.toLowerCase()}`,
    timestamp: new Date(p.creationTime || Date.now()).toLocaleDateString(),
  }))

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
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SwapIt</span>
          </div>
          <div className="flex items-center gap-4">

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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

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
            <SwapProposals onNavigateToChat={(userId: string) => {
              setChatInitialUserId(userId)
              setActiveTab('chat')
            }} />
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>All Sessions</CardTitle>
                <CardDescription>View and manage all your skill exchange sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Completed Sessions</h3>
                    {completedProposals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No completed sessions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {completedProposals.map((proposal: any) => {
                          const hasRated = hasUserRatedProposal(proposal)
                          return (
                            <div key={proposal.id} className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={normalizeProfilePicture(proposal.receiver?.profilePicture) || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {proposal.receiver?.firstName?.[0] || proposal.receiver?.username?.[0] || ""}
                                  {proposal.receiver?.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {proposal.receiver?.firstName && proposal.receiver?.lastName
                                    ? `${proposal.receiver.firstName} ${proposal.receiver.lastName}`
                                    : proposal.receiver?.username || "Unknown User"}
                                  {hasRated && (
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Review already submitted" />
                                  )}
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
                                {hasRated ? (
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
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <ChatSection initialUserId={chatInitialUserId} />
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
                    Your Completed Sessions with Reviews
                  </CardTitle>
                  <CardDescription>View the history of completed sessions and reviews you have provided</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {!enrichedProposals || enrichedProposals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Loading sessions...</p>
                      </div>
                    ) : enrichedProposals.filter((p: any) => p.status === "COMPLETED").length === 0 ? (                                                                   
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />                                                                           
                        <p>No completed sessions found.</p>
                      </div>
                    ) : (
                      enrichedProposals
                        .filter((p: any) => p.status === "COMPLETED")
                        .map((p: any) => {
                          // Determine partner UID correctly
                          const partnerUid = p.isSent ? p.offerUser?.uid : p.requestUser?.uid
                          
                          // Find feedback where current user is the reviewer and partner is the reviewed
                          const userFeedback = feedbacksGiven?.find((f: any) => {
                            // Current user must be the reviewer, partner must be the reviewed
                            return f.reviewerUid === user?.uid && f.reviewedUid === partnerUid && partnerUid
                          })
                          
                          const hasReviewed = !!userFeedback
                          
                          return (
                            <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">                                                
                              <div className="flex-1">
                                <div className="font-medium mb-1 flex items-center gap-2">
                                  Swap Deal Done with {p.receiver?.firstName && p.receiver?.lastName
                                    ? `${p.receiver.firstName} ${p.receiver.lastName}`
                                    : p.receiver?.username || "Unknown User"}
                                  {hasReviewed && (
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" title="Review already submitted" />
                                  )}
                                </div>                                                                           
                                <div className="text-gray-600 text-sm">
                                  Date: {formatDate(p.date)} | Time: {formatTime(p.startTime)}
                                </div>
                                {p.skillOffered?.label && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    Taught: <span className="font-medium text-green-600">{p.skillOffered.label}</span>
                                    {p.skillRequested?.label && (
                                      <> • Learned: <span className="font-medium text-blue-600">{p.skillRequested.label}</span></>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 min-w-[250px]">     
                                {userFeedback ? (
                                  <div key={userFeedback.id} className="bg-white p-4 rounded-lg shadow-md text-sm text-gray-800 border border-gray-200 w-full">                                              
                                    <div className="flex items-center gap-2 mb-2">
                                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                      <span className="font-semibold">Your Review</span>
                                    </div>
                                    {/* Rating Stars */}
                                    <div className="flex items-center gap-1 mb-2">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-4 h-4 ${
                                            star <= (userFeedback.rating || 0)
                                              ? "text-yellow-500 fill-yellow-500"
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                      <span className="ml-2 text-xs text-gray-600">({userFeedback.rating || 0}/5)</span>
                                    </div>
                                    {/* Review Text */}
                                    {userFeedback.review ? (
                                      <div className="text-gray-700 mb-1 p-2 bg-gray-50 rounded border border-gray-200">
                                        {userFeedback.review}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 italic mb-1">No review text provided</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 italic">No review provided yet</div>
                                )}
                              </div>
                            </div>
                          )
                        })
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Reviews Received on Your Skills
                  </CardTitle>
                  <CardDescription>View the feedback you have received from other users for each of your offered skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {feedbacksReceived?.filter((f: any) => f.reviewedUid === user.uid).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No reviews received.</p>
                      </div>
                    ) : (
                      feedbacksReceived
                        .filter((f: any) => f.reviewedUid === user.uid)
                        .map((f: any) => {
                          // Get reviewer info from reviewersMap (loaded from backend)
                          const reviewer = reviewersMap[f.reviewerUid]
                          
                          return (
                            <div key={f.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-yellow-50 shadow-sm">
                              <div className="font-medium text-sm mb-1 flex items-center gap-2">
                                From: {reviewer?.username || "Unknown User"}
                                {reviewer?.profilePicture && (
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={reviewer.profilePicture} />
                                    <AvatarFallback>{reviewer.username?.[0] || "U"}</AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                              {/* Rating Stars */}
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= (f.rating || 0)
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-xs text-gray-600">({f.rating || 0}/5)</span>
                              </div>
                              {/* Review Text */}
                              {f.review ? (
                                <div className="text-gray-700 p-2 bg-white rounded border border-gray-200">
                                  <span className="font-medium text-xs text-gray-500">Review:</span>
                                  <div className="mt-1">{f.review}</div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic">No review text provided</div>
                              )}
                            </div>
                          )
                        })
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
              if (!open) {
                setRatingModalOpen(false)
                setSessionToRate(null)
              }
            }}
            session={sessionToRate}
            onSubmitRating={async (rating: number, feedback: string) => {
              if (typeof handleSubmitRating !== 'function') {
                throw new Error("handleSubmitRating is not a function")
              }
              
              try {
                const result = await handleSubmitRating(rating, feedback)
                return result
              } catch (error) {
                throw error
              }
            }}
          />
        )}

      <CreateSwapModal open={createSwapModalOpen} onOpenChange={setCreateSwapModalOpen} />
    </div>
  )
}

