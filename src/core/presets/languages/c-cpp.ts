import type { Preset } from '../../config/types.ts';

export const cpp: Preset = {
    description:
        'C and C++: foo.h, foo.cc and foo_test.cc are one module. Without namespaces in C, a shared prefix is often the subsystem\'s name on purpose (Google: "http_server_logs.h rather than logs.h"), so groups are warnings and need five. Generated Qt and protobuf files are left out.',
    sources: [
        { title: 'Google C++ style guide: file names', url: 'https://google.github.io/styleguide/cppguide.html' },
        { title: 'Pitchfork: a C++ project layout', url: 'https://github.com/vector-of-bool/pitchfork' },
    ],
    detect: {
        files: [
            'CMakeLists.txt',
            'meson.build',
            'configure.ac',
            '*.vcxproj',
            'conanfile.txt',
            'conanfile.py',
            'vcpkg.json',
        ],
    },
    config: {
        extends: ['recommended'],
        exclude: ['cmake-build-*', '/out', 'extern', '/deps', '*.pb.h', '*.pb.cc', 'moc_*', 'ui_*', 'qrc_*', '.vs'],
        naming: { companions: ['[-_]inl$', '_(test|unittest|tests)$', '^test_'] },
        rules: {
            'max-files': ['error', { max: 20, count: 'modules' }],
            'prefix-groups': [
                'warn',
                {
                    min: 5,
                    hint: "In C a shared prefix is often the subsystem's namespace: move them only if the subsystem deserves a directory.",
                },
            ],
        },
    },
};
