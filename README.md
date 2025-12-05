# All The Commons Spells a Tech Wizard Needs

## How to setup locally:
- npm i
- npm run local:install
  - this will "install" this package locally by using "npm link"
- cast your first spell by entering in "spells"
  - this will display all the common spells
- thats it.


## TODO:
- refactor/fix switch
  - it needs to get all branches faster
    - maybe refactor the purge so it does its thing but also saves all the branchs in a .file
  - should display who owns the branch

- create a way to easily navigate through all TM repos
  - scan a dir that contains all repos you want short cuts for
  - get only repos
  - give all repos alias's
  - inject alias's in bash src

- automate workers template updates
  - this should automatically update all workers that use the workers template
  - create new branches to make these updates
  - create MR's for these update?
  - ignore merge issues and let other do it if they see it in a MR
