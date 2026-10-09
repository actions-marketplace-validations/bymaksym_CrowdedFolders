import type { Preset } from '../../config/types.ts';

export const nestjs: Preset = {
    description:
        'NestJS organises by module, one folder per feature (cats/cats.controller.ts, cats/cats.service.ts are one module). Recommended with modules counted once.',
    sources: [{ title: 'NestJS: modules', url: 'https://docs.nestjs.com/modules' }],
    detect: { dependencies: ['@nestjs/core'] },
    config: {
        extends: ['recommended'],
        rules: {
            'max-files': ['error', { hint: 'NestJS groups a feature as a module folder.' }],
        },
    },
};
