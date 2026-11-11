import { describe, expect, it } from 'vitest';
import { parseSSE } from '../useSubmissionStream';

// Central 219 lote 4 (H1) — off-by-one no parse SSE: 'data:' tem 5
// caracteres e o slice(4) mantinha o ':', então o JSON.parse jogava
// exceção e o catch silencioso descartava TODOS os eventos — a barra
// da /ide ficava presa em "Executando testes no Sandbox isolado…"
// para sempre e o ramo "aprovado" era inalcançável ao vivo.
describe('parseSSE', () => {
  it('devolve o JSON da linha data: sem o prefixo (regressão H1)', () => {
    const events = parseSSE('data: {"id":"x","status":"error","score":0}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"id":"x","status":"error","score":0}');
    // O dado tem que ser JSON válido — era exatamente aqui que o
    // parse jogava com o ':' residual do slice(4).
    expect(() => JSON.parse(events[0].data)).not.toThrow();
    expect(JSON.parse(events[0].data).status).toBe('error');
  });

  it('aceita os bytes reais do stream do laudo (id + data + blank line)', () => {
    const bytes = '\nid: 1\ndata: {"id":"x","status":"error","score":0}\n\n';
    const events = parseSSE(bytes);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('message');
    expect(JSON.parse(events[0].data)).toEqual({
      id: 'x',
      status: 'error',
      score: 0,
    });
  });

  it('aceita data: sem espaço depois dos dois-pontos', () => {
    const events = parseSSE('data:{"a":1}\n\n');
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].data)).toEqual({ a: 1 });
  });

  it('lê o nome do evento da linha event: (slice(6) correto, intocado)', () => {
    const events = parseSSE('event: update\ndata: {"status":"running"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('update');
    expect(JSON.parse(events[0].data)).toEqual({ status: 'running' });
  });

  it('ignora comentários (: ...) e linhas vazias', () => {
    const events = parseSSE(': keep-alive\n\ndata: {"status":"running"}\n\n');
    expect(events).toHaveLength(1);
    expect(JSON.parse(events[0].data)).toEqual({ status: 'running' });
  });

  it('separa vários eventos no mesmo buffer', () => {
    const events = parseSSE(
      'data: {"status":"running"}\n\ndata: {"status":"passed"}\n\n',
    );
    expect(events).toHaveLength(2);
    expect(events.map((e) => JSON.parse(e.data).status)).toEqual([
      'running',
      'passed',
    ]);
  });
});
