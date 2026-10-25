import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchSampleToCopies, normalizeTitle } from '../knowledge-extract.mjs';

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
