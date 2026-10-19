---
name: verificar-setup
description: Diagnóstico inicial do projeto. Confere se está tudo configurado pro agente de carreira rodar (Node, dependências, Chrome, perfil.yaml, .env de e-mail, arquivos de config/, skills de apoio, privacidade no git, navegador MCP e login no LinkedIn) e diz o que falta e como resolver. Use na primeira vez que o projeto for usado, quando algo falhar sem motivo claro, ou quando o pedido for pra verificar/checar/diagnosticar a configuração.
---

# Verificar setup

Diz, em uma tela, o que está pronto, o que falta e qual skill fica bloqueada por isso. **Só leitura**: não cria, não edita e não envia nada.

## Modelo recomendado

**Haiku** dá conta.

## Passo a passo

1. **Checagens locais** (na raiz do projeto):
   ```
   node .claude/skills/verificar-setup/scripts/verificar.mjs --rede
   ```
   Confere Node, `npm install`, Chrome/Edge para o PDF, `curriculo/perfil.yaml` (nome, e-mail, experiências, skills, projetos, GitHub), `.env` (só se cada variável está preenchida, **nunca o valor**), `config/`, template do currículo, skills de apoio e se os arquivos com dados pessoais estão fora do git. Sai com código 1 se houver item bloqueante. Sem `--rede`, não testa o GitHub.

2. **Navegador MCP** (o script não alcança):
   - `mcp__chrome-devtools__list_pages`. Se a ferramenta não existir ou der erro, o MCP `chrome-devtools` não está conectado: marque ❌ para todas as skills de LinkedIn e indique a skill `chrome-devtools-mcp:troubleshooting`.
   - **Login no LinkedIn**: abra uma aba nova (`new_page`) em `https://www.linkedin.com/feed/` e leia `location.href` com `evaluate_script`. Se a URL tiver `/login`, `/authwall`, `/checkpoint` ou `/uas/`, está deslogado: ❌, e o usuário precisa logar **manualmente** nessa janela (nunca digite credenciais). Feche a aba depois (`close_page`).

3. **Relatório**: junte tudo numa tabela única, agrupada por área, com ✅ / ⚠️ / ❌, e uma coluna "o que fica bloqueado":

   | Skill | Precisa de |
   |---|---|
   | `linkedin-importar-perfil`, `linkedin-buscar-vagas`, `linkedin-vagas-posts`, `linkedin-conectar-recrutadores`, `linkedin-total-conexoes`, `rotina-linkedin` | MCP `chrome-devtools` + login no LinkedIn |
   | `github-importar-perfil` | `npm install`, usuário do GitHub no perfil, rede |
   | `gerar-curriculo` | `perfil.yaml` com nome, e-mail e experiências; Chrome/Edge |
   | `enviar-email` | `npm install`, `.env` completo, `perfil.yaml` |
   | `linkedin-vagas-posts`, `linkedin-buscar-vagas`, `linkedin-conectar-recrutadores` | `config/` (sem ele usam os `.example.md`, que funcionam mas com valores genéricos) |

4. **Próximo passo**: termine com a lista do que resolver, na ordem que destrava mais coisas (normalmente: `npm install` → perfil → login no LinkedIn → `.env`). Para cada item, diga a ação concreta. Ex.: "Preencha `SMTP_PASS` no `.env` com uma senha de app do seu provedor", e nunca peça o valor no chat.

## Observações

- ⚠️ não bloqueia: a skill roda, mas com valor padrão ou sem um recurso (ex.: sem projetos, o currículo sai sem a seção Projetos).
- Rode de novo depois de corrigir, até não sobrar ❌ nas skills que o usuário quer usar.
