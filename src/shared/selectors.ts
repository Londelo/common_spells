import { exec } from "shelljs"

const selectTruthyItems = (item: unknown) => !!item

const selectDefaultBranch = () =>
  exec(
    "git remote show origin | grep 'HEAD branch' | awk '{print $NF}'",
    {silent:true}
  ).stdout
  .replace('\n', '')

const selectCurrentBranch = () =>
  exec(
    "git branch --show-current",
    {silent:true}
  ).stdout
  .replace('\n', '')

export {
  selectTruthyItems,
  selectCurrentBranch,
  selectDefaultBranch
}
