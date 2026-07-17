# Common Spells - Claude Project Instructions

## Summary
common_spells is a TypeScript CLI toolkit that provides "magical" command-line utilities (spells) for Git operations, GitLab integrations, and development workflow shortcuts. Commands are installed globally via `npm link` and invoked as shell aliases (e.g., `commit`, `fpush`, `switch`, `Klaude`).

## Key Dependencies
- **shelljs** — cross-platform shell command execution
- **inquirer** — interactive CLI prompts (lists, inputs, confirms)
- **colors** — terminal text styling
- **glab** (external) — GitLab CLI, required for gitlab/* commands (comments, diffs, vars, release)
- **claude** (external) — Claude Code CLI, used by Klaude/calcifer/llaude commands
- **pbcopy** (external) — macOS clipboard, used by copyToClipboard

## File Structure
```
src/
  spells/           # CLI command implementations
    git/            # Git operations (fullCommit, createBranch, checkout, forcePush, fullUpdate)
    gitlab/         # GitLab integrations (getComments, getDiff, getVariable, createRelease)
    tm/             # Ticketmaster-specific commands (testFeature)
    claude/         # Claude session launchers (opus-danger, calcifer)
    help.ts         # Main help/docs (spells command)
    install.ts      # Smart npm/yarn installer (nstall)
    repos.ts        # Shell alias manager for repo navigation
  shared/           # Utility modules
    shell.ts        # Shell execution wrapper (execute)
    selectors.ts    # Git info extraction (current branch, default branch)
    colors.ts       # Terminal color formatting
    errorHandlerWrapper.ts # Error handling pattern (wraps all commands)
    copyToClipboard.ts  # macOS clipboard helper
    inquirer.ts     # Inquirer prompt wrappers (input, confirm, select)
    git/            # Git helpers (fetchAndPull, getBranchDetails)
    glab/           # GitLab helpers (checkForGlab, getMrId, getProjectFullPath, getGitLabMrs)
```

## NPM Scripts
| Script | Description |
|---|---|
| `clean` | Remove dist/ directory |
| `build` | Babel transpile src/ → dist/ (TypeScript) |
| `link` | npm link for global CLI access |
| `unlink` | Remove global link |
| `permissions` | chmod +x on dist scripts |
| `local:install` | Full rebuild + relink (unlink → build → link → permissions) |
| `type-check` | TypeScript type checking (tsc --noEmit) |

## Key Information
- **Build:** Babel transpiles TypeScript to CommonJS (not tsc). Run `npm run local:install` for full rebuild and GLOBALY install.
    - this project only uses npm's testing tool 'npm link'
- **Code style:** Strict functional programming enforced via ESLint — no mutations, no loops, no classes, max complexity 6, max depth 2, max 200 lines per file.
- **All commands** follow the same pattern: `errorHandlerWrapper(mainFunction, errorMessage)`.
- **Shell execution** always goes through `execute()` from shared/shell.ts (silent by default, verbose via options).
- **No environment variables** required. External tool check: `glab` must be installed for gitlab/* commands.
- **No Docker, no Makefile, no ports** — this is a pure Node.js CLI tool.


