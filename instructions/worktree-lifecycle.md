# Worktree lifecycle

- Work lands on a branch. A worktree is temporary.
- After the work is merged to the default branch, remove the worktree and delete the local and remote branch in the same job.
- Do not leave `*-worktrees/`, empty stubs, or `*-PRIVATE/` siblings under Github-rhuan/.
- Material that is not ready for a public repo goes to private `rhuanssauro/rhuanssauro-staging`: `pending-public/<product>/` vs `private/<product>/`.
- Public repos stay public and do not receive voice, unreleased media, or staging packs.
- Gitignored local assets and credentials are not committed just to make a worktree look clean.
