# Adopting crowded-folders in a repository that already has problems

The first run on a repository of some age finds problems — the [field trial](field-trial.md) found
errors in 22 of 30 well-known projects. Reorganising everything before turning the check on is how such
a check never gets turned on. The other way:

```sh
npx crowded-folders init               # write the configuration
npx crowded-folders --suppress-all     # record today's errors and pass
```

`--suppress-all` writes `crowded-folders-suppressions.json` at the root:

```json
{
    "version": 1,
    "suppressions": {
        "src/components": { "max-files": { "count": 34 } },
        "cli": { "prefix-groups#render": { "count": 5 } }
    }
}
```

Commit it. From then on:

| What happens                                           | The run                                |
| ------------------------------------------------------ | -------------------------------------- |
| A new crowded folder, or a new group                   | fails                                  |
| A suppressed folder grows (35 > 34)                    | fails, saying it was suppressed at 34  |
| A suppressed folder stays the same                     | passes                                 |
| A suppressed folder gets better (30 < 34), or is fixed | **fails** until `--prune-suppressions` |

The last line is on purpose. Without it, `src/components` could go down to 30 and quietly climb back
to 34. `--prune-suppressions` lowers each count to what is measured and removes what is fixed, so the
file only ever shrinks; the diff of that file is the progress.

## The flags

| Flag                              | Does                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `--suppress-all`                  | Adds a suppression for every current **error** (warnings never fail, so they are not kept). Keeps the existing ones. |
| `--suppress-rule <rule>`          | The same for one rule; repeatable.                                                                                   |
| `--prune-suppressions`            | Removes suppressions nothing needs and lowers those that went down.                                                  |
| `--pass-on-unpruned-suppressions` | Does not fail on stale suppressions (for a branch that is mid-refactor).                                             |
| `--suppressions-location <file>`  | Another file; or `"suppressions"` in the configuration.                                                              |

The names and the behaviour are those of ESLint's bulk suppressions, on purpose: a team that knows one
knows the other.

## Suppressions or overrides?

- **A suppression** is a debt: this folder is too big _today_, and nobody may make it bigger.
- **An override** is a decision: this folder is big _on purpose_ (generated code, a design-system
  catalogue, a flat folder the framework requires), with the reason written next to it.

If you find yourself pruning a suppression that will never move, it is an override.
