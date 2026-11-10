import { StudentDashboardData } from '../types';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

export const DEFAULT_DASHBOARD_DATA: StudentDashboardData = {
  user: {
    name: 'Augusto Silva',
    email: 'augusto@dev.local',
    avatarInitials: 'AS',
    xp: 4850,
    level: 25,
    streakDays: 14,
  },
  // Central 216 (auditoria do Designer, item 4) — o molde da missão
  // Kafka/NestJS e da meta semanal (8,5/10h, 85%) NÃO existe mais:
  // sem progresso real, activeMission é null (estado vazio honesto);
  // a meta semanal não tem endpoint e foi removida do modelo.
  activeMission: null,
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
      title: 'Guardião',
      // Redesign v2 (correção 21): missões sem valores de XP.
      progressText: 'Guardião da trilha',
      status: 'boss',
      icon: '👑',
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
      isCurrentUser: false,
    },
    {
      rank: 2,
      // Retrabalho 2 Central 213 (D5-P) — o molde NUNCA rotula ninguém
      // como usuário atual: "(Você)" só existe quando a entrada do
      // ranking casa com a identidade real de /users/me (ver
      // fetchDashboardData). Antes, este molde marcava "Augusto Silva
      // (Você)" como atual mesmo com outra pessoa logada.
      name: 'Augusto Silva',
      initials: 'AS',
      avatarGradient: 'from-[#8257E5] to-[#0070F3]',
      completedCount: 18,
      xp: 4850,
      isCurrentUser: false,
    },
    {
      rank: 3,
      name: 'Camila Pereira',
      initials: 'CP',
      avatarGradient: 'from-[#00B37E] to-[#0070F3]',
      completedCount: 16,
      xp: 4310,
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

function normalizeIdentityName(name: unknown): string {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

export async function fetchDashboardData(): Promise<StudentDashboardData | null> {
  const merged: StudentDashboardData = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_DATA));

  // Retrabalho 2 Central 213 (D5-P) — falha PARCIAL também é falha
  // total do painel. O retrabalho 1 só devolvia null quando NENHUM
  // endpoint respondia (ou sem identidade): com /users/me, /progress
  // e /courses em 200 e /leaderboard + /submissions em 500, o
  // `merged` voltava com leaderboard, missão, heatmap, meta semanal e
  // dica do MOLDE — dados fictícios na tela — e o molde ainda rotulava
  // "Augusto Silva (Você)" como atual com outra pessoa logada.
  //
  // DECISÃO (com evidência): tudo-ou-nada fail-closed. As seções sem
  // endpoint próprio (dica socrática, radar, roadmap) só existem no
  // molde — não há como marcá-las "indisponível por seção" sem
  // inventar fonte — e o aceite exige que, com /leaderboard e
  // /submissions em 500, NENHUM dado fictício apareça (nem missão,
  // nem meta, nem dica). A meta semanal foi removida do modelo
  // (Central 216) e a missão sem progresso é null. Logo: qualquer
  // endpoint central falhando
  // (não-ok ou rede) → null, e a página mostra o erro honesto
  // (page.tsx já trata null). Endpoints centrais: /users/me,
  // /users/me/progress, /courses, /courses/:id/leaderboard (quando há
  // curso primário) e /submissions. O caminho feliz (tudo 200) segue
  // inalterado.
  try {
    // 0. Fetch User Profile — âncora de identidade: sem ela, nenhuma
    // parte do painel é atribuível ao usuário real.
    const resMe = await apiFetch(`${API_BASE}/users/me`).catch(() => null);
    if (!resMe || !resMe.ok) return null;
    const me = await resMe.json();
    // Identidade real, usada SÓ para decidir quem é "(Você)" no
    // ranking: userId de /users/me casa com userId da entrada do
    // ranking (contrato da API); nome/e-mail são fallback.
    const realUserId = typeof me.id === 'string' && me.id ? me.id : null;
    const realUserName = normalizeIdentityName(me.name);
    const realUserEmail =
      typeof me.email === 'string' && me.email ? me.email.trim().toLowerCase() : null;
    const isRealCurrentUser = (entry: unknown): boolean => {
      if (!entry || typeof entry !== 'object') return false;
      const e = entry as Record<string, unknown>;
      if (realUserId && typeof e.userId === 'string' && e.userId === realUserId) return true;
      if (realUserId && typeof e.id === 'string' && e.id === realUserId) return true;
      if (
        realUserEmail &&
        typeof e.email === 'string' &&
        e.email.trim().toLowerCase() === realUserEmail
      )
        return true;
      const entryName = normalizeIdentityName(e.name);
      return entryName !== '' && realUserName !== '' && entryName === realUserName;
    };
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

    // 1. Fetch User Progress — central (missão): sem ele, título e
    // progresso da missão seriam do molde.
    const resProgress = await apiFetch(`${API_BASE}/users/me/progress`).catch(() => null);
    if (!resProgress || !resProgress.ok) return null;
    const data = await resProgress.json();
    if (data.xp) merged.user.xp = data.xp;
    if (data.level) merged.user.level = data.level;
    if (data.streakDays) {
      merged.user.streakDays = data.streakDays;
      merged.heatmap.currentStreak = data.streakDays;
    }
    // Central 216 (auditoria do Designer, item 4) — a missão é
    // construída SÓ com campos reais do progresso: título, % e
    // contagens vêm de coursesProgress[0]; dificuldade, módulo,
    // descrição e clone URL não têm fonte e ficam ausentes (o Hero
    // omite). Sem curso iniciado → null (estado vazio honesto), nunca
    // a missão Kafka do molde. `??` em vez de `||`: 0% é progresso
    // real, não motivo para cair no molde.
    if (data.coursesProgress && data.coursesProgress.length > 0) {
      const primary = data.coursesProgress[0];
      merged.activeMission = {
        trackTitle: primary.courseTitle ? `TRILHA ATIVA: ${primary.courseTitle}` : 'TRILHA ATIVA',
        title: primary.courseTitle || 'Seu curso',
        progressPercent: primary.progressPercent ?? 0,
        completedLabs: primary.completedActivities ?? 0,
        totalLabs: primary.totalActivities ?? 0,
      };
    } else {
      merged.activeMission = null;
    }

    // 2. Fetch Courses — central (missão + ranking dependem dele).
    const resCourses = await apiFetch(`${API_BASE}/courses`).catch(() => null);
    if (!resCourses || !resCourses.ok) return null;
    const courses = await resCourses.json();
    let primaryCourseId: string | null = null;
    if (Array.isArray(courses) && courses.length > 0) {
      const firstCourse = courses[0];
      if (typeof firstCourse.id === 'string' && firstCourse.id) {
        primaryCourseId = firstCourse.id;
      }
      if (merged.activeMission) {
        merged.activeMission.courseId = firstCourse.id;
        if (firstCourse.activities && firstCourse.activities.length > 0) {
          const firstAct = firstCourse.activities[0];
          merged.activeMission.activityId = firstAct.id;
          if (firstAct.giteaCloneUrl) {
            merged.activeMission.gitCloneUrl = `git clone ${firstAct.giteaCloneUrl}`;
          }
        }
      }
    }

    // 3. Fetch Leaderboard do curso primário — central quando há curso.
    // Em caso de sucesso, sobrescreve SEMPRE (mesmo vazio → []):
    // ranking vazio é honesto, o molde com 3 pessoas inventadas não
    // é. Sem curso primário não há ranking: [] em vez do molde.
    // "(Você)" só na entrada cuja identidade casa com /users/me —
    // nunca por posição (antes: `idx === 1` marcava a 2ª linha seja
    // quem fosse).
    if (primaryCourseId) {
      const resLeaderboard = await apiFetch(
        `${API_BASE}/courses/${primaryCourseId}/leaderboard`,
      ).catch(() => null);
      if (!resLeaderboard || !resLeaderboard.ok) return null;
      const lb = await resLeaderboard.json();
      if (!Array.isArray(lb)) return null;
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
          isCurrentUser: isRealCurrentUser(entry),
        };
      });
    } else {
      merged.leaderboard = [];
    }

    // 4. Fetch Submissions count / stats — central
    // (heatmap.totalSubmissions). Sucesso sobrescreve sempre, mesmo 0.
    const resSubmissions = await apiFetch(`${API_BASE}/submissions`).catch(() => null);
    if (!resSubmissions || !resSubmissions.ok) return null;
    const subs = await resSubmissions.json();
    if (!Array.isArray(subs)) return null;
    merged.heatmap.totalSubmissions = subs.length;
  } catch {
    // Backend inalcançável ou erro inesperado: nada de preservar o
    // molde como se fosse dado real.
    return null;
  }

  return merged;
}
