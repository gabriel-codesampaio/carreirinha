---
name: limpar-dados
description: Apaga currículos gerados (curriculo/gerados/) e arquivos de vaga (vagas/vaga-*.json, linkedin-posts-*.json, linkedin-vagas-*.json) com mais de 1 semana, e tira as entradas antigas de vagas/posts-vistos.json. Mantém históricos, logs anti-duplicidade e os currículos originais de curriculo/historico/. Use quando o pedido for pra limpar/apagar currículos ou vagas antigas, ou "faz a limpeza".
---

# Limpar dados antigos

Remove o que ficou velho: currículo gerado pra uma vaga de mais de uma semana atrás e os arquivos dessas vagas. Apagar não tem volta (os arquivos estão fora do git), então siga o fluxo abaixo.

## O que entra e o que nunca entra

| Apaga (mais de `--dias`, padrão 7) | Nunca apaga |
|---|---|
| `curriculo/gerados/*.pdf`, `*.html`, `_email-*.txt` | `curriculo/historico/` (currículos originais e backups do `perfil.yaml`) |
| `vagas/vaga-*.json` | `curriculo/perfil.yaml` |
| `vagas/linkedin-posts-*.json`, `vagas/linkedin-vagas-*.json`, `vagas/vagas-*.json` | `vagas/candidaturas.md`, `vagas/rotina-linkedin.md`, `vagas/progresso-recrutadores.md` (históricos) |
| Entradas antigas de `vagas/posts-vistos.json` (o arquivo fica) | `vagas/enviados.json`, `vagas/linkedin-conexoes.json` (evitam e-mail/convite duplicado) |
| | Qualquer `README.md`, `config/`, `.env` |

A idade vem da data `AAAA-MM-DD` no nome do arquivo; sem data no nome, da data de modificação.

**Candidatura em aberto fica**: o script preserva o PDF, o HTML, o `_email-*.txt` e o `vaga-*.json` de toda linha de `vagas/candidaturas.md` com status `pendente`, `e-mail pronto`, `aguardando` ou `currículo pronto`, mesmo antigos, e lista esses arquivos como `Preservado:`.

## Passo a passo

1. **Rascunho** (não apaga nada):
   ```
   node ".claude/skills/limpar-dados/scripts/limpar.mjs"
   ```
   Para outro prazo: `--dias 14`.
2. **Mostre a lista** ao usuário (arquivo + data), junto com o que foi preservado e por quê.
3. **Apagar**: se o usuário pediu a limpeza, a lista e o envio vão na mesma etapa (mesmo padrão da `linkedin-conectar-recrutadores`): rode com `--confirm` logo depois de mostrar a lista. Se a limpeza foi sugerida por você e não pedida, pergunte antes.
   ```
   node ".claude/skills/limpar-dados/scripts/limpar.mjs" --confirm
   ```
   Em `vagas/candidaturas.md` as linhas ficam (é o histórico), e o caminho do PDF apagado vira `(apagado na limpeza de <data>)`.
4. **Resuma**: quantos arquivos saíram, quantas entradas de posts vistos, e o que foi mantido de propósito.

## Regras

- Nunca apague à mão (`rm`) fora do script, nem nada da coluna "Nunca apaga".
- Nunca rode `--confirm` sem ter mostrado a lista nessa mesma conversa.
