'use client';

import React, { useState } from 'react';

interface ProfileTabProps {
  onSave: (message: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onSave }) => {
  const [formData, setFormData] = useState({
    name: 'Augusto Galvão',
    username: 'augusto-nexus',
    email: 'augusto.galvao@nexuscode.dev',
    role: 'Senior Distributed Systems Engineer',
    bio: 'Construindo motores assíncronos de alta vazão com Rust, Go e Next.js 14. Apaixonado por algoritmos distribuídos e isolamento seguro de contêineres.',
    location: 'São Paulo, Brasil',
    website: 'https://augustogalvao.dev',
    github: 'https://github.com/augusto-nexus',
    linkedin: 'https://linkedin.com/in/augustogalvao',
    twitter: 'https://twitter.com/augusto_dev',
    visibility: 'public', // 'public' | 'recruiters' | 'private'
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSave('Perfil público atualizado com sucesso!');
    }, 600);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Card: Avatar & Basic Meta */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">
          Foto de Perfil &amp; Identidade
        </h3>
        <p className="text-xs text-zinc-400 mb-5">
          Sua foto e nome são exibidos no Leaderboard semanal e no seu Certificado de Conclusão.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#8257E5] to-[#00E5FF] p-[2px] shadow-lg shadow-[#8257E5]/20">
              <div className="w-full h-full bg-[#181820] rounded-[14px] flex items-center justify-center text-xl font-mono font-black text-[#00E5FF]">
                AG
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSave('Avatar atualizado!')}
              className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              Trocar
            </button>
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => onSave('Avatar aleatório gerado!')}
                className="px-3.5 py-1.5 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Gerar Avatar 3D
              </button>
              <button
                type="button"
                onClick={() => onSave('Sincronizado com o GitHub!')}
                className="px-3.5 py-1.5 rounded-xl bg-[#8257E5]/15 border border-[#8257E5]/40 hover:bg-[#8257E5]/25 text-xs font-semibold text-[#996DFF] transition-all cursor-pointer"
              >
                Sincronizar com GitHub
              </button>
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              Formatos suportados: PNG, JPG ou WebP até 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Main Info Form */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">
          Informações Profissionais
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Username (@handle)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                @
              </span>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-[#181820] border border-[#27272A] rounded-xl pl-8 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Cargo / Especialidade
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Localização
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
            Bio Técnica
          </label>
          <textarea
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full bg-[#181820] border border-[#27272A] rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Social Links & Visibilidade */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">
          Links &amp; Presença Web
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              GitHub URL
            </label>
            <input
              type="url"
              value={formData.github}
              onChange={(e) => setFormData({ ...formData, github: e.target.value })}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] transition-colors"
            />
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="pt-2">
          <label className="block text-xs font-mono text-zinc-400 mb-2 font-bold">
            Visibilidade do Perfil
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'public', label: '🌐 100% Público', desc: 'Aparece no Leaderboard e buscas' },
              { id: 'recruiters', label: '💼 Recrutadores Apenas', desc: 'Visível no Talent Pool de empresas' },
              { id: 'private', label: '🔒 Privado', desc: 'Somente você acessa seus dados' },
            ].map((option) => (
              <label
                key={option.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col ${
                  formData.visibility === option.id
                    ? 'bg-[#8257E5]/15 border-[#8257E5]'
                    : 'bg-[#181820] border-[#27272A] hover:border-zinc-600'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.id}
                  checked={formData.visibility === option.id}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="hidden"
                />
                <span className="text-xs font-bold text-white">{option.label}</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">{option.desc}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8257E5] to-[#996DFF] hover:from-[#7143D6] hover:to-[#8257E5] text-white font-bold text-xs transition-all shadow-lg shadow-[#8257E5]/30 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Salvando Alterações...</span>
            </>
          ) : (
            <span>Salvar Perfil Público</span>
          )}
        </button>
      </div>
    </form>
  );
};
