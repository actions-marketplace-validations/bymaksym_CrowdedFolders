# The four commands that mean the same in every repository of mine.

# Everything: format, lint, types, tests, the package and the tool on itself.
check:
    pnpm run check:all

# Types and tests, without lint.
verify:
    pnpm run typecheck
    pnpm test

# Automatic fixes, then verify — always.
fix:
    pnpm run lint
    pnpm run format
    just verify

# The real thing: the built package, installed from its tarball, on real repositories.
e2e:
    pnpm run build
    pnpm run test:package
    node tooling/field-trial.mjs
