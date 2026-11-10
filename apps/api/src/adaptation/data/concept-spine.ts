// Espinha de conceitos v1 (Sprint 20A) — ESPELHO versionado para a API.
//
// A fonte canônica é `content/concept-spine.json` (raiz do repo),
// consumida pelo seed e pelo validador de trilhas (scripts/). A API não
// importa o JSON diretamente porque o build (nest/tsc) está contido em
// apps/api/src — importar um arquivo fora desse root quebraria o build.
// A paridade entre este espelho e o JSON canônico é imposta por
// VERIFICAÇÃO: adaptation.rules.spec.ts lê o JSON do disco e afirma
// igualdade módulo a módulo (tag, título e ordem). Se os dois divergirem,
// o teste quebra — o espelho nunca apodrece em silêncio.
//
// Qualquer mudança na espinha nasce no JSON canônico e se reflete aqui.

export interface SpineModuleDef {
  tag: string;
  title: string;
  order: number;
}

export const CONCEPT_SPINE_VERSION = 1;

export const CONCEPT_SPINE_MODULES: SpineModuleDef[] = [
  { tag: 'saida-e-variaveis', title: 'Saída e variáveis', order: 1 },
  { tag: 'entrada-e-strings', title: 'Entrada e strings', order: 2 },
  { tag: 'operadores', title: 'Operadores', order: 3 },
  { tag: 'condicionais', title: 'Condicionais', order: 4 },
  { tag: 'loops', title: 'Loops', order: 5 },
  { tag: 'listas', title: 'Listas', order: 6 },
  { tag: 'dicionarios-e-estruturas', title: 'Dicionários e estruturas', order: 7 },
  { tag: 'funcoes', title: 'Funções', order: 8 },
  { tag: 'erros-e-depuracao', title: 'Erros e depuração', order: 9 },
  { tag: 'projeto-final', title: 'Projeto final', order: 10 },
];

export const SPINE_TAG_SET: ReadonlySet<string> = new Set(
  CONCEPT_SPINE_MODULES.map((m) => m.tag),
);

export const SPINE_MODULE_BY_TAG: ReadonlyMap<string, SpineModuleDef> =
  new Map(CONCEPT_SPINE_MODULES.map((m) => [m.tag, m]));
