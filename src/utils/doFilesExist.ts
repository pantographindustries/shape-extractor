import { existsSync } from "node:fs";
import { format } from "node:path";

function doFilesExist(directory: string, files: string[]) {
  return files.every((file) =>
    existsSync(format({ dir: directory, base: file }))
  );
}

export { doFilesExist };
