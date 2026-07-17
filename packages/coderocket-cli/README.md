# CodeRocket CLI

Run the same deterministic Front-End Checklist profile used by CodeRocket and submit a preview result to your project.

```bash
npx @coderocketapp/cli@latest audit https://preview.example.com \
  --explicit-pages \
  --page / \
  --page /pricing \
  --authenticated-page /account \
  --token "$CODEROCKET_TOKEN" \
  --environment preview \
  --sha "$GITHUB_SHA"
```

Every `--page` and `--authenticated-page` must stay on the same HTTPS origin. Use
`--environment production` to create or update the trusted live-site baseline, then use
`--environment preview` for pull requests.

Keep infrastructure headers that apply to every page separate from the dedicated application
session that applies only to `--authenticated-page` paths:

```bash
export CODEROCKET_SITE_HEADERS_JSON='{"cf-access-client-id":"service-client"}'
export CODEROCKET_AUTH_HEADERS_JSON='{"cookie":"session=dedicated-test-session"}'
```

These headers are sent only to the original audited origin. Authentication headers are added only
to explicitly authenticated pages. No header is included in the result payload sent to CodeRocket.
Use a dedicated, least-privileged test session.

Exit code `0` means the quality gate passed or needs a new baseline, `1` means a new critical or high-priority regression was found, and `2` means the check could not produce a reliable result.

## Releasing

Changes to this package must include a Changeset:

```bash
pnpm changeset
```

Select `@coderocketapp/cli` and the appropriate semantic version bump. After the
change reaches `coderocket/main`, the release workflow opens or updates a version
pull request. Merging that pull request publishes the package to npm through GitHub
trusted publishing; no npm token is stored in GitHub.
