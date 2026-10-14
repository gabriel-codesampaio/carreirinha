---
name: linkedin-buscar-vagas
description: Busca vagas na aba "Vagas" do LinkedIn usando o navegador controlado via MCP (chrome-devtools), com os filtros que o usuário pedir (cargo, local, remoto/híbrido/presencial, senioridade). Use quando o pedido for pra buscar/procurar vagas no LinkedIn.
---

# Buscar Vagas no LinkedIn (aba Vagas)

Busca vagas na aba de Vagas do LinkedIn (não confundir com a skill `linkedin-vagas-posts`, que varre o feed). Usa as ferramentas MCP `mcp__chrome-devtools__*` pra controlar o navegador onde o usuário já fez login.

## Modelo recomendado (custo/benefício)

Mesmo perfil de tarefa que `linkedin-vagas-posts`: volume alto de texto (snapshots de página grandes), complexidade baixa por decisão (ler card de vaga, extrair campos). **Use Haiku 4.5** — mais barato por token e suficiente pra seguir estas instruções (`/model` pra trocar a sessão, ou `model: haiku` se chamar via Agent tool). Reserve Sonnet 5/Opus 5 pra skill `gerar-curriculo`, onde a qualidade da escrita importa de verdade.

## Pré-requisito

Precisa haver uma página logada no LinkedIn nesse navegador (`mcp__chrome-devtools__list_pages`). Se não houver, ou a sessão caiu pra tela de login, avise o usuário e peça pra ele logar manualmente na janela do Chrome antes de continuar — **nunca digite e-mail/senha dele**.

## Passo a passo

1. **Reunir os filtros**: pergunte (se não tiver sido dito) cargo/palavras-chave, localização, modelo de trabalho (remoto/híbrido/presencial) e, se relevante, senioridade.

2. **Montar a URL de busca** e navegar com `mcp__chrome-devtools__navigate_page` (`type: "url"`):
   ```
   https://www.linkedin.com/jobs/search/?keywords=<palavras-chave codificadas>&location=<local codificado>&f_WT=<2 remoto | 1 presencial | 3 híbrido>
   ```
   (`f_WT` pode ser omitido se o usuário não especificar modelo de trabalho.)

3. **Esperar carregar**: `mcp__chrome-devtools__wait_for` com algum texto que deve aparecer na lista (ex: o próprio termo buscado), ou simplesmente prossiga pro próximo passo — `navigate_page` já aguarda o carregamento básico.

4. **Extrair as vagas da página com `mcp__chrome-devtools__take_snapshot`** e leia a lista pela árvore de acessibilidade (título da vaga, empresa, local costumam vir como `link`/`StaticText` legíveis). **Não tente `evaluate_script` com seletores CSS** (tipo `.job-card-container`) como primeira opção — o DOM do LinkedIn vem com classes ofuscadas/vazias (confirmado em testes de 2026-10-14) e isso não acha nada. Se o snapshot for grande demais e estourar o limite de tokens, ele é salvo automaticamente num arquivo `.txt` (o erro mostra o caminho) — use Grep pra achar os marcadores de cada card de vaga e Read em blocos pra ler o conteúdo.

   A lista de vagas normalmente é renderizada numa área que rola por dentro (não pela janela toda) — se precisar carregar mais resultados pra baixo da lista, ache o container com `scrollHeight > clientHeight` via `evaluate_script` e role ele diretamente (`el.scrollTop = el.scrollHeight`), do jeito documentado na skill `linkedin-vagas-posts`.

5. **Mostrar um resumo ao usuário**: lista enxuta (cargo — empresa — local — link), nunca abrindo/candidatando a nenhuma automaticamente.

   **Sobre tipo de contratação (CLT/PJ)**: o card compacto da lista de vagas normalmente não mostra isso — só aparece na descrição completa da vaga, que exige abrir cada uma individualmente. Por padrão, **não abra todas as vagas só pra checar esse campo** (isso tornaria a busca bem mais lenta); marque como `"não informado na lista"` e ofereça checar sob demanda se o usuário quiser esse detalhe pra alguma vaga específica (passo 7). Quando for checar, procure um rótulo explícito ("Modelo de contratação", "Regime", "Tipo de contrato" + CLT/PJ) — **"PJ" sozinho no texto pode ser outra coisa** (nome de time, segmento de cliente, produto etc., não o regime da vaga), então só conte quando estiver claramente ligado a uma palavra de contrato/regime.

6. **Salvar o resultado** em `vagas/linkedin-vagas-<AAAA-MM-DD>.json` (array com os mesmos campos extraídos, mais a query usada).

7. Se o usuário quiser ver detalhes de uma vaga específica da lista, aí sim navegue até o link dela e leia o conteúdo — mas **nunca clique em "Candidatar-se"/"Easy Apply" sozinho**, isso é sempre decisão explícita do usuário.

## Observações importantes

- Não faça scraping em volume alto nem repita a mesma busca muitas vezes seguidas — mantenha um ritmo razoável de navegação (mais parecido com uma pessoa usando o site do que um bot).
- Nunca curta, comente, siga ou envie mensagem a partir dessa skill — ela só lê e lista vagas.
- A reconexão do navegador (MCP) pode acontecer no meio de uma sessão — se um `pageId` parar de funcionar, rode `mcp__chrome-devtools__list_pages` de novo pra pegar o novo id. O login costuma persistir entre reconexões.
- Se o LinkedIn mostrar uma tela de verificação/captcha/checkpoint de segurança, pare e avise o usuário imediatamente — não tente contornar.
