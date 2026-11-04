# Carreirinha — Planejamento

Agente pessoal que conhece a carreira de quem usa o projeto, gera currículos sob medida e ajuda a disparar candidaturas (e-mail + LinkedIn assistido).

**Arquitetura:** agent + skills nativos do Claude Code (`.claude/agents/`, `.claude/skills/`). A pessoa conversa com o `carreirinha`, que lê o `SKILL.md` certo e executa. Scripts Node (PDF, e-mail, GitHub, diagnóstico) são recursos dentro de cada skill, chamados via Bash.
**LinkedIn:** semi-automático via MCP de navegador (`mcp__chrome-devtools__*`), com a sessão do usuário. Login sempre manual; ações com efeito real só com autorização.
**Template:** nada específico de um usuário nos arquivos versionados. Dados pessoais, preferências e histórico ficam fora do git.

Última atualização: 2026-11-03.

---

## Status

### Base de carreira
- [x] `curriculo/perfil.yaml` — fonte única da verdade, schema em `perfil.example.yaml` (inclui `titulo`, `stack` por experiência, `projetos` com `fontes`).
- [x] **`linkedin-importar-perfil`** — lê o próprio perfil (Sobre, experiências, formação, certificados, competências, idiomas, projetos, contato) pelas páginas `details/` e mescla no perfil. Testada em 2026-10-19.
- [x] **`github-importar-perfil`** — API pública do GitHub (`scripts/github-perfil.mjs`): fixados primeiro, linguagens, tópicos, READMEs. Testada em 2026-10-19.
- [x] **Mescla única** ([docs/mescla-perfil.md](docs/mescla-perfil.md)) — LinkedIn é dono de experiências/formação/resumo; skills técnicas e projetos são a **união** das duas fontes, com deduplicação e fusão de projetos repetidos. Nenhuma importação remove itens.

### Currículo
- [x] **`gerar-curriculo`** — junta perfil (fatos) + vaga (prioridades e linguagem). Lê vaga por texto, link (LinkedIn via MCP, outros via WebFetch) ou arquivo salvo; salva `vagas/vaga-*.json` com requisitos, palavras-chave e **aderência** (✅/🟡/❌ por requisito). Requisito não atendido nunca entra no currículo.
- [x] Template (`template.html`, layout clássico ATS-safe): título, resumo, Experiência, Projetos, Competências, Formação, Certificações, Idiomas. PDF via Chrome/Edge headless (`html-to-pdf.mjs`, zero dependências npm).
- [x] Skills de apoio globais: `resume-bullet-writer`, `resume-ats-optimizer`, `resume-quantifier`, `pdf`.

### Vagas
- [x] **`linkedin-vagas-posts`** — lê o feed post a post e separa vagas dentro/fora do filtro, com CLT/PJ. Testada várias vezes desde 2026-10-14.
- [x] **`linkedin-buscar-vagas`** — aba Vagas, com termos e filtro de `config/filtro-vagas.md`. **Ainda não testada ao vivo.**
- [x] Filtro único em `config/filtro-vagas.md`, usado pelas duas.
- [ ] Busca de **publicações por palavra-chave** (`/search/results/content/?keywords=...&sortBy="date_posted"`) no lugar do feed. O feed recicla posts depois de ~50 (visto em 2026-10-19), e a rotina rendeu 0 vagas.
- [ ] Skill `buscar-vagas` — APIs legítimas (Adzuna, Arbeitnow, Jobicy, RemoteOK).

### Networking
- [x] **`linkedin-conectar-recrutadores`** — 16 termos de busca, filtro por headline, fluxo "Conectar → Enviar sem nota" validado. Teto por sessão em `config/limites.md`. Progresso por termo em `vagas/progresso-recrutadores.md`. 30 convites numa sessão em 2026-10-19 sem bloqueio.
- [x] **`linkedin-total-conexoes`** — lê "N conexões" da página de conexões.
- [x] **`rotina-linkedin`** — gatilho manual ("bom dia, vamos rodar a rotina"): vagas nos posts → currículo por vaga compatível → e-mail pronto ou pendente → convites (teto diário) → recarrega o feed e repete só com posts novos (`vagas/posts-vistos.json`) → conexões desde a última rotina → uma confirmação pra enviar os e-mails → `vagas/rotina-linkedin.md` + `vagas/candidaturas.md`. Fluxo novo definido em 2026-10-20 e em uso, última execução em 2026-11-03.

### Candidatura
- [x] **`enviar-email`** — SMTP de qualquer provedor via `nodemailer`, modo rascunho por padrão, `--confirm` só com confirmação explícita, checa duplicidade em `vagas/enviados.json`. Usa o `vaga-*.json` da `gerar-curriculo`. E-mail em HTML com assinatura (`config/assinatura.*`, logo embutido via cid). `--testar` confere login sem enviar. Testado em 2026-10-19 com iCloud+ e domínio próprio; envios reais desde então. Trava de corpo, de empresa bloqueada e `--confirm <hash>` no script desde 2026-11-03. **Regra fixa: nenhum currículo sai sem o usuário ver as vagas e aprovar.**

### Operação
- [x] **`verificar-setup`** — diagnóstico (`scripts/verificar.mjs` + checagem do MCP e do login no LinkedIn), com o que fica bloqueado e como resolver.
- [x] **`limpar-dados`** — apaga currículos e vagas com mais de 1 semana (`scripts/limpar.mjs`), preservando candidaturas em aberto.
- [x] Testes (`npm test`, `node:test`) e CI no GitHub Actions para as travas dos scripts.
- [x] Configuração externa: `config/limites.md`, `config/filtro-vagas.md` (com `.example.md` versionados).

---

## Achados importantes (não reaprender)

- **DOM do LinkedIn é ofuscado**: seletores CSS não funcionam. Clique só com `uid` de `take_snapshot`; leitura de texto com `evaluate_script` + `innerText` funciona e é muito mais leve que snapshot.
- **Modal "Adicionar nota" carrega com atraso**: esperar ~2,5 s antes do snapshot e conferir o nome no modal antes de clicar.
- **Modal pedindo e-mail** ("insira o e-mail do usuário"): a pessoa só aceita convite de conhecido. Fechar e pular.
- **Modo automático do Claude Code pode bloquear envios em massa** (visto em 2026-10-14 com 8 envios; em 2026-10-19 passou de 30). É guardrail de sistema: parar, nunca contornar.
- **"PJ" solto no texto pode não ser regime de contratação** (ex.: nome de time). Só contar colado a "contratação/regime/modelo".
- **"… mais" no LinkedIn** costuma vir com o texto inteiro já no DOM. Só expandir se o texto parar no meio da frase.
- **API pública do GitHub** não expõe repositórios fixados; vêm do HTML do perfil.
- **iCloud SMTP**: login = endereço **principal** `@icloud.com` + senha de app; o alias/domínio próprio vai só no `EMAIL_FROM`. Logar com o e-mail do Apple ID (quando não é `@icloud.com`) dá "Mailbox does not exist".
- **Spam**: domínio sem DMARC cai no spam com facilidade. Comece com um `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<seu e-mail>`.

---

## Estrutura de pastas

```
carreirinha/
├── .claude/
│   ├── agents/carreirinha.md
│   └── skills/
│       ├── verificar-setup/            # SKILL.md + scripts/verificar.mjs
│       ├── linkedin-importar-perfil/   # SKILL.md
│       ├── github-importar-perfil/     # SKILL.md + scripts/github-perfil.mjs
│       ├── gerar-curriculo/            # SKILL.md + template.html + scripts/html-to-pdf.mjs
│       ├── linkedin-buscar-vagas/      # SKILL.md
│       ├── linkedin-vagas-posts/       # SKILL.md
│       ├── linkedin-conectar-recrutadores/
│       ├── linkedin-total-conexoes/
│       ├── rotina-linkedin/
│       ├── limpar-dados/               # SKILL.md + scripts/limpar.mjs
│       └── enviar-email/               # SKILL.md + scripts/send-email.mjs
├── config/
│   ├── limites.example.md              # versionado
│   ├── filtro-vagas.example.md         # versionado
│   ├── limites.md                      # do usuário (fora do git)
│   └── filtro-vagas.md                 # do usuário (fora do git)
├── test/                               # testes dos scripts
├── docs/
│   └── mescla-perfil.md                # regras de união LinkedIn + GitHub
├── curriculo/
│   ├── perfil.example.yaml             # schema (versionado)
│   ├── perfil.yaml                     # carreira do usuário (fora do git)
│   ├── historico/                      # backups do perfil e currículos antigos (fora do git)
│   └── gerados/                        # currículos gerados (fora do git, exceto README)
├── vagas/                              # tudo fora do git, exceto README
│   ├── vaga-<empresa>-<cargo>-<data>.json
│   ├── linkedin-vagas-<data>.json
│   ├── linkedin-posts-<data>.json
│   ├── candidaturas.md                 # painel: aderência, currículo, status do envio
│   ├── posts-vistos.json               # posts do feed já lidos
│   ├── progresso-recrutadores.md
│   ├── rotina-linkedin.md
│   └── enviados.json
├── .env.example                        # versionado
├── .env                                # fora do git
├── package.json                        # nodemailer + dotenv
├── PLANNING.md
└── README.md
```

## Dependências

- npm: `nodemailer`, `dotenv` (`enviar-email`, `github-importar-perfil`).
- Chrome ou Edge instalado (PDF do currículo).
- MCP `chrome-devtools` conectado (todas as skills de LinkedIn).
- `npx js-yaml` sob demanda pra validar o `perfil.yaml` (sem instalar).
- Skills de apoio globais (opcionais): `pdf` (anthropics/skills), `resume-bullet-writer`, `resume-quantifier`, `resume-ats-optimizer` (paramchoudhary/resumeskills). Comandos de instalação no README.

## Próximos passos

1. Testar a `linkedin-buscar-vagas` ao vivo.
2. Busca de publicações por palavra-chave na `linkedin-vagas-posts` (e na rotina).
3. Skill `buscar-vagas` com APIs públicas.

## Riscos

- **E-mail**: nunca disparar sem confirmação explícita a cada envio.
- **LinkedIn (convites)**: maior risco do projeto, porque muda o estado da conta. Teto por sessão, espaçamento, parar em captcha/aviso de limite.
- **LinkedIn (leitura)**: ritmo de pessoa navegando, nunca volume de robô.
- **Dados pessoais**: `perfil*.yaml`, `historico/`, `gerados/`, `vagas/`, `config/*.md`, `config/assinatura*` e `.env` ficam fora do git (a `verificar-setup` confere). O repositório é público.
