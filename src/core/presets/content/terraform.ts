import type { Preset } from '../../config/types.ts';

export const terraform: Preset = {
    description:
        "Terraform: a folder is a module, and HashiCorp's style guide grows a configuration with more flat files (network.tf, storage.tf) before making one. Looser limits, and groups are warnings that ask whether they are a child module.",
    sources: [
        {
            title: 'Terraform: standard module structure',
            url: 'https://developer.hashicorp.com/terraform/language/modules/develop/structure',
        },
        {
            title: 'Terraform: style guide (file names)',
            url: 'https://developer.hashicorp.com/terraform/language/style',
        },
    ],
    detect: { files: ['*.tf'] },
    config: {
        extends: ['recommended'],
        exclude: ['.terraform'],
        rules: {
            'max-files': ['error', { max: 25, count: 'modules', hint: 'In Terraform a folder is a module.' }],
            'prefix-groups': [
                'warn',
                { hint: 'In Terraform a folder is a module: would they be a child module under modules/?' },
            ],
        },
    },
};
