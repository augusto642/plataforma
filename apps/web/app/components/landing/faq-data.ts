/* B44 (Sprint 15) — fonte textual das perguntas e respostas do FAQ
   para o JSON-LD (FAQPage) da home, gerado em StructuredData.tsx.
   O texto aqui é o ESPELHO EXATO, em texto puro, do que a FaqSection
   exibe (lá as respostas têm trechos destacados em <span>; aqui os
   trechos são concatenados). Se uma pergunta ou resposta mudar na
   FaqSection, mude aqui também — dado estruturado divergente do
   conteúdo visível é pior do que nenhum dado estruturado. */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Preciso instalar algo na minha máquina para começar?',
    answer:
      'Não. Todo o ambiente roda em containers Linux isolados diretamente no seu navegador. Você só precisa de uma conexão à internet para escrever, compilar e rodar testes nas linguagens da plataforma: Java, JavaScript, TypeScript, Python e Portugol.',
  },
  {
    question: 'Qual a diferença entre a NEXUS CODE e cursos em vídeo?',
    answer:
      'Nas plataformas tradicionais você passa a maior parte do tempo assistindo passivamente a vídeos longos. Na NEXUS CODE você passa a maior parte do tempo escrevendo código e corrigindo testes, exatamente o que molda o programador contratado pelo mercado.',
  },
  {
    question: 'Sou iniciante absoluto. Vou conseguir acompanhar?',
    answer:
      'Sim, com certeza! A plataforma foi desenhada para quem nunca escreveu uma linha de código. Você começa aprendendo lógica básica e sintaxe elementar, com feedback passo a passo até construir projetos completos.',
  },
  {
    question: 'Preciso ter faculdade ou saber matemática avançada?',
    answer:
      'Não! Você não precisa de diploma na área nem de fórmulas complexas. O raciocínio lógico é construído de forma prática, visual e gradual, resolvendo problemas reais no terminal desde o primeiro dia.',
  },
  {
    question: 'Como funciona o feedback quando meu código dá erro?',
    answer:
      'Nossa tutoria socrática lê a mensagem de erro e o seu código, reconhece o padrão do problema e aponta pistas e perguntas reflexivas, em vez de dar a resposta pronta. Isso desenvolve seu raciocínio real de debugging.',
  },
  {
    question: 'Como os projetos e certificados me ajudam a conseguir vagas?',
    answer:
      'Ao se matricular em um curso, você ganha um repositório Git real no seu nome. Seus projetos e certificados — com código de verificação SHA-256 que qualquer pessoa pode conferir publicamente — ficam no seu portfólio. É assim que você prova capacidade técnica para recrutadores: com código e certificados verificáveis, não com promessas.',
  },
  {
    // B51/P4 (Sprint 16) — FAQ de dinheiro: responde com o estado
    // REAL de hoje (sem cobrança ativa) e com a regra que valerá
    // para os planos pagos — a garantia é o piso do CDC, art. 49,
    // não uma concessão inventada.
    question: 'Preciso pagar para começar? Como funcionam os pagamentos hoje?',
    answer:
      'Não. O cadastro e o nível Iniciante são gratuitos. E, hoje, nenhuma cobrança é feita na plataforma: os planos pagos exibidos na página de preços ainda não têm cobrança ativa. Quando a cobrança entrar no ar, ela será anunciada com antecedência, pelos preços exatamente como exibidos.',
  },
  {
    question: 'Se eu assinar um plano pago, tenho garantia? Posso cancelar?',
    answer:
      'Sim. Quando os planos pagos entrarem no ar, vale a regra do Código de Defesa do Consumidor (art. 49): compras feitas pela internet têm 7 dias de desistência com reembolso integral, sem precisar justificar. E o cancelamento é feito por você, direto na sua conta — sem precisar falar com ninguém e sem multa.',
  },
];
