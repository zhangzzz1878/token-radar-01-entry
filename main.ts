// token-radar-01: the entry point.
//
// One sealed snapshot in, one ranked board out. This file is only the wiring
// between the pieces: it finds the snapshot, hands it to the model in
// lib/model.ts, and writes everything the gate reads into the output
// directory — board.json, data.js, the dashboard and screenshots copies, and
// the dossier the judge reads.
//
//   node main.ts [--input <snapshot.json or its directory>] [--output <dir>]
//
// The input defaults to /input and the output to $MAKEFUN_OUTPUT_DIR, then
// /output. Only the Node standard library is used, so there is nothing to
// install and nothing to build: `node main.ts` runs it as-is.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boardIssue,
  buildRadar,
  dataScript,
  parseSnapshot,
} from './lib/model.ts';
import {
  buildDossier,
} from './vendor/makefun-board.ts';

/** Where the snapshot lives when --input names nothing. */
const DEFAULT_INPUT = '/input';
/** Where the outputs go when neither --output nor the environment names a directory. */
const DEFAULT_OUTPUT = '/output';
/** The dossier's text cap in UTF-8 bytes: the gate's own limit. */
const DOSSIER_TEXT_MAX_BYTES = 65536;
/** The most screenshots the dossier may carry. */
const SCREENSHOT_MAX_COUNT = 4;
/** The most bytes one screenshot may hold. */
const SCREENSHOT_MAX_BYTES = 524288;

/** This file's own directory: the repository root the dashboard and screenshots live in. */
const REPO_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Say why on stderr and leave with `code`; it never returns. */
function die(message: string, code: number): never {
  console.error(message);
  process.exit(code);
}

/**
 * The value of `--name <value>` or `--name=<value>` in the arguments, or
 * undefined when the flag is absent or carries no value. Unknown flags are
 * ignored, so a caller may pass extras without breaking the run.
 */
function flagValue(argv: string[], name: string): string | undefined {
  const flag = `--${name}`;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === flag) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) return next;
      continue;
    }
    if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1);
  }
  return undefined;
}

/**
 * The snapshot file behind `--input`: the path itself when it is a file, or
 * the snapshot.json inside it when it is a directory. A path that names
 * nothing is a usage error, and the run ends with exit code 2.
 */
function resolveSnapshotFile(inputArg: string): string {
  let candidate = inputArg;
  if (fs.existsSync(inputArg) && fs.statSync(inputArg).isDirectory()) {
    candidate = path.join(inputArg, 'snapshot.json');
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    die(`token-radar: no snapshot file at ${candidate}`, 2);
  }
  return candidate;
}

/**
 * Copy a directory tree of plain files, skipping anything whose name starts
 * with a dot, and return how many files landed. Links and other non-files are
 * left behind: the output holds plain files only.
 */
function copyTree(srcDir: string, destDir: string): number {
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copied += copyTree(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
      copied += 1;
    }
  }
  return copied;
}

/** The whole run: read the snapshot, rank it, and write every output. */
function main(): void {
  const argv = process.argv.slice(2);
  const inputArg = flagValue(argv, 'input') ?? DEFAULT_INPUT;
  const outputArg = flagValue(argv, 'output') ?? process.env.MAKEFUN_OUTPUT_DIR ?? DEFAULT_OUTPUT;

  const snapshotPath = resolveSnapshotFile(inputArg);
  const snapshot = parseSnapshot(fs.readFileSync(snapshotPath, 'utf8'));
  const ranked = buildRadar(snapshot);
  const issue = boardIssue(ranked.board, snapshot);
  if (issue !== null) {
    die(`token-radar: the board fails its own checks: ${issue}`, 1);
  }

  fs.mkdirSync(outputArg, { recursive: true });

  const boardText = JSON.stringify({ rows: ranked.board });
  fs.writeFileSync(path.join(outputArg, 'board.json'), boardText + '\n');
  fs.writeFileSync(path.join(outputArg, 'data.js'), dataScript(ranked.radar));

  const dashboardSrc = path.join(REPO_DIR, 'dashboard');
  const screenshotsSrc = path.join(REPO_DIR, 'screenshots');
  let dashboardFiles = 0;
  let screenshotFiles = 0;
  if (fs.existsSync(dashboardSrc)) {
    dashboardFiles = copyTree(dashboardSrc, path.join(outputArg, 'dashboard'));
  }
  if (fs.existsSync(screenshotsSrc)) {
    screenshotFiles = copyTree(screenshotsSrc, path.join(outputArg, 'screenshots'));
  }

  // The dossier is built last: it reads the dashboard and screenshots the run
  // just copied into the output directory, and its text is capped at the
  // gate's limit.
  const dossier = buildDossier(outputArg, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
  });
  fs.writeFileSync(path.join(outputArg, 'dossier.json'), dossier);

  console.log(
    `token-radar: ${ranked.board.length} rows, ${dashboardFiles} dashboard files, ${screenshotFiles} screenshots -> ${outputArg}`,
  );
}

try {
  main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`token-radar: ${message}`);
  process.exit(1);
}
