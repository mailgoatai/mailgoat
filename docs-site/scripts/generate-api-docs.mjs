import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const targets = [
  'src/lib/postal-client.ts',
  'src/lib/config.ts',
  'src/lib/inbox-store.ts',
  'src/lib/template-manager.ts',
  'src/lib/scheduler.ts',
];

const outDir = path.join(process.cwd(), 'docs', 'api-reference');
fs.mkdirSync(outDir, { recursive: true });

const links = [];
for (const rel of targets) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const slug = path.basename(rel, '.ts').replace(/_/g, '-');

  const exports = [...src.matchAll(/^export\s+(?:async\s+)?(?:class|function|const|interface|type)\s+([A-Za-z0-9_]+)/gm)]
    .map((m) => m[1]);

  const body = `---\ntitle: ${slug}\n---\n\nSource: \`${rel}\`\n\n## Exported Symbols\n\n${exports.length ? exports.map((e) => `- \`${e}\``).join('\n') : '- No top-level exports detected'}\n`;

  fs.writeFileSync(path.join(outDir, `${slug}.md`), body);
  links.push(`- [${slug}](./${slug})`);
}

fs.writeFileSync(
  path.join(outDir, 'index.md'),
  `---\ntitle: API Reference\n---\n\nGenerated from selected library modules and JSDoc/export metadata.\n\n${links.join('\n')}\n`
);

fs.writeFileSync(
  path.join(outDir, 'send.md'),
  `---\ntitle: send()\n---\n\nTransactional send is implemented through \`PostalClient\` and command entry points in \`src/commands/send.ts\`.`
);
fs.writeFileSync(
  path.join(outDir, 'inbox-list.md'),
  `---\ntitle: inbox.list()\n---\n\nInbox listing is powered by \`InboxStore.listMessages()\` and command entry point \`src/commands/inbox.ts\`.`
);
fs.writeFileSync(
  path.join(outDir, 'config-load.md'),
  `---\ntitle: config.load()\n---\n\nConfiguration loading is handled by \`ConfigManager.load()\` in \`src/lib/config.ts\`.`
);
console.log(`Generated ${links.length} API docs.`);
