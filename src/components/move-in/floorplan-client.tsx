"use client";

import { useState } from "react";
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import { FloorplanFilters } from "@/components/move-in/floorplan-filters";
import { listBuildings, selectBuilding, type FloorplanColorMode, type FloorplanUnit } from "@/lib/move-in/floorplan";

// 서버가 RLS로 조회한 표시용 데이터만 받아 재사용한다. 표시 전환은 서버/API를 호출하지 않는다.
export function FloorplanClient({ projectId, units, initialBuildingNo, initialColorBy }: {
  projectId: string;
  units: FloorplanUnit[];
  initialBuildingNo: string;
  initialColorBy: FloorplanColorMode;
}) {
  const buildings = listBuildings(units);
  const [selectedBuilding, setSelectedBuilding] = useState(initialBuildingNo);
  const [colorBy, setColorBy] = useState(initialColorBy);
  const buildingNo = selectBuilding(buildings, selectedBuilding);
  return <>
    <FloorplanFilters buildings={buildings} buildingNo={buildingNo} colorBy={colorBy}
      onBuildingChange={setSelectedBuilding} onColorChange={setColorBy} />
    <FloorplanBoard projectId={projectId} units={units} buildingNo={buildingNo} colorBy={colorBy} />
  </>;
}
