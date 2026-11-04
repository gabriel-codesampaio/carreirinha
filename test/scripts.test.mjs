// Roda os scripts de verdade numa cópia do projeto em pasta temporária: nada toca o .env, o perfil nem os dados reais.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pastas = [];

// Sem as variáveis de SMTP, um --confirm válido para em checarEnv: nenhum teste consegue enviar e-mail.
const ambiente = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^(SMTP_|EMAIL_|GITHUB_TOKEN|CHROME_PATH)/.test(k))
);

function novoProjeto() {
  const raiz = mkdtempSync(join(tmpdir(), "carreirinha-"));
  pastas.push(raiz);
  cpSync(join(PROJETO, ".claude/skills"), join(raiz, ".claude/skills"), { recursive: true });
  cpSync(join(PROJETO, "package.json"), join(raiz, "package.json"));
  symlinkSync(join(PROJETO, "node_modules"), join(raiz, "node_modules"), "junction");
  mkdirSync(join(raiz, "curriculo/gerados"), { recursive: true });
  mkdirSync(join(raiz, "vagas"), { recursive: true });
  mkdirSync(join(raiz, "config"), { recursive: true });
  writeFileSync(join(raiz, "curriculo/gerados/_email-acme.txt"), "Olá\n");
  writeFileSync(join(raiz, "curriculo/gerados/acme-dev-2026-01-01.pdf"), "pdf");
  return raiz;
}

function rodar(raiz, script, args = [], { cwd = raiz, env = {}, node = [] } = {}) {
  const r = spawnSync(process.execPath, [...node, join(raiz, ".claude/skills", script), ...args], {
    cwd,
    env: { ...ambiente, ...env },
    encoding: "utf8",
  });
  return { codigo: r.status, saida: r.stdout + r.stderr };
}

const EMAIL = "enviar-email/scripts/send-email.mjs";
const base = ["--to", "rh@acme.com", "--subject", "Vaga Dev", "--body", "curriculo/gerados/_email-acme.txt", "--attach", "curriculo/gerados/acme-dev-2026-01-01.pdf"];
const hashDo = (saida) => saida.match(/--confirm ([0-9a-f]{12})/)?.[1];
const preview = (raiz, extra = []) => rodar(raiz, EMAIL, [...base, ...extra]);

after(() => pastas.forEach((p) => rmSync(p, { recursive: true, force: true })));

// ---------- enviar-email: arquivos ----------
test("#1 recusa --body fora de curriculo/gerados, como o .env", () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, ".env"), "SEGREDO_DE_TESTE=abc\n");
  const r = rodar(raiz, EMAIL, ["--to", "a@b.c", "--subject", "t", "--body", ".env"]);
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /Corpo recusado/);
  assert.doesNotMatch(r.saida, /SEGREDO_DE_TESTE/);
});

test("#1 recusa --body em gerados que não seja .txt", () => {
  const r = rodar(novoProjeto(), EMAIL, ["--to", "a@b.c", "--subject", "t", "--body", "curriculo/gerados/acme-dev-2026-01-01.pdf"]);
  assert.match(r.saida, /Corpo recusado/);
});

test("recusa anexo fora de curriculo/gerados e travessia de pasta", () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, "curriculo/perfil.pdf"), "x");
  for (const attach of ["curriculo/perfil.pdf", "curriculo/gerados/../perfil.pdf"]) {
    const r = rodar(raiz, EMAIL, ["--to", "a@b.c", "--subject", "t", "--body", "curriculo/gerados/_email-acme.txt", "--attach", attach]);
    assert.equal(r.codigo, 1);
    assert.match(r.saida, /Anexo recusado/);
  }
});

// ---------- enviar-email: log e duplicidade ----------
test("#6 log corrompido aborta e continua intacto", () => {
  const raiz = novoProjeto();
  const log = join(raiz, "vagas/enviados.json");
  writeFileSync(log, "{quebrado");
  const r = preview(raiz);
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /ilegível/);
  assert.equal(readFileSync(log, "utf8"), "{quebrado");
});

test("#6 log que não é lista também aborta", () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, "vagas/enviados.json"), "{}");
  assert.match(preview(raiz).saida, /não é uma lista/);
});

const registrar = (raiz, entrada) => writeFileSync(join(raiz, "vagas/enviados.json"), JSON.stringify([entrada]));

test("#12 duplicidade ignora caixa e espaços", () => {
  const raiz = novoProjeto();
  registrar(raiz, { to: "RH@Acme.com", subject: "vaga   dev", sentAt: "2026-01-01" });
  const r = preview(raiz);
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /Já existe/);
});

test("#12 mesmo currículo com assunto reescrito é duplicado", () => {
  const raiz = novoProjeto();
  registrar(raiz, { to: "rh@acme.com", subject: "Outro assunto", attachment: "/x/acme-dev-2026-01-01.pdf", sentAt: "2026-01-01" });
  assert.match(preview(raiz).saida, /Já existe/);
});

test("#12 outra vaga pro mesmo destinatário passa, e --force libera duplicado", () => {
  const raiz = novoProjeto();
  registrar(raiz, { to: "rh@acme.com", subject: "Outro assunto", attachment: "/x/outra-2026-01-01.pdf", sentAt: "2026-01-01" });
  assert.equal(preview(raiz).codigo, 0);
  registrar(raiz, { to: "rh@acme.com", subject: "Vaga Dev", sentAt: "2026-01-01" });
  assert.equal(preview(raiz, ["--force"]).codigo, 0);
});

test("#13 enxerga o log da raiz chamado de outra pasta", () => {
  const raiz = novoProjeto();
  registrar(raiz, { to: "rh@acme.com", subject: "Vaga Dev", sentAt: "2026-01-01" });
  const r = rodar(raiz, EMAIL, ["--to", "rh@acme.com", "--subject", "Vaga Dev", "--body", join(raiz, "curriculo/gerados/_email-acme.txt")], { cwd: tmpdir() });
  assert.match(r.saida, /Já existe/);
});

// ---------- enviar-email: --confirm ----------
const chegouNoEnvio = (r) => assert.match(r.saida, /Faltam variáveis no \.env/);

test("#18 hash do preview libera o envio", () => {
  const raiz = novoProjeto();
  const hash = hashDo(preview(raiz).saida);
  assert.ok(hash);
  chegouNoEnvio(preview(raiz, ["--empresa", "Acme", "--confirm", hash]));
});

test("#18 recusa --confirm sem hash, hash errado e sem vazar o hash certo", () => {
  const raiz = novoProjeto();
  const certo = hashDo(preview(raiz).saida);
  for (const flags of [["--confirm"], ["--confirm", "000000000000"]]) {
    const r = preview(raiz, ["--empresa", "Acme", ...flags]);
    assert.equal(r.codigo, 1);
    assert.match(r.saida, /Envio recusado/);
    assert.ok(!r.saida.split("PREVIEW").at(-1).split("Envio recusado")[1].includes(certo));
  }
});

test("#18 corpo, anexo ou destinatário alterados invalidam o hash", () => {
  const raiz = novoProjeto();
  const inicial = hashDo(preview(raiz).saida);
  writeFileSync(join(raiz, "curriculo/gerados/_email-acme.txt"), "Mudou\n");
  const corpo = hashDo(preview(raiz).saida);
  assert.notEqual(corpo, inicial);
  writeFileSync(join(raiz, "curriculo/gerados/acme-dev-2026-01-01.pdf"), "outro pdf");
  const anexo = hashDo(preview(raiz).saida);
  assert.notEqual(anexo, corpo);
  const r = rodar(raiz, EMAIL, ["--to", "outro@acme.com", ...base.slice(2), "--empresa", "Acme", "--confirm", anexo]);
  assert.match(r.saida, /Envio recusado/);
});

// ---------- enviar-email: empresas bloqueadas ----------
function comBloqueios(raiz) {
  writeFileSync(join(raiz, "curriculo/perfil.yaml"), `experiencias:
  - empresa: "Empresa Atual S.A."
    clientes:
      - nome: "Cliente Secreto"
        bullets:
          - "x"
  - empresa: Beta
projetos:
  - nome: "Projeto Livre"
`);
  writeFileSync(join(raiz, "config/filtro-vagas.md"), `## Empresas que ficam fora
Texto.

Outras empresas bloqueadas (uma por linha):
- Banco Fictício

## Outra seção
- Não Bloqueada
`);
  return raiz;
}

test("#19 --confirm exige --empresa", () => {
  const raiz = novoProjeto();
  assert.match(preview(raiz, ["--confirm", "abc"]).saida, /Faltou --empresa/);
});

test("#19 bloqueia empresa, cliente e lista do filtro, sem ligar pra caixa, acento ou sufixo", () => {
  const raiz = comBloqueios(novoProjeto());
  for (const flags of [
    ["--empresa", "EMPRESA ATUAL LTDA"],
    ["--empresa", "Outra", "--cliente", "cliente secreto"],
    ["--empresa", "Outra", "--cliente", "X, Banco Ficticio"],
    ["--empresa", "beta"],
  ]) {
    const r = preview(raiz, flags);
    assert.equal(r.codigo, 1, flags.join(" "));
    assert.match(r.saida, /está em "Empresas que ficam fora"/);
  }
  assert.equal(preview(raiz, ["--empresa", "Beta", "--force"]).codigo, 1);
});

test("#19 não bloqueia nome de projeto, outra seção do filtro nem empresa livre", () => {
  const raiz = comBloqueios(novoProjeto());
  for (const empresa of ["Projeto Livre", "Não Bloqueada", "Betania Tech"]) {
    assert.equal(preview(raiz, ["--empresa", empresa]).codigo, 0, empresa);
  }
});

// ---------- limpar-dados ----------
const LIMPAR = "limpar-dados/scripts/limpar.mjs";

function comArquivosAntigos(raiz) {
  const g = (n) => join(raiz, "curriculo/gerados", n);
  writeFileSync(g("aberta-dev-2020-01-01.pdf"), "x");
  writeFileSync(g("aberta-dev-2020-01-01.html"), "x");
  writeFileSync(g("_email-aberta.txt"), "x");
  utimesSync(g("_email-aberta.txt"), new Date("2020-01-01"), new Date("2020-01-01"));
  writeFileSync(join(raiz, "vagas/vaga-aberta-dev-2020-01-01.json"), "{}");
  writeFileSync(g("fechada-dev-2020-01-01.pdf"), "x");
  writeFileSync(join(raiz, "vagas/vaga-fechada-dev-2020-01-01.json"), "{}");
  writeFileSync(join(raiz, "vagas/candidaturas.md"), `| Data | Empresa | Cargo | Aderência | Currículo | Como | Status |
| 2020-01-01 | Aberta | Dev | 5/6 | curriculo/gerados/aberta-dev-2020-01-01.pdf | link | pendente: você envia |
| 2020-01-01 | Fechada | Dev | 5/6 | curriculo/gerados/fechada-dev-2020-01-01.pdf | a@b.c | enviado em 2020-01-02 09:00 |
`);
  return raiz;
}

test("#11 rascunho lista preservados e não apaga nada", () => {
  const raiz = comArquivosAntigos(novoProjeto());
  const r = rodar(raiz, LIMPAR);
  assert.match(r.saida, /Preservado: curriculo\/gerados\/aberta-dev-2020-01-01\.pdf/);
  assert.match(r.saida, /- curriculo\/gerados\/fechada-dev-2020-01-01\.pdf/);
  assert.ok(existsSync(join(raiz, "curriculo/gerados/fechada-dev-2020-01-01.pdf")));
});

test("#11 --confirm mantém a candidatura em aberto e apaga a fechada", () => {
  const raiz = comArquivosAntigos(novoProjeto());
  assert.equal(rodar(raiz, LIMPAR, ["--confirm"]).codigo, 0);
  for (const f of ["curriculo/gerados/aberta-dev-2020-01-01.pdf", "curriculo/gerados/aberta-dev-2020-01-01.html", "curriculo/gerados/_email-aberta.txt", "vagas/vaga-aberta-dev-2020-01-01.json"]) {
    assert.ok(existsSync(join(raiz, f)), f);
  }
  for (const f of ["curriculo/gerados/fechada-dev-2020-01-01.pdf", "vagas/vaga-fechada-dev-2020-01-01.json"]) {
    assert.ok(!existsSync(join(raiz, f)), f);
  }
  const cand = readFileSync(join(raiz, "vagas/candidaturas.md"), "utf8");
  assert.match(cand, /aberta-dev-2020-01-01\.pdf/);
  assert.match(cand, /apagado na limpeza/);
});

test("#13 limpar age na raiz chamado de outra pasta", () => {
  const raiz = comArquivosAntigos(novoProjeto());
  assert.match(rodar(raiz, LIMPAR, [], { cwd: tmpdir() }).saida, /fechada-dev/);
});

// ---------- vistos ----------
const VISTOS = "linkedin-vagas-posts/scripts/vistos.mjs";

test("vistos filtra o que já foi visto e marca vaga, chamado de outra pasta (#13)", () => {
  const raiz = novoProjeto();
  const feed = join(raiz, "feed.json");
  const novos = join(raiz, "novos.json");
  writeFileSync(feed, JSON.stringify([
    { i: 1, link: "https://l/a?x=1", texto: "Estamos contratando dev" },
    { i: 2, link: "https://l/b", texto: "Bom dia" },
  ]));
  writeFileSync(join(raiz, "vagas/posts-vistos.json"), JSON.stringify([{ id: "https://l/b", data: "2026-01-01" }]));
  const r = rodar(raiz, VISTOS, ["filtrar", feed, novos], { cwd: tmpdir() });
  assert.match(r.saida, /lidos 2, novos 1/);
  assert.match(r.saida, /#1 \[VAGA\?\]/);
  rodar(raiz, VISTOS, ["marcar", novos, "2026-02-02", "1"], { cwd: tmpdir() });
  const vistos = JSON.parse(readFileSync(join(raiz, "vagas/posts-vistos.json"), "utf8"));
  assert.deepEqual(vistos.at(-1), { id: "https://l/a", data: "2026-02-02", vaga: true });
});

// ---------- verificar-setup ----------
const VERIFICAR = "verificar-setup/scripts/verificar.mjs";
const itens = (raiz) => JSON.parse(rodar(raiz, VERIFICAR, ["--json"], { cwd: tmpdir() }).saida);
const status = (lista, item) => lista.find((x) => x.item === item)?.status;

test("#8 aceita perfil.yaml sem aspas e com lista inline", () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, "curriculo/perfil.yaml"), `dados_pessoais:
  nome: Maria
  email: m@x.com
experiencias:
  - empresa: Acme
skills:
  tecnicas: ["React", "Vue", 'Node', CSS, HTML]
`);
  const r = itens(raiz);
  assert.equal(status(r, "Nome e e-mail"), "ok");
  assert.equal(status(r, "Experiências"), "ok");
  assert.equal(status(r, "Skills técnicas"), "ok");
});

test("#8 campo vazio, com aspas ou só comentário continua vazio", () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, "curriculo/perfil.yaml"), `dados_pessoais:
  nome: ""
  email: # preencher
experiencias:
  - empresa: ""
skills:
  tecnicas: []
`);
  const r = itens(raiz);
  assert.equal(status(r, "Nome e e-mail"), "erro");
  assert.equal(status(r, "Experiências"), "erro");
  assert.equal(r.find((x) => x.item === "Skills técnicas").detalhe, "0");
});

test("#2 #15 privacidade: as regras do .gitignore cobrem os dados sensíveis, e o exemplo fica de fora", () => {
  for (const caminho of ["curriculo/perfil.yaml", "curriculo/perfil.novo.yaml", "curriculo/historico/x.pdf", "config/assinatura.html", ".env", "vagas/x.json"]) {
    assert.ok(execFileSync("git", ["check-ignore", caminho], { cwd: PROJETO, encoding: "utf8" }).trim(), caminho);
  }
  const ignorado = spawnSync("git", ["check-ignore", "curriculo/perfil.example.yaml"], { cwd: PROJETO });
  assert.equal(ignorado.status, 1);
});

test("#5 package.json declara Node 20", () => {
  assert.equal(JSON.parse(readFileSync(join(PROJETO, "package.json"), "utf8")).engines.node, ">=20");
});

// ---------- github-perfil ----------
// Troca o fetch global por um falso: sem rede, e o README responde 500.
const fetchFalso = `data:text/javascript,${encodeURIComponent(`
globalThis.fetch = async (url) => {
  const r = (status, corpo) => new Response(corpo, { status });
  if (url === "https://github.com/maria") return r(500, "");
  if (url.endsWith("/users/maria")) return r(200, JSON.stringify({ login: "maria" }));
  if (url.includes("/users/maria/repos")) return r(200, JSON.stringify([{ name: "app" }, { name: "sem" }]));
  if (url.endsWith("/languages")) return r(200, "{}");
  if (url.endsWith("/repos/maria/app/readme")) return r(500, "");
  return r(404, "");
};
`)}`;

test("#14 separa README com erro de README inexistente e avisa dos fixados", () => {
  const raiz = novoProjeto();
  const r = spawnSync(process.execPath, ["--import", fetchFalso, join(raiz, ".claude/skills/github-importar-perfil/scripts/github-perfil.mjs"), "maria"], {
    cwd: raiz, env: ambiente, encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const { avisos } = JSON.parse(r.stdout);
  assert.equal(avisos.length, 2);
  assert.ok(avisos.some((a) => /README de app .*HTTP 500/.test(a)));
  assert.ok(avisos.some((a) => /fixados \(HTTP 500\)/.test(a)));
});

// ---------- html-to-pdf ----------
const verdadeiro = process.platform === "win32" ? "C:\\Program Files\\Git\\usr\\bin\\true.exe" : "/bin/true";

test("#7 navegador que não grava não conta como sucesso, e o PDF antigo fica", { skip: !existsSync(verdadeiro) }, () => {
  const raiz = novoProjeto();
  writeFileSync(join(raiz, "a.html"), "<p>");
  writeFileSync(join(raiz, "o.pdf"), "velho");
  const r = rodar(raiz, "gerar-curriculo/scripts/html-to-pdf.mjs", ["a.html", "o.pdf"], { env: { CHROME_PATH: verdadeiro } });
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /não foi gerado/);
  assert.equal(readFileSync(join(raiz, "o.pdf"), "utf8"), "velho");
});
