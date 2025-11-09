"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { useApiCall, apiClient, type SkillOffered, type SkillDesired, type Recommendation } from "@/lib/api"
import { Search, Star, MessageSquare, ArrowRight, Users, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { normalizeProfilePicture } from "@/lib/utils"

interface MatchedUser {
  id: string
  name: string
  avatar: string
  bio: string
  rating: number | null
  completedSwaps: number
  skillsOffered: string[]
  skillsOfferedIds: number[]
  skillsWanted: string[]
  skillsWantedIds: number[]
  matchScore: number
  mutualSkills: string[]
  location?: string
  userSkillsOffered: SkillOffered[]
  userSkillsDesired: SkillDesired[]
}

// Real API-based matching logic

export function SkillMatcher() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<MatchedUser | null>(null)
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [ratingsMap, setRatingsMap] = useState<Record<string, number | null>>({})
  const lastFetchedRatingsKeyRef = useRef<string>("")

  // Proposal form state
  const [proposalDate, setProposalDate] = useState("")
  const [proposalStartTime, setProposalStartTime] = useState("")
  const [proposalEndTime, setProposalEndTime] = useState("")
  const [proposalLetter, setProposalLetter] = useState("")
  const [proposalSkillOfferedId, setProposalSkillOfferedId] = useState<number | null>(null)
  const [proposalSkillRequestedId, setProposalSkillRequestedId] = useState<number | null>(null)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)

  // Fetch all users and their skills from backend
  const {
    data: recommendations,
    loading: recommendationsLoading,
    error: recommendationsError,
  } = useApiCall<Recommendation[]>(() => {
    if (!user?.uid) {
      return Promise.resolve<Recommendation[]>([])
    }
    return apiClient.getSwapRecommendations(user.uid)
  }, [user?.uid])
  const { data: allSkills, loading: skillsLoading } = useApiCall(() => apiClient.getSkills(), [])
  const {
    data: userSkillsOfferedData,
    loading: userSkillsOfferedLoading,
  } = useApiCall<SkillOffered[]>(() => {
    if (!user?.uid) {
      return Promise.resolve<SkillOffered[]>([])
    }
    return apiClient.getSkillsOfferedByUser(user.uid)
  }, [user?.uid])

  // Per ora usa solo la lista caricata dall'API come allSkills
  const userSkillLabels = useMemo(() => {
    if (!user) return []
    return [...new Set([...(user.skillsOffered ?? []), ...(user.skillsWanted ?? [])])]
  }, [user])

  // Build a complete matched user list with real data
  const filteredMatches = useMemo(() => {
    if (!user || !recommendations) return []

    const recList = recommendations ?? []
    if (recList.length === 0) return []

    const userWanted = user.skillsWanted ?? []
    const userOffered = user.skillsOffered ?? []
    const maxScore = recList.reduce(
      (max, rec) => (rec.recommendationScore > max ? rec.recommendationScore : max),
      0,
    )

    const matches: MatchedUser[] = recList.map((rec) => {
      const offered = rec.skillsOffered
      const desired = rec.skillsDesired
      const skillsOfferedLabels = offered.map((o) => o.skill.label)
      const skillsWantedLabels = desired.map((d) => d.skill.label)

      const mutualSkills: string[] = []

      userWanted.forEach((wanted) => {
        if (skillsOfferedLabels.includes(wanted) && !mutualSkills.includes(wanted)) {
          mutualSkills.push(wanted)
        }
      })

      userOffered.forEach((offeredLabel) => {
        if (skillsWantedLabels.includes(offeredLabel) && !mutualSkills.includes(offeredLabel)) {
          mutualSkills.push(offeredLabel)
        }
      })

      const normalizedScore =
        maxScore > 0 ? Math.round((rec.recommendationScore / maxScore) * 100) : 0

      const displayName = rec.user.username || rec.user.email || rec.user.uid
      const reason = rec.reason?.trim()
      const normalizedReason = reason
        ? reason.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        : ""
      const shouldHideReason =
        normalizedReason === "consigliato in base alle skill disponibili e alla popolarita degli utenti"
      const ratingValue = ratingsMap[rec.user.uid]

      return {
        id: rec.user.uid,
        name: displayName,
        avatar: normalizeProfilePicture(rec.user.profilePicture) || "/placeholder.svg",
        bio: shouldHideReason ? "" : reason || "User interested in skill exchange",
        rating: typeof ratingValue === "number" ? ratingValue : null,
        completedSwaps: 0, // Could be derived from future endpoint data
        skillsOffered: skillsOfferedLabels,
        skillsOfferedIds: offered.map((o) => o.id),
        skillsWanted: skillsWantedLabels,
        skillsWantedIds: desired.map((d) => d.id),
        matchScore: Math.min(normalizedScore, 100),
        mutualSkills,
        userSkillsOffered: offered,
        userSkillsDesired: desired,
      }
    })

    // Filter by search term
    let filtered = matches.filter((match) => {
      if (searchTerm) {
        return match.name.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })

    // Filter by skill
    if (selectedSkillFilter) {
      filtered = filtered.filter((match) =>
        match.skillsOffered.includes(selectedSkillFilter) || match.skillsWanted.includes(selectedSkillFilter)
      )
    }

    // Sort by match score
    return filtered.sort((a, b) => b.matchScore - a.matchScore)
  }, [user, recommendations, searchTerm, selectedSkillFilter, ratingsMap])

  useEffect(() => {
    if (!recommendations || recommendations.length === 0) {
      setRatingsMap({})
      lastFetchedRatingsKeyRef.current = ""
      return
    }

    const idsKey = recommendations
      .map((rec) => rec.user.uid)
      .sort()
      .join("|")

    if (idsKey === lastFetchedRatingsKeyRef.current) {
      return
    }

    lastFetchedRatingsKeyRef.current = idsKey
    let isCancelled = false

    const fetchRatings = async () => {
      try {
        const entries = await Promise.all(
          recommendations.map(async (rec) => {
            try {
              const feedbacks = await apiClient.getFeedbacksByReviewed(rec.user.uid)
              if (!feedbacks || feedbacks.length === 0) {
                return [rec.user.uid, null] as const
              }
              const total = feedbacks.reduce((sum, feedback) => sum + (feedback?.rating ?? 0), 0)
              const average = feedbacks.length > 0 ? Math.round((total / feedbacks.length) * 10) / 10 : null
              return [rec.user.uid, average] as const
            } catch (error) {
              console.error(`Failed to load rating for user ${rec.user.uid}`, error)
              return [rec.user.uid, null] as const
            }
          }),
        )

        if (!isCancelled) {
          setRatingsMap(Object.fromEntries(entries))
        }
      } catch (error) {
        if (!isCancelled) {
          setRatingsMap({})
        }
      }
    }

    fetchRatings()

    return () => {
      isCancelled = true
    }
  }, [recommendations])

  useEffect(() => {
    if (!selectedMatch) return
    const updated = filteredMatches.find((match) => match.id === selectedMatch.id)
    if (!updated) return
    const hasDifference =
      updated.rating !== selectedMatch.rating ||
      updated.bio !== selectedMatch.bio ||
      updated.matchScore !== selectedMatch.matchScore

    if (hasDifference) {
      setSelectedMatch(updated)
    }
  }, [filteredMatches, selectedMatch])

  const handleSendProposal = async () => {
    if (!user || !selectedMatch || !proposalDate || !proposalStartTime || !proposalEndTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (!proposalSkillOfferedId || !proposalSkillRequestedId) {
      toast({
        title: "Error",
        description: "Please select skills to swap",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingProposal(true)
    try {
      // Convert HTML5 time format (HH:mm) to backend format (HH:mm:ss)
      const formatTime = (time: string) => time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time
      
      await apiClient.createSwapProposal({
        date: proposalDate,
        startTime: formatTime(proposalStartTime),
        endTime: formatTime(proposalEndTime),
        presentationLetter: proposalLetter || null,
        status: "PENDING",
        skillOfferedId: proposalSkillOfferedId,
        skillRequestedId: proposalSkillRequestedId,
        requestUserUid: user.uid,
        offerUserUid: selectedMatch.id,
      })
      
      toast({
        title: "Success",
        description: "Proposal sent successfully!",
      })
      
      // Reset form
      setProposalDate("")
      setProposalStartTime("")
      setProposalEndTime("")
      setProposalLetter("")
      setProposalSkillOfferedId(null)
      setProposalSkillRequestedId(null)
      setIsProposalDialogOpen(false)
    } catch (error) {
      console.error("Failed to send proposal:", error)
      toast({
        title: "Error",
        description: "Failed to send proposal. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  const openProposalDialog = (match: MatchedUser) => {
    setSelectedMatch(match)
    setIsProposalDialogOpen(true)
  }

  const openProfileDialog = (match: MatchedUser) => {
    setSelectedMatch(match)
    setIsProfileDialogOpen(true)
  }

  // Get user's available skills to offer
  const userSkillsToOffer = useMemo(() => {
    return userSkillsOfferedData ?? []
  }, [userSkillsOfferedData])

  if (!user) return null

  if (recommendationsLoading || skillsLoading || userSkillsOfferedLoading) {
    return <div className="text-center py-20 text-gray-500">Loading matches...</div>
  }

  if (recommendationsError) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load recommendations. Please try again later.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Find Your Perfect Skill Match
          </CardTitle>
          <CardDescription>
            Discover people who can teach you what you want to learn and learn what you can teach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, skills, or interests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedSkillFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSkillFilter(null)}
              >
                <Filter className="w-4 h-4 mr-2" />
                All Skills
              </Button>
            </div>
          </div>

          {/* Skill Filter Tags */}
          <div className="flex flex-wrap gap-2">
            {(allSkills || []).slice(0, 8).map((skill) => (
              <Badge
                key={skill.id}
                variant={selectedSkillFilter === skill.label ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSkillFilter(selectedSkillFilter === skill.label ? null : skill.label)}
              >
                {skill.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Match Results */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No matches found</h3>
              <p className="text-gray-600">Try adjusting your search or adding more skills to your profile</p>
            </CardContent>
          </Card>
        ) : (
          filteredMatches.map((match) => (
            <Card key={match.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={match.avatar || "/placeholder.svg"} />
                      <AvatarFallback>
                        {match.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{match.name}</h3>
                        {match.matchScore > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {match.matchScore}% match
                        </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>
                            {typeof match.rating === "number" ? match.rating.toFixed(1) : "New User"}
                          </span>
                        </div>
                        <span>{match.completedSwaps} swaps completed</span>
                        {match.location && <span>{match.location}</span>}
                      </div>
                      {match.bio && <p className="text-gray-700 mb-4">{match.bio}</p>}

                      {/* Skills */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Can teach:</h4>
                          <div className="flex flex-wrap gap-1">
                            {match.skillsOffered.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className={
                                  userSkillLabels.includes(skill) ? "bg-blue-50 border-blue-300 text-blue-700" : ""
                                }
                              >
                                {skill}
                                {userSkillLabels.includes(skill) && " ✓"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Wants to learn:</h4>
                          <div className="flex flex-wrap gap-1">
                            {match.skillsWanted.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className={
                                  userSkillLabels.includes(skill)
                                    ? "bg-green-50 border-green-300 text-green-700"
                                    : ""
                                }
                              >
                                {skill}
                                {userSkillLabels.includes(skill) && " ✓"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:w-48">
                    <Button className="w-full" onClick={() => openProposalDialog(match)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Proposal
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent" onClick={() => openProfileDialog(match)}>
                      View Profile
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Proposal Dialog */}
      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Swap Proposal to {selectedMatch?.name}</DialogTitle>
            <DialogDescription>
              Fill in the details to propose a skill swap with {selectedMatch?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={proposalDate}
                  onChange={(e) => setProposalDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={proposalStartTime}
                  onChange={(e) => setProposalStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={proposalEndTime}
                onChange={(e) => setProposalEndTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillOffered">I will offer *</Label>
              <select
                id="skillOffered"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50"
                value={proposalSkillOfferedId || ""}
                onChange={(e) => setProposalSkillOfferedId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a skill...</option>
                {userSkillsToOffer.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.skill.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillRequested">I want to learn *</Label>
              <select
                id="skillRequested"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50"
                value={proposalSkillRequestedId || ""}
                onChange={(e) => setProposalSkillRequestedId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a skill...</option>
                {selectedMatch?.userSkillsOffered.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.skill.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter">Presentation Letter (optional)</Label>
              <Textarea
                id="letter"
                placeholder="Write a message introducing yourself..."
                value={proposalLetter}
                onChange={(e) => setProposalLetter(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendProposal} disabled={isSubmittingProposal}>
              {isSubmittingProposal ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMatch?.name}'s Profile</DialogTitle>
            <DialogDescription>Details about {selectedMatch?.name}'s skills</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={selectedMatch?.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {selectedMatch?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{selectedMatch?.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>
                      {typeof selectedMatch?.rating === "number"
                        ? selectedMatch.rating.toFixed(1)
                        : "New User"}
                    </span>
                  </div>
                  <span>{selectedMatch?.completedSwaps} swaps completed</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Can teach:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMatch?.skillsOffered.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                  {(!selectedMatch?.skillsOffered || selectedMatch.skillsOffered.length === 0) && (
                    <span className="text-sm text-gray-500">No skills offered yet</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Wants to learn:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMatch?.skillsWanted.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                  {(!selectedMatch?.skillsWanted || selectedMatch.skillsWanted.length === 0) && (
                    <span className="text-sm text-gray-500">No skills wanted yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsProfileDialogOpen(false)
              openProposalDialog(selectedMatch!)
            }}>
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
