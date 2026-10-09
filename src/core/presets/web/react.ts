import type { Preset } from '../../config/types.ts';

export const react: Preset = {
    description:
        'React has no official layout, so this is recommended plus what React names mean: `use` starts every hook and `with` many higher-order components, so they are skipped before reading what a file is about (useAuthLogin and AuthForm are both about auth). Counts a component with its test, story and styles once.',
    sources: [
        {
            title: 'React docs (legacy): file structure — "don\'t overthink it", at most three or four levels',
            url: 'https://legacy.reactjs.org/docs/faq-structure.html',
        },
        {
            title: 'React: hook names must start with use',
            url: 'https://react.dev/learn/reusing-logic-with-custom-hooks',
        },
        {
            title: 'bulletproof-react: project structure by feature',
            url: 'https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md',
        },
    ],
    detect: { dependencies: ['react', 'react-dom', 'react-native'] },
    config: {
        extends: ['recommended'],
        exclude: ['public'],
        naming: { ignoreLeadingWords: ['use', 'with'] },
    },
};

export const nextjs: Preset = {
    description:
        'React, plus the App Router: under app/ a folder is a URL segment, so the advice is a private folder (_name) or a route group ((name)), which group files without changing URLs.',
    sources: [
        {
            title: 'Next.js: project structure, private folders and route groups',
            url: 'https://nextjs.org/docs/app/getting-started/project-structure',
        },
    ],
    detect: { dependencies: ['next'] },
    config: {
        extends: ['react'],
        exclude: ['.next', 'next-env.d.ts'],
        overrides: [
            {
                folders: ['app', 'app/**', 'src/app', 'src/app/**'],
                reason: 'Under the App Router a plain folder becomes part of the URL.',
                rules: {
                    'prefix-groups': [
                        'error',
                        {
                            hint: 'Under app/ a folder is a URL segment: use a private folder (_name) or a route group ((name)).',
                        },
                    ],
                },
            },
        ],
    },
};

export const reactNative: Preset = {
    description:
        'React, plus the native projects: ios/ and android/ next to the app are the Xcode and Gradle projects that the template or Expo prebuild generates, not code arranged by hand, so they are left out wherever the app lives in the repository.',
    sources: [
        {
            title: 'Expo: continuous native generation — prebuild "creates the android and ios directories"',
            url: 'https://docs.expo.dev/workflow/continuous-native-generation/',
        },
    ],
    detect: { dependencies: ['react-native', 'expo'] },
    config: {
        extends: ['react'],
        exclude: ['/ios', '/android', '.expo'],
    },
};
