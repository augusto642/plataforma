'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/apiClient';

interface Sprint {
  id: string;
  order: number;
  title: string;
  description: string;
  baseXp: number;
  tasks: string[];
}

interface GuidedProject {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  prerequisites: Array<{ id: string; title: string; required?: boolean }>;
  techStack: string[];
  sprintsCount: number;
  sprints: Sprint[];
  userProgress?: {
    currentSprint: number;
    status: string;
    giteaRepoName?: string;
  } | null;
}

export default function ProjetosGuiadosPage() {
  const [projects, setProjects] = useState<GuidedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<GuidedProject | null>(null);
  const [starting, setStarting] = useState(false);
  const [startResult, setStartResult] = useState<{ repoUrl: string; repoName: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/guided-projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0) setSelectedProject(data[0]);
        }
      } catch (err) {
        setError('Não foi possível carregar os projetos no momento.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStartProject = async (projectId: string) => {
    setStarting(true);
    setError(null);
    try {
      const res = await apiClient.post(`/guided-projects/${projectId}/start`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Falha ao provisionar projeto no Gitea');
      }
      const data = await res.json();
      setStartResult({ repoUrl: data.repoUrl, repoName: data.repoName });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <span>🛡️</span>
            <span>Esteira DevOps & Projetos Guiados Júnior/Pleno</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Projetos Práticos do Mundo Real
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Desenvolva soluções completas com esteira CI/CD real (Jenkins, SonarQube, Gitea e Docker).
            Seu código é auditado automaticamente e bônus de Clean Code multiplicam seu XP.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando catálogo de projetos...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0C0F17] border border-slate-800 text-center text-slate-400">
            Nenhum projeto guiado disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista Lateral de Projetos */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Catálogo Disponível
              </h2>
              {projects.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProject(p);
                      setStartResult(null);
                      setError(null);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#121624] border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-[#0C0F17] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                        Nível {p.level === 'mid' ? 'Pleno' : 'Júnior'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {p.sprintsCount} sprints
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm mb-2">{p.title}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.techStack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                      {p.techStack.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                          +{p.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detalhes do Projeto Selecionado */}
            {selectedProject && (
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-2xl bg-[#0C0F17] border border-slate-800 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Nível {selectedProject.level === 'mid' ? 'Pleno' : 'Júnior'}
                      </span>
                      {selectedProject.userProgress?.status === 'in_progress' && (
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                          Sprint {selectedProject.userProgress.currentSprint} em andamento
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white font-heading">
                      {selectedProject.title}
                    </h2>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      {selectedProject.description}
                    </p>
                  </div>

                  {/* Stack Tecnológica */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                      Stack Tecnológica & DevOps
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded-lg bg-[#121624] border border-slate-700 text-xs font-medium text-slate-200 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Checklist de Pré-requisitos Obrigatórios */}
                  <div className="p-5 rounded-xl bg-[#121624] border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      <h3 className="text-sm font-bold text-white">
                        Checklist de Conhecimentos Básicos (Pré-requisitos)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Para garantir uma experiência de aprendizado produtiva neste nível, os tópicos abaixo são necessários antes de codificar no repositório.
                    </p>
                    <ul className="space-y-2 mt-2">
                      {selectedProject.prerequisites.map((pr) => (
                        <li key={pr.id} className="flex items-center gap-2.5 text-xs text-slate-300">
                          <span className="text-emerald-400">✓</span>
                          <span>{pr.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Sprints Conectadas ao Gitea */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                      Sprints e Entregas Contínuas
                    </h3>
                    <div className="space-y-3">
                      {selectedProject.sprints.map((s) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-xl bg-[#07090E] border border-slate-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">
                              {s.title}
                            </span>
                            <span className="text-xs font-bold text-indigo-400 font-mono">
                              +{s.baseXp} XP Base
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{s.description}</p>
                          <div className="pt-1">
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                              {s.tasks.map((task, idx) => (
                                <li key={idx}>{task}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alerta de Erro */}
                  {error && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      {error}
                    </div>
                  )}

                  {/* Repositório Provisionado */}
                  {startResult && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
                      <div className="font-bold text-sm">
                        Repositório no Gitea provisionado com sucesso!
                      </div>
                      <p className="text-xs text-slate-300">
                        Clone o repositório na sua máquina para começar a desenvolver:
                      </p>
                      <div className="p-2.5 rounded-lg bg-black/60 font-mono text-xs text-slate-200 select-all border border-slate-800">
                        git clone {startResult.repoUrl}
                      </div>
                    </div>
                  )}

                  {/* Ação de Provisionamento */}
                  {!startResult && (
                    <button
                      type="button"
                      onClick={() => handleStartProject(selectedProject.id)}
                      disabled={starting}
                      className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {starting
                        ? 'Provisionando repositório e esteira CI...'
                        : 'Provisionar Repositório no Gitea & Iniciar'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
