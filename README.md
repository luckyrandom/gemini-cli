# @google/gemini-cli-core — dist branch

This branch is a pre-built snapshot of `packages/core` from the
[gemini-cli](https://github.com/luckyrandom/gemini-cli) fork, intended
to be consumed via a `github:` dependency spec:

```json
"@google/gemini-cli-core": "github:luckyrandom/gemini-cli#core-dist/feat-cancel-with-feedback"
```

Do not commit source changes here — edit the source branch
(`feat/cancel-with-feedback`) and push; a GitHub Action rebuilds and
force-pushes this branch.
