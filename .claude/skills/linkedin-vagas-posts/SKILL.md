---
name: linkedin-vagas-posts
description: Rola o feed do LinkedIn (scroll) e analisa post por post pra identificar quais são vagas de emprego disfarçadas de publicação comum, extraindo cargo/empresa/forma de candidatura dos que forem vaga. Use quando o pedido for pra procurar vagas nos posts/feed do LinkedIn (diferente de buscar na aba Vagas).
---

# Vagas nos Posts do Feed do LinkedIn

Muita vaga é divulgada como post normal no feed (ex: imagem "ESTAMOS CONTRATANDO", texto "banco de talentos", etc.) e não aparece na busca da aba Vagas. Essa skill rola o feed manualmente, lendo post por post, e separa o que é vaga do que não é — como o usuário faria manualmente, só que mais rápido.

## Modelo recomendado (custo/benefício)

Essa skill é **volume alto de texto, complexidade baixa por decisão**: cada snapshot do feed facilmente passa de 60-100 mil caracteres (testado em 2026-10-14), mas a tarefa em si — "esse post é vaga ou não, extrai 3-4 campos" — é simples e bem especificada neste arquivo.

- **Use Haiku 5.5** pra rodar essa skill. É muito mais barato por token e dá conta tranquilo de seguir estas instruções e classificar os posts — gastar um modelo caro aqui é desperdício, não ganho de qualidade. Troque com `/model` antes de pedir pra rodar, ou passe `model: haiku` se estiver chamando via Agent tool (`carreira-agent`).
- Guarde um modelo mais caro (Sonnet 5.5/Opus 5.5) pra skill `gerar-curriculo`, onde qualidade de escrita (reescrever bullets, adaptar pra uma vaga) realmente compensa o custo.

## Pré-requisito

Mesma coisa da `linkedin-buscar-vagas`: precisa de uma página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se a sessão caiu, peça pro usuário logar manualmente — nunca digite credenciais por ele(a).

## Passo a passo

1. **Ir pro feed**: `mcp__chrome-devtools__navigate_page` (`type: "url"`) para `https://www.linkedin.com/feed/`.

2. **Carregar o filtro e os limites antes de começar a rolar**:
   - **Filtro**: leia `config/filtro-vagas.md`. Ele lista cargos, stacks, o que fica fora, senioridade, local/modelo e contratação. Se não existir, use as skills técnicas de `curriculo/perfil.yaml` (campo `skills.tecnicas`) como critério: vaga relevante é a que tem interseção razoável com essa lista.
   - **Limites**: leia `config/limites.md` (ou `config/limites.example.md`) para `posts_max_por_execucao`, `scrolls_max_por_execucao`, `vagas_alvo_padrao` e `curtir_vagas_no_filtro`.
   - Mostre ao usuário um resumo de uma linha do filtro carregado e pergunte se quer ajustar algo só nessa execução (ex.: "só remoto", "só sênior"). Se ajustar, aplique por cima do arquivo, sem editá-lo. Quando chamada pela `rotina-linkedin`, não pergunte: use o arquivo como está.
   - Guarde o filtro decidido — ele vai ser usado no passo 5 pra separar vaga relevante de vaga fora do filtro.

3. **Perguntar o critério de parada** (se não foi dito): existem três formas, e todas são válidas — identifique qual o usuário quis dizer, ou pergunte se não ficou claro:
   - **Número de vagas-alvo** (ex: "ache 5 vagas pra mim") — o mais comum e o default (`vagas_alvo_padrao`) se ele não especificar nenhum critério. Para quando atingir N vagas **dentro do filtro** (passo 2). Vagas fora do filtro não contam pra esse número.
   - **Quantidade de posts/scrolls** (ex: "olha uns 20 posts").
   - **Tempo** (ex: "por 5 minutos").

   Independente do modo escolhido, aplique um **teto de segurança** de `posts_max_por_execucao` posts analisados (ou `scrolls_max_por_execucao` scrolls) nessa execução — se bater nesse teto sem atingir o número de vagas pedido, pare, reporte o que achou até ali e pergunte se o usuário quer continuar numa nova rodada (não fique rolando pra sempre atrás de vagas que talvez não existam no feed agora).

4. **Ler os posts** (validado em 2026-10-19):
   a. **Texto, por script (só leitura)**: cada post começa num `h2` com o texto "Publicação no feed" (interface em inglês: "Feed post"; o script já aceita os dois). Suba do `h2` até o contêiner que tem o texto do post e leia o `innerText`. Guarde em `window.__seen` quantos já leu, pra cada chamada devolver só os novos:
      ```js
      async () => {
        const hs = [...document.querySelectorAll('h2')].filter(h => /Publicação no feed|Feed post/i.test(h.innerText));
        window.__seen = window.__seen || 0;
        const out = hs.slice(window.__seen).map((h, i) => {
          let el = h.parentElement;
          for (let k = 0; k < 8 && el.innerText.length < 200; k++) el = el.parentElement;
          const link = el.querySelector('a[href*="/feed/update/"]')?.href ?? null;
          return { i: window.__seen + i, link, texto: el.innerText.replace(/s+/g, ' ').slice(0, 700) };
        });
        window.__seen = hs.length;
        return out;
      }
      ```
      Seletores de classe CSS (tipo `.feed-shared-update-v2`) **não funcionam**: o DOM do LinkedIn é ofuscado.
   b. **Pular posts já vistos**: leia `vagas/posts-vistos.json` (lista de `{ id, data, vaga }`; crie `[]` se não existir). O `id` é o `link` do post, sem parâmetros (`?...`); sem link, use autor + os primeiros 120 caracteres do texto. Post com `id` na lista não é reclassificado. Acrescente cada post novo ao terminar a execução, com `vaga: true/false`. Isso evita repetir vagas quando o feed recicla posts ou quando a rotina recarrega o feed.
   c. **Classifique você mesmo** cada post novo: é vaga ou não, pelos sinais "vaga", "contratando", "estamos buscando", "oportunidade", "envie seu currículo", "banco de talentos", cargo + modelo de trabalho, e-mail ou link de candidatura no texto.
   d. **Snapshot só pra clicar** (curtir, "… mais"): `take_snapshot` salvo em arquivo + Grep pelo trecho do post. O `uid` de clique só vem do snapshot.
   e. **Post de vaga cortado** ("… mais" e o texto para no meio): clique no "mais" desse post ou abra o `link` do post numa aba nova e leia o texto inteiro. Se o post tiver link de vaga (`lnkd.in/...`, Gupy, Greenhouse etc.), guarde o link: quem vai gerar currículo lê a vaga completa por ele.

5. **Se for vaga, aplique o filtro do passo 2**: extraia empresa/autor do post, cargo, stack/requisitos, o **link do post**, como se candidatar (o **e-mail** exato que o post indica, link `lnkd.in/...`, link direto, "comente", "DM") **e o tipo de contratação (CLT/PJ)** — veja regras específicas logo abaixo. Depois classifique em um dos dois grupos:
   - **Dentro do filtro** — bate com o filtro do passo 2 (`config/filtro-vagas.md`, ou o ajuste que o usuário pediu na hora). Essas são o resultado principal. **Se `curtir_vagas_no_filtro` for `sim`, dê "Gostei" nesse post** (procure no bloco do post, no snapshot, um botão tipo `button "Gostei"` / `"Curtir"` / "Reagir de maneira..." e clique nele via `mcp__chrome-devtools__click`) antes de seguir pro próximo — isso sinaliza pro algoritmo do feed do LinkedIn que esse tipo de conteúdo é relevante, ajudando a trazer mais vagas parecidas nas próximas rolagens/sessões. Curta só vagas dentro do filtro, nunca as de fora.
   - **Fora do filtro** — é uma vaga de verdade, mas não bate com o critério (ex: vaga de design ou de outra stack quando o filtro é React/Node.js). Não descarte: guarde numa lista separada e secundária, só pra não esconder nada do usuário, mas deixe claro que não é o foco dessa busca. Não curta esses.

   **Extraindo CLT/PJ** (testado em 2026-10-14 com 3 posts de exemplo que o usuário marcou como bons):
   - Procure por um rótulo explícito no texto do post, geralmente perto de emoji/palavra-chave como "Modelo de contratação:", "Regime:", "Contratação:", "Tipo de contrato:" seguido de "CLT" ou "PJ" (ex: `📄 Modelo de contratação: PJ`). Quando existir, é o sinal mais confiável.
   - **Cuidado com falso positivo**: a sigla "PJ" pode aparecer no texto sem ser sobre o regime de contratação — ex: um post da PicPay mencionava "time de Aceitação **PJ**", que é o nome de um time/segmento de clientes pessoa jurídica, não o contrato da vaga. Só conte como sinal de contratação se "CLT"/"PJ" aparecer colado a uma palavra de contrato/regime/modelo (como nos rótulos acima) — não conte uma ocorrência solta de "PJ" em outro contexto (nome de time, produto, público-alvo etc.).
   - Se o post não disser nada sobre isso, **não abra o link externo de aplicação só pra checar** (isso multiplicaria a navegação e deixaria a varredura bem mais lenta) — registre o campo como `"não informado no post"`. Se o usuário pedir detalhes de uma vaga específica depois, aí sim vale abrir o link de candidatura e procurar CLT/PJ na página de destino.

6. **Rolar pra carregar mais posts**: o feed **não rola pelo `window`/`body`** — é um container interno. Ache-o e role ele direto via `mcp__chrome-devtools__evaluate_script`:
   ```js
   () => { const el = document.getElementById('workspace'); el.scrollTop = el.scrollHeight; return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight }; }
   ```
   Se `#workspace` não existir (LinkedIn muda o DOM com frequência), ache o container certo rodando um script que percorre todos os elementos procurando o maior `scrollHeight - clientHeight` (veja o padrão usado em 2026-10-14, disponível no histórico desta conversa/commits). Dê um pequeno delay (`await new Promise(r => setTimeout(r, 1500))`) depois de rolar pra deixar o LinkedIn carregar mais posts antes do próximo `take_snapshot` — os posts já lidos continuam no DOM (não precisa reprocessar, só pegar os headings novos que apareceram depois do último processado).

7. **Repita os passos 4-6** até atingir o critério de parada combinado no passo 3 (número de vagas dentro do filtro, quantidade de posts, ou tempo), bater no teto de segurança, ou o usuário mandar parar.

8. **Ao terminar**: mostre ao usuário primeiro a lista das vagas **dentro do filtro**, já com o tipo de contratação de cada uma (CLT, PJ, ou "não informado no post") — essas são o resultado principal (se o critério era "ache N vagas", confirme se bateu a meta ou parou antes por causa do teto de segurança). Depois um resumo curto de quantas ficaram **fora do filtro** (sem detalhar todas, só a contagem e talvez 1-2 exemplos, a menos que ele(a) peça a lista completa). Informe também quantos posts foram olhados no total. Salve tudo em `vagas/linkedin-posts-<AAAA-MM-DD>.json`, incluindo o filtro usado, o critério de parada, o campo `tipoContratacao` e um campo indicando se cada vaga ficou dentro ou fora do filtro (ver exemplo de estrutura num arquivo já gerado nessa pasta).

## Interface do LinkedIn em inglês

Os textos que a skill procura mudam com o idioma da conta. Validado em português; os equivalentes em inglês abaixo ainda **não foram testados**. Se algum não bater, tire um snapshot e procure o texto real.

| Português | Inglês |
|---|---|
| Publicação no feed | Feed post |
| Gostei / Situação do botão de reação | Like / Reaction button state |
| … mais | … more / see more |

## Observações importantes

- Essa skill é mais lenta por natureza (rolar + ler), avise o usuário que pode levar um tempo pra cobrir muitos posts.
- A única interação permitida durante a varredura é o "Gostei" em posts de vaga dentro do filtro (passo 5, só com `curtir_vagas_no_filtro: sim`) — fora isso, nunca comente, siga ou compartilhe nada, é só leitura.
- Se um post tiver imagem com informação da vaga (ex: cartaz "ESTAMOS CONTRATANDO") e o texto do DOM não capturar isso, avise que pode ter perdido vagas anunciadas só em imagem — ofereça tirar um screenshot (`mcp__chrome-devtools__take_screenshot`) do post específico se o usuário quiser conferir visualmente.
- A reconexão do navegador (MCP) pode acontecer no meio de uma sessão — se um `pageId` parar de funcionar, rode `mcp__chrome-devtools__list_pages` de novo pra pegar o novo id. O login costuma persistir (cookies salvos no perfil do navegador), mas confirme antes de continuar.
- Se aparecer checkpoint de segurança/captcha, pare e avise o usuário imediatamente.
