import { useState, useRef, useEffect } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Smile,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores";
import { useAppStore } from "@/stores";
import { Avatar } from "@/components/ui";
import { cn, timeAgo, getInitials } from "@/lib/utils";
import type { Message } from "@/lib/mock-data";

export default function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getConversations, getMessagesWith, sendMessage, users, messages } = useAppStore();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = user ? getConversations(user.id) : [];
  const currentMessages = selectedChat ? getMessagesWith(selectedChat) : [];
  const [isLoading, setIsLoading] = useState(false);
  const selectedUser = selectedChat ? users.find((u) => u.id === selectedChat) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !supabase || !hasSupabaseConfig) return;
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, read, created_at")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedChat}),and(sender_id.eq.${selectedChat},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        useAppStore.setState({ messages: data as Message[] });
      }
    };

    void loadMessages();
  }, [selectedChat, user]);

  const handleSend = async () => {
    const content = messageText.trim();

    if (!content || !selectedChat || !user) return;

    setIsLoading(true);
    await sendMessage(selectedChat, content);
    setIsLoading(false);
    setMessageText("");
    setShowEmojiPicker(false);
  };

  const handleEmojiPick = (emoji: string) => {
    setMessageText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };


  const quickEmojis = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "🙏", "😎"];

  const filteredConversations = conversations.filter(
    (c) =>
      c.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <h2 className="text-xl font-bold text-on-surface mb-2">Faça login para ver mensagens</h2>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-3.5rem)] flex animate-fade-in">
      {/* Conversation List */}
      <div
        className={cn(
          "border-r border-border-color flex flex-col bg-surface",
          selectedChat ? "hidden md:flex md:w-80" : "w-full md:w-80"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-color">
          <h2 className="text-lg font-bold text-on-surface mb-3">Mensagens</h2>
          <div className="relative">
            <Search className="h-4 w-4 text-on-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl border-2 border-border-color bg-surface-alt pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-on-surface-muted">Nenhuma conversa ainda</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.user.id}
                onClick={() => setSelectedChat(conv.user.id)}
                className={cn(
                  "flex items-center gap-3 w-full p-4 hover:bg-surface-hover transition-colors border-b border-border-color/50 cursor-pointer",
                  selectedChat === conv.user.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <Avatar
                  src={conv.user.avatar_url || undefined}
                  fallback={getInitials(conv.user.full_name)}
                  size="md"
                  isOnline={Math.random() > 0.3}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-on-surface truncate">{conv.user.full_name}</p>
                    <span className="text-[10px] text-on-surface-muted shrink-0">
                      {timeAgo(conv.lastMessage.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-on-surface-muted truncate">{conv.lastMessage.content}</p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 h-5 min-w-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center px-1 shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}

          {/* Users without conversations */}
          {searchQuery && users.filter((u) => u.id !== user.id && !conversations.find((c) => c.user.id === u.id)).length > 0 && (
            <div className="p-4">
              <p className="text-xs text-on-surface-muted mb-2">Outros usuários</p>
              {users
                .filter((u) => u.id !== user.id && !conversations.find((c) => c.user.id === u.id))
                .filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedChat(u.id)}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <Avatar src={u.avatar_url || undefined} fallback={getInitials(u.full_name)} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-on-surface">{u.full_name}</p>
                      <p className="text-xs text-on-surface-muted">@{u.username}</p>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          !selectedChat ? "hidden md:flex" : "flex"
        )}
      >
        {selectedChat && selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border-color bg-surface">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-hover cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-on-surface-muted" />
              </button>
              <Avatar src={selectedUser.avatar_url || undefined} fallback={getInitials(selectedUser.full_name)} size="sm" isOnline />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">{selectedUser.full_name}</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
              <div className="flex items-center gap-1">
                <button className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-surface-hover cursor-pointer">
                  <MoreVertical className="h-4 w-4 text-on-surface-muted" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-sm text-on-surface-muted">
                      Diga olá para @{selectedUser.username}!
                    </p>
                  </div>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isOwn = msg.sender_id === user.id;
                  const fromUser = users.find((u) => u.id === msg.sender_id) || null;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex items-end", isOwn ? "justify-end" : "justify-start")}
                    >
                      {!isOwn && (
                        <div className="mr-3">
                          <Avatar
                            src={fromUser?.avatar_url || undefined}
                            fallback={fromUser ? getInitials(fromUser.full_name) : "?"}
                            size="sm"
                          />
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          isOwn
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-surface-alt text-on-surface border border-border-color rounded-bl-md"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isOwn ? "text-white/60" : "text-on-surface-muted"
                          )}
                        >
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {isOwn && (
                        <div className="ml-3 hidden md:flex">
                          <Avatar
                            src={user.avatar_url || undefined}
                            fallback={getInitials(user.full_name)}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-border-color bg-surface">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Escreva uma mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="w-full h-10 rounded-xl border-2 border-border-color bg-surface-alt px-4 pr-10 text-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center hover:bg-surface-hover cursor-pointer"
                  >
                    <Smile className="h-4 w-4 text-on-surface-muted" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 flex flex-wrap gap-2 rounded-xl border border-border-color bg-surface p-2 shadow-lg">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiPick(emoji)}
                          className="rounded-lg p-2 text-xl hover:bg-surface-hover"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || isLoading}
                  className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white disabled:opacity-30 hover:bg-primary-dark transition-colors shrink-0 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4" />
              <h3 className="text-lg font-bold text-on-surface mb-1">Suas Mensagens</h3>
              <p className="text-sm text-on-surface-muted max-w-xs">
                Selecione uma conversa ou busque um usuário para começar a conversar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
