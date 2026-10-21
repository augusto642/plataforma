import React from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';

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
        <p className="text-sm text-ink-span font-mono mb-10">Última atualização: 20 de outubro de 2026</p>

        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">1. Quais dados coletamos</h2>
            <p>
              Coletamos os dados necessários para operar a plataforma: (a) <strong className="text-ink-heading">cadastro</strong> —
              nome, e-mail e senha (armazenada de forma protegida, nunca em texto puro); (b) <strong className="text-ink-heading">aprendizado</strong> —
              seu progresso nas trilhas, o código que você submete, os resultados dos testes, suas
              interações com a tutora de IA e, se você fizer o quiz diagnóstico antes de se cadastrar, o
              resultado dele vinculado à sua conta; (c) <strong className="text-ink-heading">origem do cadastro</strong> — parâmetros de
              campanha (UTMs) da página de chegada, para sabermos quais canais trazem alunos; e
              (d) <strong className="text-ink-heading">eventos de uso da página pública</strong> — cliques nos botões de cadastro da nossa
              página inicial, registrados de forma agregada para medir o funil de entrada.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">2. Para que usamos</h2>
            <p>
              Usamos seus dados para: operar sua conta e salvar seu progresso; corrigir seu código e
              gerar seu portfólio; personalizar sua trilha e as dicas da tutora; medir e melhorar a
              plataforma (inclusive a página pública); e enviar comunicações essenciais sobre a conta e
              o serviço. Não vendemos seus dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">3. Compartilhamento</h2>
            <p>
              Compartilhamos dados apenas com prestadores que operam partes do serviço (hospedagem,
              execução de código e, nos planos pagos, processamento de pagamento), sempre no limite do
              necessário. Seu perfil público e portfólio exibem somente o que você optar por tornar
              visível. Podemos divulgar dados quando houver obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">4. Armazenamento local e cookies</h2>
            <p>
              Usamos cookies estritamente necessários para manter sua sessão iniciada com segurança, e
              armazenamento local do navegador para guardar preferências e informações temporárias do
              seu fluxo (como a origem da campanha e o resultado do quiz diagnóstico, que ficam na
              sessão do navegador). Não usamos cookies de publicidade de terceiros nesta página.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">5. Seus direitos (LGPD)</h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar:
              confirmação e acesso aos seus dados; correção de dados incompletos ou desatualizados;
              eliminação dos dados tratados com base no seu consentimento; portabilidade; e informações
              sobre compartilhamentos. Você também pode excluir sua conta — nesse caso, removemos seus
              dados pessoais, ressalvadas as retenções exigidas por lei.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">6. Segurança e retenção</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, como senhas com
              hash, sessões protegidas e ambientes de execução isolados. Mantemos os dados enquanto sua
              conta estiver ativa ou pelo prazo necessário às finalidades descritas e às obrigações
              legais.
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
          <Link href="/#precos" className="hover:text-ink-heading transition-colors">Planos</Link>
          <Link href="/" className="hover:text-ink-heading transition-colors">Página inicial</Link>
        </div>
      </main>
    </div>
  );
}
