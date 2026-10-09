import type { Preset } from '../../config/types.ts';
import { MEDIA } from '../general.ts';

/**
 * The asset-type prefixes of Allar's guide (table 1.2), lowercase: BP_Door is a door, not a BP. A
 * group by type is what the guide forbids ("Do Not Create Folders Called Assets or AssetTypes"); the
 * group is the base asset name.
 */
const TYPE_PREFIXES = [
    'a',
    'abp',
    'ac',
    'ai',
    'aic',
    'am',
    'ao',
    'att',
    'bb',
    'bp',
    'bpfl',
    'bpi',
    'bpml',
    'bs',
    'bt',
    'ca',
    'cue',
    'curve',
    'dm',
    'dt',
    'dv',
    'dw',
    'e',
    'eqs',
    'f',
    'ffe',
    'fms',
    'font',
    'ft',
    'lg',
    'll',
    'ls',
    'm',
    'matinee',
    'mf',
    'mi',
    'mp',
    'mpc',
    'msw',
    'mt',
    'ne',
    'ns',
    'ol',
    'pfb',
    'phys',
    'pm',
    'pp',
    'ps',
    'rig',
    'rt',
    'rtc',
    's',
    'sgi',
    'sif',
    'sk',
    'skel',
    'sm',
    'sp',
    'spr',
    'sprg',
    'ss',
    't',
    'tbp',
    'tc',
    'ti',
    'tm',
    'ts',
    'vf',
    'vfa',
    'wbp',
    // The class prefixes of Unreal C++ (AActor, UObject, IInterface), for the code under Source/.
    'u',
    'i',
];

export const unreal: Preset = {
    description:
        "Unreal Engine, after Allar's style guide: an asset is named Prefix_BaseAssetName_Variant_Suffix, the prefix is its type and the base asset name is its group. Prefixes and texture suffixes (_D, _N, _ORM…) are skipped, so SM_Rock, T_Rock_D and M_Rock are all about Rock — and 15 or more of them get their own folder (guide rule 2.7). The guide sets no maximum per folder; 50 here is an opinion.",
    sources: [
        {
            title: "Allar's UE5 style guide (1.2 asset names, 2.6, 2.7)",
            url: 'https://github.com/Allar/ue5-style-guide',
        },
    ],
    detect: { files: ['*.uproject'] },
    config: {
        extends: ['recommended'],
        // The assets are the project here: textures, sounds and models count.
        exclude: [
            `!${MEDIA}`,
            '/Saved',
            '/Intermediate',
            '/DerivedDataCache',
            '/Binaries',
            'Content/Developers',
            '.vs',
        ],
        naming: {
            ignoreLeadingWords: TYPE_PREFIXES,
            companions: [
                '_(D|N|R|A|O|B|E|M|S|H|L|ORM|MRA|ARM|RMA)$',
                '_(P|Audio|Lighting|Geo|Gameplay)$',
                '_(Cue|Decal|Color|Table|Float|Vector|SC|Component|Context)$',
                String.raw`_\d+$`,
            ],
        },
        rules: {
            'max-files': ['warn', { max: 50, count: 'modules' }],
            'prefix-groups': [
                'error',
                {
                    min: 15,
                    hint: 'Allar 2.7: "If you find yourself having 15+ of these assets that belong together, they should be together."',
                },
            ],
        },
    },
};
