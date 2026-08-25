# Controlled production rollout

Temporary authorization for one native Vercel production build of the merged mobile homepage carousel change.

Feature commit: `8e2cad8d78c2b141f9710bc8b60ccfb0dfd35e07`
PR: #68

After the production deployment reaches READY and smoke tests pass, remove this marker and restore `vercel.json` to `git.deploymentEnabled: false` in one atomic cleanup commit.
