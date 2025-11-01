"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { apiClient, useApiCall } from "@/lib/api"
import { CalendarIcon, Clock, User, MessageSquare, Target, BookOpen } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

interface CreateSwapModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUser?: {
    id: string
    name: string
    avatar: string
    skillOffered: string
  }
}

// Real users from API

export function CreateSwapModal({ open, onOpenChange, targetUser }: CreateSwapModalProps) {
  const { user } = useAuth()
  const [selectedSkillToOffer, setSelectedSkillToOffer] = useState("")
  const [selectedSkillToLearn, setSelectedSkillToLearn] = useState("")
  const [selectedUser, setSelectedUser] = useState(targetUser?.id || "")
  const [proposedDate, setProposedDate] = useState<Date>()
  const [proposedTime, setProposedTime] = useState("")
  const [duration, setDuration] = useState("")
  const [message, setMessage] = useState("")
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch real users and skills from API
  const { data: allUsers, loading: usersLoading } = useApiCall(() => apiClient.getUsers(), [])
  const { data: allSkills, loading: skillsLoading } = useApiCall(() => apiClient.getSkills(), [])

  if (!user) return null

  const handleSubmit = async () => {
    setIsSubmitting(true)
    if (!allSkills) return

    // Trova gli ID delle skill dai label
    const skillOffered = allSkills.find(s => s.label === selectedSkillToOffer)
    const skillRequested = allSkills.find(s => s.label === selectedSkillToLearn)

    if (!skillOffered || !skillRequested) {
      console.error("Skills not found")
      return
    }

    const swapProposal = {
      requestUserUid: user.uid,
      offerUserUid: selectedUser,
      skillOfferedId: skillOffered.id,
      skillRequestedId: skillRequested.id,
      date: proposedDate?.toISOString().split("T")[0] as string,
      startTime: proposedTime + ":00", // Aggiungi secondi
      endTime: calculateEndTime(proposedTime, duration),
      presentationLetter: message,
      status: "PENDING" as const,
    }

    try {
      await apiClient.createSwapProposal(swapProposal)
      toast({ title: "Proposta inviata", description: "La proposta è stata inviata con successo!", variant: "default" })
      onOpenChange(false)
      resetForm()
    } catch (e) {
      toast({ title: "Errore invio", description: "Errore durante l'invio della proposta.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateEndTime = (startTime: string, duration: string) => {
    if (!startTime || !duration) return ""
    const [hours, minutes] = startTime.split(":").map(Number)
    const durationHours = Number.parseFloat(duration)
    const endHours = hours + Math.floor(durationHours)
    const endMinutes = minutes + (durationHours % 1) * 60
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}:00`
  }

  const resetForm = () => {
    setSelectedSkillToOffer("")
    setSelectedSkillToLearn("")
    setSelectedUser(targetUser?.id || "")
    setProposedDate(undefined)
    setProposedTime("")
    setDuration("")
    setMessage("")
    setStep(1)
  }

  const getMatchingUsers = () => {
    if (!selectedSkillToOffer || !selectedSkillToLearn || !allUsers) return []

    // Filter users who have the skill we want to learn and want the skill we offer
    return allUsers.filter((apiUser) => {
      // This would need to be enhanced with actual skill data from API
      // For now, return all users except current user
      return apiUser.uid !== user.uid
    })
  }

  const selectedUserData = allUsers?.find((u) => u.uid === selectedUser)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create Skill Swap Proposal
          </DialogTitle>
          <DialogDescription>Propose a skill exchange with another community member</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Skills */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Step 1: Choose Skills to Exchange</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Skill You'll Teach
                  </Label>
                  <Select value={selectedSkillToOffer} onValueChange={setSelectedSkillToOffer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a skill you can teach" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.skillsOffered.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Skill You Want to Learn
                  </Label>
                  <Select value={selectedSkillToLearn} onValueChange={setSelectedSkillToLearn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a skill you want to learn" />
                    </SelectTrigger>
                    <SelectContent>
                      {user.skillsWanted.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSkillToOffer && selectedSkillToLearn && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                    <Target className="w-4 h-4" />
                    Skill Exchange Summary
                  </div>
                  <div className="text-sm text-blue-700">
                    You'll teach <span className="font-medium text-green-700">{selectedSkillToOffer}</span> in exchange
                    for learning <span className="font-medium text-blue-700">{selectedSkillToLearn}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!selectedSkillToOffer || !selectedSkillToLearn}>
                  Next: Find Partners
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Partner */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Step 2: Choose Your Swap Partner</div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>

              {targetUser ? (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={
                        targetUser.avatar
                          ? targetUser.avatar.startsWith('data:image')
                            ? targetUser.avatar
                            : `data:image/png;base64,${targetUser.avatar}`
                          : "/placeholder.svg"
                      } />
                      <AvatarFallback>
                        {typeof targetUser.name === 'string' && targetUser.name.trim().length
                          ? targetUser.name.split(" ").map((n) => n[0]).join("")
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{targetUser.name}</div>
                      <div className="text-sm text-gray-600">
                        Offers: <span className="font-medium text-green-600">{targetUser.skillOffered}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Found {getMatchingUsers().length} potential partners for your skill exchange:
                  </div>

                  {getMatchingUsers().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No matching partners found</p>
                      <p className="text-sm">Try different skill combinations</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getMatchingUsers().map((matchUser) => (
                        <div
                          key={matchUser.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedUser === matchUser.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedUser(matchUser.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={
                                matchUser.avatar
                                  ? matchUser.avatar.startsWith('data:image')
                                    ? matchUser.avatar
                                    : `data:image/png;base64,${matchUser.avatar}`
                                  : "/placeholder.svg"
                              } />
                              <AvatarFallback>
                                {typeof matchUser.name === 'string' && matchUser.name.trim().length
                                  ? matchUser.name.split(" ").map((n) => n[0]).join("")
                                  : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{matchUser.name}</div>
                                <Badge variant="secondary">{matchUser.rating} ⭐</Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                Can teach: <span className="font-medium text-green-600">{selectedSkillToLearn}</span> •
                                Wants to learn:{" "}
                                <span className="font-medium text-blue-600">{selectedSkillToOffer}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStep(3)} disabled={!selectedUser}>
                  Next: Schedule Session
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Schedule & Message */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">Step 3: Schedule & Add Message</div>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  Back
                </Button>
              </div>

              {selectedUserData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={
                        selectedUserData?.avatar
                          ? selectedUserData.avatar.startsWith('data:image')
                            ? selectedUserData.avatar
                            : `data:image/png;base64,${selectedUserData.avatar}`
                          : "/placeholder.svg"
                      } />
                      <AvatarFallback>
                        {typeof selectedUserData?.name === 'string' && selectedUserData.name.trim().length
                          ? selectedUserData.name.split(" ").map((n) => n[0]).join("")
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedUserData.name}</div>
                      <div className="text-sm text-gray-600">
                        {selectedSkillToOffer} ↔ {selectedSkillToLearn}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Proposed Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        {proposedDate ? format(proposedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={proposedDate}
                        onSelect={setProposedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Start Time
                  </Label>
                  <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">30 minutes</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="1.5">1.5 hours</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message (Optional)
                </Label>
                <Textarea
                  placeholder="Introduce yourself and explain what you'd like to learn or teach..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!proposedDate || !proposedTime || !duration || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? "Sending..." : "Send Proposal"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
