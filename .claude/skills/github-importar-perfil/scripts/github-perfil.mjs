#!/usr/bin/env node
/**
 * Coleta o perfil público de um usuário do GitHub e imprime um JSON enxuto pra skill
 * github-importar-perfil montar a seção `projetos` do perfil.yaml.
 *
 * Só leitura, via API pública do GitHub (sem login: 60 requisições/hora).
 * Se GITHUB_TOKEN estiver no .env, usa o token e o limite sobe pra 5.000/hora.
 *
 * Uso:
 *   node github-perfil.mjs <usuario> [--detalhar 12] [--out caminho.json]
 *
 * --detalhar N  quantos repositórios recebem linguagens + README (fixados primeiro,
 *               depois os mais recentes). Padrão: 12.
 * --out         grava o JSON num arquivo em vez de imprimir.
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const usuario = args.find((a) => !a.startsWith("--"));
const opt = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
const detalhar = Number(opt("detalhar", 12));
const out = opt("out");

if (!usuario) {
  console.error("Uso: node github-perfil.mjs <usuario> [--detalhar 12] [--out arquivo.json]");
  process.exit(1);
}

const headers = { Accept: "application/vnd.github+json", "User-Agent": "carreira-generator" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function api(caminho) {
  const res = await fetch(`https://api.github.com${caminho}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) {
    const resto = res.headers.get("x-ratelimit-remaining");
    throw new Error(`GitHub ${res.status} em ${caminho}${resto === "0" ? " (limite de requisições atingido; defina GITHUB_TOKEN no .env)" : ""}`);
  }
  return res.json();
}

async function readme(repo) {
  const res = await fetch(`https://api.github.com/repos/${usuario}/${repo}/readme`, {
    headers: { ...headers, Accept: "application/vnd.github.raw" },
  });
  if (!res.ok) return null;
  const texto = await res.text();
  return texto.length > 3000 ? texto.slice(0, 3000) + "\n…(cortado)" : texto;
}

async function fixados() {
  // A API REST não expõe os repositórios fixados; eles vêm do HTML público do perfil.
  const res = await fetch(`https://github.com/${usuario}`, { headers: { "User-Agent": "carreira-generator" } });
  if (!res.ok) return [];
  const html = await res.text();
  const re = new RegExp(`href="/${usuario}/([^"/]+)"[^>]*>\s*<span class="repo"`, "g");
  return [...new Set([...html.matchAll(re)].map((m) => m[1]))];
}

const user = await api(`/users/${usuario}`);
if (!user) {
  console.error(`Usuário do GitHub não encontrado: ${usuario}`);
  process.exit(1);
}

const repos = (await api(`/users/${usuario}/repos?per_page=100&sort=pushed`)) ?? [];
const pinned = await fixados();
const proprios = repos.filter((r) => !r.fork && !r.archived && r.name !== usuario);

const ordem = [
  ...pinned.map((n) => proprios.find((r) => r.name === n)).filter(Boolean),
  ...proprios.filter((r) => !pinned.includes(r.name)),
];

const detalhados = [];
for (const [i, r] of ordem.entries()) {
  const base = {
    nome: r.name,
    fixado: pinned.includes(r.name),
    descricao: r.description,
    link: r.html_url,
    site: r.homepage || null,
    linguagem_principal: r.language,
    topicos: r.topics ?? [],
    estrelas: r.stargazers_count,
    criado_em: r.created_at?.slice(0, 10),
    atualizado_em: r.pushed_at?.slice(0, 10),
  };
  if (i < detalhar) {
    const langs = (await api(`/repos/${usuario}/${r.name}/languages`)) ?? {};
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    base.linguagens = Object.fromEntries(
      Object.entries(langs).map(([k, v]) => [k, `${Math.round((v / total) * 100)}%`])
    );
    base.readme = await readme(r.name);
  }
  detalhados.push(base);
}

const resultado = {
  usuario: user.login,
  nome: user.name,
  bio: user.bio,
  site: user.blog || null,
  local: user.location,
  link: user.html_url,
  repos_publicos: user.public_repos,
  readme_do_perfil: await readme(usuario),
  repositorios: detalhados,
  ignorados: {
    forks: repos.filter((r) => r.fork).map((r) => r.name),
    arquivados: repos.filter((r) => r.archived).map((r) => r.name),
  },
};

const json = JSON.stringify(resultado, null, 2);
if (out) {
  await writeFile(out, json);
  console.log(`Salvo em ${out} (${detalhados.length} repositórios, ${Math.min(detalhar, detalhados.length)} detalhados)`);
} else {
  console.log(json);
}
