"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { useApiCall, apiClient } from "@/lib/api"
import { Search, Star, MessageSquare, ArrowRight, Users, Filter } from "lucide-react"

interface MatchedUser {
  id: string
  name: string
  avatar: string
  bio: string
  rating: number
  completedSwaps: number
  skillsOffered: string[]
  skillsWanted: string[]
  matchScore: number
  mutualSkills: string[]
  location?: string
}

// Real API-based matching logic

export function SkillMatcher() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null)

  // Fetch all users and their skills from backend
  const { data: allUsers, loading: usersLoading, error: usersError } = useApiCall(() => apiClient.getUsers(), [])
  const { data: allSkills, loading: skillsLoading, error: skillsError } = useApiCall(() => apiClient.getSkills(), [])

  // Per ora usa solo la lista caricata dall'API come allSkills
  const userSkillLabels = useMemo(() => {
    if (!user) return []
    return [...new Set([...user.skillsOffered, ...user.skillsWanted])]
  }, [user])

  // For now, use a simplified approach without async in useMemo
  const filteredMatches = useMemo(() => {
    if (!user || !allUsers) return []

    // Create basic matches from user data
    const matches: MatchedUser[] = allUsers
      .filter((otherUser) => otherUser.uid !== user.uid)
      .map((otherUser) => ({
        id: otherUser.uid,
        name: otherUser.username,
        avatar: otherUser.profilePicture || "/placeholder.svg",
        bio: `User interested in skill exchange`,
        rating: 4.5, // Default rating
        completedSwaps: 0, // Would need to calculate from proposals
        skillsOffered: [], // Will be populated by separate API calls
        skillsWanted: [], // Will be populated by separate API calls
        matchScore: 50, // Default score
        mutualSkills: [],
      }))

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
  }, [user, allUsers, searchTerm, selectedSkillFilter])

  if (!user) return null

  if (usersLoading || skillsLoading) return <div className="text-center py-20 text-gray-500">Loading matches...</div>

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
                    <Button className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Proposal
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent">
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
    </div>
  )
}
