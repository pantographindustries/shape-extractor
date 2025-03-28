import csvParser from "csv-parser";
import { createReadStream } from "node:fs";
import { format } from "node:path";
import stripBomStream from "strip-bom-stream";
import { Position, Shapes, Trip } from "gtfs-types";

export interface Shape {
  id: string;
  coords: [number, number][];
}

function readShapesWithIds(
  directory: string,
  matches: string[],
  update: (msg: string) => void
): Promise<{
  shapes: Map<string, Shape>;
  qty: number;
  points: number;
}> {
  const shapes: Map<string, [{ idx: number; pos: [number, number] }]> =
    new Map();
  let qty = 0,
    points = 0;
  return new Promise((resolve, reject) => {
    createReadStream(format({ dir: directory, base: "shapes.txt" }))
      .pipe(stripBomStream())
      .pipe(csvParser())
      .on("data", (data: Shapes) => {
        if (matches.includes(data.shape_id)) {
          points++;

          if (shapes.has(data.shape_id)) {
            shapes.get(data.shape_id)?.push({
              idx: parseInt(data.shape_pt_sequence as unknown as string),
              pos: [
                parseFloat(data.shape_pt_lon as any as string),
                parseFloat(data.shape_pt_lat as any as string),
              ],
            });
          } else {
            shapes.set(data.shape_id, [
              {
                idx: parseInt(data.shape_pt_sequence as unknown as string),
                pos: [
                  parseFloat(data.shape_pt_lon as any as string),
                  parseFloat(data.shape_pt_lat as any as string),
                ],
              },
            ]);
            qty++;
          }

          update(`(${qty} shapes, ${points} points)`);
        }
      })
      .on("end", () => {
        update(`(${qty} shapes, ${points} points [finalising])`);
        const shapesFinalised: Map<string, Shape> = new Map();
        shapes.forEach((value, key) => {
          shapesFinalised.set(key, {
            id: key,
            coords: value.sort((a, b) => a.idx - b.idx).map((v) => v.pos),
          });
        });
        resolve({ shapes: shapesFinalised, qty, points });
      });
  });
}

export { readShapesWithIds };
