"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  useApiCall,
  apiClient,
  type SkillOffered,
  type SkillDesired,
  type Recommendation,
  type Skill,
  type User,
} from "@/lib/api"
import { Search, Star, MessageSquare, ArrowRight, Users, Filter, Loader2 } from "lucide-react"
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

type UserSkillBundle = {
  user: User
  offered: SkillOffered[]
  desired: SkillDesired[]
  reason?: string | null
  matchScore?: number
}

// Real API-based matching logic

export function SkillMatcher() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<Skill | null>(null)
  const [baseMatches, setBaseMatches] = useState<MatchedUser[]>([])
  const [skillFilteredMatches, setSkillFilteredMatches] = useState<MatchedUser[] | null>(null)
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [isSkillFilterLoading, setIsSkillFilterLoading] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchedUser | null>(null)
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [ratingsMap, setRatingsMap] = useState<Record<string, number | null>>({})
  const lastFetchedRatingsKeyRef = useRef<string>("")
  const userDataCacheRef = useRef(
    new Map<string, { user: User; offered: SkillOffered[]; desired: SkillDesired[]; reason?: string | null; matchScore?: number }>(),
  )
  const hasFetchedFallbackRef = useRef(false)

  // Proposal form state
  const [proposalDate, setProposalDate] = useState("")
  const [proposalStartTime, setProposalStartTime] = useState("")
  const [proposalEndTime, setProposalEndTime] = useState("")
  const [proposalLetter, setProposalLetter] = useState("")
  const [proposalSkillOfferedId, setProposalSkillOfferedId] = useState<number | null>(null)
  const [proposalSkillRequestedId, setProposalSkillRequestedId] = useState<number | null>(null)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)
  
  // Validazione orari
  const isTimeValid = proposalStartTime && proposalEndTime ? (() => {
    const start = new Date(`2000-01-01T${proposalStartTime}`)
    const end = new Date(`2000-01-01T${proposalEndTime}`)
    return end > start
  })() : true

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

  const buildMatchesFromBundles = useCallback(
    (bundles: UserSkillBundle[]): MatchedUser[] => {
      if (!user) return []

      const currentUserUid = user.uid
      const userWanted = user.skillsWanted ?? []
      const userOffered = user.skillsOffered ?? []

      return bundles
        .filter((bundle) => bundle.user.uid !== currentUserUid)
        .map((bundle) => {
          const skillsOfferedLabels = bundle.offered.map((o) => o.skill.label)
          const skillsWantedLabels = bundle.desired.map((d) => d.skill.label)

          const mutualSkillsSet = new Set<string>()

          userWanted.forEach((wanted) => {
            if (skillsOfferedLabels.includes(wanted)) {
              mutualSkillsSet.add(wanted)
            }
          })

          userOffered.forEach((offeredLabel) => {
            if (skillsWantedLabels.includes(offeredLabel)) {
              mutualSkillsSet.add(offeredLabel)
            }
          })

          const mutualSkills = Array.from(mutualSkillsSet)
          const normalizedScore =
            typeof bundle.matchScore === "number"
              ? Math.min(bundle.matchScore, 100)
              : mutualSkills.length > 0
                ? 50
                : 0

          const displayName = bundle.user.username || bundle.user.email || bundle.user.uid
          const reason = (bundle.reason ?? "").trim()
          const normalizedReason = reason
            ? reason.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            : ""
          const shouldHideReason =
            normalizedReason === "consigliato in base alle skill disponibili e alla popolarita degli utenti"

          return {
            id: bundle.user.uid,
            name: displayName,
            avatar: normalizeProfilePicture(bundle.user.profilePicture) || "/placeholder.svg",
            bio: reason && !shouldHideReason ? reason : "",
            rating: null,
            completedSwaps: 0,
            skillsOffered: skillsOfferedLabels,
            skillsOfferedIds: bundle.offered.map((o) => o.id),
            skillsWanted: skillsWantedLabels,
            skillsWantedIds: bundle.desired.map((d) => d.id),
            matchScore: normalizedScore,
            mutualSkills,
            userSkillsOffered: bundle.offered,
            userSkillsDesired: bundle.desired,
          }
        })
    },
    [user],
  )

  const ensureUserBundle = useCallback(
    async (uid: string): Promise<UserSkillBundle | null> => {
      if (!uid || uid === user?.uid) {
        return null
      }

      const cache = userDataCacheRef.current
      if (cache.has(uid)) {
        return cache.get(uid)!
      }

      try {
        const [userData, offered, desired] = await Promise.all([
          apiClient.getUserById(uid),
          apiClient.getSkillsOfferedByUser(uid),
          apiClient.getSkillsDesiredByUser(uid),
        ])

        const bundle: UserSkillBundle = {
          user: userData,
          offered,
          desired,
        }

        cache.set(uid, bundle)
        return bundle
      } catch (error) {
        return null
      }
    },
    [user?.uid],
  )

  const fetchAllUsers = useCallback(async () => {
    if (!user) return

    setMatchesLoading(true)
    setMatchesError(null)

    try {
      const [users, offered, desired] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getSkillsOffered(),
        apiClient.getSkillsDesired(),
      ])

      const offeredMap = new Map<string, SkillOffered[]>()
      offered.forEach((entry) => {
        if (!offeredMap.has(entry.userUid)) {
          offeredMap.set(entry.userUid, [])
        }
        offeredMap.get(entry.userUid)!.push(entry)
      })

      const desiredMap = new Map<string, SkillDesired[]>()
      desired.forEach((entry) => {
        if (!desiredMap.has(entry.userUid)) {
          desiredMap.set(entry.userUid, [])
        }
        desiredMap.get(entry.userUid)!.push(entry)
      })

      const bundles: UserSkillBundle[] = users
        .filter((u) => u.uid !== user.uid)
        .map((u) => {
          const bundle: UserSkillBundle = {
            user: u,
            offered: offeredMap.get(u.uid) ?? [],
            desired: desiredMap.get(u.uid) ?? [],
            reason: "",
            matchScore: 0,
          }

          return bundle
        })

      const cache = userDataCacheRef.current
      bundles.forEach((bundle) => {
        cache.set(bundle.user.uid, bundle)
      })

      setBaseMatches(buildMatchesFromBundles(bundles))
      setSkillFilteredMatches(null)
      setMatchesError(null)
    } catch (error) {
      setBaseMatches([])
      setMatchesError("Impossibile caricare gli utenti al momento. Riprova più tardi.")
      toast({
        title: "Errore",
        description: "Non è stato possibile recuperare gli utenti.",
        variant: "destructive",
      })
    } finally {
      setMatchesLoading(false)
    }
  }, [user, buildMatchesFromBundles, toast])

  useEffect(() => {
    if (!user) return

    if (recommendationsLoading) {
      setMatchesLoading(true)
      return
    }

    if (recommendations && recommendations.length > 0) {
      const maxScore = recommendations.reduce(
        (max, rec) => (rec.recommendationScore > max ? rec.recommendationScore : max),
        0,
      )

      const bundles: UserSkillBundle[] = recommendations.map((rec) => ({
        user: rec.user,
        offered: rec.skillsOffered,
        desired: rec.skillsDesired,
        reason: rec.reason,
        matchScore: maxScore > 0 ? Math.round((rec.recommendationScore / maxScore) * 100) : 0,
      }))

      const cache = userDataCacheRef.current
      bundles.forEach((bundle) => {
        cache.set(bundle.user.uid, bundle)
      })

      setBaseMatches(buildMatchesFromBundles(bundles))
      setSkillFilteredMatches(null)
      setMatchesError(null)
      setMatchesLoading(false)
      hasFetchedFallbackRef.current = false
      return
    }

    if (!hasFetchedFallbackRef.current && (recommendationsError || (recommendations && recommendations.length === 0))) {
      hasFetchedFallbackRef.current = true
      void fetchAllUsers()
    }
  }, [
    user,
    recommendations,
    recommendationsLoading,
    recommendationsError,
    buildMatchesFromBundles,
    fetchAllUsers,
  ])

  const fetchSkillMatches = useCallback(
    async (skill: Skill) => {
      if (!skill) return

      setSelectedSkillFilter(skill)
      setSkillFilteredMatches(null)
      setMatchesError(null)
      setIsSkillFilterLoading(true)

      try {
        const offeredEntries = await apiClient.getUsersWhoOfferSkill(skill.id)

        if (!offeredEntries || offeredEntries.length === 0) {
          setSkillFilteredMatches([])
          return
        }

        const bundles = await Promise.all(
          offeredEntries.map(async (entry) => {
            const bundle = await ensureUserBundle(entry.userUid)
            return bundle
          }),
        )

        const uniqueBundlesMap = new Map<string, UserSkillBundle>()
        bundles.forEach((bundle) => {
          if (bundle) {
            uniqueBundlesMap.set(bundle.user.uid, {
              ...bundle,
              matchScore: 90,
              reason: bundle.reason,
            })
          }
        })

        const matchList = buildMatchesFromBundles(Array.from(uniqueBundlesMap.values()))
        setSkillFilteredMatches(matchList)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Non è stato possibile filtrare gli utenti per la skill selezionata.",
          variant: "destructive",
        })
        setSelectedSkillFilter(null)
        setSkillFilteredMatches(null)
        setMatchesError("Errore durante il caricamento degli utenti per la skill selezionata.")
      } finally {
        setIsSkillFilterLoading(false)
      }
    },
    [buildMatchesFromBundles, ensureUserBundle, toast],
  )

  const handleClearSkillFilters = useCallback(() => {
    if (!selectedSkillFilter && skillFilteredMatches === null) {
      return
    }
    setSelectedSkillFilter(null)
    setSkillFilteredMatches(null)
    setMatchesError(null)
  }, [selectedSkillFilter, skillFilteredMatches])

  const handleSkillBadgeClick = (skill: Skill) => {
    if (selectedSkillFilter?.id === skill.id) {
      handleClearSkillFilters()
      return
    }

    void fetchSkillMatches(skill)
  }

  const matchesToDisplay = useMemo(() => {
    const source = skillFilteredMatches ?? baseMatches
    return source.map((match) => ({
      ...match,
      rating: typeof ratingsMap[match.id] === "number" ? ratingsMap[match.id] : match.rating,
    }))
  }, [skillFilteredMatches, baseMatches, ratingsMap])

  const filteredMatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    const filtered = matchesToDisplay.filter((match) => {
      if (!term) return true

      const haystack = [
        match.name,
        ...match.skillsOffered,
        ...match.skillsWanted,
        match.bio ?? "",
        match.location ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(term)
    })

    return filtered.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
  }, [matchesToDisplay, searchTerm])

  const matchesData = skillFilteredMatches ?? baseMatches
  const showLoadingCard = matchesLoading && matchesData.length === 0

  useEffect(() => {
    const matches = skillFilteredMatches ?? baseMatches
    if (matches.length === 0) {
      setRatingsMap({})
      lastFetchedRatingsKeyRef.current = ""
      return
    }

    const idsKey = matches
      .map((match) => match.id)
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
          matches.map(async (match) => {
            try {
              const feedbacks = await apiClient.getFeedbacksByReviewed(match.id)
              if (!feedbacks || feedbacks.length === 0) {
                return [match.id, null] as const
              }
              const total = feedbacks.reduce((sum, feedback) => sum + (feedback?.rating ?? 0), 0)
              const average = feedbacks.length > 0 ? Math.round((total / feedbacks.length) * 10) / 10 : null
              return [match.id, average] as const
            } catch (error) {
              return [match.id, null] as const
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

    void fetchRatings()

    return () => {
      isCancelled = true
    }
  }, [baseMatches, skillFilteredMatches])

  useEffect(() => {
    if (!selectedMatch) return
    const updated = filteredMatches.find((match) => match.id === selectedMatch.id)
    if (!updated) {
      setSelectedMatch(null)
      setIsProposalDialogOpen(false)
      setIsProfileDialogOpen(false)
      return
    }
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

    // Validazione: endTime deve essere maggiore di startTime
    if (proposalStartTime && proposalEndTime) {
      const start = new Date(`2000-01-01T${proposalStartTime}`)
      const end = new Date(`2000-01-01T${proposalEndTime}`)
      if (end <= start) {
        toast({
          title: "Error",
          description: "End time must be greater than start time",
          variant: "destructive",
        })
        return
      }
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

  const noMatchesLoaded =
    (skillFilteredMatches === null || skillFilteredMatches.length === 0) && baseMatches.length === 0
  const isInitialLoading =
    (matchesLoading || skillsLoading || userSkillsOfferedLoading) && noMatchesLoaded

  if (isInitialLoading) {
    return <div className="text-center py-20 text-gray-500">Loading matches...</div>
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
                variant={selectedSkillFilter ? "outline" : "default"}
                size="sm"
                onClick={handleClearSkillFilters}
                disabled={isSkillFilterLoading}
              >
                <Filter className="w-4 h-4 mr-2" />
                All Skills
              </Button>
            </div>
          </div>

          {/* Skill Filter Tags */}
          <div className="flex flex-wrap gap-2">
            {(allSkills || []).map((skill) => (
              <Badge
                key={skill.id}
                variant={selectedSkillFilter?.id === skill.id ? "default" : "outline"}
                className={`cursor-pointer transition ${isSkillFilterLoading ? "pointer-events-none opacity-60" : ""}`}
                onClick={() => handleSkillBadgeClick(skill)}
              >
                {skill.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Match Results */}
      <div className="space-y-4">
        {matchesError && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <h3 className="text-lg font-semibold text-red-500">Si è verificato un errore</h3>
              <p className="text-sm text-red-500">{matchesError}</p>
              {baseMatches.length === 0 && (
                <Button size="sm" variant="outline" onClick={() => void fetchAllUsers()} disabled={matchesLoading}>
                  Riprova
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!matchesError && showLoadingCard && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Caricamento utenti...</span>
            </CardContent>
          </Card>
        )}

        {!matchesError && !showLoadingCard && filteredMatches.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Nessun utente trovato</h3>
              <p className="text-gray-600">Prova a modificare la ricerca o ad aggiungere nuove skill al tuo profilo.</p>
            </CardContent>
          </Card>
        )}

        {!matchesError && !showLoadingCard && filteredMatches.length > 0 && (
          <>
            {isSkillFilterLoading && selectedSkillFilter && (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-6 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Caricamento utenti per {selectedSkillFilter.label}...</span>
                </CardContent>
              </Card>
            )}
            {filteredMatches.map((match) => (
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
            ))}
          </>
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
                min={proposalStartTime || undefined}
                className={!isTimeValid && proposalStartTime && proposalEndTime ? "border-red-500" : ""}
              />
              {!isTimeValid && proposalStartTime && proposalEndTime && (
                <p className="text-sm text-red-500">End time must be greater than start time</p>
              )}
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
            <Button 
              onClick={handleSendProposal} 
              disabled={isSubmittingProposal || !isTimeValid}
            >
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
