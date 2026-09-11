'use client';

import React, { useState } from 'react';

interface TutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const TutorModal: React.FC<TutorModalProps> = ({
  isOpen,
  onClose,
  activityTitle,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá! Sou o seu Tutor Pedagógico Socrático. Estou acompanhando seu progresso em "${activityTitle}". Como posso te guiar hoje sem entregar a resposta direta?`,
      time: 'Agora',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      time: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responses = [
        'Excelente pergunta! Pense na invariante do seu laço: o que precisa ser verdadeiro antes e depois de cada iteração para evitar ciclos infinitos?',
        'Ótima observação. Se você utilizar uma estrutura Map/Set para rastrear nós visitados, qual seria a complexidade espacial resultante?',
        'Lembre-se do princípio da Idempotência: caso o consumidor receba a mesma mensagem duas vezes pelo Kafka, como o Redis pode garantir que a transação compensatória não seja executada em duplicidade?',
      ];
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responses[Math.floor(Math.random() * responses.length)],
        time: 'Agora',
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col h-[560px] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="h-14 border-b border-[#27272A] px-5 flex items-center justify-between bg-[#121214]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8257E5] to-[#0070F3] flex items-center justify-center text-sm shadow">
              🤖
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Tutor Socrático IA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#04D361]" />
              </div>
              <div className="text-[10px] text-[#71717A] truncate max-w-[280px]">
                {activityTitle}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white text-lg p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#09090A]/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#8257E5] text-white rounded-br-none'
                    : 'bg-[#18181B] text-[#EDEDED] border border-[#27272A] rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[#18181B] border border-[#27272A] text-[#71717A] text-xs px-3 py-2 rounded-2xl rounded-bl-none animate-pulse">
                Tutor está pensando...
              </div>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-[#121214] border-t border-[#27272A] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faça uma pergunta sobre o desafio..."
            className="flex-1 bg-[#18181B] border border-[#27272A] focus:border-[#8257E5] rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
