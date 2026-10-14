# carreira-generator

Agente pessoal de carreira do usuário, dentro do Claude Code: conhece sua trajetória profissional, gera currículos sob medida em PDF, busca vagas no LinkedIn e prepara candidaturas por e-mail.

Veja [PLANNING.md](PLANNING.md) pra arquitetura completa, status e próximos passos. As capacidades em si vivem em `.claude/agents/carreira-agent.md` e `.claude/skills/`.

**Setup rápido**: `npm install`, depois copie `.env.example` → `.env` e `curriculo/perfil.example.yaml` → `curriculo/perfil.yaml` e preencha com dados reais (nenhum dos dois vai pro git).
