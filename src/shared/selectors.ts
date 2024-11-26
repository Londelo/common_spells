import { exec } from "shelljs"

let selectAllArgs = () => process.argv.slice(2).join(' ')

const selectTruthyItems = (item: unknown) => !!item

const selectDefaultBranch = async () =>
  exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')

const selectCurrentBranch = async () =>
  exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')

export {
  selectTruthyItems,
  selectCurrentBranch,
  selectDefaultBranch,
  selectAllArgs
}
