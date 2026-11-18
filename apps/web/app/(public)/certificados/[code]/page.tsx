import Link from 'next/link';
import Image from 'next/image';
import Logo from '../../../components/Logo';
import { CertificateHoloBadge3D } from './components/CertificateHoloBadge3D';
import {
  certificateVerificationUrl,
  createCertificateQrDataUrl,
} from '../../../lib/certificates';

/**
 * Fase 1 premium (desenho §2.5) — página pública de verificação de
 * certificado, reutilizando o layout de (public)/verify/[hash].
 * Consulta o registro real da API: GET /certificates/verify/:code
 * (Certificate primeiro, Enrollment como fallback; revogado ou
 * desconhecido = não encontrado, sem vazar o motivo).
 * O botão "Adicionar ao LinkedIn" é só um link montado no front, sem
 * SDK e sem post automático. Nenhum texto promete "reconhecido pelo
 * MEC" ou emprego: a credibilidade vem da verificação.
 */

const API_BASE =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
/**
 * Ressalva R1 do QA da Fase 1: alinhar com a variável canônica de URL
 * pública. `WEB_PUBLIC_URL` é a canônica (definida em .env.example e
 * usada pela API no checkout); `NEXT_PUBLIC_WEB_URL` segue como fallback
 * para deploys do web que só expõem variáveis NEXT_PUBLIC_*. Esta página
 * é server component, então ler `WEB_PUBLIC_URL` aqui é seguro — nada
 * disso vaza para o bundle do cliente.
 */
const WEB_BASE =
  process.env.WEB_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_WEB_URL ||
  'http://localhost:3001';

interface VerifiedCertificate {
  valid: true;
  studentName: string;
  title: string;
  courseTitle?: string;
  kind?: string;
  completedAt: string | null;
  verificationCode: string;
}

type VerifyResult =
  | { kind: 'found'; record: VerifiedCertificate }
  | { kind: 'revoked' }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

async function fetchCertificate(code: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `${API_BASE}/certificates/verify/${encodeURIComponent(code)}`,
      { cache: 'no-store' },
    );
    if (res.status === 404) {
      const status = await fetch(
        `${API_BASE}/certificates/status/${encodeURIComponent(code)}`,
        { cache: 'no-store' },
      );
      if (status.status === 404) return { kind: 'not-found' };
      if (!status.ok) return { kind: 'unavailable' };
      const body: { valid: boolean } = await status.json();
      return body.valid === false ? { kind: 'revoked' } : { kind: 'unavailable' };
    }
    if (!res.ok) return { kind: 'unavailable' };
    const record = (await res.json()) as VerifiedCertificate;
    return { kind: 'found', record };
  } catch {
    return { kind: 'unavailable' };
  }
}

export const dynamic = 'force-dynamic';

interface CertificadosPageProps {
  params: Promise<{
    code: string;
  }>;
}

function linkedInUrl(record: VerifiedCertificate): string {
  const issued = record.completedAt ? new Date(record.completedAt) : null;
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: record.title,
    organizationName: 'Nexus Code',
    certificationUrl: certificateVerificationUrl(WEB_BASE, record.verificationCode),
  });
  if (issued) {
    params.set('issueYear', String(issued.getUTCFullYear()));
    params.set('issueMonth', String(issued.getUTCMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default async function CertificadoVerifyPage({ params }: CertificadosPageProps) {
  const { code } = await params;
  const result = await fetchCertificate(code);

  return (
    <div className="min-h-screen bg-[#08080B] text-[#EDEDED] font-sans pb-24">
      <header className="sticky top-0 z-40 bg-[#08080B]/90 backdrop-blur-md border-b border-[#27272A] h-16 print:hidden">
        <div className="max-w-[1240px] mx-auto px-5 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="md" href="/" />
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
              <Link href="/courses" className="text-zinc-400 hover:text-white transition-colors">
                Cursos
              </Link>
              <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                Leaderboard
              </Link>
            </nav>
          </div>
          {result.kind === 'found' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#04D361]/10 border border-[#04D361]/30 text-[#04D361] text-xs font-mono font-bold">
              <span>✓</span>
              <span>Certificado Válido</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-5 pt-10">
        {result.kind === 'found' && (
          <FoundCertificate record={result.record} />
        )}
        {result.kind === 'not-found' && (
          <div className="bg-[#121217] border border-[#F43F5E]/40 rounded-2xl p-6">
            <h1 className="text-base font-bold text-white font-heading">
              Certificado não encontrado
            </h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Nenhum certificado emitido corresponde ao código informado.
              Confira se o código foi copiado por completo (são 64 caracteres
              hexadecimais).
            </p>
          </div>
        )}
        {result.kind === 'revoked' && (
          <div className="bg-[#121217] border border-[#F43F5E]/40 rounded-2xl p-6">
            <h1 className="text-base font-bold text-white font-heading">Certificado revogado</h1>
            <p className="text-xs text-zinc-400 mt-2">Este certificado não é mais válido.</p>
          </div>
        )}
        {result.kind === 'unavailable' && (
          <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
            <h1 className="text-base font-bold text-white font-heading">
              Verificação indisponível no momento
            </h1>
            <p className="text-xs text-zinc-400 mt-2">
              Não foi possível consultar o registro de certificados agora.
              Isso não confirma nem nega a validade do código — tente novamente
              em alguns minutos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

async function FoundCertificate({ record }: { record: VerifiedCertificate }) {
  const certificateUrl = certificateVerificationUrl(WEB_BASE, record.verificationCode);
  const qrDataUrl = await createCertificateQrDataUrl(certificateUrl);
  const completedAt = record.completedAt
    ? new Date(record.completedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="space-y-8">
      <div className="bg-[#121217] border border-[#04D361]/40 rounded-2xl p-5 md:p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#04D361]/20 border border-[#04D361]/50 flex items-center justify-center text-2xl text-[#04D361] shrink-0">
          ✓
        </div>
        <div>
          <h1 className="text-base font-bold text-white font-heading">
            Certificado verificado
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl leading-relaxed">
            Este código corresponde a um certificado emitido pela Nexus Code e
            registrado na plataforma. A verificação confirma a existência do
            registro — sem blockchain, sem intermediários: é o banco de dados
            da plataforma respondendo pela emissão.
          </p>
        </div>
      </div>

      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="flex-1 space-y-4 w-full">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">
            Certificado de conclusão
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Aluno</div>
            <div className="text-xl font-heading font-black text-white">{record.studentName}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Curso</div>
            <div className="text-base font-heading font-bold text-white">{record.title}</div>
          </div>
          {record.kind && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tipo</div>
              <div className="text-sm text-zinc-200">
                {record.kind === 'module' ? 'Módulo' : record.kind === 'track' ? 'Trilha' : 'Projeto'}
              </div>
            </div>
          )}
          {completedAt && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Concluído em
              </div>
              <div className="text-sm text-zinc-200">{completedAt}</div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Código de verificação (SHA-256)
            </div>
            <div className="text-xs font-mono text-zinc-300 break-all bg-[#0B0B10] border border-[#27272A] rounded-lg px-3 py-2 mt-1">
              {record.verificationCode}
            </div>
          </div>

          <a
            href={linkedInUrl(record)}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-6 px-4 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-xs"
          >
            Adicionar ao LinkedIn
          </a>
        </div>

        {/* Emblema Holográfico 3D Three.js */}
        <div className="shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0B0B10] border border-[#27272A] shadow-xl">
          <CertificateHoloBadge3D code={record.verificationCode} />
          <span className="text-[10px] font-mono text-[#F59E0B] mt-2 font-bold tracking-wider uppercase">
            Selo 3D de Autenticidade
          </span>
          <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
            Quality Gate SonarQube Pass
          </span>
          <div className="mt-4 rounded-xl bg-white p-2">
            <Image
              src={qrDataUrl}
              alt="QR code para verificar este certificado"
              width={192}
              height={192}
              unoptimized
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-400 mt-1 text-center">
            Escaneie para validar
          </span>
        </div>
      </div>
    </div>
  );
}
