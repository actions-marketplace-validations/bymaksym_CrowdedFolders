import type { Preset } from '../../config/types.ts';

export const java: Preset = {
    description:
        'Java and Kotlin with Maven or Gradle: a folder is a package, so groups of classes sharing a name (UserService, UserRepository, UserController) suggest packaging by feature. UserServiceTest and UserServiceIT are read as UserService. One top-level class per file makes folders larger than in TypeScript, hence 20.',
    sources: [
        {
            title: 'Maven: standard directory layout',
            url: 'https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html',
        },
        { title: 'Google Java style guide', url: 'https://google.github.io/styleguide/javaguide.html' },
        {
            title: 'Kotlin coding conventions: directory structure',
            url: 'https://kotlinlang.org/docs/coding-conventions.html',
        },
        {
            title: 'IntelliJ inspection: package with too many classes (50)',
            url: 'https://jetbrains.com/help/inspectopedia/PackageWithTooManyClasses.html',
        },
    ],
    detect: { files: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'] },
    config: {
        extends: ['recommended'],
        exclude: ['target', 'build', '.gradle', 'generated', 'generated-sources'],
        naming: { companions: ['(Test|Tests|IT|IntegrationTest|Spec)$'] },
        rules: {
            'max-files': [
                'error',
                {
                    max: 20,
                    count: 'modules',
                    hint: 'A folder is a package: package by feature (user/, order/), not by layer.',
                },
            ],
            'prefix-groups': ['error', { hint: 'A folder is a package: they would be the package of that feature.' }],
        },
    },
};

export const android: Preset = {
    description:
        'Java/Kotlin, plus Android resources: res/ folders cannot have sub-folders ("Alternative resource directories can\'t be nested"), so prefixes such as activity_, fragment_ and ic_ are the only grouping there is. res/ is left out.',
    sources: [
        {
            title: 'Android: providing resources',
            url: 'https://developer.android.com/guide/topics/resources/providing-resources',
        },
        {
            title: 'ribot Android guidelines: resource naming',
            url: 'https://github.com/ribot/android-guidelines/blob/master/project_and_code_guidelines.md',
        },
    ],
    detect: { files: ['AndroidManifest.xml'] },
    config: {
        extends: ['java'],
        exclude: ['**/src/*/res', '/res'],
    },
};
