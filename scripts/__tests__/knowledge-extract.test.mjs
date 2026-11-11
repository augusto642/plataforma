import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyFolderMatches, buildSummaryPrompt, loadTopicTags, matchSampleToCopies, normalizeTitle,
  summarizeWithGeminiHelper,
} from '../knowledge-extract.mjs';

// Stub do helper Gemini: imprime o JSON que o helper real devolveria, sem
// tocar em rede ou credencial. O texto do modelo vem do arquivo indicado.
function stubHelper(text) {
  const dir = mkdtempSync(join(tmpdir(), 'nexus-stub-gemini-'));
  const p = join(dir, 'stub-gemini.py');
  writeFileSync(p, [
    'import json, sys',
    `TEXT = ${JSON.stringify(text)}`,
    'print(json.dumps({"http_status": 200, "model": "stub", "finish_reason": "STOP",',
    '  "text": TEXT, "usage": {"promptTokenCount": 10, "candidatesTokenCount": 5, "totalTokenCount": 15}}))',
  ].join('\n'));
  return p;
}

const TAGS = ['loops', 'listas', 'funcoes'];
const ENTRY = { fileName: '11. Exercício 45 - GAME Pedra Papel e Tesoura.mp4' };
const VALID = JSON.stringify({
  summary: 'Aula prática: o aluno implementa o jogo Pedra, Papel e Tesoura com condicionais e laços.',
  topics: ['condicionais', 'loops'],
  prerequisites: ['saida-e-variaveis'],
  keyExamples: ['pedra vence tesoura', 'placar com laço'],
  difficulty: 'beginner',
});

describe('summarizeWithGeminiHelper', () => {
  it('prompt exige JSON, teto 1200 e tópicos do universo', () => {
    const prompt = buildSummaryPrompt('transcrição...', ENTRY, TAGS);
    assert.match(prompt, /SOMENTE com um objeto JSON/);
    assert.match(prompt, /1200 caracteres/);
    assert.match(prompt, /loops, listas, funcoes/);
    assert.match(prompt, /Pedra Papel e Tesoura/);
  });

  it('loadTopicTags lê a espinha real do repo', () => {
    const tags = loadTopicTags();
    assert.ok(tags.includes('loops'));
    assert.ok(tags.includes('listas'));
    assert.ok(tags.length >= 5);
  });

  it('parseia o JSON do modelo e repassa usage', async () => {
    const s = await summarizeWithGeminiHelper('texto', ENTRY, {
      helperPath: stubHelper(VALID), topicTags: [...TAGS, 'condicionais', 'saida-e-variaveis'],
    });
    assert.match(s.summary, /Pedra, Papel e Tesoura/);
    assert.deepEqual(s.topics, ['condicionais', 'loops']);
    assert.deepEqual(s.prerequisites, ['saida-e-variaveis']);
    assert.equal(s.keyExamples.length, 2);
    assert.equal(s.difficulty, 'beginner');
    assert.equal(s.usage.totalTokenCount, 15);
  });

  it('aceita JSON cercado por fences markdown', async () => {
    const s = await summarizeWithGeminiHelper('texto', ENTRY, {
      helperPath: stubHelper(`\`\`\`json\n${VALID}\n\`\`\``),
      topicTags: [...TAGS, 'condicionais'],
    });
    assert.ok(s.summary.length > 0);
  });

  it('filtra tópico fora do universo e falha se não sobrar nenhum', async () => {
    const s = await summarizeWithGeminiHelper('texto', ENTRY, {
      helperPath: stubHelper(JSON.stringify({
        summary: 'Resumo válido.', topics: ['loops', 'topico-inventado'], prerequisites: [], keyExamples: [], difficulty: 'beginner',
      })),
      topicTags: TAGS,
    });
    assert.deepEqual(s.topics, ['loops']);
    await assert.rejects(
      summarizeWithGeminiHelper('texto', ENTRY, {
        helperPath: stubHelper(JSON.stringify({
          summary: 'Resumo válido.', topics: ['topico-inventado'], prerequisites: [], keyExamples: [], difficulty: 'beginner',
        })),
        topicTags: TAGS,
      }),
      /nenhum tópico do universo/,
    );
  });

  it('rejeita resumo vazio ou acima de 1200 chars', async () => {
    await assert.rejects(
      summarizeWithGeminiHelper('texto', ENTRY, {
        helperPath: stubHelper(JSON.stringify({
          summary: '', topics: ['loops'], prerequisites: [], keyExamples: [], difficulty: 'beginner',
        })),
        topicTags: TAGS,
      }),
      /vazio/,
    );
    await assert.rejects(
      summarizeWithGeminiHelper('texto', ENTRY, {
        helperPath: stubHelper(JSON.stringify({
          summary: 'x'.repeat(1201), topics: ['loops'], prerequisites: [], keyExamples: [], difficulty: 'beginner',
        })),
        topicTags: TAGS,
      }),
      />1200 chars/,
    );
  });

  it('normaliza difficulty inválida para beginner', async () => {
    const s = await summarizeWithGeminiHelper('texto', ENTRY, {
      helperPath: stubHelper(JSON.stringify({
        summary: 'Resumo válido.', topics: ['loops'], prerequisites: [], keyExamples: [], difficulty: 'facil',
      })),
      topicTags: TAGS,
    });
    assert.equal(s.difficulty, 'beginner');
  });
});

const sample = [
  { fileName: '01. Aula 01 - Seja um Programador.mp4', driveFileId: 'orig-1', sizeBytes: 100 },
  { fileName: '12. Exercício 05 - Antecessor e Sucessor.mp4', driveFileId: 'orig-2', sizeBytes: 200 },
];

describe('matchSampleToCopies', () => {
  it('casa cópias com prefixo "Cópia de " e usa o id da cópia', () => {
    const { entries, missing, duplicates } = matchSampleToCopies(sample, [
      { id: 'copy-1', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
      { id: 'copy-2', name: 'Cópia de 12. Exercício 05 - Antecessor e Sucessor.mp4', size: '200' },
    ]);
    assert.deepEqual(missing, []);
    assert.deepEqual(duplicates, []);
    assert.equal(entries[0].driveFileId, 'copy-1');
    assert.equal(entries[0].fileName, '01. Aula 01 - Seja um Programador.mp4');
    assert.equal(entries[1].driveFileId, 'copy-2');
  });

  it('aponta falta e duplicata em vez de casar errado', () => {
    const r1 = matchSampleToCopies(sample, [
      { id: 'copy-1', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
    ]);
    assert.deepEqual(r1.missing, ['12. Exercício 05 - Antecessor e Sucessor.mp4']);
    const r2 = matchSampleToCopies(sample, [
      { id: 'copy-1', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
      { id: 'copy-1b', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
      { id: 'copy-2', name: 'Cópia de 12. Exercício 05 - Antecessor e Sucessor.mp4', size: '200' },
    ]);
    assert.equal(r2.duplicates.length, 1);
  });

  it('normalizeTitle ignora prefixo, caixa e acento', () => {
    assert.equal(
      normalizeTitle('Cópia de 01. Aula 01 - Seja um Programador.mp4'),
      normalizeTitle('01. AULA 01 - Seja um Programador.mp4'),
    );
  });
});

describe('applyFolderMatches', () => {
  const kids = [
    { id: 'copy-1', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
  ];
  it('fail-closed default: falta aborta antes de qualquer download', () => {
    assert.throws(() => applyFolderMatches(sample, kids), /faltam 1 cópias/);
  });
  it('--partial: segue só com as casadas e lista as faltantes', () => {
    const m = applyFolderMatches(sample, kids, { partial: true });
    assert.equal(m.entries.length, 1);
    assert.equal(m.entries[0].driveFileId, 'copy-1');
    assert.deepEqual(m.missing, ['12. Exercício 05 - Antecessor e Sucessor.mp4']);
  });
  it('duplicata aborta mesmo com --partial', () => {
    assert.throws(() => applyFolderMatches(sample, [
      { id: 'copy-1', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
      { id: 'copy-1b', name: 'Cópia de 01. Aula 01 - Seja um Programador.mp4', size: '100' },
    ], { partial: true }), /duplicadas/);
  });
});
