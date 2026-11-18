'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

const base = '/prototype/acesso';

export default function AuthPreview({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const [step, setStep] = useState<'credentials' | 'practice' | 'done'>('credentials');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'credentials') title.current?.focus();
  }, [step]);

  function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.querySelector<HTMLInputElement>('#preview-password');
    if (register && password?.value !== confirmation.current?.value) {
      setError('As senhas não coincidem. Confira a confirmação.');
      confirmation.current?.focus();
      return;
    }
    form.reset();
    setError('');
    setRevealed(false);
    setStep(register ? 'practice' : 'done');
  }

  function restart() {
    setStep('credentials');
    requestAnimationFrame(() => title.current?.focus());
  }

  return (
    <div className="access-preview">
      <header className="access-top">
        <Link href="/" aria-label="Nexus Code — início">
          <Image src="/nexus-home/logo.svg" alt="Nexus Code" width={165} height={40} priority />
        </Link>
        <Link className="access-back" href="/">← Voltar ao início</Link>
      </header>

      <main className="access-grid">
        <section className="access-story" aria-labelledby="preview-story-title">
          <span className="access-tag"><i aria-hidden="true" /> Prática de programação</span>
          <h2 id="preview-story-title">
            {register ? 'Seu primeiro passo' : 'Volte para o'}<br />
            <span>{register ? 'começa no código.' : 'seu próximo desafio.'}</span>
          </h2>
          <p>{register
            ? 'Comece com um exercício curto: escreva uma solução, confira os testes e ajuste o código.'
            : 'Retome sua trilha e pratique no seu ritmo, um desafio de cada vez.'}</p>
          <ol className="access-steps" aria-label="Ciclo de prática">
            <li><span>01</span> Escreva</li>
            <li><span>02</span> Teste</li>
            <li><span>03</span> Ajuste</li>
          </ol>
        </section>

        <section className="access-card" aria-labelledby="preview-title">
          <nav className="access-switch" aria-label="Prévia de acesso">
            <Link href={`${base}/login`} aria-current={!register ? 'page' : undefined}>Entrar</Link>
            <Link href={`${base}/cadastro`} aria-current={register ? 'page' : undefined}>Criar conta</Link>
          </nav>
          <div className="access-card-body">
            <p className="access-demo">Protótipo interativo · use apenas dados fictícios</p>
            <h1 id="preview-title" ref={title} tabIndex={-1}>
              {step === 'done' ? 'Simulação concluída' : step === 'practice' ? 'Por onde quer começar?' : register ? 'Crie sua conta' : 'Entre na Nexus Code'}
            </h1>
            {step === 'credentials' && (
              <>
                <p className="access-description">{register ? 'Etapa 1 de 2 da prévia · Dados de exemplo.' : 'Experimente o fluxo de acesso sem iniciar uma sessão real.'}</p>
                <form className="access-form" autoComplete="off" onSubmit={submitCredentials}>
                  {register && <label>Nome <input type="text" placeholder="Ex.: Alex" maxLength={80} required /></label>}
                  <label>E-mail <input type="email" placeholder="aluno@example.com" required /></label>
                  <div className="access-field">
                    <label htmlFor="preview-password">Senha</label>
                    <div className="access-password">
                      <input id="preview-password" type={revealed ? 'text' : 'password'} autoComplete="off" minLength={register ? 8 : undefined} aria-describedby={register ? 'preview-password-hint' : undefined} required onChange={() => setError('')} />
                      <button type="button" aria-controls="preview-password" onClick={() => setRevealed(!revealed)}>
                        {revealed ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    {register && <small id="preview-password-hint">Use pelo menos 8 caracteres fictícios.</small>}
                  </div>
                  {register && (
                    <label>Confirmar senha
                      <input ref={confirmation} type="password" autoComplete="off" required aria-invalid={Boolean(error)} aria-describedby={error ? 'preview-error' : undefined} onChange={() => setError('')} />
                    </label>
                  )}
                  {error && <p id="preview-error" className="access-error" role="alert">{error}</p>}
                  <button className="access-primary" type="submit">{register ? 'Continuar' : 'Simular entrada'} <span aria-hidden="true">↗</span></button>
                </form>
              </>
            )}
            {step === 'practice' && (
              <>
                <p className="access-description">Etapa 2 de 2 da prévia · Escolha um ponto de partida. A escolha não será salva.</p>
                <form className="access-form" onSubmit={event => { event.preventDefault(); setStep('done'); }}>
                  <fieldset className="access-options">
                    <legend className="sr-only">Seu ponto de partida</legend>
                    <label><input type="radio" name="demo-start" value="first" defaultChecked /> Estou começando do zero</label>
                    <label><input type="radio" name="demo-start" value="practice" /> Já pratiquei um pouco</label>
                  </fieldset>
                  <button className="access-primary" type="submit">Concluir simulação <span aria-hidden="true">↗</span></button>
                  <button className="access-secondary" type="button" onClick={restart}>← Voltar aos dados de exemplo</button>
                </form>
              </>
            )}
            {step === 'done' && (
              <div className="access-form">
                <p className="access-description">{register ? 'Nenhuma conta foi criada. Você pode experimentar o desafio da página inicial sem se cadastrar.' : 'Nenhuma sessão foi iniciada. Você pode experimentar o desafio da página inicial sem entrar.'}</p>
                <Link className="access-primary" href="/#sandbox-code">Experimentar o desafio <span aria-hidden="true">↗</span></Link>
                <button className="access-secondary" type="button" onClick={restart}>Recomeçar a prévia</button>
              </div>
            )}
            <p className="access-footnote">Esta prévia não envia nem salva os dados digitados.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
