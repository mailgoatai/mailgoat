import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'src');

const NEW_TOP_LEVEL = new Set([
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'shared',
]);

const UPDATE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

type Move = { from: string; to: string };

type Options = {
  apply: boolean;
  verbose: boolean;
};

function parseOptions(): Options {
  const apply = process.argv.includes('--apply');
  const verbose = process.argv.includes('--verbose');
  return { apply, verbose };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function route(relFromSrc: string): string {
  const parts = relFromSrc.split('/');
  if (NEW_TOP_LEVEL.has(parts[0])) return relFromSrc;

  if (parts[0] === 'commands') {
    return ['presentation', 'cli', ...parts.slice(1)].join('/');
  }

  if (parts[0] === 'services') {
    return ['application', 'services', ...parts.slice(1)].join('/');
  }

  if (parts[0] === 'providers') {
    return ['infrastructure', 'providers', ...parts.slice(1)].join('/');
  }

  if (parts[0] === 'infrastructure') {
    if (parts[1] === 'logger.ts' || parts[1] === '__tests__') {
      return ['shared', 'logger', ...parts.slice(1)].join('/');
    }
    return ['infrastructure', ...parts.slice(1)].join('/');
  }

  if (parts[0] === 'lib') {
    const name = parts[parts.length - 1];

    if (parts[1] === 'queue') {
      return ['infrastructure', 'queue', ...parts.slice(2)].join('/');
    }
    if (parts[1] === 'database') {
      return ['infrastructure', 'database', ...parts.slice(2)].join('/');
    }
    if (parts[1] === 'email-testing') {
      return ['application', 'services', 'email-testing', ...parts.slice(2)].join('/');
    }
    if (name.includes('metrics')) {
      return ['infrastructure', 'metrics', ...parts.slice(1)].join('/');
    }
    if (name.includes('cache')) {
      return ['infrastructure', 'cache', ...parts.slice(1)].join('/');
    }
    if (name.includes('queue')) {
      return ['infrastructure', 'queue', ...parts.slice(1)].join('/');
    }

    if (name.includes('template')) {
      return ['domain', 'template', ...parts.slice(1)].join('/');
    }
    if (name.includes('schedule')) {
      return ['domain', 'schedule', ...parts.slice(1)].join('/');
    }
    if (name.includes('webhook')) {
      return ['domain', 'webhook', ...parts.slice(1)].join('/');
    }
    if (
      name.includes('email') ||
      name.includes('postal') ||
      name.includes('inbox') ||
      name.includes('message') ||
      name.includes('attachment')
    ) {
      return ['domain', 'email', ...parts.slice(1)].join('/');
    }

    if (
      name.includes('config') ||
      name.includes('validator') ||
      name.includes('validation') ||
      name.includes('formatter') ||
      name.includes('error') ||
      name.includes('debug') ||
      name.includes('rate') ||
      name.includes('recovery')
    ) {
      return ['shared', 'utils', ...parts.slice(1)].join('/');
    }

    return ['application', 'services', ...parts.slice(1)].join('/');
  }

  if (parts[0] === 'container.ts' || parts[0] === 'index.ts' || parts[0] === 'di-example.ts') {
    return ['application', 'services', ...parts].join('/');
  }

  return relFromSrc;
}

async function ensureDirForFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripExt(p: string): string {
  return p.replace(/\.[^./]+$/, '');
}

async function updateImports(moves: Move[], options: Options): Promise<void> {
  const updateMap = new Map<string, string>();
  for (const move of moves) {
    updateMap.set(toPosix(stripExt(move.from)), toPosix(stripExt(move.to)));
  }

  const allFiles = await walk(SRC_ROOT);
  let changed = 0;

  for (const file of allFiles) {
    const ext = path.extname(file);
    if (!UPDATE_EXTENSIONS.has(ext)) continue;

    const content = await fs.readFile(file, 'utf8');
    let next = content;

    for (const [oldAbsNoExt, newAbsNoExt] of updateMap.entries()) {
      const fromDir = path.dirname(file);
      const oldRel = toPosix(path.relative(fromDir, oldAbsNoExt));
      const newRel = toPosix(path.relative(fromDir, newAbsNoExt));

      const normalizedOld = oldRel.startsWith('.') ? oldRel : `./${oldRel}`;
      const normalizedNew = newRel.startsWith('.') ? newRel : `./${newRel}`;

      const escapedOld = normalizedOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(['"])${escapedOld}(['"])`, 'g'), `$1${normalizedNew}$2`);
    }

    if (next !== content) {
      changed += 1;
      if (options.apply) {
        await fs.writeFile(file, next, 'utf8');
      }
    }
  }

  console.log(`${options.apply ? 'updated' : 'would update'} imports in ${changed} file(s)`);
}

async function main(): Promise<void> {
  const options = parseOptions();
  const all = await walk(SRC_ROOT);

  const moves: Move[] = [];
  for (const file of all) {
    const rel = toPosix(path.relative(SRC_ROOT, file));
    if (rel.endsWith('.gitkeep')) continue;

    const targetRel = route(rel);
    if (targetRel === rel) continue;

    moves.push({
      from: file,
      to: path.join(SRC_ROOT, targetRel),
    });
  }

  const deduped = new Map<string, Move>();
  for (const move of moves) deduped.set(`${move.from}=>${move.to}`, move);
  const finalMoves = [...deduped.values()];

  console.log(`${options.apply ? 'applying' : 'dry-run'} migration for ${finalMoves.length} file(s)`);

  let collisions = 0;
  for (const move of finalMoves) {
    if (await fileExists(move.to)) {
      collisions += 1;
      console.warn(`collision: ${toPosix(path.relative(ROOT, move.to))}`);
      continue;
    }

    if (options.verbose) {
      console.log(`${toPosix(path.relative(ROOT, move.from))} -> ${toPosix(path.relative(ROOT, move.to))}`);
    }

    if (options.apply) {
      await ensureDirForFile(move.to);
      await fs.rename(move.from, move.to);
    }
  }

  console.log(`collisions: ${collisions}`);

  await updateImports(finalMoves, options);

  if (!options.apply) {
    console.log('dry-run complete. Re-run with --apply to perform moves.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
