import { join } from 'https://deno.land/std@0.102.0/path/mod.ts';
import { JSZip } from 'https://deno.land/x/jszip@0.10.0/mod.ts';

export async function writeZippedStringToFile(folderPath: string, filenameWithoutExt: string, fileText: string) {
    const zip = new JSZip();
    zip.addFile(`${filenameWithoutExt}.json`, fileText);
    const writePath = join(folderPath, `${filenameWithoutExt}.zip`);
    const b: Uint8Array = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    await Deno.writeFile(writePath, b);
    console.log(`Wrote`, writePath);
}
