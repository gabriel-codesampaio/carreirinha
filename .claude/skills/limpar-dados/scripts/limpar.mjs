#!/usr/bin/env node
// Limpeza de currículos gerados e vagas antigas.
// Uso: node limpar.mjs [--dias 7] [--confirm]
// Sem --confirm só lista o que seria apagado (modo rascunho).

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const iDias = args.indexOf('--dias');
const dias = iDias >= 0 ? Number(args[iDias + 1]) : 7;
if (!Number.isFinite(dias) || dias < 1) {
  console.error('--dias precisa ser um número >= 1');
  process.exit(1);
}

const raiz = process.cwd();
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const corte = new Date(hoje.getTime() - dias * 86400000);
const fmt = (d) => d.toISOString().slice(0, 10);

// Nunca apagados: históricos, logs anti-duplicidade e READMEs.
const PROTEGIDOS = new Set([
  'README.md',
  'candidaturas.md',
  'rotina-linkedin.md',
  'progresso-recrutadores.md',
  'enviados.json',
  'linkedin-conexoes.json',
  'posts-vistos.json',
]);

// Pastas e padrões que a limpeza cobre.
const ALVOS = [
  { pasta: 'curriculo/gerados', padrao: /\.(pdf|html|txt)$/i },
  { pasta: 'vagas', padrao: /^(vaga-.*|linkedin-posts-.*|linkedin-vagas-.*|vagas-.*)\.json$/i },
];

function dataDoArquivo(nome, caminho) {
  const m = nome.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return { data: new Date(m[1] + 'T00:00:00'), origem: 'nome' };
  return { data: fs.statSync(caminho).mtime, origem: 'modificação' };
}

const apagar = [];
for (const { pasta, padrao } of ALVOS) {
  const dir = path.join(raiz, pasta);
  if (!fs.existsSync(dir)) continue;
  for (const nome of fs.readdirSync(dir)) {
    if (PROTEGIDOS.has(nome) || !padrao.test(nome)) continue;
    const caminho = path.join(dir, nome);
    if (!fs.statSync(caminho).isFile()) continue;
    const { data, origem } = dataDoArquivo(nome, caminho);
    if (data < corte) apagar.push({ rel: `${pasta}/${nome}`, caminho, data: fmt(data), origem });
  }
}

// posts-vistos.json: remove só as entradas antigas, mantém o arquivo.
const vistosPath = path.join(raiz, 'vagas/posts-vistos.json');
let vistos = null, vistosAntigos = 0;
if (fs.existsSync(vistosPath)) {
  try {
    vistos = JSON.parse(fs.readFileSync(vistosPath, 'utf8'));
    vistosAntigos = vistos.filter((p) => p.data && new Date(p.data + 'T00:00:00') < corte).length;
  } catch {
    console.warn('Aviso: vagas/posts-vistos.json ilegível, não mexi nele.');
    vistos = null;
  }
}

console.log(`Limpeza: itens com data anterior a ${fmt(corte)} (mais de ${dias} dias).`);
console.log(`Modo: ${confirm ? 'APAGANDO' : 'rascunho (nada é apagado; use --confirm)'}\n`);
if (!apagar.length && !vistosAntigos) {
  console.log('Nada para limpar.');
  process.exit(0);
}
for (const a of apagar) console.log(`- ${a.rel}  (${a.data}, pela data de ${a.origem})`);
if (vistosAntigos) console.log(`- vagas/posts-vistos.json: ${vistosAntigos} entrada(s) antiga(s) de ${vistos.length}`);
console.log(`\nTotal: ${apagar.length} arquivo(s)${vistosAntigos ? ` + ${vistosAntigos} entrada(s) de posts vistos` : ''}.`);

if (!confirm) process.exit(0);

for (const a of apagar) fs.unlinkSync(a.caminho);
if (vistosAntigos) {
  const restantes = vistos.filter((p) => !(p.data && new Date(p.data + 'T00:00:00') < corte));
  fs.writeFileSync(vistosPath, JSON.stringify(restantes, null, 1));
}

// candidaturas.md: marca os caminhos de currículo apagados, sem apagar as linhas (é o histórico).
const candPath = path.join(raiz, 'vagas/candidaturas.md');
if (fs.existsSync(candPath)) {
  let cand = fs.readFileSync(candPath, 'utf8');
  let marcados = 0;
  for (const a of apagar.filter((x) => x.rel.endsWith('.pdf'))) {
    if (cand.includes(a.rel)) {
      cand = cand.split(a.rel).join(`(apagado na limpeza de ${fmt(hoje)})`);
      marcados++;
    }
  }
  if (marcados) fs.writeFileSync(candPath, cand);
  if (marcados) console.log(`candidaturas.md: ${marcados} currículo(s) marcado(s) como apagado(s).`);
}

console.log('Limpeza concluída.');
