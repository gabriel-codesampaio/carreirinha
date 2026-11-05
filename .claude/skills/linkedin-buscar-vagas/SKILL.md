---
name: linkedin-buscar-vagas
description: Busca vagas na aba "Vagas" do LinkedIn usando o navegador controlado via MCP (chrome-devtools), com os termos e o filtro de config/filtro-vagas.md (ajustáveis na hora), separando as vagas dentro e fora do filtro. Use quando o pedido for pra buscar/procurar vagas no LinkedIn.
---

# Buscar Vagas no LinkedIn (aba Vagas)

Busca vagas na aba de Vagas do LinkedIn (não confundir com a skill `linkedin-vagas-posts`, que varre o feed). Usa as ferramentas MCP `mcp__chrome-devtools__*` pra controlar o navegador onde o usuário já fez login.

**Modelo:** Haiku 5.5. É muito texto, mas cada decisão é simples (ler o card, extrair os campos).

## Pré-requisito

Precisa haver uma página logada no LinkedIn nesse navegador (`mcp__chrome-devtools__list_pages`). Se não houver, ou a sessão caiu pra tela de login, avise o usuário e peça pra ele(a) logar manualmente na janela do Chrome antes de continuar — **nunca digite e-mail/senha por ele(a)**.

## Passo a passo

1. **Carregar o filtro**: leia `config/filtro-vagas.md` (ou `config/filtro-vagas.example.md`; sem nenhum dos dois, as skills técnicas de `curriculo/perfil.yaml`). É o mesmo filtro da `linkedin-vagas-posts`.
   - Dele saem os **termos de busca**: um por cargo da seção "Cargos que entram" (ex.: `desenvolvedor front-end`, `react developer`), e o modelo de trabalho/local da seção "Local e modelo de trabalho".
   - Mostre um resumo de uma linha do que vai buscar e pergunte se quer ajustar algo só nessa execução (cargo, local, modelo). O que o usuário disser na hora vale por cima do arquivo, sem editá-lo.

2. **Montar a URL de busca** e navegar com `mcp__chrome-devtools__navigate_page` (`type: "url"`):
   ```
   https://www.linkedin.com/jobs/search/?keywords=<palavras-chave codificadas>&location=<local codificado>&f_WT=<2 remoto | 1 presencial | 3 híbrido>
   ```
   (`f_WT` pode ser omitido se o usuário não especificar modelo de trabalho.)

3. **Esperar carregar**: `mcp__chrome-devtools__wait_for` com algum texto que deve aparecer na lista (ex: o próprio termo buscado), ou simplesmente prossiga pro próximo passo — `navigate_page` já aguarda o carregamento básico.

4. **Extrair as vagas da página com `mcp__chrome-devtools__take_snapshot`** e leia a lista pela árvore de acessibilidade (título da vaga, empresa, local costumam vir como `link`/`StaticText` legíveis). **Não tente `evaluate_script` com seletores CSS** (tipo `.job-card-container`) como primeira opção — o DOM do LinkedIn vem com classes ofuscadas/vazias (confirmado em testes de 2026-10-14) e isso não acha nada. Se o snapshot for grande demais e estourar o limite de tokens, ele é salvo automaticamente num arquivo `.txt` (o erro mostra o caminho) — use Grep pra achar os marcadores de cada card de vaga e Read em blocos pra ler o conteúdo.

   A lista de vagas normalmente é renderizada numa área que rola por dentro (não pela janela toda) — se precisar carregar mais resultados pra baixo da lista, ache o container com `scrollHeight > clientHeight` via `evaluate_script` e role ele diretamente (`el.scrollTop = el.scrollHeight`), do jeito documentado na skill `linkedin-vagas-posts`.

5. **Classificar e mostrar**: aplique o filtro a cada card (cargo, empresa, local e o que mais o card mostrar) e separe em **dentro do filtro** e **fora do filtro**, como a `linkedin-vagas-posts` faz. Mostre primeiro as de dentro (cargo — empresa — local — link) e só a contagem das de fora. Se buscou mais de um termo, junte os resultados sem repetir a mesma vaga. Nunca abra nem candidate a nenhuma automaticamente.

   **Sobre tipo de contratação (CLT/PJ)**: o card compacto da lista de vagas normalmente não mostra isso — só aparece na descrição completa da vaga, que exige abrir cada uma individualmente. Por padrão, **não abra todas as vagas só pra checar esse campo** (isso tornaria a busca bem mais lenta); marque como `"não informado na lista"` e ofereça checar sob demanda se o usuário quiser esse detalhe pra alguma vaga específica (passo 7). Quando for checar, procure um rótulo explícito ("Modelo de contratação", "Regime", "Tipo de contrato" + CLT/PJ) — **"PJ" sozinho no texto pode ser outra coisa** (nome de time, segmento de cliente, produto etc., não o regime da vaga), então só conte quando estiver claramente ligado a uma palavra de contrato/regime.

6. **Salvar o resultado** em `vagas/linkedin-vagas-<AAAA-MM-DD>.json` (sufixo `-runN` se já existir no dia), com os termos e o filtro usados e um campo `dentroDoFiltro` em cada vaga. Para gerar currículo de uma delas, a `gerar-curriculo` lê esse arquivo.

7. Se o usuário quiser ver detalhes de uma vaga específica da lista, aí sim navegue até o link dela e leia o conteúdo — mas **nunca clique em "Candidatar-se"/"Easy Apply" sozinho**, isso é sempre decisão explícita do usuário.

## Observações importantes

- Não faça scraping em volume alto nem repita a mesma busca muitas vezes seguidas — mantenha um ritmo razoável de navegação (mais parecido com uma pessoa usando o site do que um bot).
- Nunca curta, comente, siga ou envie mensagem a partir dessa skill — ela só lê e lista vagas.
- A reconexão do navegador (MCP) pode acontecer no meio de uma sessão — se um `pageId` parar de funcionar, rode `mcp__chrome-devtools__list_pages` de novo pra pegar o novo id. O login costuma persistir entre reconexões.
- Se o LinkedIn mostrar uma tela de verificação/captcha/checkpoint de segurança, pare e avise o usuário imediatamente — não tente contornar.
