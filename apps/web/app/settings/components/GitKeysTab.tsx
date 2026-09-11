'use client';

import React, { useState } from 'react';
import { SshKeyItem, GpgKeyItem, PersonalAccessToken } from '../types';
import { INITIAL_SSH_KEYS, INITIAL_GPG_KEYS, INITIAL_TOKENS } from '../data';

interface GitKeysTabProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const GitKeysTab: React.FC<GitKeysTabProps> = ({ onNotify }) => {
  const [sshKeys, setSshKeys] = useState<SshKeyItem[]>(INITIAL_SSH_KEYS);
  const [gpgKeys, setGpgKeys] = useState<GpgKeyItem[]>(INITIAL_GPG_KEYS);
  const [tokens, setTokens] = useState<PersonalAccessToken[]>(INITIAL_TOKENS);

  // New SSH key modal / form state
  const [isAddingSsh, setIsAddingSsh] = useState(false);
  const [sshTitle, setSshTitle] = useState('');
  const [sshKeyContent, setSshKeyContent] = useState('');

  // New PAT state
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [tokenName, setTokenName] = useState('');

  const handleAddSshKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sshTitle || !sshKeyContent) {
      onNotify('Preencha o título e a chave pública SSH.', 'error');
      return;
    }

    const newKey: SshKeyItem = {
      id: `ssh-${Date.now()}`,
      title: sshTitle,
      fingerprint: `SHA256:${Math.random().toString(36).substring(2, 15)}...${Math.random()
        .toString(36)
        .substring(2, 10)}`,
      keyType: sshKeyContent.includes('ed25519') ? 'ED25519' : 'RSA-4096',
      createdAt: 'Agora mesmo',
      lastUsedAt: 'Nunca utilizado',
    };

    setSshKeys([newKey, ...sshKeys]);
    setSshTitle('');
    setSshKeyContent('');
    setIsAddingSsh(false);
    onNotify('Chave SSH adicionada e sincronizada com o pod isolado Piston!');
  };

  const handleDeleteSshKey = (id: string) => {
    setSshKeys(sshKeys.filter((k) => k.id !== id));
    onNotify('Chave SSH removida com sucesso.', 'info');
  };

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName) return;

    const newToken: PersonalAccessToken = {
      id: `pat-${Date.now()}`,
      name: tokenName,
      tokenPrefix: `nx_pat_${Math.random().toString(36).substring(2, 8)}...`,
      scopes: ['repo:read', 'repo:write', 'sandbox:execute'],
      createdAt: 'Hoje',
      expiresAt: 'Em 90 dias',
    };

    setTokens([newToken, ...tokens]);
    setTokenName('');
    setIsAddingToken(false);
    onNotify('Novo Personal Access Token gerado!');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SSH PUBLIC KEYS                                                        */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <span>🔑</span>
              <span>Chaves SSH de Autenticação Git</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Utilizadas para clonar, commitar e enviar código diretamente ao Gitea/Piston isolado via CLI.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingSsh(!isAddingSsh)}
            className="px-3.5 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>{isAddingSsh ? '✕ Cancelar' : '+ Adicionar Nova Chave SSH'}</span>
          </button>
        </div>

        {/* Add Form */}
        {isAddingSsh && (
          <form
            onSubmit={handleAddSshKey}
            className="mb-6 bg-[#181820] border border-[#8257E5]/40 rounded-xl p-4 space-y-3"
          >
            <h4 className="text-xs font-bold text-white uppercase font-mono">
              Registrar Nova Chave Pública
            </h4>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Nome da Chave (ex: MacBook Pro, Desktop Linux)
              </label>
              <input
                type="text"
                placeholder="Ex: Workstation Arch Linux"
                value={sshTitle}
                onChange={(e) => setSshTitle(e.target.value)}
                className="w-full bg-[#121217] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Conteúdo da Chave Pública (`~/.ssh/id_ed25519.pub` ou `id_rsa.pub`)
              </label>
              <textarea
                rows={3}
                placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... dev@workstation"
                value={sshKeyContent}
                onChange={(e) => setSshKeyContent(e.target.value)}
                className="w-full bg-[#121217] border border-[#27272A] rounded-lg p-3 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingSsh(false)}
                className="px-3 py-1.5 rounded-lg bg-[#27272A] text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#04D361] hover:bg-[#00B37E] text-black font-bold text-xs transition-all"
              >
                Salvar Chave SSH
              </button>
            </div>
          </form>
        )}

        {/* SSH Keys List */}
        <div className="space-y-3">
          {sshKeys.map((key) => (
            <div
              key={key.id}
              className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#121217] border border-[#27272A] flex items-center justify-center text-base shrink-0">
                  💻
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{key.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                      {key.keyType}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#00E5FF] mt-0.5 break-all">
                    {key.fingerprint}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Adicionada em {key.createdAt} • Último uso: {key.lastUsedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText(key.fingerprint);
                    onNotify('Fingerprint SHA-256 copiado!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#121217] border border-[#27272A] hover:border-zinc-500 text-[11px] text-zinc-300 font-mono transition-colors"
                >
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSshKey(key.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 hover:bg-[#F43F5E]/20 text-[11px] text-[#F43F5E] font-semibold transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GPG SIGNATURE KEYS                                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <span>🛡️</span>
              <span>Chaves GPG de Commits Verificados</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Garanta que todos os seus commits recebam o selo verde <span className="text-[#04D361] font-mono">VERIFIED</span> no repositório.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNotify('Chave GPG vinculada com sucesso!')}
            className="px-3.5 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-white font-bold text-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            + Importar Chave GPG
          </button>
        </div>

        <div className="space-y-3">
          {gpgKeys.map((gpg) => (
            <div
              key={gpg.id}
              className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#04D361]/10 border border-[#04D361]/30 flex items-center justify-center text-[#04D361] text-base shrink-0">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">ID: {gpg.keyId}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#04D361]/10 text-[#04D361] border border-[#04D361]/30 font-bold">
                      VERIFICADA
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{gpg.email}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Expira em: {gpg.expiresAt}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNotify('Detalhes da chave GPG')}
                className="px-3 py-1 rounded-lg bg-[#121217] border border-[#27272A] text-xs text-zinc-300 self-end sm:self-center"
              >
                Detalhes
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PERSONAL ACCESS TOKENS (PATs)                                          */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
              <span>🎟️</span>
              <span>Personal Access Tokens (PATs)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tokens para autenticação via Nexus CLI, CI/CD runners e integrações REST/gRPC.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingToken(!isAddingToken)}
            className="px-3.5 py-2 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>{isAddingToken ? '✕ Cancelar' : '+ Gerar Novo Token'}</span>
          </button>
        </div>

        {isAddingToken && (
          <form
            onSubmit={handleAddToken}
            className="mb-4 bg-[#181820] border border-[#8257E5]/40 rounded-xl p-4 space-y-3"
          >
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Nome / Finalidade do Token
              </label>
              <input
                type="text"
                placeholder="Ex: VSCode Extension Sandbox"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full bg-[#121217] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingToken(false)}
                className="px-3 py-1.5 rounded-lg bg-[#27272A] text-xs text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#04D361] hover:bg-[#00B37E] text-black font-bold text-xs transition-all"
              >
                Gerar Token
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {tokens.map((tok) => (
            <div
              key={tok.id}
              className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{tok.name}</span>
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {tok.tokenPrefix}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tok.scopes.map((sc) => (
                    <span
                      key={sc}
                      className="text-[9px] font-mono bg-[#8257E5]/15 text-[#996DFF] px-2 py-0.5 rounded border border-[#8257E5]/30 font-semibold"
                    >
                      {sc}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTokens(tokens.filter((t) => t.id !== tok.id));
                  onNotify('Token revogado com sucesso.', 'info');
                }}
                className="px-3 py-1 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-xs text-[#F43F5E] font-semibold self-end sm:self-center"
              >
                Revogar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
