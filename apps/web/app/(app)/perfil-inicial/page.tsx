'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CAREER_GOALS, CAREER_GOAL_LABELS, type CareerGoal, type ExperienceLevel, type WeeklyTimeCommitment } from '@plataforma/contracts';
import { useAuth } from '../../context/AuthContext';
import { sendLearningProfile, type LearningProfileRequest } from './learning-profile';
import styles from './profile.module.css';

export default function InitialProfilePage() {
  const { user, isLoading, refreshSession } = useAuth();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Nexus Code — início">
          <Image src="/nexus-home/logo.svg" alt="Nexus Code" width={165} height={40} priority />
        </Link>
      </header>
      <main className={styles.grid}>
        <section className={styles.story} aria-labelledby="story-title">
          <p className={styles.tag}>Seu ponto de partida</p>
          <h2 id="story-title">Aprenda no <span>seu ritmo.</span></h2>
          <p>Conte um pouco sobre você e escolha como quer começar. Você também pode pular esta etapa.</p>
          <ol className={styles.steps} aria-label="Ciclo de prática">
            <li><span>01</span> Escreva</li>
            <li><span>02</span> Teste</li>
            <li><span>03</span> Ajuste</li>
          </ol>
        </section>
        <section className={styles.card} aria-labelledby="profile-title">
          {isLoading ? (
            <div className={styles.body}>
              <h1 id="profile-title">Seu perfil de aprendizagem</h1>
              <p role="status">Verificando sua sessão…</p>
            </div>
          ) : !user ? (
            <div className={styles.body}>
              <h1 id="profile-title">Seu perfil de aprendizagem</h1>
              <p>Não foi possível identificar sua conta. Entre para preencher seu perfil.</p>
              <Link className={styles.primary} href="/login">Entrar na conta</Link>
            </div>
          ) : (
            <ProfileForm key={user.id} refreshSession={refreshSession} />
          )}
        </section>
      </main>
    </div>
  );
}

function ProfileForm({ refreshSession }: { refreshSession: () => Promise<void> }) {
  const router = useRouter();
  const [goal, setGoal] = useState<CareerGoal | ''>('');
  const [experience, setExperience] = useState<ExperienceLevel | ''>('');
  const [time, setTime] = useState<WeeklyTimeCommitment | ''>('');
  const [pending, setPending] = useState<'save' | 'skip' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  function clearStatus() {
    setMessage('');
    setError('');
  }

  async function complete(body: LearningProfileRequest, action: 'save' | 'skip') {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(action);
    clearStatus();
    try {
      await sendLearningProfile(body);
    } catch {
      setError(action === 'save'
        ? 'Não foi possível salvar seu perfil. Confira sua conexão e tente novamente ou pule esta etapa.'
        : 'Não foi possível pular esta etapa. Confira sua conexão e tente novamente.');
      inFlight.current = false;
      setPending(null);
      return;
    }
    setMessage(action === 'save' ? 'Perfil salvo. Atualizando sua sessão…' : 'Etapa dispensada. Atualizando sua sessão…');
    try {
      await refreshSession();
      router.replace(action === 'save' ? '/dashboard' : '/desafios');
    } catch {
      setError('Sua escolha foi registrada, mas não foi possível atualizar a sessão. Entre novamente para continuar.');
      inFlight.current = false;
      setPending(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal || !experience || !time) return;
    void complete({ careerGoal: goal, experienceLevel: experience, weeklyTimeCommitment: time }, 'save');
  }

  return (
    <div className={styles.body}>
      <p className={styles.tag}>Perfil de aprendizagem · opcional</p>
      <h1 id="profile-title">Por onde quer começar?</h1>
      <p className={styles.description}>Escolha seu objetivo, experiência e tempo disponível por semana.</p>
      <p className={styles.notice}>Suas escolhas serão registradas na sua conta. Se preferir, pule e vá direto praticar.</p>
      <form className={styles.form} onSubmit={submit} aria-busy={Boolean(pending)}>
        <label htmlFor="learning-goal">Qual é seu objetivo?
          <select id="learning-goal" required value={goal} disabled={Boolean(pending)} onChange={(event) => { setGoal(event.target.value as CareerGoal | ''); clearStatus(); }}>
            <option value="">Selecione um objetivo</option>
            {CAREER_GOALS.map((option) => <option key={option} value={option}>{CAREER_GOAL_LABELS[option]}</option>)}
          </select>
        </label>
        <label htmlFor="learning-experience">Qual é sua experiência?
          <select id="learning-experience" required value={experience} disabled={Boolean(pending)} onChange={(event) => { setExperience(event.target.value as ExperienceLevel | ''); clearStatus(); }}>
            <option value="">Selecione sua experiência</option>
            <option value="beginner">Estou começando</option>
            <option value="junior">Júnior</option>
            <option value="mid">Pleno</option>
            <option value="senior">Sênior</option>
          </select>
        </label>
        <label htmlFor="learning-time">Quanto tempo por semana?
          <select id="learning-time" required value={time} disabled={Boolean(pending)} onChange={(event) => { setTime(event.target.value as WeeklyTimeCommitment | ''); clearStatus(); }}>
            <option value="">Selecione o tempo disponível</option>
            <option value="5h">5 horas</option>
            <option value="10h">10 horas</option>
            <option value="20h">20 horas</option>
          </select>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.status} role="status" aria-live="polite">{message || (pending === 'save' ? 'Salvando seu perfil…' : pending === 'skip' ? 'Registrando sua escolha…' : '')}</p>
        <button className={styles.primary} type="submit" disabled={Boolean(pending)}>{pending === 'save' ? 'Salvando…' : 'Salvar e continuar'}</button>
        <button className={styles.secondary} type="button" disabled={Boolean(pending)} onClick={() => void complete({ skipped: true }, 'skip')}>Pular e ir praticar <span aria-hidden="true">↗</span></button>
      </form>
    </div>
  );
}
