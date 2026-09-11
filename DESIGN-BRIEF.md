# Briefing de Design — Plataforma de Ensino de Programação

> Documento para orientar um modelo/ferramenta de IA na criação do design (UI/UX) da plataforma.

## 1. Visão geral

LMS (Learning Management System) para **ensinar programação com prática executável**, feedback automático de testes e tutoria de IA socrática. Aluno escreve código no navegador, executa num sandbox isolado (Piston), recebe resultado dos testes, nota, XP e dicas de IA. Instrutores criam cursos/atividades e acompanham relatórios. Empresas-parceiras acessam um ranking de talentos.

- **Idioma da interface:** português (pt-BR) em todos os textos.
- **Público:** estudantes de programação (iniciantes a intermediários), instrutores, administradores, e (indiretamente) empresas de recrutamento.
- **Stack do front:** Next.js (App Router). Hoje: tema escuro, estilos inline, sem framework CSS — o redesign é livre para propor design system (ex.: Tailwind + shadcn/ui).
- **Marca:** nome "Plataforma LMS" configurável por env (`NEXT_PUBLIC_BRAND_NAME`), logo fallback "⚡". Prever placeholder de logo/nome.

## 2. Papéis (roles)

| Papel | Pode fazer |
|---|---|
| **Aluno (student)** | Praticar atividades, executar/enviar código, usar tutor IA, ver progresso/ranking/badges, entrar em curso por código, configurar repo Git, emitir certificado, exportar/excluir conta (LGPD) |
| **Instrutor (instructor)** | Criar cursos e atividades (com testes pública/ocultos), gerenciar turma (código de matrícula, matrículas), copiar atividades da Biblioteca Pública, ver lista de alunos + relatórios individuais + analytics do curso, ver ranking |
| **Admin** | Tudo do instrutor + CRUD de usuários, Portal de Talentos (empresas + tokens), métricas operacionais |

Auto-cadastro permite escolher perfil "Aluno" ou "Instrutor" — nunca admin.

## 3. Arquitetura de telas proposta

O protótipo atual é **single-page com troca de estado no cliente**. Recomenda-se estrutura em rotas:

### Público / Auth
1. **Landing / Login** — abas "Entrar" / "Cadastrar"; tagline: "Ensino de programação com execução em sandbox e tutoria socrática de IA". Campos: login (e-mail, senha); cadastro (nome, perfil Aluno/Instrutor, e-mail, senha). Erros inline + estado de loading.

### Aluno (app)
2. **Dashboard** — cursos matriculados com barra de %, "Desafio do Dia" (CTA), streak 🔥, nível/XP, últimos envios.
3. **Espaço de prática (tela mais importante)** — 3 regiões:
   - **Coluna esquerda:** título da atividade, badge de linguagem, enunciado, caixa de instruções (💡), histórico de envios.
   - **Centro/direita:** editor de código (Monaco, tema vs-dark) com barra de status (arquivo `solution.js|py|ts|java`, botão "Formatar Código", CTA verde "▶ Executar Código").
   - **Painel de resultado da avaliação** (abaixo do enunciado ou como painel):
     - Estados: `queued/running` ("⏳ Executando testes no Sandbox isolado..."), `passed` (banner verde "✓ Todos os testes passaram!"), `failed` (banner vermelho "✗ Falha em testes de validação"), `error`.
     - Nota `{score}/100`, duração em ms.
     - **Cards por teste:** nome, PASSED/FAILED, mensagem de erro; testes ocultos aparecem mascarados (só nome/passed/duração).
     - Em falha: botões "🔍 Análise por Linha" (comentários por linha: warning âmbar, info cinza) e "🤖 Dica Socrática" (bloco "Tutor IA — conceito sugerido" + dicas numeradas; a IA nunca dá a resposta pronta).
     - Em aprovação: "💡 Ver Solução de Referência" (toggle de código inline).
4. **Painel do Tutor IA** — drawer lateral direito (~380px): chat socrático por atividade, histórico persistente, indicador "Tutor pensando...", input + "Enviar", fechar por ✕/Esc.
5. **Meu Progresso (modal ou página)** — tiles: XP Total, Nível, Dias Seguidos (streak), Atividades Concluídas, Média de Nota; lista de **Conquistas (badges)**; barras de progresso por curso ("x de y atividades").
6. **Ranking (por curso)** — 🥇🥈🥉, nome (usuário atual destacado "(Você)"), nível, atividades concluídas, streak 🔥, XP, primeira badge.
7. **Git integration** — "🔗 Configurar Git": provisiona repo privado Gitea `{courseSlug}-{username}`; exibir repo, URL de clone e instruções ("push em main/master dispara correção automática").
8. **Certificado** — "🎓 Emitir Certificado" (exige 100% das atividades aprovadas); HTML verificável com código sha256.
9. **Conta / Configurações** — visibilidade no Portal de Talentos (opt-out LGPD — **ainda sem UI, precisa ser desenhada**), exportar dados, excluir conta.

### Instrutor
10. **Novo curso** — título, slug, descrição; gera **código de matrícula** de 8 caracteres (revelar/regenerar, chip copiável "🔑 Código da Turma").
11. **Nova atividade** — título, linguagem (JS/Python/TS/Java), slug, enunciado, código inicial, **testes públicos** e **testes ocultos** (editores de código), tags de conceito.
12. **📚 Biblioteca de Problemas (modal)** — atividades de cursos públicos; filtro por chips de conceito ("Todos" + tags); cards com título/linguagem/tags/descrição; ação "Copiar para o curso".
13. **📊 Relatórios** — lista de alunos matriculados → relatório por aluno: tiles Submissões / Aprovadas / Nota média / Tempo total + linhas por atividade (chips: Aprovada / Reprovada / Erro / Não iniciada; tentativas, melhor nota, último envio). Analytics do curso: taxa de aprovação por atividade.

### Admin
14. **🏢 Portal de Talentos** — CRUD de empresas (nome; token gerado **uma vez** com botão copiar + aviso "Copie agora, não será exibido novamente"; exclusão com confirmação de revogação imediata); copiar URL do leaderboard público `/leaderboard/{courseId}`; explicar no rodapé o acesso via header `x-company-token` e o opt-out LGPD dos alunos.
15. **Página pública de leaderboard de talentos** (rota `/leaderboard/:courseId`, consumida por empresas via token) — **implementação inexistente, precisa de design**: ranking anonimizado (iniciais, nome, XP, nível, streak, atividades concluídas).
16. **Admin de usuários** — lista/criação/remoção de usuários.

## 4. Componentes / primitivos necessários

- Topbar fixa (~60px): logo, badge de role, ações contextuais por papel, e-mail do usuário, "Sair".
- Sidebar esquerda (~280px): "Cursos Disponíveis" + "Exercícios do Módulo" (lista numerada com chip de linguagem); seções extras para aluno (Git, certificado, "Entrar com Código" com placeholder "Ex.: ALGO2024").
- Editor de código Monaco embarcado.
- Chat drawer (IA) acessível (aria-live).
- Modais centralizados com backdrop + Esc; estados de loading/erro/vazio em cada superfície.
- Empty states: "Selecione uma atividade para começar a praticar." / 'Clique em "Executar Código" para rodar seus testes no ambiente seguro.' / "Nenhum curso cadastrado."

## 5. Regras de gamificação (para reflectir no visual)

- XP por envio: **70** aprovado, **20** não aprovado, **+50** de bônus se nota 100 (nunca em erro de compilação/sandbox/linguagem não suportada).
- Nível: a cada **200 XP** (`level = floor(xp/200) + 1`).
- Streak: ativo em janela de 20–48h → +1 dia; >48h → zera para 1.
- Badges atuais (3): 🌱 **Primeiro Passo** ("Enviou sua primeira solução de código!"), ⭐ **Pontuação Perfeita** ("Alcançou nota 100 em um exercício!"), 🔥 **Foco Constante** ("Manteve 3 dias seguidos de estudo!") — prever espaço para mais.

## 6. Paleta / tom atual (ponto de partida, não obrigatoriedade)

- Tema escuro: fundo `#0a0f1d`; verde = sucesso/executar; vermelho = falha; âmbar = warnings/dicas; roxo = instrutor/admin, azul = aluno.
- Tom: gamificado, motivador, tech/educacional. Emojis usados como ícones nos botões (substituível por iconografia real no redesign).
- Rate limits relevantes para UX: 15 envios/min, 20 chamadas de IA/min (prever feedback de throttling).

## 7. Requisitos técnicos e de conteúdo para o design

- Responsivo (o protótipo atual é desktop-first; telas ≥1280px prioritárias, com colapso da sidebar/drawer).
- Acessibilidade: diálogos com `role="dialog"` + `aria-modal`, regiões `aria-live` para o stream de execução e chat, foco gerenciado.
- Estados de streaming via SSE (a UI mostra progresso de execução em tempo real).
- Linguagem de status crua em inglês no protótipo (`PASSED`, `QUEUED`, roles) — padronizar pt-BR ou manter chips técnicos conscientemente.
- Segurança/LGPD visíveis: opt-out de talentos, exportação e exclusão de conta.

## 8. Escopo sugerido para geração do design

1. Design system: cores, tipografia, espaçamento, botões, chips/badges, modal, drawer, estados (loading/erro/vazio).
2. Fluxo do aluno: login → dashboard → atividade (editor + resultado + testes) → feedback IA (linha + dica) → tutor chat → progresso/ranking → certificado.
3. Fluxo do instrutor: criar curso → criar atividade (testes) → código da turma → biblioteca → relatórios/analytics.
4. Fluxo admin: portal de talentos (empresas + token) + leaderboard público.
5. Conta e privacidade (incluindo toggle de visibilidade de talentos, que ainda não existe).
