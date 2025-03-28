import { featureCollection, lineString } from "@turf/helpers";
import { PartialGtfsRoute } from "../components/readGtfsRoutes";
import { Shape } from "../components/readShapesWithIds";
import { writeJSON } from "../utils/writeFiles";
import { Feature, LineString } from "geojson";

async function exportGeojsonFull(
  directory: string,
  shapesAssociation: Map<string, string[]>,
  shapes: Map<string, Shape>,
  routes: Map<string, PartialGtfsRoute>
) {
  const shapeData: Feature<LineString>[] = [];

  for (const [routeId, shapeIds] of shapesAssociation) {
    const routeData = routes.get(routeId) as any as PartialGtfsRoute;
    const finalisedShapeData = shapeIds.map((shapeId) => {
      shapeData.push(
        lineString(shapes.get(shapeId)?.coords as [number, number][], {
          id: shapeId,
          title: "Route " + routeData.route_short_name,
          description: routeData.route_long_name,
          stroke: routeData.route_color,
        })
      );
    });
  }
  const fc = featureCollection(shapeData);
  writeJSON(directory, `export-geojson-full.geojson`, fc);
}

export { exportGeojsonFull };
