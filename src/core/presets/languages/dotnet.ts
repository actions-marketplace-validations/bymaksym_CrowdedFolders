import type { Preset } from '../../config/types.ts';

export const dotnet: Preset = {
    description:
        'C# and .NET: a folder is a namespace (IDE0130 is on by default), the I of an interface is not what it is about (IUserService belongs with UserService), and UserServiceTests is UserService. One type per file, hence 20.',
    sources: [
        {
            title: 'IDE0130: namespace does not match folder structure',
            url: 'https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0130',
        },
        {
            title: 'C# identifier names: interfaces start with I',
            url: 'https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names',
        },
    ],
    detect: { files: ['*.csproj', '*.fsproj', '*.vbproj', '*.sln', '*.slnx'] },
    config: {
        extends: ['recommended'],
        exclude: ['bin', 'obj', 'Migrations', 'wwwroot/lib', 'Properties', '.vs'],
        naming: { companions: ['^I(?=[A-Z])', '(Tests|Test)$'], ignoreLeadingWords: ['i'] },
        rules: {
            'max-files': ['error', { max: 20, count: 'modules', hint: 'In C# a folder is a namespace (IDE0130).' }],
            'prefix-groups': ['error', { hint: 'In C# a folder is a namespace (IDE0130).' }],
        },
    },
};
