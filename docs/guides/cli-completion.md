# Guide: CLI Completion

Use shell completion to speed up MailGoat commands and reduce typos.

## Generate Scripts

```bash
mailgoat completion bash > /etc/bash_completion.d/mailgoat
mailgoat completion zsh > ~/.zsh/completions/_mailgoat
mailgoat completion fish > ~/.config/fish/completions/mailgoat.fish
mailgoat completion powershell > ~/Documents/PowerShell/mailgoat-completion.ps1
```

## Auto Install

```bash
mailgoat completion install
mailgoat completion install zsh
mailgoat completion install fish
mailgoat completion install powershell
```

## Dynamic Suggestions

Completion includes:

- Commands, subcommands, and flags
- Template names for `--template`
- Recent addresses for `--to`, `--cc`, `--bcc`, `--from` from `~/.mailgoat/recent-emails.json`
- Pending scheduler queue IDs for cancellation/status flows

## Examples

```bash
mailgoat send --to <TAB>
mailgoat send --template <TAB>
mailgoat scheduler cancel <TAB>
mailgoat campaign status <TAB>
```

## Notes

- Completion is designed to be lightweight and responsive.
- If dynamic sources are unavailable, completion falls back to static suggestions.
