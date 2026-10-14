#!/usr/bin/env node
/**
 * Converte um arquivo HTML em PDF usando o Chrome/Edge já instalado na máquina,
 * via `--headless --print-to-pdf`. Não depende de nenhum pacote npm.
 *
 * Uso:
 *   node html-to-pdf.mjs <entrada.html> <saida.pdf>
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CANDIDATE_BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser() {
  for (const path of CANDIDATE_BROWSERS) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    "Não encontrei Chrome nem Edge instalado nos caminhos padrão. " +
      "Edite CANDIDATE_BROWSERS em html-to-pdf.mjs com o caminho correto."
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
