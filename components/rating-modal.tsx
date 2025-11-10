"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface RatingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: {
    id: string
    partner: {
      id: string
      name: string
      avatar: string
    }
    skillTaught: string
    skillLearned: string
    date: string
  }
  onSubmitRating: (rating: number, feedback: string) => Promise<void>
}

export function RatingModal({ open, onOpenChange, session, onSubmitRating }: RatingModalProps) {                                                                
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setRating(0)
      setHoveredRating(0)
      setFeedback("")
    }
  }, [open])

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating before submitting.")
      return
    }
    
    if (!user) {
      alert("User is not available. Please try again.")
      return
    }
    
    if (!session.partner?.id) {
      alert("Partner information is missing. Please try again.")
      return
    }

    if (typeof onSubmitRating !== 'function') {
      alert("Error: onSubmitRating is not a function. Please refresh the page.")
      return
    }
    
    setIsSubmitting(true)
    try {
      const promiseResult = onSubmitRating(rating, feedback)
      const promise = promiseResult instanceof Promise ? promiseResult : Promise.resolve(promiseResult)
      await promise
      
      onOpenChange(false)
      setRating(0)
      setHoveredRating(0)
      setFeedback("")
    } catch (e) {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1:
        return "Poor"
      case 2:
        return "Fair"
      case 3:
        return "Good"
      case 4:
        return "Very Good"
      case 5:
        return "Excellent"
      default:
        return "Rate your experience"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Skill Swap</DialogTitle>
          <DialogDescription>Help build trust in our community by sharing your experience</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={session.partner?.avatar || "/placeholder.svg"} />
              <AvatarFallback>
                {session.partner?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{session.partner?.name || "Unknown User"}</h3>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Taught: {session.skillTaught}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Learned: {session.skillLearned}
                </Badge>
              </div>
            </div>
          </div>

          {/* Rating Stars */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">How was your experience?</h4>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 hover:scale-110 transition-transform"
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600">{getRatingText(hoveredRating || rating)}</p>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share your feedback (optional)</label>
            <Textarea
              placeholder="What did you learn? How was the teaching style? Any suggestions for improvement?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault()
                handleSubmit()
              }} 
              disabled={rating === 0 || isSubmitting} 
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
