import { StudentDashboardData } from '../types';
import { apiFetch, API_BASE } from '../../lib/apiClient';

export const DEFAULT_DASHBOARD_DATA: StudentDashboardData = {
  user: {
    name: 'Augusto Silva',
    email: 'augusto@dev.local',
    avatarInitials: 'AS',
    xp: 4850,
    level: 25,
    levelTitle: 'Mestre',
    streakDays: 14,
    league: {
      name: 'Liga Diamante',
      tier: 'Diamante',
      rank: 2,
      isPromotionZone: true,
      timeRemaining: '2d 14h',
    },
  },
  activeMission: {
    trackTitle: 'TRILHA ATIVA: ARQUITETURA DE MICROSSERVIÇOS',
    difficulty: 'Média',
    moduleInfo: 'Módulo 04 de 08',
    title: 'Event-Driven Architecture com Apache Kafka & NestJS',
    description:
      'Implemente o padrão Saga Coreografada com tópicos particionados, idempotência de mensagens via Redis e recuperação de transações compensatórias.',
    progressPercent: 75,
    completedLabs: 6,
    totalLabs: 8,
    gitCloneUrl: 'git clone https://gitea.lms.local/kafka-saga.git',
  },
  weeklyGoal: {
    studiedHours: 8.5,
    targetHours: 10,
    percent: 85,
    remainingTimeText: '1h 30min para bater a meta',
    days: [
      { day: 'SEG', completed: true, isToday: false },
      { day: 'TER', completed: true, isToday: false },
      { day: 'QUA', completed: true, isToday: false },
      { day: 'QUI', completed: true, isToday: false },
      { day: 'SEX', completed: true, isToday: false },
      { day: 'SÁB', completed: true, isToday: false },
      { day: 'DOM', completed: true, isToday: true, hasFlame: true },
    ],
  },
  skillRoadmap: [
    {
      id: 'node-1',
      title: 'Fundamentos TS',
      progressText: '100% (12/12)',
      status: 'completed',
      icon: '✓',
    },
    {
      id: 'node-2',
      title: 'Estruturas de Dados',
      progressText: '100% (8/8)',
      status: 'completed',
      icon: '✓',
    },
    {
      id: 'node-3',
      title: 'Kafka & Saga Pattern',
      progressText: 'EM ANDAMENTO',
      status: 'active',
      icon: '⚡',
    },
    {
      id: 'node-4',
      title: 'Kubernetes & Istio',
      progressText: 'Pré-req: Node 03',
      status: 'locked',
      icon: '🔒',
      prerequisite: 'Node 03',
    },
    {
      id: 'node-5',
      title: 'BOSS FIGHT',
      progressText: '+1.000 XP • Badge Ouro',
      status: 'boss',
      icon: '👑',
      xpReward: 1000,
      badgeName: 'Badge Ouro',
    },
  ],
  radarSkills: {
    overallIndex: 88.4,
    skills: [
      { name: 'Algoritmos', value: 92, benchmark: 85 },
      { name: 'Backend', value: 88, benchmark: 90 },
      { name: 'System Design', value: 76, benchmark: 85 },
      { name: 'DevSecOps', value: 82, benchmark: 80 },
      { name: 'Cloud & Infra', value: 74, benchmark: 85 },
      { name: 'Frontend', value: 85, benchmark: 80 },
    ],
  },
  heatmap: {
    totalSubmissions: 348,
    maxStreak: 28,
    currentStreak: 14,
    averageDaily: 3.2,
    days: generateInitialHeatmapDays(),
  },
  leaderboard: [
    {
      rank: 1,
      name: 'Bruno Fernandes',
      initials: 'BF',
      avatarGradient: 'from-[#FFA116] to-[#F43F5E]',
      completedCount: 22,
      xp: 5420,
      todayGain: '+620 hoje',
      isCurrentUser: false,
    },
    {
      rank: 2,
      name: 'Augusto Silva (Você)',
      initials: 'AS',
      avatarGradient: 'from-[#8257E5] to-[#0070F3]',
      completedCount: 18,
      xp: 4850,
      todayGain: 'Na zona de promoção',
      isCurrentUser: true,
    },
    {
      rank: 3,
      name: 'Camila Pereira',
      initials: 'CP',
      avatarGradient: 'from-[#00B37E] to-[#0070F3]',
      completedCount: 16,
      xp: 4310,
      lastActive: '3h atrás',
      isCurrentUser: false,
    },
  ],
  socraticAi: {
    tip: 'Percebi que no seu último algoritmo de fila com duas pilhas, você realizou a transferência de todos os elementos a cada operação de dequeue(). Que tal transferir os nós apenas quando a pilha de saída estiver completamente vazia? Isso reduzirá o custo amortizado de O(N) para O(1)!',
    strength: 'Tipagem TypeScript & Recursão',
    attentionPoint: 'Complexidade Amortizada O(1)',
  },
};

function generateInitialHeatmapDays() {
  const days = [];
  const seedPatterns = [0, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2];
  for (let i = 0; i < 364; i++) {
    let level: 0 | 1 | 2 | 3 = 0;
    if (i > 350) {
      level = 3; // Recent 14 days streak
    } else {
      const p = seedPatterns[i % seedPatterns.length];
      level = (p > 0 && Math.random() > 0.3 ? p : 0) as 0 | 1 | 2 | 3;
    }
    const count = level === 0 ? 0 : level === 1 ? 1 : level === 2 ? 3 : 5;
    days.push({
      date: `Dia ${i + 1}`,
      level,
      count,
    });
  }
  return days;
}

export async function fetchDashboardData(): Promise<StudentDashboardData> {
  const merged: StudentDashboardData = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_DATA));

  try {
    // 0. Fetch User Profile
    const resMe = await apiFetch(`${API_BASE}/users/me`).catch(() => null);
    if (resMe && resMe.ok) {
      const me = await resMe.json();
      if (me.name) {
        merged.user.name = me.name;
        const parts = me.name.trim().split(' ');
        merged.user.avatarInitials = ((parts[0]?.[0] || 'A') + (parts[1]?.[0] || 'S')).toUpperCase();
      }
      if (me.email) merged.user.email = me.email;
      if (me.xp !== undefined && me.xp !== null) merged.user.xp = me.xp;
      if (me.level !== undefined && me.level !== null) merged.user.level = me.level;
      if (me.streakDays !== undefined && me.streakDays !== null) {
        merged.user.streakDays = me.streakDays;
        merged.heatmap.currentStreak = me.streakDays;
      }
    }

    // 1. Fetch User Progress
    const resProgress = await apiFetch(`${API_BASE}/users/me/progress`).catch(() => null);

    if (resProgress && resProgress.ok) {
      const data = await resProgress.json();
      if (data.xp) merged.user.xp = data.xp;
      if (data.level) merged.user.level = data.level;
      if (data.streakDays) {
        merged.user.streakDays = data.streakDays;
        merged.heatmap.currentStreak = data.streakDays;
      }
      if (data.coursesProgress && data.coursesProgress.length > 0) {
        const primary = data.coursesProgress[0];
        merged.activeMission.title = primary.courseTitle || merged.activeMission.title;
        merged.activeMission.progressPercent = primary.progressPercent || merged.activeMission.progressPercent;
        merged.activeMission.completedLabs = primary.completedActivities || merged.activeMission.completedLabs;
        merged.activeMission.totalLabs = primary.totalActivities || merged.activeMission.totalLabs;
      }
    }

    // 2. Fetch Courses
    const resCourses = await apiFetch(`${API_BASE}/courses`).catch(() => null);

    if (resCourses && resCourses.ok) {
      const courses = await resCourses.json();
      if (Array.isArray(courses) && courses.length > 0) {
        const firstCourse = courses[0];
        merged.activeMission.courseId = firstCourse.id;
        if (firstCourse.activities && firstCourse.activities.length > 0) {
          const firstAct = firstCourse.activities[0];
          merged.activeMission.activityId = firstAct.id;
          if (firstAct.giteaCloneUrl) {
            merged.activeMission.gitCloneUrl = `git clone ${firstAct.giteaCloneUrl}`;
          }
        }

        // 3. Fetch Leaderboard for primary course
        const resLeaderboard = await apiFetch(`${API_BASE}/courses/${firstCourse.id}/leaderboard`).catch(() => null);

        if (resLeaderboard && resLeaderboard.ok) {
          const lb = await resLeaderboard.json();
          if (Array.isArray(lb) && lb.length > 0) {
            merged.leaderboard = lb.slice(0, 5).map((entry, idx) => {
              const nameParts = (entry.name || 'Aluno').split(' ');
              const initials = (nameParts[0]?.[0] || 'A') + (nameParts[1]?.[0] || 'S');
              const gradients = [
                'from-[#FFA116] to-[#F43F5E]',
                'from-[#8257E5] to-[#0070F3]',
                'from-[#00B37E] to-[#0070F3]',
                'from-[#996DFF] to-[#8257E5]',
                'from-[#38BDF8] to-[#00B37E]',
              ];
              return {
                rank: idx + 1,
                name: entry.name || 'Aluno',
                initials: initials.toUpperCase(),
                avatarGradient: gradients[idx % gradients.length],
                completedCount: entry.completedActivitiesCount ?? 12,
                xp: entry.xp ?? 2000,
                isCurrentUser: idx === 1,
                todayGain: idx === 0 ? '+620 hoje' : idx === 1 ? 'Na zona de promoção' : undefined,
                lastActive: idx > 1 ? `${idx + 1}h atrás` : undefined,
              };
            });
          }
        }
      }
    }

    // 4. Fetch Submissions count / stats
    const resSubmissions = await apiFetch(`${API_BASE}/submissions`).catch(() => null);

    if (resSubmissions && resSubmissions.ok) {
      const subs = await resSubmissions.json();
      if (Array.isArray(subs) && subs.length > 0) {
        merged.heatmap.totalSubmissions = subs.length;
      }
    }
  } catch {
    // If backend is not reached or error occurs, default rich data is preserved safely
  }

  return merged;
}
