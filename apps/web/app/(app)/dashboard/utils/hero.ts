// Central 219 (D2) — eyebrow do hero do dashboard, no formato do
// protótipo Stitch v2 (dashboard-aluno.html: "FASE ATUAL: MUNDO 02 •
// CAPÍTULO 03"). O protótipo tem mundo/capítulo, mas a API não
// devolve mundo nem capítulo: a fase é a única unidade real
// disponível (índice da fase ativa na "Trilha Ativa"), então o
// eyebrow usa a fase — nunca um mundo/capítulo inventado.
// - sem missão: 'Comece aqui' (estado vazio; ver Q-5 na r3 — o
//   eyebrow não pode repetir o rótulo do DynamicTrackCard);
// - com missão mas sem fase ativa determinável: o título da trilha
//   (fallback honesto, sem número inventado);
// - com fase ativa: `FASE ATUAL: FASE 0N`.
export function deriveHeroEyebrow(args: {
  trackTitle: string | null;
  activePhaseNumber: number | null;
}): string {
  if (!args.trackTitle) return 'Comece aqui';
  if (args.activePhaseNumber === null) return args.trackTitle;
  return `FASE ATUAL: FASE 0${args.activePhaseNumber}`;
}
