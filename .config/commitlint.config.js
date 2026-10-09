// Conventional Commits: release-please reads the version and the changelog from the subjects.
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-case': [2, 'always', 'kebab-case'],
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'revert'],
        ],
    },
};
