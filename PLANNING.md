# Carreira Generator — Planejamento

Agente pessoal que conhece toda a carreira do usuário, gera currículos sob medida e ajuda a disparar candidaturas (e-mail + LinkedIn assistido).

**Stack escolhida:** Node.js + TypeScript
**Abordagem LinkedIn:** assistente semi-automático via MCP de navegador (toda ação de candidatura é confirmada manualmente — nunca full-auto)
**Arquitetura de execução:** em vez de um CLI Node solto, o projeto é construído como **agent + skills nativos do Claude Code** (`.claude/agents/`, `.claude/skills/`) — o usuário conversa com o `carreira-agent` dentro do Claude Code, que invoca cada skill conforme o pedido. Scripts Node (ex: HTML→PDF) viram recursos auxiliares dentro de cada skill, chamados via Bash, não um app separado para rodar por fora.

---

## Status atual

- [x] **`gerar-curriculo`** (skill) + **`carreira-agent`** (agente) — implementados e testados. Replica fielmente o `curriculo/template-original.docx` em `.claude/skills/gerar-curriculo/template.html`, convertido pra PDF via Chrome headless local (`scripts/html-to-pdf.mjs`, zero dependências npm).
- [x] `curriculo/perfil.yaml` — preenchido com os dados reais de carreira do usuário (experiências, formação, skills, certificações), consolidado a partir dos currículos em `curriculo/historico/`.
- [x] **Três skills de LinkedIn via MCP** (`mcp__chrome-devtools__*`, navegador com a sessão do usuário já logada): `linkedin-buscar-vagas` (aba Vagas, só leitura), `linkedin-vagas-posts` (rola o feed e classifica post a post), `linkedin-conectar-recrutadores` (envia convite de conexão de verdade — regras de segurança: teto por sessão, lista revisada antes de enviar, nunca em rajada). **Testada ao vivo em 2026-10-14** (`linkedin-vagas-posts`, 18 posts/4 vagas), e corrigida: o DOM do LinkedIn é ofuscado, então a extração usa `take_snapshot` (árvore de acessibilidade), não seletores CSS.
- [x] **`linkedin-vagas-posts` ganhou filtro + critério de parada por quantidade**: antes de rolar, a skill agora sempre pergunta o filtro (padrão: skills técnicas do `perfil.yaml`) e separa resultado em "dentro do filtro" / "fora do filtro"; o critério de parada aceita "ache N vagas" (conta só as dentro do filtro), além de quantidade de posts ou tempo, com teto de segurança de ~80 posts/~15 scrolls pra nunca rolar indefinidamente.
- [x] **Extração de tipo de contratação (CLT/PJ)** adicionada em `linkedin-vagas-posts` e `linkedin-buscar-vagas`, calibrada com 3 posts reais que o usuário apontou como bons exemplos (2026-10-14). Achado importante: a sigla "PJ" pode ser falso positivo (ex: post da PicPay usava "PJ" como nome de time/segmento de cliente, não como regime de contratação) — a extração só conta quando "CLT"/"PJ" está colado a um rótulo de contrato/regime/modelo.
- [x] **Recomendação de modelo documentada nas 3 skills de LinkedIn**: Haiku 4.5 (volume alto de texto, decisão simples por item — melhor custo/benefício); `gerar-curriculo` continua reservado pra Sonnet 5/Opus 5, onde a qualidade de escrita compensa o custo maior.
- [ ] Skill `buscar-vagas` (APIs legítimas tipo Adzuna/Arbeitnow) — ainda pendente, complementa as 3 de LinkedIn acima
- [x] **Skill `enviar-email`** — implementada e testada em modo rascunho. Envia via SMTP do iCloud Mail (`smtp.mail.me.com`) como `seu-email@dominio.com`, com `nodemailer`. Modo padrão = preview, só dispara com `--confirm` + confirmação explícita do usuário. Checa duplicidade em `vagas/enviados.json`. **Falta só o usuário preencher o `.env`** (copiar de `.env.example`) com a senha de app do Apple ID antes do primeiro envio real.
- [x] **Skills de apoio instaladas globalmente** (via `npx skills add`, disponíveis em qualquer projeto): `pdf` (anthropics, toolkit de PDF), `resume-bullet-writer`, `resume-quantifier`, `resume-ats-optimizer` (paramchoudhary/resumeskills) — o `carreira-agent` usa essas skills pra melhorar a escrita dos bullets e checar ATS antes de fechar um currículo
- [x] **Padronização de pastas** — ver seção 6: tudo relacionado a currículo consolidado sob `curriculo/` (sem mais pastas com espaço/acento no nome), arquivos de `historico/` renomeados pra kebab-case

---

## 1. Base de Conhecimento de Carreira (`curriculo/perfil.yaml`)

Fonte única da verdade sobre a carreira do usuário. **[implementado]**

- **Dados pessoais**: nome, contato, links (LinkedIn, site) — já preenchido
- **Resumo profissional** (pitch de 2-3 linhas)
- **Experiências**: empresa, cargo, período, bullets de impacto
- **Formação, certificações, skills, idiomas, projetos**

Preenchido/mantido diretamente por edição do arquivo (ou, futuramente, por uma entrevista guiada pelo `carreira-agent`). Contém PII — não deve sair deste projeto.

## 2. Gerador de Currículo (PDF) — skill `gerar-curriculo` **[implementado]**

- Entrada: `curriculo/perfil.yaml` + descrição da vaga (texto/link), opcional
- O agente seleciona/reordena as experiências e bullets mais relevantes pra vaga (sem inventar nada fora do perfil)
- Template único HTML/CSS (`template.html`) que replica fielmente o `curriculo/template-original.docx` — layout ATS-safe, Calibri, sem colunas/ícones
- Renderização para PDF via **Chrome/Edge headless local** (`scripts/html-to-pdf.mjs`) — zero dependência npm, usa o navegador já instalado na máquina
- Saída: `curriculo/gerados/<empresa>-<cargo>-<data>.pdf`

## 3. Busca de Vagas

Duas frentes complementares:

### a) LinkedIn via MCP de navegador **[implementado]** — três skills separadas

Usam `mcp__chrome-devtools__*` controlando o Chrome com a sessão do usuário já logada (login sempre manual, nunca eu digitando credencial):

- **`linkedin-buscar-vagas`** — monta a URL de busca da aba Vagas com os filtros pedidos (cargo, local, remoto/híbrido/presencial), extrai os cards de vaga via `take_snapshot` (árvore de acessibilidade — o DOM do LinkedIn é ofuscado, `evaluate_script` com seletores CSS não funciona), salva em `vagas/linkedin-vagas-<data>.json`. Só leitura.
- **`linkedin-vagas-posts`** — rola o feed (via `evaluate_script` ajustando o `scrollTop` do container interno, não `window.scrollBy`) e lê post por post via `take_snapshot`, classificando cada um como vaga ou não e extraindo também o tipo de contratação (CLT/PJ) quando o post informar (muita vaga é divulgada como post comum, não aparece na busca da aba Vagas). Salva em `vagas/linkedin-posts-<data>.json`. Só leitura.
- **`linkedin-conectar-recrutadores`** — busca tech recruiters e **envia convite de conexão de verdade** (única das três que muda o estado da conta). Regras de segurança: teto de ~15 convites/sessão, sempre mostra a lista de pessoas antes de enviar qualquer convite, espaça os envios (nunca em rajada), checa duplicidade em `vagas/linkedin-conexoes.json`, para na hora se aparecer captcha/checkpoint.

Todas as três param imediatamente e avisam o usuário se o LinkedIn mostrar qualquer verificação de segurança — nunca tentam contornar.

### b) APIs legítimas de vagas **[a construir]** — skill `buscar-vagas`

- Adzuna, Arbeitnow, Jobicy, RemoteOK — todas com API pública/gratuita, sem risco nenhum de conta
- Normalizadas e salvas em `vagas/vagas-<data>.json`
- Complementa o LinkedIn: cobre vagas que nem aparecem lá

## 4. Envio de E-mail — skill `enviar-email` **[implementado]**

- Envio via SMTP do **iCloud Mail** (`smtp.mail.me.com`), autenticando com o Apple ID + senha de app, enviando como `seu-email@dominio.com` (domínio customizado do iCloud+)
- `nodemailer` monta o e-mail e anexa automaticamente o PDF gerado pra aquela vaga (`scripts/send-email.mjs`)
- Log de envios (`vagas/enviados.json`) pra nunca duplicar candidatura pra mesma vaga/destinatário (checagem automática, só ignora com `--force`)
- **Modo padrão = rascunho** (mostra o preview completo, não envia). Só dispara de fato com `--confirm` **depois** de uma confirmação explícita do usuário na conversa — ação externa e difícil de desfazer
- Credenciais ficam em `.env` local (fora do git); `.env.example` documenta o que precisa ser preenchido

## 5. Interface — conversa com o `carreira-agent` **[implementado]**

Sem CLI separado: o usuário conversa com o agente `carreira-agent` dentro do Claude Code (ex: *"gera um currículo pra essa vaga de Dev Backend na empresa X"*, *"busca vagas de X remoto"*, *"manda minha candidatura por e-mail pra essa vaga"*) e ele aciona a skill certa.

## 6. Estrutura de pastas (real, atualizada — padronizada em 2026-10-14)

Tudo relacionado a currículo vive sob um único `curriculo/`, sem pastas com espaço/acento no nome (evita precisar de aspas em todo comando de shell) e com a fonte da verdade (`perfil.yaml`) separada do material de referência (`historico/`, `template-original.docx`) e da saída gerada (`gerados/`):

```
carreira-generator/
├── .claude/
│   ├── agents/
│   │   └── carreira-agent.md          # agente que orquestra as skills
│   └── skills/
│       ├── gerar-curriculo/
│       │   ├── SKILL.md
│       │   ├── template.html          # réplica do template-original.docx
│       │   └── scripts/
│       │       └── html-to-pdf.mjs    # HTML → PDF via Chrome headless local
│       ├── linkedin-buscar-vagas/
│       │   └── SKILL.md               # aba Vagas, via MCP chrome-devtools, só leitura
│       ├── linkedin-vagas-posts/
│       │   └── SKILL.md               # rola o feed e classifica post a post, só leitura
│       ├── linkedin-conectar-recrutadores/
│       │   └── SKILL.md               # envia convite de verdade — regras de segurança à parte
│       ├── buscar-vagas/              # (próximo passo — APIs legítimas, ex: Adzuna)
│       └── enviar-email/
│           ├── SKILL.md
│           └── scripts/
│               └── send-email.mjs     # SMTP (iCloud) via nodemailer, modo rascunho por padrão
├── curriculo/
│   ├── perfil.yaml                    # base de carreira — fonte da verdade (PII, fora do git)
│   ├── perfil.example.yaml            # schema sem PII (versionado)
│   ├── template-original.docx         # template visual original enviado pelo usuário (referência, versionado)
│   ├── historico/                     # currículos antigos usados pra popular o perfil.yaml (PII, fora do git)
│   │   ├── curriculo-geral-br.docx
│   │   ├── dev-frontend.docx / .pdf
│   │   ├── dev-frontend-react.docx / .pdf
│   │   ├── dev-frontend-senior.docx / .pdf
│   │   ├── dev-javascript.pdf
│   │   └── dev-senior-react-nextjs.pdf
│   └── gerados/                       # currículos (PDF/HTML) gerados pela skill (PII, fora do git)
│       └── README.md                  # único arquivo versionado dessa pasta
├── vagas/
│   ├── README.md                      # único arquivo versionado dessa pasta
│   ├── linkedin-vagas-<data>.json     # resultado da aba Vagas (fora do git)
│   ├── linkedin-posts-<data>.json     # resultado da varredura do feed (fora do git)
│   ├── linkedin-conexoes.json         # log de convites enviados a recrutadores (fora do git)
│   └── enviados.json                  # log de candidaturas enviadas por e-mail (fora do git)
├── .env.example                       # schema de credenciais SMTP (sem segredos, versionado)
├── .env                               # credenciais reais (fora do git)
├── package.json                       # nodemailer + dotenv
├── PLANNING.md
└── README.md
```

## 7. Dependências

- `gerar-curriculo` → **zero dependências npm** (`html-to-pdf.mjs` usa só Node nativo + o Chrome/Edge já instalado)
- `enviar-email` → `nodemailer` (SMTP + anexos) e `dotenv` (carrega `.env`), instaladas via `npm install`
- `linkedin-buscar-vagas`, `linkedin-vagas-posts`, `linkedin-conectar-recrutadores` → **zero dependências npm**, usam só as ferramentas MCP `mcp__chrome-devtools__*` já disponíveis no ambiente
- Skills de apoio instaladas globalmente (fora deste `package.json`, disponíveis em qualquer projeto): `pdf`, `resume-bullet-writer`, `resume-quantifier`, `resume-ats-optimizer`

## 8. Ordem de implementação

1. ~~Template HTML/CSS + render de PDF (`gerar-curriculo`)~~ ✅
2. ~~Schema da base de carreira (`perfil.yaml`) + agente (`carreira-agent`)~~ ✅
3. ~~Skill `enviar-email` em modo rascunho/confirmação (SMTP iCloud + nodemailer)~~ ✅ — falta só o usuário preencher o `.env`
4. ~~Preencher `curriculo/perfil.yaml` com os dados reais de carreira do usuário~~ ✅ — consolidado a partir dos currículos em `curriculo/historico/` (gitignored, contém PII)
5. ~~Padronizar nomes de pasta/arquivo do projeto~~ ✅
6. ~~Três skills de LinkedIn via MCP (`linkedin-buscar-vagas`, `linkedin-vagas-posts`, `linkedin-conectar-recrutadores`)~~ ✅ — `linkedin-vagas-posts` já testada ao vivo (18 posts/4 vagas, 2026-10-14); `linkedin-buscar-vagas` e `linkedin-conectar-recrutadores` ainda não foram testadas na prática, só escritas com o mesmo método validado
7. Skill `buscar-vagas` — providers de APIs legítimas (Adzuna, Arbeitnow, Jobicy, RemoteOK)

## 9. Riscos e observações

- **E-mail**: nunca disparar de fato sem confirmação explícita do usuário a cada envio
- **LinkedIn (leitura — `linkedin-buscar-vagas`, `linkedin-vagas-posts`)**: ritmo de navegação moderado, nunca em volume que pareça automação de verdade; parar na hora se aparecer captcha/checkpoint
- **LinkedIn (conexões — `linkedin-conectar-recrutadores`)**: é a ação de maior risco de todo o projeto, porque muda o estado da conta — teto por sessão, lista sempre revisada antes de enviar, nunca em rajada; volume alto de convites é o padrão clássico que leva à restrição de conta
- **PII**: `curriculo/perfil.yaml`, `curriculo/historico/`, `curriculo/gerados/` e tudo em `vagas/` (exceto os `README.md`) contêm dados pessoais — fora do controle de versão (`.gitignore`), já que o repositório é público no GitHub
