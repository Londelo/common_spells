#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../shared/errorHandlerWrapper'
import { yellow } from '../shared/colors'

const errorMessage = 'you are not a true dragon born.'

const displayCommands = async () => {
  echo(yellow('fusrodah').underline + '  →  fusrodah')
  echo('\t- Force pushes your current branch to the remote using "git push --force-with-lease --no-verify".')
  echo('\t- Note: Using --force-with-lease is generally safer than --force, as it checks that the remote branch has not been updated by others before pushing. This command uses --force, which does NOT perform this safety check.')

  echo(yellow('\nswitch').underline + '  →  switch [branch name]')
  echo('\t- Switches to the specified branch. If no branch is given, interactively select from available branches.')

  echo(yellow('\nbranch').underline + '  →  branch [branch name] [-c|--current]')
  echo('\t- Creates a new branch. By default, moves to the default branch, fetches/pulls, then creates the new branch. Use -c/--current to branch from your current branch.')

  echo(yellow('\ncommit').underline + '  →  commit [message] [-sa|--skip-add]')
  echo('\t- Adds all changes, commits with the message (defaults to a template if omitted), and pushes. Use -sa/--skip-add to skip "git add .".')

  echo(yellow('\npull').underline + '  →  pull [--purge]')
  echo('\t- Fetches and pulls the latest changes for your current branch. Use --purge to delete stale local branches and reconnect active remotes.')

  echo(yellow('\nfeature').underline + '  →  feature [feature tag]')
  echo('\t- Runs tests for the specified feature tag. If no tag is given, interactively select from available tags. Partial matches are supported.')

  echo(yellow('\ninstall').underline + '  →  nstall [package(s)]')
  echo('\t- Installs dependencies using npm or yarn, depending on lockfile. Pass package names to add them.')
}

(async () => await errorHandlerWrapper(displayCommands, errorMessage))();
