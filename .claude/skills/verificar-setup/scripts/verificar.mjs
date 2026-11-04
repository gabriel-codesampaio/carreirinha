#!/usr/bin/env node
/**
 * Diagnóstico local do projeto: confere se tem o que cada skill precisa pra rodar.
 * Só leitura. Nunca imprime valores de segredos (.env), só se estão preenchidos.
 *
 * Uso:
 *   node .claude/skills/verificar-setup/scripts/verificar.mjs [--rede] [--json]
 *
 * --rede  também testa se o usuário do GitHub do perfil.yaml existe (API pública)
 * --json  imprime o resultado em JSON em vez de lista
 *
 * Sai com código 1 se houver algum item ❌ (bloqueante).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Todos os caminhos abaixo são relativos à raiz, de onde quer que o script seja chamado.
process.chdir(fileURLToPath(new URL("../../../../", import.meta.url)));

// dotenv é opcional: o diagnóstico precisa rodar mesmo antes do npm install, pra dizer que ele falta.
try { await import("dotenv/config"); } catch {}

const args = process.argv.slice(2);
const rede = args.includes("--rede");
const comoJson = args.includes("--json");
const r = [];
const add = (area, item, status, detalhe, resolver = "", afeta = "") =>
  r.push({ area, item, status, detalhe, resolver, afeta });
const ler = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

// ---------- Ambiente ----------
const nodeMaior = Number(process.versions.node.split(".")[0]);
add("Ambiente", "Node.js", nodeMaior >= 20 ? "ok" : "erro", `v${process.versions.node}`,
  "Instale Node 20 ou mais novo", "todas as skills com script");

const pkg = JSON.parse(ler("package.json") ?? "{}");
const faltaDep = Object.keys(pkg.dependencies ?? {}).filter((d) => !existsSync(join("node_modules", d)));
add("Ambiente", "Dependências npm", faltaDep.length ? "erro" : "ok",
  faltaDep.length ? `faltando: ${faltaDep.join(", ")}` : "instaladas",
  "Rode `npm install`", "enviar-email, github-importar-perfil");

const navegadores = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
  "/snap/bin/chromium",
];
const nav = [process.env.CHROME_PATH, ...navegadores].filter(Boolean).find((p) => existsSync(p));
add("Ambiente", "Chrome/Edge (PDF)", nav ? "ok" : "erro", nav ?? "não encontrado nos caminhos padrão",
  "Instale o Google Chrome/Edge/Chromium ou defina CHROME_PATH no .env", "gerar-curriculo");

// ---------- Perfil ----------
const perfil = ler("curriculo/perfil.yaml");
if (!perfil) {
  add("Perfil", "curriculo/perfil.yaml", "erro", "não existe",
    'Peça "importa meu perfil do LinkedIn" (linkedin-importar-perfil)', "gerar-curriculo, enviar-email");
} else {
  // shortcut: regex lê o YAML comum (com ou sem aspas, lista em blocos ou inline), YAML avançado escapa; o projeto evita dependência de parser.
  const limpa = (v = "") => v.replace(/(^|\s+)#.*$/, "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  const campo = (k) => limpa((perfil.match(new RegExp(`^[ \\t]*${k}:[ \\t]*(.*)$`, "m")) ?? [])[1]);
  const conta = (texto, re) => [...texto.matchAll(re)].filter((m) => limpa(m[1])).length;
  const exp = conta(perfil, /^\s*- empresa:[ \t]*(.*)$/gm);
  const proj = conta(perfil.split(/^projetos:/m)[1] ?? "", /^\s*- nome:[ \t]*(.*)$/gm);
  const blocoTecnicas = (perfil.split(/^\s*tecnicas:/m)[1] ?? "").split(/^\s*comportamentais:/m)[0];
  const inline = blocoTecnicas.match(/^[ \t]*\[(.*)\]/)?.[1];
  const skills = inline !== undefined
    ? inline.split(",").filter((v) => limpa(v)).length
    : conta(blocoTecnicas, /^\s*- (.*)$/gm);

  const nomeEmail = campo("nome") && campo("email");
  add("Perfil", "Nome e e-mail", nomeEmail ? "ok" : "erro", nomeEmail ? "preenchidos" : "nome ou e-mail vazio",
    "Preencha dados_pessoais no perfil.yaml", "gerar-curriculo, enviar-email");
  add("Perfil", "Telefone", campo("telefone") ? "ok" : "aviso", campo("telefone") ? "preenchido" : "vazio",
    "Opcional; aparece no cabeçalho do currículo", "gerar-curriculo");
  add("Perfil", "Experiências", exp ? "ok" : "erro", `${exp}`,
    "Rode a linkedin-importar-perfil", "gerar-curriculo");
  add("Perfil", "Skills técnicas", skills >= 5 ? "ok" : "aviso", `${skills}`,
    "Rode as importações do LinkedIn e do GitHub", "gerar-curriculo, filtro padrão de vagas");
  add("Perfil", "Projetos", proj ? "ok" : "aviso", `${proj}`,
    "Rode a github-importar-perfil", "gerar-curriculo (seção Projetos)");

  const gh = campo("github").replace(/^(https?:\/\/)?(www\.)?github\.com\//, "").replace(/\/$/, "");
  add("Perfil", "Usuário do GitHub", gh ? "ok" : "aviso", gh || "vazio",
    "Preencha dados_pessoais.github", "github-importar-perfil");
  if (rede && /^[A-Za-z0-9-]{1,39}$/.test(gh)) {
    try {
      const res = await fetch(`https://api.github.com/users/${gh}`, { headers: { "User-Agent": "carreirinha" } });
      add("Perfil", "GitHub acessível", res.ok ? "ok" : "aviso", `HTTP ${res.status}`,
        res.status === 403 ? "Limite da API: ponha GITHUB_TOKEN no .env" : "Confira o usuário", "github-importar-perfil");
    } catch {
      add("Perfil", "GitHub acessível", "aviso", "sem rede", "Confira a conexão", "github-importar-perfil");
    }
  }
}

// ---------- E-mail (.env) ----------
const env = ler(".env");
if (!env) {
  add("E-mail", ".env", "aviso", "não existe (só é preciso pra enviar candidaturas por e-mail)", "Copie .env.example → .env e preencha", "enviar-email");
} else {
  for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]) {
    const v = (env.match(new RegExp(`^${k}=(.*)$`, "m")) ?? [])[1]?.trim().replace(/^"|"$/g, "");
    add("E-mail", k, v ? "ok" : "erro", v ? "preenchido" : "vazio",
      `Preencha ${k} no .env (nunca cole no chat)`, "enviar-email");
  }
  const tk = (env.match(/^GITHUB_TOKEN=(.*)$/m) ?? [])[1]?.trim();
  add("E-mail", "GITHUB_TOKEN (opcional)", tk ? "ok" : "info",
    tk ? "preenchido" : "vazio (60 req/h, normalmente basta)", "", "github-importar-perfil");
}

// ---------- Configuração ----------
const configs = [
  ["limites", "linkedin-conectar-recrutadores, linkedin-vagas-posts, rotina-linkedin"],
  ["filtro-vagas", "linkedin-vagas-posts, linkedin-buscar-vagas"],
];
for (const [arq, afeta] of configs) {
  const real = existsSync(`config/${arq}.md`);
  const ex = existsSync(`config/${arq}.example.md`);
  add("Config", `config/${arq}.md`, real ? "ok" : ex ? "aviso" : "erro",
    real ? "personalizado" : ex ? "usando o .example.md (valores padrão)" : "nem o .example.md existe",
    `Copie config/${arq}.example.md → config/${arq}.md e ajuste`, afeta);
}
const sig = existsSync("config/assinatura.html");
add("Config", "config/assinatura.html", sig ? "ok" : "aviso", sig ? "presente" : "sem assinatura nos e-mails",
  "Copie config/assinatura.example.html (e .txt) e ajuste", "enviar-email");
const tpl = existsSync(".claude/skills/gerar-curriculo/template.html");
add("Config", "Template do currículo", tpl ? "ok" : "erro", tpl ? "presente" : "faltando",
  "Restaure do git", "gerar-curriculo");

// ---------- Skills de apoio ----------
const dirsSkills = [join(homedir(), ".claude", "skills"), ".claude/skills"];
const instaladas = new Set(dirsSkills.flatMap((d) => (existsSync(d) ? readdirSync(d) : [])));
for (const s of ["resume-bullet-writer", "resume-ats-optimizer", "resume-quantifier", "pdf"]) {
  add("Apoio", s, instaladas.has(s) ? "ok" : "aviso", instaladas.has(s) ? "instalada" : "não instalada",
    "Opcional: comando de instalação no README", "gerar-curriculo (revisão)");
}

// ---------- Privacidade (git) ----------
let ehRepo = true;
try { execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" }); } catch { ehRepo = false; }
if (ehRepo) {
  const sensiveis = [
    ["curriculo/perfil.yaml", "curriculo/perfil.yaml"],
    ["curriculo/perfil.novo.yaml", "curriculo/perfil.novo.yaml"],
    ["curriculo/historico/teste.pdf", "curriculo/historico/"],
    ["config/assinatura.html", "config/assinatura.*"],
    [".env", ".env"],
    ["vagas/teste.json", "vagas/*"],
    ["config/limites.md", "config/*.md"],
    ["curriculo/gerados/teste.pdf", "curriculo/gerados/*"],
  ];
  for (const [caminho, rotulo] of sensiveis) {
    let ignorado = true;
    try { execSync(`git check-ignore -q "${caminho}"`, { stdio: "ignore" }); } catch { ignorado = false; }
    add("Privacidade", rotulo, ignorado ? "ok" : "erro", ignorado ? "fora do git" : "IRIA PRO GIT",
      "Confira o .gitignore", "dados pessoais");
  }
} else {
  add("Privacidade", "git", "info", "não é um repositório git", "", "");
}

// ---------- Saída ----------
const icone = { ok: "✅", aviso: "⚠️", erro: "❌", info: "ℹ️" };
if (comoJson) {
  console.log(JSON.stringify(r, null, 2));
} else {
  let areaAtual = "";
  for (const x of r) {
    if (x.area !== areaAtual) {
      areaAtual = x.area;
      console.log(`\n## ${x.area}`);
    }
    const dica = x.status === "erro" || x.status === "aviso" ? `  →  ${x.resolver}` : "";
    console.log(`${icone[x.status]} ${x.item}: ${x.detalhe}${dica}`);
  }
  const n = (s) => r.filter((x) => x.status === s).length;
  console.log(`\nResumo: ${n("ok")} ok, ${n("aviso")} avisos, ${n("erro")} bloqueantes`);
}
process.exit(r.some((x) => x.status === "erro") ? 1 : 0);
