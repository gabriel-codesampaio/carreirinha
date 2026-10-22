---
name: enviar-email
description: Monta e envia um e-mail de candidatura pra uma vaga, com o currículo em PDF anexado, usando a conta de e-mail configurada em `.env` (qualquer provedor SMTP). Use quando o pedido for pra candidatar/mandar currículo por e-mail pra uma vaga ou recrutador.
---

# Enviar E-mail de Candidatura

Monta o e-mail de candidatura e só dispara de fato com confirmação explícita do usuário. **Nunca pule a etapa de confirmação, mesmo que o pedido pareça claro.**

> **Regra fixa do usuário: nenhum currículo é enviado sem ele saber pra qual vaga vai e aprovar antes.** Antes de qualquer `--confirm`, mostre **vaga (cargo + empresa), destinatário, assunto e anexo** de cada e-mail e espere um "sim" claro. Uma aprovação vale só pros e-mails que estavam na lista mostrada; vaga nova = pergunta nova. Isso vale também dentro da `rotina-linkedin` e nunca é desligado por configuração.

## Pré-requisito (uma vez só)

Antes do primeiro envio real, é preciso ter um `.env` na raiz do projeto (cópia de `.env.example` preenchida):
- `SMTP_HOST` / `SMTP_PORT`: endereço do provedor SMTP (iCloud, Gmail, Outlook, SendGrid etc. — cada um documenta o seu)
- `SMTP_USER` / `SMTP_PASS`: login da conta de e-mail + (se o provedor exigir, como iCloud/Gmail com 2FA) uma "senha de app" gerada nas configurações de segurança da conta
- `EMAIL_FROM`: `"Nome Completo <email@dominio.com>"`
- `EMAIL_BCC` (opcional): cópia oculta (CCO) de **todo** e-mail de candidatura, um ou mais endereços separados por vírgula. O script põe sozinho; não precisa de flag. Aparece no preview (`CCO:`) e no registro de `vagas/enviados.json`.

**iCloud Mail (inclui alias e domínio próprio do iCloud+)**:
- `SMTP_HOST=smtp.mail.me.com`, `SMTP_PORT=587`
- `SMTP_USER`: o endereço **principal** do iCloud Mail, completo (ex.: `nome@icloud.com`). Não use o alias nem o domínio próprio aqui.
- `SMTP_PASS`: uma **senha de app** (account.apple.com → Entrar e Segurança → Senhas de app). A senha do Apple ID não funciona.
- `EMAIL_FROM`: o endereço que o recrutador vai ver, que pode ser o alias ou o domínio próprio, ex.: `"Nome <voce@seudominio.com>"`.

**Assinatura**: `config/assinatura.html` (HTML com estilos inline; imagens com caminho local, como `assinatura-logo.png`, vão embutidas no e-mail) e `config/assinatura.txt` (texto puro). Modelos em `config/assinatura.example.*`. Sem esses arquivos, o e-mail sai só em texto, sem assinatura.

**Testar a configuração** (não envia nada pra ninguém):
```
node ".claude/skills/enviar-email/scripts/send-email.mjs" --testar
```
Confere conexão e login e, se falhar, diz o motivo provável. O login não garante que o servidor aceita o `EMAIL_FROM` (alias); pra isso, com autorização do usuário, rode `--testar --enviar-teste`, que manda um e-mail curto do `EMAIL_FROM` pra ele mesmo.

Se o `.env` não existir ou faltar alguma variável, o script avisa e não envia nada — oriente o usuário a preencher antes de continuar. **Nunca peça pra ele(a) colar a senha de app no chat** — ele(a) preenche direto no arquivo `.env` local.

## Passo a passo

1. **Reunir os dados da vaga**: destinatário (e-mail do recrutador/RH), nome da vaga/empresa, e se já existe um currículo gerado pra essa vaga em `curriculo/gerados/` (se não existir, use a skill `gerar-curriculo` primeiro). A `gerar-curriculo` salva a vaga em `vagas/vaga-<empresa>-<cargo>-<data>.json`, com `contato`, `como_candidatar` e a `aderencia`: use esse arquivo em vez de perguntar de novo.

2. **Redigir o corpo do e-mail**, no idioma da vaga, **sempre ligando o que a vaga pede ao que o usuário já fez**. Nunca uma lista solta de tecnologias. Estrutura:
   1. **Saudação** com o primeiro nome de quem divulgou a vaga, se souber ("Olá, Mariana, tudo bem?").
   2. **Uma linha** dizendo qual vaga e onde viu ("Vi sua publicação sobre a vaga de <cargo> na <empresa> e gostaria de me candidatar.").
   3. **O parágrafo de encaixe**, 2 ou 3 frases: pegue 2 ou 3 requisitos com status "atende" na `aderencia` do JSON da vaga, **cite-os como a vaga escreveu** e diga onde o usuário fez aquilo, com um resultado concreto do `perfil.yaml` se houver. Formato: "A vaga pede X e Y, que é o que faço há N anos: na <empresa>, <fato com resultado>."
   4. **Uma linha** de fechamento: "Os detalhes estão no currículo em anexo, e fico à disposição para conversarmos."
   5. **Despedida e primeiro nome** de quem usa o projeto ("Abraço," + quebra de linha + primeiro nome).

   Regras: nada de requisito "parcial" ou "não atende" apresentado como se o usuário tivesse; nenhum número que não esteja no perfil; no máximo ~90 palavras entre saudação e despedida. **Não** escreva telefone, e-mail ou site no corpo, porque a assinatura de `config/assinatura.html` entra sozinha no fim (versão HTML com logo + `config/assinatura.txt` na versão em texto). Use `--sem-assinatura` só se o usuário pedir. Salve o corpo em um arquivo temporário, ex: `curriculo/gerados/_email-<empresa>.txt`.

   **Assunto**, nesta ordem:
   1. Se a vaga **manda usar um assunto** ("enviem com o assunto: X"), use **exatamente** X.
   2. Senão, se a vaga tem **título**, ponha o título no assunto, escrito como na vaga: `<título da vaga> – <nome do usuário>` (ex.: `Desenvolvedor(a) Back-end Pleno – Ana Souza`). Se a vaga tiver código, inclua: `<título> (<código>) – <nome>`.
   3. Só sem título nenhum: `Candidatura – <área ou cargo do usuário> – <nome>`.

   Exemplo fictício (vaga de Back-end pedindo Node.js, PostgreSQL e filas; os fatos vêm sempre do `perfil.yaml` de quem usa):
   > Olá, Mariana, tudo bem?
   >
   > Vi sua publicação sobre a vaga de Desenvolvedor(a) Back-end Pleno na Empresa X e gostaria de me candidatar.
   >
   > A vaga pede Node.js, PostgreSQL e filas de mensagens, que é o que faço há 3 anos: na Empresa Y, construí as APIs de pagamento em Node.js com PostgreSQL e migrei o processamento de pedidos para filas no RabbitMQ, o que reduziu o tempo de resposta pela metade.
   >
   > Os detalhes estão no currículo em anexo, e fico à disposição para conversarmos.
   >
   > Abraço,
   > Ana

3. **Gerar o preview (sem enviar)**:
   ```
   node ".claude/skills/enviar-email/scripts/send-email.mjs" \
     --to "<email-destinatario>" \
     --subject "<assunto>" \
     --body "<caminho-do-corpo.txt>" \
     --attach "<caminho-do-pdf-em-curriculo/gerados/>" \
     --attach-name "<nome_arquivo_envio do JSON da vaga>"
   ```
   O `--attach-name` é o nome que o recrutador vê no anexo (ex.: `Maria_Silva_Curriculo_Front-End_Senior.pdf`), definido pela `gerar-curriculo`. Se o JSON da vaga não tiver `nome_arquivo_envio`, monte o nome pela mesma regra (passo 7 da `gerar-curriculo`).
   Isso roda em **modo rascunho por padrão** — mostra o preview completo (de/para/assunto/anexo/corpo) e não envia nada.

4. **Mostrar o preview ao usuário** e perguntar explicitamente se pode enviar. Só prossiga com uma confirmação afirmativa clara dele(a) (ex: "pode mandar", "sim", "confirma").

5. **Enviar de fato** (só depois da confirmação): repita o mesmo comando acrescentando `--confirm` no final.
   - O script checa duplicidade: se já existe um envio registrado pro mesmo destinatário + assunto em `vagas/enviados.json`, ele recusa enviar de novo (evita candidatura duplicada). Avise o usuário se isso acontecer — só use `--force` se ele(a) confirmar que quer reenviar mesmo assim.

6. **Confirmar o resultado** ao usuário (enviado com sucesso / erro), atualize o status da vaga em `vagas/candidaturas.md` (`enviado em <data hora>`) e apague o arquivo de corpo temporário se não precisar guardar.

## Observações importantes

- **Nunca** rode o comando com `--confirm` sem antes ter mostrado o preview e recebido uma confirmação explícita do usuário nessa mesma conversa.
- Não invente dados sobre a vaga ou sobre a experiência do usuário no corpo do e-mail — use só o que está em `curriculo/perfil.yaml` e o que o usuário informou sobre a vaga.
- `vagas/enviados.json` e qualquer `.env` contêm informação sensível — nunca exibir o conteúdo do `.env` no chat.
