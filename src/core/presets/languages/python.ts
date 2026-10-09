import type { Preset } from '../../config/types.ts';

export const python: Preset = {
    description:
        'Recommended, read the way pytest names tests: test_parser.py and parser_test.py are the module parser. tests/ mirrors the package, so it is not asked to group on its own — split the package and the tests follow.',
    sources: [
        { title: 'PEP 8: package and module names', url: 'https://peps.python.org/pep-0008/' },
        {
            title: 'pytest: good practices, test discovery (test_*.py or *_test.py)',
            url: 'https://docs.pytest.org/en/stable/explanation/goodpractices.html',
        },
    ],
    detect: { files: ['pyproject.toml', 'setup.py', 'setup.cfg', 'requirements.txt', 'Pipfile'] },
    config: {
        extends: ['recommended'],
        exclude: [
            '__pycache__',
            '.venv',
            'venv',
            '.tox',
            '.nox',
            '.mypy_cache',
            '.pytest_cache',
            '.ruff_cache',
            '*.egg-info',
        ],
        naming: { companions: ['^test_', '_test$', '_tests$'] },
        overrides: [
            {
                folders: ['tests', 'tests/**', '**/tests', '**/tests/**'],
                reason: 'Tests mirror the package they test: when the package splits, they follow it.',
                rules: { 'prefix-groups': 'off' },
            },
        ],
    },
};

export const django: Preset = {
    description:
        "Python, plus Django: each app keeps models.py, views.py, admin.py… side by side by convention, and migrations stay flat and numbered (Django's answer to too many is squashing, not folders).",
    sources: [
        { title: 'Django: applications', url: 'https://docs.djangoproject.com/en/5.2/ref/applications/' },
        { title: 'Django: migrations (squashing)', url: 'https://docs.djangoproject.com/en/5.2/topics/migrations/' },
    ],
    detect: { files: ['manage.py'], dependencies: [] },
    config: {
        extends: ['python'],
        exclude: ['/static', '/media', '/staticfiles'],
    },
};
