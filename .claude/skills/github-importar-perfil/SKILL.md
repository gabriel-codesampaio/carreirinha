---
name: github-importar-perfil
description: Lê o perfil público do GitHub do usuário (bio, README do perfil, repositórios fixados e recentes, linguagens, tópicos e READMEs) pela API pública e soma projetos e skills técnicas ao curriculo/perfil.yaml, unindo com o que veio do LinkedIn (docs/mescla-perfil.md). Use quando o pedido for pra importar, puxar ou sincronizar projetos/portfólio do GitHub pro perfil.
---

# Importar perfil do GitHub

Trabalha junto com a `linkedin-importar-perfil`: as duas **somam** no mesmo `perfil.yaml`, seguindo [docs/mescla-perfil.md](../../../docs/mescla-perfil.md). O GitHub contribui com **`projetos`** e **`skills.tecnicas`**; os dois são a união do que veio do LinkedIn, do GitHub e do que já estava no arquivo. Leia esse documento antes do passo 5.

Mesma divisão de papéis: o `perfil.yaml` guarda tudo o que é relevante; a `gerar-curriculo` escolhe por vaga quais projetos entram.

Só leitura. Não usa navegador: a coleta é feita pela API pública do GitHub.

## Modelo recomendado

**Haiku** dá conta. O script já entrega os dados mastigados; o trabalho é resumir README em bullets fiéis.

## Passo a passo

1. **Descobrir o usuário do GitHub**, nesta ordem:
   - `dados_pessoais.github` em `curriculo/perfil.yaml` (aceita `github.com/<usuario>` ou só `<usuario>`);
   - o link do GitHub no LinkedIn, se a `linkedin-importar-perfil` já rodou;
   - senão, pergunte ao usuário.

2. **Coletar os dados** com o script (grava no scratchpad, não no projeto):
   ```
   node .claude/skills/github-importar-perfil/scripts/github-perfil.mjs <usuario> --out <scratchpad>/github-perfil.json
   ```
   - Traz: bio, site, local, README do perfil, todos os repositórios próprios (sem forks, sem arquivados), com os **fixados primeiro**. Os 12 primeiros vêm com linguagens (%) e README (até 3.000 caracteres). Use `--detalhar N` pra mudar esse número.
   - Sem login, a API permite 60 requisições/hora (o padrão gasta ~27). Se der erro de limite, peça pro usuário pôr um `GITHUB_TOKEN` (token sem permissões, só leitura pública) no `.env`.

3. **Escolher quais repositórios viram projeto.** Entram por padrão:
   - todos os **fixados**;
   - repositórios com README que descreve um produto/app de verdade (o que faz, funcionalidades, stack).

   Ficam fora por padrão, listados pro usuário confirmar:
   - repositório sem descrição e sem README (ou README vazio/padrão de template, tipo "This project was bootstrapped with…");
   - POCs, exercícios e repositórios de curso (`poc-*`, `*-test`, `aula-*`, nome de curso no README);
   - repositórios de conteúdo/configuração (artigos, dotfiles, o repo `<usuario>/<usuario>`).

   Mostre as duas listas (entra / fica fora, com o motivo em poucas palavras) e siga com a lista "entra", a menos que o usuário mude algo.

4. **Montar cada projeto** no schema de `curriculo/perfil.example.yaml`:
   ```yaml
   - nome: "Finance AI"
     descricao: "uma linha: o que é o projeto"
     link: "https://github.com/<usuario>/finance-ai"
     site: "https://..."        # homepage do repo, se houver
     periodo: "2025 – 2026"     # ano de criação – ano do último push (um ano só se forem iguais)
     fontes: [github]
     stack: ["TypeScript", "Next.js", "Prisma"]
     destaques:
       - "fato tirado do README"
   ```
   - `descricao`: a descrição do repositório; se vazia, a primeira frase do README que diz o que o projeto é.
   - `stack`: linguagens com 5% ou mais + tópicos + tecnologias que o README cita explicitamente. Não deduza biblioteca que não esteja escrita.
   - `destaques`: 2 a 5 bullets com funcionalidades e decisões técnicas **que estão no README**. Nada de métricas, usuários ou resultados que o README não diga.
   - Idioma: se o `perfil.yaml` tiver `idioma_base` (ex.: `pt-BR`), traduza fielmente para ele (nomes de tecnologias e produtos ficam como estão); senão, mantenha o do README. A `gerar-curriculo` adapta pro idioma da vaga.

5. **Somar as skills técnicas**: junte linguagens (5% ou mais), tópicos e tecnologias citadas nos READMEs dos projetos que entraram, e **adicione automaticamente** as que ainda não estão em `skills.tecnicas`, com a deduplicação do documento de mescla. Não pergunte; liste as adicionadas no resumo final.

6. **Gravar no `perfil.yaml`** seguindo [docs/mescla-perfil.md](../../../docs/mescla-perfil.md):
   1. Backup e resumo das diferenças: projetos novos, projetos **fundidos** com um que já existia (ex.: veio do LinkedIn e também está no GitHub), skills adicionadas e itens com `fontes: [github]` que sumiram do GitHub.
   2. Projetos que já existem (do LinkedIn ou manuais) **não são substituídos**: são fundidos ou mantidos.
   3. Preencha `dados_pessoais.github` e `dados_pessoais.site` se estiverem vazios.
   4. Não mexa em `experiencias`, `formacao`, `certificacoes`, `idiomas` nem `resumo`. A bio do GitHub só entra se o usuário pedir.

7. **Conferir**: valide o YAML (`npx --yes js-yaml@4.1.0 curriculo/perfil.yaml > /dev/null`), mostre a contagem final (N projetos, N novos, N fundidos, N skills adicionadas) e o caminho do backup. Se o LinkedIn ainda não foi importado, sugira a `linkedin-importar-perfil`.

## Observações

- Só repositórios públicos. Projetos privados ou de empresa ficam de fora; se o usuário quiser, ele descreve e você adiciona à mão.
