# carreira-generator

Agente pessoal de carreira pra usar dentro do Claude Code: monta sua base de carreira a partir do LinkedIn e do GitHub, gera currículos sob medida pra cada vaga, busca vagas no LinkedIn, conecta você com recrutadores de tecnologia e prepara candidaturas por e-mail.

É um template pensado pra qualquer pessoa adotar na própria busca de emprego. Nada aqui é específico de um usuário: a carreira fica em `curriculo/perfil.yaml`, as preferências em `config/`, as credenciais em `.env` e o histórico em `vagas/`, tudo fora do git.

Veja [PLANNING.md](PLANNING.md) pra arquitetura, status e próximos passos. O agente está em `.claude/agents/carreira-agent.md` e as capacidades em `.claude/skills/`.

**Pra quem é:** profissionais de tecnologia (dev, QA, dados, DevOps, produto) buscando vaga no Brasil ou remoto. Os termos de busca de recrutadores são de tech e o filtro de vagas é configurável por stack e cargo.

## Pré-requisitos

| O quê | Pra quê | Como |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | É onde o agente roda | Terminal, VS Code ou app desktop |
| Node.js 18+ | Scripts de PDF, e-mail, GitHub e diagnóstico | [nodejs.org](https://nodejs.org) |
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

Ações com efeito real (convites, e-mail, gravar o perfil) sempre mostram o que vai acontecer e pedem confirmação.

## Licença

[MIT](LICENSE).
