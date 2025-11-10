"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Plus, X, User as UserIcon, BookOpen, Target } from "lucide-react" // per icone skills/avatar
import { toast } from "@/components/ui/use-toast"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { login, register } = useAuth()

  const [registerProfilePicture, setRegisterProfilePicture] = useState<string | null>(null)
  const [registerProfilePicturePreview, setRegisterProfilePicturePreview] = useState<string | undefined>(undefined)
  const [registerSkillOffered, setRegisterSkillOffered] = useState<string>("")
  const [registerSkillsOffered, setRegisterSkillsOffered] = useState<string[]>([])
  const [registerSkillWanted, setRegisterSkillWanted] = useState<string>("")
  const [registerSkillsWanted, setRegisterSkillsWanted] = useState<string[]>([])
  const [isRegistering, setIsRegistering] = useState(false)

  const addRegisterSkillOffered = (skill: string) => {
    if (skill && !registerSkillsOffered.includes(skill)) {
      setRegisterSkillsOffered([...registerSkillsOffered, skill])
      setRegisterSkillOffered("")
    }
  }
  const removeRegisterSkillOffered = (skill: string) => {
    setRegisterSkillsOffered(registerSkillsOffered.filter((s) => s !== skill))
  }
  const addRegisterSkillWanted = (skill: string) => {
    if (skill && !registerSkillsWanted.includes(skill)) {
      setRegisterSkillsWanted([...registerSkillsWanted, skill])
      setRegisterSkillWanted("")
    }
  }
  const removeRegisterSkillWanted = (skill: string) => {
    setRegisterSkillsWanted(registerSkillsWanted.filter((s) => s !== skill))
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await login(email, password)
      onOpenChange(false)
    } catch (err) {
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsRegistering(true)
    try {
      const formData = new FormData(e.currentTarget)
      const name = formData.get("name") as string
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      await register(
        name,
        email,
        password,
        registerProfilePicture, // string | null (b64, no header)
        registerSkillsOffered,
        registerSkillsWanted
      )
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Errore registrazione", description: "Non è stato possibile creare l'account.", variant: "destructive" })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl">Welcome to SwapIt</DialogTitle>
          </div>
          <DialogDescription className="text-center">Join our community of skill swappers</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" placeholder="your@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" name="password" type="password" placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <Input id="register-name" name="name" type="text" placeholder="John Doe" required />
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" name="email" type="email" placeholder="your@email.com" required />
              </div>
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" name="password" type="password" placeholder="••••••••" required />
              </div>
              {/* Profile Picture */}
              <div className="space-y-2">
                <Label htmlFor="register-profile-pic">Profile Picture</Label>
                <Input
                  id="register-profile-pic"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        const base64 = reader.result as string
                        setRegisterProfilePicturePreview(base64)
                        setRegisterProfilePicture(base64.split(",")[1] ?? null)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                {registerProfilePicturePreview && (
                  <img src={registerProfilePicturePreview} alt="preview" className="w-16 h-16 object-cover rounded-full mt-1" />
                )}
                <div className="text-xs text-gray-500">Optional. Recommended: 200x200px</div>
              </div>
              <Button type="submit" className="w-full" disabled={isRegistering}>
                {isRegistering ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
