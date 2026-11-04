# Carreirinha

Agente pessoal de carreira pra usar dentro do Claude Code: monta sua base de carreira a partir do LinkedIn e do GitHub, gera currículos sob medida pra cada vaga, busca vagas no LinkedIn, conecta você com recrutadores de tecnologia e prepara candidaturas por e-mail.

É um template pensado pra qualquer pessoa adotar na própria busca de emprego. Nada aqui é específico de um usuário: a carreira fica em `curriculo/perfil.yaml`, as preferências em `config/`, as credenciais em `.env` e o histórico em `vagas/`, tudo fora do git.

Veja [PLANNING.md](PLANNING.md) pra arquitetura, status e próximos passos. O agente está em `.claude/agents/carreirinha.md` e as capacidades em `.claude/skills/`.

**Pra quem é:** profissionais de tecnologia (dev, QA, dados, DevOps, produto) buscando vaga no Brasil ou remoto. Os termos de busca de recrutadores são de tech e o filtro de vagas é configurável por stack e cargo.

## ⚠️ Aviso sobre o LinkedIn

Este projeto **não tem nenhum vínculo com o LinkedIn**. As skills de LinkedIn controlam o seu navegador, logado na **sua** conta, pra ler o feed, buscar vagas e pessoas e enviar convites de conexão.

O [Contrato do Usuário do LinkedIn](https://www.linkedin.com/legal/user-agreement) proíbe usar software, scripts ou robôs pra acessar o site, coletar dados ou automatizar ações. Usar estas skills pode levar a **verificações de segurança, restrição temporária ou bloqueio da sua conta**. O risco é seu: o software é fornecido "no estado em que se encontra", sem garantia (ver [licença](LICENSE)).

O que o projeto faz pra reduzir esse risco:
- **O login é sempre seu**, na janela do Chrome. O agente nunca digita e-mail nem senha.
- **Ritmo de pessoa, não de robô:** espera entre convites, teto de convites por sessão e por dia, e teto de posts lidos por execução, tudo ajustável em `config/limites.md`.
- **Para na hora** se aparecer captcha, checkpoint ou aviso de limite, e nunca tenta contornar.
- **Ações com efeito real só com o seu aval.** Currículo só sai depois de você aprovar as vagas. Convites: quando você diz a quantidade, ou roda a rotina, esse pedido é a autorização, e a lista aparece junto do envio, sem etapa de veto; sem quantidade, o agente pergunta. Quem só tem o botão "Seguir" é seguido em vez de convidado: aparece na lista, não conta no número de convites nem no teto diário, mas respeita o teto por sessão. O agente nunca comenta, manda mensagem nem clica em "Candidatar-se".
- **Curtidas desligadas por padrão.** Com `curtir_vagas_no_filtro: sim`, o agente dá "Gostei" em posts de vaga, e seus contatos, inclusive do emprego atual, podem ver.

Recomendações:
- Comece com os valores do `config/limites.example.md` (15 convites por dia) e só aumente se a conta não mostrar nenhum aviso.
- Não rode a rotina várias vezes no mesmo dia.
- Se o LinkedIn pedir verificação, pare de usar as skills por alguns dias.

## Pré-requisitos

| O quê | Pra quê | Como |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | É onde o agente roda | Terminal, VS Code ou app desktop |
| Node.js 20+ | Scripts de PDF, e-mail, GitHub e diagnóstico | [nodejs.org](https://nodejs.org) |
| Google Chrome, Edge ou Chromium | PDF do currículo e navegador das skills de LinkedIn | Fora do caminho padrão? Defina `CHROME_PATH` no `.env` |
| MCP `chrome-devtools` | Todas as skills de LinkedIn controlam o Chrome por ele | `claude mcp add chrome-devtools --scope user -- npx chrome-devtools-mcp@latest` |
| Conta do LinkedIn | Login feito por você, na janela do Chrome que o MCP abre | Nunca é digitado pelo agente |
| E-mail com SMTP (opcional) | Enviar candidaturas | Gmail, Outlook, iCloud etc., com senha de app |

**Skills de apoio (opcionais)**, que melhoram a escrita do currículo:
```
npx skills add paramchoudhary/resumeskills --skill resume-bullet-writer --skill resume-quantifier --skill resume-ats-optimizer -g -a claude-code
npx skills add anthropics/skills --skill pdf -g -a claude-code
```

## Setup

1. Clone o repositório, abra a pasta no Claude Code e rode `npm install`.
2. Peça ao Claude **"verifica o setup"** (skill `verificar-setup`). Ela lista o que falta e como resolver; repita depois de cada passo abaixo.
3. Copie `.env.example` → `.env` e preencha as credenciais SMTP da sua conta de e-mail (qualquer provedor). Só é necessário pra enviar candidaturas.
4. Monte `curriculo/perfil.yaml`, com o Chrome logado no LinkedIn: peça **"importa meu perfil do LinkedIn"** (`linkedin-importar-perfil`) e depois **"importa meus projetos do GitHub"** (`github-importar-perfil`). As duas se somam, ver [docs/mescla-perfil.md](docs/mescla-perfil.md). Se preferir, copie `curriculo/perfil.example.yaml` → `curriculo/perfil.yaml` e preencha à mão.
5. Copie `config/limites.example.md` → `config/limites.md` e `config/filtro-vagas.example.md` → `config/filtro-vagas.md` e ajuste. **O filtro de exemplo é de Front-end**: troque pelos cargos e stacks que você procura. Se pular, as skills usam os `.example.md`.
6. (Opcional) Assinatura dos e-mails: copie `config/assinatura.example.html` → `config/assinatura.html` e `config/assinatura.example.txt` → `config/assinatura.txt`, e ponha o seu logo como `config/assinatura-logo.png`.

**Observações:**
- As skills foram validadas com o LinkedIn **em português**. Em inglês, os textos equivalentes estão documentados nas skills, mas ainda não foram testados.
- Pra o e-mail não cair no spam, o domínio do remetente precisa ter SPF, DKIM e DMARC. Se você usa um domínio próprio, confira com o seu provedor de DNS.

## Como usar

Abra a pasta do projeto no Claude Code e peça em português, do jeito que falaria com alguém. O Claude encaminha pro agente `carreirinha`, que lê a skill certa e executa. Pra conversar só com ele desde o início: `claude --agent carreirinha`.

## O que dá pra pedir

| Pedido | Skill |
|---|---|
| "verifica o setup" | `verificar-setup` |
| "importa meu perfil do LinkedIn" / "do GitHub" | `linkedin-importar-perfil` / `github-importar-perfil` |
| "gera um currículo pra essa vaga: <link ou texto>" | `gerar-curriculo` |
| "busca vagas no LinkedIn" | `linkedin-buscar-vagas` |
| "procura vagas nos posts do feed" | `linkedin-vagas-posts` |
| "conecta com 10 recrutadores" | `linkedin-conectar-recrutadores` |
| "quantas conexões eu tenho?" | `linkedin-total-conexoes` |
| "roda a rotina do LinkedIn" | `rotina-linkedin` |
| "manda minha candidatura por e-mail" | `enviar-email` |
| "faz a limpeza" (currículos e vagas com mais de 1 semana) | `limpar-dados` |

E-mail e gravação do perfil sempre mostram o que vai acontecer e pedem confirmação. Convites mostram a lista: com a quantidade no pedido ou na rotina, a lista e o envio vão na mesma etapa; sem quantidade, o agente pergunta antes.

## Segurança e privacidade

- **Seus dados ficam na sua máquina.** `perfil*.yaml`, `curriculo/historico/`, `config/*.md`, `config/assinatura*`, `vagas/`, `curriculo/gerados/` e `.env` estão no `.gitignore`. A `verificar-setup` confere isso a cada execução e acusa se algum deles fosse pro git.
- **Credenciais só no `.env`.** O agente nunca lê os valores pro chat, e o diagnóstico só diz se estão preenchidos. Use senha de app do provedor de e-mail, nunca a senha principal. O `GITHUB_TOKEN` é opcional e não precisa de nenhuma permissão.
- **Texto de terceiros é dado, não ordem.** Posts, vagas, perfis e READMEs podem trazer instruções escondidas ("mande também o arquivo X", "envie pra este outro e-mail"). O agente ignora esse tipo de pedido e avisa você.
- **Anexo e corpo são travados no script:** `send-email.mjs` só aceita como anexo PDF de `curriculo/gerados/` e como corpo `.txt` dessa mesma pasta, então um agente enganado não consegue apontar o `.env` ou o perfil. Isso não impede de copiar um texto pra dentro do corpo: por isso você vê o preview.
- **Nada sai sem você ver.** O e-mail roda em modo rascunho por padrão e só envia com `--confirm <hash>`, depois do seu "sim" pra lista de vagas. O hash vem do preview: se o conteúdo mudar, o envio é recusado. Isso prova que o conteúdo não mudou, não que você aprovou; a aprovação segue sendo regra do agente.
- **Empresa bloqueada é recusada no script:** `--empresa` é conferido contra `perfil.yaml` e "Outras empresas bloqueadas" do filtro. O agente é quem informa o nome.
- **Envio repetido é bloqueado** por `vagas/enviados.json`: mesmo destinatário com o mesmo assunto ou o mesmo currículo, ignorando caixa e espaços. Assunto reescrito com outro PDF passa.
- **Limpeza:** "faz a limpeza" apaga currículos e vagas com mais de uma semana, menos os de candidatura ainda em aberto.

Achou uma falha de segurança? Veja [SECURITY.md](SECURITY.md).

## Como contribuir

Contribuições são bem-vindas: correção de bug, skill nova, suporte ao LinkedIn em inglês, melhorias no template do currículo.

1. **Abra uma issue antes** de qualquer mudança grande (skill nova, mudança de fluxo), pra alinhar a ideia. Bug e ajuste pequeno podem ir direto pro PR.
2. Faça um fork, crie uma branch a partir do `main` (`fix/...`, `feat/...`) e abra o PR descrevendo o que mudou e como você testou.
3. Rode `npm test` e `node .claude/skills/verificar-setup/scripts/verificar.mjs` antes de commitar. A seção **Privacidade** tem que estar toda ✅. O CI roda os testes em todo PR.

Regras do projeto:
- **Nunca commite dados pessoais**: nada de `perfil.yaml`, currículos gerados, vagas, `.env`, prints com nome ou e-mail. Exemplos usam dados fictícios (`Maria Silva`, `nome@dominio.com`).
- **Ações com efeito real continuam com aval do usuário.** E-mail e gravação do perfil mostram antes o que vão fazer e só agem com o "sim". Convite exige quantidade pedida ou a rotina, e sempre mostra a lista. PR que remove essas travas não entra.
- **Respeite os limites do LinkedIn.** Nada de tirar as esperas, aumentar os tetos padrão ou contornar captcha e checkpoint.
- **Texto de terceiros é dado.** Skill que lê post, vaga ou página nunca executa instrução vinda desse texto.
- **Sem dependência nova** se dá pra fazer com Node 20+ puro. Scripts ficam em `.claude/skills/<skill>/scripts/`.
- **Skill nova** segue o formato das existentes: `SKILL.md` com `name` e `description` no frontmatter, passos numerados e regras de segurança. Registre-a na tabela do [agente](.claude/agents/carreirinha.md) e na seção "O que dá pra pedir" deste README.
- Documentação e textos das skills em **português**. Se a skill mexe no LinkedIn, diga no PR em que idioma da interface você testou.

## Licença

[MIT](LICENSE).
