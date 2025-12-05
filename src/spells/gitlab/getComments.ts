#!/usr/bin/env node
import { echo } from 'shelljs'
import errorHandlerWrapper from '../../shared/errorHandlerWrapper'
import copyToClipboard from '../../shared/copyToClipboard'
import getProjectFullPath from '../../shared/glab/getProjectFullPath'
import getMrId from '../../shared/glab/getMrId'
import { green, yellow } from 'colors'
import { execute } from '../../shared/shell'
import checkForGlab from '../../shared/glab/checkForGlab'

const errorMessage = 'FAILED to get comments'

type Author = {
  id: number
  username: string
  name: string
  state: string
  locked: boolean
  avatar_url: string
  web_url: string
}

export type Comment = {
  id: number
  type: string | null
  body: string
  author: Author
  created_at: string
  updated_at: string
  system: boolean
  noteable_id: number
  noteable_type: string
  project_id: number
  resolvable: boolean
  confidential: boolean
  internal: boolean
  imported: boolean
  imported_from: string
  noteable_iid: number
  commands_changes: Record<string, unknown>
}

export type Discussion = {
  id: string
  individual_note: boolean
  notes: Comment[]
}

const queryMrDiscussions = async (fullPath: string, iid: string): Promise<Comment[][]> => {
  const projectPath = encodeURIComponent(fullPath)
  const command = `glab api /projects/${projectPath}/merge_requests/${iid}/discussions?per_page=10000`

  echo(yellow(command))
  let discussions = await execute(
    command,
    'Failed to get discussions from MR'
  )
  const parsed: Discussion[] = JSON.parse(discussions)
  return parsed.reduce<Comment[][]>((acc, discussion) => {
    const diffNotes: Comment[] = discussion.notes.filter((note) => note.type === 'DiffNote')
    if (diffNotes.length > 0) {
      return [
        ...acc,
        diffNotes
      ]
    }
    return acc
  }, [])
}

const displayComments = (discussions: Comment[][]) => {
  discussions.forEach((comments, index) => {
    echo(`\ncomment ${index + 1}`)
    comments.forEach((comment, commentIndex) => {
      const indent = commentIndex === 0 ? '  ' : '    '
      const body = comment.body.trim().replace('\n', ' ')
      echo(`${indent}${green(comment.author.username)}: ${body}`)
    })
  })
}

const getComments = async () => {
  await checkForGlab()

  const fullPath = await getProjectFullPath()

  const iid = await getMrId()

  const discussions = await queryMrDiscussions(fullPath, iid)

  echo(yellow(`Found ${discussions.length} discussion(s) with DiffNotes`))
  displayComments(discussions)

  copyToClipboard(
    `You are a master at gitlab and here are code review comments people have made for this branch. #codebase
    \n\n${JSON.stringify(discussions)}`
  )
}

(async () => await errorHandlerWrapper(getComments, errorMessage))()
