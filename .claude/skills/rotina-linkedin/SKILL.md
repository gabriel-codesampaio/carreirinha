---
name: rotina-linkedin
description: Rotina diária de LinkedIn, disparada manualmente ("bom dia, vamos rodar a rotina"). Rola o feed atrás de vagas compatíveis com o perfil, gera um currículo pra cada uma, prepara o e-mail (só envia depois de mostrar as vagas e o usuário aprovar) quando o post tem um (ou guarda como pendente quando não tem), convida o limite diário de tech recruiters, recarrega o feed atrás de posts novos e repete, e termina com o total de conexões, o envio dos e-mails numa confirmação só e o registro em vagas/rotina-linkedin.md e vagas/candidaturas.md. Use quando o pedido for "roda a rotina", "rotina do LinkedIn", "vamos rodar a rotina" ou /rotina-linkedin.
---

# Rotina do LinkedIn

Encadeia skills que já existem. **Não duplique a lógica delas aqui**: abra o `SKILL.md` de cada uma e siga as regras de lá (segurança, fluxo de clique, filtro, aderência).

| Etapa | Skill |
|---|---|
| Vagas nos posts | `linkedin-vagas-posts` |
| Currículo por vaga | `gerar-curriculo` |
| E-mail de candidatura | `enviar-email` |
| Convites | `linkedin-conectar-recrutadores` |
| Conexões | `linkedin-total-conexoes` |

## Modelo recomendado

**Sonnet 5.5**, porque a rotina gera currículos. Haiku 5.5 dá conta da leitura, mas escreve pior. Numa sessão só, tudo roda no mesmo modelo.

## Antes de começar (sem perguntas)

A rotina **não pergunta nada no início**. Tudo vem dos arquivos:

| Arquivo | O que dá |
|---|---|
| `config/limites.md` (ou `.example.md`) | `convites_padrao_rotina`, `convites_por_dia_max`, `rodadas_feed_max`, `posts_max_por_execucao`, `aderencia_minima`, `confirmar_emails` |
| `config/filtro-vagas.md` (ou `.example.md`) | Que vagas interessam |
| `curriculo/perfil.yaml` | A base do currículo. Sem ele, pare e sugira as importações. |
| `vagas/rotina-linkedin.md` | Convites já enviados hoje e as conexões da última rotina |
| `vagas/posts-vistos.json` | Posts já lidos, que não são reavaliados |
| `vagas/candidaturas.md` | Vagas já tratadas, pra não gerar currículo duas vezes pra mesma vaga |

Se o usuário disser algo na chamada (ex.: "com 20 recrutadores", "sem convites hoje"), vale por cima dos arquivos.

## Passo a passo

### 0. Início
- Anote a data/hora de início (`date '+%Y-%m-%d %H:%M'`).
- Confirme a página logada no LinkedIn (`mcp__chrome-devtools__list_pages`). Deslogado: peça pro usuário logar e espere.
- **Convites de hoje**: some a coluna de convites enviados das linhas de hoje em `vagas/rotina-linkedin.md`. `X = min(convites_padrao_rotina ou o número pedido, convites_por_dia_max − já enviados hoje)`. Se der 0, a etapa 3 é pulada.

### 1. Rodada de vagas nos posts
Rode a `linkedin-vagas-posts` no feed, **pulando os posts de `vagas/posts-vistos.json`**, com o filtro do arquivo e o teto `posts_max_por_execucao`. Não pare na primeira vaga: leia a rodada inteira e junte as vagas **dentro do filtro**.

### 2. Para cada vaga dentro do filtro
Pule as que já estão em `vagas/candidaturas.md` (mesma empresa + cargo, ou mesmo link de post).

1. **Ler a vaga inteira**: o texto completo do post (expandindo o "… mais") e, se o post tiver link de vaga, a página do link.
2. **Aderência**: rode a parte de aderência da `gerar-curriculo` (passos 2 e 3, que salvam `vagas/vaga-*.json`). Se não atingir `aderencia_minima` (padrão: mais da metade dos requisitos obrigatórios), **não gere currículo**: registre como `descartada (aderência X de Y)` e siga.
3. **Currículo**: o resto da `gerar-curriculo`, sem as perguntas de ajuste do fim. Sai o PDF em `curriculo/gerados/`.
4. **Como se candidatar**:
   - **O post traz um e-mail de candidatura** → redija o e-mail (passo 2 da `enviar-email`) e gere o **preview** (sem `--confirm`). Status: `e-mail pronto`.
   - **Sem e-mail** (link de candidatura, Easy Apply, "comente", "me chama na DM") → status `pendente: você envia`, com o link ou a instrução exata. A rotina **nunca** comenta, manda DM nem clica em "Candidatar-se".
5. **Registre** em `vagas/candidaturas.md` (crie com o cabeçalho abaixo se não existir).

### 3. Convites
Rode a `linkedin-conectar-recrutadores` com `X` convites, mostrando a lista e enviando na mesma etapa: ao rodar a rotina, o usuário já autorizou esse número. Atualize `vagas/progresso-recrutadores.md` no fim, como a skill pede. Se o modo automático do Claude Code bloquear um envio, **não insista nem contorne**: anote quantos foram confirmados como `Pendente` e siga pra etapa 4.

### 4. Recarregar e repetir
- Recarregue o feed (`navigate_page` com `type: "reload"`) e rode de novo as etapas 1 e 2, **só com posts que não estão em `posts-vistos.json`**.
- Pare quando uma rodada não trouxer **nenhum post novo com vaga dentro do filtro**, ou ao chegar a `rodadas_feed_max` rodadas (contando a primeira).

### 5. Conexões
Rode a `linkedin-total-conexoes`. Compare com a coluna Conexões da última linha de `vagas/rotina-linkedin.md`: essa é a quantidade de **conexões novas desde a última rotina** (convites aceitos nesse meio-tempo). Convites de hoje quase nunca são aceitos na mesma manhã.

### 6. E-mails (a única pergunta da rotina, e ela nunca é pulada)
Se houver vagas com `e-mail pronto`:
**Nenhum currículo sai sem o usuário saber pra qual vaga vai e aprovar** (regra fixa dele; `confirmar_emails` só muda o formato da pergunta, nunca a desliga).
- Com `confirmar_emails: fim` (padrão): mostre **uma lista** (empresa, cargo, destinatário, assunto, anexo, aderência) e pergunte **uma vez** se pode enviar todos, alguns ou nenhum. Envie os aprovados com `--confirm`, um por vez, e atualize o status pra `enviado em <data hora>`.
- Com `confirmar_emails: cada`: mostre o preview de cada um e pergunte um por um.
- Sem resposta, ou se o modo automático bloquear: não envie. O status fica `e-mail pronto, aguardando você`.
- **Rodando como subagente** (sem como perguntar): não envie nada; devolva a lista pra conversa principal.

### 7. Registro e resumo
1. Acrescente uma linha em `vagas/rotina-linkedin.md` (crie com o cabeçalho se não existir):
   ```markdown
   # Histórico da rotina do LinkedIn

   | Início | Fim | Conexões | Δ desde última | Convites (enviados/pedidos) | Termos usados | Rodadas do feed | Posts novos | Vagas no filtro | Currículos | E-mails enviados | Pendentes | Observações |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|
   ```
2. Mostre o resumo ao usuário, nesta ordem:
   - **Pendências pra ele**: vagas com `pendente: você envia` (cargo, empresa, link/instrução, PDF) e e-mails não enviados. É o que ele precisa fazer hoje.
   - E-mails enviados.
   - Vagas descartadas por aderência (uma linha cada, com o motivo).
   - Convites enviados (nomes) e conexões novas desde a última rotina.

## `vagas/candidaturas.md`

Painel único das vagas tratadas pela rotina (e pela `gerar-curriculo` quando chamada sozinha). Uma linha por vaga; atualize a linha quando o status mudar.

```markdown
# Candidaturas

| Data | Empresa | Cargo | Aderência | Currículo | Como se candidatar | Status |
|---|---|---|---|---|---|---|
| 2026-10-20 | ACME | Front-end Sênior | 7/8 | curriculo/gerados/acme-frontend-senior-2026-10-20.pdf | rh@acme.com | enviado em 2026-10-20 09:42 |
| 2026-10-20 | Beta | React Developer | 5/6 | curriculo/gerados/beta-react-developer-2026-10-20.pdf | https://lnkd.in/xyz (Gupy) | pendente: você envia |
| 2026-10-20 | Gama | Front-end Pleno | 2/6 | — | DM pro autor | descartada (aderência 2 de 6) |
```

## Quando parar a rotina inteira

- Checkpoint de segurança, captcha ou aviso de limite do LinkedIn: pare **tudo**, registre o que deu tempo de fazer (histórico + candidaturas) e avise.
- Sessão do LinkedIn deslogada: peça pro usuário logar. Nunca digite credenciais.

Em qualquer parada, **sempre escreva a linha do histórico e o `candidaturas.md`** com o que aconteceu de fato.
