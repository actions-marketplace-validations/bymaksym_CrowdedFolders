import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import { defineRule, lint } from './index.ts';

describe('lint()', () => {
    it('checks a list of files with a configuration object, the way docs/plugins.md tests a plugin', async () => {
        const genericNames = defineRule({
            meta: { description: 'no utils', defaultOptions: { names: ['utils'] } },
            check(folder, { options, report }) {
                if (options.names.includes(folder.name)) {
                    report({ message: 'says nothing', files: folder.files });
                }
            },
        });
        const result = await lint({
            config: { rules: { 'acme/generic-names': 'error' } },
            rules: { 'acme/generic-names': genericNames },
            files: ['src/utils/a.ts', 'src/user/b.ts'],
        });
        assert.deepEqual(
            result.findings.map(finding => `${finding.rule} ${finding.folder}`),
            ['acme/generic-names src/utils'],
        );
    });

    it('uses recommended when there is no configuration to find', async () => {
        const files = [
            'cli/render-json.ts',
            'cli/render-text.ts',
            'cli/render-pr.ts',
            'cli/render-sarif.ts',
            'cli/main.ts',
        ];
        // From a folder with no configuration above it, so the result does not depend on this repository's.
        const result = await lint({ cwd: tmpdir(), files });
        assert.deepEqual(
            result.findings.map(finding => finding.key),
            ['render'],
        );
        assert.equal(result.fileCount, 5);
    });
});
