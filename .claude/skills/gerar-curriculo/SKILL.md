---
name: gerar-curriculo
description: Gera um currículo em PDF sob medida juntando duas fontes, a base de carreira (curriculo/perfil.yaml) e a vaga pedida (texto, link ou vaga já salva). Lê a vaga, cruza requisitos com o perfil, mostra a aderência e monta o currículo com a linguagem e as prioridades da vaga, sem inventar nada. Use quando o pedido for para criar, gerar, atualizar ou adaptar um currículo / resume / CV em PDF.
---

# Gerar Currículo

Monta um currículo em PDF com o template do projeto (`template.html`, layout clássico ATS-safe) a partir de **duas fontes**:

| Fonte | O que dá |
|---|---|
| `curriculo/perfil.yaml` | **Os fatos**: experiências, bullets, projetos, skills, formação. Nada entra no currículo se não estiver aqui. |
| A vaga | **As prioridades e a linguagem**: o que vem primeiro, quais termos usar, qual título, qual idioma, o que cortar. |

O perfil é a base completa; o currículo é um recorte dela pra aquela vaga.

## Modelo recomendado

**Sonnet 5.5 ou Opus 5.5.** A qualidade de escrita e o cruzamento perfil × vaga compensam o custo.

## Passo a passo

### 1. Carregar o perfil

- Leia `curriculo/perfil.yaml`, incluindo a seção `regras_alternativas`, se existir. Essas regras são decisões de quem usa o projeto e **valem por cima das regras padrão desta skill** (ex.: qual título usar conforme a senioridade da vaga).
- Se não existir ou estiver vazio/placeholder: pare e sugira `linkedin-importar-perfil` e `github-importar-perfil`. Nunca gere currículo com dados fictícios.

### 2. Obter a vaga

Aceite qualquer uma destas formas:

| Entrada | Como ler |
|---|---|
| Texto colado | Use direto. |
| Link do LinkedIn (`linkedin.com/jobs/view/...`) | Navegador MCP: `navigate_page` + `evaluate_script` lendo `document.querySelector('main').innerText`. Precisa da sessão logada. |
| Outro link (Gupy, Greenhouse, Lever, site da empresa…) | `WebFetch`. Se vier vazio (página feita em JavaScript), use o navegador MCP. |
| Vaga já salva | Procure em `vagas/vaga-*.json`, `vagas/linkedin-vagas-*.json` e `vagas/linkedin-posts-*.json` pelo cargo/empresa citados. |
| Nenhuma vaga | Pergunte se é pra gerar um currículo genérico. Se sim, use `titulo` e `resumo` do perfil e as experiências mais recentes; pule os passos 3 e 4. |

Extraia e salve em `vagas/vaga-<empresa>-<cargo>-<AAAA-MM-DD>.json` (nomes em kebab-case). A `enviar-email` reaproveita esse arquivo:

```json
{
  "empresa": "", "cargo": "", "senioridade": "", "local": "", "modelo": "remoto|híbrido|presencial",
  "contratacao": "CLT|PJ|não informado", "idioma": "pt|en|es",
  "requisitos_obrigatorios": [], "requisitos_desejaveis": [], "responsabilidades": [],
  "palavras_chave": [], "como_candidatar": "", "link": "", "contato": "",
  "nome_arquivo_envio": "", "aderencia": {}
}
```

`palavras_chave`: tecnologias, ferramentas, metodologias e termos de domínio que aparecem na vaga, **escritos como na vaga** (ex.: "ReactJS", "Testes automatizados", "Design System").

### 3. Cruzar vaga × perfil (aderência)

Para cada requisito obrigatório e desejável, procure evidência no perfil (`skills`, `stack` e `bullets` das experiências, `projetos`):

| Status | Quando |
|---|---|
| ✅ atende | Há evidência explícita (skill listada **e** usada em experiência ou projeto). |
| 🟡 parcial | Só aparece na lista de skills, só em projeto pessoal, ou é algo equivalente (ex.: vaga pede Vue, perfil tem React). |
| ❌ não atende | Não há nada no perfil. |

Guarde em `aderencia` no JSON da vaga (`{ "requisito": { "status": "atende|parcial|nao", "evidencia": "onde está no perfil" } }`) e **mostre ao usuário uma tabela curta** antes de montar o currículo: aderência geral (ex.: "8 de 10 obrigatórios"), os ❌ e os 🟡. Os ❌ **não entram no currículo**; se o usuário disser que tem aquela experiência, ela vai primeiro pro `perfil.yaml` (com `fontes: [manual]` se for projeto) e só depois pro currículo.

### 4. Decidir o conteúdo a partir da vaga

- **Título** (linha abaixo do nome): o cargo da vaga, **se** o perfil tiver experiência equivalente (ex.: vaga "Desenvolvedor Front-end Sênior", perfil com cargos front-end sênior). Se não tiver, use um título real do perfil que seja o mais próximo. **Se `regras_alternativas` definir o título (ou o nome de um cargo) por senioridade da vaga, siga a regra de lá** e diga na entrega (passo 8) qual regra foi aplicada.
- **Resumo** (2-3 linhas): reescrito a partir do `resumo` do perfil, focado no que a vaga pede, com 3 a 5 `palavras_chave` atendidas. Só fatos do perfil.
- **Experiências**: todas as relevantes, da mais recente pra mais antiga. Em cada uma, **escolha e reordene os bullets** pelos requisitos que eles comprovam (3 a 6 bullets na mais relevante, 2 a 4 nas demais). Cargos antigos e sem relação com a vaga podem sair.
  - Pode reescrever um bullet pra usar o termo da vaga quando for **o mesmo fato** (perfil "component library" → vaga "Design System"). Não pode acrescentar tecnologia, número ou resultado que o bullet não tem.
  - Métricas reais do perfil (ex.: deploy de 20 min pra menos de 1 min, custo -70%) têm prioridade, se forem relevantes pra vaga.
- **Projetos**: 1 a 3 projetos do perfil que comprovem requisitos que as experiências não cobrem, ou quando a vaga pedir portfólio/GitHub. Nenhum relevante: remova a seção.
- **Competências**: 3 a 5 grupos (ex.: "Front-end", "Testes", "Ferramentas"), com as skills que a vaga pede e o perfil tem **primeiro**, usando a grafia da vaga quando for a mesma coisa (ATS procura o termo exato). Depois, no máximo 4 a 6 skills relevantes por grupo. Não liste as 75 skills do perfil.
- **Formação, certificações, idiomas**: do perfil. Certificações só as relacionadas à vaga. Se a vaga pedir um idioma, mostre o nível real do perfil.
- **Idioma do currículo**: o idioma da vaga. Traduza fielmente o que estiver em outro idioma no perfil, sem acrescentar nada.
- **Tamanho**: 1 página para até ~5 anos de experiência relevante; no máximo 2.

### 5. Revisar a escrita (opcional, recomendado)

Se as skills estiverem instaladas, passe os bullets escolhidos por `resume-bullet-writer` (verbo forte + resultado) e o currículo final por `resume-ats-optimizer` com o texto da vaga. **Não use números estimados** sugeridos por `resume-quantifier` sem o usuário confirmar que são reais.

### 6. Montar o HTML

- Copie `.claude/skills/gerar-curriculo/template.html` para `curriculo/gerados/<empresa-ou-generico>-<cargo>-<AAAA-MM-DD>.html`.
- Substitua os placeholders e duplique os blocos repetíveis (`.item` de experiência e de projeto, `<li>` de competências, certificações e idiomas).
- Remova toda seção sem conteúdo e todo placeholder que sobrar (`grep -n "{{" <arquivo>` tem que voltar vazio).
- Não mexa no CSS sem o usuário pedir.

### 7. Gerar o PDF

```
node ".claude/skills/gerar-curriculo/scripts/html-to-pdf.mjs" "<html>" "<pdf>"
```

O script usa o Chrome/Edge instalado (sem dependências npm). Confira o número de páginas (`grep -ac "/Type /Page$" <pdf>`) e corte bullets se passou do tamanho do passo 4.

**Nome do arquivo para o recrutador.** O PDF fica salvo em `curriculo/gerados/` com o nome interno (`<empresa>-<cargo>-<AAAA-MM-DD>.pdf`), mas quem recebe vê outro nome: `<Nome>_<Sobrenome>_Curriculo_<Titulo>.pdf` (em vaga em inglês: `<Nome>_<Sobrenome>_Resume_<Title>.pdf`).
- `<Nome>_<Sobrenome>`: o nome que aparece no topo do currículo (ex.: `Maria_Silva`).
- `<Titulo>`: o título do passo 4, só o cargo, sem a parte depois do `|` (ex.: `Front-End_Senior`, `Tech_Lead`, `Senior_Front-End_Engineer`).
- Sem acentos, espaços viram `_` e sem empresa nem data, porque o recrutador não precisa ver pra qual vaga você adaptou o currículo.

Salve esse nome no JSON da vaga como `"nome_arquivo_envio"`. A `enviar-email` usa esse nome no anexo com `--attach-name`.

### 8. Entregar

- Caminho do PDF e do JSON da vaga, e o nome que o anexo vai ter no envio (`nome_arquivo_envio`).
- Aderência em uma linha e os requisitos não atendidos.
- O que foi priorizado (título, experiências e bullets que entraram, projetos, termos da vaga usados).
- Registre (ou atualize) a vaga em `vagas/candidaturas.md`: data, empresa, cargo, aderência, caminho do PDF, como se candidatar e status (`currículo pronto`). O formato está na `rotina-linkedin`.
- Pergunte se quer ajustes. Se for se candidatar por e-mail, a `enviar-email` usa esse PDF e o JSON da vaga.
- **Chamada pela `rotina-linkedin`**: não pergunte nada (nem o "currículo genérico?" do passo 2, nem os ajustes). A rotina decide o que fazer com a vaga.

## Regras que não mudam

- Nunca invente cargo, empresa, data, número, tecnologia ou conquista. Adaptar = escolher, ordenar e reescrever o que é real.
- Requisito ❌ nunca aparece como se o usuário tivesse.
- `curriculo/perfil.yaml`, `curriculo/gerados/` e `vagas/` contêm dados pessoais e ficam fora do git.
