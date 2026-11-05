---
name: linkedin-conectar-recrutadores
description: Busca tech recruiters/recrutadores de tecnologia (e sinônimos — IT recruiter, talent acquisition, talent partner, headhunter TI, technical sourcer etc.) no LinkedIn e envia convites de conexão (ou segue, quando o card só oferece "Seguir"), sempre mostrando a lista de quem vai receber (com nome e headline) antes ou junto do envio, dentro do teto de config/limites.md. Use quando o pedido for pra encontrar/adicionar/conectar com recrutadores no LinkedIn.
---

# Conectar com Tech Recruiters no LinkedIn

Esta skill **envia convites de verdade**. O LinkedIn limita e monitora o volume, e exagerar é o jeito mais rápido de restringir a conta. Siga as regras à risca.

**Modelo:** Haiku 5.5. A tarefa é seguir regras explícitas; ela não pede julgamento complexo. A `rotina-linkedin` chama esta skill num subagente Haiku.

**Pré-requisito:** página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se não houver, peça pro usuário logar manualmente. Nunca digite credenciais.

## Regras de segurança (não pule nenhuma)

1. **Ninguém recebe convite sem aparecer na lista.** Se o pedido traz a quantidade (ex.: "conecta com 10", ou a rotina), mostre a lista e envie **na mesma etapa**, sem segunda confirmação. Sem quantidade, mostre a lista e pergunte quantos/quais; não assuma "todos".
2. **Teto por sessão = `convites_por_sessao_max`** de `config/limites.md` (ou `.example.md`). Do mesmo arquivo vêm `espera_entre_convites_seg`, `min_convidaveis_por_pagina` e `enviar_com_nota`. Pedido acima do teto: avise e sugira dividir. Se o usuário assumir o risco, pode passar do teto.
3. **Espace os envios** em `espera_entre_convites_seg`, e no mínimo 3 s depois de cada "Enviar sem nota": com menos que isso, o modal anterior ainda está fechando e o clique se perde.
4. **Duplicidade:** pule quem aparece como `Pendente`, quem já é 1º grau e quem já está como "Seguindo". O status do próprio LinkedIn é a fonte de verdade.
5. **Checkpoint, captcha ou aviso de limite de convites:** pare na hora e avise. Informe sempre o número real enviado, sem estimar.
6. **Bloqueio do modo automático do Claude Code** (motivos como `Real-World Transactions` ou `Auto-Mode Bypass`, mais comuns depois de ~8-13 envios): pare, **nunca contorne** (nada de clicar via `evaluate_script`/JS) e reporte quem ficou confirmado como Pendente, quem ficou sem confirmar e se ficou um modal aberto na tela. Reduz bloqueio: pedido explícito com ação + quantidade, volume menor por sessão ou regra de permissão pra `click`/`take_snapshot` em `.claude/settings.json` (essa regra libera qualquer clique no navegador; avise do trade-off).

## Passo a passo

1. **Termo de busca.** Progresso em `vagas/progresso-recrutadores.md` (dado pessoal, fora do git). Não abra o arquivo inteiro: `grep "🟡"` mostra o termo em uso e `grep -c "<termo>"` diz se um termo já foi usado. Comece pelo 🟡 na página indicada; se não houver, pelo primeiro termo da lista que não aparece no arquivo. Se o arquivo não existir, crie com o cabeçalho `| Status | Termo | Última página | Atualizado em | Observação |`. Quando a página tiver menos de `min_convidaveis_por_pagina` convidáveis, passe pro próximo termo.

   Termos, em ordem: `tech recruiter` · `recrutadora de tecnologia` / `recrutador de tecnologia` · `recrutador de TI` / `recrutadora de TI` · `technical recruiter` · `IT recruiter` · `talent acquisition tecnologia` · `talent acquisition specialist` · `talent partner` · `tech talent acquisition` · `talent acquisition` · `talent acquisition analyst` / `partner` / `manager` · `headhunter TI` / `headhunter tecnologia` · `software engineering recruiter` · `technical sourcer` / `tech sourcer` · `analista de recrutamento e seleção TI` · `consultora de recrutamento tech` · `people partner tech` / `HRBP tecnologia` · `frontend recruiter` / `recrutador front-end` (troque pelo nicho de `config/filtro-vagas.md`).

   **Filtre pela headline.** Termos amplos trazem gente de fora de tech. Pule psicólogo(a) clínico(a), gestão de projetos, comercial/vendas, "recrutadora virtual 3D" e RH generalista sem menção a tecnologia/TI.

2. **Buscar:** `navigate_page` (`type: "url"`) para `https://www.linkedin.com/search/results/people/?keywords=<termo codificado>&network=%5B%22S%22%5D&page=<n>` (só 2º grau; outros filtros da URL se o usuário pedir).

3. **Extrair a lista com um `evaluate_script` só de leitura.** O script lê o `aria-label` dos links, porque a classe CSS é ofuscada, e já espera a página carregar:
   ```js
   async () => {
     await new Promise(r => setTimeout(r, 3000));
     return [...document.querySelectorAll('main a, main button')]
       .filter(a => /^(Convidar|Pendente|Seguir )/.test(a.getAttribute('aria-label') || ''))
       .map(a => { let el = a; for (let k = 0; k < 10 && !/•/.test(el.innerText); k++) el = el.parentElement;
         return (a.getAttribute('aria-label').startsWith('Pendente') ? '[PENDENTE] ' : '') + el.innerText.replace(/\s+/g, ' ').slice(0, 170); });
   }
   ```

4. **Mostrar a lista:** nome + headline, marcando "(seguir)" em quem só tem o botão Seguir e quem foi pulado pela headline, com o motivo.

5. **Nota:** com `enviar_com_nota: não`, envie sem nota e não pergunte. Se não, pergunte; se o usuário não tiver uma nota pronta, sugira uma curta pra ele aprovar.

6. **Enviar, um de cada vez.** Snapshots **sempre salvos em arquivo** (`filePath`) e lidos só por Grep. Nunca leia um snapshot inteiro no contexto. Cada convite sai por ~200 tokens assim.
   1. `take_snapshot` com `verbose: true` + `filePath`, e Grep `uid=\S+ link "Convidar [^"]+"` com `-o: true`: um uid por pessoa. Sem `verbose`, os links às vezes não aparecem.
   2. `click` no `Convidar <Nome> para se conectar`. Ainda não envia nada: abre o modal "Adicionar nota ao seu convite?".
   3. O modal demora pra abrir. Espere ~2,5 s (`evaluate_script` com `await new Promise(r=>setTimeout(r,2500))`), tire o snapshot em arquivo e faça Grep de `Enviar sem nota|personalizar seu convite a|insira o e-mail` com `-A: 1`. **Confira se o nome bate**: já aconteceu de o clique anterior não registrar e o modal ser de outra pessoa.
   4. `click` no `button "Enviar sem nota"`. O uid muda a cada abertura, então use sempre o do snapshot mais recente. Com nota: `Adicionar nota` → `fill` → enviar.
   5. **Modal pedindo e-mail** ("insira o e-mail do usuário", "Enviar sem nota" desabilitado): feche em `button "Fechar"` e pule. Não conta como envio.
   6. `did not become interactive` no "Conectar" geralmente quer dizer que o modal anterior ainda está fechando. Tire um snapshot antes de tentar de novo (às vezes o modal abriu mesmo assim) e tente uma vez só.
   7. **Confirme pelo estado da página**, não pelo "Successfully clicked". Depois da espera do passo 3 das regras, um `evaluate_script` que espera 3 s e devolve os `aria-label` de `main a` começando com `Convidar`/`Pendente` cobre a espera e a conferência de uma vez: quem foi enviado vira `Pendente; clique para retirar o convite enviado a <Nome>`.
   8. Clique sempre com `mcp__chrome-devtools__click` e uid de snapshot. Nunca via JS.

6b. **Quem só tem "Seguir"** e passou no filtro: siga em vez de pular. O uid vem de um Grep `uid=\S+ (button|link) "Seguir [^"]+"` no snapshot verbose (rótulo ainda não validado; se não bater, procure o botão no card). Confira o nome e clique uma vez: não abre modal, e o botão vira "Seguindo". Seguir **não conta** como convite, mas entra no mesmo teto por sessão e na mesma espera.

7. **No fim:** atualize em `vagas/progresso-recrutadores.md` a linha de cada termo usado (⛔ esgotado / 🟡 em uso, última página, data, quem sobrou). Resuma: convites enviados e pessoas seguidas, com os nomes, e se bateu no teto. `vagas/linkedin-conexoes.json` só se o usuário pedir.

## Observações

- A skill só convida ou segue. Nunca manda mensagem.
- Se o `pageId` parar de funcionar (o MCP reconectou), rode `list_pages` de novo e **tire um snapshot novo antes de qualquer clique**.
- Conta em inglês (não testado): `Invite <Name> to connect`, `Send without a note`, `Add a note`, `personalize your invitation to <Name>`, `Pending, click to withdraw invitation sent to <Name>`, `enter their email`, `Dismiss`, `Follow <Name>` / `Following`. Se não bater, procure o texto real num snapshot salvo em arquivo.
- `vagas/progresso-recrutadores.md` e `vagas/linkedin-conexoes.json` são dados sensíveis. Não exponha fora do projeto.
