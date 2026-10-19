# vagas/

Saída das skills de busca de vagas e candidatura:
- `linkedin-vagas-<data>.json` — resultado da skill `linkedin-buscar-vagas` (aba Vagas do LinkedIn)
- `posts-vistos.json` — posts do feed já lidos pela `linkedin-vagas-posts` (evita reler quando o feed recicla)
- `candidaturas.md` — painel das vagas tratadas pela `rotina-linkedin`: aderência, currículo, status do envio e como se candidatar
- `linkedin-posts-<data>.json` — resultado da skill `linkedin-vagas-posts` (varredura do feed)
- `progresso-recrutadores.md` — termo de busca e última página usada pela `linkedin-conectar-recrutadores`, pra próxima sessão continuar de onde parou
- `vaga-<empresa>-<cargo>-<data>.json` — vaga lida pela `gerar-curriculo` (requisitos, palavras-chave, aderência ao perfil); a `enviar-email` reaproveita
- `linkedin-conexoes.json` — log de convites enviados pela skill `linkedin-conectar-recrutadores`, pra nunca convidar a mesma pessoa duas vezes
- `vagas-<data>.json` — reservado pra skill `buscar-vagas` (APIs legítimas tipo Adzuna/Arbeitnow, ainda não construída — ver PLANNING.md)
- `rotina-linkedin.md` — histórico com data/hora de cada execução da skill `rotina-linkedin` (conexões, convites, vagas nos posts)
- `enviados.json` — log de candidaturas enviadas pela skill `enviar-email`, pra nunca duplicar envio pra mesma vaga

Tudo aqui dentro (exceto este `README.md`) é gitignored — contém dados de candidaturas do usuário.
