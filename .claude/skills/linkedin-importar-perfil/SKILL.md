---
name: linkedin-importar-perfil
description: Lê o próprio perfil do LinkedIn do usuário (sobre, experiências com descrições, formação, certificações, skills, idiomas, projetos, contato) pelo navegador controlado via MCP (chrome-devtools) e mescla em curriculo/perfil.yaml. É dona de experiências/formação/resumo; skills técnicas e projetos são somados aos que vieram do GitHub (docs/mescla-perfil.md). Use quando o pedido for pra criar, preencher, importar ou sincronizar o perfil/base de carreira a partir do LinkedIn.
---

# Importar perfil do LinkedIn

Monta `curriculo/perfil.yaml` a partir do perfil do LinkedIn do próprio usuário.

Trabalha junto com a `github-importar-perfil`: as duas **somam** no mesmo arquivo, seguindo [docs/mescla-perfil.md](../../../docs/mescla-perfil.md). O LinkedIn é dono de experiências, formação, certificações, idiomas e resumo; skills técnicas e projetos são a **união** das duas fontes. Leia esse documento antes do passo 4.

**Divisão de papéis:**
- `perfil.yaml` é a base **completa**: todas as experiências, todos os bullets, todas as skills, sem cortes.
- O currículo é **recortado por vaga** pela skill `gerar-curriculo`, que escolhe e prioriza a partir dessa base.

Por isso esta skill **não resume, não seleciona e não reescreve** nada pra "ficar melhor". Ela transcreve o que está no LinkedIn.

Só leitura: não edita nada no LinkedIn.

## Modelo recomendado

**Haiku** dá conta da leitura. A parte de mapear texto pro YAML é simples e bem definida aqui.

## Pré-requisito

Página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Se a sessão caiu, peça pro usuário logar manualmente. Nunca digite credenciais.

## Passo a passo

1. **Achar o próprio perfil**: `navigate_page` para `https://www.linkedin.com/in/me/`. O LinkedIn redireciona pro perfil do usuário; guarde a URL final (`https://www.linkedin.com/in/<slug>/`) como `dados_pessoais.linkedin`.

2. **Ler cada seção pela página de detalhes**, que traz a lista completa (a página principal corta em 2-3 itens). Para cada URL abaixo, navegue e leia o texto com `evaluate_script` (só leitura), em vez de snapshot, que é bem mais pesado:
   ```js
   async () => {
     await new Promise(r => setTimeout(r, 3000));
     const main = document.querySelector('main') || document.body;
     return main.innerText;
   }
   ```

   | Seção | URL | Vira no YAML |
   |---|---|---|
   | Topo + Sobre | `/in/<slug>/` | `nome`, `localizacao`, `titulo` (headline), `resumo` (texto do "Sobre") |
   | Contato | `/in/<slug>/overlay/contact-info/` | `email`, `telefone`, `site`, `github` (se estiver nos sites) |
   | Experiência | `/in/<slug>/details/experience/` | `experiencias` |
   | Formação | `/in/<slug>/details/education/` | `formacao` |
   | Licenças e certificados | `/in/<slug>/details/certifications/` | `certificacoes` |
   | Competências | `/in/<slug>/details/skills/` | `skills.tecnicas` / `skills.comportamentais` |
   | Idiomas | `/in/<slug>/details/languages/` | `idiomas` |
   | Projetos | `/in/<slug>/details/projects/` | `projetos` |

   - Seção que não existe no perfil (404 ou página vazia): deixe a lista vazia e siga.
   - **Texto cortado** ("… ver mais" / "…see more"): o `innerText` costuma já trazer o texto inteiro, com o rótulo "… mais" no fim (visto em 2026-10-19 no "Sobre" e em Projetos). Só trate como cortado se o texto parar no meio de uma frase. Nesse caso, tire um `take_snapshot`, ache o botão "ver mais" daquele item e clique com `mcp__chrome-devtools__click`. Expandir texto não altera nada no perfil. Depois leia de novo.
   - **Competências** paginam com rolagem. Role o container até o fim (mesmo padrão de scroll da `linkedin-vagas-posts`) antes de ler, pra pegar todas.

3. **Mapear pro schema de `curriculo/perfil.example.yaml`**:
   - **Experiências**: uma entrada por cargo. Se a pessoa teve vários cargos na mesma empresa (o LinkedIn agrupa), crie uma entrada por cargo, repetindo a empresa.
     - `periodo`: como aparece, no formato `mmm/AAAA – mmm/AAAA` ou `– atual`. Ignore a duração calculada ("2 anos 3 meses").
     - `local`: cidade + modelo (remoto/híbrido/presencial), se aparecer.
     - `contexto`: só se a descrição tiver uma linha explícita sobre o que a empresa/projeto faz.
     - `bullets`: quebre a descrição nos marcadores/linhas que o próprio usuário escreveu (•, -, quebra de linha). **Mantenha o texto original**, só limpe espaços e marcadores. Descrição em parágrafo corrido sem marcadores vira um bullet por frase.
     - Competências listadas no item ("Competências: React, TypeScript…") vão pra `stack` da experiência, não pros bullets. O mesmo vale pra blocos de stack escritos dentro da descrição ("Tech Stack & Skills: ReactJS | NextJS | …"): vão pra `stack`, separados por `|` ou vírgula.
     - Subtítulos da descrição ("Key Projects & Expertise:") não viram bullet. O item embaixo dele vira bullet com o subtítulo do item no começo (ex.: "Micro-Frontends Architecture: Specialized in…").
   - **Idioma do texto**: mantenha o idioma em que está no LinkedIn (descrições em inglês ficam em inglês). Não traduza aqui. Quem traduz, se a vaga pedir, é a `gerar-curriculo`.
   - **Skills**: técnicas (linguagens, frameworks, ferramentas, metodologias) em `tecnicas`; soft skills (liderança, comunicação…) em `comportamentais`. Na dúvida, `tecnicas`. Junte as da seção Competências com as do campo `stack` de cada experiência e projeto e com a lista "Principais tecnologias" do Sobre, se houver.
   - **Projetos**: cada projeto da seção Projetos vira uma entrada de `projetos` com `fontes: [linkedin]` (descrição, período, stack das competências do item e destaques dos marcadores da descrição).
   - **Certificações**: uma string por certificado, no formato `"Emissor – Nome (carga horária ou mmm/AAAA)"`, igual ao schema.
   - **Idiomas**: uma string por idioma, ex.: `"Inglês – Proficiência profissional"`.
   - Nunca invente campo, número, data ou conquista que não esteja no LinkedIn.

4. **Mesclar com o `perfil.yaml` existente** seguindo [docs/mescla-perfil.md](../../../docs/mescla-perfil.md):
   - Se `curriculo/perfil.yaml` não existir, crie direto a partir do schema.
   - Se existir: backup, resumo das diferenças e gravação, como o documento manda. Nas seções que o LinkedIn domina, **preserve** campos que o LinkedIn não tem e que já estão preenchidos (ex.: `telefone`, `github`, `contexto`, bullets com métricas). Bullet que existe só no YAML fica, marcado com `# só no perfil.yaml`.
   - **Skills técnicas e projetos**: some ao que já existe (inclusive o que veio do GitHub). Não remova nada e não pergunte quais skills adicionar.

5. **Conferir**: valide o YAML (`npx --yes js-yaml@4.1.0 curriculo/perfil.yaml > /dev/null`) e mostre a contagem final: N experiências, N bullets, N skills (N novas), N projetos, N certificações. Liste o que veio vazio do LinkedIn (ex.: "sem projetos", "Sobre vazio") pra o usuário completar se quiser. Se o GitHub ainda não foi importado (nenhum projeto com `github` em `fontes`), sugira rodar a `github-importar-perfil` em seguida.

## Observações

- `perfil.yaml` tem dados pessoais (PII) e já está no `.gitignore`. Não exponha fora do projeto.
- Os campos de contato (e-mail, telefone) só aparecem pro próprio dono do perfil. Se vierem vazios, mantenha o que já estava no YAML.
- As URLs de `details/` não mudam com o idioma. Com a interface em inglês, os títulos das seções vêm em inglês (Experience, Education, Licenses & certifications, Skills, Languages, Projects) e os meses também ("Jan 2021 - Present"): converta pro formato do schema (`jan/2021 – atual`) do mesmo jeito.
- O LinkedIn muda o layout com frequência. Se uma URL de `details/` parar de funcionar, leia a seção direto da página principal clicando em "Exibir todas as experiências" / "Show all".
