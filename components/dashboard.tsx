"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useApiCall, apiClient } from "@/lib/api"
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
import { Notifications } from "@/components/notifications"

export function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'home'
    return localStorage.getItem('dashboardActiveTab') || 'home'
  })
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [createSwapModalOpen, setCreateSwapModalOpen] = useState(false)
  const [sessionToRate, setSessionToRate] = useState<any>(null)

  const {
    data: proposals,
    loading: proposalsLoading,
    error: proposalsError,
  } = useApiCall(
    () => (user ? apiClient.getSwapProposalsByRequestUser(user.uid) : Promise.resolve([])),
    [user?.uid],
  )

  const {
    data: feedbacks,
    loading: feedbacksLoading,
    error: feedbacksError,
  } = useApiCall(() => (user ? apiClient.getFeedbacksByReviewed(user.uid) : Promise.resolve([])), [user?.uid])

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
    if (!sessionToRate || !user) return

    try {
      await apiClient.createFeedback({
        rating,
        review: feedback,
        reviewerUid: user.uid,
        reviewedUid: sessionToRate.partnerId,
      })
      console.log("Rating submitted successfully")
    } catch (error) {
      console.error("Failed to submit rating:", error)
    }
  }

  const openRatingModal = (session: any) => {
    setSessionToRate(session)
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

  const upcomingProposals =
    proposals?.filter((p: any) => p.status === "ACCEPTED" && new Date(p.date) >= new Date()) || []

  const completedProposals = proposals?.filter((p) => p.status === "COMPLETED") || []

  const recentActivity = (proposals || []).slice(0, 5).map((p: any) => ({
    id: p.id,
    type: p.status,
    message: `Proposal ${p.status.toLowerCase()}`,
    timestamp: new Date(p.creationTime || Date.now()).toLocaleDateString(),
  }))

  // Loading state
  if (proposalsLoading || feedbacksLoading) {
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
  if (proposalsError || feedbacksError) {
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
                <AvatarImage src={user.profilePicture || "/placeholder.svg"} />
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
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-gray-500">New Messages</div>
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
                        {upcomingProposals.map((proposal) => (
                          <div key={proposal.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={proposal.receiver.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>
                                {(proposal.receiver.firstName?.[0] || "") + (proposal.receiver.lastName?.[0] || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">
                                {proposal.receiver.firstName} {proposal.receiver.lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                Teaching:{" "}
                                <span className="text-green-600 font-medium">{proposal.offeredSkill.label}</span> •
                                Learning:{" "}
                                <span className="text-blue-600 font-medium">{proposal.wantedSkill.label}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(proposal.proposedDateTime)} ({proposal.duration} minutes)
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
                        {completedProposals.map((proposal) => (
                          <div key={proposal.id} className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={proposal.receiver.profilePicture || "/placeholder.svg"} />
                              <AvatarFallback>
                                {(proposal.receiver.firstName?.[0] || "") + (proposal.receiver.lastName?.[0] || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">
                                {proposal.receiver.firstName} {proposal.receiver.lastName}
                              </div>
                              <div className="text-sm text-gray-600">
                                Taught:{" "}
                                <span className="text-green-600 font-medium">{proposal.offeredSkill.label}</span> •
                                Learned: <span className="text-blue-600 font-medium">{proposal.wantedSkill.label}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Completed on {formatDate(proposal.proposedDateTime)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => openRatingModal(proposal)}>
                                Rate Session
                              </Button>
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

          <TabsContent value="notifications">
            <Notifications />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup isEdit={true} />
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Your SwapIt Statistics
                  </CardTitle>
                  <CardDescription>Track your learning journey and community impact</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{completedProposals.length}</div>
                        <div className="text-sm text-gray-500">Total Swaps</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      You've successfully completed {completedProposals.length} skill exchanges
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Star className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{user.rating || "0.0"}</div>
                        <div className="text-sm text-gray-500">Average Rating</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">Based on feedback from your swap partners</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{user.skillsOffered.length}</div>
                        <div className="text-sm text-gray-500">Skills Offered</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      You're sharing knowledge in {user.skillsOffered.length} different areas
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{user.skillsWanted.length}</div>
                        <div className="text-sm text-gray-500">Skills Learning</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      You're actively learning {user.skillsWanted.length} new skills
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Award className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-sm text-gray-500">Hours Taught</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">Time spent teaching others in the community</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">8</div>
                        <div className="text-sm text-gray-500">Unique Partners</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">Different people you've exchanged skills with</div>
                  </CardContent>
                </Card>
              </div>

              {/* Skills Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Skills Overview</CardTitle>
                  <CardDescription>Skills you're teaching and learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3">Skills You Teach</h4>
                      <div className="space-y-2">
                        {user.skillsOffered.map((skill, index) => (
                          <div key={skill} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm">{skill}</span>
                            <span className="text-xs text-green-600 font-medium">
                              {Math.floor(Math.random() * 5) + 1} sessions
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-700 mb-3">Skills You're Learning</h4>
                      <div className="space-y-2">
                        {user.skillsWanted.map((skill, index) => (
                          <div key={skill} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <span className="text-sm">{skill}</span>
                            <span className="text-xs text-blue-600 font-medium">
                              {Math.floor(Math.random() * 3) + 1} sessions
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
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
          onOpenChange={setRatingModalOpen}
          session={sessionToRate}
          onSubmitRating={handleSubmitRating}
        />
      )}

      <CreateSwapModal open={createSwapModalOpen} onOpenChange={setCreateSwapModalOpen} />
    </div>
  )
}
