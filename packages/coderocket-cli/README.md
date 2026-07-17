# CodeRocket CLI

Run the same deterministic Front-End Checklist profile used by CodeRocket and submit a preview result to your project.

```bash
npx @coderocketapp/cli@latest audit https://preview.example.com \
  --page /pricing \
  --page /account \
  --token "$CODEROCKET_TOKEN" \
  --environment preview \
  --sha "$GITHUB_SHA"
```

The first URL and every `--page` must stay on the same HTTPS origin. Use
`--environment production` to create or update the trusted live-site baseline, then use
`--environment preview` for pull requests.

For a server-rendered page behind a cookie, authorization header, or Cloudflare Access, keep the
required headers in the runner environment rather than in the command:

```bash
export CODEROCKET_SITE_HEADERS_JSON='{"cookie":"session=dedicated-test-session"}'
```

These headers are sent only to the original audited origin. They are never included in the result
payload sent to CodeRocket. Use a dedicated, least-privileged test session.

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
