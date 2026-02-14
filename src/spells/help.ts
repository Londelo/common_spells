#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { yellow } from '../shared/colors'

const errorMessage = 'Failed to display docs on spells'

const displayCommands = async () => {
  echo(yellow('fpush').underline + '  →  fpush --dangerous')
  echo('\t- Force pushes your current branch using "git push --force-with-lease --no-verify".')
  echo('\t- If "--dangerous" if used then it force pushes your current branch using "git push --force --no-verify".')
  echo('\t- Note: Using --force-with-lease is generally safer than --force, as it checks that the remote branch has not been updated by others before pushing.')

  echo(yellow('\nswitch').underline + '  →  switch [branch name] →  switch default')
  echo('\t- Switches to the specified branch. If no branch is given, interactively select from available branches.')
  echo('\t- If "default" is given as a branch name then you will be taken to the repos default branch')

  echo(yellow('\nbranch').underline + '  →  branch [branch name] [-c|--current]')
  echo('\t- Creates a new branch. By default, moves to the default branch, fetches/pulls, then creates the new branch. Use -c/--current to branch from your current branch.')

  echo(yellow('\ncommit').underline + '  →  commit [message] [-sa|--skip-add]')
  echo('\t- Adds all changes, commits with the message (defaults to a template if omitted), and pushes. Use -sa/--skip-add to skip "git add .".')

  echo(yellow('\npull').underline + '  →  pull [--purge]')
  echo('\t- Fetches and pulls the latest changes for your current branch. Use --purge to delete stale local branches and pull in remotes branches.')

  echo(yellow('\nfeature').underline + '  →  feature [feature tag]')
  echo('\t- Runs tests for the specified feature tag. If no tag is given, interactively select from available tags. Partial matches are supported.')

  echo(yellow('\nnstall').underline + '  →  nstall [package name(s)]')
  echo('\t- Installs dependencies using npm or yarn, depending on lockfile. Pass package names to add them.')

  echo(yellow('\nrelease').underline)
  echo('\t- Lists recent releases, generates release notes from git shortlog, prompts for new tag, creates the release with glab, then opens the browser to the new release')

  echo(yellow('\ncomments').underline)
  echo('\t- Fetches all comments from the current branch\'s merge request, displays then and copies them to clipboard.')

  echo(yellow('\ndiffs').underline + '  →  diffs [-c|--current]')
  echo('\t- Shows the diff for a merge request. By default, lets you select from available MRs. Use -c/--current to get the diff for the current branch\'s MR. Lastly it copies diff to clipboard.')

  echo(yellow('\nvars').underline)
  echo('\t- Lists all CI/CD variables for the current GitLab project. Displays variable keys and values.')

  echo(yellow('\ndocument-repos').underline)
  echo('\t- Discovers git repos in the current directory (depth 4), prompts for name and classification per repo, then launches Claude sessions in Terminal.app tabs to document each selected repository.')

  echo(yellow('\nrepoalias').underline + '  ->  repoalias --config')
  echo('\t- Manages shell aliases for git repositories.')
  echo('\t- Default: Shows all configured repo aliases from ~/.repo_aliases')
  echo('\t- --config: Scans current directory (3 levels) for git repos, prompts for alias names, and writes to ~/.repo_aliases')
}

(async () => await errorHandlerWrapper(displayCommands, errorMessage))();
