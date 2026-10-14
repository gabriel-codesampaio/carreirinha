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
 *     [--confirm] [--force]
 *
 * --confirm  envia de fato (sem essa flag, é só preview/dry-run)
 * --force    ignora a checagem de duplicidade em vagas/enviados.json
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import "dotenv/config";

function parseArgs(argv) {
  const out = { confirm: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") out.confirm = true;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      out[key] = argv[++i];
    }
  }
  return out;
}

const LOG_PATH = resolve("vagas/enviados.json");

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

async function main() {
  const args = parseArgs(process.argv.slice(2));

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

  console.log("── PREVIEW DO E-MAIL ──────────────────────────────");
  console.log(`De:      ${process.env.EMAIL_FROM || "(EMAIL_FROM não configurado no .env)"}`);
  console.log(`Para:    ${args.to}`);
  console.log(`Assunto: ${args.subject}`);
  console.log(`Anexo:   ${attachmentPath || "(nenhum)"}`);
  console.log("─────────────────────────────────────────────────");
  console.log(bodyText);
  console.log("─────────────────────────────────────────────────");

  if (!args.confirm) {
    console.log("\n[MODO RASCUNHO] Nada foi enviado. Rode de novo com --confirm pra disparar de fato.");
    return;
  }

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

  const { default: nodemailer } = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mail = {
    from: process.env.EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    text: bodyText,
    attachments: attachmentPath ? [{ path: attachmentPath }] : [],
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
  process.exit(1);
});
