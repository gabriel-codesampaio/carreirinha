---
name: linkedin-total-conexoes
description: Pega o número total de conexões do usuário no LinkedIn (ex. "4.419 conexões") abrindo a página de conexões no navegador controlado via MCP (chrome-devtools). Use quando o pedido for pra saber/checar/contar quantas conexões o usuário tem no LinkedIn.
---

# Total de conexões no LinkedIn

Skill só de leitura: abre a página de conexões e devolve o total. Não clica em nada nem altera nada na conta.

## Modelo recomendado

Tarefa trivial, então **Haiku** dá conta.

## Pré-requisito

Precisa de uma página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se a sessão caiu, peça pro usuário logar manualmente. Nunca digite credenciais por ele(a).

## Passo a passo

1. `mcp__chrome-devtools__navigate_page` (`type: "url"`) para:
   ```
   https://www.linkedin.com/mynetwork/invite-connect/connections/
   ```
2. Extraia o total com `mcp__chrome-devtools__evaluate_script` (`waitForStableDom: false`). O script espera o número aparecer sozinho, então **não use `wait_for`**: ele despeja o snapshot inteiro da página e gasta muito contexto.
   ```js
   async () => {
     const re = /([\d.,]+)\s+(conex(?:ão|ões)|connections?)\b/i;
     for (let i = 0; i < 20; i++) {
       const m = document.body.innerText.match(re);
       if (m) return { texto: m[0], total: Number(m[1].replace(/[.,]/g, '')) };
       await new Promise(r => setTimeout(r, 500));
     }
     return { erro: 'não achou', url: location.href, title: document.title };
   }
   ```
   Se vier `erro` (ex.: redirecionou pro login), confira `url`/`title`. Se estiver logado, tire um `mcp__chrome-devtools__take_snapshot` e procure o cabeçalho "N conexões" acima de "Classificar por".
3. Responda com o número, ex.: **4.419 conexões**.
