// @ts-check
// Removes the folders given, so a build never ships a file whose source was deleted.
import { rmSync } from 'node:fs';

for (const folder of process.argv.slice(2)) {
    rmSync(folder, { recursive: true, force: true });
}
