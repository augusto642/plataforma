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
  // 1) Âncora por id (mais forte, sem ambiguidade de nome).
  for (const id of ancestorIds || []) {
    const hit = mappings.find((m) => (m.driveFolderIds || []).includes(id));
    if (hit) return { courseSlug: hit.courseSlug, courseName: hit.courseName, needsCourseMapping: false };
  }
  // 2) Nome EXATO normalizado (prioridade sobre substring — evita que
  // "Python Impressionador Avançado" case com "Python Impressionador").
  for (const name of ancestorNames || []) {
    const norm = normalizeFolderName(name);
    const hit = mappings.find((m) => (m.driveFolderNames || []).some((n) => normalizeFolderName(n) === norm));
    if (hit) return { courseSlug: hit.courseSlug, courseName: hit.courseName, needsCourseMapping: false };
  }
  // 3) Substring (legado, risco documentado): nome composto que CONTÉM o
  // nome de um curso casa com ele — ex.: "Trilha Python — Turma 2024" casa
  // com "Trilha Python" (desejado), mas "Python Impressionador Avançado"
  // também casaria se o passo 2 não tivesse casado antes (falso positivo
  // possível quando o curso composto não é o curso-base). O passo 2 acima
  // elimina o falso positivo quando o nome exato do curso composto existe
  // no mapa; sem ele, o casamento por substring é o melhor esforço e o
  // registro segue auditável pelo courseSlug.
  for (const name of ancestorNames || []) {
    const norm = normalizeFolderName(name);
    const hit = mappings.find((m) => (m.driveFolderNames || []).some((n) => norm.includes(normalizeFolderName(n))));
    if (hit) return { courseSlug: hit.courseSlug, courseName: hit.courseName, needsCourseMapping: false };
  }
  return { courseSlug: 'python-outros', courseName: 'Python (outros)', needsCourseMapping: true };
}
