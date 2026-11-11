import { useQuery } from '@tanstack/react-query';
import { apiFetch, API_BASE } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';

export function useCoursesQuery() {
  return useQuery({
    queryKey: queryKeys.courses.all,
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/courses`);
      if (!res.ok) throw new Error('Falha ao carregar cursos da plataforma.');
      return res.json();
    },
  });
}

// Central 216 (F2/A5) — o catálogo de "cursos avulsos" consome o
// catálogo PÚBLICO da API (GET /courses/public-catalog): a vitrine da
// landing já o usava; a página /courses passa a usá-lo também —
// visitante vê o catálogo sem login, e a busca/chips filtram o dado
// real da API. O detalhe continua por /courses/[slug] (que resolve
// slug → id em GET /courses, com sessão).
export function usePublicCatalogQuery() {
  return useQuery({
    queryKey: [...queryKeys.courses.all, 'public-catalog'],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/courses/public-catalog`);
      if (!res.ok) throw new Error('Falha ao carregar o catálogo de cursos.');
      return res.json();
    },
  });
}

export function useCourseActivitiesQuery(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.courses.activities(courseId || ''),
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/activities?courseId=${courseId}`);
      if (!res.ok) throw new Error('Falha ao carregar atividades do curso.');
      return res.json();
    },
    enabled: Boolean(courseId),
  });
}

// B41 (Sprint 14) — detalhe real do curso (ementa da listagem) e
// progresso real do usuário logado (selos, banner e cabeçalho da
// página de cursos). Antes a listagem não consultava nenhum dos dois
// e exibia um catálogo estático com progresso fabricado.
export function useCourseDetailQuery(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId || ''),
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/courses/${courseId}`);
      if (!res.ok) throw new Error('Falha ao carregar o curso.');
      return res.json();
    },
    enabled: Boolean(courseId),
  });
}

export function useMyProgressQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.profile.progress,
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE}/users/me/progress`);
      if (!res.ok) throw new Error('Falha ao carregar o progresso.');
      return res.json();
    },
    enabled,
  });
}
