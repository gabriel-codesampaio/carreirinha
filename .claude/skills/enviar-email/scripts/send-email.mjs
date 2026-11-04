#!/usr/bin/env node
/**
 * Monta e (opcionalmente) envia um e-mail de candidatura, com o currículo em PDF anexado.
 *
 * Por padrão roda em modo RASCUNHO: só imprime o preview, não envia nada.
 * Só envia de verdade com a flag --confirm.
 *
 * Uso:
 *   node send-email.mjs \
 *     --to "recrutador@empresa.com" \
 *     --subject "Candidatura - Dev Backend" \
 *     --body "curriculo/gerados/_email-empresa.txt" \
 *     --attach "curriculo/gerados/empresa-cargo-2026-10-14.pdf" \
 *     [--attach-name "Nome_Sobrenome_Curriculo_Cargo.pdf"] \
 *     [--empresa "Empresa"] [--cliente "Cliente final"] \
 *     [--confirm <hash>] [--force] [--sem-assinatura]
 *
 * --body          só .txt de curriculo/gerados/ (trava contra enviar .env ou outro arquivo como corpo).
 * --attach-name   nome que o anexo tem pra quem recebe (o arquivo em disco não muda). Sem ele, vai o nome do arquivo.
 * --empresa       obrigatório com --confirm. Recusa empresa de "Empresas que ficam fora" (filtro-vagas + perfil.yaml).
 * --cliente       cliente final quando a vaga vem de consultoria (vários separados por vírgula); mesma trava.
 *
 * Cópia oculta: se EMAIL_BCC estiver no .env (um ou mais endereços separados por vírgula), todo envio
 * vai com esses endereços em CCO.
 *
 * Assinatura: se existir config/assinatura.html, o e-mail sai em HTML com ela no fim (imagens com caminho
 * local, relativo a config/, vão embutidas via cid). config/assinatura.txt vai no fim da versão em texto.
 *
 *   node send-email.mjs --testar               # só testa conexão + login no SMTP, não envia nada
 *   node send-email.mjs --testar --enviar-teste # envia um e-mail de teste de EMAIL_FROM pra ele mesmo
 *
 * --confirm <hash>  envia de fato; o hash é o que o preview imprimiu e muda se remetente, destinatário, CCO,
 *                 assunto, corpo ou anexo mudarem (sem essa flag, é só preview/dry-run)
 * --force         ignora a checagem de duplicidade em vagas/enviados.json
 * --sem-assinatura  envia sem a assinatura de config/
 * --testar        confere .env, conexão, TLS e login (transporter.verify), sem enviar
 * --enviar-teste  junto com --testar: manda um e-mail curto pro próprio EMAIL_FROM, pra confirmar
 *                 que o servidor aceita esse remetente (alias/domínio próprio). verify() não cobre isso.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, basename, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import dotenv from "dotenv";

const RAIZ = fileURLToPath(new URL("../../../../", import.meta.url));
dotenv.config({ path: resolve(RAIZ, ".env") });

function parseArgs(argv) {
  const out = { confirm: false, force: false, testar: false, enviarTeste: false, semAssinatura: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") out.confirm = argv[i + 1]?.startsWith("--") ? true : (argv[++i] ?? true);
    else if (a === "--force") out.force = true;
    else if (a === "--sem-assinatura") out.semAssinatura = true;
    else if (a === "--testar") out.testar = true;
    else if (a === "--enviar-teste") out.enviarTeste = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      out[key] = argv[++i];
    }
  }
  return out;
}

const bccConfigurado = () =>
  (process.env.EMAIL_BCC || "").split(",").map((e) => e.trim()).filter(Boolean);

const LOG_PATH = resolve(RAIZ, "vagas/enviados.json");
const CONFIG_DIR = resolve(RAIZ, "config");
const PASTA_GERADOS = resolve(RAIZ, "curriculo/gerados");

// relative(), e não startsWith: no Windows a letra do drive pode vir em caixa diferente.
const dentroDe = (pasta, caminho) => {
  const r = relative(pasta, caminho);
  return Boolean(r) && !r.startsWith("..") && !isAbsolute(r);
};

const normalizar = (t) =>
  t.normalize("NFC").toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const enderecoDe = (t) => normalizar(t.match(/<([^>]+)>/)?.[1] ?? t);

/** Nome comparável: sem caixa, acento, pontuação nem sufixo societário. */
const nomeEmpresa = (t) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(s a|sa|ltda|me|eireli|group|grupo|inc|llc|corp)\b/g, " ")
    .replace(/\s+/g, " ").trim();

const valorYaml = (t) => t.replace(/(^|\s+)#.*$/, "").trim().replace(/^["']|["']$/g, "").trim();

/** Empresas e clientes de experiencias no perfil.yaml + "Outras empresas bloqueadas" do filtro. */
function empresasBloqueadas() {
  const lista = [];
  const perfil = resolve(RAIZ, "curriculo/perfil.yaml");
  if (existsSync(perfil)) {
    // shortcut: lê só "- empresa:" e o bloco "clientes:" com "- nome:"; lista inline não entra, trocar por parser se o schema mudar.
    let indentClientes = null;
    for (const linha of readFileSync(perfil, "utf-8").split(/\r?\n/)) {
      const indent = linha.match(/^\s*/)[0].length;
      if (indentClientes !== null && linha.trim() && indent <= indentClientes) indentClientes = null;
      if (/^\s*clientes:\s*(#.*)?$/.test(linha)) indentClientes = indent;
      const m = linha.match(/^\s*- empresa:\s*(.+)$/) ?? (indentClientes !== null ? linha.match(/^\s*- nome:\s*(.+)$/) : null);
      if (m) lista.push(valorYaml(m[1]));
    }
  }
  const filtro = [resolve(CONFIG_DIR, "filtro-vagas.md"), resolve(CONFIG_DIR, "filtro-vagas.example.md")].find((p) => existsSync(p));
  if (filtro) {
    const secao = readFileSync(filtro, "utf-8").split(/^## Empresas que ficam fora/m)[1]?.split(/^## /m)[0] ?? "";
    for (const m of secao.matchAll(/^- +(.+)$/gm)) lista.push(m[1].trim());
  }
  return [...new Set(lista.filter(Boolean))];
}

/** Recusa se algum nome bate com a lista, inteiro ou como palavras dentro do outro ("Itaú" x "Itaú Unibanco"). */
function checarBloqueio(nomes) {
  const bloqueadas = empresasBloqueadas().map((b) => [b, nomeEmpresa(b)]).filter(([, n]) => n);
  for (const nome of nomes) {
    const n = nomeEmpresa(nome);
    if (!n) continue;
    const achou = bloqueadas.find(([, b]) => ` ${n} `.includes(` ${b} `) || ` ${b} `.includes(` ${n} `));
    if (achou) {
      console.error(
        `Envio recusado: "${nome}" está em "Empresas que ficam fora" (bate com "${achou[0]}").\n` +
          `A lista vem de curriculo/perfil.yaml e de config/filtro-vagas.md. --force não libera este bloqueio.`
      );
      process.exit(1);
    }
  }
}

const escaparHtml = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Monta as versões texto e HTML do e-mail com a assinatura de config/ (se existir).
 * Imagens locais da assinatura viram anexos inline (cid); imagem que não existe é removida.
 */
async function montarCorpo(texto, { semAssinatura = false } = {}) {
  const sigHtmlPath = resolve(CONFIG_DIR, "assinatura.html");
  const sigTxtPath = resolve(CONFIG_DIR, "assinatura.txt");
  if (semAssinatura || !existsSync(sigHtmlPath)) {
    return { text: texto, html: null, inline: [], assinatura: null };
  }

  const inline = [];
  let sigHtml = (await readFile(sigHtmlPath, "utf-8")).replace(/<!--[\s\S]*?-->/g, "");
  sigHtml = sigHtml.replace(/<img\b[^>]*?\bsrc="([^"]+)"[^>]*>/gi, (tag, src) => {
    if (/^(https?:|cid:|data:)/i.test(src)) return tag;
    const caminho = resolve(CONFIG_DIR, src);
    if (!existsSync(caminho)) return "";
    const cid = `assinatura-${inline.length + 1}@carreirinha`;
    inline.push({ filename: src.split(/[\\/]/).pop(), path: caminho, cid });
    return tag.replace(`src="${src}"`, `src="cid:${cid}"`);
  });

  const sigTxt = existsSync(sigTxtPath) ? (await readFile(sigTxtPath, "utf-8")).trim() : "";
  const corpoHtml = escaparHtml(texto.trim()).replace(/\r?\n/g, "<br>");
  const html =
    `<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222222;">` +
    `${corpoHtml}<br><br>${sigHtml.trim()}</div>`;

  return {
    text: sigTxt ? `${texto.trimEnd()}\n\n${sigTxt}\n` : texto,
    html,
    inline,
    assinatura: `config/assinatura.html${inline.length ? ` (+ ${inline.length} imagem embutida)` : ""}`,
  };
}

async function readLog() {
  if (!existsSync(LOG_PATH)) return [];
  // Log ilegível aborta: tratar como vazio desliga a checagem de duplicidade e o próximo envio apagaria o histórico.
  let log;
  try {
    log = JSON.parse((await readFile(LOG_PATH, "utf-8")) || "[]");
  } catch (err) {
    throw new Error(`vagas/enviados.json está ilegível (${err.message}). Conserte o arquivo antes de enviar; nada foi enviado.`);
  }
  if (!Array.isArray(log)) {
    throw new Error("vagas/enviados.json não é uma lista. Conserte o arquivo antes de enviar; nada foi enviado.");
  }
  return log;
}

async function appendLog(entry) {
  await mkdir(dirname(LOG_PATH), { recursive: true });
  const log = await readLog();
  log.push(entry);
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2), "utf-8");
}

function checarEnv() {
  const missingEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"].filter(
    (k) => !process.env[k]
  );
  if (missingEnv.length) {
    console.error(
      `Faltam variáveis no .env: ${missingEnv.join(", ")}.\n` +
        `Copie .env.example para .env e preencha (veja o SKILL.md da enviar-email).`
    );
    process.exit(1);
  }
}

async function criarTransporter() {
  const { default: nodemailer } = await import("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const DICAS = {
  EAUTH:
    "Login recusado. No iCloud: SMTP_USER tem que ser o endereço PRINCIPAL do iCloud Mail (ex.: nome@icloud.com), " +
    "não um alias nem o domínio próprio; SMTP_PASS tem que ser uma senha de app (account.apple.com > Entrar e Segurança > Senhas de app), não a senha do Apple ID.",
  ETLS: "Falha no TLS. Use SMTP_PORT=587 (STARTTLS) ou 465 (SSL).",
  ECONNECTION: "Conexão caiu. Confira SMTP_HOST/SMTP_PORT e a rede.",
  ETIMEDOUT: "Tempo esgotado. Confira SMTP_HOST/SMTP_PORT, firewall ou rede.",
  EDNS: "SMTP_HOST não existe. Confira o endereço do servidor.",
  EENVELOPE:
    "O servidor recusou o remetente/destinatário. No iCloud, EMAIL_FROM precisa ser um endereço da sua conta " +
    "(principal, alias do iCloud ou domínio próprio configurado). Endereços do 'Ocultar Meu E-mail' podem não ser aceitos como remetente.",
  EMESSAGE:
    "O servidor recusou a mensagem. Se EMAIL_FROM for um alias, confira se ele está ativo e habilitado pra envio no iCloud.",
};

async function testar(args) {
  checarEnv();
  const usuario = process.env.SMTP_USER.replace(/^(.{3}).*(@.*)$/, "$1***$2");
  console.log(`Servidor: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`Login:    ${usuario}`);
  console.log(`De:       ${process.env.EMAIL_FROM}`);
  const transporter = await criarTransporter();
  try {
    await transporter.verify();
    console.log("\n✅ Conexão e login OK.");
  } catch (err) {
    console.error(`\n❌ Falhou (${err.code ?? "erro"}): ${err.message}`);
    if (DICAS[err.code]) console.error(`→ ${DICAS[err.code]}`);
    process.exit(1);
  }
  if (!args.enviarTeste) {
    console.log("O login não garante que o servidor aceita o remetente (EMAIL_FROM). Para conferir, rode com --testar --enviar-teste.");
    return;
  }
  const destino = process.env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? process.env.EMAIL_FROM;
  const corpo = await montarCorpo(
    "Se este e-mail chegou, o envio pelo carreirinha está funcionando com este remetente.",
    { semAssinatura: args.semAssinatura }
  );
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: destino,
      subject: "Teste do carreirinha",
      text: corpo.text,
      ...(corpo.html ? { html: corpo.html } : {}),
      attachments: corpo.inline,
    });
    console.log(`✅ E-mail de teste enviado pra ${destino} (messageId: ${info.messageId}). Assinatura: ${corpo.assinatura || "nenhuma"}. Confira a caixa de entrada.`);
  } catch (err) {
    console.error(`❌ Envio de teste falhou (${err.code ?? "erro"}): ${err.message}`);
    if (DICAS[err.code]) console.error(`→ ${DICAS[err.code]}`);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.testar) return testar(args);

  for (const required of ["to", "subject", "body"]) {
    if (!args[required]) {
      console.error(`Faltou --${required}`);
      process.exit(1);
    }
  }

  const bodyPath = resolve(args.body);
  // Só corpo gerado pela skill: impede que um texto de vaga/post convença o agente a mandar o .env como corpo.
  if (!dentroDe(PASTA_GERADOS, bodyPath) || !/\.txt$/i.test(bodyPath)) {
    console.error(`Corpo recusado: só arquivos .txt de curriculo/gerados/ podem ser o corpo do e-mail (${bodyPath}).`);
    process.exit(1);
  }
  if (!existsSync(bodyPath)) {
    console.error(`Arquivo de corpo do e-mail não encontrado: ${bodyPath}`);
    process.exit(1);
  }
  const bodyText = await readFile(bodyPath, "utf-8");

  let attachmentPath = null;
  if (args.attach) {
    attachmentPath = resolve(args.attach);
    // Só currículo gerado: impede que um texto de vaga/post convença o agente a anexar .env ou o perfil.
    if (!dentroDe(PASTA_GERADOS, attachmentPath) || !/\.pdf$/i.test(attachmentPath)) {
      console.error(`Anexo recusado: só PDFs de curriculo/gerados/ podem ser anexados (${attachmentPath}).`);
      process.exit(1);
    }
    if (!existsSync(attachmentPath)) {
      console.error(`Anexo não encontrado: ${attachmentPath}`);
      process.exit(1);
    }
  }

  if (args.confirm && !args.empresa) {
    console.error('Faltou --empresa: o envio confere a empresa da vaga contra "Empresas que ficam fora".');
    process.exit(1);
  }
  checarBloqueio([args.empresa, ...(args.cliente ?? "").split(",")].filter(Boolean));

  // Duplicidade: mesmo destinatário e (mesmo assunto ou mesmo currículo, que é gerado por vaga).
  const log = await readLog();
  const dup = log.find(
    (e) =>
      enderecoDe(e.to) === enderecoDe(args.to) &&
      (normalizar(e.subject) === normalizar(args.subject) ||
        (attachmentPath && e.attachment && basename(e.attachment) === basename(attachmentPath)))
  );
  if (dup && !args.force) {
    console.error(
      `Já existe um envio registrado pra "${dup.to}" com o assunto "${dup.subject}" em ${dup.sentAt}.\n` +
        `Use --force se quiser enviar mesmo assim.`
    );
    process.exit(1);
  }

  const corpo = await montarCorpo(bodyText, { semAssinatura: args.semAssinatura });

  console.log("── PREVIEW DO E-MAIL ──────────────────────────────");
  console.log(`De:         ${process.env.EMAIL_FROM || "(EMAIL_FROM não configurado no .env)"}`);
  console.log(`Para:       ${args.to}`);
  console.log(`Assunto:    ${args.subject}`);
  const bcc = bccConfigurado();
  console.log(`CCO:        ${bcc.length ? bcc.join(", ") : "(nenhum)"}`);
  const attachmentName = args["attach-name"] || (attachmentPath ? basename(attachmentPath) : null);
  console.log(`Anexo:      ${attachmentPath ? `${attachmentName} (${attachmentPath})` : "(nenhum)"}`);
  console.log(`Assinatura: ${corpo.assinatura || "(nenhuma)"}`);
  console.log("─────────────────────────────────────────────────");
  console.log(corpo.text);
  console.log("─────────────────────────────────────────────────");

  const hash = createHash("sha256")
    .update(JSON.stringify([process.env.EMAIL_FROM, args.to, bcc, args.subject, corpo.text, corpo.html, attachmentName]))
    .update(attachmentPath ? await readFile(attachmentPath) : "")
    .digest("hex")
    .slice(0, 12);

  if (!args.confirm) {
    console.log(`\n[MODO RASCUNHO] Nada foi enviado. Depois da aprovação, rode de novo com --confirm ${hash}`);
    return;
  }
  if (args.confirm !== hash) {
    console.error(
      "Envio recusado: --confirm precisa do hash impresso pelo preview deste e-mail. " +
        "Se o conteúdo mudou, mostre o preview novo e peça a aprovação de novo."
    );
    process.exit(1);
  }

  checarEnv();
  const transporter = await criarTransporter();

  const mail = {
    from: process.env.EMAIL_FROM,
    to: args.to,
    ...(bcc.length ? { bcc } : {}),
    subject: args.subject,
    text: corpo.text,
    ...(corpo.html ? { html: corpo.html } : {}),
    attachments: [...corpo.inline, ...(attachmentPath ? [{ path: attachmentPath, filename: attachmentName }] : [])],
  };

  const info = await transporter.sendMail(mail);

  await appendLog({
    to: args.to,
    subject: args.subject,
    ...(bcc.length ? { bcc } : {}),
    attachment: attachmentPath,
    sentAt: new Date().toISOString(),
    messageId: info.messageId,
  });

  console.log(`\nE-mail enviado! messageId: ${info.messageId}`);
}

main().catch((err) => {
  console.error("Falha ao processar/enviar e-mail:", err.message);
  if (DICAS[err.code]) console.error(`→ ${DICAS[err.code]}`);
  process.exit(1);
});
