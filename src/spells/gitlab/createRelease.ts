#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import checkForGlab from '../../shared/glab/checkForGlab'
import { yellow, green } from '../../shared/colors'
import { execute } from '../../shared/shell'
import { input, confirm } from '../../shared/inquirer'
import { selectDefaultBranch } from '../../shared/selectors'

const errorMessage = 'FAILED to create release'

const getLatestReleaseTag = async (): Promise<string | null> => {
  const releaseListCommand = 'glab release list --per-page 5'
  echo(yellow(releaseListCommand))
  const releaseListResult = await execute(releaseListCommand, 'Failed to get release list', { silent: false })

  const tagRegex = /^(v[\d.]+)\s+v[\d.]+/m
  const tagMatch = releaseListResult.match(tagRegex)
  const latestReleaseTag = tagMatch ? tagMatch[1] : null

  return latestReleaseTag
}

const getReleaseNotes = async (latestReleaseTag: string | null, defaultBranch: string): Promise<string> => {
  const shortlogCommand = latestReleaseTag
    ? `git shortlog --no-merges ${latestReleaseTag}..${defaultBranch}`
    : `git shortlog --no-merges ${defaultBranch}`
  echo(yellow(shortlogCommand))
  const releaseNotes = await execute(shortlogCommand, 'Failed to get release notes')

  return `\`\`\`\n${releaseNotes}\n\`\`\``
}

const normalizeNotesForShell = (notes: string): string => {
  return notes
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}

const createRelease = async () => {
  await checkForGlab()

  const defaultBranch = await selectDefaultBranch()

  const latestReleaseTag = await getLatestReleaseTag()
  echo(green(`Latest release tag: ${latestReleaseTag || 'v0.0.0'}`))

  const releaseNotes = await getReleaseNotes(latestReleaseTag, defaultBranch)

  const newTag = await input('Enter the new release tag:')

  echo(yellow(`glab release create ${newTag} --name ${newTag} --notes "${releaseNotes}"`))

  const confirmRelease = await confirm('Before I execute this, does this new release look good?')

  if (confirmRelease) {
    const escapedNotes = normalizeNotesForShell(releaseNotes)

    const createReleaseCommand = `glab release create ${newTag} --name ${newTag} --notes "${escapedNotes}"`
    await execute(createReleaseCommand, 'Failed to create release')

    echo(green('New release created!'))

    await execute(`glab release view ${newTag} --web`, 'Failed to open web view')
  } else {
    echo(yellow('Release Declined.'))
  }
}

(async () => await errorHandlerWrapper(createRelease, errorMessage))()
