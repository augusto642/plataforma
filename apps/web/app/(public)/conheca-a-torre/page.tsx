import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './tower-guide.module.css';

export const metadata: Metadata = {
  title: 'Torre de Desafios | Nexus Code',
  description: 'Veja como jogar e quais desafios você encontra na Torre da Nexus Code.',
};

const challenges = [
  { title: 'Desafios de código', text: 'Escreva uma solução para o problema da casa e envie o código para avaliação.', art: 'code' },
  { title: 'Perguntas e minijogos', text: 'Escolha a resposta certa, encontre um erro em um trecho de código ou complete uma lacuna.', art: 'quiz' },
  { title: 'Guardião do andar', text: 'A casa 30 guarda o desafio final de código. Vença para concluir o andar.', art: 'guardian' },
] as const;

function ChallengeArt({ kind }: { kind: (typeof challenges)[number]['art'] }) {
  return (
    <svg aria-hidden="true" className={styles.diagram} viewBox="0 0 280 116" fill="none">
      {kind === 'code' ? (
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="68" y="21" width="144" height="74" rx="8" opacity=".45" />
          <path d="M68 39h144M120 54l-14 12 14 12m40-24 14 12-14 12m-12-27-15 30" />
        </g>
      ) : kind === 'quiz' ? (
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {[26, 50, 74].map(y => (
            <g key={y} opacity={y === 50 ? 1 : .45}>
              <rect x="86" y={y} width="108" height="17" rx="4" />
              <path d={y === 50 ? 'm96 58 4 4 6-7m10 3h64' : `M97 ${y + 8}h8m11 0h64`} />
            </g>
          ))}
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
          <path d="m140 22 36 11v22c0 19-16 31-36 39-20-8-36-20-36-39V33z" opacity=".55" />
          <text x="140" y="67" textAnchor="middle" fill="currentColor" stroke="none" fontSize="27" fontWeight="700">30</text>
        </g>
      )}
    </svg>
  );
}

export default function TowerGuidePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="Nexus Code — início">
          <Image src="/nexus-home/logo.svg" alt="Nexus Code" width={165} height={40} />
        </Link>
        <Link href="/#torre">Voltar ao início</Link>
      </header>

      <section className={styles.hero} aria-labelledby="tower-title">
        <div>
          <h1 id="tower-title">Torre de Desafios</h1>
          <p>Role o dado, avance pelo tabuleiro e resolva desafios de programação até chegar ao guardião da casa 30.</p>
        </div>
        <Image
          className={styles.tower}
          src="/nexus-home/torre-blocos.svg"
          alt="Ilustração da Torre: blocos verdes e roxos empilhados em andares."
          width={520}
          height={620}
        />
      </section>

      <section className={styles.section} aria-labelledby="tower-rules">
        <h2 id="tower-rules">Como jogar</h2>
        <ol className={styles.steps}>
          <li><strong>Role o dado</strong><p>O resultado define quantas casas você avança no tabuleiro.</p></li>
          <li><strong>Resolva o desafio da casa</strong><p>Se errar ou o tempo acabar, você pode recuar. Algumas casas também concedem itens que ajudam na partida.</p></li>
          <li><strong>Chegue à casa 30</strong><p>Resolva o desafio do guardião para concluir o andar.</p></li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="tower-challenges">
        <h2 id="tower-challenges">O que você vai encontrar</h2>
        <div className={styles.cards}>
          {challenges.map(challenge => (
            <article key={challenge.art} className={styles.card}>
              <ChallengeArt kind={challenge.art} />
              <h3>{challenge.title}</h3>
              <p>{challenge.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
