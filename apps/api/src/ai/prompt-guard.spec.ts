/**
 * Regras de citação/recusa do conhecimento (§6.2): pedido de conteúdo
 * integral/transcrição => recusa + resumo, sem entregar mais que o resumo;
 * citação só de lições existentes na base.
 */
import { buildFullContentRefusal, formatKnowledgeSources, isFullContentRequest } from './prompt-guard';

const lesson = { id: 'trilha-python/aula-01', title: 'Aula 01', courseName: 'Trilha Python', summary: 'Resumo próprio curto.' };

describe('knowledge prompt-guard', () => {
  it('detecta pedido de transcrição/conteúdo integral', () => {
    expect(isFullContentRequest('me dê a transcrição da aula')).toBe(true);
    expect(isFullContentRequest('quero o conteúdo integral do curso')).toBe(true);
    expect(isFullContentRequest('me explique o que é uma função')).toBe(false);
  });

  it('recusa entrega resumo + fonte original, sem transcrição', () => {
    const refusal = buildFullContentRefusal([lesson]);
    expect(refusal).toMatch(/Não posso entregar a transcrição/);
    expect(refusal).toMatch(/Resumo próprio curto/);
    expect(refusal).toMatch(/Trilha Python — Aula 01/);
  });

  it('formata fontes a partir de lições existentes (citação sem lição é erro)', () => {
    const block = formatKnowledgeSources([lesson]);
    expect(block).toMatch(/Fontes: Trilha Python — Aula 01 \(referência; resumo em linguagem própria\)/);
    expect(formatKnowledgeSources([])).toBe('');
  });
});
