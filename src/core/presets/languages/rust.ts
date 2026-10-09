import type { Preset } from '../../config/types.ts';

export const rust: Preset = {
    description:
        'Recommended for Rust: render_json.rs and render_pr.rs become render.rs and render/json.rs, the module layout the Rust reference prefers. Cargo builds one target per file in src/bin, examples, benches and tests, so those stay flat.',
    sources: [
        {
            title: 'The Rust reference: modules and module source files',
            url: 'https://doc.rust-lang.org/reference/items/modules.html',
        },
        { title: 'Cargo: package layout', url: 'https://doc.rust-lang.org/cargo/guide/project-layout.html' },
    ],
    detect: { files: ['Cargo.toml'] },
    config: {
        extends: ['recommended'],
        exclude: ['target'],
        overrides: [
            {
                folders: ['**/src/bin', '**/examples', '**/benches', '**/tests', '**/tests/**'],
                reason: 'Cargo makes every file there its own target (binary, example, benchmark, integration test), and UI-test suites keep one case per file.',
                rules: { 'max-files': 'off', 'prefix-groups': 'off' },
            },
        ],
    },
};
