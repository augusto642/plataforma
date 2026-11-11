// Central 216 (F4) — capas dos cursos avulsos hospedadas localmente.
// As 4 imagens do protótipo (lh3.googleusercontent.com/aida/…) exigem
// login no Google — o download devolve a página de sign-in, não a
// imagem — por isso as capas foram recriadas como SVG locais em
// /public/cursos/ (mesma função visual: capa escura com monograma da
// linguagem e selo "terminal — no browser"). Nenhuma URL externa de
// imagem é usada no catálogo.
export const COURSE_COVER_BY_LANGUAGE: Record<string, string> = {
  javascript: '/cursos/javascript.svg',
  typescript: '/cursos/typescript.svg',
  python: '/cursos/python.svg',
  java: '/cursos/java.svg',
  nodejs: '/cursos/nodejs.svg',
  node: '/cursos/nodejs.svg',
};

/** Capa local de um curso pela linguagem (ou null quando não há capa). */
export function courseCover(language: string | null | undefined): string | null {
  if (!language) return null;
  return COURSE_COVER_BY_LANGUAGE[language.toLowerCase()] ?? null;
}
