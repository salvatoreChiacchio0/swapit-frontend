"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useApiCall, apiClient } from "@/lib/api"
import { MessageSquare, Send, Search, MoreVertical, Phone, Video, Paperclip, Smile, Circle } from "lucide-react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { connectChat, onReceive, sendMessage as sendWsMessage, disconnectChat } from "@/lib/chatClient"
import { getUserChats } from "@/lib/chatApi"

const mockConversations = [
  {
    id: "conv-1",
    partner: {
      name: "Sarah Chen",
      avatar: "/professional-woman.png",
      isOnline: true,
    },
    lastMessage: {
      text: "Great! Looking forward to our Spanish lesson tomorrow",
      timestamp: "2 min ago",
      isFromMe: false,
    },
    unreadCount: 2,
    swapContext: {
      mySkill: "Web Design",
      theirSkill: "Spanish",
    },
  },
  {
    id: "conv-2",
    partner: {
      name: "Marcus Johnson",
      avatar: "/man-photographer.png",
      isOnline: false,
    },
    lastMessage: {
      text: "Thanks for the photography tips! The lighting technique really helped",
      timestamp: "1 hour ago",
      isFromMe: true,
    },
    unreadCount: 0,
    swapContext: {
      mySkill: "JavaScript",
      theirSkill: "Photography",
    },
  },
  {
    id: "conv-3",
    partner: {
      name: "Elena Rodriguez",
      avatar: "/woman-chef-preparing-food.png",
      isOnline: true,
    },
    lastMessage: {
      text: "Should I bring my own ingredients for the cooking session?",
      timestamp: "3 hours ago",
      isFromMe: false,
    },
    unreadCount: 1,
    swapContext: {
      mySkill: "Node.js",
      theirSkill: "Cooking",
    },
  },
  {
    id: "conv-4",
    partner: {
      name: "David Kim",
      avatar: "/professional-headshot.png",
      isOnline: false,
    },
    lastMessage: {
      text: "Perfect! See you next week for the React session",
      timestamp: "1 day ago",
      isFromMe: true,
    },
    unreadCount: 0,
    swapContext: {
      mySkill: "React",
      theirSkill: "Korean",
    },
  },
]

const mockMessages = [
  {
    id: "msg-1",
    text: "Hi! I'm excited about our upcoming Spanish lesson. What time works best for you?",
    timestamp: "10:30 AM",
    isFromMe: false,
  },
  {
    id: "msg-2",
    text: "Hello Sarah! I'm excited too. How about 6 PM tomorrow? I can teach you some web design basics in return.",
    timestamp: "10:45 AM",
    isFromMe: true,
  },
  {
    id: "msg-3",
    text: "That sounds perfect! I've prepared some Spanish conversation exercises for beginners.",
    timestamp: "11:00 AM",
    isFromMe: false,
  },
  {
    id: "msg-4",
    text: "Awesome! I'll prepare some design principles and we can work on a small project together.",
    timestamp: "11:15 AM",
    isFromMe: true,
  },
  {
    id: "msg-5",
    text: "Great! Looking forward to our Spanish lesson tomorrow",
    timestamp: "2:30 PM",
    isFromMe: false,
  },
]

// (rimosse costanti obsolete userId/token)
const CHAT_API_URL = "http://localhost:3001/chat";

export interface ChatMessage {
  id?: string|number;
  senderId?: string;
  receiverId?: string;
  content?: string;
  text?: string;
  timestamp: string|Date;
  isFromMe?: boolean;
}

interface Conversation {
  userId: string;
  messages: ChatMessage[];
}

export function ChatSection() {
  // Auth Firebase
  const [idToken, setIdToken] = useState<string|null>(null);
  const [userId, setUserId] = useState<string|null>(null);

  // Chat state
  const [selectedConversation, setSelectedConversation] = useState<Conversation|null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [usersById, setUsersById] = useState<Record<string, any>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketConnectedRef = useRef<boolean>(false);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Osserva lo stato Firebase: quando loggato, prendi uid e idToken
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        setUserId(user.uid);
      } else {
        // Disconnessione socket al logout
        try { disconnectChat() } catch {}
        socketConnectedRef.current = false;
        setIdToken(null);
        setUserId(null);
        setConversations([]);
        setSelectedConversation(null);
        setMessages([]);
      }
    });
    return () => unsub();
  }, []);

  // Helper per immagini profilo: se base64 senza prefix, aggiunge data:image/jpeg;base64,
  function buildImageSrc(src?: string): string {
    if (!src) return "/placeholder.svg";
    const lower = src.toLowerCase();
    if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("data:")) return src;
    return `data:image/jpeg;base64,${src}`;
  }

  // Carica chat dopo login Firebase
  useEffect(() => {
    if (!idToken || !userId) return;
    async function fetchChats() {
      try {
        const data = await getUserChats(userId as string);
        const normalized = (data || []).map((c: any) => ({
          ...c,
          messages: (c.messages || []).map((m: any) => ({
            ...m,
            isFromMe: m.senderId === userId,
          })),
        }));
        setConversations(normalized);
        if (normalized.length > 0) {
          setSelectedConversation((prev) => {
            // mantieni la conversazione selezionata se ancora presente
            const still = prev && normalized.find((c: any) => c.userId === prev.userId);
            if (still) {
              setMessages(still.messages);
              return still;
            }
            setMessages(normalized[0].messages);
            return normalized[0];
          });
        } else {
          setSelectedConversation(null);
          setMessages([]);
        }
      } catch (err) {
        setConversations([]);
        setSelectedConversation(null);
        setMessages([]);
      }
    }
    fetchChats();

    // Carica anche tutti gli utenti per mappare nomi/avatar in lista conversazioni
    apiClient.getUsers()
      .then((users: any[]) => {
        setAllUsers(users);
        const map: Record<string, any> = {};
        users.forEach(u => { if (u.uid) map[u.uid] = u; });
        setUsersById(map);
      })
      .catch(() => { setAllUsers([]); setUsersById({}); });
  }, [idToken, userId]);

  // Refetch utility per riconnessioni
  const refetchChats = async () => {
    if (!idToken || !userId) return;
    try {
      const data = await getUserChats(userId as string);
      const normalized = (data || []).map((c: any) => ({
        ...c,
        messages: (c.messages || []).map((m: any) => ({
          ...m,
          isFromMe: m.senderId === userId,
        })),
      }));
      setConversations(normalized);
      if (selectedConversation) {
        const updated = normalized.find((c: any) => c.userId === selectedConversation.userId);
        if (updated) setMessages(updated.messages);
      }
    } catch {}
  };

  // Connessione socket autenticata
  useEffect(() => {
    if (!idToken) return;
    (async () => {
      try {
        await connectChat();
        socketConnectedRef.current = true;
        await refetchChats();
        onReceive((incoming: any) => {
          const message = {
            ...incoming,
            timestamp: incoming?.timestamp ?? new Date(),
            isFromMe: incoming?.senderId === userId,
          };
          const current = selectedConversationRef.current;
          if (current && (message.senderId === current.userId || message.receiverId === current.userId)) {
            setMessages((prev) => [...prev, message]);
          }
          setConversations((prev) => prev.map(c => {
            if (c.userId === message.senderId || c.userId === message.receiverId) {
              return { ...c, messages: [...c.messages, message] };
            }
            return c;
          }))
        });
      } catch (e) {
        console.warn('Chat connect failed', e);
      }
    })();
    return () => {
      if (!idToken && socketConnectedRef.current) {
        disconnectChat();
        socketConnectedRef.current = false;
      }
    };
  }, [idToken]);

  // Search utenti: usa swapit-be già incapsulato in apiClient.getUsers()
  useEffect(() => {
    if (!searchQuery) { setAllUsers([]); return; }
    apiClient.getUsers()
      .then(users => {
        const filtered = users
          .filter((u: any) => !userId || u.uid !== userId)
          .filter((u: any) =>
            u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        setAllUsers(filtered);
      })
      .catch(() => setAllUsers([]));
  }, [searchQuery, userId]);

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages(conv.messages);
  };

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation && userId) {
      const optimistic = {
        senderId: userId,
        receiverId: selectedConversation.userId,
        content: newMessage,
        timestamp: new Date(),
        isFromMe: true,
      } as any;
      setMessages((prev) => [...prev, optimistic]);
      setConversations((prev) => prev.map(c =>
        c.userId === selectedConversation.userId
        ? { ...c, messages: [...c.messages, optimistic] }
        : c
      ));
      const content = newMessage;
      setNewMessage("");
      try {
        await sendWsMessage(selectedConversation.userId, content);
      } catch (e) {
        console.error('send failed', e);
      }
    }
  };

  // Se non autenticato su Firebase, chiedi di effettuare il login nella app principale
  if (!idToken) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Accedi dall'app per usare la chat in tempo reale</p>
        </div>
      </div>
    );
  }

  const filteredUsers = searchQuery.length
    ? allUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const filteredConversations: any[] = []

  const formatTime = (ts: string | Date) => {
    const date = ts instanceof Date ? ts : new Date(ts);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setShowUserDropdown(false);
    const existing = conversations.find(c => c.userId === user.uid);
    if (existing) {
      setSelectedConversation(existing);
      setMessages(existing.messages);
    } else {
      const newConv: Conversation = { userId: user.uid, messages: [] };
      setConversations(prev => [...prev, newConv]);
      setSelectedConversation(newConv);
      setMessages([]);
    }
  }

  return (
    <div className="h-[calc(100vh-200px)] flex bg-white rounded-lg border overflow-hidden">
      {/* Conversations List (sinistra) */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          {/* SEARCH FIELD UTENTI */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowUserDropdown(true)
              }}
              onFocus={() => setShowUserDropdown(true)}
              className="pl-10"
              autoComplete="off"
            />
            {/* User dropdown su ricerca */}
            {showUserDropdown && filteredUsers.length > 0 && (
              <div className="absolute w-full bg-white border rounded shadow mt-1 max-h-60 overflow-y-auto z-20">
                {filteredUsers.filter(u => !userId || u.uid !== userId).map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center px-3 py-2 gap-3 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={buildImageSrc(user.profilePicture)} />
                      <AvatarFallback>
                        {user.username?.slice(0,2)?.toUpperCase() || user.email?.slice(0,2)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{user.username || user.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.userId}
                onClick={() => handleConversationClick(conversation)}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${selectedConversation && selectedConversation.userId === conversation.userId ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={buildImageSrc(usersById[conversation.userId]?.profilePicture)} />
                      <AvatarFallback>
                        {(usersById[conversation.userId]?.username || usersById[conversation.userId]?.email || conversation.userId || "?")
                          .slice(0,2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">{usersById[conversation.userId]?.username || usersById[conversation.userId]?.email || conversation.userId}</h3>
                      <span className="text-xs text-gray-500">{conversation.messages.at(-1) ? formatTime(String(conversation.messages.at(-1)!.timestamp)) : ""}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-2">{conversation.messages.at(-1)?.content || conversation.messages.at(-1)?.text || ""}</p>
                    {/* Qui puoi mostrare badge, unread, ecc. */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={(selectedUser && selectedConversation?.userId === selectedUser.uid && buildImageSrc(selectedUser.profilePicture)) || buildImageSrc(usersById[selectedConversation.userId!]?.profilePicture)} />
                    <AvatarFallback>
                      {(selectedUser && selectedConversation?.userId === selectedUser.uid
                        ? (selectedUser.username || selectedUser.email || selectedConversation.userId || "?")
                        : (usersById[selectedConversation.userId!]?.username || usersById[selectedConversation.userId!]?.email || selectedConversation.userId || "?"))
                        .slice(0,2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h3 className="font-medium">{
                    selectedUser && selectedConversation?.userId === selectedUser.uid
                      ? (selectedUser.username || selectedUser.email || selectedConversation.userId)
                      : (usersById[selectedConversation.userId!]?.username || usersById[selectedConversation.userId!]?.email || selectedConversation.userId)
                  }</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Chat</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Video className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message: ChatMessage) => (
                  <div key={String(message.id ?? message.timestamp)} className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.isFromMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content || message.text}</p>
                      <p className={`text-xs mt-1 ${message.isFromMe ? "text-blue-100" : "text-gray-500"}`}>
                        {formatTime(String(message.timestamp))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="pr-10"
                  />
                  <Button size="sm" variant="ghost" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
