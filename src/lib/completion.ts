import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TemplateManager } from './template-manager';

interface CommandSpec {
  options: string[];
  subcommands?: Record<string, CommandSpec>;
}

const PROVIDERS = ['sendgrid', 'mailgun', 'ses', 'mailjet', 'custom'];

const COMMAND_TREE: Record<string, CommandSpec> = {
  send: {
    options: [
      '--to',
      '--subject',
      '--body',
      '--from',
      '--cc',
      '--bcc',
      '--html',
      '--body-html',
      '--template',
      '--var',
      '--data',
      '--schedule',
      '--sanitize',
      '--attach',
      '--json',
      '--dry-run',
    ],
  },
  read: { options: ['--json'] },
  inbox: {
    options: ['--json'],
    subcommands: {
      list: { options: ['--json', '--limit', '--since', '--unread'] },
      search: { options: ['--json', '--limit', '--query'] },
      serve: { options: ['--host', '--port', '--path'] },
    },
  },
  config: {
    options: ['--json'],
    subcommands: {
      init: { options: ['--json'] },
      show: { options: ['--json'] },
      set: { options: ['--json'] },
      get: { options: ['--json'] },
      path: { options: ['--json'] },
      validate: { options: ['--json'] },
    },
  },
  template: {
    options: ['--json'],
    subcommands: {
      create: { options: ['--subject', '--body', '--html', '--body-file', '--html-file'] },
      list: { options: ['--json'] },
      show: { options: ['--json'] },
      delete: { options: ['--json', '--yes'] },
      edit: { options: ['--json'] },
    },
  },
  delete: { options: ['--json'] },
  search: { options: ['--json', '--limit', '--since'] },
  health: { options: ['--json'] },
  'send-batch': { options: ['--file', '--concurrency', '--metrics-output', '--json'] },
  scheduler: {
    options: ['--json'],
    subcommands: {
      start: { options: ['--json'] },
      list: { options: ['--json', '--limit'] },
      cancel: { options: ['--json'] },
    },
  },
  webhook: {
    options: ['--json'],
    subcommands: {
      serve: { options: ['--host', '--port', '--path', '--json'] },
      register: { options: ['--url', '--secret', '--json'] },
      list: { options: ['--json'] },
      unregister: { options: ['--id', '--json'] },
      test: { options: ['--json'] },
      logs: { options: ['--json'] },
      replay: { options: ['--json'] },
    },
  },
  metrics: {
    options: ['--json'],
    subcommands: {
      serve: { options: ['--port', '--json'] },
    },
  },
  inspect: { options: ['--json'] },
  keys: {
    options: ['--json'],
    subcommands: {
      list: { options: ['--json'] },
      create: { options: ['--json'] },
      rotate: { options: ['--json'] },
      revoke: { options: ['--json'] },
      export: { options: ['--json'] },
      audit: { options: ['--json'] },
    },
  },
  admin: {
    options: ['--json'],
    subcommands: {
      serve: { options: ['--port', '--host', '--json'] },
    },
  },
  campaign: {
    options: ['--json'],
    subcommands: {
      send: {
        options: ['--template', '--recipients', '--name', '--batch-size', '--delay', '--json'],
      },
      status: { options: ['--json'] },
      list: { options: ['--json', '--limit'] },
      cancel: { options: ['--json'] },
      report: { options: ['--json', '--export-csv'] },
    },
  },
  'security-scan': { options: ['--json'] },
  completion: {
    options: [],
    subcommands: {
      bash: { options: [] },
      zsh: { options: [] },
      fish: { options: [] },
      powershell: { options: [] },
      install: { options: [] },
    },
  },
};

async function readRecentEmails(): Promise<string[]> {
  const file = path.join(os.homedir(), '.mailgoat', 'recent-emails.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function readTemplateNames(): Promise<string[]> {
  try {
    const manager = new TemplateManager();
    const templates = await manager.list();
    return templates.map((t) => t.name);
  } catch {
    return [];
  }
}

async function readQueueIds(): Promise<string[]> {
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = path.join(os.homedir(), '.mailgoat', 'scheduler.db');
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT id FROM scheduled_emails WHERE status = 'pending' ORDER BY scheduled_for ASC LIMIT 50`
      )
      .all() as Array<{ id: number }>;
    db.close();
    return rows.map((r) => String(r.id));
  } catch {
    return [];
  }
}

function resolveCommandPath(words: string[]): { top?: string; sub?: string } {
  const top = words.find((w) => COMMAND_TREE[w]);
  if (!top) return {};

  const topIndex = words.indexOf(top);
  const next = words[topIndex + 1];
  const sub = next && COMMAND_TREE[top].subcommands?.[next] ? next : undefined;

  return { top, sub };
}

function filterByCurrentToken(items: string[], current: string): string[] {
  if (!current) return items;
  return items.filter((item) => item.startsWith(current));
}

export async function getCompletionSuggestions(words: string[], cword: number): Promise<string[]> {
  const current = words[cword] || '';
  const prev = cword > 0 ? words[cword - 1] : '';

  // command name
  if (words.length === 0 || (words.length === 1 && cword === 0)) {
    return filterByCurrentToken(Object.keys(COMMAND_TREE), current);
  }

  const { top, sub } = resolveCommandPath(words);
  if (!top) {
    return filterByCurrentToken(Object.keys(COMMAND_TREE), current);
  }

  const spec = sub ? COMMAND_TREE[top].subcommands?.[sub] : COMMAND_TREE[top];

  // Dynamic suggestions by option context.
  if (prev === '--to' || prev === '--cc' || prev === '--bcc' || prev === '--from') {
    return filterByCurrentToken(await readRecentEmails(), current);
  }

  if (prev === '--template') {
    return filterByCurrentToken(await readTemplateNames(), current);
  }

  if (
    (top === 'scheduler' && sub === 'cancel') ||
    (top === 'campaign' && (sub === 'status' || sub === 'cancel' || sub === 'report'))
  ) {
    return filterByCurrentToken(await readQueueIds(), current);
  }

  if (top === 'relay' || prev === 'config') {
    return filterByCurrentToken(PROVIDERS, current);
  }

  // File path hints.
  if (
    prev === '--attach' ||
    prev === '--data' ||
    prev === '--body-html' ||
    prev === '--template' ||
    prev === '--recipients' ||
    prev === '--export-csv'
  ) {
    return filterByCurrentToken(['./'], current);
  }

  // Option or subcommand suggestions.
  if (current.startsWith('-')) {
    return filterByCurrentToken(spec?.options || [], current);
  }

  if (!sub && COMMAND_TREE[top].subcommands) {
    return filterByCurrentToken(Object.keys(COMMAND_TREE[top].subcommands || {}), current);
  }

  return [];
}

export function getBashCompletionScript(): string {
  return `# mailgoat bash completion
_mailgoat_complete() {
  local IFS=$'\\n'
  local cword=\"$COMP_CWORD\"
  local words=(\"\${COMP_WORDS[@]}\")
  COMPREPLY=( $( COMP_CWORD=$cword mailgoat __complete bash \"\${words[@]:1}\" ) )
}
complete -F _mailgoat_complete mailgoat
`;
}

export function getZshCompletionScript(): string {
  return `#compdef mailgoat
_mailgoat_complete() {
  local -a suggestions
  suggestions=(\"\${(@f)\$(COMP_CWORD=$CURRENT mailgoat __complete zsh \"\${words[@]:1}\")}\")
  _describe 'values' suggestions
}
compdef _mailgoat_complete mailgoat
`;
}

export function getFishCompletionScript(): string {
  return `function __mailgoat_complete
  set -l cword (count (commandline -opc))
  mailgoat __complete fish (commandline -opc | tail -n +2)
end
complete -c mailgoat -f -a '(__mailgoat_complete)'
`;
}

export function getPowerShellCompletionScript(): string {
  return `Register-ArgumentCompleter -CommandName mailgoat -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)
  $tokens = $commandAst.CommandElements | Select-Object -Skip 1 | ForEach-Object { $_.ToString() }
  $env:COMP_CWORD = $tokens.Count
  mailgoat __complete powershell @tokens | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`;
}

export async function installCompletion(shell?: string): Promise<{ shell: string; path: string }> {
  const inferred = shell || (process.env.SHELL?.includes('zsh') ? 'zsh' : 'bash');
  const home = os.homedir();

  if (inferred === 'bash') {
    const outPath = path.join(
      home,
      '.local',
      'share',
      'bash-completion',
      'completions',
      'mailgoat'
    );
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, getBashCompletionScript(), 'utf8');
    return { shell: 'bash', path: outPath };
  }

  if (inferred === 'zsh') {
    const outPath = path.join(home, '.zsh', 'completions', '_mailgoat');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, getZshCompletionScript(), 'utf8');
    return { shell: 'zsh', path: outPath };
  }

  if (inferred === 'fish') {
    const outPath = path.join(home, '.config', 'fish', 'completions', 'mailgoat.fish');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, getFishCompletionScript(), 'utf8');
    return { shell: 'fish', path: outPath };
  }

  if (inferred === 'powershell') {
    const docsPath = path.join(home, 'Documents', 'PowerShell', 'mailgoat-completion.ps1');
    await fs.mkdir(path.dirname(docsPath), { recursive: true });
    await fs.writeFile(docsPath, getPowerShellCompletionScript(), 'utf8');
    return { shell: 'powershell', path: docsPath };
  }

  throw new Error(`Unsupported shell: ${inferred}`);
}
