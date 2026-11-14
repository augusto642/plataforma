import { StudentDashboardData } from '../types';
import { apiFetch, API_BASE } from '../../../lib/apiClient';

// Central 216 retrabalho (D7) — DEFAULT_DASHBOARD_DATA FOI REMOVIDO.
// O molde ("Augusto Silva", missão Kafka/NestJS, radar overallIndex
// 88.4, heatmap com 348 submissões e streak de 14 dias gerado com
// Math.random(), dica socrática sobre "fila com duas pilhas", ranking
// com fallbacks `completedCount ?? 12` / `xp ?? 2000`) era a BASE do
// painel: qualquer endpoint falhando ou ausente deixava dado fictício
// no caminho feliz. Agora o dado é construído DO ZERO, só com o que
// os endpoints respondem:
// - user: identidade de /users/me + xp/nível/streak de /users/me e
//   /users/me/progress (0 quando ausente = contagem real zerada);
// - activeMission: só de coursesProgress[0] (null sem curso iniciado);
// - skillRoadmap: [] — sem endpoint; a seção some (nunca o molde);
// - radarSkills: null — sem endpoint; a seção some;
// - heatmap: só totalSubmissions real (len de /submissions) +
//   streak real; days: [] (sem série histórica, sem seção);
// - leaderboard: só entradas reais; completedCount/xp ausentes viram
//   0, nunca 12/2000; "(Você)" só por identidade de /users/me;
// - socraticAi: null — sem endpoint; a seção some.
// Falha de qualquer endpoint central → null (erro honesto na página).

function normalizeIdentityName(name: unknown): string {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

export async function fetchDashboardData(): Promise<StudentDashboardData | null> {
  try {
    // 0. Identidade — âncora: sem ela, nada é atribuível ao usuário.
    const resMe = await apiFetch(`${API_BASE}/users/me`).catch(() => null);
    if (!resMe || !resMe.ok) return null;
    const me = await resMe.json();
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
    const nameParts =
      typeof me.name === 'string' && me.name.trim()
        ? me.name.trim().split(' ')
        : ['A', 'S'];
    const user = {
      name: typeof me.name === 'string' ? me.name : '',
      email: typeof me.email === 'string' ? me.email : '',
      avatarInitials: ((nameParts[0]?.[0] || 'A') + (nameParts[1]?.[0] || 'S')).toUpperCase(),
      xp: typeof me.xp === 'number' ? me.xp : 0,
      level: typeof me.level === 'number' ? me.level : 1,
      streakDays: typeof me.streakDays === 'number' ? me.streakDays : 0,
    };

    // 1. Progresso — central (missão): sem ele, título e progresso
    // seriam inventados. `??` em vez de `||`: 0% é progresso real.
    const resProgress = await apiFetch(`${API_BASE}/users/me/progress`).catch(() => null);
    if (!resProgress || !resProgress.ok) return null;
    const data = await resProgress.json();
    if (typeof data.xp === 'number') user.xp = data.xp;
    if (typeof data.level === 'number') user.level = data.level;
    if (typeof data.streakDays === 'number') user.streakDays = data.streakDays;
    let activeMission: StudentDashboardData['activeMission'] = null;
    if (data.coursesProgress && data.coursesProgress.length > 0) {
      const primary = data.coursesProgress[0];
      activeMission = {
        courseId: typeof primary.courseId === 'string' ? primary.courseId : undefined,
        trackTitle: primary.courseTitle ? `TRILHA ATIVA: ${primary.courseTitle}` : 'TRILHA ATIVA',
        title: primary.courseTitle || 'Seu curso',
        progressPercent: primary.progressPercent ?? 0,
        completedLabs: primary.completedActivities ?? 0,
        totalLabs: primary.totalActivities ?? 0,
      };
    }

    // 2. Cursos — central (missão + ranking dependem dele).
    const resCourses = await apiFetch(`${API_BASE}/courses`).catch(() => null);
    if (!resCourses || !resCourses.ok) return null;
    const courses = await resCourses.json();
    let primaryCourseId: string | null = null;
    if (Array.isArray(courses) && courses.length > 0) {
      const firstCourse = courses[0];
      const matchedCourse =
        (activeMission?.courseId
          ? courses.find((c: { id?: string }) => c.id === activeMission?.courseId)
          : null) ?? firstCourse;
      if (typeof matchedCourse.id === 'string' && matchedCourse.id) {
        primaryCourseId = matchedCourse.id;
      }
      if (activeMission) {
        activeMission.courseId = matchedCourse.id;
        if (matchedCourse.activities && matchedCourse.activities.length > 0) {
          const firstAct = matchedCourse.activities[0];
          activeMission.activityId = firstAct.id;
          if (firstAct.giteaCloneUrl) {
            activeMission.gitCloneUrl = `git clone ${firstAct.giteaCloneUrl}`;
          }
        }
      }
    }

    // 3. Ranking do curso primário — central quando há curso.
    // Sucesso sobrescreve sempre (mesmo vazio → []): ranking vazio é
    // honesto. Sem curso primário: []. Sem fallback inventado.
    let leaderboard: StudentDashboardData['leaderboard'] = [];
    if (primaryCourseId) {
      const resLeaderboard = await apiFetch(
        `${API_BASE}/courses/${primaryCourseId}/leaderboard`,
      ).catch(() => null);
      if (resLeaderboard && resLeaderboard.status === 403) {
        // Aluno recém-cadastrado ou ainda não matriculado no curso: ranking vazio honesto.
        leaderboard = [];
      } else {
        if (!resLeaderboard || !resLeaderboard.ok) return null;
        const lb = await resLeaderboard.json();
        if (!Array.isArray(lb)) return null;
        const gradients = [
          'from-[#FFA116] to-[#F43F5E]',
          'from-[#8257E5] to-[#996DFF]',
          'from-[#00B37E] to-[#00E5FF]',
          'from-[#996DFF] to-[#8257E5]',
          'from-[#00E676] to-[#00B37E]',
        ];
        leaderboard = lb.slice(0, 5).map((entry, idx) => {
          const nameParts = (entry.name || 'Aluno').split(' ');
          const initials = (nameParts[0]?.[0] || 'A') + (nameParts[1]?.[0] || 'S');
          return {
            rank: idx + 1,
            name: entry.name || 'Aluno',
            initials: initials.toUpperCase(),
            avatarGradient: gradients[idx % gradients.length],
            // D7: sem contagem real, 0 — nunca `?? 12` / `?? 2000`.
            completedCount:
              typeof entry.completedActivitiesCount === 'number'
                ? entry.completedActivitiesCount
                : 0,
            xp: typeof entry.xp === 'number' ? entry.xp : 0,
            isCurrentUser: isRealCurrentUser(entry),
          };
        });
      }
    }

    // 4. Submissões — central (heatmap.totalSubmissions). Sucesso
    // sobrescreve sempre, mesmo 0. Sem série histórica: days: [].
    const resSubmissions = await apiFetch(`${API_BASE}/submissions`).catch(() => null);
    if (!resSubmissions || !resSubmissions.ok) return null;
    const subs = await resSubmissions.json();
    if (!Array.isArray(subs)) return null;

    return {
      user,
      activeMission,
      // Sem endpoint: seções omitidas pela página (nunca o molde).
      skillRoadmap: [],
      radarSkills: null,
      heatmap: {
        totalSubmissions: subs.length,
        maxStreak: user.streakDays,
        currentStreak: user.streakDays,
        averageDaily: subs.length > 0 ? Math.round((subs.length / 365) * 10) / 10 : 0,
        days: [],
      },
      leaderboard,
      socraticAi: null,
    };
  } catch {
    // Backend inalcançável ou erro inesperado: nada de molde.
    return null;
  }
}
