import React from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';

// Página legal pública: Termos de Uso da Nexus Code.
// Texto padrão do produto — revisar com assessoria jurídica antes de
// qualquer cobrança em escala (ver relatório da Sprint 4 restante).
export default function TermosPage() {
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
          Termos de Uso
        </h1>
        <p className="text-sm text-ink-span font-mono mb-10">Última atualização: 20 de outubro de 2026</p>

        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">1. O que é a Nexus Code</h2>
            <p>
              A Nexus Code é uma plataforma de ensino de programação na qual o aluno aprende escrevendo
              código em um ambiente executável no navegador, com correção automática por testes e uma
              tutora de inteligência artificial que orienta por meio de perguntas e dicas. Ao criar uma
              conta ou usar a plataforma, você concorda com estes Termos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">2. Sua conta</h2>
            <p>
              Para usar a plataforma, você cria uma conta com nome e e-mail válidos e uma senha de sua
              responsabilidade. Você é responsável pelas atividades realizadas na sua conta e deve
              manter suas credenciais em sigilo. Avise-nos pelos canais oficiais da plataforma se
              suspeitar de uso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">3. Planos: gratuito e pagos</h2>
            <p>
              O nível Iniciante é gratuito e inclui desafios fundamentais, a tutora de IA nesse nível e
              um portfólio público com os seus projetos. Os planos pagos (Pro e Staff) ampliam o acesso
              a trilhas, recursos e limites, conforme descrito na página de planos no momento da
              contratação. Assinaturas podem ser canceladas a qualquer momento, sem multa; o acesso ao
              plano pago permanece até o fim do período já contratado.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">4. Uso aceitável</h2>
            <p>
              Você concorda em não: (a) tentar acessar contas, sistemas ou dados de terceiros sem
              autorização; (b) usar o ambiente de execução para fins estranhos ao aprendizado, como
              mineração, ataques ou hospedagem de conteúdo ilícito; (c) reproduzir ou revender o
              conteúdo da plataforma sem autorização; (d) burlar limites técnicos dos planos. O descumprimento
              pode levar à suspensão da conta.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">5. O código que você escreve</h2>
            <p>
              O código que você cria na plataforma é seu. Ao submetê-lo, você nos autoriza a executá-lo,
              corrigi-lo e registrá-lo no seu histórico e no seu portfólio — inclusive nos repositórios
              gerados pela plataforma — apenas para operar e melhorar o serviço. Certificados e
              registros de evidência exibem apenas o que você tornar público no seu perfil.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">6. Disponibilidade e responsabilidade</h2>
            <p>
              Trabalhamos para manter a plataforma disponível e correta, mas o serviço é fornecido
              &quot;como está&quot;: não garantimos disponibilidade ininterrupta nem resultados específicos de
              aprendizado ou empregabilidade. Na máxima extensão permitida pela lei, nossa
              responsabilidade limita-se ao valor pago pelo plano nos últimos 12 meses, quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">7. Alterações destes Termos</h2>
            <p>
              Podemos atualizar estes Termos; mudanças relevantes serão comunicadas na plataforma ou
              por e-mail com antecedência razoável. O uso continuado após a vigência das mudanças
              significa concordância com a nova versão.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">8. Contato e lei aplicável</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas pelos canais oficiais dentro da plataforma.
              Estes Termos são regidos pelas leis do Brasil, e fica eleito o foro do domicílio do
              consumidor para dirimir conflitos, quando aplicável.
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-border-1 flex items-center gap-6 text-sm font-mono text-ink-span">
          <Link href="/privacidade" className="hover:text-ink-heading transition-colors">Política de Privacidade</Link>
          <Link href="/#precos" className="hover:text-ink-heading transition-colors">Planos</Link>
          <Link href="/" className="hover:text-ink-heading transition-colors">Página inicial</Link>
        </div>
      </main>
    </div>
  );
}
