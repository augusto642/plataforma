'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IdeHeader } from './components/IdeHeader';
import { IdeEditorPane } from './components/IdeEditorPane';
import { InstructionsPanel } from './components/InstructionsPanel';
import { TerminalConsole } from './components/TerminalConsole';
import { TestResultsGrid } from './components/TestResultsGrid';
import { CodeReviewPanel } from './components/CodeReviewPanel';
import { SubmissionsHistoryDrawer } from './components/SubmissionsHistoryDrawer';
import AuthView from '../../components/AuthView';
import AITutorPanel from '../../components/AITutorPanel';
import ProgressModal from '../../components/ProgressModal';
import LeaderboardModal from '../../components/LeaderboardModal';
import ReportModal from '../../components/ReportModal';
import LibraryModal from '../../components/LibraryModal';
import TalentModal from '../../components/TalentModal';
import { useSubmissionStream } from '../../hooks/useSubmissionStream';
import { LeaderboardEntry, UserProgress, CourseProgress, UserBadge, LineFeedbackItem } from '../../types';
import { fireConfetti } from '../dashboard/utils/confetti';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, API_BASE } from '../../lib/apiClient';
// Central 219 lote 4 (D4) — lógica pura da tela de jogo em 3 colunas.
import { nextActivity, passedTestSummary } from './game-layout';
// Sprint 5 — fundo do funil: primeira atividade concluída (B08 completo)
import { track } from '../../lib/analytics';

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'NEXUS CODE';
const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  activities?: Activity[];
}

interface Activity {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructions?: string;
  language: string;
  conceptTags?: string[];
  initialCode?: string;
  testCode?: string;
  hiddenTests?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  course?: { id: string; title: string; slug: string };
}

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs?: number;
  errorMessage?: string;
  isHidden?: boolean;
}

interface Submission {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  durationMs: number | null;
  errorMessage?: string;
  aiFeedback?: string;
  aiHints?: string;
  createdAt?: string;
  testResults: TestCaseResult[];
}

export default function HomePage() {
  const { user: authUser, token: authToken, logout: authLogout, isLoading: authLoading } = useAuth();
  const [token, setToken] = useState<string | null>(authToken || (authUser ? 'cookie-auth' : null));
  const [user, setUser] = useState<User | null>(authUser);

  useEffect(() => {
    if (authUser) setUser(authUser);
    if (authToken) setToken(authToken);
    else if (authUser) setToken('cookie-auth');
  }, [authUser, authToken]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  // Sprint 21 — oferta de remediação por conceito (GET /adaptation/
  // remediation): preenchida quando a atividade atual pertence a um
  // conceito frágil (>= 3 falhas do aluno naquele conceito).
  const [remediationOffer, setRemediationOffer] = useState<{
    conceptTag: string;
    moduleTitle: string;
    failedAttempts: number;
    reinforcement: {
      id: string;
      title: string;
      courseId: string;
      courseSlug: string;
      source: 'library' | 'track';
    } | null;
  } | null>(null);
  const remediationShownRef = useRef<Set<string>>(new Set());
  const [submissionHistory, setSubmissionHistory] = useState<Submission[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [streamingSubmissionId, setStreamingSubmissionId] = useState<string | null>(null);

  // Progress & Gamification State
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Leaderboard State
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Reports State
  const [showReportModal, setShowReportModal] = useState(false);

  // Library State (instructor)
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Talent Portal State (admin)
  const [showTalentModal, setShowTalentModal] = useState(false);

  // Git Provisioning State (student)
  const [gitInfo, setGitInfo] = useState<{ repoFullName: string; cloneUrl: string } | null>(null);
  const [isProvisioningGit, setIsProvisioningGit] = useState(false);

  // Line Feedback State
  const [lineFeedback, setLineFeedback] = useState<LineFeedbackItem[] | null>(null);
  const [isLoadingLineFeedback, setIsLoadingLineFeedback] = useState(false);

  // Enrollment Code State (instructor)
  const [courseCode, setCourseCode] = useState<string | null>(null);

  // Join by Code State (student)
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Reference Solution State
  const [showReference, setShowReference] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);

  // AI Tutor State
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  // Sprint 22 — a resposta da dica carrega a proveniência (source):
  // 'llm' com provider/modelo, ou 'heuristic' no modo offline.
  const [aiHints, setAiHints] = useState<{
    summary: string;
    hints: string[];
    suggestedConcept: string;
    source?: 'llm' | 'heuristic';
    provider?: string;
    model?: string;
    fallbackReason?: string;
  } | null>(null);
  // Central 219 lote 4 (D4) — a tutora é a 3ª coluna do protótipo
  // (desafio-jogo.html), visível por padrão; o botão "Tutora de IA" do
  // topo abre/fecha a coluna (e o ✕ do painel também fecha).
  const [isChatOpen, setIsChatOpen] = useState(true);
  const editorRef = useRef<any>(null);
  const submissionStreamAbortRef = useRef<AbortController | null>(null);
  const courseFetchAbortRef = useRef<AbortController | null>(null);

  // Instructor Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseSlug, setNewCourseSlug] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  const [newActTitle, setNewActTitle] = useState('');
  const [newActSlug, setNewActSlug] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActLang, setNewActLang] = useState('javascript');
  const [newActInitialCode, setNewActInitialCode] = useState('');
  const [newActTestCode, setNewActTestCode] = useState('');
  const [newActHiddenTests, setNewActHiddenTests] = useState('');

  useSubmissionStream(
    streamingSubmissionId,
    token || (user ? 'cookie-auth' : null),
    (updated) => {
      setSubmission(updated as Submission);
      if (['passed', 'failed', 'error'].includes(updated.status)) {
        setIsSubmitting(false);
        if (updated.status === 'passed') {
          // Sprint 5 — primeira atividade concluída DE VERDADE: o stream
          // da submissão confirmou 'passed' (testes verdes no sandbox).
          // Emite uma única vez por visitante (flag persistente); as
          // conclusões seguintes são retenção, não ativação do funil.
          try {
            if (!localStorage.getItem('nexus_first_activity_tracked')) {
              localStorage.setItem('nexus_first_activity_tracked', 'true');
              track('first_activity_completed', undefined, {
                activityId: (updated as { activityId?: string }).activityId ?? 'unknown',
              });
            }
          } catch {
            // sem storage, emite sem a guarda (melhor um duplicado raro
            // do que perder a ativação)
            track('first_activity_completed');
          }
          fireConfetti({ particleCount: 120, spread: 80 });
          apiFetch(`${API_BASE}/users/me/progress`, {})
            .then((r) => r.ok ? r.json() : null)
            .then((p) => { if (p) setUserProgress(p); })
            .catch(() => {});
        }
      }
    },
    () => {
      setIsSubmitting(false);
      setStreamingSubmissionId(null);
    },
  );

  // Sprint 21 — com uma submissão `failed` na tela, consulta os
  // conceitos frágeis do aluno: se algum conceito DESTA atividade está
  // frágil, a oferta de reforço aparece junto das ações da tutora.
  useEffect(() => {
    if (!submission || submission.status !== 'failed' || !selectedActivity) {
      setRemediationOffer(null);
      return;
    }
    const tags = selectedActivity.conceptTags ?? [];
    if (tags.length === 0) {
      setRemediationOffer(null);
      return;
    }
    let cancelled = false;
    apiFetch(`${API_BASE}/adaptation/remediation`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const fragile = (data.fragileConcepts ?? []).find(
          (f: { conceptTag: string }) => tags.includes(f.conceptTag),
        );
        if (!fragile) {
          setRemediationOffer(null);
          return;
        }
        setRemediationOffer({
          conceptTag: fragile.conceptTag,
          moduleTitle: fragile.moduleTitle,
          failedAttempts: fragile.failedAttempts,
          reinforcement: fragile.reinforcement
            ? {
                id: fragile.reinforcement.id,
                title: fragile.reinforcement.title,
                courseId: fragile.reinforcement.courseId,
                courseSlug: fragile.reinforcement.courseSlug,
                source: fragile.reinforcement.source,
              }
            : null,
        });
        const key = `${selectedActivity.id}:${fragile.conceptTag}`;
        if (!remediationShownRef.current.has(key)) {
          remediationShownRef.current.add(key);
          track('remediation_offer_shown', undefined, {
            conceptTag: fragile.conceptTag,
            source: fragile.reinforcement?.source ?? 'none',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [submission, selectedActivity]);

  // Keyboard accessibility (Escape key to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProgressModal(false);
        setShowLeaderboardModal(false);
        setShowReportModal(false);
        setShowHistoryModal(false);
        setShowCourseModal(false);
        setShowActivityModal(false);
        setShowLibraryModal(false);
        setShowTalentModal(false);
        setIsChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      submissionStreamAbortRef.current?.abort();
      courseFetchAbortRef.current?.abort();
    };
  }, []);

  // Sprint 21 — deep link da adaptação: /ide?course=<id>&activity=<id>
  // (próximo passo e test-out da página do curso, oferta de remediação).
  // Sem os parâmetros, o comportamento é exatamente o de antes.
  const deepLinkRef = useRef<{
    courseId: string | null;
    activityId: string | null;
  } | null>(null);
  const getDeepLink = () => {
    if (!deepLinkRef.current) {
      try {
        const params = new URLSearchParams(window.location.search);
        deepLinkRef.current = {
          courseId: params.get('course'),
          activityId: params.get('activity'),
        };
      } catch {
        deepLinkRef.current = { courseId: null, activityId: null };
      }
    }
    return deepLinkRef.current;
  };

  const loadCourses = async () => {
    if (!token && !user) return;
    try {
      const res = await apiFetch(`${API_BASE}/courses`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0 && !selectedCourse) {
          const linked = data.find(
            (c: Course) => c.id === getDeepLink().courseId,
          );
          selectCourse(linked ?? data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load courses', e);
    }
  };

  useEffect(() => {
    if (token || user) {
      loadCourses();
    }
  }, [token, user]);

  const selectCourse = async (course: Course): Promise<Activity[] | null> => {
    courseFetchAbortRef.current?.abort();
    const controller = new AbortController();
    courseFetchAbortRef.current = controller;

    setSelectedCourse(course);
    setSelectedActivity(null);
    setSubmission(null);
    setCourseCode(null);
    setGitInfo(null);
    try {
      const res = await apiFetch(`${API_BASE}/activities?courseId=${course.id}`, {
      
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
        if (data.length > 0) {
          const linked = (data as Activity[]).find(
            (a) => a.id === getDeepLink().activityId,
          );
          selectActivity(linked ?? data[0]);
        }
        return data as Activity[];
      }
      return null;
    } catch (e: any) {
      if (e.name === 'AbortError') return null;
      console.error('Failed to load activities', e);
      return null;
    }
  };

  const selectActivity = async (act: Activity) => {
    submissionStreamAbortRef.current?.abort();
    courseFetchAbortRef.current?.abort();

    setSelectedActivity(act);
    setCode(act.initialCode || '// Escreva sua solução aqui\n');
    setSubmission(null);
    setAiHints(null);
    setLineFeedback(null);
    setShowReference(false);
    setReferenceCode(null);
  };

  const handleOpenLeaderboard = async () => {
    if (!selectedCourse || !token) return;
    setIsLoadingLeaderboard(true);
    setShowLeaderboardModal(true);
    try {
      const res = await apiFetch(`${API_BASE}/courses/${selectedCourse.id}/leaderboard`, {
      
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to load leaderboard', e);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleDailyChallenge = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/activities/daily`);
      if (!res.ok) {
        alert('Não foi possível carregar o Desafio do Dia.');
        return;
      }
      const data = await res.json();
      if (!data.activity) {
        alert('Você já passou em todas as atividades dos seus cursos. Cadastre-se em uma nova turma para continuar evoluindo!');
        return;
      }
      const daily: Activity = data.activity;
      const course = courses.find((c) => c.id === daily.course?.id) ?? null;
      if (course) {
        const loaded = await selectCourse(course);
        const full = loaded?.find((a) => a.id === daily.id);
        if (full) {
          selectActivity(full);
          return;
        }
      }
      selectActivity(daily);
    } catch (e: any) {
      alert('Erro ao buscar o Desafio do Dia: ' + e.message);
    }
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (!trimmed) return;
    setIsJoining(true);
    try {
      const res = await apiFetch(`${API_BASE}/courses/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      if (res.ok) {
        setJoinCode('');
        await loadCourses();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Código de turma inválido.');
      }
    } catch (err: any) {
      alert('Erro ao entrar na turma: ' + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleRevealCode = async () => {
    if (!selectedCourse) return;
    try {
      const res = await apiFetch(`${API_BASE}/courses/${selectedCourse.id}/enrollment-code`);
      if (res.ok) {
        const data = await res.json();
        setCourseCode(data.enrollmentCode ?? '—');
      } else {
        alert('Não foi possível obter o código da turma.');
      }
    } catch (err: any) {
      alert('Erro ao obter código da turma: ' + err.message);
    }
  };

  const handleOpenCertificate = async () => {
    if (!selectedCourse) return;
    try {
      const res = await apiFetch(`${API_BASE}/courses/${selectedCourse.id}/certificate?format=html`);
      if (res.ok) {
        const html = await res.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Não foi possível emitir o certificado.');
      }
    } catch (err: any) {
      alert('Erro ao emitir certificado: ' + err.message);
    }
  };

  const handleProvisionGit = async () => {
    if (!selectedCourse || !token || isProvisioningGit) return;
    setIsProvisioningGit(true);
    try {
      const res = await apiFetch(`${API_BASE}/courses/${selectedCourse.id}/git/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setGitInfo(data);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Não foi possível configurar o Git.');
      }
    } catch (err: any) {
      alert('Erro ao configurar Git: ' + err.message);
    } finally {
      setIsProvisioningGit(false);
    }
  };

  const handleLoadReference = async () => {
    if (!selectedActivity) return;
    if (showReference) {
      setShowReference(false);
      return;
    }
    if (referenceCode !== null) {
      setShowReference(true);
      return;
    }
    setIsLoadingReference(true);
    try {
      const res = await apiFetch(`${API_BASE}/activities/${selectedActivity.id}/reference-solution`);
      if (res.ok) {
        const data = await res.json();
        setReferenceCode(data.referenceSolution || 'Nenhuma solução de referência cadastrada para esta atividade.');
        setShowReference(true);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Não foi possível carregar a solução de referência.');
      }
    } catch (err: any) {
      alert('Erro ao carregar solução de referência: ' + err.message);
    } finally {
      setIsLoadingReference(false);
    }
  };

  const handleLogout = async () => {
    submissionStreamAbortRef.current?.abort();
    courseFetchAbortRef.current?.abort();
    await authLogout();
    setToken(null);
    setUser(null);
    setSelectedCourse(null);
    setSelectedActivity(null);
    setSubmission(null);
    setIsSubmitting(false);
  };

  const handleRunCode = async () => {
    if (!selectedActivity) return;
    submissionStreamAbortRef.current?.abort();
    const controller = new AbortController();
    submissionStreamAbortRef.current = controller;

    setIsSubmitting(true);
    setSubmission(null);
    setAiHints(null);
    setLineFeedback(null);
    try {
      const res = await apiFetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          activityId: selectedActivity.id,
          code,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Falha ao enviar submissão');
      }

      const created = await res.json();
      setStreamingSubmissionId(created.id);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        alert(e.message);
        setIsSubmitting(false);
      }
    }
  };

  const handleAskAi = async () => {
    if (!submission || !token) return;
    setIsLoadingAi(true);
    try {
      const res = await apiFetch(`${API_BASE}/ai/hint/${submission.id}`, {
        method: 'POST',

      });
      if (res.ok) {
        const data = await res.json();
        setAiHints(data);
      } else {
        alert('Não foi possível carregar a dica da IA no momento.');
      }
    } catch (err: any) {
      alert('Erro ao consultar IA: ' + err.message);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleRequestLineFeedback = async () => {
    if (!submission || !token) return;
    setIsLoadingLineFeedback(true);
    try {
      const res = await apiFetch(`${API_BASE}/ai/line-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLineFeedback(Array.isArray(data) ? data : []);
      } else {
        alert('Não foi possível carregar a análise por linha.');
      }
    } catch (err: any) {
      alert('Erro ao consultar análise por linha: ' + err.message);
    } finally {
      setIsLoadingLineFeedback(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!selectedActivity || !token) return;
    try {
      const res = await apiFetch(`${API_BASE}/submissions?activityId=${selectedActivity.id}`, {
      
      });
      if (res.ok) {
        const list = await res.json();
        setSubmissionHistory(list);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenProgress = async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE}/users/me/progress`, {
      
      });
      if (res.ok) {
        const data = await res.json();
        setUserProgress(data);
        setShowProgressModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportData = async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE}/users/me/export`, {
      
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dados-plataforma-${user?.email || 'aluno'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Falha ao exportar dados da plataforma.');
      }
    } catch (err: any) {
      alert('Erro ao exportar dados: ' + err.message);
    }
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          title: newCourseTitle,
          slug: newCourseSlug || newCourseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: newCourseDesc,
        }),
      });
      if (res.ok) {
        setShowCourseModal(false);
        setNewCourseTitle('');
        setNewCourseSlug('');
        setNewCourseDesc('');
        loadCourses();
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao criar curso');
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      const res = await apiFetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          title: newActTitle,
          slug: newActSlug || newActTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: newActDesc,
          language: newActLang,
          initialCode: newActInitialCode || '// Escreva seu código aqui\n',
          testCode: newActTestCode,
          hiddenTests: newActHiddenTests,
          order: activities.length + 1,
        }),
      });
      if (res.ok) {
        setShowActivityModal(false);
        setNewActTitle('');
        setNewActSlug('');
        setNewActDesc('');
        setNewActInitialCode('');
        setNewActTestCode('');
        setNewActHiddenTests('');
        selectCourse(selectedCourse);
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao criar atividade');
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const getMonacoLanguage = (lang?: string) => {
    if (!lang) return 'javascript';
    if (lang === 'python') return 'python';
    if (lang === 'typescript') return 'typescript';
    if (lang === 'java') return 'java';
    return 'javascript';
  };

  if (!token && !user && !authLoading) {
    return <AuthView onAuth={(currentUser) => {
      setUser(currentUser);
      setToken('cookie-auth');
    }} />;
  }

  if (authLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0E15', color: '#A1A1AA' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(130, 87, 229, 0.2)', borderTopColor: '#8257e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Carregando ambiente NEXUS...</span>
        </div>
      </div>
    );
  }

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  // Central 219 lote 4 (D4) — barra de ações do protótipo: só dados
  // reais (resumo da submissão atual + próxima atividade real).
  const nextAct = selectedActivity ? nextActivity(activities, selectedActivity.id) : null;
  const testSummary = submission ? passedTestSummary(submission.testResults) : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0D0E15', color: '#F4F4F5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ height: 60, borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#12131D' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {BRAND_LOGO_URL ? (
              <img src={BRAND_LOGO_URL} alt={BRAND} style={{ maxHeight: 24 }} />
            ) : (
              <span style={{ fontSize: 20 }}>⚡</span>
            )}
            <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(to right, #00E5FF, #996DFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {BRAND}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', background: isInstructor ? 'rgba(130, 87, 229, 0.2)' : 'rgba(0, 229, 255, 0.2)', border: `1px solid ${isInstructor ? '#8257E5' : '#00E5FF'}`, borderRadius: 12, color: isInstructor ? '#996DFF' : '#00E5FF' }}>
            {user?.role.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="/dashboard"
            style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #8257e5, #00b37e)', border: 'none', borderRadius: 8, color: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', boxShadow: '0 0 15px rgba(130, 87, 229, 0.35)' }}
          >
            <span>🚀</span>
            <span>Dashboard Elite</span>
          </a>

          <button
            onClick={handleDailyChallenge}
            style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#F59E0B', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            🎯 Desafio do Dia
          </button>

          <button
            onClick={handleOpenProgress}
            style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#00E5FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            📊 Meu Progresso
          </button>

          {selectedCourse && (
            <button
              onClick={handleOpenLeaderboard}
              style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              🏆 Ranking
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => setShowTalentModal(true)}
              style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#00E676', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              🏢 Portal de Talentos
            </button>
          )}

          {isInstructor && (
            <>
              <button
                onClick={() => setShowCourseModal(true)}
                style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#00E5FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                + Novo Curso
              </button>
              {selectedCourse && (
                <button
                  onClick={() => setShowActivityModal(true)}
                  style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#8257E5', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  + Nova Atividade
                </button>
              )}
              {selectedCourse && (
                <>
                  <button
                    onClick={handleRevealCode}
                    style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#00E676', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    🔑 Código da Turma
                  </button>
                  {courseCode && (
                    <span
                      title="Código de matrícula da turma"
                      style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1, padding: '5px 10px', background: 'rgba(74, 222, 128, 0.12)', border: '1px dashed #00E676', borderRadius: 6, color: '#00E676' }}
                    >
                      {courseCode}
                    </span>
                  )}
                  <button
                    onClick={() => setShowLibraryModal(true)}
                    style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#996DFF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    📚 Biblioteca
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    style={{ padding: '6px 12px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: 6, color: '#00E5FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    📊 Relatórios
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              padding: '6px 14px',
              background: isChatOpen ? '#00E5FF' : 'rgba(0, 229, 255, 0.15)',
              border: '1px solid #00E5FF',
              borderRadius: 6,
              color: isChatOpen ? '#0D0E15' : '#00E5FF',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🤖</span> Tutora de IA {isChatOpen ? '(Aberta)' : ''}
          </button>

          <span style={{ fontSize: 13, color: '#A1A1AA', borderLeft: '1px solid #3F3F46', paddingLeft: 10 }}>{user?.email}</span>
          <button
            onClick={handleLogout}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #3F3F46', borderRadius: 6, color: '#C0C0D1', cursor: 'pointer', fontSize: 12 }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex relative overflow-y-auto lg:overflow-hidden">
        {/* Sidebar: Courses & Activities */}
        <aside style={{ width: 280, borderRight: '1px solid #27272A', background: '#0D0E15', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #27272A' }}>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#71717A', letterSpacing: 1, margin: '0 0 10px 0', fontWeight: 700 }}>Cursos Disponíveis</h3>
            {courses.length === 0 ? (
              <div style={{ fontSize: 12, color: '#71717A' }}>Nenhum curso cadastrado.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCourse(c)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: selectedCourse?.id === c.id ? '#27272A' : 'transparent',
                      color: selectedCourse?.id === c.id ? '#00E5FF' : '#C0C0D1',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: selectedCourse?.id === c.id ? 600 : 400,
                    }}
                  >
                    📚 {c.title}
                  </button>
                ))}
              </div>
            )}
            {!isInstructor && selectedCourse && (
              <>
                <button
                  onClick={handleProvisionGit}
                  disabled={isProvisioningGit}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    textAlign: 'center',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(0, 229, 255, 0.12)',
                    border: '1px solid #00E5FF',
                    color: '#00E5FF',
                    cursor: isProvisioningGit ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isProvisioningGit ? 'Configurando...' : '🔗 Configurar Git'}
                </button>
                {gitInfo && (
                  <div style={{ marginTop: 8, padding: 12, background: '#181926', border: '1px solid #27272A', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00E5FF' }}>Repositório configurado</div>
                    <div style={{ fontSize: 11, color: '#F4F4F5', fontFamily: 'monospace', wordBreak: 'break-all' }}>{gitInfo.repoFullName}</div>
                    <div style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'monospace', wordBreak: 'break-all' }}>{gitInfo.cloneUrl}</div>
                    <div style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 1.5 }}>
                      Clone com <code style={{ fontFamily: 'monospace', color: '#93c5fd' }}>git clone {gitInfo.cloneUrl}</code> e faça seus commits na branch main ou master. Cada push dispara a correção automática das atividades.
                    </div>
                  </div>
                )}
                <button
                  onClick={handleOpenCertificate}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    textAlign: 'center',
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid #f59e0b',
                    color: '#F59E0B',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  🎓 Emitir Certificado
                </button>
              </>
            )}
          </div>

          <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#71717A', letterSpacing: 1, margin: '0 0 10px 0', fontWeight: 700 }}>Exercícios do Módulo</h3>
            {activities.length === 0 ? (
              <div style={{ fontSize: 12, color: '#71717A' }}>Selecione um curso para ver as atividades.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activities.map((a, idx) => (
                  <button
                    key={a.id}
                    onClick={() => selectActivity(a)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: selectedActivity?.id === a.id ? '#27272A' : 'transparent',
                      color: selectedActivity?.id === a.id ? '#00E5FF' : '#A1A1AA',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{idx + 1}. {a.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: '#0D0E15', borderRadius: 4, color: '#71717A' }}>{a.language}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isInstructor && (
            <div style={{ padding: 16, borderTop: '1px solid #27272A' }}>
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#71717A', letterSpacing: 1, margin: '0 0 10px 0', fontWeight: 700 }}>Entrar com Código</h3>
              <form onSubmit={handleJoinCourse} style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ex.: ALGO2024"
                  maxLength={12}
                  style={{ flex: 1, minWidth: 0, padding: '7px 9px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase' }}
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCode.trim()}
                  style={{ padding: '7px 10px', background: isJoining || !joinCode.trim() ? '#3F3F46' : '#00E5FF', color: isJoining || !joinCode.trim() ? '#A1A1AA' : '#0D0E15', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: isJoining || !joinCode.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isJoining ? '...' : 'Entrar'}
                </button>
              </form>
            </div>
          )}
        </aside>

        {/* Workspace Center */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedActivity ? (
            <div className="flex-1 flex flex-col lg:h-[calc(100vh-60px)] lg:overflow-hidden">
              {/* Contextual Activity Header */}
              <IdeHeader
                activityTitle={selectedActivity.title}
                courseTitle={selectedCourse?.title}
                language={selectedActivity.language}
                onOpenHistory={handleLoadHistory}
                onOpenNewActivity={isInstructor ? () => setShowActivityModal(true) : undefined}
                isInstructor={isInstructor}
              />

              {/* Central 219 lote 4 (D4) — tela de jogo em 3 colunas do
                  protótipo desafio-jogo.html: enunciado + casos de teste
                  | editor + terminal + barra de ações | tutora. No
                  mobile as colunas empilham (1 coluna). */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
                {/* Coluna 1 — enunciado + casos de teste. */}
                <div className="lg:col-span-3 lg:border-r border-[#27272A] flex flex-col lg:overflow-y-auto bg-[#12131D] min-w-0">
                  {/* Instructions & Socratic Prompting */}
                  <InstructionsPanel
                    title={selectedActivity.title}
                    description={selectedActivity.description}
                    difficulty="Intermediário"
                    language={selectedActivity.language}
                    hints={selectedActivity.instructions ? [selectedActivity.instructions] : []}
                    courseTitle={selectedCourse?.title}
                  />

                  {/* AI Tutor Actions & Line Feedback Callouts */}
                  {submission && submission.status === 'failed' && (
                    <div style={{ padding: '12px 16px', background: '#0d1017', borderTop: '1px solid #1e222d', display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleRequestLineFeedback}
                        disabled={isLoadingLineFeedback}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: 'rgba(0, 229, 255, 0.12)',
                          color: '#00E5FF',
                          border: '1px solid #00E5FF',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: isLoadingLineFeedback ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isLoadingLineFeedback ? 'Analisando...' : '🔍 Análise por Linha'}
                      </button>
                      <button
                        onClick={handleAskAi}
                        disabled={isLoadingAi}
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: isLoadingAi ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isLoadingAi ? 'Consultando...' : '🤖 Dica Socrática'}
                      </button>
                    </div>
                  )}

                  {/* Sprint 21 — oferta de remediação por conceito: aparece
                      quando esta atividade é de um conceito em que o aluno
                      já falhou >= 3 vezes (regra da API, não chute da UI). */}
                  {remediationOffer && submission && submission.status === 'failed' && (
                    <div style={{ padding: '12px 16px', background: '#141021', borderTop: '1px solid #2b2144' }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#c4b5fd', lineHeight: 1.5 }}>
                        🎯 Você já tentou <strong>{remediationOffer.failedAttempts} vezes</strong> atividades
                        de <strong>{remediationOffer.moduleTitle}</strong> sem concluir. Reforçar o
                        conceito antes de tentar de novo costuma destravar.
                      </p>
                      {remediationOffer.reinforcement ? (
                        <button
                          onClick={() => {
                            const r = remediationOffer.reinforcement;
                            if (!r) return;
                            track('remediation_offer_accepted', undefined, {
                              conceptTag: remediationOffer.conceptTag,
                              source: r.source,
                            });
                            window.location.href = `/ide?course=${r.courseId}&activity=${r.id}`;
                          }}
                          style={{
                            marginTop: 8,
                            padding: '6px 12px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c4b5fd',
                            border: '1px solid #8b5cf6',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Reforçar com “{remediationOffer.reinforcement.title}”
                          {remediationOffer.reinforcement.source === 'library'
                            ? ' (Biblioteca)'
                            : ' (sua trilha)'}
                        </button>
                      ) : (
                        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#A1A1AA', lineHeight: 1.5 }}>
                          Não há atividade de reforço disponível para este conceito agora —
                          a dica da tutora usa o exemplo análogo desta atividade, que trabalha
                          o mesmo conceito.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reference Solution Block */}
                  {submission && submission.status === 'passed' && (
                    <div style={{ padding: '12px 16px', background: '#0d1017', borderTop: '1px solid #1e222d' }}>
                      <button
                        onClick={handleLoadReference}
                        disabled={isLoadingReference}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(0, 230, 118, 0.12)',
                          border: '1px solid #22c55e',
                          borderRadius: 8,
                          color: '#00E676',
                          cursor: isLoadingReference ? 'not-allowed' : 'pointer',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {isLoadingReference ? 'Carregando...' : showReference ? 'Ocultar Solução' : '💡 Solução de Referência'}
                      </button>
                      {showReference && referenceCode !== null && (
                        <div style={{ marginTop: 8, background: '#181926', border: '1px solid #22c55e', borderRadius: 8, padding: 12 }}>
                          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5, color: '#F4F4F5', background: '#0D0E15', padding: 10, borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {referenceCode}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Hints Block */}
                  {aiHints && (
                    <div style={{ margin: '12px 16px', background: '#1e1b4b', border: '1px solid #996DFF', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#c7d2fe', fontWeight: 700, fontSize: 12 }}>
                        <span>🤖 Tutora de IA — {aiHints.suggestedConcept}</span>
                      </div>
                      {/* Sprint 22 — rótulo honesto: heurística nunca se passa por IA */}
                      {aiHints.source === 'heuristic' && (
                        <div style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'monospace', marginBottom: 6 }}>
                          ⚠ Modo offline — dicas geradas localmente (heurística), sem modelo de IA
                        </div>
                      )}
                      {aiHints.source === 'llm' && aiHints.model && (
                        <div style={{ fontSize: 10, color: '#a5b4fc', fontFamily: 'monospace', marginBottom: 6 }}>
                          Tutora de IA · {aiHints.model}
                        </div>
                      )}
                      <p style={{ fontSize: 12, color: '#e0e7ff', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                        {aiHints.summary}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {aiHints.hints.map((h, i) => (
                          <div key={i} style={{ background: '#312e81', padding: '6px 10px', borderRadius: 4, fontSize: 12, color: '#f5f3ff' }}>
                            💡 <strong>Dica {i + 1}:</strong> {h}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Line Feedback Block */}
                  {lineFeedback !== null && submission?.status === 'failed' && (
                    <div style={{ margin: '12px 16px', background: '#181926', border: '1px solid #3F3F46', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#F4F4F5', marginBottom: 8 }}>
                        🔍 Análise por Linha
                      </div>
                      {lineFeedback.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#71717A' }}>
                          Nenhuma observação detectada nesta submissão.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {lineFeedback.map((item, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                                padding: '6px 10px',
                                borderRadius: 4,
                                background: '#12131D',
                                borderLeft: `3px solid ${item.severity === 'warning' ? '#f59e0b' : '#A1A1AA'}`,
                              }}
                            >
                              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: item.severity === 'warning' ? '#f59e0b' : '#A1A1AA', whiteSpace: 'nowrap' }}>
                                Linha {item.line}
                              </span>
                              <span style={{ fontSize: 12, color: item.severity === 'warning' ? '#f59e0b' : '#A1A1AA', lineHeight: 1.4 }}>
                                {item.comment}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Automated Test Results Grid */}
                  <TestResultsGrid
                    results={(submission?.testResults || []).map((t) => ({
                      id: t.id,
                      name: t.name,
                      passed: t.passed,
                      durationMs: t.durationMs,
                      errorMessage: t.errorMessage,
                      isHidden: t.isHidden,
                    }))}
                    score={submission?.score ?? undefined}
                    maxScore={submission?.maxScore ?? 100}
                    xpEarned={submission?.status === 'passed' ? 120 : undefined}
                  />

                  {/* Fase 2 premium — revisão por IA, AO LADO do passa/falha, nunca no lugar dele */}
                  {submission && (
                    <CodeReviewPanel submissionId={submission.id} />
                  )}
                </div>

                {/* Coluna 2 — editor + terminal + barra de ações. */}
                <div className={`${isChatOpen ? 'lg:col-span-6' : 'lg:col-span-9'} flex flex-col min-h-0 min-w-0 bg-[#0A0B10]`}>
                  <div className="h-[420px] lg:h-auto lg:flex-1 lg:min-h-0">
                    <IdeEditorPane
                      language={selectedActivity.language}
                      code={code}
                      onChange={(val) => setCode(val)}
                      onRun={handleRunCode}
                      isSubmitting={isSubmitting}
                      onFormat={handleFormatCode}
                    />
                  </div>

                  {/* Terminal (Console de Execução) — no protótipo, abaixo do editor. */}
                  <div className="h-[180px] shrink-0">
                    <TerminalConsole
                      logs={isSubmitting ? ['Executando testes no Sandbox isolado...'] : []}
                      stdout={submission ? (submission.status === 'passed' ? 'Todos os testes foram validados com sucesso no Sandbox Piston.' : undefined) : undefined}
                      stderr={submission?.errorMessage || undefined}
                      durationMs={submission?.durationMs ?? undefined}
                      memoryRssKb={submission?.durationMs ? 48 * 1024 : undefined}
                      status={submission?.status}
                    />
                  </div>

                  {/* Barra de ações do protótipo: status real + próxima fase real. */}
                  <div className="shrink-0 border-t border-[#27272A] bg-[#12131D] px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-code text-zinc-400">
                      {isSubmitting
                        ? 'Executando testes no Sandbox isolado…'
                        : submission
                          ? submission.status === 'passed'
                            ? `✓ Atividade concluída${testSummary ? ` — ${testSummary}` : ''}`
                            : submission.status === 'failed'
                              ? `${testSummary ?? 'Alguns testes falharam'} — revise o código e execute novamente.`
                              : submission.status === 'error'
                                ? `Erro na execução: ${submission.errorMessage ?? 'verifique o código.'}`
                                // O2 (Central 219): status não-terminal com o
                                // stream já encerrado NÃO é erro — o texto
                                // antigo mentia ("Erro na execução") quando a
                                // submissão ainda estava rodando no servidor.
                                : 'Acompanhamento interrompido — execute novamente para ver o resultado.'
                          : 'Nenhuma execução ainda — execute os testes para ver o resultado.'}
                    </span>
                    {submission?.status === 'passed' && nextAct && (
                      <button
                        onClick={() => void selectActivity(nextAct)}
                        className="px-4 py-2 bg-[#00E676] hover:bg-emerald-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <span>Próxima atividade</span>
                        <span>→</span>
                      </button>
                    )}
                    {submission?.status === 'passed' && !nextAct && (
                      <a
                        href="/dashboard"
                        className="px-4 py-2 bg-[#00E676] hover:bg-emerald-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <span>Voltar ao mapa</span>
                        <span>→</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Coluna 3 — tutora (protótipo: coluna da direita). */}
                {isChatOpen && (
                  <div className="lg:col-span-3 h-[560px] lg:h-auto border-t lg:border-t-0 lg:border-l border-[#27272A] min-h-0 min-w-0">
                    <AITutorPanel
                      variant="inline"
                      activityId={selectedActivity.id}
                      activityTitle={selectedActivity.title}
                      code={code}
                      token={token}
                      onClose={() => setIsChatOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A' }}>
              Selecione uma atividade para começar a praticar.
            </div>
          )}
        </main>

      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <ProgressModal
          isOpen={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          progress={userProgress}
          token={token}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboardModal && selectedCourse && (
        <LeaderboardModal
          isOpen={showLeaderboardModal}
          onClose={() => setShowLeaderboardModal(false)}
          entries={leaderboard}
          isLoading={isLoadingLeaderboard}
          courseId={selectedCourse.id}
          token={token}
          currentUserId={user?.id}
        />
      )}

      {/* Reports Modal */}
      {showReportModal && selectedCourse && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          courseId={selectedCourse.id}
        />
      )}

      {/* Library Modal */}
      {showLibraryModal && selectedCourse && (
        <LibraryModal
          isOpen={showLibraryModal}
          onClose={() => setShowLibraryModal(false)}
          courseId={selectedCourse.id}
          onCopied={() => {
            if (selectedCourse) {
              selectCourse(selectedCourse);
            }
          }}
        />
      )}

      {/* Talent Portal Modal */}
      {showTalentModal && (
        <TalentModal
          isOpen={showTalentModal}
          onClose={() => setShowTalentModal(false)}
          courseId={selectedCourse?.id ?? ''}
        />
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cadastrar Novo Curso"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCourseModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div style={{ width: '100%', maxWidth: 460, background: '#181926', padding: 24, borderRadius: 12, border: '1px solid #3F3F46' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0' }}>Cadastrar Novo Curso</h2>
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Título do Curso</label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Slug (Opcional)</label>
                <input
                  type="text"
                  value={newCourseSlug}
                  onChange={(e) => setNewCourseSlug(e.target.value)}
                  placeholder="ex.: estruturas-de-dados"
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Descrição</label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #3F3F46', borderRadius: 6, color: '#C0C0D1', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#00E5FF', color: '#0D0E15', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  Salvar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nova Atividade"
          onClick={(e) => { if (e.target === e.currentTarget) setShowActivityModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div style={{ width: '100%', maxWidth: 540, background: '#181926', padding: 24, borderRadius: 12, border: '1px solid #3F3F46', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0' }}>Nova Atividade em {selectedCourse?.title}</h2>
            <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Título da Atividade</label>
                <input
                  type="text"
                  required
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Linguagem</label>
                  <select
                    value={newActLang}
                    onChange={(e) => setNewActLang(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Slug (Opcional)</label>
                  <input
                    type="text"
                    value={newActSlug}
                    onChange={(e) => setNewActSlug(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Enunciado / Descrição</label>
                <textarea
                  required
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Código Inicial</label>
                <textarea
                  value={newActInitialCode}
                  onChange={(e) => setNewActInitialCode(e.target.value)}
                  placeholder="function minhaFuncao() { ... }"
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Código de Testes (Públicos)</label>
                <textarea
                  value={newActTestCode}
                  onChange={(e) => setNewActTestCode(e.target.value)}
                  placeholder="if (minhaFuncao(2) !== 4) throw new Error('Falha no teste');"
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>Testes Ocultos (Opcional)</label>
                <textarea
                  value={newActHiddenTests}
                  onChange={(e) => setNewActHiddenTests(e.target.value)}
                  placeholder="if (minhaFuncao(0) !== 0) throw new Error('Falha caso zero');"
                  rows={2}
                  style={{ width: '100%', padding: '8px 10px', background: '#12131D', border: '1px solid #3F3F46', borderRadius: 6, color: '#fff', fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #3F3F46', borderRadius: 6, color: '#C0C0D1', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#8257E5', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  Criar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions History Drawer */}
      <SubmissionsHistoryDrawer
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        submissions={submissionHistory.map((sub) => ({
          id: sub.id,
          createdAt: sub.createdAt || new Date().toISOString(),
          status: sub.status,
          score: sub.score ?? undefined,
          durationMs: sub.durationMs ?? undefined,
        }))}
        onSelectSubmission={(sub) => {
          const found = submissionHistory.find((h) => h.id === sub.id);
          if (found) setSubmission(found);
          setShowHistoryModal(false);
        }}
      />
    </div>
  );
}
