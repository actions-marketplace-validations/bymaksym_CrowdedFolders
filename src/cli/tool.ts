import { readFileSync } from 'node:fs';

/** The name, version and home of this package, for reports and `--version`. */
export const TOOL = {
    name: 'crowded-folders',
    version: readVersion(),
    url: 'https://github.com/bymaksym/CrowdedFolders',
} as const;

function readVersion(): string {
    try {
        const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
            version?: unknown;
        };
        return typeof manifest.version === 'string' ? manifest.version : '0.0.0';
    } catch {
        return '0.0.0';
    }
}
