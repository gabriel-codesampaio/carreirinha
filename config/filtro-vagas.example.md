# Filtro de vagas

Copie este arquivo para `config/filtro-vagas.md` e descreva o que você procura. Se `config/filtro-vagas.md` não existir, a skill usa as skills técnicas de `curriculo/perfil.yaml` como filtro.

Vale pra `linkedin-vagas-posts` (posts do feed) e `linkedin-buscar-vagas` (aba Vagas). O Claude lê cada vaga e decide se a vaga está **dentro** ou **fora** do filtro com base nas listas abaixo. Escreva em linguagem natural; não precisa bater palavra por palavra com o post.

## Cargos que entram
- Desenvolvedor(a) Front-end / Frontend Engineer

## Stacks que entram
Vaga com uma destas como stack principal entra, mesmo que o cargo não diga "front-end".
- React
- TypeScript

## Também entram
- Fullstack declaradamente frontend-heavy (ex.: "foco em front-end")

## Ficam fora
- Backend, dados, QA, DevOps, design
- Fullstack equilibrado ou puxado pro back-end

## Senioridade
- Entram: pleno, sênior
- Ficam fora: estágio, júnior

## Local e modelo de trabalho
- Entram: remoto (Brasil ou internacional aceitando Brasil)
- Ficam fora: presencial/híbrido fora da minha cidade

## Contratação
- Entram: CLT, PJ
