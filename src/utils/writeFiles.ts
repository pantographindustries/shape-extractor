import { writeFile, mkdir } from "node:fs/promises";
import { format } from "node:path";

export async function writeRAW(directory: string, filename: string, data: any) {
  await mkdir(directory, { recursive: true });

  await writeFile(format({ dir: directory, base: filename }), data, {});
}

export async function writeJSON(
  directory: string,
  filename: string,
  data: any
) {
  const json_string_data = JSON.stringify(data, null, 4);
  await writeRAW(directory, filename, json_string_data);
}
