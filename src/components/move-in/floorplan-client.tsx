"use client";

import { useState } from "react";
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import { FloorplanFilters } from "@/components/move-in/floorplan-filters";
import { listBuildings, selectBuilding, type FloorplanColorMode, type FloorplanUnit } from "@/lib/move-in/floorplan";

// Building changes reuse the narrow authorized DTO; no API calls or state inference.
export function FloorplanClient({ projectId, units, initialBuildingNo }: {
  projectId: string; units: FloorplanUnit[]; initialBuildingNo: string;
  /** Accepted for old callers; current grade is always the tile background. */
  initialColorBy?: FloorplanColorMode;
}) {
  const buildings = listBuildings(units);
  const [selectedBuilding, setSelectedBuilding] = useState(initialBuildingNo);
  const buildingNo = selectBuilding(buildings, selectedBuilding);
  return <>
    <FloorplanFilters buildings={buildings} buildingNo={buildingNo} onBuildingChange={setSelectedBuilding} />
    <FloorplanBoard projectId={projectId} units={units} buildingNo={buildingNo} />
  </>;
}
