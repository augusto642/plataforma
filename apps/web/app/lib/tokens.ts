// Espelho dos tokens do tailwind.config.js para contextos em que classes
// não alcançam (canvas, arrays de cores em JS, engines de jogo).
// Se um valor mudar no tailwind.config, mude aqui também — os dois arquivos
// são a fonte de verdade dos hex da marca (D1/D6 do guia visual): nenhum
// outro arquivo da landing deve conter hex solto.
export const TOKEN_COLORS = {
  background: '#0B0B10',
  surface1: '#13131B',
  surface2: '#1A1A24',
  surface3: '#22222F',
  surface4: '#2B2B3B',
  border1: '#22222F',
  border2: '#2B2B3B',
  inkHeading: '#E0E0EE',
  inkBody: '#C0C0D1',
  inkSpan: '#8B8B9A',
  brandPurple: '#8257E5',
  brandPurpleLight: '#996DFF',
  brandGreenNeon: '#04D361',
  brandGreen: '#00B37E',
  brandCyanNeon: '#00E5FF',
  brandCyan: '#0070F3',
  brandAmber: '#FFA116',
  brandRose: '#F43F5E',
  focus: '#03B2CB',
} as const;
