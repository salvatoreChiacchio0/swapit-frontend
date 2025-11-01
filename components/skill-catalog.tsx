"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Users, TrendingUp, Plus } from "lucide-react"
import { useEffect } from "react"
import { useApiCall, apiClient } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

interface SkillCategory {
  id: string
  name: string
  description: string
  skills: Skill[]
}

interface Skill {
  id: string
  name: string
  description: string
  category: string
  popularity: number
  teachersCount: number
  learnersCount: number
  difficulty: "Beginner" | "Intermediate" | "Advanced"
}

const mockSkillCategories: SkillCategory[] = [
  {
    id: "tech",
    name: "Technology & Programming",
    description: "Software development, web technologies, and digital skills",
    skills: [
      {
        id: "javascript",
        name: "JavaScript",
        description: "Modern web development with JavaScript ES6+",
        category: "tech",
        popularity: 95,
        teachersCount: 234,
        learnersCount: 567,
        difficulty: "Intermediate",
      },
      {
        id: "react",
        name: "React",
        description: "Build modern user interfaces with React",
        category: "tech",
        popularity: 88,
        teachersCount: 189,
        learnersCount: 445,
        difficulty: "Intermediate",
      },
      {
        id: "python",
        name: "Python",
        description: "Programming fundamentals and data science with Python",
        category: "tech",
        popularity: 92,
        teachersCount: 156,
        learnersCount: 389,
        difficulty: "Beginner",
      },
      {
        id: "nodejs",
        name: "Node.js",
        description: "Server-side JavaScript development",
        category: "tech",
        popularity: 78,
        teachersCount: 123,
        learnersCount: 278,
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "languages",
    name: "Languages",
    description: "Learn new languages and improve communication skills",
    skills: [
      {
        id: "spanish",
        name: "Spanish",
        description: "Conversational Spanish for beginners and intermediate learners",
        category: "languages",
        popularity: 89,
        teachersCount: 145,
        learnersCount: 334,
        difficulty: "Beginner",
      },
      {
        id: "french",
        name: "French",
        description: "French language and culture",
        category: "languages",
        popularity: 76,
        teachersCount: 98,
        learnersCount: 223,
        difficulty: "Beginner",
      },
      {
        id: "german",
        name: "German",
        description: "German language for business and travel",
        category: "languages",
        popularity: 68,
        teachersCount: 67,
        learnersCount: 156,
        difficulty: "Intermediate",
      },
    ],
  },
  {
    id: "creative",
    name: "Creative Arts",
    description: "Photography, design, music, and other creative skills",
    skills: [
      {
        id: "photography",
        name: "Photography",
        description: "Digital photography techniques and composition",
        category: "creative",
        popularity: 84,
        teachersCount: 112,
        learnersCount: 267,
        difficulty: "Beginner",
      },
      {
        id: "guitar",
        name: "Guitar",
        description: "Acoustic and electric guitar lessons",
        category: "creative",
        popularity: 79,
        teachersCount: 89,
        learnersCount: 198,
        difficulty: "Beginner",
      },
      {
        id: "piano",
        name: "Piano",
        description: "Classical and modern piano techniques",
        category: "creative",
        popularity: 73,
        teachersCount: 76,
        learnersCount: 167,
        difficulty: "Beginner",
      },
    ],
  },
  {
    id: "lifestyle",
    name: "Lifestyle & Wellness",
    description: "Cooking, fitness, and personal development skills",
    skills: [
      {
        id: "cooking",
        name: "Cooking",
        description: "International cuisine and cooking techniques",
        category: "lifestyle",
        popularity: 87,
        teachersCount: 134,
        learnersCount: 298,
        difficulty: "Beginner",
      },
      {
        id: "fitness",
        name: "Fitness Training",
        description: "Personal training and workout routines",
        category: "lifestyle",
        popularity: 81,
        teachersCount: 98,
        learnersCount: 234,
        difficulty: "Beginner",
      },
      {
        id: "yoga",
        name: "Yoga",
        description: "Hatha, Vinyasa, and meditation practices",
        category: "lifestyle",
        popularity: 75,
        teachersCount: 87,
        learnersCount: 189,
        difficulty: "Beginner",
      },
    ],
  },
]

export function SkillCatalog() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { user, updateProfile } = useAuth()

  // Recupera le skill reali dal backend
  const { data: skills, loading, error } = useApiCall(() => apiClient.getSkills(), [])

  // Ricava le categorie dalle skill reali
  const categories = Array.from(new Set((skills || []).map((s) => s.category || "Other")))

  const filteredSkills = (skills || []).filter((skill) => {
    const matchesSearch =
      skill.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || (skill.category || "Other") === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "Advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleAddSkill = async (skillId: string, type: "OFFERED" | "WANTED") => {
    if (!user) return
    try {
      if (type === "WANTED") {
        await apiClient.createSkillDesired({ userUid: user.uid, skillId: Number(skillId) })
      } else {
        await apiClient.createSkillOffered({ userUid: user.uid, skillId: Number(skillId) })
      }
      // Aggiorna profilo utente
      updateProfile({})
    } catch (e) {
      // gestisci errore
    }
  }
  const handleRemoveSkill = async (skillId: string) => {
    if (!user) return
    try {
      // By default remove from both desired and offered for this skill
      await Promise.allSettled([
        apiClient.deleteSkillDesiredByUserAndSkill(user.uid, Number(skillId)),
        apiClient.deleteSkillOfferedByUserAndSkill(user.uid, Number(skillId)),
      ])
      updateProfile({})
    } catch (e) {
      // gestisci errore
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Skill Catalog
          </CardTitle>
          <CardDescription>
            Explore all available skills in our community and find what you want to learn or teach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading skills...</div>
        ) : error ? (
          <div className="col-span-full text-center py-8 text-red-500">Failed to load skills</div>
        ) : filteredSkills.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No skills found</h3>
              <p className="text-gray-600">Try adjusting your search or category filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredSkills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{skill.label}</h3>
                      <p className="text-sm text-gray-600 mb-3">{skill.description}</p>
                    </div>
                    <Badge className={getDifficultyColor(skill.difficulty || "")}>{skill.difficulty || ""}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Popularity</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${skill.popularity}%` }} />
                        </div>
                        <span className="font-medium">{skill.popularity}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{skill.teachersCount} teachers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{skill.learnersCount} learners</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => handleAddSkill(skill.id, "WANTED")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Want to Learn
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={() => handleAddSkill(skill.id, "OFFERED")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Can Teach
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
