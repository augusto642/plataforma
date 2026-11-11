/* B49/P2 (Sprint 16) — lista de espera das trilhas do roadmap.
   Catálogo fechado espelhado no DTO da API
   (apps/api/src/waitlist/dto/join-waitlist.dto.ts): são as trilhas
   da ementa que ainda NÃO são cursos. Os 2 cursos reais do catálogo
   (JavaScript e Python introdutório) têm entrada direta para
   /courses e não passam por aqui. */
export type WaitlistTrackKey = 'rust' | 'go' | 'web' | 'python-ia';

export const WAITLIST_TRACKS: WaitlistTrackKey[] = ['rust', 'go', 'web', 'python-ia'];

/**
 * Rótulo do contador público da lista. O número é SEMPRE a contagem
 * real vinda da API (GET /waitlist/counts) — zero é exibido como
 * zero, sem piso, arredondamento ou inflação.
 */
export function waitlistCountLabel(count: number): string {
  if (count <= 0) return '0 pessoas nesta lista — seja a primeira';
  if (count === 1) return '1 pessoa nesta lista';
  return `${count} pessoas nesta lista`;
}
