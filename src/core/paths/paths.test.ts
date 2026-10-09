import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { compileGlob, globProblem, matchesSelfOrAncestor } from './glob.ts';
import { buildTree, joinPath, normalisePath, parentOf } from './tree.ts';

describe('compileGlob', () => {
    const matches = (pattern: string, path: string): boolean => compileGlob(pattern).test(path);

    it('reads a pattern without a slash at any depth, like .gitignore', () => {
        assert.equal(matches('node_modules', 'node_modules'), true);
        assert.equal(matches('node_modules', 'packages/a/node_modules'), true);
        assert.equal(matches('*.md', 'docs/guide/intro.md'), true);
    });

    it('anchors a pattern with a slash at the root', () => {
        assert.equal(matches('src/*.ts', 'src/a.ts'), true);
        assert.equal(matches('src/*.ts', 'lib/src/a.ts'), false);
        assert.equal(matches('src/*.ts', 'src/a/b.ts'), false);
        assert.equal(matches('./src/a.ts', 'src/a.ts'), true);
    });

    it('anchors a single name with a leading slash, like .gitignore', () => {
        assert.equal(matches('/data', 'data'), true);
        assert.equal(matches('/data', 'lib/data'), false);
        assert.equal(matches('./data', 'lib/data'), false);
        assert.equal(matches('data', 'lib/data'), true);
    });

    it('lets ** stand for no segment or many', () => {
        assert.equal(matches('src/**/test', 'src/test'), true);
        assert.equal(matches('src/**/test', 'src/a/b/test'), true);
        assert.equal(matches('src/**', 'src/a/b.ts'), true);
        assert.equal(matches('**/res/*', 'app/src/main/res/layout'), true);
    });

    it('reads ?, braces and classes', () => {
        assert.equal(matches('v?.md', 'v1.md'), true);
        assert.equal(matches('*.{ts,tsx}', 'a.tsx'), true);
        assert.equal(matches('*.{ts,tsx}', 'a.js'), false);
        assert.equal(matches('[ab].ts', 'b.ts'), true);
        assert.equal(matches('[!ab].ts', 'c.ts'), true);
        assert.equal(matches('[!ab].ts', 'a.ts'), false);
    });

    it('treats regular-expression characters as text', () => {
        assert.equal(matches('a+b(c).ts', 'a+b(c).ts'), true);
        assert.equal(matches('a.ts', 'abts'), false);
    });

    it('matches the root folder as "."', () => {
        assert.equal(matches('.', '.'), true);
    });
});

describe('matchesSelfOrAncestor', () => {
    it('matches a path inside an excluded folder', () => {
        const globs = [compileGlob('fixtures')];
        assert.equal(matchesSelfOrAncestor('fixtures/vite/dist/main.js', globs), true);
        assert.equal(matchesSelfOrAncestor('src/fixtures.ts', globs), false);
        assert.equal(matchesSelfOrAncestor('src/a.ts', []), false);
    });
});

describe('globProblem', () => {
    it('explains a pattern that cannot be read', () => {
        assert.equal(globProblem('src/*.ts'), undefined);
        assert.match(globProblem('') ?? '', /empty/u);
        assert.match(globProblem('src/{a,b') ?? '', /open/u);
        assert.match(globProblem('a]') ?? '', /never opened/u);
        assert.match(globProblem(String.raw`src\a`) ?? '', /"\/"/u);
    });
});

describe('normalisePath', () => {
    it('writes every path the same way, and refuses one that leaves the root', () => {
        assert.equal(normalisePath(String.raw`.\src\a.ts`), 'src/a.ts');
        assert.equal(normalisePath('/src//a/../b.ts/'), 'src/b.ts');
        assert.equal(normalisePath('../a'), undefined);
        assert.equal(normalisePath('.'), undefined);
    });
});

describe('buildTree', () => {
    it('makes every folder above a file, sorted with the root first', () => {
        const tree = buildTree(['src/b/x.ts', 'src/a.ts', 'README.md']);
        assert.deepEqual(
            tree.map(folder => [folder.path, folder.depth, folder.files, folder.folders]),
            [
                ['.', 0, ['README.md'], ['src']],
                ['src', 1, ['a.ts'], ['b']],
                ['src/b', 2, ['x.ts'], []],
            ],
        );
        assert.equal(parentOf('a'), '.');
        assert.equal(joinPath('.', 'a'), 'a');
        assert.equal(joinPath('src', 'a'), 'src/a');
    });
});
