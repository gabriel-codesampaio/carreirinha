---
name: linkedin-conectar-recrutadores
description: Busca tech recruiters/recrutadores de tecnologia (e sinônimos — IT recruiter, talent acquisition, talent partner, headhunter TI, technical sourcer etc.) no LinkedIn e envia convites de conexão, sempre mostrando a lista de quem vai receber (com nome e headline) antes ou junto do envio, dentro do teto de config/limites.md. Use quando o pedido for pra encontrar/adicionar/conectar com recrutadores no LinkedIn.
---

# Conectar com Tech Recruiters no LinkedIn

Essa é a skill mais sensível das três de LinkedIn: ela **envia convites de verdade** (muda o estado da conta do usuário), diferente de `linkedin-buscar-vagas` e `linkedin-vagas-posts`, que só leem. LinkedIn também limita e monitora volume de convites — exagerar aqui é o jeito mais rápido de a conta do usuário ser restringida. Siga as regras abaixo à risca.

## Modelo recomendado (custo/benefício)

Mesmo perfil de volume de texto que as outras duas skills de LinkedIn (snapshots grandes, decisões simples por item), então **Haiku 5.5** também é suficiente aqui — a tarefa é seguir as regras de segurança abaixo à risca, não fazer julgamento complexo, e Haiku segue instruções explícitas bem. O que importa de verdade nessa skill é **nunca pular as regras de segurança**, não o modelo usado. Troque com `/model` ou passe `model: haiku` via Agent tool; reserve Sonnet 5.5/Opus 5.5 pra `gerar-curriculo`.

## Pré-requisito

Precisa de uma página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se a sessão caiu, peça pro usuário logar manualmente — nunca digite credenciais por ele(a).

## Regras de segurança (não pule nenhuma)

1. **Nunca envie convite pra alguém que o usuário não viu na lista.** Se o pedido já trouxe a quantidade (ex.: "conecta com 10 recrutadores", ou a `rotina-linkedin`), mostre a lista dos escolhidos e envie **na mesma etapa**, sem uma segunda rodada de confirmação: essa é a preferência do usuário. Sem quantidade no pedido, mostre a lista e pergunte quantos/quais antes de enviar.
2. **Teto de convites por sessão = `convites_por_sessao_max`** de `config/limites.md` (ou `config/limites.example.md` se o primeiro não existir). Leia esse arquivo no início; os valores de espera entre convites (`espera_entre_convites_seg`), troca de termo (`min_convidaveis_por_pagina`) e nota (`enviar_com_nota`) também vêm dele. Se o usuário pedir mais que isso de uma vez, avise do limite e sugira dividir em mais de uma sessão/dia. Se ele(a) topar assumir o risco e pedir pra ir além mesmo assim, pode prosseguir sem o teto — mas **o próprio modo automático do Claude Code pode bloquear a continuação de envios em massa** (confirmado em 2026-10-14: após 8 envios numa sessão, o classificador de modo automático recusou confirmar mais um convite, mesmo com autorização explícita do usuário). Isso não é um erro da skill — é um guardrail de nível de sistema. **Nunca tente contornar esse bloqueio com outra ferramenta** (ex: `evaluate_script` pra clicar via JS); pare, explique o que aconteceu e deixe o usuário decidir (ajustar permissões, ou continuar em lotes menores em outras sessões).
3. **Espace os envios** — não dispare um atrás do outro instantaneamente; aguarde `espera_entre_convites_seg` segundos entre cada convite, feito um humano navegando.
4. **Confira duplicidade** antes de convidar: pule quem aparece como `Pendente` no card da busca (fonte de verdade é o próprio LinkedIn); `vagas/linkedin-conexoes.json` serve de apoio se existir (a menos que o usuário peça explicitamente pra tentar de novo).
5. **Pare imediatamente e avise o usuário** se o LinkedIn mostrar qualquer tela de verificação de segurança, captcha, ou um aviso tipo "você atingiu o limite de convites" — nunca tente contornar isso. Reporte sempre o número real de convites enviados, nunca estime ou arredonde pra cima.

## Passo a passo

1. **Reunir critérios de busca**: termo e, opcionalmente, localização/setor, se o usuário não especificou. Use a lista de termos abaixo, sem ficar preso a "tech recruiter". Um termo só rende até seus resultados virarem quase todos `Pendente` de sessões anteriores. Quando uma página vier com menos de `min_convidaveis_por_pagina` pessoas convidáveis, passe pro próximo termo da lista.

   **Termos de busca (sinônimos), em ordem de prioridade:**

   1. `tech recruiter`
   2. `recrutadora de tecnologia` / `recrutador de tecnologia`
   3. `recrutador de TI` / `recrutadora de TI`
   4. `technical recruiter`
   5. `IT recruiter`
   6. `talent acquisition tecnologia` (traz muito TA de tech; confira a headline)
   7. `talent acquisition specialist`
   8. `talent partner` (comum em startups/scale-ups)
   9. `tech talent acquisition`
   10. `headhunter TI` / `headhunter tecnologia` (consultorias de hunting)
   11. `software engineering recruiter`
   12. `technical sourcer` / `tech sourcer` (sourcers fazem o primeiro contato)
   13. `analista de recrutamento e seleção TI`
   14. `consultora de recrutamento tech`
   15. `people partner tech` / `HRBP tecnologia` (menos focado em vaga, use por último)
   16. `frontend recruiter` / `recrutador front-end` (poucos resultados; troque pelo nicho de quem usa o projeto, conforme `config/filtro-vagas.md`)

   **Progresso de cada termo** fica em `vagas/progresso-recrutadores.md` (fora do git, é dado de quem usa o projeto). Leia esse arquivo no início: comece pelo termo 🟡 em uso, na página indicada; se não houver, pelo primeiro termo da lista que não está lá. Se o arquivo não existir, crie com o cabeçalho `| Status | Termo | Última página | Atualizado em | Observação |`. **No fim da sessão, atualize** a linha de cada termo usado (status ⛔ esgotado / 🟡 em uso, última página, data e quem sobrou na última página).

   **Filtre pela headline antes de convidar.** Termos amplos ("talent acquisition", "recruiter", "headhunter") trazem gente fora de tech. Pule quem a headline indica ser psicólogo(a) clínico(a), gestão de projetos, comercial/vendas, "recrutadora virtual 3D" e afins, ou RH generalista sem menção a tecnologia/TI.

2. **Buscar pessoas**: `mcp__chrome-devtools__navigate_page` (`type: "url"`) para:
   ```
   https://www.linkedin.com/search/results/people/?keywords=<termo codificado>
   ```
   (adicione outros parâmetros de filtro da própria URL do LinkedIn se o usuário pedir algo mais específico, tipo localização.)

   Dica: filtre só 2º grau com `&network=%5B%22S%22%5D` (quase todos os cards vêm com "Conectar" em vez de "Seguir"/"Enviar mensagem") e pagine com `&page=2`, `&page=3`... Depois de navegar, espere ~3 s antes do snapshot — logo após o `navigate_page` a lista pode ainda não ter carregado e o Grep não acha nada.

3. **Extrair a lista de resultados com `mcp__chrome-devtools__take_snapshot`** — capture nome, headline/cargo e o uid do link/botão "Conectar" (ex: `link "Convidar <Nome> para se conectar"`) de cada card visível. Use o snapshot direto (não `evaluate_script` com seletores CSS — o DOM do LinkedIn vem com classes ofuscadas e isso não acha nada, confirmado em testes de 2026-10-14); além disso, o passo 6 (clicar em "Conectar") só funciona com um uid vindo de um snapshot, então é melhor já partir dele aqui. Se o snapshot estourar o limite de tokens, ele é salvo num arquivo `.txt` automaticamente — use Grep pra achar os links "para se conectar" e Read em blocos.

4. **Mostrar a lista** (nome + headline, e quem foi pulado pela headline, com o motivo). Com quantidade no pedido: siga direto pro envio dos escolhidos, na mesma resposta. Sem quantidade: pergunte quantos/quais ("todos da lista", "só os 3 primeiros" etc.); não assuma "todos".

5. **Decidir sobre nota**: pergunte se quer mandar uma notinha curta e personalizada (o LinkedIn permite nota em conexões, com limite de caracteres) ou enviar sem nota. Se o usuário não tiver uma nota pronta, sugira uma curta e genérica pra aprovação dele(a) antes de usar. Se `enviar_com_nota` em `config/limites.md` for `não`, envie sem nota e não pergunte, a menos que o usuário peça nota.

6. **Enviar os convites aprovados, um de cada vez** — fluxo "Conectar → Enviar sem nota" (testado em 2026-10-16):
   - **Ache o uid do "Conectar" com snapshot `verbose: true`.** No snapshot normal os links `Convidar <Nome> para se conectar` às vezes **não aparecem** (só o card inteiro). Com `verbose: true` salvo em arquivo, um Grep por `uid=\S+ link "Convidar [^"]+"` (`-o: true`) devolve um uid por pessoa. Quem já tem convite aparece como `link "Pendente; clique para retirar o convite enviado a <Nome>"` — pule.
   - Clique no `Convidar <Nome> para se conectar` (`mcp__chrome-devtools__click`). Isso **não envia nada ainda**: abre o modal **"Adicionar nota ao seu convite?"** com dois botões, `Adicionar nota` e `Enviar sem nota`.
   - **O modal carrega com atraso.** Um snapshot tirado logo após o clique muitas vezes ainda não mostra o modal. Espere ~2,5 s (`evaluate_script` com `await new Promise(r=>setTimeout(r,2500))`) e só então tire um snapshot salvo em arquivo. Faça Grep por `Enviar sem nota|personalizar seu convite a` com `-A: 1`: a linha seguinte a "personalizar seu convite a" traz o nome da pessoa. **Confira se o nome bate** antes de clicar. Já aconteceu de o clique anterior não ter registrado e o modal ser de outra pessoa.
   - Clique no `button "Enviar sem nota"` do modal (ou em `Adicionar nota` → `fill` → enviar, se o usuário quis nota). O uid do modal muda a cada abertura (`7_8`, `9_8`, `10_8`, `11_12`...), então sempre pegue do snapshot mais recente.
   - **Modal pedindo e-mail** ("Para confirmar que vocês se conhecem, insira o e-mail do usuário", com "Enviar sem nota" desabilitado): a pessoa só aceita convite de quem tem o e-mail dela. Feche no `button "Fechar"` e pule. Isso não conta como envio (visto em 2026-10-19).
   - Se o clique em "Conectar" der `did not become interactive`, normalmente é porque o modal anterior ainda estava fechando. Espere e tente de novo uma vez; às vezes o modal abre mesmo assim, então tire o snapshot antes de clicar de novo.
   - **Confirme o envio pelo estado da página, não pelo "Successfully clicked".** Depois de alguns envios, rode um `evaluate_script` só de leitura listando `aria-label` dos links `main a` que começam com `Convidar`/`Pendente`: quem foi enviado vira `Pendente; clique para retirar o convite enviado a <Nome>`.
   - Aguarde alguns segundos antes do próximo convite (não enviar em rajada).
   - **Nunca clique "Enviar sem nota" via `evaluate_script`/JS** pra ganhar velocidade ou fugir de bloqueio — o clique tem que ser `mcp__chrome-devtools__click` com uid de snapshot.
   - Registro em `vagas/linkedin-conexoes.json` é opcional: o status "Pendente" do próprio LinkedIn já é a fonte de verdade contra duplicidade. Registre só se o usuário pedir.

   **Bloqueio do modo automático do Claude Code nesse fluxo** (visto em 2026-10-14 e 2026-10-16): o classificador pode negar o clique em "Enviar sem nota" **ou até o snapshot logo depois do "Conectar"** (porque o próximo passo óbvio é o envio), com motivos como `Real-World Transactions`, `Unrequested Commit in a Connected App` ou `Auto-Mode Bypass` (esse último aparece quando se insiste logo após um bloqueio). Não é o LinkedIn — é guardrail do Claude Code. O que reduz bloqueios:
   - Pedido do usuário **explícito com ação + quantidade/nomes** (ex: "pode clicar em Conectar e Enviar sem nota pros 3 restantes e pra mais 6"). Pedidos genéricos ("adicione mais recruiters") depois de vários envios tendem a ser barrados.
   - Volume menor por sessão (o bloqueio aparece mais depois de ~8-13 envios).
   - Ou o usuário adicionar regra de permissão pra `mcp__chrome-devtools__click`/`take_snapshot` no `.claude/settings.json` (libera qualquer clique no navegador — avise do trade-off).

   Quando bloquear: **pare na hora**, não tente de novo com outra ferramenta, reporte quem foi confirmado como Pendente e quem ficou sem confirmar, e avise se ficou um modal "Adicionar nota" aberto na tela (o usuário pode clicar "Enviar sem nota" manualmente).

7. **Resumir ao final**: quantos convites foram enviados, pra quem, e se bateu no teto da sessão.

## Interface do LinkedIn em inglês

Os nomes de botão e os rótulos que a skill procura (`Convidar`, `Enviar sem nota`, `Pendente`…) mudam com o idioma da conta. Validado em português; os equivalentes em inglês abaixo ainda **não foram testados**. Use o padrão em inglês nos Greps e nos `evaluate_script`; se não bater, tire um snapshot e procure o texto real antes de clicar.

| Português | Inglês | Onde aparece |
|---|---|---|
| `Convidar <Nome> para se conectar` | `Invite <Name> to connect` | link "Conectar" do card |
| `Conectar` | `Connect` | texto do botão |
| `Adicionar nota ao seu convite?` | `Add a note to your invitation?` | título do modal |
| `Adicionar nota` / `Enviar sem nota` | `Add a note` / `Send without a note` | botões do modal |
| `personalizar seu convite a <Nome>` | `personalize your invitation to <Name>` | conferência do nome no modal |
| `Pendente; clique para retirar o convite enviado a <Nome>` | `Pending, click to withdraw invitation sent to <Name>` | convite já enviado |
| `insira o e-mail do usuário` | `enter their email` | modal que pede e-mail (pular) |
| `Fechar` | `Dismiss` | fechar o modal |

## Observações importantes

- Essa skill nunca segue, mensagem ou interage além do próprio convite de conexão — isso é escopo de uma skill futura, não dessa.
- Se o perfil já for 1º grau (já conectado) ou já tiver convite pendente, pule e avise o usuário em vez de tentar reenviar.
- A reconexão do navegador (MCP) pode acontecer no meio de uma sessão — se um `pageId` parar de funcionar, rode `mcp__chrome-devtools__list_pages` de novo pra pegar o novo id. **Depois de uma reconexão, sempre tire um snapshot novo antes de clicar em qualquer coisa** — um uid de um snapshot antigo não é confiável na página recarregada.
- Trate `vagas/progresso-recrutadores.md` e `vagas/linkedin-conexoes.json` como dado sensível (contém quem o usuário está tentando se conectar) — não exponha fora do projeto.
