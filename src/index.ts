import {
  intro,
  spinner,
  text,
  log,
  multiselect,
  select,
  cancel,
  isCancel,
  outro,
} from "@clack/prompts";
import chalk from "chalk";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doFilesExist } from "./utils/doFilesExist";
import { PartialGtfsRoute, readGtfsRoutes } from "./components/readGtfsRoutes";
import { extendedGtfsRouteTypes } from "./utils/extendedGtfsRouteTypes";
import { readGtfsTripsWithRoute } from "./components/readGtfsTripsWithRoute";
import { extractShapeIdFromTrips } from "./components/extractShapeIdFromTrips";
import { readShapesWithIds } from "./components/readShapesWithIds";
import { exportGeojsonGrouped } from "./export/geojson-grouped";
import { exportGeojsonFull } from "./export/grojson-full";

const baseDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// dumb things
function semanticHeading(heading, text) {
  return chalk.bold(heading) + chalk.gray(` ${text}`);
}

// Boot the app

intro(chalk.blue.bgRed.bold("shape-extractor"));

const spin = spinner();

// Get GTFS files directory

const rawFilesDirectory = (await text({
  message: semanticHeading(
    "GTFS Input Directory",
    "The location of your extracted GTFS bundle"
  ),
  placeholder: "(relative path)",
  initialValue: "./workdir/gtfs/",
  validate(value) {
    if (
      !doFilesExist(join(baseDir, value), [
        "routes.txt",
        "trips.txt",
        "shapes.txt",
      ])
    ) {
      return "Provided directory does not contain the files routes.txt, trips.txt and shapes.txt.";
    }
  },
})) as string;

if (isCancel(rawFilesDirectory)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const filesDirectory = join(baseDir, rawFilesDirectory);

log.success(`Successfully found GTFS files in ${filesDirectory}`);

// parse and read routes from GTFS files

spin.start("Reading routes");

const routes = await readGtfsRoutes(filesDirectory);

spin.stop(`Read ${routes.qty} routes`);

const selectedRouteTypes = (await multiselect({
  message: semanticHeading(
    "Select route types to process",
    `(${[...routes.routes.keys()].length} types)`
  ),
  options: [...routes.routes.keys()]
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((rtype) => ({
      value: rtype,
      label: `${rtype} ${
        extendedGtfsRouteTypes.find((t) => t.c == parseInt(rtype))?.d
      }`,
      hint: `${routes.routes.get(rtype)?.length} routes`,
    })),
  required: true,
  initialValues: ["2", "401", "900"],
})) as string[];

if (isCancel(selectedRouteTypes)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const routesUnderRouteTypes: PartialGtfsRoute[] = [];

for (const routeType of selectedRouteTypes) {
  routes.routes.get(routeType)?.map((r) => {
    routesUnderRouteTypes.push(r);
  });
}

const selectedRoutesToProcess = (await multiselect({
  message: semanticHeading(
    `Select routes from ${selectedRouteTypes.length} types to process`,
    `(${routesUnderRouteTypes.length} routes)`
  ),
  options: routesUnderRouteTypes.map((r) => ({
    value: r.route_id,
    label: `${chalk
      .bgHex(r.route_color)
      .hex(r.route_text_color)
      .bold(` ${r.route_short_name} `)} ${r.route_long_name}`,
    hint: r.route_id,
  })),
  required: true,
  initialValues: routesUnderRouteTypes.map((r) => r.route_id),
})) as string[];

if (isCancel(selectedRoutesToProcess)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

log.info(`Will process ${selectedRoutesToProcess.length} routes...`);

const exportMode = await select({
  message: "Select export mode.",
  options: [
    {
      value: "export-tdif-full",
      label: "[FULL] TDIF-Partial Network Skeleton",
      hint: "recommended - A large TDIF-Partial file is generated with the following blocks: NetworkPartial[Line,Route], FixedGeoDef.",
    },
    {
      value: "export-tdif-grouped",
      label: "[PART] TDIF-Partial Network Skeleton",
      hint:
        "A TDIF-Partial file is generated for each route with the following blocks: NetworkPartial[Line,Route], FixedGeoDef. " +
        `Est... ${selectedRoutesToProcess.length} files`,
    },
    {
      value: "export-geojson-full",
      label: "[FULL] GeoJSON Shapefile Export",
      hint: "A single large GeoJSON file is generated with all shapes.",
    },
    {
      value: "export-geojson-grouped",
      label: "[PART] GeoJSON Per-Route Shapefile Export",
      hint:
        "A GeoJSON file is generated for each route. " +
        `Est... ${selectedRoutesToProcess.length} files`,
    },
  ],
});

if (isCancel(exportMode)) {
  cancel("Operation cancelled.");
  process.exit(0);
}
const node_boot_time = String(performance.timeOrigin).split(".")[0];

const rawExportFilesDirectory = (await text({
  message: semanticHeading(
    "Exported Files Directory",
    "The location where the exported files will be written to"
  ),
  placeholder: "(relative path)",
  initialValue: `./workdir/export-${node_boot_time}/`,
})) as string;

if (isCancel(rawFilesDirectory)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const exportFilesDirectory = join(baseDir, rawExportFilesDirectory);

// Start Processing

spin.start(
  `Reading trips with route information from ${selectedRoutesToProcess.length} routes`
);

const tripsWithRoute = await readGtfsTripsWithRoute(
  filesDirectory,
  selectedRoutesToProcess
);

spin.stop(`Found ${tripsWithRoute.qty} trips`);

spin.start(`Extracting shape IDs from ${tripsWithRoute.qty} trips`);

const shapeIds = extractShapeIdFromTrips(tripsWithRoute.trips);

spin.stop(`Extracted ${shapeIds.qty} shape IDs`);

spin.start(`Reading shapes with ${shapeIds.qty} shape IDs`);

const shapes = await readShapesWithIds(filesDirectory, shapeIds.shapes, (msg) =>
  spin.message(`Reading shapes with ${shapeIds.qty} shape IDs ${msg}`)
);

spin.stop(`Read ${shapes.qty} shapes with ${shapes.points} points`);

// Export

if (exportMode === "export-geojson-full") {
  // export geojson grouped
  spin.start(`Exporting GeoJSON file...`);

  await exportGeojsonFull(
    exportFilesDirectory,
    shapeIds.shapesAssociation,
    shapes.shapes,
    routes.routesMap
  );

  spin.stop(`Exported GeoJSON file.`);
} else if (exportMode === "export-geojson-grouped") {
  // export geojson grouped
  spin.start(`Exporting GeoJSON files for ${shapes.qty} shapes`);

  await exportGeojsonGrouped(
    exportFilesDirectory,
    shapeIds.shapesAssociation,
    shapes.shapes,
    routes.routesMap,
    (msg) => spin.message(msg)
  );

  spin.stop(`Exported ${shapes.qty} GeoJSON files`);
}

outro("Operation completed successfully.");
