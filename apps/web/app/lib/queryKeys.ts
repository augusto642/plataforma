export const queryKeys = {
  courses: {
    all: ['courses'] as const,
    detail: (id: string) => ['courses', id] as const,
    activities: (courseId: string) => ['courses', courseId, 'activities'] as const,
  },
  profile: {
    me: ['profile', 'me'] as const,
    byUsername: (username: string) => ['profile', username] as const,
    progress: ['profile', 'progress'] as const,
  },
  submissions: {
    byActivity: (activityId: string) => ['submissions', 'activity', activityId] as const,
    detail: (id: string) => ['submissions', id] as const,
  },
  leaderboard: (courseId: string) => ['leaderboard', courseId] as const,
};
