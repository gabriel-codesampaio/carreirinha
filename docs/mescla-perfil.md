# Regras de mescla do `perfil.yaml`

Seguidas por `linkedin-importar-perfil` e `github-importar-perfil`. As duas importações **somam** no mesmo `curriculo/perfil.yaml`: nenhuma apaga o que a outra trouxe, e a ordem em que rodam não muda o resultado.

## Quem é dono de cada seção

| Seção | LinkedIn | GitHub | Regra |
|---|---|---|---|
| `dados_pessoais` | preenche | preenche `github` e `site` se vazios | Campo já preenchido não é sobrescrito sem mostrar a diferença. |
| `titulo`, `resumo` | dono | não mexe | |
| `experiencias`, `formacao`, `certificacoes`, `idiomas` | dono | não mexe | |
| `skills.tecnicas` | soma | soma | **União** das duas fontes + o que já estava no YAML. |
| `skills.comportamentais` | soma | não mexe | |
| `projetos` | soma | soma | **União**, com projetos repetidos fundidos numa entrada só. |

## Skills técnicas: união automática

- Tudo o que uma fonte trouxer entra **sem perguntar**. Mostre a lista do que foi adicionado no resumo final.
  - LinkedIn: a seção Competências, os blocos de stack das experiências e projetos, e a lista "Principais tecnologias" do Sobre.
  - GitHub: linguagens com 5% ou mais nos projetos que entraram, tópicos dos repositórios (menos tópicos de controle, como `study-project`, `sale-client`, `config`, `library`) e tecnologias citadas explicitamente nos READMEs desses projetos.
- **Sem duplicatas.** Compare pelo nome normalizado: sem diferença de maiúsculas, espaços, pontos, hífens e sufixos `.js`/`JS`. Ex.: `React`, `ReactJS` e `React.js` são a mesma skill; `Tailwind CSS` e `TailwindCSS` também. Quando já existe, mantenha a grafia que está no YAML.
- Versão não é skill nova: `Next.js 15` conta como `Next.js`.
- Encaixe cada skill nova no grupo de comentário certo (`# Front-end`, `# Back-end`, `# Dados`, `# Testes`, `# DevOps / Ferramentas`, `# Integrações`, `# Outros`).

## Projetos: união com fusão

- Cada projeto tem `fontes`, a lista de onde ele veio: `linkedin`, `github` e/ou `manual`.
- **Mesmo projeto** quando o nome normalizado bate (ex.: "Finance AI" e `finance-ai`) ou quando o link de um aparece no outro. Nesse caso, funda numa entrada só:
  - `link`: o do GitHub; `site`: o que existir;
  - `descricao`: a mais completa;
  - `stack` e `destaques`: união, sem repetir o mesmo fato com outras palavras;
  - `periodo`: o início mais antigo e o fim mais recente;
  - `fontes`: as duas.
- Projeto que só existe no YAML (sem `fontes`, ou com `manual`) é mantido sempre.

## O que nunca acontece

- **Nenhuma importação remove itens.** Se algo que tinha `fontes: [github]` sumiu do GitHub (repo apagado ou privado), liste no resumo como "não encontrado mais no GitHub" e deixe o usuário decidir.
- Nenhum texto é inventado ou "melhorado". Reescrita para a vaga é trabalho da `gerar-curriculo`.

## Antes de gravar

1. Backup do arquivo atual em `curriculo/historico/perfil-<AAAA-MM-DD-HHMM>.yaml`.
2. Resumo das diferenças por seção: o que entrou, o que mudou, o que só existe no YAML e o que sumiu da fonte.
3. Gravar e validar o YAML (`npx --yes js-yaml@4.1.0 curriculo/perfil.yaml > /dev/null`).
