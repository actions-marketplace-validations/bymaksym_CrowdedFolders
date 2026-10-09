import type { Preset } from '../../config/types.ts';

export const rails: Preset = {
    description:
        'Ruby on Rails organises app/ by type by design, and every sub-folder is a Zeitwerk namespace (app/models/admin/role.rb is Admin::Role): app/models, controllers, jobs, mailers and helpers get more room, and groups there are warnings that suggest a namespace. user_test.rb and user_spec.rb are user.',
    sources: [
        {
            title: 'Rails guides: autoloading and namespaces (Zeitwerk)',
            url: 'https://guides.rubyonrails.org/autoloading_and_reloading_constants.html',
        },
        {
            title: 'Rails guides: migrations (db/migrate, timestamped)',
            url: 'https://guides.rubyonrails.org/active_record_migrations.html',
        },
    ],
    detect: { files: ['config/application.rb', 'bin/rails'] },
    config: {
        extends: ['recommended'],
        exclude: ['/tmp', '/log', '/storage', '/public', 'app/assets/builds', 'db/schema.rb'],
        naming: { companions: ['_(test|spec)$'] },
        rules: {
            'max-files': ['error', { max: 20, count: 'modules' }],
        },
        overrides: [
            {
                folders: [
                    'app/{models,controllers,jobs,mailers,helpers,policies,serializers,services,workers,validators,presenters}',
                    'app/{models,controllers,jobs,mailers,helpers,policies,serializers,services,workers,validators,presenters}/**',
                    'app/views/**',
                    'spec/**',
                    'test/**',
                ],
                reason: 'Rails sorts these by type on purpose, and a sub-folder is a namespace that changes every constant in it.',
                rules: {
                    'max-files': ['error', { max: 40 }],
                    'prefix-groups': ['warn', { hint: 'In Rails a sub-folder is a namespace (Render::Json).' }],
                },
            },
        ],
    },
};
