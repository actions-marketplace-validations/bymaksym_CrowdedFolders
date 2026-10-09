import type { Preset } from '../../config/types.ts';

export const swift: Preset = {
    description:
        'Swift and iOS: User+Codable.swift is an extension of User and belongs with it, and UserTests is User. Asset catalogs, localisation folders and Xcode bundles are left out.',
    sources: [
        {
            title: 'Google Swift style guide: file names (MyType+MyProtocol.swift)',
            url: 'https://google.github.io/swift/',
        },
    ],
    detect: { files: ['Package.swift', '**/*.xcodeproj/project.pbxproj'] },
    config: {
        extends: ['recommended'],
        exclude: ['*.xcassets', '*.lproj', '*.xcodeproj', '*.xcworkspace', 'DerivedData', 'Pods', 'Carthage', '.build'],
        naming: { companions: [String.raw`\+.+$`, '(Tests|Test|Spec)$'] },
    },
};
