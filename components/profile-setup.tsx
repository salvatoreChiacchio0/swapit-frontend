"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api"
import { normalizeProfilePicture } from "@/lib/utils"
import { X, Plus, Users, BookOpen, Target, Mail, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ProfileSetupProps {
  isEdit?: boolean
}

const popularSkills = [
  "JavaScript",
  "Python",
  "React",
  "Node.js",
  "HTML/CSS",
  "TypeScript",
  "Java",
  "C++",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Italian",
  "Portuguese",
  "Photography",
  "Video Editing",
  "Graphic Design",
  "UI/UX Design",
  "Adobe Photoshop",
  "Guitar",
  "Piano",
  "Singing",
  "Drums",
  "Music Production",
  "Violin",
  "Cooking",
  "Baking",
  "Nutrition",
  "Fitness Training",
  "Yoga",
  "Meditation",
  "Writing",
  "Content Creation",
  "Marketing",
  "SEO",
  "Social Media",
  "Copywriting",
  "Data Analysis",
  "Machine Learning",
  "Excel",
  "PowerBI",
  "Tableau",
  "Project Management",
  "Leadership",
  "Public Speaking",
  "Negotiation",
]

export function ProfileSetup({ isEdit = false }: ProfileSetupProps) {
  const { user, updateProfile } = useAuth()
  const [skillsOffered, setSkillsOffered] = useState<string[]>(user?.skillsOffered || [])
  const [skillsWanted, setSkillsWanted] = useState<string[]>(user?.skillsWanted || [])
  const [email, setEmail] = useState(user?.email || "")
  const [username, setUsername] = useState(user?.username || "")
  const userPic = user?.profilePicture
  const initialProfileSrc = userPic
    ? (userPic.startsWith("data:image") ? userPic : `data:image/png;base64,${userPic}`)
    : undefined
  const initialProfileB64 = userPic
    ? (userPic.startsWith("data:image") ? userPic.split(",")[1] ?? "" : (userPic ?? undefined))
    : undefined
  const [profilePicture, setProfilePicture] = useState<string | undefined>(initialProfileSrc)
  const [profilePictureBase64, setProfilePictureBase64] = useState<string | undefined>(initialProfileB64)
  const [newSkillOffered, setNewSkillOffered] = useState("")
  const [newSkillWanted, setNewSkillWanted] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const addSkillOffered = (skill: string) => {
    if (skill && !skillsOffered.includes(skill)) {
      setSkillsOffered([...skillsOffered, skill])
      setNewSkillOffered("")
    }
  }

  const addSkillWanted = (skill: string) => {
    if (skill && !skillsWanted.includes(skill)) {
      setSkillsWanted([...skillsWanted, skill])
      setNewSkillWanted("")
    }
  }

  const removeSkillOffered = (skill: string) => {
    setSkillsOffered(skillsOffered.filter((s) => s !== skill))
  }

  const removeSkillWanted = (skill: string) => {
    setSkillsWanted(skillsWanted.filter((s) => s !== skill))
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await updateProfile({
        email,
        username,
        profilePicture: profilePicture || undefined,
        skillsOffered,
        skillsWanted,
      })
      toast({ title: "Profilo aggiornato", description: "Profilo aggiornato con successo!", variant: "default" })
    } catch (error) {
      toast({ title: "Errore salvataggio", description: "Si è verificato un errore durante il salvataggio del profilo.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const avatarSrc = normalizeProfilePicture(profilePicture) || normalizeProfilePicture(initialProfileSrc) || "/placeholder.svg"

  return (
    <div className="min-h-screen bg-gray-50">
      {!isEdit && (
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SwapIt</span>
          </div>
        </div>
      </header>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEdit ? "Edit Your Profile" : "Complete Your Profile"}
          </h1>
          <p className="text-gray-600">
            {isEdit
              ? "Update your information and skills to improve your matches"
              : "Tell us about yourself and your skills to start finding perfect swap partners"}
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic information for your SwapIt profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">      
                <div className="space-y-2">
                  <Label htmlFor="profilePicture">Profile Picture</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={avatarSrc} alt="Profile picture preview" />
                      <AvatarFallback className="bg-gray-300">
                        <User className="w-12 h-12 text-gray-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              toast({ 
                                title: "Invalid file type", 
                                description: "Please select an image file.", 
                                variant: "destructive" 
                              })
                              return
                            }
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              const base64 = reader.result as string
                              setProfilePicture(base64)
                              setProfilePictureBase64(base64.split(",")[1] ?? "")   
                            }
                            reader.onerror = () => {
                              toast({ 
                                title: "Error reading file", 
                                description: "Failed to read the image file.", 
                                variant: "destructive" 
                              })
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                      {profilePictureBase64 && (
                        <div className="text-xs text-green-700">Profile picture inserted</div>                                                                 
                      )}
                      <div className="text-xs text-gray-500">Optional. Recommended size: 200x200px</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Your display name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Skills I Can Teach
              </CardTitle>
              <CardDescription>Add skills you're confident teaching to others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill you can teach..."
                  value={newSkillOffered}
                  onChange={(e) => setNewSkillOffered(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkillOffered(newSkillOffered)}
                />
                <Button onClick={() => addSkillOffered(newSkillOffered)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {skillsOffered.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillsOffered.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-green-100 text-green-800">
                      {skill}
                      <button onClick={() => removeSkillOffered(skill)} className="ml-2 hover:text-green-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Popular Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {popularSkills
                    .filter((skill) => !skillsOffered.includes(skill))
                    .slice(0, 15)
                    .map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-green-50 hover:border-green-300"
                        onClick={() => addSkillOffered(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Skills I Want to Learn
              </CardTitle>
              <CardDescription>Add skills you're interested in learning from others</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill you want to learn..."
                  value={newSkillWanted}
                  onChange={(e) => setNewSkillWanted(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkillWanted(newSkillWanted)}
                />
                <Button onClick={() => addSkillWanted(newSkillWanted)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {skillsWanted.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillsWanted.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-blue-100 text-blue-800">
                      {skill}
                      <button onClick={() => removeSkillWanted(skill)} className="ml-2 hover:text-blue-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Popular Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {popularSkills
                    .filter((skill) => !skillsWanted.includes(skill))
                    .slice(0, 15)
                    .map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => addSkillWanted(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 px-8"
              disabled={isSaving || !username || !email || skillsOffered.length === 0 || skillsWanted.length === 0}
            >
              {isSaving ? "Saving..." : isEdit ? "Save Changes" : "Complete Profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
