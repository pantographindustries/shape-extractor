import { Trip } from "gtfs-types";

function extractShapeIdFromTrips(trips: Trip[]): {
  shapes: string[];
  shapesAssociation: Map<string, string[]>;
  qty: number;
} {
  const shapeIds = trips.map((trip) => trip.shape_id);
  const shapesAssociation = new Map<string, string[]>();

  trips.forEach((trip) => {
    if (trip.shape_id === undefined) return;
    if (shapesAssociation.has(trip.route_id)) {
      shapesAssociation.get(trip.route_id)?.push(trip.shape_id);
    } else {
      shapesAssociation.set(trip.route_id, [trip.shape_id]);
    }
  });

  shapesAssociation.forEach((value, key) => {
    shapesAssociation.set(key, [...new Set(value)]);
  });

  const uniqueShapeIds = [...new Set(shapeIds)];

  return {
    shapes: uniqueShapeIds as string[],
    shapesAssociation,
    qty: uniqueShapeIds.length,
  };
}

export { extractShapeIdFromTrips };
