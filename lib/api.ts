"use client"

import { useEffect } from "react"

import { useState } from "react"

interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface User {
  uid: string
  email: string
  username: string
  profilePicture?: string | null
  skillDesired?: string[] | null
  skillOffered?: string[] | null
  version: number
  creationTime: string
  lastUpdate: string
}

interface Skill {
  id: number
  label: string
  metadata?: Record<string, string> | null
  description?: string | null
  version: number
  creationTime: string
  lastUpdate: string
}

interface SkillDesired {
  id: number
  userUid: string
  skill: Skill
  version: number
  creationTime: string
  lastUpdate: string
}

interface SkillOffered {
  id: number
  userUid: string
  skill: Skill
  version: number
  creationTime: string
  lastUpdate: string
}

type SwapProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED"

interface SwapProposal {
  id: number
  date: string // yyyy-MM-dd
  startTime: string // HH:mm:ss
  endTime: string // HH:mm:ss
  presentationLetter?: string | null
  status: SwapProposalStatus
  version: number
  creationTime: string
  lastUpdate: string
  skillOfferedId: number
  skillRequestedId: number
  requestUserUid: string
  offerUserUid: string
}

interface Feedback {
  id: number
  rating: number // Backend usa Long, ma JavaScript number va bene
  review: string
  version: number
  creationTime: string
  lastUpdate: string
  reviewerUid?: string | null
  reviewedUid?: string | null
}

const API_BASE_URL = "http://localhost:8080/SwapItBe/api"
const REC_SERVICE_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_REC_SERVICE_URL) || "http://localhost:3002"

interface Recommendation {
  user: User
  skillsOffered: SkillOffered[]
  skillsDesired: SkillDesired[]
  recommendationScore: number
  reason: string
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isAbsoluteUrl = /^https?:\/\//i.test(endpoint)
    const url = isAbsoluteUrl ? endpoint : `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Handle empty responses (e.g., 204 No Content or empty body)
      if (response.status === 204) {
        return undefined as unknown as T
      }
      const text = await response.text()
      if (!text) {
        return undefined as unknown as T
      }
      try {
        return JSON.parse(text) as T
      } catch (e) {
        // Non-JSON payloads are treated as empty
        return undefined as unknown as T
      }
    } catch (error) {
      throw error
    }
  }

  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/users")
  }

  async getUserById(uid: string): Promise<User> {
    return this.request<User>(`/users/${uid}`)
  }

  async createUser(userData: { uid: string; email: string; username: string; profilePicture?: string | null }): Promise<User> {
    return this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async updateUser(uid: string, userData: { email: string; username: string; profilePicture?: string | null }): Promise<User> {
    return this.request<User>(`/users/${uid}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(uid: string): Promise<void> {
    return this.request<void>(`/users/${uid}`, {
      method: "DELETE",
    })
  }

  async getSkills(): Promise<Skill[]> {
    return this.request<Skill[]>("/skills")
  }

  async getSkillById(id: number): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}`)
  }

  async createSkill(skillData: { label: string; metadata?: Record<string, string>; description?: string | null }): Promise<Skill> {
    return this.request<Skill>("/skills", {
      method: "POST",
      body: JSON.stringify(skillData),
    })
  }

  async updateSkill(id: number, skillData: { label: string; metadata?: Record<string, string>; description?: string | null }): Promise<Skill> {
    return this.request<Skill>(`/skills/${id}`, {
      method: "PUT",
      body: JSON.stringify(skillData),
    })
  }

  async deleteSkill(id: number): Promise<void> {
    return this.request<void>(`/skills/${id}`, {
      method: "DELETE",
    })
  }

  async getSkillsDesired(): Promise<SkillDesired[]> {
    return this.request<SkillDesired[]>("/skills/desired")
  }

  async getSkillsDesiredByUser(userUid: string): Promise<SkillDesired[]> {
    return this.request<SkillDesired[]>(`/skills/desired/user/${userUid}`)
  }

  async createSkillDesired(data: { userUid: string; skillId: number }): Promise<SkillDesired> {
    return this.request<SkillDesired>("/skills/desired", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async deleteSkillDesired(id: number): Promise<void> {
    return this.request<void>(`/skills/desired/${id}`, { method: "DELETE" })
  }

  async deleteSkillDesiredByUserAndSkill(userUid: string, skillId: number): Promise<void> {
    return this.request<void>(`/skills/desired/user/${userUid}/skill/${skillId}`, { method: "DELETE" })
  }

  async getSkillsOffered(): Promise<SkillOffered[]> {
    return this.request<SkillOffered[]>("/skills/offered")
  }

  async getSkillsOfferedByUser(userUid: string): Promise<SkillOffered[]> {
    return this.request<SkillOffered[]>(`/skills/offered/user/${userUid}`)
  }

  async createSkillOffered(data: { userUid: string; skillId: number }): Promise<SkillOffered> {
    return this.request<SkillOffered>("/skills/offered", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async deleteSkillOffered(id: number): Promise<void> {
    return this.request<void>(`/skills/offered/${id}`, { method: "DELETE" })
  }

  async deleteSkillOfferedByUserAndSkill(userUid: string, skillId: number): Promise<void> {
    return this.request<void>(`/skills/offered/user/${userUid}/skill/${skillId}`, { method: "DELETE" })
  }

  async getSwapProposals(): Promise<SwapProposal[]> {
    return this.request<SwapProposal[]>("/swap-proposals")
  }

  async getSwapProposalById(id: number): Promise<SwapProposal> {
    return this.request<SwapProposal>(`/swap-proposals/${id}`)
  }

  async getSwapProposalsByRequestUser(userUid: string): Promise<SwapProposal[]> {
    return this.request<SwapProposal[]>(`/swap-proposals/request-user/${userUid}`)
  }

  async getSwapProposalsByOfferUser(userUid: string): Promise<SwapProposal[]> {
    return this.request<SwapProposal[]>(`/swap-proposals/offer-user/${userUid}`)
  }

  async getSwapProposalsByStatus(status: SwapProposalStatus): Promise<SwapProposal[]> {
    return this.request<SwapProposal[]>(`/swap-proposals/status/${status}`)
  }

  async createSwapProposal(proposalData: {
    date: string
    startTime: string
    endTime: string
    presentationLetter?: string | null
    status: SwapProposalStatus
    skillOfferedId: number
    skillRequestedId: number
    requestUserUid: string
    offerUserUid: string
  }): Promise<SwapProposal> {
    return this.request<SwapProposal>("/swap-proposals", {
      method: "POST",
      body: JSON.stringify(proposalData),
    })
  }

  async updateSwapProposal(id: number, proposalData: {
    date: string
    startTime: string
    endTime: string
    presentationLetter?: string | null
    status: SwapProposalStatus
    skillOfferedId: number
    skillRequestedId: number
    requestUserUid: string
    offerUserUid: string
  }): Promise<SwapProposal> {
    return this.request<SwapProposal>(`/swap-proposals/${id}`, {
      method: "PUT",
      body: JSON.stringify(proposalData),
    })
  }

  async deleteSwapProposal(id: number): Promise<void> {
    return this.request<void>(`/swap-proposals/${id}`, {
      method: "DELETE",
    })
  }

  async getFeedbacks(): Promise<Feedback[]> {
    return this.request<Feedback[]>("/feedbacks")
  }

  async getFeedbackById(id: number): Promise<Feedback> {
    return this.request<Feedback>(`/feedbacks/${id}`)
  }

  async getFeedbacksByReviewer(userUid: string): Promise<Feedback[]> {
    return this.request<Feedback[]>(`/feedbacks/reviewer/${userUid}`)
  }

  async getFeedbacksByReviewed(userUid: string): Promise<Feedback[]> {
    return this.request<Feedback[]>(`/feedbacks/reviewed/${userUid}`)
  }

  async createFeedback(feedbackData: { rating: number; review: string; reviewerUid: string; reviewedUid: string }): Promise<Feedback> {
    return this.request<Feedback>("/feedbacks", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    })
  }

  async updateFeedback(id: number, feedbackData: { rating: number; review: string; reviewerUid: string; reviewedUid: string }): Promise<Feedback> {
    return this.request<Feedback>(`/feedbacks/${id}`, {
      method: "PUT",
      body: JSON.stringify(feedbackData),
    })
  }

  async deleteFeedback(id: number): Promise<void> {
    return this.request<void>(`/feedbacks/${id}`, {
      method: "DELETE",
    })
  }

  async getUserByEmail(email: string): Promise<User> {
    return this.request<User>(`/users/email/${email}`)
  }

  async checkUserExists(uid: string): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/users/${uid}/exists`)
  }

  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/users/email/${email}/exists`)
  }

  async getSkillByLabel(label: string): Promise<Skill> {
    return this.request<Skill>(`/skills/label/${label}`)
  }

  async checkSkillExists(id: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/${id}/exists`)
  }

  async checkLabelExists(label: string): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/label/${label}/exists`)
  }

  async getSkillDesiredById(id: number): Promise<SkillDesired> {
    return this.request<SkillDesired>(`/skills/desired/${id}`)
  }

  async getUsersWhoDesireSkill(skillId: number): Promise<SkillDesired[]> {
    return this.request<SkillDesired[]>(`/skills/desired/skill/${skillId}`)
  }

  async updateSkillDesired(id: number, data: { userUid: string; skillId: number }): Promise<SkillDesired> {
    return this.request<SkillDesired>(`/skills/desired/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async checkSkillDesiredExists(id: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/desired/${id}/exists`)
  }

  async checkUserDesiresSkill(userUid: string, skillId: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/desired/user/${userUid}/skill/${skillId}/exists`)
  }

  async getSkillOfferedById(id: number): Promise<SkillOffered> {
    return this.request<SkillOffered>(`/skills/offered/${id}`)
  }

  async getUsersWhoOfferSkill(skillId: number): Promise<SkillOffered[]> {
    return this.request<SkillOffered[]>(`/skills/offered/skill/${skillId}`)
  }

  async updateSkillOffered(id: number, data: { userUid: string; skillId: number }): Promise<SkillOffered> {
    return this.request<SkillOffered>(`/skills/offered/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async checkSkillOfferedExists(id: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/offered/${id}/exists`)
  }

  async checkUserOffersSkill(userUid: string, skillId: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/skills/offered/user/${userUid}/skill/${skillId}/exists`)
  }

  async checkSwapProposalExists(id: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/swap-proposals/${id}/exists`)
  }

  async checkFeedbackExists(id: number): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>(`/feedbacks/${id}/exists`)
  }

  // Google Calendar
  async getSwapRecommendations(userUid: string, limit?: number): Promise<Recommendation[]> {
    const baseUrl = REC_SERVICE_BASE_URL.replace(/\/$/, "")
    let endpoint = `${baseUrl}/recommendations/swaps/${userUid}`

    if (typeof limit === "number") {
      const searchParams = new URLSearchParams()
      searchParams.set("limit", String(limit))
      endpoint = `${endpoint}?${searchParams.toString()}`
    }

    return this.request<Recommendation[]>(endpoint)
  }

  async getCalendarEvents(): Promise<any[]> {
    return this.request<any[]>("/gcalendar/events")
  }

  async createCalendarEvent(event: any): Promise<void> {
    return this.request<void>("/gcalendar/events", {
      method: "POST",
      body: JSON.stringify(event),
    })
  }
}

export const apiClient = new ApiClient()

export function useApiCall<T>(apiCall: () => Promise<T>, dependencies: any[] = []) {
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const data = await apiCall()
        if (isMounted) {
          setState({ data, loading: false, error: null })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "An error occurred",
          })
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, dependencies)

  return state
}

export type {
  User,
  Skill,
  SkillDesired,
  SkillOffered,
  SwapProposal,
  Feedback,
  ApiResponse,
  Recommendation,
}
