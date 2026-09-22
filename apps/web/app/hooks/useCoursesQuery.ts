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
