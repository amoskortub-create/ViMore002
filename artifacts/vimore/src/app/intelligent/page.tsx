"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePosts } from "@/context/PostContext";
import { databases, DATABASE_ID, COL } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { LiteLink as Link } from "@/components/ui/lite-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Bot,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface AiMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface AiConversation {
  $id: string;
  title: string;
  last_message: string;
  updated_at: string;
}

const QUICK_CHIPS = [
  "How do I earn Diamonds? 💎",
  "Give me Marketplace tips 🛍️",
  "What is a Handshake? 🤝",
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function IntelligentPage() {
  const { currentUser } = usePosts();

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const firstName = currentUser?.name?.split(" ")[0] || "";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function loadConversations() {
    if (!currentUser) return;
    setLoadingConvs(true);
    try {
      const now = new Date().toISOString();
      const res = await databases.listDocuments(DATABASE_ID, COL.AI_CONVERSATIONS, [
        Query.equal("user_id", currentUser.$id),
        Query.greaterThan("expires_at", now),
        Query.orderDesc("updated_at"),
        Query.limit(30),
      ]);
      setConversations(res.documents as any);
    } catch {
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }

  async function loadMessages(convId: string) {
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.AI_MESSAGES, [
        Query.equal("conversation_id", convId),
        Query.orderAsc("created_at"),
        Query.limit(100),
      ]);
      setMessages(
        res.documents.map((d: any) => ({ role: d.role, content: d.content }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function selectConversation(convId: string) {
    setActiveConvId(convId);
    setShowSidebar(false);
    await loadMessages(convId);
  }

  async function startNewConversation() {
    setActiveConvId(null);
    setMessages([]);
    setShowSidebar(false);
  }

  async function deleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUser) return;
    setConversations((prev) => prev.filter((c) => c.$id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([]);
    }
    try {
      await fetch('/api/intelligent/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, userId: currentUser.$id }),
      });
    } catch { /* silent — local state already updated */ }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming || !currentUser) return;

    const userMsg: AiMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsStreaming(true);

    const assistantMsg: AiMessage = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    let fullResponse = "";

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/intelligent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          userName: firstName,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        fullResponse = "ViMore Agent has reached its daily AI limit. This resets automatically — please try again in a few hours.";
        throw new Error("quota_exceeded");
      }
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: fullResponse, streaming: true };
          return copy;
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      fullResponse = fullResponse || "Sorry, I couldn't connect right now. Please try again.";
    } finally {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: fullResponse, streaming: false };
        return copy;
      });
      setIsStreaming(false);
    }

    // Persist to Appwrite
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
      const titleSnippet = text.slice(0, 80);

      let convId = activeConvId;

      if (!convId) {
        const conv = await databases.createDocument(
          DATABASE_ID,
          COL.AI_CONVERSATIONS,
          ID.unique(),
          {
            user_id: currentUser.$id,
            title: titleSnippet,
            last_message: fullResponse.slice(0, 200),
            created_at: now,
            updated_at: now,
            expires_at: expiresAt,
          }
        );
        convId = conv.$id;
        setActiveConvId(convId);
        setConversations((prev) => [conv as any, ...prev]);
      } else {
        await databases.updateDocument(DATABASE_ID, COL.AI_CONVERSATIONS, convId, {
          last_message: fullResponse.slice(0, 200),
          updated_at: now,
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.$id === convId
              ? { ...c, last_message: fullResponse.slice(0, 200), updated_at: now }
              : c
          )
        );
      }

      await databases.createDocument(DATABASE_ID, COL.AI_MESSAGES, ID.unique(), {
        conversation_id: convId,
        user_id: currentUser.$id,
        role: "user",
        content: text.trim(),
        created_at: now,
      });
      await databases.createDocument(DATABASE_ID, COL.AI_MESSAGES, ID.unique(), {
        conversation_id: convId,
        user_id: currentUser.$id,
        role: "assistant",
        content: fullResponse,
        created_at: new Date(Date.now() + 1).toISOString(),
      });
    } catch { /* persist errors are silent */ }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col w-full sm:w-[300px] lg:w-[320px] border-r border-border/60 bg-card shrink-0 transition-all duration-300",
          showSidebar ? "flex" : "hidden sm:flex"
        )}
      >
        {/* Sidebar header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <p className="font-black text-sm tracking-tight">ViMore Intelligent</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">AI Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={startNewConversation}
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-10 text-center gap-5">
              <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#6200ee]/20 to-[#9c27b0]/10 flex items-center justify-center border border-primary/10">
                <Bot className="h-10 w-10 text-primary/50" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-black text-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">Ask me anything about ViMore — I'm here to help 24/7.</p>
              </div>
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 bg-[#6200ee] hover:bg-[#6200ee]/90 active:scale-95 transition-all text-white font-black text-[11px] uppercase tracking-widest rounded-2xl h-12 shadow-lg shadow-primary/25"
              >
                <Plus className="h-4 w-4" />
                Start New Conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.$id}
                role="button"
                tabIndex={0}
                onClick={() => selectConversation(conv.$id)}
                onKeyDown={(e) => e.key === 'Enter' && selectConversation(conv.$id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/60 transition-colors group cursor-pointer",
                  activeConvId === conv.$id && "bg-primary/8 border-r-2 border-primary"
                )}
              >
                <MessageSquare className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => deleteConversation(conv.$id, e)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteConversation(conv.$id, e as any); } }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-border/60 shrink-0">
          <div className="bg-primary/8 rounded-2xl p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Data-Lite Safe</p>
              <p className="text-[9px] text-muted-foreground">Chats auto-delete after 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className={cn(
        "flex flex-col flex-1 min-w-0",
        !showSidebar ? "flex" : "hidden sm:flex"
      )}>
        {/* Chat header */}
        <div className="h-16 px-4 flex items-center gap-4 border-b border-border/60 bg-card/80 backdrop-blur-sm shrink-0">
          <button
            className="sm:hidden"
            onClick={() => setShowSidebar(true)}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* AI Avatar */}
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#6200ee] to-[#9c27b0] flex items-center justify-center shadow-lg shadow-primary/30">
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
                  <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-400 rounded-full border-2 border-card" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm tracking-tight">ViMore Intelligent</p>
              <p className="text-[10px] text-emerald-500 font-bold">Always online · Powered by ViMore Agent</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 bg-primary/10 hover:bg-primary/20 text-primary sm:hidden"
            onClick={startNewConversation}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* Empty / Welcome state */
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              {/* Hero gradient orb */}
              <div className="relative mb-8">
                <div className="h-28 w-28 rounded-[2.5rem] bg-gradient-to-br from-[#6200ee] via-[#7b1fa2] to-[#9c27b0] flex items-center justify-center shadow-2xl shadow-primary/40">
                  <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14 text-white">
                    <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 h-7 w-7 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-foreground mb-2">
                {firstName ? `Hey ${firstName}! 👋` : "Hello there! 👋"}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
                I&apos;m <span className="font-bold text-primary">ViMore Intelligent</span>, your personal guide to everything on ViMore. Ask me anything!
              </p>

              {/* Quick chips */}
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Quick questions</p>
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all text-left group"
                  >
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{chip}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* AI avatar */}
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#6200ee] to-[#9c27b0] flex items-center justify-center shrink-0 mt-1 shadow-md shadow-primary/20">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                          <path d="M3 7L10 19L17 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13 15L17 7L21 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}

                    <div className={cn("flex flex-col gap-1 max-w-[78%]", msg.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "px-5 py-3.5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap",
                          msg.role === "user"
                            ? "bg-[#6200ee] text-white rounded-br-lg shadow-lg shadow-primary/25"
                            : "bg-card border border-border/60 text-foreground rounded-bl-lg shadow-sm"
                        )}
                      >
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block ml-1 animate-pulse">▌</span>
                        )}
                      </div>
                    </div>

                    {/* User avatar placeholder */}
                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-1 text-xs font-black text-primary">
                        {firstName?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border/60 bg-card/80 backdrop-blur-sm p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-secondary/50 border border-border/60 rounded-3xl px-4 py-3 focus-within:border-primary/50 focus-within:bg-background transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Ask me anything about ViMore…`}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 max-h-36 leading-relaxed"
                disabled={isStreaming}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="h-9 w-9 rounded-2xl bg-[#6200ee] hover:bg-[#6200ee]/90 text-white shadow-lg shadow-primary/30 shrink-0 disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground/40 text-center mt-2 font-medium">
              ViMore Intelligent · Conversations expire after 30 days · Press Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
