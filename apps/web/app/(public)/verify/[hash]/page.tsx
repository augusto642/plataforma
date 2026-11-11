import Link from 'next/link';
import Logo from '../../../components/Logo';

/**
 * B30 (Sprint 10) — verificação pública de certificados, sem fabricação.
 *
 * Antes esta página era client-side e consultava `certificateData.ts`,
 * que GERAVA um certificado "válido" para qualquer hash digitado (aluno
 * fixo, altura de bloco aleatória, "blockchain", "Quantum-Resistant
 * Merkle Tree"). Agora é um Server Component que consulta o registro
 * real da API: GET /courses/certificates/verify/:code só confirma
 * códigos SHA-256 persistidos na emissão do certificado
 * (Enrollment.certificateCode). Código desconhecido = não encontrado.
 */

const API_BASE =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VerifiedCertificate {
  valid: true;
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  completedAt: string | null;
  verificationCode: string;
}

type VerifyResult =
  | { kind: 'found'; record: VerifiedCertificate }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

async function fetchCertificate(code: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `${API_BASE}/courses/certificates/verify/${encodeURIComponent(code)}`,
      { cache: 'no-store' },
    );
    if (res.status === 404) return { kind: 'not-found' };
    if (!res.ok) return { kind: 'unavailable' };
    const record = (await res.json()) as VerifiedCertificate;
    return { kind: 'found', record };
  } catch {
    return { kind: 'unavailable' };
  }
}

export const dynamic = 'force-dynamic';

interface VerifyPageProps {
  params: {
    hash: string;
  };
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const result = await fetchCertificate(params.hash);

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
          {result.kind === 'not-found' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-mono font-bold">
              <span>✕</span>
              <span>Não encontrado</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-5 pt-10">
        {result.kind === 'found' && <FoundCertificate record={result.record} />}
        {result.kind === 'not-found' && <NotFound code={params.hash} />}
        {result.kind === 'unavailable' && <Unavailable />}
      </main>
    </div>
  );
}

function FoundCertificate({ record }: { record: VerifiedCertificate }) {
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

      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6 md:p-8">
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4">
          Certificado de conclusão
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Aluno</div>
            <div className="text-xl font-heading font-black text-white">{record.studentName}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Curso</div>
            <div className="text-base font-heading font-bold text-white">{record.courseTitle}</div>
          </div>
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
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        O código é gerado no momento em que o aluno conclui todas as
        atividades do curso e fica gravado no registro da matrícula. Qualquer
        pessoa com o código pode conferir a autenticidade nesta página.
      </p>
    </div>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div className="space-y-8">
      <div className="bg-[#121217] border border-[#F43F5E]/40 rounded-2xl p-5 md:p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/50 flex items-center justify-center text-2xl text-[#F43F5E] shrink-0">
          ✕
        </div>
        <div>
          <h1 className="text-base font-bold text-white font-heading">
            Certificado não encontrado
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl leading-relaxed">
            Nenhum certificado emitido corresponde ao código informado.
            Isso significa que o código está incorreto ou que nenhum aluno
            concluiu um curso gerando este código — a verificação não
            confirma certificados que não existem.
          </p>
        </div>
      </div>

      <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
          Código consultado
        </div>
        <div className="text-xs font-mono text-zinc-300 break-all bg-[#0B0B10] border border-[#27272A] rounded-lg px-3 py-2">
          {code}
        </div>
        <ul className="mt-5 space-y-2 text-sm text-zinc-400 leading-relaxed">
          <li>• Confira se o código foi copiado por completo (são 64 caracteres hexadecimais).</li>
          <li>• O código aparece no certificado do aluno ao concluir todas as atividades de um curso.</li>
          <li>• Certificados só existem depois da conclusão real — não há emissão manual.</li>
        </ul>
      </div>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="bg-[#121217] border border-[#27272A] rounded-2xl p-5 md:p-6 flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-2xl text-zinc-300 shrink-0">
        !
      </div>
      <div>
        <h1 className="text-base font-bold text-white font-heading">
          Verificação indisponível no momento
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5 max-w-xl leading-relaxed">
          Não foi possível consultar o registro de certificados agora. Isso
          não confirma nem nega a validade do código — tente novamente em
          alguns minutos.
        </p>
      </div>
    </div>
  );
}
