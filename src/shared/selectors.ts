import { execute } from "./shell"

const dateOptions: any = {
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: "2-digit",
};

const convertDate = {
  'milliseconds': (date: number|string) => new Date(date).getTime(),
  'full': (date: number|string) => new Date(date).toLocaleDateString('en-us', dateOptions)
}

let selectAllArgs = () => process.argv.slice(2).join(' ')

const selectTruthyItems = (item: unknown) => !!item

const selectDefaultBranch = async () => {
  const result = await execute(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    "Failed to select default branch"
  )
  return result.replace('\n', '')
}

const selectCurrentBranch = async () => {
  const result = await execute(
    "git branch --show-current",
    "Failed to select current branch"
  )
  return result.replace('\n', '')
}

export {
  selectTruthyItems,
  selectCurrentBranch,
  selectDefaultBranch,
  selectAllArgs,
  convertDate
}
