"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApiCall, apiClient } from "@/lib/api"
import { Bell, Check, X, MessageSquare, Calendar, Star, Users } from "lucide-react"

interface Notification {
  id: string
  type: "proposal" | "message" | "session_reminder" | "rating_request" | "system"
  title: string
  message: string
  timestamp: string
  isRead: boolean
  user?: {
    name: string
    avatar: string
  }
  actionRequired?: boolean
}

// Real notifications from API

export function Notifications() {
  // For now, use empty notifications - in a real app, these would come from API
  const [notifications, setNotifications] = useState<Notification[]>([])

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })))
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "proposal":
        return <Users className="w-4 h-4 text-blue-600" />
      case "message":
        return <MessageSquare className="w-4 h-4 text-green-600" />
      case "session_reminder":
        return <Calendar className="w-4 h-4 text-orange-600" />
      case "rating_request":
        return <Star className="w-4 h-4 text-yellow-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
        <CardDescription>Stay updated with your skill exchange activities</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-4 pb-6">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">We'll notify you about important updates</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead ? "bg-white" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center gap-3">
                            {notification.user && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={notification.user.avatar || "/placeholder.svg"} />
                                  <AvatarFallback className="text-xs">
                                    {notification.user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-500">{notification.user.name}</span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{notification.timestamp}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {notification.actionRequired && !notification.isRead && (
                        <div className="mt-3 flex gap-2">
                          {notification.type === "proposal" && (
                            <>
                              <Button size="sm" className="h-7 text-xs">
                                View Proposal
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                                Decline
                              </Button>
                            </>
                          )}
                          {notification.type === "session_reminder" && (
                            <Button size="sm" className="h-7 text-xs">
                              Join Session
                            </Button>
                          )}
                          {notification.type === "rating_request" && (
                            <Button size="sm" className="h-7 text-xs">
                              Leave Rating
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
