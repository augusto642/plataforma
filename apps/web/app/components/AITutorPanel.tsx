'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ComplexityResult {
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  bottlenecks: string[];
  recommendations: string[];
  score: number;
}

interface AITutorPanelProps {
  activityId: string;
  activityTitle: string;
  code: string;
  token: string;
  onClose: () => void;
}

export default function AITutorPanel({ activityId, activityTitle, code, token, onClose }: AITutorPanelProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAnalyzingBigO, setIsAnalyzingBigO] = useState(false);
  const [complexityResult, setComplexityResult] = useState<ComplexityResult | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortStreamRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const headers: Record<string, string> = {};
        if (token && token !== 'cookie-auth') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/ai/history/${activityId}`, {
          headers,
          signal: controller.signal,
          credentials: 'include',
        });
        if (res.ok) {
          const history: ChatMessage[] = await res.json();
          if (!cancelled && history.length > 0) {
            setChatMessages(history);
          } else if (!cancelled) {
            setChatMessages([
              {
                role: 'assistant',
                content: `Olá! Sou seu Tutor Socrático da NEXUS CODE. Estou acompanhando sua resolução de "${activityTitle}". Como posso te orientar no raciocínio?`,
              },
            ]);
          }
        } else if (!cancelled) {
          setChatMessages([
            {
              role: 'assistant',
              content: `Olá! Sou seu Tutor Socrático da NEXUS CODE. Estou acompanhando sua resolução de "${activityTitle}". Como posso te orientar no raciocínio?`,
            },
          ]);
        }
      } catch {
        if (!cancelled) {
          setChatMessages([
            {
              role: 'assistant',
              content: `Olá! Sou seu Tutor Socrático da NEXUS CODE. Estou acompanhando sua resolução de "${activityTitle}". Como posso te orientar no raciocínio?`,
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
      controller.abort();
      abortStreamRef.current?.abort();
    };
  }, [activityId, activityTitle, token]);

  useEffect(() => {
    if (chatBottomRef.current && !isLoadingHistory) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isStreaming, isLoadingHistory, complexityResult]);

  const sendStreamMessage = useCallback(async (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

    abortStreamRef.current?.abort();
    const controller = new AbortController();
    abortStreamRef.current = controller;

    const userMsg: ChatMessage = { role: 'user', content: promptText.trim() };
    const baseMessages = [...chatMessages, userMsg];
    
    // Add temporary empty assistant message to receive stream
    setChatMessages([...baseMessages, { role: 'assistant', content: '' }]);
    setChatInput('');
    setIsStreaming(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'cookie-auth') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          activityId,
          code,
          messages: baseMessages,
        }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!res.ok || !res.body) {
        // Fallback to non-streaming chat endpoint
        const fallbackRes = await fetch(`${API_BASE}/ai/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ activityId, code, messages: baseMessages }),
          credentials: 'include',
        });
        if (fallbackRes.ok) {
          const reply = await fallbackRes.json();
          setChatMessages([...baseMessages, reply]);
        } else {
          setChatMessages([
            ...baseMessages,
            { role: 'assistant', content: 'Tive um pequeno contratempo. Pode reformular sua pergunta?' },
          ]);
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = '';
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const events = streamBuffer.split('\n\n');
        streamBuffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulatedContent += parsed.chunk;
                setChatMessages([
                  ...baseMessages,
                  { role: 'assistant', content: accumulatedContent },
                ]);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return [
              ...prev.slice(0, -1),
              { role: 'assistant', content: 'Não foi possível completar o streaming no momento. Como posso ajudar com outra dúvida?' },
            ];
          }
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [activityId, chatMessages, code, isStreaming, token]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendStreamMessage(chatInput);
    }
  };

  const handleAnalyzeComplexity = async () => {
    if (isAnalyzingBigO || !code.trim()) return;
    setIsAnalyzingBigO(true);
    setComplexityResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token !== 'cookie-auth') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/ai/complexity-analysis`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ activityId, code }),
        credentials: 'include',
      });

      if (res.ok) {
        const data: ComplexityResult = await res.json();
        setComplexityResult(data);
      } else {
        alert('Não foi possível analisar a complexidade no momento.');
      }
    } catch {
      alert('Erro de conexão ao solicitar análise de complexidade.');
    } finally {
      setIsAnalyzingBigO(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 440,
      height: '100%',
      background: '#09090B',
      borderLeft: '1px solid #27272A',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      boxShadow: '-20px 0 45px rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Header */}
      <div style={{
        height: 60,
        borderBottom: '1px solid #27272A',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#121214',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(130, 87, 229, 0.3) 0%, rgba(0, 229, 255, 0.2) 100%)',
            border: '1px solid rgba(130, 87, 229, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>
            🧠
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F4F4F5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Tutor IA Socrático</span>
              <span style={{ fontSize: 10, background: 'rgba(130, 87, 229, 0.25)', color: '#A78BFA', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 800 }}>
                STREAMING
              </span>
            </div>
            <div style={{ fontSize: 11, color: isStreaming ? '#00E5FF' : '#71717A' }}>
              {isStreaming ? '⚡ Transmitindo raciocínio em tempo real...' : 'Guia conceitual anti-spoiler'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 18, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Fechar painel"
        >
          ✕
        </button>
      </div>

      {/* Quick Action Chips Strip */}
      <div style={{
        padding: '8px 14px',
        background: '#121214',
        borderBottom: '1px solid #1E1E24',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
      }}>
        <button
          onClick={() => sendStreamMessage('Poderia me dar uma dica sobre o próximo passo de raciocínio lógico?')}
          disabled={isStreaming}
          style={{
            padding: '4px 10px',
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: 14,
            fontSize: 11,
            fontWeight: 600,
            color: '#E4E4E7',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          💡 <span>Dica Socrática</span>
        </button>
        <button
          onClick={handleAnalyzeComplexity}
          disabled={isAnalyzingBigO || isStreaming}
          style={{
            padding: '4px 10px',
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: 14,
            fontSize: 11,
            fontWeight: 700,
            color: '#00E5FF',
            cursor: isAnalyzingBigO || isStreaming ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isAnalyzingBigO ? '⏳ Analisando...' : '🔍 Análise Big-O'}
        </button>
        <button
          onClick={() => sendStreamMessage('O que significa o erro de teste ou asserção que recebi?')}
          disabled={isStreaming}
          style={{
            padding: '4px 10px',
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: 14,
            fontSize: 11,
            fontWeight: 600,
            color: '#E4E4E7',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ⚠️ <span>Entender Erro</span>
        </button>
      </div>

      {/* Message Stream */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Mensagens do Tutor"
        style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* Complexity Card Modal Embed if active */}
        {complexityResult && (
          <div style={{
            background: '#131826',
            border: '1px solid #00E5FF',
            borderRadius: 10,
            padding: 14,
            boxShadow: '0 0 25px rgba(0, 229, 255, 0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#00E5FF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📊 Auditoria de Complexidade Assintótica</span>
              </div>
              <button
                onClick={() => setComplexityResult(null)}
                style={{ background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 13 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
              <div style={{ background: '#090D16', padding: '8px 10px', borderRadius: 6, border: '1px solid #1E293B' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Tempo (Big-O)</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>
                  {complexityResult.timeComplexity}
                </div>
              </div>
              <div style={{ background: '#090D16', padding: '8px 10px', borderRadius: 6, border: '1px solid #1E293B' }}>
                <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Espaço Auxiliar</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#A78BFA', fontFamily: 'monospace' }}>
                  {complexityResult.spaceComplexity}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.4, margin: '6px 0 10px 0' }}>
              {complexityResult.summary}
            </p>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D', marginBottom: 4 }}>💡 Recomendações:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#CBD5E1', lineHeight: 1.4 }}>
              {complexityResult.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              padding: '12px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #8257E5 0%, #996DFF 100%)'
                : '#18181B',
              border: msg.role === 'user' ? 'none' : '1px solid #27272A',
              color: '#FFFFFF',
              fontSize: 13,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              boxShadow: msg.role === 'user'
                ? '0 4px 14px rgba(130, 87, 229, 0.35)'
                : '0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
          >
            {msg.content || (
              <span style={{ color: '#00E5FF', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</span>
                Digitando resposta...
              </span>
            )}
          </div>
        ))}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} style={{ padding: 14, borderTop: '1px solid #27272A', background: '#121214', display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Tire uma dúvida sobre a lógica..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: 8,
            color: '#FFFFFF',
            fontSize: 13,
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8257E5';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#27272A';
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !chatInput.trim()}
          style={{
            padding: '10px 16px',
            background: isStreaming || !chatInput.trim() ? '#27272A' : 'linear-gradient(90deg, #8257E5, #996DFF)',
            color: isStreaming || !chatInput.trim() ? '#71717A' : '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: isStreaming || !chatInput.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isStreaming || !chatInput.trim() ? 'none' : '0 4px 12px rgba(130, 87, 229, 0.4)',
          }}
        >
          {isStreaming ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
