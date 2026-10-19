# carreira-generator

Agente pessoal de carreira pra usar dentro do Claude Code: conhece sua trajetória profissional, gera currículos sob medida em PDF, busca vagas no LinkedIn e prepara candidaturas por e-mail.

É um template pensado pra qualquer pessoa adotar pra sua própria busca de emprego — nada aqui é específico de um usuário: toda informação de carreira fica isolada em `curriculo/perfil.yaml` (fora do git) e credenciais ficam em `.env` (fora do git), então é só preencher os próprios dados e usar.

Veja [PLANNING.md](PLANNING.md) pra arquitetura completa, status e próximos passos. As capacidades em si vivem em `.claude/agents/carreira-agent.md` e `.claude/skills/`.

**Setup rápido**:
1. `npm install`
2. Copie `.env.example` → `.env` e preencha as credenciais SMTP da sua própria conta de e-mail (qualquer provedor).
3. Copie `curriculo/perfil.example.yaml` → `curriculo/perfil.yaml` e preencha com os seus dados de carreira reais.

Nenhum dos dois arquivos preenchidos vai pro git (`.gitignore` já cobre ambos).
