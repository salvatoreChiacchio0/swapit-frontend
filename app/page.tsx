"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Users, Sparkles, Heart, UserPlus, Search, MessageCircle } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"
import { Dashboard } from "@/components/dashboard"

const HeroIllustration = () => (
  <div className="relative w-full max-w-2xl mx-auto h-96 flex items-center justify-center">
    {/* Background glow */}
    <div className="absolute inset-0 bg-gradient-to-r from-blue-200/30 via-purple-200/30 to-orange-200/30 rounded-full blur-3xl animate-pulse" />

    {/* Light trails */}
    <div className="absolute inset-0">
      <div className="absolute top-1/2 left-1/4 w-32 h-1 bg-gradient-to-r from-blue-400 to-transparent rounded-full animate-pulse opacity-60" />
      <div className="absolute top-1/3 right-1/4 w-24 h-1 bg-gradient-to-l from-purple-400 to-transparent rounded-full animate-pulse opacity-60 delay-1000" />
      <div className="absolute bottom-1/3 left-1/3 w-28 h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full animate-pulse opacity-60 delay-2000" />
    </div>

    {/* Person 1 - Left */}
    <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
      <div className="relative">
        {/* Person silhouette */}
        <div className="w-24 h-32 bg-gradient-to-b from-blue-300 to-blue-400 rounded-t-full rounded-b-lg shadow-lg transform hover:scale-105 transition-transform duration-500" />
        {/* Glowing cube */}
        <div className="absolute -right-6 top-8 w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg animate-bounce transform rotate-12">
          <div className="absolute inset-1 bg-gradient-to-br from-blue-200 to-blue-300 rounded opacity-60" />
        </div>
      </div>
    </div>

    {/* Person 2 - Right */}
    <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
      <div className="relative">
        {/* Person silhouette */}
        <div className="w-24 h-32 bg-gradient-to-b from-purple-300 to-purple-400 rounded-t-full rounded-b-lg shadow-lg transform hover:scale-105 transition-transform duration-500" />
        {/* Glowing cube */}
        <div className="absolute -left-6 top-8 w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg animate-bounce transform -rotate-12 delay-500">
          <div className="absolute inset-1 bg-gradient-to-br from-purple-200 to-purple-300 rounded opacity-60" />
        </div>
      </div>
    </div>

    {/* Central exchange area */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-orange-400 rounded-2xl shadow-xl animate-spin-slow flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
    </div>

    {/* Floating knowledge particles */}
    <div className="absolute top-1/4 left-1/2 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-60" />
    <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-60 delay-1000" />
    <div className="absolute top-3/4 left-1/3 w-4 h-4 bg-orange-400 rounded-full animate-ping opacity-60 delay-2000" />
  </div>
)

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()

  if (user) {
    return <Dashboard />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50">
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">SwapIt</span>
          </div>
          <Button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Get Started
          </Button>
        </div>
      </header>

      <section className="py-20 px-6 text-center">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-0 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              Join 2,847+ Active Learners
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 text-balance">
            Exchange Skills,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
              Grow Together
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto text-pretty leading-relaxed">
            Connect with others to share knowledge, learn new skills, and build meaningful relationships.
            <span className="font-semibold text-purple-600"> No money needed.</span>
          </p>

          {/* Hero Illustration */}
          <div className="mb-12">
            <HeroIllustration />
          </div>

          <Button
            size="lg"
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 hover:from-blue-600 hover:via-purple-600 hover:to-orange-600 text-white text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      <section className="py-20 px-6 bg-white/60 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Three simple steps to start exchanging skills</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <UserPlus className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Create Profile</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Share your skills and what you'd like to learn</p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Find Matches</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Discover perfect skill exchange partners</p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 rounded-3xl border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-0">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Start Learning</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Connect, schedule, and exchange knowledge</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Why Choose SwapIt?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Building a more inclusive and connected world through skill sharing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Heart className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Mutual Learning</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Everyone teaches, everyone learns. Build meaningful connections through shared knowledge.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Inclusive Community</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Welcome everyone regardless of background, experience level, or location.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-12 h-12 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">No Money Needed</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Break down financial barriers. Exchange skills freely and build a gift economy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Join Our Community</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Thousands of learners sharing knowledge every day</p>
          </div>

          {/* Community avatars showcase */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`w-16 h-16 rounded-2xl shadow-lg transform hover:scale-110 transition-all duration-300 ${
                  i % 3 === 0
                    ? "bg-gradient-to-br from-blue-300 to-blue-500"
                    : i % 3 === 1
                      ? "bg-gradient-to-br from-purple-300 to-purple-500"
                      : "bg-gradient-to-br from-orange-300 to-orange-500"
                }`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${(i * 15) % 360}deg)`,
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">2,847+</div>
              <div className="text-gray-600 text-lg">Active Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">15,293</div>
              <div className="text-gray-600 text-lg">Skills Exchanged</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">4.9★</div>
              <div className="text-gray-600 text-lg">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full animate-pulse" />
          <div className="absolute top-20 right-20 w-24 h-24 border border-white rounded-full animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-1/3 w-20 h-20 border border-white rounded-full animate-pulse delay-2000" />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-balance">Ready to Start Learning?</h2>
          <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-3xl mx-auto leading-relaxed">
            Join thousands of people exchanging skills and building meaningful connections
          </p>

          <Button
            size="lg"
            onClick={() => setShowAuthModal(true)}
            className="bg-white text-gray-900 hover:bg-gray-100 text-xl px-12 py-6 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 font-semibold"
          >
            Join SwapIt Today <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </div>
      </section>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  )
}
