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
 *     --body "caminho/para/corpo.txt" \
 *     --attach "curriculo/gerados/empresa-cargo-2026-10-14.pdf" \
 *     [--confirm] [--force] [--sem-assinatura]
 *
 * Assinatura: se existir config/assinatura.html, o e-mail sai em HTML com ela no fim (imagens com caminho
 * local, relativo a config/, vão embutidas via cid). config/assinatura.txt vai no fim da versão em texto.
 *
 *   node send-email.mjs --testar               # só testa conexão + login no SMTP, não envia nada
 *   node send-email.mjs --testar --enviar-teste # envia um e-mail de teste de EMAIL_FROM pra ele mesmo
 *
 * --confirm       envia de fato (sem essa flag, é só preview/dry-run)
 * --force         ignora a checagem de duplicidade em vagas/enviados.json
 * --sem-assinatura  envia sem a assinatura de config/
 * --testar        confere .env, conexão, TLS e login (transporter.verify), sem enviar
 * --enviar-teste  junto com --testar: manda um e-mail curto pro próprio EMAIL_FROM, pra confirmar
 *                 que o servidor aceita esse remetente (alias/domínio próprio). verify() não cobre isso.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import "dotenv/config";

function parseArgs(argv) {
  const out = { confirm: false, force: false, testar: false, enviarTeste: false, semAssinatura: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") out.confirm = true;
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

const LOG_PATH = resolve("vagas/enviados.json");
const CONFIG_DIR = resolve("config");

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
    const cid = `assinatura-${inline.length + 1}@carreira-generator`;
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
  try {
    const raw = await readFile(LOG_PATH, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
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
    "Se este e-mail chegou, o envio pelo carreira-generator está funcionando com este remetente.",
    { semAssinatura: args.semAssinatura }
  );
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: destino,
      subject: "Teste do carreira-generator",
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
  if (!existsSync(bodyPath)) {
    console.error(`Arquivo de corpo do e-mail não encontrado: ${bodyPath}`);
    process.exit(1);
  }
  const bodyText = await readFile(bodyPath, "utf-8");

  let attachmentPath = null;
  if (args.attach) {
    attachmentPath = resolve(args.attach);
    if (!existsSync(attachmentPath)) {
      console.error(`Anexo não encontrado: ${attachmentPath}`);
      process.exit(1);
    }
  }

  // Checagem de duplicidade (mesma vaga/destinatário já recebeu candidatura antes)
  const log = await readLog();
  const dup = log.find((e) => e.to === args.to && e.subject === args.subject);
  if (dup && !args.force) {
    console.error(
      `Já existe um envio registrado pra "${args.to}" com o assunto "${args.subject}" em ${dup.sentAt}.\n` +
        `Use --force se quiser enviar mesmo assim.`
    );
    process.exit(1);
  }

  const corpo = await montarCorpo(bodyText, { semAssinatura: args.semAssinatura });

  console.log("── PREVIEW DO E-MAIL ──────────────────────────────");
  console.log(`De:         ${process.env.EMAIL_FROM || "(EMAIL_FROM não configurado no .env)"}`);
  console.log(`Para:       ${args.to}`);
  console.log(`Assunto:    ${args.subject}`);
  console.log(`Anexo:      ${attachmentPath || "(nenhum)"}`);
  console.log(`Assinatura: ${corpo.assinatura || "(nenhuma)"}`);
  console.log("─────────────────────────────────────────────────");
  console.log(corpo.text);
  console.log("─────────────────────────────────────────────────");

  if (!args.confirm) {
    console.log("\n[MODO RASCUNHO] Nada foi enviado. Rode de novo com --confirm pra disparar de fato.");
    return;
  }

  checarEnv();
  const transporter = await criarTransporter();

  const mail = {
    from: process.env.EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    text: corpo.text,
    ...(corpo.html ? { html: corpo.html } : {}),
    attachments: [...corpo.inline, ...(attachmentPath ? [{ path: attachmentPath }] : [])],
  };

  const info = await transporter.sendMail(mail);

  await appendLog({
    to: args.to,
    subject: args.subject,
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
