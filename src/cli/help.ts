/**
 * The help is the published interface: an option that is not here does not exist for anyone who
 * has not read the source. A test checks that every option the parser accepts is listed.
 */
export const HELP = `crowded-folders — finds the folders of a repository that have become a drawer:
too many files in one place, or several modules sharing a prefix that are a folder
nobody made (render-json, render-text, render-sarif, render-pr → render/).

Usage
  crowded-folders [paths…] [options]          check the repository (or only these folders)
  crowded-folders init [options]               write a configuration for this repository
  crowded-folders explain <folder> [options]   show how one folder is read, and why
  crowded-folders presets                      list the presets and where each comes from
  crowded-folders rules                        list the rules and their options
  crowded-folders print-config [folder]        print the configuration in effect

Where it looks
  -c, --config <file>        the configuration (default: found from here upwards, up to the
                             top of the git repository)
      --root <dir>           the folder to check (default: the configuration's folder, else the
                             top of the git repository, else the current folder)
  -p, --preset <name>        use a preset; repeatable. Without a configuration file the presets
                             are detected from the repository (init writes them down)
      --stdin                read the file list from standard input, one path per line
                             (e.g. git ls-tree -r --name-only HEAD | crowded-folders --stdin)
      --no-git               list files from the disk instead of asking git (.gitignore is not read)

What it prints
  -f, --format <format>      text (default), json, sarif, github (annotations), markdown
  -o, --output <file>        write the report to a file instead of standard output
  -q, --quiet                report errors only
      --moves                print a git mv for every file a problem suggests moving
      --color, --no-color    force colours on or off (default: on in a terminal; NO_COLOR and
                             FORCE_COLOR are honoured)

When it fails
      --max-warnings <n>     fail when there are more than n warnings (default: warnings never fail)

Adopting it in a repository that already has problems
      --suppress-all                 record every current error in the suppressions file and pass
      --suppress-rule <rule>         the same, for one rule; repeatable
      --prune-suppressions           remove suppressions nothing needs and lower the ones that went down
      --pass-on-unpruned-suppressions  do not fail on suppressions nothing needs
      --suppressions-location <file> the suppressions file (default: crowded-folders-suppressions.json
                                     at the root, or "suppressions" in the configuration)

Other
      --force                init: overwrite an existing configuration
  -h, --help                 this help
  -v, --version              the version

Exit codes
  0  no errors (and no more warnings than --max-warnings)
  1  errors, too many warnings, or suppressions nothing needs
  2  the configuration or the command line is wrong, or something broke

Documentation: https://github.com/bymaksym/CrowdedFolders#readme
`;
