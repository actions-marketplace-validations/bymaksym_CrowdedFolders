import { basename, join, relative } from 'node:path';

import { SCHEMA_URL } from '../../core/config/schema.ts';
import { runEngine } from '../../core/engine.ts';
import { type Detection, detectPresets, excludesFor } from '../../core/presets/detect.ts';
import { BUILT_IN_PRESETS } from '../../core/presets/index.ts';
import { CONFIG_NAMES, findConfig } from '../../node/config-file.ts';
import { loadConfig } from '../../node/load-config.ts';
import { type Args, UsageError } from '../args.ts';
import { type Io, writeFileAtomic } from '../io.ts';
import { dependenciesOf, type Session } from '../session.ts';

/**
 * Writes `crowded-folders.config.json` at the root with the presets that fit the repository, then
 * says how many problems it has today and how to adopt it without fixing them first.
 */
export async function init(args: Args, io: Io, session: Session): Promise<number> {
    const existing = findConfig(session.root);
    if (existing && !args.force) {
        throw new UsageError(`${existing.path} already exists: edit it, or pass --force to write a new one`);
    }
    // Never over a package.json that holds the configuration under a key: that file is not ours.
    const isReuse =
        existing !== undefined && existing.path.endsWith('.json') && basename(existing.path) !== 'package.json';
    const path = isReuse ? existing.path : join(session.root, CONFIG_NAMES[0]);

    const detections: Detection[] =
        args.presets.length > 0
            ? args.presets.map(preset => ({ preset, evidence: 'given with --preset', folders: ['.'] }))
            : detectPresets(session.files, dependenciesOf(session.root, session.files), BUILT_IN_PRESETS);
    const presets = [...new Set(detections.map(detection => detection.preset))];
    // A preset found in a sub-folder (a Flutter app in app/) gets its root-anchored excludes from there,
    // written down so that they can be read and changed.
    const exclude = excludesFor(detections, session.files, BUILT_IN_PRESETS);
    const config = { $schema: SCHEMA_URL, extends: presets, ...(exclude.length > 0 && { exclude }) };
    writeFileAtomic(path, `${JSON.stringify(config, undefined, 4)}\n`);

    const loaded = await loadConfig(config, path, session.root);
    const result = runEngine({ files: session.files, config: loaded.config, rules: loaded.rules });
    const errors = result.findings.filter(finding => finding.severity === 'error').length;

    const lines = [`Wrote ${relative(io.cwd, path) || path} with ${presets.join(', ')}:`];
    for (const detection of detections) {
        const preset = BUILT_IN_PRESETS[detection.preset];
        lines.push(
            `  ${detection.preset.padEnd(14)} ${detection.evidence}${preset ? ` — ${firstSentence(preset.description)}` : ''}`,
        );
    }
    lines.push('');
    if (errors === 0) {
        lines.push(
            `No crowded folders today (${result.folderCount} folders checked). Add \`crowded-folders\` to CI to keep it that way.`,
        );
    } else {
        lines.push(
            `${errors} problem${errors === 1 ? '' : 's'} today. To see them: crowded-folders`,
            'To adopt it without fixing them first: crowded-folders --suppress-all',
            '  (records them in crowded-folders-suppressions.json; they may not grow, and new ones fail)',
        );
    }
    lines.push('Presets and where each comes from: crowded-folders presets');
    io.write(`${lines.join('\n')}\n`);
    return 0;
}

function firstSentence(text: string): string {
    const end = text.indexOf('. ');
    return end === -1 ? text : text.slice(0, end + 1);
}
