#!/usr/bin/env node
/**
 * Converte um arquivo HTML em PDF usando o Chrome/Edge já instalado na máquina,
 * via `--headless --print-to-pdf`. Não depende de nenhum pacote npm.
 *
 * Uso:
 *   node html-to-pdf.mjs <entrada.html> <saida.pdf>
 *
 * Procura Chrome, Edge ou Chromium nos caminhos padrão de Windows, macOS e Linux.
 * Navegador em outro lugar: defina CHROME_PATH (no .env ou no ambiente) com o caminho do executável.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// CHROME_PATH pode vir do .env; dotenv é opcional aqui pra o script seguir sem dependências.
try { await import("dotenv/config"); } catch {}

const execFileAsync = promisify(execFile);

const CANDIDATE_BROWSERS = [
  // Windows
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
  "/snap/bin/chromium",
];

function findBrowser() {
  const doAmbiente = process.env.CHROME_PATH;
  if (doAmbiente) {
    if (existsSync(doAmbiente)) return doAmbiente;
    throw new Error(`CHROME_PATH aponta pra um arquivo que não existe: ${doAmbiente}`);
  }
  for (const path of CANDIDATE_BROWSERS) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    "Não encontrei Chrome, Edge nem Chromium nos caminhos padrão. " +
      "Defina CHROME_PATH com o caminho do executável do navegador."
  );
}

async function main() {
  const [, , inputArg, outputArg] = process.argv;
  if (!inputArg || !outputArg) {
    console.error("Uso: node html-to-pdf.mjs <entrada.html> <saida.pdf>");
    process.exit(1);
  }

  const inputPath = resolve(inputArg);
  const outputPath = resolve(outputArg);

  if (!existsSync(inputPath)) {
    console.error(`Arquivo de entrada não encontrado: ${inputPath}`);
    process.exit(1);
  }

  await mkdir(dirname(outputPath), { recursive: true });

  const browser = findBrowser();
  const fileUrl = pathToFileURL(inputPath).href;

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--no-margins",
    `--print-to-pdf=${outputPath}`,
    "--print-to-pdf-no-header",
    "--no-sandbox",
    fileUrl,
  ];

  await execFileAsync(browser, args, { windowsHide: true });

  if (!existsSync(outputPath)) {
    throw new Error("O Chrome rodou mas o PDF não foi criado. Verifique o HTML de entrada.");
  }

  console.log(`PDF gerado: ${outputPath}`);
}

main().catch((err) => {
  console.error("Falha ao gerar PDF:", err.message);
  process.exit(1);
});
