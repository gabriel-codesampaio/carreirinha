# Limites

Copie este arquivo para `config/limites.md` e ajuste os valores. Se `config/limites.md` não existir, as skills usam os valores daqui.

Mude só a coluna **Valor**. Limites altos aumentam o risco de o LinkedIn restringir a conta e de o modo automático do Claude Code bloquear envios no meio da sessão.

## Convites a recrutadores (`linkedin-conectar-recrutadores`)

| Chave | Valor | O que controla |
|---|---|---|
| `convites_por_sessao_max` | 15 | Teto de convites numa mesma sessão. Acima disso a skill avisa e sugere dividir em outro dia. |
| `convites_por_dia_max` | 15 | Teto de convites somando todas as rotinas do mesmo dia (conta pelo `vagas/rotina-linkedin.md`). |
| `convites_padrao_rotina` | 10 | Quantos convites a `rotina-linkedin` envia se você não disser um número. |
| `espera_entre_convites_seg` | 3 | Segundos de espera entre um convite e o próximo. |
| `min_convidaveis_por_pagina` | 3 | Se uma página de resultados tiver menos pessoas convidáveis que isso, passa pro próximo termo de busca. |
| `enviar_com_nota` | não | `sim` para perguntar/usar uma nota no convite; `não` para enviar sem nota. |

## Vagas nos posts e rotina (`linkedin-vagas-posts`, `rotina-linkedin`)

| Chave | Valor | O que controla |
|---|---|---|
| `posts_max_por_execucao` | 80 | Teto de segurança de posts lidos por execução. |
| `scrolls_max_por_execucao` | 15 | Teto de segurança de rolagens por execução. |
| `vagas_alvo_padrao` | 5 | Critério de parada padrão: para ao achar esse número de vagas dentro do filtro. |
| `curtir_vagas_no_filtro` | sim | `sim` para dar "Gostei" nos posts de vaga dentro do filtro (ajuda o algoritmo do feed); `não` para só ler. |
| `rodadas_feed_max` | 3 | Na `rotina-linkedin`: quantas vezes recarrega o feed atrás de posts novos antes de encerrar. |
| `aderencia_minima` | maioria | Pra gerar currículo de uma vaga: `maioria` (mais da metade dos requisitos obrigatórios atendidos), `todos` ou `qualquer`. |
| `confirmar_emails` | fim | Formato da pergunta antes de enviar currículos: `fim` = uma lista com todas as vagas no final da rotina; `cada` = uma por uma. **Não existe opção sem pergunta.** |
