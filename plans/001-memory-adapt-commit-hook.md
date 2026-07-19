# Ticket: Memory-Adapt Commit Hook

## Problem

CLAUDE.md files across Castle Londelo repos drift as code changes. Manual adaptation is error-prone and easily forgotten.

## Solution

After every commit, automatically adapt the affected repos' CLAUDE.md files by spawning the `memory-adapt` agent as a background task.

## New Behavior

### When the `commit` command runs:

1. Execute the normal commit flow: `git add .`, `git commit -m`, `git push`
2. After the commit succeeds, scan the diff to identify which repos were changed
3. For each affected repo that has a `.claude/CLAUDE.md`, spawn the `memory-adapt` agent in the background via the `claude` CLI
4. The memory-adapt agent will:
   - Check today's git changes in the affected repo
   - Read the existing CLAUDE.md and validate its format
   - If format is correct → incremental update (only change what the diff proves changed)
   - If format is wrong → deep dive / hard overwrite (preserve non-obvious knowledge, discard everything else)
   - Write the updated CLAUDE.md (idempotent — skip if unchanged)

### How the background agent is triggered:

The commit command invokes the `claude` CLI to spawn a background agent:

```bash
claude -p "Run the memory-adapt agent on /path/to/repo" --bg
```

Or use the Claude Code API to spawn a sub-agent that runs the memory-adapt workflow.

### Repo detection:

```bash
# Get changed files from the new commit
git diff-tree --no-commit-id -r --name-only HEAD | \
  grep -vE '^\.claude/CLAUDE\.md$' | \
  sed 's|/.*||' | sort -u
```

This extracts top-level repo paths that were affected by the commit.

### Edge cases:

- **No CLAUDE.md** — skip the repo
- **No changes today** — agent reports "nothing to adapt" and exits
- **Not a git repo** — skip with error message
- **Same repo committed multiple times** — each run is idempotent

## Files to modify:

- `cli/commit.ts` — add the post-commit adaptation step after the normal commit flow

## Implementation notes:

- The adaptation step runs after the commit/push — it does not block the commit
- If adaptation fails, the commit still succeeded — log the error but don't fail
- The memory-adapt agent is defined at `.claudeRootDir/agents/memory-adapt.md`