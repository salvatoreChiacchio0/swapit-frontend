"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiClient, type User } from "@/lib/api"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { connectChat, disconnectChat } from "@/lib/chatClient"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { normalizeProfilePicture } from "@/lib/utils"

interface AuthUser extends User {
  skillsOffered: string[]
  skillsWanted: string[]
  rating: number
  completedSwaps: number
}

interface AuthContextType {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, profilePicture?: string | null, skillsOffered?: string[], skillsWanted?: string[]) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>
  loading: boolean
  error: string | null
}

  const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();

  // Funzione helper per caricare i dati utente dal backend
  const loadUserData = async (firebaseUser: any) => {
    try {
      // Recupera utente dal backend tramite uid Firebase
      const response = await fetch(`http://localhost:8080/SwapItBe/api/users/${firebaseUser.uid}`)
      if (!response.ok) {
        return null
      }
      
      const jsonPayload = await response.json()
      const payloadAny = jsonPayload as any
      const foundUser = Array.isArray(payloadAny?.users) ? payloadAny.users[0] : payloadAny
      
      if (!foundUser) {
        return null
      }

      const backendUserUid = foundUser.uid
      let skillsWanted: string[] = []
      let skillsOffered: string[] = []
      let rating = 0
      let completedSwaps = 0

      try {
        const desired = await apiClient.getSkillsDesiredByUser(backendUserUid)
        const offered = await apiClient.getSkillsOfferedByUser(backendUserUid)
        skillsWanted = desired.map((d) => d.skill.label)
        skillsOffered = offered.map((o) => o.skill.label)
      } catch (e) {
      }

      try {
        const feedbacks = await apiClient.getFeedbacksByReviewed(backendUserUid)
        rating = feedbacks.length > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length : 0
      } catch (e) {
      }

      try {
        const proposals = await apiClient.getSwapProposalsByRequestUser(backendUserUid)
        completedSwaps = proposals.filter((p) => p.status === "COMPLETED").length
      } catch (e) {
      }
      
      const profilePicture = normalizeProfilePicture(foundUser.profilePicture)
      const authUser: AuthUser = {
        ...foundUser,
        skillsOffered,
        skillsWanted,
        rating: Math.round(rating * 10) / 10,
        completedSwaps,
        profilePicture,
      }

      return authUser
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true)
        const userData = await loadUserData(firebaseUser)
        if (userData) {
          setUser(userData)
          try { 
            await connectChat() 
          } catch (e) { 
          }
        } else {
          setUser(null)
        }
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      const authUser = await loadUserData(firebaseUser)
      if (!authUser) {
        const errMsg = "Utente non trovato nel backend"
        toast({ title: "Login fallito", description: errMsg, variant: "destructive" })
        setError(errMsg)
        throw new Error(errMsg)
      }

      setUser(authUser)
      try { await connectChat() } catch (e) { }
      router.push("/dashboard")
    } catch (error) {
      let msg = "Login fallito"
      if (error instanceof Error) {
        if (error.message.includes("auth/wrong-password")) {
          msg = "Password errata."
        } else if (error.message.includes("auth/user-not-found")) {
          msg = "Utente non trovato."
        } else if (error.message.includes("Failed to fetch")) {
          msg = "Impossibile connettersi al backend."
        } else if (error.message.includes("Utente non trovato nel backend")) {
          msg = error.message
        }
      }
      toast({ title: "Errore login", description: msg, variant: "destructive" })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, profilePicture?: string | null, skillsOffered?: string[], skillsWanted?: string[]) => {
    setLoading(true)
    setError(null)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      const backendUserData: any = {
        uid: firebaseUser.uid,
        email,
        username: name || email.split("@")[0],
      }
      if (profilePicture) {
        backendUserData.profilePicture = profilePicture.startsWith('data:image')
          ? profilePicture
          : `data:image/png;base64,${profilePicture}`
      }
      const response = await fetch("http://localhost:8080/SwapItBe/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendUserData),
      })
      if (!response.ok) {
        toast({ title: "Registrazione fallita", description: "Errore creazione utente backend.", variant: "destructive" })
        setError("Errore creazione utente backend")
        return
      }
      const newUser = await response.json()
      const backendUserUid = newUser.uid
      let savedSkillsOffered: string[] = []
      let savedSkillsWanted: string[] = []
      try {
        let allSkills = await apiClient.getSkills()
        if (skillsOffered && skillsOffered.length) {
          for (const label of skillsOffered) {
            let skill = allSkills.find(s => s.label === label)
            if (!skill) {
              skill = await apiClient.createSkill({ label })
              allSkills = [ ...allSkills, skill ]
            }
            try {
              await apiClient.createSkillOffered({ userUid: backendUserUid, skillId: skill.id })
              savedSkillsOffered.push(label)
            } catch {}
          }
        }
        if (skillsWanted && skillsWanted.length) {
          for (const label of skillsWanted) {
            let skill = allSkills.find(s => s.label === label)
            if (!skill) {
              skill = await apiClient.createSkill({ label })
              allSkills = [ ...allSkills, skill ]
            }
            try {
              await apiClient.createSkillDesired({ userUid: backendUserUid, skillId: skill.id })
              savedSkillsWanted.push(label)
            } catch {}
          }
        }
      } catch(e) { }
      const regProfilePicture = normalizeProfilePicture(newUser.profilePicture)
      const authUser: AuthUser = {
        ...newUser,
        profilePicture: regProfilePicture,
        skillsOffered: savedSkillsOffered,
        skillsWanted: savedSkillsWanted,
        rating: 0,
        completedSwaps: 0,
      }
      setUser(authUser)
      router.push("/dashboard")
      toast({ title: "Registrazione completata", description: "Benvenuto su SwapIt!", variant: "default" })
    } catch (error) {
      let msg = "Registrazione fallita"
      if (error instanceof Error) {
        if (error.message.includes("auth/email-already-in-use")) {
          msg = "Email già in uso."
        } else if (error.message.includes("auth/weak-password")) {
          msg = "La password deve essere di almeno 6 caratteri."
        } else if (error.message.includes("Failed to fetch")) {
          msg = "Impossibile connettersi al backend."
        }
      }
      toast({ title: "Errore registrazione", description: msg, variant: "destructive" })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
    }
    setUser(null)
    setError(null)
    try { disconnectChat() } catch {}
  }

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const pictureForBackend = updates.profilePicture
        ? (updates.profilePicture.startsWith('data:image')
            ? updates.profilePicture
            : `data:image/png;base64,${updates.profilePicture}`)
        : undefined
      const updatedUser = await apiClient.updateUser(user.uid, {
        email: updates.email ?? user.email,
        username: updates.username ?? user.username,
        profilePicture: pictureForBackend,
      })

      const currentOffered = await apiClient.getSkillsOfferedByUser(user.uid)
      const currentWanted = await apiClient.getSkillsDesiredByUser(user.uid)
      let allSkills = await apiClient.getSkills()
      const offeredList = (updates.skillsOffered ?? user.skillsOffered ?? []).map(l => l.trim())
      const wantedList = (updates.skillsWanted ?? user.skillsWanted ?? []).map(l => l.trim())
      const currentOfferedLabels = currentOffered.map(o => o.skill.label.trim())
      const currentWantedLabels = currentWanted.map(w => w.skill.label.trim())
      const toRemoveOffered = currentOfferedLabels.filter(l => !offeredList.includes(l))
      for (const label of toRemoveOffered) {
        let skill = allSkills.find(s => s.label === label)
        if (!skill) {
          try { skill = await apiClient.getSkillByLabel(label) } catch {}
        }
        if (skill) {
          try { await apiClient.deleteSkillOfferedByUserAndSkill(user.uid, skill.id) } catch(e) { }
        }
      }
      const toRemoveWanted = currentWantedLabels.filter(l => !wantedList.includes(l))
      for (const label of toRemoveWanted) {
        let skill = allSkills.find(s => s.label === label)
        if (!skill) {
          try { skill = await apiClient.getSkillByLabel(label) } catch {}
        }
        if (skill) {
          try { await apiClient.deleteSkillDesiredByUserAndSkill(user.uid, skill.id) } catch(e) { }
        }
      }
      let savedSkillsOffered: string[] = [];
      let savedSkillsWanted: string[] = [];
      for (const label of offeredList) {
        let skill = allSkills.find(s => s.label === label)
        if (!skill) {
          skill = await apiClient.createSkill({ label })
          allSkills = [...allSkills, skill]
        }
        if (!currentOffered.some(o => o.skill.label === label)) {
          try {
            await apiClient.createSkillOffered({ userUid: user.uid, skillId: skill.id })
          } catch (e) { }
        }
        savedSkillsOffered.push(label)
      }
      for (const label of wantedList) {
        let skill = allSkills.find(s => s.label === label)
        if (!skill) {
          skill = await apiClient.createSkill({ label })
          allSkills = [...allSkills, skill]
        }
        if (!currentWanted.some(w => w.skill.label === label)) {
          try {
            await apiClient.createSkillDesired({ userUid: user.uid, skillId: skill.id })
          } catch (e) { }
        }
        savedSkillsWanted.push(label)
      }
      const refreshed = await apiClient.getUserById(user.uid)
      const refreshedPicture = normalizeProfilePicture(refreshed.profilePicture)
      const refreshedOffered = Array.isArray((refreshed as any).skillOffered) ? (refreshed as any).skillOffered as string[] : savedSkillsOffered
      const refreshedWanted = Array.isArray((refreshed as any).skillDesired) ? (refreshed as any).skillDesired as string[] : savedSkillsWanted
      setUser({
        ...user,
        ...refreshed,
        profilePicture: refreshedPicture,
        skillsOffered: refreshedOffered,
        skillsWanted: refreshedWanted,
        rating: user.rating,
        completedSwaps: user.completedSwaps,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Profile update failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
