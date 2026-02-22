---
name: document-repos
description: Generates comprehensive AI-queryable documentation for TM repositories using specialized agents.
allowed-tools: Task, Read, Write, Glob, AskUserQuestion, Bash(git remote show origin *), Bash(git checkout *), Bash(git pull *), Bash(rm -rf ~/.vf-docs/*), Bash(mkdir -p ~/.vf-docs/*), Bash(find ~/.vf-docs/*)
user-invocable: true
disable-model-invocation: true
model: sonnet
---

## Overview

This skill analyzes a repository and generates comprehensive documentation that enables AI to answer ANY question about the codebase without accessing the actual code.

## Variables

### Paths
- `docs_base`: `~/.vf-docs`
- `docs_root`: `~/.vf-docs/<custom_repo_name>/`

### Configuration
- `classifications`: service, worker, frontend, library, infrastructure, pipeline

### Runtime (set during Step 1)
- `repo_path`: Absolute path to the repository (e.g., `~/repos/vf-registration-workers`)
- `custom_repo_name`: User-specified documentation name
- `classification`: Repository type from classifications list

## Instructions

### Step 1: Ask Questions

Use AskUserQuestion to gather information (can combine into single call):

**Question 1 - Repository** (`repo_path`): Determine which repo to document
- Check if user provided a path argument, or use current working directory
- If it looks like a valid repo (has `.git/`, `package.json`, etc.), confirm assumption:
  - "Document this repository?" with options: Yes (current path), Other (specify path)
- If unclear, ask user to specify the repo path
- Resolve to absolute path using `~` (e.g., `~/repos/vf-registration-workers`)
- **This value becomes `repo_path`**

**Question 2 - Documentation Name** (`custom_repo_name`): "What name should the docs use for this repo?"
- Display the full repo path for context
- Default suggestion: directory name or git remote name
- Options: Use default name, Custom name
- **This value becomes `custom_repo_name` and determines the output path: `~/.vf-docs/<custom_repo_name>/`**

**Question 3 - Classification** (`classification`): "What type of repository is this?"
- Options: service, worker, frontend, library, infrastructure, pipeline
- **This value becomes `classification`**

### Step 2: Update Repository

Git operations: Checkout and pull latest default branch.
- Navigate to `repo_path` (if fails: ask the user for the correct path)
- Verify `.git` directory exists
- Get default branch: `git remote show origin | grep 'HEAD branch' | awk '{print $NF}'`
- Checkout and pull: `git checkout {default_branch} && git pull origin {default_branch}`

### Step 3: Create Directory Structure

If `docs_root` already exists, delete it completely with Bash.
**Do NOT read or reference existing documentation. Always generate fresh.**

Create the output directory:
```bash
mkdir -p {docs_root}/static {docs_root}/dynamic
```

### Step 4: Spawn Documentation Agents

Launch all documentation agents in parallel. Each agent handles its own conditional logic and will return early if not applicable.

**For each agent, read the prompt file and spawn:**
1. Read agent prompt from file:
   - [explore-architecture.md](agents/explore-architecture.md) - Architecture and structure documentation
   - [explore-dependencies.md](agents/explore-dependencies.md) - External dependencies analysis
   - [explore-infrastructure.md](agents/explore-infrastructure.md) - AWS resources and deployment (conditional)
   - [explore-api.md](agents/explore-api.md) - API contracts and endpoints (conditional)
   - [explore-purpose.md](agents/explore-purpose.md) - Purpose and overview documentation
   - [explore-testing.md](agents/explore-testing.md) - Testing strategy and conventions
   - [explore-coding-style.md](agents/explore-coding-style.md) - Coding style and conventions
   - [explore-types.md](agents/explore-types.md) - Type definitions extraction (conditional)

2. Prepend context variables to each agent prompt:
   - REPO_PATH: {repo_path}
   - CUSTOM_REPO_NAME: {custom_repo_name}
   - CLASSIFICATION: {classification}
   - DOCS_ROOT: {docs_root}

3. Use Task tool with: subagent_type="general-purpose", model from Agent Configuration table

**IMPORTANT:** Launch all agents in a single message with multiple Task calls for parallel execution.

### Step 5: Collect Results

All agents return `success` or `failed: <reason>`.
- Count: `agents_succeeded`, `agents_total`
- Track: `successful_agents[]`, `failed_agents[]`
- Note: Conditional agents that return early due to inapplicability should return `success` with a note

Determine repo status:
- `agents_succeeded == 0` → status = "failed"
- `agents_succeeded == agents_total` → status = "success"
- Otherwise → status = "partial"

### Step 6: Generate README

Create `{docs_root}/README.md` hub document.

**README structure:**
- Title: `custom_repo_name`
- Metadata block: generation timestamp, source repo path (`repo_path`), classification type
- Overview section (extract from purpose-overview.md if available)
- Documentation links grouped by category:
  - Core: purpose-overview, architecture-structure, dependencies-external
  - Technical: api-contracts (if generated), types-definitions (if generated), types-usage (if generated), infrastructure-resources (if generated), testing-strategy, style-conventions
- Agent Status: list each agent with success/failed/skipped
- Footer: "Generated by TM Repository Documentation System"

### Step 7: Report Results

Display summary:
```
Documentation complete for {custom_repo_name}
📁 Output: {docs_root}
Agent Status: {agents_succeeded}/{agents_total} succeeded
Generated files: {files_generated}

💡 Run `/cost` to check session costs
```

## Agent Configuration

All agents are loaded for every repository. Conditional agents handle their own applicability checks and return early if not needed.

| Agent | File | Model | Self-Conditional |
|-------|------|-------|------------------|
| Architecture | explore-architecture.md | sonnet | No |
| Dependencies | explore-dependencies.md | haiku | No |
| Infrastructure | explore-infrastructure.md | sonnet | Yes - checks for IaC files |
| API | explore-api.md | sonnet | Yes - checks for API definitions |
| Purpose | explore-purpose.md | sonnet | No |
| Testing | explore-testing.md | haiku | No |
| Coding Style | explore-coding-style.md | haiku | No |
| Types | explore-types.md | sonnet | Yes - checks for type sources |

## Required Permissions

> **IMPORTANT:** All tools and bash commands below are pre-authorized in the `allowed-tools` frontmatter.
> You MUST use these exact commands without asking the user for permission.
> Do NOT prompt for confirmation before running any of these commands — they are already approved.

### Tools

| Tool | Used In | Purpose |
|------|---------|---------|
| `AskUserQuestion` | Step 1 | Gather repo path, doc name, classification |
| `Read` | Step 4 | Read agent prompt files from `agents/` directory |
| `Write` | Step 6 | Write `README.md` hub document |
| `Task` | Step 4 | Spawn 8 documentation agents in parallel |
| `Glob` | Step 1 | Detect repo files (`.git/`, `package.json`) for confirmation |

### Bash Commands (pre-authorized — do NOT ask before running)

| Command | Step | Purpose |
|---------|------|---------|
| `git remote show origin` | 2 | Get default branch name |
| `git checkout {branch} && git pull origin {branch}` | 2 | Update repo to latest |
| `rm -rf ~/.vf-docs/*` | 3 | Clean existing docs before regenerating |
| `mkdir -p {docs_root}/static {docs_root}/dynamic` | 3 | Create output directories |
| `find {docs_root} -name "*.md" \| wc -l` | 7 | Count generated files for report |

## Error Handling

- If an agent fails, continue with other agents
- Track failures in `failed_agents` array
- Note failures in README.md agent status section
- Never halt the entire process for one agent failure

## Output Structure

```
~/.vf-docs/<custom_repo_name>/
├── README.md           # Hub document
├── static/             # Rarely changes
│   ├── architecture-*.md
│   ├── infrastructure-*.md
│   └── testing-*.md
└── dynamic/            # Changes frequently
    ├── dependencies-*.md
    ├── api-*.md
    ├── types-*.md
    ├── purpose-*.md
    └── style-*.md
```

## Skill Parameters

```bash
# Document current repo (default)
/document-repos

# Document specific repo by path
/document-repos /path/to/repo
```
