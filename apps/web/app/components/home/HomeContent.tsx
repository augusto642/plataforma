/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { annualTotal, formatBRL, PLAN_PRICES } from '../landing/pricing-data';
import { TrackedLink } from '../landing/TrackedLink';
import { isFreeAlphaMode } from '../../lib/runtime-mode';

export default function HomeContent() {
  const pro = PLAN_PRICES.pro;
  return (
    <>
<a className="skip" href="#conteudo">Pular para o conteúdo</a>
  <div className="wrap">
    <header className="header">
      <a className="logo" href="#inicio" aria-label="Nexus Code — início"><img src="/nexus-home/logo.svg" alt="Nexus Code" width={165} height={40} /></a>
      <nav className="nav" aria-label="Seções da página"><a href="#tutoria">Tutoria</a><a href="#trilha">Trilha de estudos</a><a href="#planos">Planos</a><a href="#torre">Torre</a><a href="#duvidas">Dúvidas</a></nav>
      <div className="header-actions"><Link className="login" href="/login">Entrar</Link><a className="btn" href="#sandbox">Testar desafio ↗</a></div>
    </header>
    <nav className="mobile-nav" aria-label="Seções da página"><a href="#sandbox">Desafio</a><a href="#tutoria">Tutoria</a><a href="#trilha">Trilha de estudos</a><a href="#planos">Planos</a><a href="#torre">Torre</a><a href="#entrevistas">Entrevistas</a></nav>
    <main id="conteudo" tabIndex={-1}>
      <div id="inicio">
        <section className="hero hero--immersive" id="hero-stage" aria-labelledby="titulo">
          <div className="hero-copy hero-copy--immersive">
            <h1 id="titulo">Aprenda programação.<span>Escreva. Teste. Entenda.</span></h1>
            <p className="hero-benefits">Resolva um exercício de JavaScript, confira os testes e use as pistas se travar.</p>
            <div className="hero-actions"><a className="btn" href="#sandbox-code">Resolver meu primeiro desafio <span aria-hidden="true">↗</span></a></div>
            <span className="hero-kicker">O primeiro desafio não precisa de conta.</span>
          </div>
          <div className="hero-scene">
            <div className="hero-visual" id="hero-visual" aria-hidden="true">
              <div className="hero-node hero-node--code"><span className="hero-node-glyph">&lt;/&gt;</span><span className="hero-node-label">Escreva</span></div>
              <span className="hero-connector"><i className="hero-packet"></i></span>
              <div className="hero-node hero-node--tests"><span className="hero-node-glyph"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M21 12a9 9 0 1 1-3-6.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path></svg></span><span className="hero-node-label">Teste</span></div>
              <span className="hero-connector"><i className="hero-packet"></i></span>
              <div className="hero-node"><span className="hero-node-glyph"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 7h12l-3-3m7 13H8l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"></path><path d="M17 7a7 7 0 0 1 2.5 9M7 17a7 7 0 0 1-2.5-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path></svg></span><span className="hero-node-label">Ajuste</span></div>
            </div>
            <button type="button" className="hero-motion" id="hero-motion" aria-controls="hero-stage" aria-pressed="false" hidden>Pausar animação</button>
          </div>
        </section>
        <section className="practice-section" id="sandbox" tabIndex={-1} aria-labelledby="pratica-titulo">
          <div className="practice-heading"><h2 id="pratica-titulo">Seu primeiro desafio</h2><p>Altere o cálculo e execute os testes para conferir a resposta.</p></div>
          <div className="practice-window" aria-label="Desafio interativo de programação">
            <div className="window-bar mono"><label className="window-identity challenge-select"><span className="sr-only">Escolher desafio</span><select id="sandbox-challenge" disabled defaultValue="dobro"><option value="dobro">Dobro</option><option value="conversao">Minutos em segundos</option><option value="maioridade">Maioridade</option></select></label></div>
            <div className="challenge"><h2 id="sandbox-title">Devolva o dobro.</h2><p><code>valor</code><span id="sandbox-instructions"> é o número recebido. Ajuste o cálculo para devolver o dobro:</span> <strong id="sandbox-example">4 → 8</strong>.</p><p className="challenge-skill"><span className="mono">Foco</span><span id="sandbox-focus" aria-live="polite">Operações · multiplique por 2; confira positivo, zero e negativo.</span></p></div>
            <form className="try-challenge" id="try-challenge">
              <div className="sandbox-modes" role="group" aria-label="Como você quer resolver?"><button type="button" id="sandbox-mode-code" aria-pressed="true" aria-controls="sandbox-code" disabled>Editar código</button><button type="button" id="sandbox-mode-guided" aria-pressed="false" aria-controls="sandbox-guide" disabled>Montar com ajuda</button></div>
              <div id="sandbox-code" tabIndex={-1}>
              <div className="editor-bar"><span>solution.js</span><span className="editor-language">JS / ARITMÉTICA</span></div>
              <div className="code-editor" aria-label="Código da atividade">
                <div className="code-row"><span className="line-no" aria-hidden="true">1</span><code><span className="key">function</span> <span className="name" id="sandbox-function">dobro</span>(valor) &#123;</code></div>
                <div className="code-row"><span className="line-no" aria-hidden="true">2</span><code>  <span className="key">return</span> </code><input name="expression" aria-label="Expressão devolvida pela função" aria-describedby="sandbox-help sandbox-limit" defaultValue="valor + 2" maxLength={120} autoComplete="off" spellCheck={false} /><code>;</code></div>
                <div className="code-row"><span className="line-no" aria-hidden="true">3</span><code>&#125;</code></div>
              </div>
              <p className="editor-hint" id="sandbox-help"><code>return</code> devolve a resposta.</p>
              </div>
              <div id="sandbox-guide" hidden>
                <p>Escolha o cálculo. O código acima acompanha a sua escolha.</p>
                <div className="guided-operation"><label>Operação<select id="sandbox-operation" disabled><option value="+">Somar</option><option value="-">Subtrair</option><option value="*">Multiplicar</option><option value="/">Dividir</option></select></label><label>Número<input id="sandbox-number" type="number" step="any" defaultValue="2" required inputMode="decimal" disabled /></label></div>
                <p className="guided-meaning" id="sandbox-meaning">O código vai somar 2 ao número recebido.</p>
              </div>
              <div className="sandbox-actions"><button type="submit" id="sandbox-run" disabled>▶ Executar solução</button><button type="button" id="sandbox-hint" disabled>Pedir pista</button></div>
              <div className="sandbox-console" aria-label="Testes locais do desafio">
                <div className="console-heading"><span className="mono">Número → resultado</span><span id="sandbox-count">3 testes</span></div>
                <ul id="sandbox-tests"><li data-status="idle"><strong>4 → —</strong><small>Esperado: 8</small><small>Aguardando</small></li><li data-status="idle"><strong>0 → —</strong><small>Esperado: 0</small><small>Aguardando</small></li><li data-status="idle"><strong>-3 → —</strong><small>Esperado: -6</small><small>Aguardando</small></li></ul>
              </div>
              <output className="try-result" aria-live="polite" tabIndex={-1}>Execute para ver o resultado de cada entrada.</output>
              <a id="sandbox-next" href="#sandbox" hidden>Próximo desafio →</a>
              <div id="sandbox-signup" className="sandbox-signup" hidden>
                <TrackedLink href="/register" ctaId="practice_signup" event="final_cta">Continuar na plataforma: criar conta grátis ↗</TrackedLink>
              </div>
              <details className="sandbox-details"><summary>O que este editor aceita?</summary><p className="sandbox-limit" id="sandbox-limit">Só a expressão marcada é interpretada: valor, números, +, -, *, / e parênteses. Não executa JavaScript completo.</p></details>
              <button type="button" className="sandbox-reset" id="sandbox-reset" disabled>Restaurar código inicial</button>
              <noscript><span className="fine">Ative JavaScript para verificar sua resposta.</span></noscript>
            </form>
            <div className="mentor"><span className="mono">Ajuda por etapas</span><blockquote id="sandbox-mentor" tabIndex={-1}>O seu cálculo também funciona quando a entrada é zero?</blockquote><small>Pistas locais, até um exemplo de solução. Sem consulta à IA.</small><span className="hint-count" id="sandbox-hint-status" aria-live="polite"></span></div>
          </div>
        </section>
        <div className="sequence" id="pratica" aria-label="Experimente as três ações do desafio">
          <article className="journey-step"><button type="button" id="journey-edit" aria-label="Editar o código do desafio" disabled><span className="journey-number">01</span><span className="mono">Sua tentativa</span><strong>Edite o trecho marcado.</strong><span className="journey-preview"><code id="journey-code">valor + 2</code></span><span className="journey-caption">Voltar ao código ↑</span></button></article>
          <article className="journey-step" id="journey-test-step"><button type="button" id="journey-run" aria-label="Executar a solução do desafio" disabled><span className="journey-number">02</span><span className="mono">Seus testes</span><strong>Teste a sua ideia.</strong><span className="journey-preview"><span id="journey-input">4</span><span aria-hidden="true">→</span><b id="journey-result">—</b></span><span className="journey-caption" id="journey-checks">Esperado: 8 · aguarda execução</span></button></article>
          <article className="journey-step"><button type="button" id="journey-hint" aria-label="Pedir uma pista para o desafio" disabled><span className="journey-number">03</span><span className="mono">Sua ajuda</span><strong>Abra uma pista.</strong><span className="journey-preview"><span className="journey-dots" aria-hidden="true"><i></i><i></i><i></i></span><b id="journey-hint-count">0/3</b></span><span className="journey-caption">Uma orientação por vez ↑</span></button></article>
        </div>
        <section className="section" id="tutoria">
          <div className="section-head"><span className="label mono">Tutoria</span><div><h2>Entenda o resultado dos testes</h2></div></div>
          <div className="tutor-story">
            <div className="tutor-statement">                        <p>Na plataforma, a tutora de IA usa o contexto do seu código e dos testes para orientar seu raciocínio.</p><a href="#sandbox" id="tutor-return">Revisar minha tentativa ↑</a><p className="fine">Ajuda local por regras, sem IA.</p></div>
            <div className="tutor-dialogue" aria-label="Ajuda contextual do desafio atual"><span className="mono" id="tutor-context">Dobro · ainda não executado</span><div className="local-controls" role="group" aria-label="Escolha uma orientação"><button type="button" data-help="error" aria-pressed="true" disabled>Meu resultado</button><button type="button" data-help="tests" aria-pressed="false" disabled>Por que testar?</button><button type="button" data-help="hint" aria-pressed="false" disabled>Abrir pista</button></div><div className="conversation tutor"><p id="tutor-response" tabIndex={-1}>Execute sua tentativa para comparar com o esperado. Nenhum erro foi presumido.</p></div></div>
          </div>
        </section>
        <section className="section" id="trilha">
          <div className="section-head"><span className="label mono">Roteiro de prática</span><div><h2>Qual desafio vem a seguir?</h2><p>Escolha seu ponto de partida e abra um exercício no editor.</p></div></div>
          <div className="track-layout">
            <div className="track-logic"><fieldset><legend>Como está sua prática?</legend><label><input type="radio" name="track-start" value="zero" defaultChecked disabled />Estou começando do zero.</label><label><input type="radio" name="track-start" value="operations" disabled />Já usei operações em código.</label></fieldset><p id="track-reason">Comece com uma operação, aplique-a em uma conversão e então escreva uma condição.</p></div>
            <div className="track-result" id="track-tasks" aria-label="Etapas do roteiro"><article><button type="button" className="track-task" data-challenge="dobro" aria-current="step" disabled><span className="mono">01 / Operações</span><strong>Devolva o dobro.</strong><small>Aberto no editor ↑</small></button></article><article><button type="button" className="track-task" data-challenge="conversao" disabled><span className="mono">02 / Conversão</span><strong>De minutos a segundos.</strong><small>Abrir desafio ↑</small></button></article><article><button type="button" className="track-task" data-challenge="maioridade" disabled><span className="mono">03 / Condições</span><strong>Já tem 18 anos?</strong><small>Abrir desafio ↑</small></button></article></div>
          </div>
          <div className="journey-note" id="progresso"><progress id="track-progress" max="3" value="0" aria-label="Desafios com os três testes corretos"></progress><span id="track-status" role="status">0 de 3 desafios com os testes corretos.</span><span className="fine">Só nesta visita. Recarregar reinicia tudo.</span></div>
        </section>
        <section className="section" id="torre">
          <div className="section-head"><div><h2>Torre de Desafios</h2><p>Um tabuleiro que combina dados, perguntas de programação e desafios de código.</p></div></div>
          <div className="tower-layout">
            <div className="tower-art" id="tower-art"><img src="/nexus-home/torre-blocos.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" /><div className="tower-fallback-dice" aria-hidden="true"><span>⚀</span><span>⚀</span></div><div className="tower-controls"><button type="button" id="tower-throw" hidden>Sortear dados</button><button className="tower-motion" type="button" hidden>Pausar animação da Torre</button></div><span className="tower-roll" aria-hidden="true"></span><span id="tower-status" className="sr-only" role="status" aria-live="off"></span><p className="tower-note">Ilustração interativa. A partida acontece na Torre.</p></div>
            <div className="tower-copy"><h3>Enfrente o guardião na casa 30</h3><div className="tower-list"><div><b>01</b><span><strong>Lance os dados</strong> para definir a próxima casa.</span></div><div><b>02</b><span><strong>Resolva dentro do tempo.</strong> Se errar ou o tempo acabar, você pode recuar.</span></div><div><b>03</b><span><strong>Vença o guardião</strong> para avançar ou concluir o nível.</span></div></div><Link className="btn" href="/conheca-a-torre">Abrir a Torre</Link></div>
          </div>
        </section>
        <section className="section" id="entrevistas">
          <div className="interview"><div className="interview-copy"><span className="mono label">04 / Treino de explicação</span><h2>Explique a regra.<br />Mostre os testes.</h2><p>Responda sobre o desafio aberto no editor. Depois, revise sua explicação com três critérios claros.</p><p className="fine">Autoavaliação, sem nota automática ou IA. Treino não é seleção nem garante contratação.</p></div><div className="interview-example"><span className="mono" id="interview-context">Sobre o desafio Dobro</span><blockquote id="interview-question">Como você calcula o dobro? Explique sua escolha, os testes e uma alternativa.</blockquote><details className="interview-practice" id="interview-practice"><summary>Escrever minha explicação</summary><form id="interview-form"><label htmlFor="interview-answer">Sua resposta, com suas palavras</label><textarea id="interview-answer" maxLength={2000} required aria-describedby="interview-privacy" disabled></textarea><p className="fine" id="interview-privacy">Texto só na memória desta página. Não é enviado nem salvo; sai ao recarregar.</p><div className="local-controls"><button type="submit" disabled>Revisar minha explicação</button><button type="button" id="interview-reset" disabled>Limpar resposta</button></div><div id="interview-review" hidden><fieldset><legend>Marque o que você realmente explicou</legend><label><input type="checkbox" name="interview-rule" disabled />Qual regra usei e por quê.</label><label><input type="checkbox" name="interview-tests" disabled />Um caso comum e um caso de limite.</label><label><input type="checkbox" name="interview-alternative" disabled />Uma alternativa e sua limitação.</label></fieldset><p id="interview-status" role="status"></p><details><summary>Comparar com uma explicação de referência</summary><p id="interview-reference"></p></details></div></form></details></div></div>
        </section>
        <section className="section plans-section" id="planos" aria-labelledby="planos-titulo">
          <div className="section-head">
            <span className="label mono">Planos e benefícios</span>
            <div><h2 id="planos-titulo">Um caminho para cada etapa.</h2><p>{isFreeAlphaMode ? 'Durante o alfa, você pode começar gratuitamente, sem cartão ou cobrança.' : 'Conheça o plano gratuito e os valores de referência dos planos pagos. Esta página não inicia checkout.'}</p></div>
          </div>
          <div className={isFreeAlphaMode ? 'pricing-grid pricing-grid--alpha' : 'pricing-grid'}>
            <article className="plan-card" aria-labelledby="plano-iniciante">
              <div className="plan-intro"><span className="plan-kicker">{isFreeAlphaMode ? '01 / ALFA GRATUITO' : '01 / PLANO GRATUITO'}</span><h3 id="plano-iniciante">Iniciante</h3><p>Para dar os primeiros passos em programação.</p></div>
              <div className="plan-price"><strong>R$ 0</strong>{isFreeAlphaMode && <span>/ durante o alfa</span>}<p>Sem cobrança.</p></div>
              <ul className="plan-benefits"><li>Trilha inicial completa em formato de jogo</li><li>Editor de código direto no navegador</li><li>Desafios iniciais de lógica</li><li>Comunidade de alunos</li></ul>
              <div className="plan-footer"><a className="plan-action" href="#sandbox-code">Experimentar a prática local ↑</a><p>Este botão abre o desafio; não cria cadastro.</p></div>
            </article>
            {!isFreeAlphaMode && <><article className="plan-card plan-card--featured" aria-labelledby="plano-pro">
              <div className="plan-intro"><span className="plan-kicker">02 / PLANO PAGO · NÃO ATIVO</span><h3 id="plano-pro">Pro</h3><p>Para quem quer avançar nas trilhas Júnior e Pleno.</p></div>
              <div className="plan-price"><strong>{pro.monthly === null ? 'Preço a definir' : formatBRL(pro.monthly)}</strong><span>/ mês</span><p>{pro.annualMonthly !== null && `No anual: ${formatBRL(pro.annualMonthly)}/mês (${formatBRL(annualTotal(pro) ?? 0)}/ano).`}</p></div>
              <ul className="plan-benefits"><li>Trilhas completas de Júnior e Pleno</li><li>Certificado verificado de conclusão</li><li>Simulador de entrevista com IA</li><li>Revisão de código linha a linha por IA</li><li>Ligas competitivas e ranking semanal</li></ul>
              <div className="plan-footer"><p className="plan-status" role="note">Plano pago indisponível nesta fase</p><p>Valores de referência; sem checkout ou cobrança.</p></div>
            </article>
            <article className="plan-card" aria-labelledby="plano-carreira">
              <div className="plan-intro"><span className="plan-kicker">03 / PLANO PAGO · EM DEFINIÇÃO</span><h3 id="plano-carreira">Carreira</h3><p>Para quem busca preparação direcionada para vagas e conexão com empresas parceiras.</p></div>
              <div className="plan-price"><strong>Preço a definir</strong><span>sem valor publicado</span><p>Benefícios previstos; contratação não disponível.</p></div>
              <ul className="plan-benefits"><li>Tudo incluído no plano Pro</li><li>Talent Match: recomendação para empresas parceiras</li><li>Preparação para vagas e revisão de currículo/LinkedIn</li><li>Simulações de entrevistas com feedback gravado</li></ul>
              <div className="plan-footer"><p className="plan-status" role="note">Plano em definição</p><p>Sem preço ou checkout nesta fase.</p></div>
            </article></>}
          </div>
        </section>
        <section className="section faq" id="duvidas">
          <div><h2>Perguntas frequentes</h2></div>
          <div className="faq-list">
            <details><summary>Preciso de conta para praticar?</summary><p>Não para os três exercícios desta página. Eles rodam no navegador e usam expressões simples de JavaScript e pistas prontas.</p></details>
            <details><summary>Minhas tentativas ou meu progresso ficam salvos?</summary><p>Não. As respostas e o progresso ficam apenas na memória desta página e somem ao recarregar. Nada é enviado a uma IA ou salvo em uma conta.</p></details>
            <details><summary>Posso contratar um plano por aqui?</summary><p>{isFreeAlphaMode ? 'O alfa é gratuito. Não há contratação de planos pagos nesta fase.' : 'Você pode criar uma conta gratuita. Os planos pagos são apresentados como referência e não podem ser contratados nesta página.'}</p></details>
          </div>
        </section>
        <section className="section"><div className="end"><div><span className="mono">Depois do desafio</span><h2>Continue na<br />Nexus Code.</h2><p>Crie uma conta gratuita para continuar na plataforma. Suas tentativas desta página não são transferidas.</p><TrackedLink className="btn" href="/register" ctaId="final_primary" event="final_cta">Criar minha conta grátis ↗</TrackedLink></div></div></section>
      </div>
    </main>
    <footer className="footer"><span>Nexus Code · Aprenda programação na prática.</span><span><Link href="/login">Entrar</Link> · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link> · <Link href="/contato">Contato</Link> · <a href="#inicio">Voltar ao início ↑</a></span></footer>
  </div>
    </>
  );
}
