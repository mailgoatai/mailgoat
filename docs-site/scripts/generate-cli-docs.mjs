import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const commandsDir = path.join(root, 'src', 'commands');
const outDir = path.join(process.cwd(), 'docs', 'cli-reference');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));

const rows = [];
for (const file of files) {
  const name = file.replace(/\.ts$/, '');
  const src = fs.readFileSync(path.join(commandsDir, file), 'utf8');
  const desc = src.match(/\.description\('([^']+)'\)/)?.[1] ?? 'Command reference';
  const options = [...src.matchAll(/\.option\([^,]+,\s*'([^']+)'/g)].map((m) => `- ${m[1]}`).slice(0, 20);
  const args = [...src.matchAll(/\.argument\([^,]+,\s*'([^']+)'/g)].map((m) => `- ${m[1]}`);

  const doc = `---\ntitle: ${name}\n---\n\n${desc}\n\n## Usage\n\n\
\`\`\`bash\nmailgoat ${name} --help\n\`\`\`\n\n${args.length ? `## Arguments\n\n${args.join('\n')}\n\n` : ''}## Common Options\n\n${options.length ? options.join('\n') : '- See --help output'}\n`;

  fs.writeFileSync(path.join(outDir, `${name}.md`), doc);
  rows.push(`- [${name}](./${name})`);
}

fs.writeFileSync(
  path.join(outDir, 'index.md'),
  `---\ntitle: CLI Reference\n---\n\nGenerated from command source files in \`src/commands\`.\n\n${rows.sort().join('\n')}\n`
);
console.log(`Generated ${rows.length} CLI docs.`);
