import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { courseCover, COURSE_COVER_BY_LANGUAGE } from '../course-covers';

// Central 216 (F4) — as capas do catálogo são arquivos locais em
// /public/cursos/: nenhuma URL externa (lh3) pode aparecer no mapa,
// e cada entrada do mapa tem um arquivo real no disco.
describe('course-covers — capas locais do catálogo', () => {
  it('mapeia as linguagens do catálogo para arquivos locais', () => {
    expect(courseCover('javascript')).toBe('/cursos/javascript.svg');
    expect(courseCover('typescript')).toBe('/cursos/typescript.svg');
    expect(courseCover('python')).toBe('/cursos/python.svg');
    expect(courseCover('nodejs')).toBe('/cursos/nodejs.svg');
    expect(courseCover('JavaScript')).toBe('/cursos/javascript.svg');
    expect(courseCover('rust')).toBeNull();
    expect(courseCover(null)).toBeNull();
    expect(courseCover(undefined)).toBeNull();
  });

  it('nenhuma capa aponta para URL externa', () => {
    for (const url of Object.values(COURSE_COVER_BY_LANGUAGE)) {
      expect(url.startsWith('/cursos/')).toBe(true);
      expect(url).not.toContain('http');
      expect(url).not.toContain('lh3');
    }
  });

  it('cada capa mapeada existe no disco e é um SVG válido', () => {
    const publicDir = join(__dirname, '..', '..', '..', 'public', 'cursos');
    for (const url of Object.values(COURSE_COVER_BY_LANGUAGE)) {
      const file = join(publicDir, url.replace('/cursos/', ''));
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file, 'utf8')).toContain('<svg');
    }
  });
});
