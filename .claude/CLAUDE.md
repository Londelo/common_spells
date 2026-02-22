# Common Spells - Claude Project Instructions

## Project Overview

**Common Spells** is a TypeScript CLI toolkit providing "magical" command-line utilities (spells) for Git operations, GitLab integration, and development workflows. It uses a wizard/magic theme and strict functional programming patterns.

**Key Characteristics:**
- Functional programming enforced via ESLint (no mutations, no loops, no classes)
- TypeScript compiled to CommonJS via Babel
- Interactive CLI using Inquirer prompts
- GitLab integration via `glab` CLI
- Shell command execution via ShellJS

---

## Technology Stack

### Core Technologies
- **TypeScript** (ES6 target, CommonJS modules)
- **Node.js** (v20+)
- **ShellJS** - Shell command execution wrapper
- **Inquirer** - Interactive CLI prompts
- **Colors** - Terminal text styling

### Build Pipeline
- **Babel** - TypeScript transpilation to CommonJS
  - `@babel/preset-typescript`
  - `@babel/preset-env`
  - Plugins: object-rest-spread, do-expressions, transform-runtime
- **TypeScript** - Type checking only (`tsc --noEmit`)

### Code Quality Tools
- **ESLint** - Strict functional programming enforcement
  - `eslint-plugin-fp` enforcing immutability
  - Max complexity: 6, max depth: 2, max lines: 200
  - No loops, no classes, no mutations
- **Prettier** - Code formatting (120 char width, single quotes)

---

## Project Structure

```
common_spells/
├── src/
│   ├── spells/              # CLI command implementations
│   │   ├── git/             # Git operations (commit, branch, switch, pull, fpush)
│   │   ├── gitlab/          # GitLab integrations (comments, diffs, release, vars)
│   │   ├── tm/              # Ticketmaster-specific commands
│   │   ├── help.ts          # Main help documentation
│   │   ├── install.ts       # Smart npm/yarn installer
│   │   └── quickNavSetup.ts # (placeholder - empty)
│   └── shared/              # Utility modules
│       ├── git/             # Git helper functions
│       │   ├── getBranchDetails.ts    # Branch metadata extraction
│       │   ├── getDefaultBranch.ts    # Find default branch
│       │   └── getBranchNames.ts      # List branches
│       ├── glab/            # GitLab helper functions
│       │   └── getGlabMergeRequest.ts # Fetch MR data
│       ├── shell.ts         # Command execution wrapper
│       ├── selectors.ts     # Git info extraction
│       ├── errorHandlerWrapper.ts  # Error handling pattern
│       └── (various utils)
├── dist/                    # Compiled output (git-ignored)
├── node_modules/
├── package.json             # 20 CLI commands mapped to bin entries
├── tsconfig.json            # TypeScript config
├── babel.config.json        # Babel transpilation config
└── .eslintrc.json          # ESLint functional rules
```

---

## Build and Development

### Build Commands

```bash
# Full local rebuild and install
npm run local:install

# Individual steps
npm run clean         # Remove dist/ directory
npm run build         # Babel transpile src/ → dist/
npm run link          # npm link for global CLI access
npm run unlink        # Remove global link
npm run permissions   # chmod +x dist/**/*
```

### Development Workflow

1. **Make changes** in `src/`
2. **Build**: `npm run build`
3. **Link**: `npm run link` (or use `npm run local:install`)
4. **Test**: Run commands globally (e.g., `spells`, `commit`, `branch`)
5. **Iterate**: Repeat as needed

### Type Checking

TypeScript is used for type checking only (not transpilation):
```bash
tsc --noEmit  # Check types without emitting files
```

---

## Code Conventions

### Functional Programming Rules

**MUST FOLLOW** (enforced by ESLint):

1. **No mutations** - Use spread/map/filter instead of push/splice/modify
   ```typescript
   // ❌ BAD
   const arr = [1, 2, 3];
   arr.push(4);

   // ✅ GOOD
   const arr = [1, 2, 3];
   const newArr = [...arr, 4];
   ```

2. **No loops** - Use array methods (map/reduce/filter/forEach)
   ```typescript
   // ❌ BAD
   for (let i = 0; i < items.length; i++) {
       console.log(items[i]);
   }

   // ✅ GOOD
   items.forEach(item => console.log(item));
   ```

3. **No classes** - Use functions and closures
   ```typescript
   // ❌ BAD
   class GitHelper {
       getBranch() { ... }
   }

   // ✅ GOOD
   const getBranch = () => { ... };
   ```

4. **Arrow functions preferred** - Except when named function needed
   ```typescript
   // ✅ GOOD
   const execute = async (command) => { ... };

   // ✅ ALSO GOOD (top-level named)
   async function mainCommand() { ... }
   ```

5. **Complexity limits**:
   - Max cyclomatic complexity: 6
   - Max nested callbacks: 2
   - Max lines per function: 200

### TypeScript Patterns

- **Type inference preferred** - Let TypeScript infer when obvious
- **Explicit types** for function parameters and returns
- **CommonJS modules** - Use `require()` and `module.exports` patterns
- **Async/await** - All shell commands are async

### Naming Conventions

- **Commands**: Imperative verbs (`commit`, `switch`, `branch`)
- **Files**: camelCase (`fullCommit.ts`, `getBranchDetails.ts`)
- **Functions**: camelCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### File Structure Pattern

Every CLI command follows this pattern:

```typescript
#!/usr/bin/env node

import { errorHandlerWrapper } from '../shared/errorHandlerWrapper';
import { execute } from '../shared/shell';
// ... other imports

const mainFunction = async () => {
    // Command implementation
    const result = await execute('git status');
    console.log(result);
};

const errorMessage = 'Error in command name';

(async () => await errorHandlerWrapper(mainFunction, errorMessage))();
```

### Error Handling

All commands MUST be wrapped in `errorHandlerWrapper`:
- Catches all errors
- Displays colored error messages
- Exits gracefully on user cancellation (SIGINT)
- Uses consistent error formatting

```typescript
const errorMessage = 'Clear description of what failed';
(async () => await errorHandlerWrapper(mainFunction, errorMessage))();
```

---

## Adding New Commands (Spells)

### Step 1: Create Command File

Create `src/spells/yourCommand.ts`:

```typescript
#!/usr/bin/env node

import { errorHandlerWrapper } from '../shared/errorHandlerWrapper';
import { execute } from '../shared/shell';
import colors from 'colors';

const mainFunction = async () => {
    console.log(colors.cyan('Your command is running...'));

    // Your logic here
    const result = await execute('your shell command');

    console.log(colors.green('✓ Success!'));
};

const errorMessage = 'Error in yourCommand';

(async () => await errorHandlerWrapper(mainFunction, errorMessage))();
```

### Step 2: Add to package.json

Add bin entry in `package.json`:

```json
{
  "bin": {
    "yourcommand": "./dist/spells/yourCommand.js"
  }
}
```

### Step 3: Document in Help

Add command to `src/spells/help.ts` documentation.

### Step 4: Build and Test

```bash
npm run local:install  # Rebuild and link
yourcommand            # Test the command
```

---

## Key Utilities and Patterns

### Shell Execution

Use the `execute()` wrapper from `shared/shell.ts`:

```typescript
import { execute } from '../shared/shell';

// Basic execution
const result = await execute('git status');

// Verbose output
const result = await execute('git log', { verbose: true });
```

**Features:**
- Promise-based async execution
- Silent by default (captures output)
- Verbose mode for live output
- Throws on command failure
- Returns stdout as string

### Interactive Prompts

Use Inquirer for user input:

```typescript
import inquirer from 'inquirer';

const { selection } = await inquirer.prompt([
    {
        type: 'list',
        name: 'selection',
        message: 'Choose an option:',
        choices: ['Option 1', 'Option 2', 'Cancel'],
    },
]);

if (selection === 'Cancel') {
    console.log(colors.yellow('Cancelled'));
    return;
}
```

### Git Operations

Common git helpers in `src/shared/git/`:

- `getBranchDetails()` - Get branch metadata (stale status, last commit)
- `getDefaultBranch()` - Find main/master/default branch
- `getBranchNames()` - List all branches
- `getCurrentBranch()` - Get active branch name

### GitLab Integration

Requires `glab` CLI installed. Common pattern:

```typescript
import { getGlabMergeRequest } from '../shared/glab/getGlabMergeRequest';

const mrData = await getGlabMergeRequest();
const mrNumber = mrData.number;

// Fetch via glab API
const result = await execute(`glab api "/projects/${projectId}/merge_requests/${mrNumber}/notes"`);
const data = JSON.parse(result);
```

### Branch Name Handling

Branches are prefixed to commit messages in uppercase:

```typescript
import { getCurrentBranch } from '../shared/selectors';

const branch = getCurrentBranch();
const prefix = branch.toUpperCase();
const message = `${prefix}: ${userMessage || 'small change'}`;

await execute(`git commit -m "${message}"`);
```

### Colored Output

Use `colors` package for terminal formatting:

```typescript
import colors from 'colors';

console.log(colors.cyan('Info message'));
console.log(colors.green('✓ Success message'));
console.log(colors.yellow('⚠ Warning message'));
console.log(colors.red('✗ Error message'));
```

---

## External Dependencies

### Required External Tools

Commands may require these tools installed:

1. **Git** - All git commands
2. **glab** - GitLab CLI (for gitlab/* commands)
3. **pbcopy** - macOS clipboard (for copy features)

### Checking for External Tools

When adding commands that depend on external tools:

```typescript
const checkGlab = async () => {
    try {
        await execute('which glab');
    } catch {
        throw new Error('glab CLI not found. Install: brew install glab');
    }
};
```

---

## Testing

### Running Tests

```bash
npm test  # Run Jest tests
```

### Test Patterns

When writing tests (if needed):
- Use Jest framework
- Test utility functions in isolation
- Mock shell execution for commands
- Follow functional testing patterns

---

## Common Tasks

### Adding a New Git Command

1. Create `src/spells/git/yourCommand.ts`
2. Use `execute()` for git operations
3. Wrap in `errorHandlerWrapper`
4. Add to package.json bin
5. Document in help.ts
6. Run `npm run local:install`

### Adding a New GitLab Command

1. Create `src/spells/gitlab/yourCommand.ts`
2. Check for `glab` CLI availability
3. Use `glab api` for GitLab API calls
4. Parse JSON responses
5. Follow same build/link process

### Modifying Shared Utilities

1. Edit files in `src/shared/`
2. Maintain functional programming patterns
3. Keep functions pure (no side effects when possible)
4. Export named functions
5. Rebuild to propagate changes

### Debugging

1. Add `console.log()` statements (temporary)
2. Use verbose mode: `execute('command', { verbose: true })`
3. Check compiled output in `dist/` if needed
4. Run commands with `node dist/spells/yourCommand.js` directly

---

## Architecture Decisions

### Why Babel Instead of tsc?

- Babel provides faster transpilation
- Allows advanced JS transforms (do-expressions, etc.)
- TypeScript used only for type checking
- CommonJS output required for CLI shebangs

### Why CommonJS Instead of ESM?

- Better compatibility with CLI tooling
- Node.js shebang support more stable
- Existing ecosystem expectations
- ShellJS and other deps use CommonJS

### Why Functional Programming?

- Reduces bugs through immutability
- Easier to reason about code flow
- Better composability
- Enforced consistency across codebase

### Why ShellJS?

- Cross-platform shell commands
- Promise-based async support
- Better error handling than child_process
- Simpler API for common operations

---

## Troubleshooting

### Command Not Found After Build

```bash
npm run unlink
npm run local:install
```

### ESLint Errors

Common violations:
- **Mutation**: Use spread operator instead of push/splice
- **Loops**: Use map/filter/reduce instead of for loops
- **Complexity**: Break functions into smaller pieces
- **Max lines**: Extract logic into helper functions

### Build Errors

```bash
# Clean rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### TypeScript Errors

```bash
tsc --noEmit  # Check types without building
```

---

## Project-Specific Notes

### Wizard/Magic Theme

- Commands are called "spells"
- Force push is "FUS-RO-DAH" (Skyrim reference)
- Use mystical/magical terminology in docs
- Keep the theme fun but professional

### AI Integration

Several commands output with `#codebase` tags for LLM consumption:
- `comments` - Copies MR comments to clipboard
- `diffs` - Copies MR diffs to clipboard

Format:
```
#codebase
#file: path/to/file
... content ...
```

### Ticketmaster-Specific Commands

`src/spells/tm/` contains organization-specific tooling. These may:
- Access internal APIs
- Use specific workflows
- Require VPN/internal network access

### Docker Sandbox Commands (ds-*)

Docker Sandbox commands allow running Claude Code in isolated Docker containers.

**Testing Docker Sandbox Commands:**

1. **First, build and link the project:**
   ```bash
   npm run local:install
   ```

2. **Then run any ds-* command:**
   ```bash
   ds-setup              # Validate environment and build Docker template
   ds-run <workspace>    # Run Claude Code in a Docker sandbox
   ds-status             # Show running sandboxes
   ds-connect [name]     # Connect to a running sandbox
   ds-cleanup [--all]    # Remove sandboxes
   ds-open               # Open ~/.dockerSandbox in VS Code
   ```

**Prerequisites:**
- Docker Desktop v29+ (with sandbox support)
- TechPass v5.3.0+ (for Bedrock authentication)
- AWS credentials configured

**Key Files:**
- `src/spells/dockerSandbox/` - CLI command entry points
- `src/shared/dockerSandbox/` - Shared utilities and types
- `src/shared/dockerSandbox/setup/` - Setup logic and Dockerfile generation

---

## When Modifying This Project

### DO:
✅ Follow functional programming patterns strictly
✅ Use `execute()` for all shell commands
✅ Wrap commands in `errorHandlerWrapper`
✅ Add colored output for better UX
✅ Document new commands in help.ts
✅ Test locally before committing
✅ Keep functions small (< 200 lines)
✅ Use descriptive variable names
✅ Add type annotations for clarity

### DON'T:
❌ Use mutations or loops
❌ Create classes
❌ Exceed complexity limits (6)
❌ Hardcode project-specific values
❌ Add dependencies without consideration
❌ Skip error handling
❌ Forget to rebuild after changes
❌ Use synchronous shell execution

---

## Quick Reference

### Build & Install
```bash
npm run local:install    # Full rebuild + link
```

### Key Files
- `src/spells/help.ts` - Command documentation
- `src/shared/shell.ts` - Shell execution
- `src/shared/errorHandlerWrapper.ts` - Error handling
- `package.json` - Command mappings

### Adding Commands
1. Create `src/spells/yourCommand.ts`
2. Add to `package.json` bin
3. Update `src/spells/help.ts`
4. Run `npm run local:install`

---

## Questions or Issues?

When encountering problems:
1. Check this document first
2. Review similar existing commands
3. Verify external tools are installed
4. Check ESLint output for violations
5. Rebuild and relink
6. Test incrementally

**Remember**: This project prioritizes functional programming patterns and immutability above all else. When in doubt, favor pure functions and immutable data structures.
