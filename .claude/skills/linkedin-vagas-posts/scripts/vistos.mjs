#!/usr/bin/env node
/**
 * Filtra os posts lidos do feed contra vagas/posts-vistos.json sem o modelo precisar ler esse arquivo
 * (ele cresce ~200 KB por mês e custaria dezenas de milhares de tokens a cada rotina).
 *
 *   node vistos.mjs filtrar <feed.json> <novos.json>
 *       feed.json: saída do evaluate_script do passo 4a (lista de { i, link, texto }).
 *       Grava só os posts novos em novos.json e imprime uma prévia curta de cada um;
 *       os que têm cara de vaga saem com o texto inteiro.
 *
 *   node vistos.mjs marcar <novos.json> <AAAA-MM-DD> [i,i,...]
 *       Acrescenta todos os posts de novos.json ao posts-vistos.json; os índices listados ficam com vaga: true.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VISTOS = fileURLToPath(new URL("../../../../vagas/posts-vistos.json", import.meta.url));
const [cmd, a, b, c] = process.argv.slice(2);
const ler = (p) => JSON.parse(readFileSync(p, "utf8"));
const vistos = existsSync(VISTOS) ? ler(VISTOS) : [];

// Mesma regra de id do SKILL.md: link sem parâmetros; sem link, os primeiros 120 caracteres do texto.
const idDe = (p) => p.link?.split("?")[0] || p.texto.slice(0, 120);
const SINAIS = /\bvaga|contratando|hiring|estamos (buscando|em busca)|oportunidade|envie (seu )?(currículo|cv)|banco de talentos|requisitos|modelo de (trabalho|contratação)|\b(clt|pj)\b|remoto|remote|@\S+\.\w/i;

if (cmd === "filtrar" && a && b) {
  const ja = new Set(vistos.map((v) => v.id));
  const novos = ler(a)
    .map((p) => ({ ...p, texto: p.texto.replace(/^(Publicação no feed|Feed post) /, "") }))
    .map((p) => ({ ...p, id: idDe(p) }))
    .filter((p) => !ja.has(p.id));
  writeFileSync(b, JSON.stringify(novos));
  console.log(`lidos ${ler(a).length}, novos ${novos.length}`);
  for (const p of novos) {
    const vaga = SINAIS.test(p.texto);
    console.log(`#${p.i}${vaga ? " [VAGA?]" : ""} ${vaga ? p.texto : p.texto.slice(0, 160)}`);
  }
} else if (cmd === "marcar" && a && b) {
  const vagas = new Set((c || "").split(",").filter(Boolean).map(Number));
  for (const p of ler(a)) vistos.push({ id: p.id, data: b, vaga: vagas.has(p.i) });
  writeFileSync(VISTOS, JSON.stringify(vistos, null, 1));
  console.log(`posts-vistos.json: ${vistos.length} entradas`);
} else {
  console.error("Uso: vistos.mjs filtrar <feed.json> <novos.json> | marcar <novos.json> <AAAA-MM-DD> [i,i,...]");
  process.exit(1);
}
