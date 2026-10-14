---
name: gerar-curriculo
description: Gera um currículo em PDF sob medida para o usuário, a partir da base de carreira do projeto e (opcionalmente) de uma vaga específica. Use quando o pedido for para criar, gerar, atualizar ou adaptar um currículo / resume / CV em PDF.
---

# Gerar Currículo

Gera um currículo em PDF usando o template visual do projeto (`template.html`, réplica fiel de `curriculo/template-original.docx`) e os dados reais de carreira do usuário.

## Passo a passo

1. **Carregar a base de carreira**
   - Leia `curriculo/perfil.yaml`.
   - Se o arquivo não existir ou estiver com os campos vazios/placeholder, avise o usuário e ajude a preencher antes de gerar qualquer PDF — nunca gere um currículo com dados fictícios ou incompletos.

2. **Entender a vaga (se houver)**
   - Se o usuário forneceu uma descrição de vaga, um link ou colou o texto de um anúncio, leia com atenção: cargo, stack/skills pedidas, responsabilidades.
   - Use isso para **selecionar e priorizar** quais experiências e bullets do `perfil.yaml` entram no currículo (as mais relevantes pra vaga primeiro) e para ajustar o resumo profissional (2-3 linhas) com as palavras-chave da vaga — sem inventar nada que não esteja em `perfil.yaml`.
   - Se não houver vaga específica, gere uma versão genérica usando as experiências mais recentes/relevantes.

3. **Montar o HTML**
   - Copie `.claude/skills/gerar-curriculo/template.html` para um novo arquivo em `curriculo/gerados/<empresa-ou-generico>-<cargo>-<AAAA-MM-DD>.html`.
   - Substitua os placeholders (`{{NOME}}`, `{{EMPRESA}}`, `{{BULLET_1}}` etc.) pelos dados reais, duplicando o bloco `<div class="item">...</div>` de experiência para cada vaga incluída.
   - Remova qualquer placeholder/bloco não usado (ex.: seção de certificações, se não houver nenhuma).
   - Não altere o CSS do template a menos que o usuário peça explicitamente — ele já replica o layout aprovado.

4. **Gerar o PDF**
   - Rode: `node ".claude/skills/gerar-curriculo/scripts/html-to-pdf.mjs" "<caminho-do-html>" "<caminho-do-pdf>"`
   - O script usa o Chrome/Edge já instalado na máquina (sem dependências npm). O PDF sai no mesmo diretório `curriculo/gerados/`, mesmo nome-base do HTML.

5. **Confirmar**
   - Informe ao usuário o caminho do PDF gerado e um resumo do que foi priorizado/adaptado para a vaga (se houver).
   - Pergunte se ele quer ajustes antes de considerar finalizado (tom, bullets, seleção de experiências).

## Observações importantes

- Nunca invente cargos, empresas, datas ou números que não estejam em `curriculo/perfil.yaml`. Adaptar para uma vaga = reordenar/reescrever com base no que é real, não fabricar conquistas.
- Arquivos `.html` intermediários podem ficar em `curriculo/gerados/` como rascunho/histórico, mas o entregável final é sempre o `.pdf`.
- `curriculo/perfil.yaml` contém dados pessoais (PII) — não deve ser exposto fora deste projeto.
