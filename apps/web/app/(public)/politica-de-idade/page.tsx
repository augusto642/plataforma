import React from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { AGE_ELIGIBILITY_POLICY_VERSION } from '@plataforma/contracts';

export default function PoliticaDeIdadePage() {
  return (
    <div className="min-h-screen bg-background text-ink-body font-sans antialiased">
      <header className="border-b border-border-1">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo size="md" theme="dark" href="/" />
          <Link href="/register" className="text-sm text-ink-span hover:text-ink-heading transition-colors">
            Voltar ao cadastro
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-ink-heading tracking-tight mb-3">
          Política de idade do alfa
        </h1>
        <p className="text-sm text-ink-span font-mono mb-10">
          Versão {AGE_ELIGIBILITY_POLICY_VERSION} · Última atualização: 15 de novembro de 2026
        </p>

        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">1. Quem pode participar</h2>
            <p>
              Durante o alfa externo, a Nexus Code é destinada exclusivamente a pessoas com 18 anos ou
              mais. Menores de 18 anos não podem criar uma conta nem participar desta etapa, mesmo com
              autorização de pais ou responsáveis. Essa restrição é temporária e poderá ser revista
              depois de avaliação jurídica e da implementação das salvaguardas necessárias.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">2. Confirmação de idade</h2>
            <p>
              No cadastro, pedimos que você confirme que tem 18 anos ou mais. Para evitar coletar a data
              completa de nascimento, registramos somente a confirmação, a data e a versão desta
              política. No modo convidado, a confirmação para acessar o catálogo ou o diagnóstico gera
              um token temporário guardado apenas na sessão atual do navegador, sem associação a uma
              conta. Essa autodeclaração não verifica a idade real nem substitui controles adicionais
              que possam ser definidos após a revisão do piloto.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">3. Se a confirmação estiver incorreta</h2>
            <p>
              Se identificarmos que uma conta do alfa pertence a alguém menor de 18 anos, poderemos
              suspender o acesso ao piloto e tratar os dados associados conforme a Política de
              Privacidade e as obrigações legais aplicáveis. Para comunicar uma situação desse tipo,
              use os canais de contato da plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-ink-heading mb-2">4. Revisão antes de ampliar o acesso</h2>
            <p>
              A participação de menores não será habilitada apenas com uma autorização no cadastro.
              Qualquer mudança desta regra depende de avaliação jurídica, definição das bases legais,
              transparência adequada a cada faixa etária e salvaguardas para os dados e recursos de
              código e inteligência artificial. Esta é uma política operacional do alfa e não substitui
              a revisão jurídica, que continua pendente antes da abertura externa.
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-border-1 flex items-center gap-6 text-sm font-mono text-ink-span">
          <Link href="/termos" className="hover:text-ink-heading transition-colors">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-ink-heading transition-colors">Política de Privacidade</Link>
          <Link href="/" className="hover:text-ink-heading transition-colors">Página inicial</Link>
        </div>
      </main>
    </div>
  );
}
