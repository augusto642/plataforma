'use client';

import React, { useState } from 'react';
import { SecuritySession, PasskeyItem } from '../types';
import { INITIAL_SESSIONS, INITIAL_PASSKEYS } from '../data';

interface SecurityTabProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ onNotify }) => {
  const [sessions, setSessions] = useState<SecuritySession[]>(INITIAL_SESSIONS);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>(INITIAL_PASSKEYS);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    onNotify('Sessão desconectada com sucesso.', 'info');
  };

  const handleRevokeAllOtherSessions = () => {
    setSessions(sessions.filter((s) => s.isCurrentSession));
    onNotify('Todas as outras sessões foram desconectadas.');
  };

  const handleAddPasskey = () => {
    const newPk: PasskeyItem = {
      id: `pk-${Date.now()}`,
      name: 'Chave de Segurança WebAuthn FIDO2',
      authenticatorType: 'security_key',
      createdAt: 'Agora mesmo',
    };
    setPasskeys([...passkeys, newPk]);
    onNotify('Nova Passkey FIDO2 registrada com sucesso!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onNotify('Preencha a senha atual e a nova senha.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('A nova senha e a confirmação não conferem.', 'error');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onNotify('Senha alterada com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TWO-FACTOR AUTHENTICATION & PASSKEYS                                   */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-heading">
                Autenticação de Dois Fatores (2FA TOTP)
              </h3>
              <span className="bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                ATIVO
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Proteja sua conta com aplicativos como Google Authenticator, 1Password ou Authy.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNotify('Modal de reconfiguração de 2FA TOTP aberto.')}
            className="px-3.5 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white transition-all cursor-pointer self-start sm:self-auto"
          >
            Reconfigurar 2FA
          </button>
        </div>

        {/* Passkeys WebAuthn / FIDO2 */}
        <div className="border-t border-[#27272A] pt-5 mt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                <span>🔐</span>
                <span>Passkeys Biométrica &amp; Chaves FIDO2</span>
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Login sem senha instantâneo com Touch ID, Face ID, Windows Hello ou chave YubiKey.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddPasskey}
              className="px-3 py-1.5 rounded-xl bg-[#8257E5] hover:bg-[#996DFF] text-white font-bold text-xs transition-all cursor-pointer self-start sm:self-auto"
            >
              + Adicionar Passkey
            </button>
          </div>

          <div className="space-y-2">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="bg-[#181820] border border-[#27272A] rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">
                    {pk.authenticatorType === 'touch_id'
                      ? '🍏'
                      : pk.authenticatorType === 'yubikey'
                      ? '🔑'
                      : '🛡️'}
                  </span>
                  <div>
                    <span className="font-bold text-white block">{pk.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Registrada em {pk.createdAt}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasskeys(passkeys.filter((p) => p.id !== pk.id));
                    onNotify('Passkey removida.', 'info');
                  }}
                  className="text-zinc-500 hover:text-[#F43F5E] text-xs font-semibold"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIVE SESSIONS                                                        */}
      {/* ========================================================================= */}
      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-heading">
              Sessões Ativas em Dispositivos
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dispositivos atualmente autenticados com acesso à sua conta Nexus Code.
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeAllOtherSessions}
              className="px-3.5 py-1.5 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/30 hover:bg-[#F43F5E]/20 text-xs text-[#F43F5E] font-semibold transition-all cursor-pointer self-start sm:self-auto"
            >
              Desconectar Outros Dispositivos
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="bg-[#181820] border border-[#27272A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">
                  {sess.device.includes('macOS') || sess.device.includes('Linux') ? '💻' : '📱'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{sess.device}</span>
                    {sess.isCurrentSession && (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#04D361]/15 text-[#04D361] border border-[#04D361]/30 font-bold">
                        ESTE DISPOSITIVO
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    {sess.browser} • {sess.location} •{' '}
                    <span className="font-mono text-zinc-500">{sess.ipAddress}</span>
                  </p>
                  <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{sess.lastActive}</p>
                </div>
              </div>

              {!sess.isCurrentSession && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(sess.id)}
                  className="px-3 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 text-xs font-semibold self-end sm:self-center transition-colors"
                >
                  Encerrar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CHANGE PASSWORD                                                        */}
      {/* ========================================================================= */}
      <form onSubmit={handleChangePassword} className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-heading">
          Alterar Senha de Acesso
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Senha Atual
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Nova Senha
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-bold">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#181820] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#8257E5]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#181820] border border-[#27272A] hover:border-zinc-500 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Atualizar Senha
          </button>
        </div>
      </form>
    </div>
  );
};
