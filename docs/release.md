# Release Process

> How to cut a versioned release of "Nest & Next." Pushing a `vX.Y.Z` tag triggers the
> [`release.yml`](../.github/workflows/release.yml) workflow, which validates the tag, runs the full
> quality gate, publishes a GitHub Release, and deploys that exact build to GitHub Pages.

**Live site:** <https://pacphi.github.io/retirement-calculator/> · **Releases:** <https://github.com/pacphi/retirement-calculator/releases>

---

## How it works

Releases are **tag-driven** and follow [semantic versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The single source of truth for the version is the `version` field in `package.json`; the app reads it
at build time and shows it in the footer (`Nest & Next · vX.Y.Z`).

The rule the pipeline enforces: **the git tag must equal the `package.json` version.** That is why the
process is *bump-then-tag* — bump `package.json` first, commit it, then tag that commit. If they
disagree, the `validate` job fails the release loudly.

Pushing a tag matching `v*` runs four jobs in order:

| Job | What it does |
| --- | --- |
| `validate` | Checks the tag is well-formed `vMAJOR.MINOR.PATCH[-prerelease]` and equals `package.json` version. Flags a prerelease if the version contains a `-` (e.g. `v1.1.0-rc1`). |
| `build` | `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` → `build`, then uploads `dist/` as the Pages artifact. |
| `release` | Creates the GitHub Release with auto-generated notes; marks it prerelease when applicable. |
| `deploy` | Publishes the built `dist/` to GitHub Pages. |

---

## Choosing the version number

Following semver, given the conventional-commit history since the last release:

- **PATCH** (`1.0.0` → `1.0.1`) — bug fixes only (`fix:` commits), no behavior change to inputs/outputs.
- **MINOR** (`1.0.0` → `1.1.0`) — new backward-compatible capability (`feat:` commits).
- **MAJOR** (`1.0.0` → `2.0.0`) — breaking change to saved inputs, modeling assumptions, or the public surface.
- **Prerelease** (`1.1.0-rc1`) — a release candidate; the GitHub Release is flagged as a prerelease and is **still deployed** to Pages.

---

## Step by step

### 1. Start from a clean, up-to-date `main`

```bash
git checkout main
git pull --ff-only
git status        # should report "nothing to commit, working tree clean"
```

### 2. Bump the version in `package.json`

Skip this step only if `package.json` is **already** at the version you want to release (as it was for
the very first `v1.0.0`).

```bash
pnpm version 1.1.0 --no-git-tag-version    # edits package.json only; does NOT tag
```

`--no-git-tag-version` is important: it bumps the file without creating a tag or commit, so you stay in
control of the commit message and tag below.

### 3. Commit the bump

```bash
git commit -am "chore(release): v1.1.0"
git push
```

### 4. Tag the release commit

```bash
git tag -a v1.1.0 -m "v1.1.0"
```

> The `v` prefix is required. The tag must match the `package.json` version exactly (without the `v`).

### 5. Push the tag — this fires the release

```bash
git push origin v1.1.0
```

### 6. Watch the workflow

```bash
gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Or open the Actions tab: <https://github.com/pacphi/retirement-calculator/actions/workflows/release.yml>

### 7. Verify the result

```bash
gh release view v1.1.0                                  # release exists with notes
curl -s https://pacphi.github.io/retirement-calculator/ # site is live
```

Then load the site in a browser and confirm the footer reads `Nest & Next · v1.1.0`.

---

## First release (`v1.0.0`) — the short path

`package.json` already ships at `1.0.0`, so the bump (steps 2–3) is unnecessary. Just tag and push:

```bash
git checkout main && git pull --ff-only
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

---

## Prerelease example

```bash
pnpm version 1.1.0-rc1 --no-git-tag-version
git commit -am "chore(release): v1.1.0-rc1"
git push
git tag -a v1.1.0-rc1 -m "v1.1.0-rc1"
git push origin v1.1.0-rc1
```

The GitHub Release is automatically marked **Pre-release**, and Pages is still updated.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `validate` fails: *"Tag version (X) != package.json version (Y)"* | You tagged without bumping (or bumped without re-tagging). Delete the tag (`git tag -d vX.Y.Z && git push origin :vX.Y.Z`), fix `package.json`, recommit, re-tag. |
| `validate` fails: *"not a valid vMAJOR.MINOR.PATCH"* | The tag is malformed. It must look like `v1.2.3` or `v1.2.3-rc1`. |
| `build` fails on lint/test | The release gate runs the same checks as CI. Fix on `main` first (CI must be green), then re-tag. |
| `deploy` job blocked / skipped | The `github-pages` environment must allow tag deploys — a `v*` **tag** deployment policy is configured. If it was removed, re-add it under Settings → Environments → `github-pages`. |
| Pushed the wrong tag | `git push origin :vX.Y.Z` deletes the remote tag; `git tag -d vX.Y.Z` deletes it locally. Then start over. |

---

## Re-deploying without a release

To push the current `main` build to Pages **without** cutting a release (e.g. a content-only redeploy),
run the manual workflow instead:

```bash
gh workflow run deploy.yml --ref main
```

See [`deploy.yml`](../.github/workflows/deploy.yml).
