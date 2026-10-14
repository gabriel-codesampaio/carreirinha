# vagas/

Saída das skills de busca de vagas e candidatura:
- `linkedin-vagas-<data>.json` — resultado da skill `linkedin-buscar-vagas` (aba Vagas do LinkedIn)
- `linkedin-posts-<data>.json` — resultado da skill `linkedin-vagas-posts` (varredura do feed)
- `linkedin-conexoes.json` — log de convites enviados pela skill `linkedin-conectar-recrutadores`, pra nunca convidar a mesma pessoa duas vezes
- `vagas-<data>.json` — reservado pra skill `buscar-vagas` (APIs legítimas tipo Adzuna/Arbeitnow, ainda não construída — ver PLANNING.md)
- `enviados.json` — log de candidaturas enviadas pela skill `enviar-email`, pra nunca duplicar envio pra mesma vaga

Tudo aqui dentro (exceto este `README.md`) é gitignored — contém dados de candidaturas do usuário.
