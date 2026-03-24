import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTickets } from '../services/firestoreService';

export default function ChatBot() {
  const { userDoc } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your AI Assistant. How can I help you manage your tickets or time logs today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [hasApiKey, setHasApiKey] = useState(aiService.isConfigured());
  const [tempKey, setTempKey] = useState('');
  
  const scrollRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeTickets(setTickets);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(input, {
        user: userDoc,
        tickets: tickets
      });
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetKey = () => {
    if (tempKey.trim()) {
      aiService.setApiKey(tempKey);
      setHasApiKey(true);
      setMessages(prev => [...prev, { role: 'ai', text: "API Key set! I'm ready to help." }]);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', background: 'var(--color-primary)',
          color: '#fff', boxShadow: '0 8px 32px rgba(37, 87, 167, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', border: 'none', transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      width: isMinimized ? 200 : 380, height: isMinimized ? 48 : 520,
      background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', background: 'var(--color-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', borderRadius: '20px 20px 0 0'
      }} onClick={() => isMinimized && setIsMinimized(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} />
          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: '"Poppins"' }}>AI Assistant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div ref={scrollRef} style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!hasApiKey && (
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 14, borderRadius: 12, fontSize: 12, color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700 }}>Gemini API Key Required</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    type="password" 
                    placeholder="Enter API Key..." 
                    value={tempKey} 
                    onChange={e => setTempKey(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 11, background: 'var(--color-surface)', color: '#fff', outline: 'none' }}
                  />
                  <button onClick={handleSetKey} className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}>Set</button>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                fontSize: 13,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                lineHeight: 1.5,
                border: m.role === 'ai' ? '1px solid var(--color-border)' : 'none'
              }}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface)', padding: '10px 14px', borderRadius: '14px 14px 14px 2px', border: '1px solid var(--color-border)' }}>
                <Loader2 size={16} className="spinning" color="var(--color-primary)" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: 16, borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                disabled={!hasApiKey || isLoading}
                style={{
                  width: '100%', padding: '12px 40px 12px 16px', borderRadius: 12,
                  border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-background)',
                  color: '#fff', outline: 'none', fontFamily: '"Noto Sans", sans-serif',
                  transition: 'border-color 0.2s'
                }}
              />
              <button 
                onClick={handleSend}
                disabled={!hasApiKey || isLoading || !input.trim()}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: (isLoading || !input.trim()) ? 'var(--color-border)' : 'var(--color-primary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
