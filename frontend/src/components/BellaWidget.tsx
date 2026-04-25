import { useState, useRef, useEffect } from 'react'
import { Send, X, Minimize2, MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { ChatMessage } from '../types'
import { cn } from '../lib/utils'

const BELLA_INTRO: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Bella, the virtual receptionist for Classic Glass & Stone Arts. How can I help you today? I can answer questions about our services or help you get started with a project inquiry.",
  timestamp: new Date().toISOString(),
}

export default function BellaWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([BELLA_INTRO])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9))
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  // Don't show on payment pages
  const isPaymentPage = location.pathname.startsWith('/pay/')
  if (isPaymentPage) return null

  useEffect(() => {
    if (open && !minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages, open, minimized])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const { data } = await api.post('/api/bella/chat', {
        message: text,
        history: messages.filter(m => m.role !== 'assistant' || m !== BELLA_INTRO).map(m => ({
          role: m.role,
          content: m.content,
        })),
        sessionId,
      })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Persist to Supabase
      const allMsgs = [...messages, userMsg, assistantMsg]
      await supabase.from('chat_sessions').upsert({
        id: sessionId,
        messages: allMsgs,
        updated_at: new Date().toISOString(),
      })

      // If lead was captured, save it
      if (data.lead) {
        await supabase.from('leads').insert({
          name: data.lead.name,
          email: data.lead.email,
          phone: data.lead.phone,
          project_description: data.lead.project_description,
          source: 'bella_ai',
        })
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please call us directly or try again shortly.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {open && !minimized && (
        <div className="w-80 sm:w-96 bg-surface border border-border rounded-card shadow-gold-lg flex flex-col overflow-hidden"
          style={{ height: '500px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-2">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center pulse-gold">
                <span className="text-lg">💎</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-surface-2" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">Bella</p>
              <p className="text-xs text-text-muted">AI Receptionist — Online</p>
            </div>
            <button onClick={() => setMinimized(true)} className="text-text-muted hover:text-text transition-colors p-1">
              <Minimize2 size={16} />
            </button>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <span className="text-xs">💎</span>
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] px-3 py-2 rounded-card text-sm',
                  msg.role === 'user'
                    ? 'bg-gold text-bg font-medium'
                    : 'bg-surface-2 border border-border text-text'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-xs">💎</span>
                </div>
                <div className="bg-surface-2 border border-border rounded-card px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-input px-3 py-2 focus-within:border-gold transition-colors">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="text-gold hover:text-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5 text-center">Powered by Claude AI</p>
          </div>
        </div>
      )}

      {/* Minimized bar */}
      {open && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-surface border border-gold/40 rounded-full px-4 py-2 shadow-gold hover:shadow-gold-lg transition-all"
        >
          <span className="text-sm">💎</span>
          <span className="text-sm font-medium text-gold">Bella</span>
          <MessageCircle size={14} className="text-gold" />
        </button>
      )}

      {/* FAB Toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gold flex items-center justify-center shadow-gold-lg hover:bg-gold-light transition-all duration-200 pulse-gold hover:scale-110"
          title="Chat with Bella"
        >
          <span className="text-2xl">💎</span>
        </button>
      )}
    </div>
  )
}
