"use client"

import { useState, useMemo } from "react"
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
import { useApiCall, apiClient, type SkillOffered, type SkillDesired } from "@/lib/api"
import { Search, Star, MessageSquare, ArrowRight, Users, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MatchedUser {
  id: string
  name: string
  avatar: string
  bio: string
  rating: number
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
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<MatchedUser | null>(null)
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)

  // Proposal form state
  const [proposalDate, setProposalDate] = useState("")
  const [proposalStartTime, setProposalStartTime] = useState("")
  const [proposalEndTime, setProposalEndTime] = useState("")
  const [proposalLetter, setProposalLetter] = useState("")
  const [proposalSkillOfferedId, setProposalSkillOfferedId] = useState<number | null>(null)
  const [proposalSkillRequestedId, setProposalSkillRequestedId] = useState<number | null>(null)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)

  // Fetch all users and their skills from backend
  const { data: allUsers, loading: usersLoading, error: usersError } = useApiCall(() => apiClient.getUsers(), [])
  const { data: allSkills, loading: skillsLoading, error: skillsError } = useApiCall(() => apiClient.getSkills(), [])
  const { data: allSkillsOffered, loading: offeredLoading } = useApiCall(() => apiClient.getSkillsOffered(), [])
  const { data: allSkillsDesired, loading: desiredLoading } = useApiCall(() => apiClient.getSkillsDesired(), [])

  // Per ora usa solo la lista caricata dall'API come allSkills
  const userSkillLabels = useMemo(() => {
    if (!user) return []
    return [...new Set([...user.skillsOffered, ...user.skillsWanted])]
  }, [user])

  // Build a complete matched user list with real data
  const filteredMatches = useMemo(() => {
    if (!user || !allUsers || !allSkillsOffered || !allSkillsDesired) return []

    const matches: MatchedUser[] = allUsers
      .filter((otherUser) => otherUser.uid !== user.uid)
      .map((otherUser) => {
        const offered = allSkillsOffered.filter((so) => so.userUid === otherUser.uid)
        const desired = allSkillsDesired.filter((sd) => sd.userUid === otherUser.uid)
        
        const skillsOfferedLabels = offered.map(o => o.skill.label)
        const skillsWantedLabels = desired.map(d => d.skill.label)
        
        // Calculate match score based on complementary skills
        let matchScore = 0
        const mutualSkills: string[] = []
        
        // User wants what other offers
        user.skillsWanted.forEach(wanted => {
          if (skillsOfferedLabels.includes(wanted)) {
            matchScore += 30
            mutualSkills.push(wanted)
          }
        })
        
        // User offers what other wants
        user.skillsOffered.forEach(offered => {
          if (skillsWantedLabels.includes(offered)) {
            matchScore += 30
            if (!mutualSkills.includes(offered)) {
              mutualSkills.push(offered)
            }
          }
        })
        
        return {
          id: otherUser.uid,
          name: otherUser.username,
          avatar: otherUser.profilePicture || "/placeholder.svg",
          bio: `User interested in skill exchange`,
          rating: 4.5, // Default rating
          completedSwaps: 0, // Would need to calculate from proposals
          skillsOffered: skillsOfferedLabels,
          skillsOfferedIds: offered.map(o => o.id),
          skillsWanted: skillsWantedLabels,
          skillsWantedIds: desired.map(d => d.id),
          matchScore: Math.min(matchScore, 100),
          mutualSkills,
          userSkillsOffered: offered,
          userSkillsDesired: desired,
        }
      })
      .filter(match => match.skillsOffered.length > 0 || match.skillsWanted.length > 0) // Only show users with skills

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
  }, [user, allUsers, allSkillsOffered, allSkillsDesired, searchTerm, selectedSkillFilter])

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
    if (!allSkillsOffered || !user) return []
    return allSkillsOffered.filter(so => so.userUid === user.uid)
  }, [allSkillsOffered, user])

  if (!user) return null

  if (usersLoading || skillsLoading || offeredLoading || desiredLoading) {
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
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {match.matchScore}% match
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{match.rating}</span>
                        </div>
                        <span>{match.completedSwaps} swaps completed</span>
                        {match.location && <span>{match.location}</span>}
                      </div>
                      <p className="text-gray-700 mb-4">{match.bio}</p>

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
                    <span>{selectedMatch?.rating}</span>
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
