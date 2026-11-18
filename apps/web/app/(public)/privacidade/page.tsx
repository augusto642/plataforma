import React from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { LEGAL_DOCUMENT_VERSIONS } from '@plataforma/contracts';

// Página legal pública: Política de Privacidade da Nexus Code.
// Texto padrão do produto, alinhado à LGPD — revisar com assessoria
// jurídica antes de qualquer cobrança em escala (ver relatório da
// Sprint 4 restante).
export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-ink-body font-sans antialiased">
      <header className="border-b border-border-1">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo size="md" theme="dark" href="/" />
          <Link href="/" className="text-sm text-ink-span hover:text-ink-heading transition-colors">
            ← Voltar para a página inicial
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink-heading tracking-tight mb-3">
          Política de Privacidade
        </h1>
        <p className="text-sm text-ink-span font-mono mb-10">
          Versão {LEGAL_DOCUMENT_VERSIONS.privacy} · Última atualização: 15 de novembro de 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">1. Quais dados coletamos</h2>
            <p>
              Coletamos dados necessários para operar a plataforma: (a) <strong className="text-ink-heading">cadastro</strong> —
              nome, e-mail e credenciais (a senha é armazenada como hash); (b) <strong className="text-ink-heading">perfil de aprendizagem</strong> —
              objetivos profissionais, experiência, tecnologias escolhidas, diagnóstico e progresso;
              (c) <strong className="text-ink-heading">conteúdo de uso</strong> — código enviado, rascunhos e projetos de código salvos, resultados de testes e interações
              com recursos de IA; e (d) <strong className="text-ink-heading">dados de operação</strong> — informações técnicas necessárias
              para manter a sessão, proteger e diagnosticar o serviço, além de atribuição de campanha
              quando disponível. No cadastro, registramos a confirmação de elegibilidade para o alfa
              (maioridade), sua data e a versão da política, sem solicitar a data completa de nascimento. O quiz
              diagnóstico feito antes do cadastro pode ser associado à conta quando você a cria. No
              acesso convidado ao catálogo de cursos e ao diagnóstico, emitimos um token temporário de
              confirmação, mantido na sessão do navegador e sem associação a uma conta.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">2. Para que usamos</h2>
            <p>
              Usamos os dados para criar e proteger sua conta, salvar o progresso, rascunhos e projetos para acesso em outros dispositivos, avaliar exercícios,
              personalizar trilhas e orientações, disponibilizar recursos de código e IA, prestar suporte
              e manter e melhorar o serviço. Não vendemos dados pessoais. A base legal aplicável pode
              variar conforme a finalidade e deve ser avaliada nos termos da legislação vigente. A
              confirmação de leitura desta Política é separada do aceite dos Termos e não significa, por
              si só, que o consentimento seja a base legal de todo tratamento.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">3. Compartilhamento</h2>
            <p>
              Para prestar os recursos solicitados, dados e conteúdo enviados podem ser processados por
              prestadores de hospedagem, execução de código e inteligência artificial; dados de pagamento
              também podem ser tratados por prestadores específicos quando esse recurso estiver disponível.
              O compartilhamento deve se limitar ao necessário para cada serviço e observar os contratos
              aplicáveis. Seu perfil público exibe somente as informações que você optar por tornar
              visíveis. Também podemos divulgar dados quando houver obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">4. Armazenamento local e cookies</h2>
            <p>
              Usamos cookies estritamente necessários para manter sua sessão iniciada com segurança, e
              armazenamento local do navegador para guardar preferências e informações temporárias do
              seu fluxo (como a origem da campanha, o resultado do quiz diagnóstico e a confirmação de
              elegibilidade para o catálogo e o diagnóstico, que ficam na sessão do navegador). Não
              usamos cookies de publicidade de terceiros nesta página.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">5. Seus direitos (LGPD)</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar:
              confirmação e acesso aos seus dados; correção de dados incompletos ou desatualizados;
              eliminação dos dados tratados com base no seu consentimento; portabilidade; e informações
              sobre compartilhamentos. Você também pode excluir sua conta — nesse caso, removemos seus
              dados pessoais, inclusive rascunhos e projetos salvos, ressalvadas as retenções exigidas por lei.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">6. Segurança e retenção</h2>
            <p>
              Adotamos medidas técnicas e organizacionais compatíveis com o serviço, incluindo
              armazenamento de senhas como hash e proteção de sessão. O código e as interações enviados
              e os rascunhos e projetos salvos podem conter dados incluídos por você; não envie senhas, chaves, dados pessoais de terceiros
              ou informações confidenciais. Mantemos os dados pelo tempo necessário às finalidades
              informadas e às obrigações legais. Prazos específicos de retenção e exclusão devem ser
              confirmados antes da abertura pública do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">7. Alterações e contato</h2>
            <p>
              Atualizações relevantes desta política serão comunicadas na plataforma ou por e-mail.
              Para exercer seus direitos ou tirar dúvidas sobre privacidade, use os canais oficiais
              dentro da plataforma.
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-border-1 flex items-center gap-6 text-sm font-mono text-ink-span">
          <Link href="/termos" className="hover:text-ink-heading transition-colors">Termos de Uso</Link>
          <Link href="/politica-de-idade" className="hover:text-ink-heading transition-colors">Política de idade</Link>
          <Link href="/#precos" className="hover:text-ink-heading transition-colors">Planos</Link>
          <Link href="/" className="hover:text-ink-heading transition-colors">Página inicial</Link>
        </div>
      </main>
    </div>
  );
}
