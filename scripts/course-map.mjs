/**
 * Resolução ancestral -> curso (DESIGN §1.6, C2).
 * Pasta sem ancestral conhecido NUNCA ganha nome inventado: vai para
 * 'python-outros' com needsCourseMapping=true (curadoria por PR).
 */
export function normalizeFolderName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^\d+\s*[-.)]\s*/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCourse(ancestorNames, ancestorIds, courseMap) {
  const mappings = courseMap.mappings || [];
  for (const id of ancestorIds || []) {
    const hit = mappings.find((m) => (m.driveFolderIds || []).includes(id));
    if (hit) return { courseSlug: hit.courseSlug, courseName: hit.courseName, needsCourseMapping: false };
  }
  for (const name of ancestorNames || []) {
    const norm = normalizeFolderName(name);
    const hit = mappings.find((m) => (m.driveFolderNames || []).some((n) => normalizeFolderName(n) === norm || norm.includes(normalizeFolderName(n))));
    if (hit) return { courseSlug: hit.courseSlug, courseName: hit.courseName, needsCourseMapping: false };
  }
  return { courseSlug: 'python-outros', courseName: 'Python (outros)', needsCourseMapping: true };
}
