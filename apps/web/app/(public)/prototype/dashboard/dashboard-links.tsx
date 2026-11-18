import Link from 'next/link';
import styles from './student-dashboard.module.css';

type DashboardLink = readonly [title: string, href: `/${string}`, access?: string];

const links = {
  trail: [
    ['Explorar cursos', '/courses'],
    ['Fazer diagnóstico inicial', '/diagnostico'],
    ['Ver trilha recomendada', '/trilha/sugerida'],
    ['Mapa de habilidades', '/diagnostico/mapa', 'Pro ou Carreira'],
  ],
  progress: [
    ['Revisão e reforço', '/revisao'],
    ['Classificação', '/leaderboard'],
    ['Ligas por nível', '/desafios', 'Pro ou Carreira'],
    ['Painel da minha conta', '/dashboard'],
  ],
  practice: [
    ['Resolver desafios', '/desafios'],
    ['Abrir editor', '/ide'],
    ['Playground e projetos livres', '/ide'],
    ['Tutora Lumi no editor', '/ide', 'Grátis no nível Iniciante'],
    ['Revisão de código por IA', '/ide', 'Pro: projetos finais · Carreira: todos'],
    ['Projetos guiados', '/projetos'],
    ['Jogar na Torre', '/torre'],
    ['Guia da Torre', '/conheca-a-torre'],
    ['Aventura RPG', '/game'],
  ],
  community: [
    ['Ler discussões', '/comunidade'],
    ['Publicar e revisar soluções', '/comunidade', 'Pro ou Carreira'],
  ],
  career: [
    ['Simulador de entrevista', '/entrevista', 'Pro ou Carreira'],
    ['Preparação para certificações', '/certificacoes', 'Pro ou Carreira'],
    ['Emitir certificado de curso', '/ide', 'Após cumprir os requisitos do curso'],
    ['Radar de vagas', '/vagas'],
    ['Talent Match', '/talent', 'Destaque exclusivo do Carreira'],
  ],
  account: [
    ['Perfil e portfólio', '/profile'],
    ['Configurações e plano', '/settings'],
    ['Recuperar a senha', '/recuperar-senha'],
  ],
} as const satisfies Record<string, readonly DashboardLink[]>;

export default function DashboardLinks({ group }: { group: keyof typeof links }) {
  const items: readonly DashboardLink[] = links[group];

  return (
    <ul className={styles.dashboardLinks}>
      {items.map(([title, href, access]) => (
        <li key={title}>
          <Link href={href} prefetch={false}>
            <span>{title}{access && <small className={styles.access}>{access}</small>}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
