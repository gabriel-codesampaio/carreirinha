# Segurança

## Como reportar

Achou uma falha? Reporte em particular, sem abrir issue pública:

**[Reportar uma vulnerabilidade](https://github.com/gabriel-codesampaio/carreirinha/security/advisories/new)** (aba Security do repositório, "Report a vulnerability").

Descreva o problema, como reproduzir e o que pode ser afetado. Não inclua credenciais nem dados pessoais reais.

## O que conta

- Enviar por e-mail algo além do currículo e do corpo aprovados, como o `.env` ou o `perfil.yaml`.
- Burlar uma trava de `send-email.mjs`: anexo, corpo, duplicidade, empresa bloqueada ou hash do `--confirm`.
- Texto de terceiros (post, vaga, README) que leve o agente a agir por conta própria.
- Dados pessoais que iriam pro git, passando pelo `.gitignore` ou pela `verificar-setup`.

Restrições na conta do LinkedIn por uso das skills são um risco conhecido, descrito no [README](README.md), e não uma falha de segurança.
