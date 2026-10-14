---
name: linkedin-conectar-recrutadores
description: Busca tech recruiters/recrutadores de tecnologia no LinkedIn e envia convites de conexão, sempre mostrando a lista pro usuário escolher antes de enviar qualquer convite. Use quando o pedido for pra encontrar/adicionar/conectar com recrutadores no LinkedIn.
---

# Conectar com Tech Recruiters no LinkedIn

Essa é a skill mais sensível das três de LinkedIn: ela **envia convites de verdade** (muda o estado da conta do usuário), diferente de `linkedin-buscar-vagas` e `linkedin-vagas-posts`, que só leem. LinkedIn também limita e monitora volume de convites — exagerar aqui é o jeito mais rápido de a conta do usuário ser restringida. Siga as regras abaixo à risca.

## Modelo recomendado (custo/benefício)

Mesmo perfil de volume de texto que as outras duas skills de LinkedIn (snapshots grandes, decisões simples por item), então **Haiku 4.5** também é suficiente aqui — a tarefa é seguir as regras de segurança abaixo à risca, não fazer julgamento complexo, e Haiku segue instruções explícitas bem. O que importa de verdade nessa skill é **nunca pular as regras de segurança**, não o modelo usado. Troque com `/model` ou passe `model: haiku` via Agent tool; reserve Sonnet 5/Opus 5 pra `gerar-curriculo`.

## Pré-requisito

Precisa de uma página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se a sessão caiu, peça pro usuário logar manualmente — nunca digite credenciais por ele.

## Regras de segurança (não pule nenhuma)

1. **Nunca envie um convite sem antes mostrar a pessoa específica ao usuário e ele confirmar** — pode ser confirmação "em lote" sobre uma lista já revisada por ele, mas a lista tem que ser vista antes de qualquer envio.
2. **Teto de ~15 convites por sessão.** Se o usuário pedir mais que isso de uma vez, avise do limite e sugira dividir em mais de uma sessão/dia.
3. **Espace os envios** — não dispare um atrás do outro instantaneamente; aguarde um pouco (alguns segundos) entre cada convite, feito um humano navegando.
4. **Confira duplicidade** antes de convidar: leia `vagas/linkedin-conexoes.json` e pule quem já recebeu convite antes (a menos que o usuário peça explicitamente pra tentar de novo).
5. **Pare imediatamente e avise o usuário** se o LinkedIn mostrar qualquer tela de verificação de segurança, captcha, ou um aviso tipo "você atingiu o limite de convites" — nunca tente contornar isso.

## Passo a passo

1. **Reunir critérios de busca**: termo (ex: "tech recruiter", "recrutador de tecnologia", "technical recruiter"), e opcionalmente localização/setor, se o usuário não especificou.

2. **Buscar pessoas**: `mcp__chrome-devtools__navigate_page` (`type: "url"`) para:
   ```
   https://www.linkedin.com/search/results/people/?keywords=<termo codificado>
   ```
   (adicione outros parâmetros de filtro da própria URL do LinkedIn se o usuário pedir algo mais específico, tipo localização.)

3. **Extrair a lista de resultados com `mcp__chrome-devtools__take_snapshot`** — capture nome, headline/cargo e o uid do link/botão "Conectar" (ex: `link "Convidar <Nome> para se conectar"`) de cada card visível. Use o snapshot direto (não `evaluate_script` com seletores CSS — o DOM do LinkedIn vem com classes ofuscadas e isso não acha nada, confirmado em testes de 2026-10-14); além disso, o passo 6 (clicar em "Conectar") só funciona com um uid vindo de um snapshot, então é melhor já partir dele aqui. Se o snapshot estourar o limite de tokens, ele é salvo num arquivo `.txt` automaticamente — use Grep pra achar os links "para se conectar" e Read em blocos.

4. **Mostrar a lista ao usuário** (nome + cargo + empresa, se aparecer) e perguntar quem ele quer que receba convite — pode ser "todos da lista", "só os 3 primeiros", etc. Não assuma "todos" por padrão.

5. **Decidir sobre nota**: pergunte se quer mandar uma notinha curta e personalizada (o LinkedIn permite nota em conexões, com limite de caracteres) ou enviar sem nota. Se o usuário não tiver uma nota pronta, sugira uma curta e genérica pra aprovação dele antes de usar.

6. **Enviar os convites aprovados, um de cada vez**:
   - Clique no botão "Conectar" do card (`mcp__chrome-devtools__click` com o uid) — se abrir um modal perguntando sobre nota, preencha (`mcp__chrome-devtools__fill`) ou pule conforme decidido no passo 5, e confirme o envio.
   - Aguarde um instante antes do próximo convite (não enviar em rajada).
   - Registre cada envio em `vagas/linkedin-conexoes.json` (nome, headline, data, se teve nota).

7. **Resumir ao final**: quantos convites foram enviados, pra quem, e se bateu no teto da sessão.

## Observações importantes

- Essa skill nunca segue, mensagem ou interage além do próprio convite de conexão — isso é escopo de uma skill futura, não dessa.
- Se o perfil já for 1º grau (já conectado) ou já tiver convite pendente, pule e avise o usuário em vez de tentar reenviar.
- A reconexão do navegador (MCP) pode acontecer no meio de uma sessão — se um `pageId` parar de funcionar, rode `mcp__chrome-devtools__list_pages` de novo pra pegar o novo id. **Depois de uma reconexão, sempre tire um snapshot novo antes de clicar em qualquer coisa** — um uid de um snapshot antigo não é confiável na página recarregada.
- Trate `vagas/linkedin-conexoes.json` como dado sensível (contém quem o usuário está tentando se conectar) — não exponha fora do projeto.
