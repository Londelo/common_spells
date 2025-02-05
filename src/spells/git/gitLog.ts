#!/usr/bin/env node
import errorHandlerWrapper from '../../shared/errorHandlerWrapper';
import gitLogOneLine from '../../shared/gitLogOneLine';
import { selectAllArgs } from '../../shared/selectors';

const errorMessage = `FAILED to rebase commits`

const rebaseCommits = async () => {
  const args = selectAllArgs()
  const select = false
  const showAll = args.includes('-a') || args.includes('--all')
  await gitLogOneLine(select, showAll)
}

(async () => await errorHandlerWrapper(rebaseCommits, errorMessage))();
