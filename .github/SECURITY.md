# Security

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting (the **Report a vulnerability** button in this
repository's Security tab), not a public issue.

## What is worth reporting

- A configuration, file name or file list that makes the command run code it should not, read file
  contents, or write outside the files it is asked to write (the suppressions file, `--output`, `init`).
- Input that hangs the command (a pathological glob or name).
- A published package that does not match this repository.

Plugins and JavaScript configurations are code and run when the configuration loads, as ESLint plugins
do; that is by design, not a vulnerability.

## Supported versions

Only the latest version receives fixes.

## Verifying what you installed

Releases are published from GitHub Actions with npm provenance:
`npm audit signatures` checks that the package came from this repository's publish workflow.
