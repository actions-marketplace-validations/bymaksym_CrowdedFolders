import type { Preset } from '../../config/types.ts';

export const php: Preset = {
    description:
        'PHP with Composer (Laravel, Symfony): a folder is a PSR-4 namespace and there is one class per file, hence 20. Laravel sorts app/Models and app/Http/Controllers by type, so they get more room. UserTest is User.',
    sources: [
        { title: 'PSR-4: autoloading', url: 'https://www.php-fig.org/psr/psr-4/' },
        { title: 'Laravel: directory structure', url: 'https://laravel.com/docs/12.x/structure' },
    ],
    detect: { files: ['composer.json'] },
    config: {
        extends: ['recommended'],
        exclude: ['storage', 'bootstrap/cache', 'public/build'],
        naming: { companions: ['Test$'] },
        rules: {
            'max-files': ['error', { max: 20, count: 'modules', hint: 'A folder is a PSR-4 namespace.' }],
            'prefix-groups': ['error', { hint: 'A folder is a PSR-4 namespace.' }],
        },
        overrides: [
            {
                folders: ['app/Models', 'app/Http/Controllers'],
                reason: 'Laravel sorts these by type by default.',
                rules: { 'max-files': ['error', { max: 40 }] },
            },
        ],
    },
};
