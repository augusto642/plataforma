# Alfa aberto gratuito — gates de lançamento

O alfa só pode ser anunciado depois que o preflight retornar `ALPHA PREFLIGHT PASSED.` e uma pessoa responsável revisar as evidências. Este procedimento não faz deploy, não abre o produto ao público e não substitui aprovação jurídica ou operacional.

## Configuração da aplicação

1. Copie `.env.example` para `.env` e gere segredos únicos para JWT, certificado, webhook de billing, Postgres e Redis. Nunca compartilhe ou versione `.env`.
2. Defina `ALPHA_FREE_MODE=true`, `BILLING_MODE=test` e `BILLING_PROVIDER=simulated`. O Compose encaminha o modo alfa para a API e para o build do frontend; a API recusa o boot se o trio não for explícito e coerente.
3. Configure `NEXT_PUBLIC_API_URL`, `WEB_PUBLIC_URL`, `CORS_ORIGIN` e `GITEA_PUBLIC_URL` com os domínios HTTPS reais. Defina `WEB_DOMAIN`, `API_DOMAIN`, `GITEA_DOMAIN` e `ACME_EMAIL` para os mesmos domínios e um e-mail operacional. Aponte os registros DNS para a borda e permita entrada TCP 80/443 (UDP 443 opcional para HTTP/3).
4. O perfil Compose `public` fornece Caddy com TLS automático e encaminha os três domínios para web, API e Gitea. As portas HTTP internas continuam limitadas ao loopback; SSH do Gitea também deve ficar restrito por firewall/VPN ou desativado para o alfa. O proxy só deve ser iniciado depois de DNS, firewall e valores reais estarem prontos.
5. Configure `ALERTMANAGER_WEBHOOK_URL` com um endpoint HTTPS de plantão compatível com payloads nativos do Alertmanager. O perfil `monitoring` inclui Alertmanager, roteia para esse endpoint e mantém as interfaces de Prometheus/Alertmanager apenas no loopback. Trate a URL como credencial se tiver token; o arquivo renderizado fica no volume privado `alertmanagerconfig`. Após trocar o destino, recrie `alertmanager-config-init` e `alertmanager` para regenerar a configuração.
6. Mantenha `PISTON_ENABLED=false` por padrão. Para testes pessoais locais, habilite-o explicitamente no ambiente de desenvolvimento. No alfa externo, só defina `PISTON_ENABLED=true` depois de configurar `PISTON_URL` para o gateway numa VM dedicada alcançável por rede privada e usar o mesmo token aleatório de 64 caracteres hex em `PISTON_AUTH_TOKEN` na API e no gateway. Configure `METRICS_TOKEN` com pelo menos 32 caracteres.

Depois que a infraestrutura estiver provisionada, o comando de operação é `docker compose --profile public --profile monitoring up -d --build`. Ele não substitui os testes de entrega de alertas, isolamento, restauração ou smoke test descritos abaixo.

## Escopo declarado de dados do piloto

O responsável pelo produto informa que o cadastro deve solicitar apenas nome, e-mail e objetivo de aprendizagem, sem intenção de reter informações confidenciais. Isso não descreve todo o tratamento necessário ao produto: a plataforma também processa e pode armazenar progresso, diagnósticos, código submetido, rascunhos e projetos salvos, resultados de testes e interações com recursos de IA, inclusive por prestadores desses serviços. Rascunhos e projetos são incluídos na exportação de dados e removidos com a conta; cópias locais da aba dependem do navegador. Não prometa que conteúdo confidencial não será retido sem validar os fluxos e prazos reais. Antes do piloto, assessoria jurídica deve revisar aviso e aceite, finalidades e bases legais, prestadores e transferências, retenção e exclusão, acesso aos dados e a política para participantes menores. Não peça nem incentive o envio de informações confidenciais nos campos de objetivo, código ou prompts.

## Política de idade do alfa externo

O alfa externo é restrito a pessoas com 18 anos ou mais; menores de 18 anos não podem participar, mesmo com autorização de responsável. O cadastro pede uma autodeclaração e registra somente a confirmação, data e versão da política — não coleta data de nascimento. A regra está publicada em `/politica-de-idade` e aplicada nas entradas do onboarding e jogo convidado, nos cadastros por senha/OAuth, no diagnóstico público, no catálogo, nas páginas de cursos e na avaliação inicial do cadastro. Os endpoints públicos do catálogo, do diagnóstico e da avaliação inicial exigem token temporário assinado após a confirmação. Tokens de acesso carregam a versão aceita; tokens antigos são recusados, e a renovação de sessão exige confirmação vigente, encaminhando contas sem aceite atualizado ao login. A restrição é uma decisão temporária de produto, não uma conclusão de que menores não possam usar cursos no futuro. O gate `agePolicyReview` permanece pendente até assessoria jurídica revisar a política, responsabilidades, tratamento de dados e procedimentos para contas existentes e declarações incorretas.

## VPS de testes informada e isolamento do executor

O host informado para testes é uma VPS Ubuntu 24.04 com 4 vCPU, 6 GB de RAM, 100 GB NVMe, tráfego de saída de 30 TB e IP dedicado; os recursos podem ser ampliados posteriormente. Esses dados não comprovam capacidade sob carga nem configuração de firewall, DNS, TLS ou execução de restore. O endereço IP deve ser configurado no DNS e nos ambientes de deployment, não versionado neste repositório.

O responsável pretende manter o Piston na configuração atual para testes e uso pessoal. A API agora mantém a execução desabilitada por padrão (`PISTON_ENABLED=false`) e recusa executar código quando a opção não é explicitamente habilitada. Antes de disponibilizar o alfa a até 10 estudantes, provisionará uma VPS/VM separada para o runner. Até esse runner estar acessível por rede privada, com gateway autenticado, networking de execução desabilitado e smoke test concluído, mantenha `PISTON_ENABLED=false`. Aumentar recursos da VPS da aplicação não substitui esse isolamento, e o gate `pistonIsolation` só pode ser aprovado com evidência do runner separado.

Todos os processos da API devem usar **um único gateway** para cada Piston. O gateway admite no máximo `PISTON_GATEWAY_MAX_CONCURRENT` execuções simultâneas (padrão 4) e rejeita o excesso; sua contagem não é compartilhada entre gateways. A API mantém também uma fila local limitada. Não exponha o Piston diretamente nem escale o gateway em múltiplas réplicas sem implementar coordenação compartilhada.

### Teste com runner pela rede privada

O arquivo `docker-compose.runner-test.yml` habilita a execução apenas quando usado explicitamente e direciona tanto a API quanto `db-migrate` para `TEST_DATABASE_URL`. Antes de usá-lo, confirme que essa URL aponta **exclusivamente para o banco de teste**, faça backup quando necessário e configure as credenciais no `.env` privado da aplicação, junto às demais variáveis exigidas pelo Compose principal. O banco deve ser acessível de dentro dos containers da API e de migration.

Use um projeto Compose **novo e exclusivo** em cada host, nunca o projeto de produção. Exporte no shell um nome único, por exemplo `TEST_COMPOSE_PROJECT=nexus-test-<identificador-exclusivo>`. Antes de qualquer `up` ou migration, consulte os containers e volumes desse nome com os filtros abaixo; se houver qualquer resultado, escolha outro nome. O preflight verifica o formato do nome, mas não consulta o Docker nem garante que esteja disponível.

```sh
docker ps -a --filter "label=com.docker.compose.project=$TEST_COMPOSE_PROJECT" --format '{{.Names}}'
docker volume ls --filter "label=com.docker.compose.project=$TEST_COMPOSE_PROJECT" --format '{{.Name}}'
```

Configure portas locais de teste livres e distintas das usadas por outros projetos (`POSTGRES_PORT`, `API_PORT`, `WEB_PORT`, `GITEA_HTTP_PORT` e `GITEA_SSH_PORT`); não reutilize volumes ou credenciais de produção. Essas portas ficam em loopback; acesso remoto ao teste requer um túnel ou borda privada configurada pelo operador. Ajuste as URLs públicas de teste e `CORS_ORIGIN` para o endereço efetivamente acessado pelo navegador. Se usar Gitea, crie uma conta de serviço e token **na instância de teste** e configure `GITEA_TOKEN` no ambiente privado; não use os usuários/senhas de exemplo fora de um ambiente descartável e isolado. Sem Gitea, defina `GITEA_ENABLED=false` e não considere os fluxos de repositório testados.

Na VM dedicada, exporte também um `TEST_COMPOSE_PROJECT` exclusivo e confirme que não há containers ou volumes com esse nome no host. Configure `PISTON_BIND_IP` com o endereço da interface privada da VPN, não com `0.0.0.0`, e `PISTON_AUTH_TOKEN` com 32 bytes aleatórios codificados em hexadecimal. Restrinja a porta 2000 no firewall aos hosts autorizados pela VPN e inicie `docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.piston-worker.yml up -d --build` nessa VM. Não publique a API interna do Piston.

Na aplicação, configure `PISTON_URL` com a URL privada do gateway, o mesmo `PISTON_AUTH_TOKEN` e `TEST_DATABASE_URL` com a conexão do banco de teste. Execute:

```sh
pnpm test-deploy:preflight -- --env-path .env
docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.yml -f docker-compose.runner-test.yml config --quiet
docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.yml -f docker-compose.runner-test.yml run --rm db-migrate
docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.yml -f docker-compose.runner-test.yml up -d --build api web
```

Antes do preflight, só depois de verificar manualmente o banco, a VM, a VPN e o firewall, defina `TEST_DATABASE_CONFIRMED=true` e `PISTON_NETWORK_CONFIRMED=true` no ambiente privado. O comando verifica a configuração local, inclusive alguns casos de URL de banco igual à produção, mas não consegue identificar aliases de rede nem provar que um banco é de teste. O operador deve confirmar o destino antes de executar a migration. O preflight não testa conexão ou isolamento e não exibe valores de credenciais. Variáveis exportadas no shell prevalecem sobre as do arquivo `.env`, assim como no Compose.

O Compose principal também inicia suas dependências locais, incluindo PostgreSQL e Redis; com o arquivo de teste, API e migrations usam `TEST_DATABASE_URL`, não o PostgreSQL local. Se Gitea estiver habilitado, inicie-o também no mesmo projeto de teste e provisione seu token antes de iniciar a API. Após a ativação, em **Admin → Saúde do Sistema**, use **Executar testes reais** para executar programas fixos em JavaScript e Python; os mesmos testes rodam automaticamente a cada 15 minutos, coordenados por Redis. Os últimos 50 resultados são exibidos com data, origem, duração e categoria, sem código de alunos, saída ou segredos. Registros em andamento podem indicar que a API foi interrompida durante o teste. Os registros são persistidos sem prazo automático de exclusão até definição da política de retenção. A configuração e um resultado positivo não comprovam isolamento ou o uso da VPN, nem autorizam exposição pública: valide separadamente rede privada, firewall e isolamento. Sem os endereços, credenciais e acesso reais, esses comandos não foram executados no ambiente remoto.

A imagem da API inclui o conteúdo inicial do repositório. O Compose armazena o conhecimento em `knowledgecontent` e dados operacionais em `knowledgedata`, preservados ao recriar o container. Um volume novo recebe o conteúdo inicial da imagem uma única vez; builds posteriores não substituem seu conteúdo. Antes de migrar uma instalação existente, faça uma cópia consistente do conteúdo anterior e confirme sua transferência: um volume novo não recupera alterações da camada gravável do container antigo. Não use `down -v`. Opere apenas uma réplica escritora até haver coordenação de escritas e inclua ambos os volumes no backup e no teste de restauração.

Para registrar evidências sem compartilhar segredos:

1. Confirme que o banco da URL é de teste e que o comando de migration terminou sem erros; não exiba nem copie a URL.
2. Na VM, confira `docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.piston-worker.yml ps`; na aplicação, confira `docker compose -p "$TEST_COMPOSE_PROJECT" -f docker-compose.yml -f docker-compose.runner-test.yml ps`. Verifique que Piston, gateway e API estão saudáveis.
3. Execute o diagnóstico no admin e registre apenas data, linguagem e resultado de JavaScript e Python. Verifique também o fluxo de uma atividade permitida e a recusa de acesso de um usuário não autorizado.
4. Verifique o firewall e a rota pela VPN de forma independente: o gateway deve aceitar apenas o host da API autorizado, e o Piston não deve estar exposto diretamente. Registre evidências da configuração e dos testes, sem endereços privados, tokens ou dados de alunos em canais públicos.
5. Se o build da imagem falhar, corrija e valide o build no ambiente de teste antes de prosseguir. Um teste local das imagens não substitui a validação no host de destino.

## Referências para curadoria

Em **Admin → Conhecimento**, a caixa de referências registra somente metadados e URLs HTTPS de vagas, cursos, livros e PDFs. Não informe links com credenciais ou tokens. Uma decisão de aprovação ou rejeição é registrada com auditoria e não importa o material, não comprova sua licença e não alimenta automaticamente a tutora ou o KMS; o administrador deve verificar a fonte e os direitos antes de qualquer uso posterior.

Após aprovar, o administrador pode encaminhar a referência à fila de curadoria de metadados na mesma tela. O encaminhamento é idempotente e auditado. Um candidato pendente pode gerar, por ação administrativa auditada, uma pesquisa em rascunho com seus metadados; essa pesquisa não alimenta automaticamente as trilhas. Alternativamente, um administrador pode declarar a revisão da licença e publicar o link com tags de conceitos, desde que a referência tenha licença declarada e aprovação registrada. Atividades com as mesmas tags mostram a fonte e a licença; arquivar o candidato retira o link. Nenhum conteúdo é baixado ou copiado e a declaração não comprova direitos. A fila vive no banco e é separada da fila KMS canônica em arquivos: não cria entrada ou documento KMS. Candidatos arquivados não são reabertos por um novo encaminhamento.

Há um endpoint opcional, desabilitado sem chave, para um conector enviar referências pendentes. Ele não conecta a Muse por si só: a revisão e a aprovação da Meta, o provisionamento seguro e os testes reais ainda são necessários. A caixa diferencia envios do administrador e do conector; instruções e limitações estão em `OPERATIONS-SECURITY.md`.

Na mesma aba, o pré-diagnóstico das fontes Adzuna e Tavily mostra presença de credenciais e orçamento configurado, sem revelar segredos. Ele não valida credenciais, conectividade, saldo disponível ou resultados. O botão de teste manual consulta cada fonte configurada, consome o orçamento diário e registra início e resultado resumido na auditoria, sem salvar as vagas retornadas. Um resultado vazio é diferente de falha. A validação real exige credenciais e execução autorizada no ambiente de teste.

A leitura, revisão e curadoria da caixa exigem autenticação administrativa. O endpoint opcional de envio usa uma chave exclusiva limitada e não concede acesso administrativo; ele ainda não está integrado ou aprovado pela Muse. Não automatize download ou ingestão de obras protegidas sem licença ou autorização adequada.

## Evidências externas obrigatórias

Copie `docs/ALPHA-EVIDENCE.template.json` para `.alpha-evidence.json` (o arquivo local é ignorado pelo Git). Após cada atividade, altere o estado para `passed` e registre uma referência verificável, sem credenciais, dados pessoais ou conteúdo de consentimento:

| Chave | Evidência necessária |
| --- | --- |
| `stagingMigrations` | Migrations aplicadas em staging e fluxos críticos verificados, sem executar migrations de produção como parte deste preflight. |
| `pistonIsolation` | Runner em host dedicado, rede privada, networking de execução desabilitado, gateway autenticado e execução smoke validada. |
| `publicEdge` | TLS válido, DNS correto, proxy roteando app/API/Gitea e portas HTTP diretas inacessíveis externamente. |
| `monitoringAlertRouting` | Alertas enviados pelo Alertmanager a um destino de plantão escolhido pelo operador; entrega e escalonamento testados. A configuração incluída não comprova que o destino recebeu ou escalou o alerta. |
| `backupRestore` | Restore drill concluído em ambiente isolado, com resultado e tempo de recuperação registrados. |
| `dependencyTriage` | Auditoria das dependências de produção executada no release; achados altos/críticos resolvidos ou formalmente aceitos e qualquer risco residual avaliado com mitigação ou aceite explícito. |
| `pilotConsent` | Fluxo do piloto revisado e aprovado, incluindo elegibilidade exclusiva para maiores de 18 anos; não salve nomes, e-mails ou confirmações individuais no manifesto. |
| `agePolicyReview` | Política `/politica-de-idade`, responsabilidades, tratamento de contas existentes e medidas para declarações incorretas revisados por assessoria jurídica qualificada. |
| `publicSmokeTests` | Fluxo público de cadastro, aula, execução segura, logout e tratamento de erros testados nos domínios finais. |

O manifesto é uma declaração do operador, não uma verificação automática da veracidade das evidências. A referência deve permitir uma revisão humana sem expor segredos ou dados de participantes.

## Preflight

No PowerShell:

```powershell
Copy-Item docs\ALPHA-EVIDENCE.template.json .alpha-evidence.json
pnpm alpha:preflight -- --env-path .env --evidence-file .alpha-evidence.json
pnpm alpha:preflight -- --env-path .env --evidence-file .alpha-evidence.json --probe
```

O primeiro comando verifica configuração e evidências; `--probe` também consulta o `/health` da API pública e executa um snippet JavaScript inofensivo pelo gateway autenticado do Piston. O preflight nunca imprime os valores dos segredos. Um resultado bloqueado é esperado enquanto qualquer configuração ou evidência estiver pendente.

**Ainda são decisões/operações humanas:** escolher o endpoint e os responsáveis por alertas e testar entrega/escalonamento; provisionar DNS e firewall; iniciar os perfis `public`/`monitoring` no host de produção; provisionar staging e host do Piston; executar migrations e restore drill; obter consentimentos; obter revisão jurídica; e registrar mitigação/aceite de qualquer risco de dependência que reapareça. Não marque esses gates como concluídos sem evidência. Nenhum deploy ou abertura pública é autorizado por este documento.
