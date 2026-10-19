---
name: enviar-email
description: Monta e envia um e-mail de candidatura pra uma vaga, com o currículo em PDF anexado, usando a conta de e-mail configurada em `.env` (qualquer provedor SMTP). Use quando o pedido for pra candidatar/mandar currículo por e-mail pra uma vaga ou recrutador.
---

# Enviar E-mail de Candidatura

Monta o e-mail de candidatura e só dispara de fato com confirmação explícita do usuário. **Nunca pule a etapa de confirmação, mesmo que o pedido pareça claro.**

## Pré-requisito (uma vez só)

Antes do primeiro envio real, é preciso ter um `.env` na raiz do projeto (cópia de `.env.example` preenchida):
- `SMTP_HOST` / `SMTP_PORT`: endereço do provedor SMTP (iCloud, Gmail, Outlook, SendGrid etc. — cada um documenta o seu)
- `SMTP_USER` / `SMTP_PASS`: login da conta de e-mail + (se o provedor exigir, como iCloud/Gmail com 2FA) uma "senha de app" gerada nas configurações de segurança da conta
- `EMAIL_FROM`: `"Nome Completo <email@dominio.com>"`

Se o `.env` não existir ou faltar alguma variável, o script avisa e não envia nada — oriente o usuário a preencher antes de continuar. **Nunca peça pra ele(a) colar a senha de app no chat** — ele(a) preenche direto no arquivo `.env` local.

## Passo a passo

1. **Reunir os dados da vaga**: destinatário (e-mail do recrutador/RH), nome da vaga/empresa, e se já existe um currículo gerado pra essa vaga em `curriculo/gerados/` (se não existir, use a skill `gerar-curriculo` primeiro).

2. **Redigir o corpo do e-mail**: curto, direto, menciona a vaga específica, por que o usuário é um bom encaixe (baseado em `curriculo/perfil.yaml`, sem inventar nada) e que o currículo está em anexo. Assine com nome, telefone e site (dados em `curriculo/perfil.yaml`). Salve o corpo em um arquivo temporário, ex: `curriculo/gerados/_email-<empresa>.txt`.

3. **Gerar o preview (sem enviar)**:
   ```
   node ".claude/skills/enviar-email/scripts/send-email.mjs" \
     --to "<email-destinatario>" \
     --subject "<assunto>" \
     --body "<caminho-do-corpo.txt>" \
     --attach "<caminho-do-pdf-em-curriculo/gerados/>"
   ```
   Isso roda em **modo rascunho por padrão** — mostra o preview completo (de/para/assunto/anexo/corpo) e não envia nada.

4. **Mostrar o preview ao usuário** e perguntar explicitamente se pode enviar. Só prossiga com uma confirmação afirmativa clara dele(a) (ex: "pode mandar", "sim", "confirma").

5. **Enviar de fato** (só depois da confirmação): repita o mesmo comando acrescentando `--confirm` no final.
   - O script checa duplicidade: se já existe um envio registrado pro mesmo destinatário + assunto em `vagas/enviados.json`, ele recusa enviar de novo (evita candidatura duplicada). Avise o usuário se isso acontecer — só use `--force` se ele(a) confirmar que quer reenviar mesmo assim.

6. **Confirmar o resultado** ao usuário (enviado com sucesso / erro) e apague o arquivo de corpo temporário se não precisar guardar.

## Observações importantes

- **Nunca** rode o comando com `--confirm` sem antes ter mostrado o preview e recebido uma confirmação explícita do usuário nessa mesma conversa.
- Não invente dados sobre a vaga ou sobre a experiência do usuário no corpo do e-mail — use só o que está em `curriculo/perfil.yaml` e o que o usuário informou sobre a vaga.
- `vagas/enviados.json` e qualquer `.env` contêm informação sensível — nunca exibir o conteúdo do `.env` no chat.
