'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import DashboardLinks from './dashboard-links';
import styles from './student-dashboard.module.css';

const lessons = [
  { title: 'Variáveis e valores', topic: 'Fundamentos' },
  { title: 'Operações e expressões', topic: 'Fundamentos' },
  { title: 'Condições com if e else', topic: 'Controle de fluxo' },
  { title: 'Repetições com for', topic: 'Controle de fluxo' },
];

const initialCompleted = 2;
const xpPerLesson = 25;
const activities = [
  {
    title: <>Condições com <code>if</code> e <code>else</code></>,
    description: 'Use uma comparação para decidir qual caminho o programa segue.',
    example: <><span>if</span>{' (idade >= 18) {\n  permitirAcesso();\n} '}<span>else</span>{' {\n  negarAcesso();\n}'}</>,
    question: <>Se <code>idade</code> vale 18, o programa chama <code>permitirAcesso()</code>?</>,
    options: ['Sim', 'Não'],
    correct: 'Sim',
    hint: 'Compare 18 com o limite. O operador inclui o próprio limite ou exige um valor maior?',
    explanation: 'Como 18 é igual ao limite, a condição é verdadeira e o programa permite o acesso.',
  },
  {
    title: <>Repetições com <code>for</code></>,
    description: 'Acompanhe o valor de i para descobrir quantas vezes o laço roda.',
    example: <><span>for</span>{' (let i = 1; i < 4; i++) {\n  console.log(i);\n}'}</>,
    question: <>Quantas vezes <code>console.log(i)</code> é chamado?</>,
    options: ['3 vezes', '4 vezes'],
    correct: '3 vezes',
    hint: 'Comece com i igual a 1. A cada repetição, some 1 e confira se i ainda é menor que 4.',
    explanation: 'O laço imprime 1, 2 e 3. Quando i chega a 4, a condição deixa de ser verdadeira.',
  },
];

const exampleWeek = [
  { day: 'Seg', practiced: true },
  { day: 'Ter', practiced: false },
  { day: 'Qua', practiced: true },
  { day: 'Qui', practiced: false },
  { day: 'Sex', practiced: true },
  { day: 'Sáb', practiced: false },
  { day: 'Dom', practiced: false },
];

export default function StudentDashboard() {
  const [ready, setReady] = useState(false);
  const [firstVisit, setFirstVisit] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'hint' | 'incorrect' | null>(null);
  const [completedCount, setCompletedCount] = useState(initialCompleted);
  const [reviewing, setReviewing] = useState(false);
  const activityHeading = useRef<HTMLHeadingElement>(null);
  const primaryAction = useRef<HTMLButtonElement>(null);
  const activity = activities[activityIndex];
  const lessonIndex = initialCompleted + activityIndex;
  const activityDone = lessonIndex < completedCount;
  const trailDone = completedCount === lessons.length;
  const completedHere = lessons.slice(initialCompleted, completedCount);
  const missionDone = completedHere.length > 0;

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (practicing) activityHeading.current?.focus();
  }, [practicing, activityIndex]);

  function closeActivity() {
    setPracticing(false);
    primaryAction.current?.focus();
  }

  function openNextActivity() {
    setActivityIndex(completedCount - initialCompleted);
    setAnswer('');
    setFeedback(null);
    setPracticing(true);
  }

  function handlePrimaryAction() {
    if (practicing) {
      closeActivity();
    } else if (trailDone) {
      setReviewing(true);
      setPracticing(true);
    } else if (activityDone) {
      openNextActivity();
    } else {
      setPracticing(true);
    }
  }

  function checkAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activityDone) {
      if (trailDone) closeActivity();
      else openNextActivity();
    } else if (answer === activity.correct) {
      setCompletedCount((count) => Math.max(count, lessonIndex + 1));
      setFeedback(null);
    } else {
      setFeedback('incorrect');
    }
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#painel">Pular para o painel</a>
      <aside className={styles.sidebar}>
        <Link href="/" aria-label="Nexus Code — início">
          <Image src="/nexus-home/logo.svg" alt="Nexus Code" width={151} height={37} />
        </Link>
        <nav className={styles.navigation} aria-label="Painel do aluno">
          <a href="#painel"><span aria-hidden="true">⌂</span> Visão geral</a>
          {!firstVisit && <a href="#trilha"><span aria-hidden="true">≡</span> Minha trilha</a>}
          {!firstVisit && <a href="#progresso"><span aria-hidden="true">↗</span> Progresso</a>}
          <a href="#recursos"><span aria-hidden="true">▸</span> Recursos</a>
        </nav>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">M</span>
          <div><strong>Marina</strong><small>Perfil de exemplo</small></div>
        </div>
      </aside>

      <main id="painel" tabIndex={-1} className={styles.main}>
        <header className={styles.welcome}>
          <div><p className={styles.kicker}>Painel do aluno</p><h1>Olá, Marina.</h1><p>{firstVisit ? 'Escolha por onde começar a estudar.' : 'Acompanhe sua trilha de JavaScript e pratique no seu ritmo.'}</p></div>
          <span className={styles.preview}>Prévia · dados fictícios</span>
        </header>

        {firstVisit && (
          <section className={styles.hero} aria-labelledby="first-visit-title">
            <div>
              <p className={styles.kicker}>Sem trilha ativa</p>
              <h2 id="first-visit-title">Comece pelo básico</h2>
              <p>Veja um exemplo de trilha para quem está começando ou escolha um curso no catálogo real.</p>
              <Link href="/courses" prefetch={false} className={styles.secondary}>Explorar cursos <span aria-hidden="true">↗</span></Link>
              <button type="button" className={styles.secondary} onClick={() => {
                document.getElementById('painel')?.focus();
                setFirstVisit(false);
              }}>Voltar à visão de estudo</button>
            </div>
            <details className={`${styles.optionGroup} ${styles.suggestion}`}>
              <summary>Ver trilha sugerida</summary>
              <div>
                <strong>Fundamentos de JavaScript</strong>
                <p>Uma sugestão de exemplo para quem nunca programou: comece com valores e expressões, depois pratique condições e repetições.</p>
                <Link href="/trilha/sugerida" prefetch={false} className={styles.secondary}>Abrir recomendações na plataforma <span aria-hidden="true">↗</span></Link>
              </div>
            </details>
          </section>
        )}
        <section className={`${styles.hero} ${styles.studyHero}`} hidden={firstVisit} aria-labelledby="next-lesson">
          <div>
            <p className={styles.kicker}>
              {trailDone ? 'Fundamentos de JavaScript' : activityDone && !practicing ? 'Próxima aula' : `Aula ${lessonIndex + 1} de ${lessons.length}`}
            </p>
            <h2 id="next-lesson">{trailDone ? 'Trilha concluída' : activityDone && !practicing ? lessons[lessonIndex + 1].title : activity.title}</h2>
            <p>
              {trailDone
                ? 'Você concluiu todas as aulas desta prévia. A última atividade está disponível para revisão.'
                : activityDone
                  ? practicing ? 'Confira o resultado antes de avançar.' : activities[activityIndex + 1].description
                  : activity.description}
            </p>
          </div>
          <button ref={primaryAction} type="button" className={styles.primary} disabled={!ready} aria-expanded={practicing} aria-controls="aula-exemplo" onClick={handlePrimaryAction}>
            {practicing ? 'Fechar atividade' : trailDone ? 'Revisar última atividade' : activityDone ? 'Ir para a próxima aula' : 'Continuar estudando'} <span aria-hidden="true">↗</span>
          </button>
        </section>

        <section id="aula-exemplo" hidden={firstVisit || !practicing} className={styles.practice} aria-labelledby="activity-title">
          <h3 id="activity-title" ref={activityHeading} tabIndex={-1} className={styles.activityHeading}>
            {reviewing ? 'Revisão' : 'Atividade'}: {activity.title}
          </h3>
          <pre id="activity-code" className={styles.code}><code>{activity.example}</code></pre>
          <form onSubmit={checkAnswer}>
            {activityDone ? (
              <p>{activity.question}</p>
            ) : (
              <fieldset aria-describedby="activity-code">
                <legend>{activity.question}</legend>
                <div className={styles.answers}>
                  {activity.options.map((option) => (
                    <label key={option}>
                      <input type="radio" name="answer" value={option} checked={answer === option} required
                        onChange={() => { setAnswer(option); setFeedback(null); }} />
                      {option}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <p id="activity-feedback" role="status" aria-atomic="true" className={styles.feedback}>
              {activityDone
                ? `${reviewing ? 'Resposta correta' : 'Correto'}: ${activity.correct}. ${activity.explanation}${reviewing ? '' : ` +${xpPerLesson} XP de exemplo. ${trailDone ? 'Trilha concluída.' : 'Missão de hoje concluída.'}`}`
                : feedback ? `${feedback === 'incorrect' ? 'Ainda não. ' : ''}Dica da Lumi: ${activity.hint}` : ''}
            </p>
            <div className={styles.activityActions}>
              <button className={styles.primary} type="submit">
                {!activityDone ? 'Verificar resposta' : trailDone ? 'Voltar ao resumo' : 'Ir para a próxima aula'}
              </button>
              {!activityDone && (
                <button className={styles.secondary} type="button" aria-controls="activity-feedback" onClick={() => setFeedback('hint')}>
                  Pedir dica à Lumi
                </button>
              )}
            </div>
            {!activityDone && <small className={styles.hintNote}>Dica preparada para esta atividade, sem consulta à IA.</small>}
          </form>
        </section>

        <div className={styles.columns} hidden={firstVisit}>
          <section id="trilha" tabIndex={-1} className={styles.panel} aria-labelledby="trail-title">
            <div className={styles.panelHeader}>
              <div><p className={styles.kicker}>Minha trilha</p><h2 id="trail-title">Fundamentos de JavaScript</h2></div>
              <span className={styles.counter}>{completedCount} de {lessons.length} concluídas</span>
            </div>
            <progress className={styles.progress} max={lessons.length} value={completedCount} aria-label="Aulas concluídas na trilha" />
            <ol className={styles.lessons}>
              {lessons.map((lesson, index) => {
                const done = index < completedCount;
                const current = index === completedCount;
                return (
                  <li key={lesson.title} className={current ? styles.current : undefined} aria-current={current ? 'step' : undefined}>
                    <span className={styles.lessonNumber} aria-hidden="true">{done ? '✓' : `0${index + 1}`}</span>
                    <div><strong>{lesson.title}</strong><small>{lesson.topic}</small></div>
                    <span className={styles.lessonStatus}>{done ? 'Concluída' : current ? 'Aula atual' : 'A seguir'}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section id="progresso" tabIndex={-1} className={styles.panel} aria-labelledby="progress-title">
            <p className={styles.kicker}>Progresso nesta prévia</p><h2 id="progress-title">Missão de hoje</h2>
            <p>{missionDone ? 'Concluída: você acertou pelo menos uma atividade.' : 'Acerte uma atividade da trilha para concluir a missão.'}</p>
            <details className={`${styles.optionGroup} ${styles.xpHistory}`}>
              <summary>Extrato de XP <strong>{completedHere.length * xpPerLesson} XP</strong></summary>
              {missionDone ? (
                <ul>
                  {completedHere.map(({ title }) => <li key={title}><span>{title}</span><strong>+{xpPerLesson} XP</strong></li>)}
                </ul>
              ) : <p>Nenhum XP de exemplo nesta sessão.</p>}
            </details>
            <details className={`${styles.optionGroup} ${styles.weekHistory}`}>
              <summary>Semana de exemplo</summary>
              <div>
                <p className={styles.hintNote}>Histórico ilustrativo; não muda com as atividades.</p>
                <ol className={styles.week} aria-label="Dias de prática no exemplo: segunda, quarta e sexta">
                  {exampleWeek.map(({ day, practiced }) => (
                    <li key={day} data-active={practiced}><span aria-hidden="true">{practiced ? '✓' : '–'}</span>{day}</li>
                  ))}
                </ol>
              </div>
            </details>
          </section>
        </div>

        <section id="recursos" tabIndex={-1} className={styles.resources} aria-labelledby="resources-title">
          <h2 id="resources-title">Recursos da plataforma</h2>
          <div className={styles.dashboardCards}>
            {([
              ['trail', 'Cursos e trilhas'],
              ['practice', 'Prática e jogos'],
              ['progress', 'Revisão e classificação'],
              ['career', 'Carreira'],
              ['community', 'Comunidade'],
              ['account', 'Minha conta'],
            ] as const).map(([group, label]) => (
              <details key={group} name="dashboard-resources" className={styles.optionGroup}>
                <summary>{label}</summary>
                <DashboardLinks group={group} />
              </details>
            ))}
          </div>
        </section>
        <footer className={styles.footer}>
          <details className={styles.previewControls} open={firstVisit || undefined}>
            <summary>Opções da prévia</summary>
            <label>
              <input type="checkbox" checked={firstVisit} disabled={!ready} onChange={(event) => {
                setFirstVisit(event.target.checked);
                setPracticing(false);
                setFeedback(null);
                document.getElementById('painel')?.focus();
                document.getElementById('painel')?.scrollIntoView();
              }} />
              Simular primeiro acesso
            </label>
          </details>
          <p>As alterações desta prévia somem ao recarregar e não afetam nenhuma conta.</p>
        </footer>
      </main>
    </div>
  );
}
