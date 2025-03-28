import csvParser from "csv-parser";
import { createReadStream } from "node:fs";
import { format } from "node:path";
import stripBomStream from "strip-bom-stream";

export interface PartialGtfsRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
  route_color: string;
  route_text_color: string;
}

function readGtfsRoutes(directory: string): Promise<{
  routes: Map<string, PartialGtfsRoute[]>;
  routesMap: Map<string, PartialGtfsRoute>;
  qty: number;
}> {
  const routes: Map<string, PartialGtfsRoute[]> = new Map();
  const routesMap: Map<string, PartialGtfsRoute> = new Map();
  let qty = 0;
  return new Promise((resolve, reject) => {
    createReadStream(format({ dir: directory, base: "routes.txt" }))
      .pipe(stripBomStream())
      .pipe(csvParser())
      .on("data", (data) => {
        qty++;
        const rData = {
          route_id: data.route_id,
          route_short_name: data.route_short_name,
          route_long_name: data.route_long_name,
          route_type: data.route_type,
          route_color: "#" + data.route_color,
          route_text_color: "#" + data.route_text_color,
        } as PartialGtfsRoute;
        if (routes.has(data.route_type)) {
          (routes.get(data.route_type) as PartialGtfsRoute[]).push(rData);
        } else {
          routes.set(data.route_type, [rData]);
        }
        routesMap.set(data.route_id, rData);
      })
      .on("end", () => {
        resolve({ routes, routesMap, qty });
      });
  });
}

export { readGtfsRoutes };
