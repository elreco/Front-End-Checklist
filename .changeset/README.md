# Changesets

Changesets drive version updates for the public CodeRocket CLI package.

When a pull request changes `packages/coderocket-cli`, run:

```bash
pnpm changeset
```

Select `@coderocketapp/cli`, choose `patch`, `minor`, or `major`, and describe the
user-visible change. After the pull request is merged into `coderocket/main`, GitHub
Actions opens or updates a release pull request. Merging that release pull request
publishes the new version to npm through trusted publishing.
