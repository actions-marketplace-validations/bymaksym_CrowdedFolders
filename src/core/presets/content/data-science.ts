import type { Preset } from '../../config/types.ts';

export const dataScience: Preset = {
    description:
        'Data science projects laid out like cookiecutter-data-science: notebooks/ is flat and ordered by step (1.0-initials-description.ipynb), so it is not asked to split; data, models and figures are artefacts and are left out; the package under src/ reads as Python.',
    sources: [
        {
            title: 'Cookiecutter Data Science: opinions and notebook naming',
            url: 'https://cookiecutter-data-science.drivendata.org/opinions/',
        },
    ],
    detect: { files: ['notebooks/*.ipynb'] },
    config: {
        extends: ['python'],
        exclude: ['/data', '/models', 'reports/figures', '/references', '.ipynb_checkpoints'],
        overrides: [
            {
                folders: ['notebooks', 'notebooks/**'],
                reason: 'Notebooks are numbered by step and kept flat on purpose: the number is the order.',
                rules: { 'max-files': 'off', 'prefix-groups': 'off' },
            },
        ],
    },
};
