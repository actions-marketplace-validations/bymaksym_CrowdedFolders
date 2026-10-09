import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { folderKeyOf, groupKeyOf, keyRestatesPath, modulesOf, type Naming, stemOf, subjectOf } from './modules.ts';
import { isNumericWord, splitWords } from './words.ts';

const plain: Naming = { companions: [], ignoreLeadingWords: new Set(), groupNumericPrefixes: false };

describe('splitWords', () => {
    it('reads every naming convention the same way', () => {
        for (const name of [
            'user-service',
            'user_service',
            'userService',
            'UserService',
            'USER_SERVICE',
            'user.service',
            'user service',
        ]) {
            assert.deepEqual(splitWords(name), ['user', 'service'], name);
        }
    });

    it('ends an acronym at the capital that starts the next word', () => {
        assert.deepEqual(splitWords('HTTPServer'), ['http', 'server']);
        assert.deepEqual(splitWords('parseXMLDocument'), ['parse', 'xml', 'document']);
        assert.deepEqual(splitWords('IUserService'), ['i', 'user', 'service']);
    });

    it('keeps digits with their letters, and a run of digits as its own word', () => {
        assert.deepEqual(splitWords('i18n-utils'), ['i18n', 'utils']);
        assert.deepEqual(splitWords('e1000_main'), ['e1000', 'main']);
        assert.deepEqual(splitWords('2024-01-01-post'), ['2024', '01', '01', 'post']);
        assert.deepEqual(splitWords('Vector3Int'), ['vector3', 'int']);
    });

    it('reads letters of any script, cased or not', () => {
        assert.deepEqual(splitWords('ПользовательСервис'), ['пользователь', 'сервис']);
        assert.deepEqual(splitWords('用户-服务'), ['用户', '服务']);
    });

    it('drops separators and symbols, and returns nothing for a name made of them', () => {
        assert.deepEqual(splitWords('+page'), ['page']);
        assert.deepEqual(splitWords('__init__'), ['init']);
        assert.deepEqual(splitWords('---'), []);
    });

    it('stays linear on a long name', () => {
        const name = `${'a'.repeat(50_000)}B${'c'.repeat(50_000)}`;
        const started = performance.now();
        assert.equal(splitWords(name).length, 2);
        assert.ok(performance.now() - started < 1000);
    });
});

describe('isNumericWord', () => {
    it('is true only for digits', () => {
        assert.equal(isNumericWord('0001'), true);
        assert.equal(isNumericWord('v1'), false);
        assert.equal(isNumericWord(''), false);
    });
});

describe('stemOf', () => {
    it('cuts at the first dot, so every companion extension joins the module', () => {
        for (const name of ['foo.ts', 'foo.spec.ts', 'foo.component.html', 'foo.d.ts', 'foo.stories.tsx']) {
            assert.equal(stemOf(name, plain), 'foo', name);
        }
        assert.equal(stemOf('Player.cs.meta', plain), 'Player');
    });

    it('keeps a dotfile its name, and trims the underscores of partials and dunders', () => {
        assert.equal(stemOf('.gitignore', plain), 'gitignore');
        assert.equal(stemOf('.eslintrc.json', plain), 'eslintrc');
        assert.equal(stemOf('_tokens.scss', plain), 'tokens');
        assert.equal(stemOf('__init__.py', plain), 'init');
    });

    it('removes companions until nothing changes, but never the whole name', () => {
        const go = { companions: [/_test$/u, /_(linux|windows)$/u, /_(amd64|arm64)$/u] };
        assert.equal(stemOf('x_linux_amd64_test.go', go), 'x');
        const python = { companions: [/^test_/u] };
        assert.equal(stemOf('test_parser.py', python), 'parser');
        assert.equal(stemOf('test_.py', python), 'test');
    });
});

describe('subjectOf and groupKeyOf', () => {
    it('skips ignored leading words, but always keeps one', () => {
        const naming = { ignoreLeadingWords: new Set(['i', 'bp']) };
        assert.deepEqual(subjectOf(['i', 'user', 'service'], naming), ['user', 'service']);
        assert.deepEqual(subjectOf(['bp'], naming), ['bp']);
    });

    it('groups by the first words of the subject, and not by a number unless asked', () => {
        const [module] = modulesOf(['0001_initial.py'], plain);
        assert.ok(module);
        assert.equal(groupKeyOf(module, 1, plain), undefined);
        assert.equal(groupKeyOf(module, 1, { ...plain, groupNumericPrefixes: true }), '0001');
        const [other] = modulesOf(['user-list-item.ts'], plain);
        assert.ok(other);
        assert.equal(groupKeyOf(other, 2, plain), 'user-list');
        assert.equal(groupKeyOf(other, 4, plain), undefined);
    });
});

describe('modulesOf', () => {
    it('joins companions into one module, case-insensitively, sorted by stem', () => {
        const modules = modulesOf(['b.ts', 'a.spec.ts', 'a.ts', 'README.md', 'Readme.txt'], plain);
        assert.deepEqual(
            modules.map(module => [module.stem, module.files]),
            [
                ['README', ['README.md', 'Readme.txt']],
                ['a', ['a.spec.ts', 'a.ts']],
                ['b', ['b.ts']],
            ],
        );
    });
});

describe('folder names', () => {
    it('reads a folder name the way keys are written', () => {
        assert.equal(folderKeyOf('RenderTargets'), 'render-targets');
    });

    it('tells a key that restates the folder, or a folder above it, allowing the plural', () => {
        assert.equal(keyRestatesPath('render', 'cli/render'), true);
        assert.equal(keyRestatesPath('hook', 'src/hooks'), true);
        assert.equal(keyRestatesPath('match', 'src/matches'), true);
        assert.equal(keyRestatesPath('users', 'src/user'), true);
        assert.equal(keyRestatesPath('drag', 'src/cdk/drag-drop'), true);
        assert.equal(keyRestatesPath('color', 'components/ColorPicker'), true);
        assert.equal(keyRestatesPath('toolbar', 'src/aria/toolbar/testing'), true);
        assert.equal(keyRestatesPath('list-item', 'ui/list-item-group'), true);
        assert.equal(keyRestatesPath('render', 'cli'), false);
        assert.equal(keyRestatesPath('render', '.'), false);
        assert.equal(keyRestatesPath('rend', 'src/render'), false);
    });
});
