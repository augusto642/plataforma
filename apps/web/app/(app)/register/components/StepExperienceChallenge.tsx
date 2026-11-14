'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { API_BASE } from '../../../lib/apiClient';
import {
  AssessedLevel,
  LevelEvaluationResult,
  PRIOR_LANGUAGES,
  PriorLanguageId,
  RegistrationChallenge,
  evaluateChallengeLocally,
  getFallbackChallenge,
  normalizeApiChallenge,
  normalizeApiEvaluation,
} from '../data/registrationOptions';

interface StepExperienceChallengeProps {
  hasProgrammedBefore: boolean | null;
  setHasProgrammedBefore: (value: boolean) => void;
  priorLanguage: PriorLanguageId | '';
  setPriorLanguage: (lang: PriorLanguageId | '') => void;
  challenge: RegistrationChallenge | null;
  setChallenge: (challenge: RegistrationChallenge | null) => void;
  explanation: string;
  setExplanation: (text: string) => void;
  evaluation: LevelEvaluationResult | null;
  setEvaluation: (result: LevelEvaluationResult | null) => void;
  onPrev: () => void;
  onNext: () => void;
}

const MIN_EXPLANATION_CHARS = 15;

const CODE_KEYWORDS = new Set([
  'function',
  'const',
  'let',
  'var',
  'return',
  'if',
  'else',
  'for',
  'while',
  'of',
  'in',
  'def',
  'class',
  'public',
  'private',
  'static',
  'void',
  'int',
  'float',
  'decimal',
  'bool',
  'boolean',
  'string',
  'array',
  'func',
  'fn',
  'foreach',
  'as',
  'true',
  'false',
  'null',
  'none',
  'True',
  'False',
  'None',
  'para',
  'cada',
  'na',
  'em',
  'se',
  'senao',
  'ou',
  'e',
  'funcao',
  'retornar',
  'mostrar',
  'nulo',
  'SELECT',
  'FROM',
  'INNER',
  'JOIN',
  'ON',
  'WHERE',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'DESC',
  'AS',
  'COUNT',
  'SUM',
]);

const TOKEN_REGEX =
  /(\/\/.*$|#.*$|--.*$|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*\b)/gm;

function renderHighlightedCodeLine(line: string): React.ReactNode {
  if (!line) return ' ';

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(TOKEN_REGEX)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      nodes.push(line.slice(lastIndex, start));
    }

    let className = 'text-[#F1F5F9]';
    if (token.startsWith('//') || token.startsWith('#') || token.startsWith('--')) {
      className = 'text-[#64748B] italic';
    } else if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) {
      className = 'text-[#00E676]';
    } else if (/^\d/.test(token)) {
      className = 'text-[#F59E0B]';
    } else if (CODE_KEYWORDS.has(token)) {
      className = 'text-[#FF79C6]';
    } else if (line[start + token.length] === '(') {
      className = 'text-[#00E5FF]';
    } else if (token === 'total' || token === 'preco' || token === 'resultado') {
      className = 'text-[#A379FF]';
    }

    nodes.push(
      <span key={`${start}-${token}`} className={className}>
        {token}
      </span>,
    );

    lastIndex = start + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

const LEVEL_STYLES: Record<
  AssessedLevel,
  {
    badgeClasses: string;
    borderClass: string;
    iconBgClass: string;
    badgeIcon: string;
    subtitle: string;
  }
> = {
  Iniciante: {
    badgeClasses: 'bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF]',
    borderClass: 'border-[#00E5FF]/45',
    iconBgClass: 'bg-[#00E5FF]/15 border-[#00E5FF]/35',
    badgeIcon: '🌱',
    subtitle: 'Foco em fundamentos sólidos e prática guiada desde o primeiro passo',
  },
  Júnior: {
    badgeClasses: 'bg-[#00E676]/10 border-[#00E676]/40 text-[#00E676]',
    borderClass: 'border-[#00E676]/45',
    iconBgClass: 'bg-[#00E676]/15 border-[#00E676]/35',
    badgeIcon: '⚡',
    subtitle: 'Boa base de leitura lógica — pronto(a) para projetos e desafios reais',
  },
  Pleno: {
    badgeClasses: 'bg-[#8257E5]/15 border-[#8257E5]/50 text-[#A379FF]',
    borderClass: 'border-[#8257E5]/55',
    iconBgClass: 'bg-[#8257E5]/20 border-[#8257E5]/40',
    badgeIcon: '🚀',
    subtitle: 'Domínio consistente de fluxo e estruturas — foco em arquitetura e escala',
  },
  Sênior: {
    badgeClasses: 'bg-[#F59E0B]/15 border-[#F59E0B]/45 text-[#FBBF24]',
    borderClass: 'border-[#F59E0B]/50',
    iconBgClass: 'bg-[#F59E0B]/15 border-[#F59E0B]/35',
    badgeIcon: '👑',
    subtitle: 'Leitura técnica avançada — foco em design de sistemas e alta performance',
  },
};

export const StepExperienceChallenge: React.FC<StepExperienceChallengeProps> = ({
  hasProgrammedBefore,
  setHasProgrammedBefore,
  priorLanguage,
  setPriorLanguage,
  challenge,
  setChallenge,
  explanation,
  setExplanation,
  evaluation,
  setEvaluation,
  onPrev,
  onNext,
}) => {
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const shouldLoadChallenge =
    hasProgrammedBefore === false || (hasProgrammedBefore === true && priorLanguage !== '');

  useEffect(() => {
    if (!shouldLoadChallenge) {
      setChallenge(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    const loadChallenge = async () => {
      setIsLoadingChallenge(true);
      setEvalError(null);
      setShowHint(false);

      const fallbackLang: PriorLanguageId | undefined =
        hasProgrammedBefore && priorLanguage ? priorLanguage : undefined;

      try {
        const params = new URLSearchParams({
          programmed: hasProgrammedBefore ? 'true' : 'false',
          language: fallbackLang ?? 'none',
        });

        const res = await fetch(
          `${API_BASE}/auth/registration-challenge?${params.toString()}`,
          {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          },
        );

        if (!isActive) return;

        if (res.ok) {
          const data: unknown = await res.json().catch(() => null);
          const normalized = normalizeApiChallenge(data, Boolean(hasProgrammedBefore), fallbackLang);
          if (normalized) {
            setChallenge(normalized);
            setIsLoadingChallenge(false);
            return;
          }
        }
      } catch {
        if (!isActive || controller.signal.aborted) return;
      }

      if (isActive) {
        setChallenge(getFallbackChallenge(Boolean(hasProgrammedBefore), fallbackLang));
        setIsLoadingChallenge(false);
      }
    };

    void loadChallenge();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [hasProgrammedBefore, priorLanguage, shouldLoadChallenge, setChallenge]);

  const handleSelectProgrammed = (value: boolean) => {
    if (hasProgrammedBefore === value) return;
    setHasProgrammedBefore(value);
    if (!value) {
      setPriorLanguage('');
    }
    setEvaluation(null);
    setEvalError(null);
  };

  const handleSelectLanguage = (langId: PriorLanguageId) => {
    if (priorLanguage === langId) return;
    setPriorLanguage(langId);
    setEvaluation(null);
    setEvalError(null);
  };

  const handleExplanationChange = (nextText: string) => {
    setExplanation(nextText);
    if (evaluation) {
      setEvaluation(null);
    }
    if (evalError) {
      setEvalError(null);
    }
  };

  const trimmedLength = explanation.trim().length;
  const canEvaluate =
    shouldLoadChallenge &&
    challenge !== null &&
    trimmedLength >= MIN_EXPLANATION_CHARS &&
    !isEvaluating;

  const runEvaluation = useCallback(async () => {
    if (!challenge || hasProgrammedBefore === null) return;
    if (explanation.trim().length < MIN_EXPLANATION_CHARS) {
      setEvalError(
        `Escreva pelo menos ${MIN_EXPLANATION_CHARS} caracteres explicando com suas próprias palavras para que a IA possa avaliar.`,
      );
      return;
    }

    setIsEvaluating(true);
    setEvalError(null);

    const payload = {
      hasProgrammedBefore,
      language: hasProgrammedBefore && priorLanguage ? priorLanguage : undefined,
      challengeId: challenge.id,
      explanation: explanation.trim(),
    };

    let result: LevelEvaluationResult | null = null;

    try {
      const res = await fetch(`${API_BASE}/auth/evaluate-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: unknown = await res.json().catch(() => null);
        result = normalizeApiEvaluation(data, hasProgrammedBefore, explanation);
      }
    } catch {
      // Fallback local garante resiliência quando a API estiver indisponível
    }

    if (!result) {
      result = evaluateChallengeLocally({
        hasProgrammedBefore,
        priorLanguage: hasProgrammedBefore && priorLanguage ? priorLanguage : undefined,
        explanation,
      });
    }

    setEvaluation(result);
    setIsEvaluating(false);

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [challenge, hasProgrammedBefore, priorLanguage, explanation, setEvaluation]);

  const handleFooterNext = async () => {
    if (evaluation) {
      onNext();
      return;
    }
    await runEvaluation();
  };

  const codeLines = challenge ? challenge.code.split('\n') : [];
  const levelStyle = evaluation ? LEVEL_STYLES[evaluation.level] : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          🤖 Calibragem Inteligente por IA
        </div>
        <h1 className="text-2xl sm:text-3xl font-brand font-black text-white tracking-tight">
          Conte sua experiência e explique um mini-desafio
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Você não precisa adivinhar seu nível. Responda com suas próprias palavras — nossa tutora de
          IA identifica de onde você deve começar para aprender sem frustração.
        </p>
      </div>

      {/* Pergunta 1: Já programou antes? */}
      <fieldset className="border-0 p-0 m-0 space-y-2">
        <legend className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold mb-2">
          1. Você já programou alguma vez antes?
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            aria-pressed={hasProgrammedBefore === true}
            onClick={() => handleSelectProgrammed(true)}
            className={`relative flex items-center gap-4 p-4 rounded-2xl text-left cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
              hasProgrammedBefore === true
                ? 'bg-[#181C2C] border-2 border-[#00E676] shadow-[0_0_20px_rgba(0,230,116,0.15)]'
                : 'bg-[#181C2C]/50 border border-[#1C2133] hover:border-[#00E676]/50'
            }`}
          >
            <div
              aria-hidden="true"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                hasProgrammedBefore === true
                  ? 'bg-[#00E676]/20 border-[#00E676]/40'
                  : 'bg-[#111420] border-[#1C2133]'
              }`}
            >
              💻
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Sim, já programei</div>
              <div className="text-xs text-[#94A3B8] mt-0.5 leading-snug">
                Já escrevi códigos em cursos, faculdade, trabalho ou projetos pessoais.
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={hasProgrammedBefore === false}
            onClick={() => handleSelectProgrammed(false)}
            className={`relative flex items-center gap-4 p-4 rounded-2xl text-left cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
              hasProgrammedBefore === false
                ? 'bg-[#181C2C] border-2 border-[#8257E5] shadow-[0_0_20px_rgba(130,87,229,0.2)]'
                : 'bg-[#181C2C]/50 border border-[#1C2133] hover:border-[#8257E5]/50'
            }`}
          >
            <div
              aria-hidden="true"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                hasProgrammedBefore === false
                  ? 'bg-[#8257E5]/20 border-[#8257E5]/40'
                  : 'bg-[#8257E5]/15 border-[#8257E5]/30'
              }`}
            >
              🌱
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Não, nunca programei</div>
              <div className="text-xs text-[#94A3B8] mt-0.5 leading-snug">
                Estou começando do zero absoluto e quero dar meu primeiro passo com clareza.
              </div>
            </div>
          </button>
        </div>
      </fieldset>

      {/* Pergunta 1b: Qual linguagem já usou? (somente se Sim) */}
      {hasProgrammedBefore === true && (
        <fieldset className="border-0 p-0 m-0 space-y-2 pt-1">
          <legend className="block text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold mb-2.5">
            2. Qual linguagem você já usou ou conhece melhor?
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {PRIOR_LANGUAGES.map((lang) => {
              const isSelected = priorLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectLanguage(lang.id)}
                  className={`text-left rounded-xl p-3 transition-all cursor-pointer flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
                    isSelected
                      ? 'bg-[#181C2C] border-2 border-[#8257E5] shadow-[0_0_16px_rgba(130,87,229,0.22)]'
                      : 'bg-[#181C2C]/50 border border-[#1C2133] hover:border-[#8257E5]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs font-bold text-white">{lang.label}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[#8257E5]/25 text-[#A379FF]'
                          : 'bg-[#111420] text-[#94A3B8]'
                      }`}
                    >
                      {lang.tag}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] leading-tight">{lang.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Desafio em Terminal + Explicação */}
      {shouldLoadChallenge && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-bold m-0">
              {hasProgrammedBefore
                ? '3. Desafio de Leitura de Código'
                : '2. Desafio Rápido de Lógica (Leitura Intuitiva)'}
            </h2>
            {challenge && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#A379FF] bg-[#8257E5]/10 px-2.5 py-0.5 rounded-full border border-[#8257E5]/30">
                  {challenge.language}
                </span>
                <span className="text-xs font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2.5 py-0.5 rounded-full border border-[#00E5FF]/20">
                  {challenge.difficultyLabel}
                </span>
              </div>
            )}
          </div>

          {isLoadingChallenge ? (
            <div
              role="status"
              aria-label="Carregando desafio personalizado"
              className="rounded-2xl bg-[#07080C] border border-[#1C2133] p-5 flex items-center gap-3"
            >
              <div className="w-4 h-4 rounded-full border-2 border-[#8257E5]/30 border-t-[#00E5FF] animate-spin shrink-0" />
              <span className="text-xs font-mono text-[#94A3B8]">
                Preparando seu desafio personalizado...
              </span>
            </div>
          ) : challenge ? (
            <>
              <div className="rounded-2xl bg-[#07080C] border border-[#1C2133] overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
                {/* Terminal Top Bar */}
                <div className="px-4 py-2.5 bg-[#0C0E15] border-b border-[#1C2133] flex items-center justify-between gap-2 text-xs font-mono text-[#64748B]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80 shrink-0" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80 shrink-0" aria-hidden="true" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80 shrink-0" aria-hidden="true" />
                    <span className="ml-2 text-white truncate">{challenge.title}</span>
                  </div>
                  <span className="shrink-0 uppercase text-[11px]">{challenge.language}</span>
                </div>

                {/* Enunciado */}
                <div className="px-4 py-3 bg-[#111420]/70 border-b border-[#1C2133] text-xs sm:text-[13px] text-[#94A3B8] leading-relaxed">
                  {challenge.prompt}
                </div>

                {/* Código com numeração e destaque sintático */}
                <pre
                  aria-label={`Código do desafio: ${challenge.title}`}
                  className="m-0 p-4 overflow-x-auto font-mono text-xs sm:text-sm text-[#F1F5F9] leading-relaxed"
                >
                  <code className="block space-y-1">
                    {codeLines.map((line, index) => (
                      <div key={index} className="flex">
                        <span
                          aria-hidden="true"
                          className="text-[#64748B] select-none mr-3 w-5 shrink-0 text-right"
                        >
                          {index + 1}
                        </span>
                        <span className="whitespace-pre">{renderHighlightedCodeLine(line)}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>

              {challenge.hint && (
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHint((prev) => !prev)}
                    className="text-xs font-mono font-semibold text-[#A379FF] hover:text-white bg-transparent border-0 cursor-pointer p-0 flex items-center gap-1.5 transition-colors"
                  >
                    <span aria-hidden="true">💡</span>
                    <span>{showHint ? 'Ocultar dica rápida' : 'Precisa de uma dica para começar?'}</span>
                  </button>
                  {showHint && (
                    <div className="w-full rounded-xl px-4 py-3 text-xs text-[#F1F5F9] bg-[#8257E5]/10 border border-[#8257E5]/30 leading-relaxed">
                      {challenge.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Textarea da explicação */}
              <div className="space-y-2 pt-1">
                <label
                  htmlFor="challenge-explanation-input"
                  className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-[#94A3B8]"
                >
                  <span>Sua explicação (com suas palavras):</span>
                  <span className="text-[11px] normal-case text-[#94A3B8]">
                    {trimmedLength < MIN_EXPLANATION_CHARS
                      ? `Mínimo ${MIN_EXPLANATION_CHARS} caracteres (${trimmedLength}/${MIN_EXPLANATION_CHARS})`
                      : `${trimmedLength} caracteres`}
                  </span>
                </label>

                <textarea
                  id="challenge-explanation-input"
                  aria-label="Explique com suas próprias palavras o que o desafio faz ou como resolveria"
                  rows={3}
                  value={explanation}
                  onChange={(e) => handleExplanationChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Garante que Enter dentro da textarea insere quebra de linha e nunca avança o wizard
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  placeholder={
                    hasProgrammedBefore
                      ? 'Ex: A função recebe uma lista de itens, filtra apenas os válidos e calcula o total aplicando a regra condicional...'
                      : 'Ex: Primeiro ele olha o valor da compra e se o cliente é VIP. Como ele é VIP, o frete fica zero e o total dá 180...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#181C2C] border border-[#1C2133] focus:border-[#00E5FF] focus:outline-none text-sm text-white font-sans placeholder-[#64748B] transition-colors resize-y min-h-[108px] leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Não existe resposta errada — escreva como você explicaria para um amigo.
                  </span>

                  <button
                    type="button"
                    onClick={runEvaluation}
                    disabled={!canEvaluate}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold font-mono transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      evaluation
                        ? 'bg-[#8257E5]/15 border border-[#8257E5]/45 text-[#A379FF] hover:bg-[#8257E5]/25'
                        : 'bg-[#00E5FF]/10 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/20'
                    }`}
                  >
                    {isEvaluating ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-[#00E5FF]/30 border-t-[#00E5FF] animate-spin" />
                        <span>Analisando sua resposta...</span>
                      </>
                    ) : evaluation ? (
                      <span>🔄 Reanalisar minha resposta com IA</span>
                    ) : (
                      <span>✨ Analisar minha resposta com IA</span>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Erro de validação / análise */}
      {evalError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/35 text-[#FCA5A5]"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{evalError}</span>
        </div>
      )}

      {/* Resultado da Avaliação pela IA */}
      {evaluation && levelStyle && (
        <div
          ref={resultRef}
          role="region"
          aria-label="Resultado da avaliação de nível pela IA"
          className={`rounded-2xl p-5 bg-[#0C0E15] border ${levelStyle.borderClass} shadow-[0_14px_36px_rgba(0,0,0,0.45)] space-y-4 animate-fadeIn`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 ${levelStyle.iconBgClass}`}
              >
                {levelStyle.badgeIcon}
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#94A3B8]">
                  Nível identificado pelo modelo
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-lg font-brand font-extrabold text-white">
                    {evaluation.level}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${levelStyle.badgeClasses}`}
                  >
                    Calibrado pela sua resposta
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8] m-0 leading-relaxed">{levelStyle.subtitle}</p>

          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
              Conceitos identificados na sua explicação
            </div>
            <div className="flex flex-wrap gap-2">
              {evaluation.identifiedConcepts.map((concept) => (
                <span
                  key={concept}
                  className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-[#8257E5]/15 border border-[#8257E5]/35 text-[#E9D5FF]"
                >
                  ✓ {concept}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3.5 text-xs sm:text-[13px] leading-relaxed text-[#F1F5F9] bg-[#00E676]/10 border border-[#00E676]/25 flex items-start gap-3">
            <img
              src="/images/onboarding/lumi-tutor.png"
              alt="Tutora Lumi"
              className="w-6 h-6 rounded-md object-cover border border-[#8257E5]/50 shrink-0 mt-0.5"
            />
            <div>
              <strong className="text-[#00E676]">Feedback da Lumi (IA): </strong>
              {evaluation.feedback}
            </div>
          </div>
        </div>
      )}

      {/* Footer de navegação */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-[#1C2133]">
        <button
          type="button"
          onClick={onPrev}
          className="text-xs font-mono text-[#94A3B8] hover:text-white flex items-center justify-center sm:justify-start gap-1.5 transition-colors cursor-pointer bg-transparent border-0 py-2"
        >
          ← Voltar para Credenciais
        </button>

        <button
          type="button"
          onClick={handleFooterNext}
          disabled={!evaluation && !canEvaluate}
          className="px-6 py-3 rounded-xl bg-[#8257E5] hover:bg-[#9366f0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-[0_0_25px_rgba(130,87,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {isEvaluating
              ? 'Analisando resposta...'
              : evaluation
              ? 'Avançar para Objetivos'
              : 'Analisar e ver meu nível'}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
