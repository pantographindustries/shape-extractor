import csvParser from "csv-parser";
import { createReadStream } from "node:fs";
import { format } from "node:path";
import stripBomStream from "strip-bom-stream";
import { Trip } from "gtfs-types";

function readGtfsTripsWithRoute(
  directory: string,
  matches: string[]
): Promise<{
  trips: Trip[];
  qty: number;
}> {
  const trips: Trip[] = [];
  let qty = 0;
  return new Promise((resolve, reject) => {
    createReadStream(format({ dir: directory, base: "trips.txt" }))
      .pipe(stripBomStream())
      .pipe(csvParser())
      .on("data", (data: Trip) => {
        if (matches.includes(data.route_id)) {
          trips.push(data);
          qty++;
        }
      })
      .on("end", () => {
        resolve({ trips, qty });
      });
  });
}

export { readGtfsTripsWithRoute };
