'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  decideIntroduction,
  getMyIntroductions,
  getMyTalentProfile,
  refreshMyTalentProfile,
  updateMyTalentProfile,
  type StudentIntroduction,
  type TalentProfile,
} from '../../lib/talent';

/**
 * Fase 4 premium (desenho §5.1) — perfil do aluno no Talent Match.
 * Consentimento opt-in explícito; o copy mantém como substring a frase
 * do desenho ("visível para empresas parceiras, com consentimento").
 * Desligar o toggle remove o perfil de todas as listagens na hora.
 * Destaque (spotlight) é Carreira — sem promessa de contratação.
 */
export default function TalentPage() {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [introductions, setIntroductions] = useState<StudentIntroduction[]>([]);
  const [headline, setHeadline] = useState('');
  const [projectUrls, setProjectUrls] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getMyTalentProfile();
      setProfile(data);
      setHeadline(data.profile?.headline ?? '');
      setProjectUrls((data.profile?.projectUrls ?? []).join('\n'));
      setIntroductions(await getMyIntroductions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  async function saveProfile(patch: { headline?: string; projectUrls?: string[]; visible?: boolean; spotlight?: boolean }) {
    setError(null);
    setNotice(null);
    try {
      await updateMyTalentProfile(patch);
      setNotice('Perfil atualizado.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">Carregando…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
        <div className="max-w-[720px] mx-auto text-sm text-zinc-400">
          Entre na sua conta para gerenciar seu perfil no Talent Match.
        </div>
      </div>
    );
  }

  const visible = profile?.effectivelyVisible ?? false;
  const isCareer = user.plan === 'career';

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] px-5 py-16">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-2xl font-bold">Talent Match</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Seu perfil fica visível para empresas parceiras, com consentimento.
          O match usa só skills comprovadas (atividades concluídas e
          certificados) — nunca o que você declarou. Seu e-mail nunca é
          exposto às empresas, nem após o aceite: aceitar uma introdução
          apenas sinaliza interesse mútuo; um canal de contato dentro da
          plataforma é trabalho futuro.
        </p>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {notice && <p className="mt-4 text-sm text-[#04D361]">{notice}</p>}

        <div className="mt-6 rounded-lg border border-zinc-800 p-4">
          <p className="text-sm">
            Status: <strong>{visible ? 'Visível para empresas parceiras' : 'Oculto para empresas'}</strong>
          </p>
          <button
            className="mt-3 rounded bg-[#8257E5] px-4 py-2 text-sm font-semibold"
            onClick={() => saveProfile({ visible: !visible })}
          >
            {visible ? 'Ocultar meu perfil agora' : 'Deixar meu perfil visível para empresas parceiras'}
          </button>
          <p className="mt-2 text-xs text-zinc-400">
            Ao ocultar, seu perfil sai de todas as listagens de empresas imediatamente.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-800 p-4">
          <label className="block text-sm font-semibold" htmlFor="headline">Título do perfil</label>
          <input
            id="headline"
            className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Ex.: Desenvolvedora Java em formação"
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="projects">
            Projetos (um link por linha — GitHub ou deploy)
          </label>
          <textarea
            id="projects"
            className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            rows={3}
            value={projectUrls}
            onChange={(e) => setProjectUrls(e.target.value)}
            placeholder="https://github.com/voce/projeto"
          />
          <div className="mt-3 flex gap-2">
            <button
              className="rounded bg-[#8257E5] px-4 py-2 text-sm font-semibold"
              onClick={() =>
                saveProfile({
                  headline,
                  projectUrls: projectUrls.split('\n').map((u) => u.trim()).filter(Boolean),
                })
              }
            >
              Salvar perfil
            </button>
            <button
              className="rounded border border-zinc-700 px-4 py-2 text-sm"
              onClick={async () => {
                await refreshMyTalentProfile();
                setNotice('Skills comprovadas recalculadas.');
                await load();
              }}
            >
              Recalcular skills comprovadas
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-800 p-4">
          <h2 className="font-semibold">Skills comprovadas</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {(profile?.profile?.skillsProven ?? []).join(', ') || 'Nenhuma ainda — conclua atividades para comprovar.'}
          </p>
          <h2 className="mt-4 font-semibold">Certificados</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {(profile?.certificates ?? []).map((c) => c.title).join(', ') || 'Nenhum certificado emitido.'}
          </p>
          <div className="mt-4">
            <p className="text-sm font-semibold">Destaque no Talent Match</p>
            <p className="mt-1 text-sm text-zinc-400">
              {isCareer
                ? 'Seu plano Carreira permite destaque.'
                : 'O destaque é exclusivo do plano Carreira.'}
            </p>
            {isCareer && (
              <button
                className="mt-2 rounded border border-zinc-700 px-4 py-2 text-sm"
                onClick={() => saveProfile({ spotlight: !(profile?.profile?.spotlight ?? false) })}
              >
                {profile?.profile?.spotlight ? 'Remover destaque' : 'Destacar meu perfil'}
              </button>
            )}
          </div>
        </div>

        <h2 className="mt-8 text-lg font-semibold">Pedidos de introdução</h2>
        {introductions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhum pedido por enquanto.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {introductions.map((intro) => (
              <li key={intro.id} className="rounded-lg border border-zinc-800 p-4">
                <strong>{intro.companyName}</strong>
                {intro.jobTitle && <span className="text-sm text-zinc-400"> · {intro.jobTitle}</span>}
                <p className="mt-1 text-sm text-zinc-400">Status: {intro.status}</p>
                {intro.companyMessage && <p className="mt-1 text-sm">{intro.companyMessage}</p>}
                {intro.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded bg-[#04D361] px-3 py-1.5 text-sm font-semibold text-black"
                      onClick={async () => {
                        await decideIntroduction(intro.id, true);
                        await load();
                      }}
                    >
                      Aceitar
                    </button>
                    <button
                      className="rounded border border-zinc-700 px-3 py-1.5 text-sm"
                      onClick={async () => {
                        await decideIntroduction(intro.id, false);
                        await load();
                      }}
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
