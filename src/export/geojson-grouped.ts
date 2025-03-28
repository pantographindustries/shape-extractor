import { featureCollection, lineString } from "@turf/helpers";
import { PartialGtfsRoute } from "../components/readGtfsRoutes";
import { Shape } from "../components/readShapesWithIds";
import { writeJSON } from "../utils/writeFiles";

async function exportGeojsonGrouped(
  directory: string,
  shapesAssociation: Map<string, string[]>,
  shapes: Map<string, Shape>,
  routes: Map<string, PartialGtfsRoute>,
  update: (msg: string) => void
) {
  for (const [routeId, shapeIds] of shapesAssociation) {
    const routeData = routes.get(routeId) as any as PartialGtfsRoute;
    const finalisedShapeData = shapeIds.map((shapeId) => {
      update(`(route ${routeId}, shape ${shapeId})`);
      return lineString(shapes.get(shapeId)?.coords as [number, number][], {
        id: shapeId,
        title: "Route " + routeData.route_short_name,
        description: routeData.route_long_name,
        stroke: routeData.route_color,
      });
    });

    const fc = featureCollection(finalisedShapeData, {
      id: routeId,
    });

    update(`(route ${routeId}, [saving])`);
    writeJSON(directory, `${routeId}.geojson`, fc);
  }
}

export { exportGeojsonGrouped };
