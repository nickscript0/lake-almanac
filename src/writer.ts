import { join } from 'path';
import JSZip from 'jszip';
import { mkdir, writeFile } from 'fs/promises';

export async function writeZippedStringToFile(folderPath: string, filenameWithoutExt: string, fileText: string) {
    const zip = new JSZip();
    zip.file(`${filenameWithoutExt}.json`, fileText);
    await mkdir(folderPath, { recursive: true });
    const writePath = join(folderPath, `${filenameWithoutExt}.zip`);
    const b: Uint8Array = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    await writeFile(writePath, b);
    console.log(`Wrote`, writePath);
}
