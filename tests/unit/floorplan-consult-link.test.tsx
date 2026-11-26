// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import type { FloorplanUnit } from "@/lib/move-in/floorplan";
import { getMoveInReturnContext, getSafeMoveInListUrl } from "@/lib/move-in/return-to";

const unit: FloorplanUnit = { projectId:"p", unitId:"u", buildingNo:"106", unitNo:"201", floor:2, currentGrade:"A", funding:"NORMAL", moveIn:"CONTACTED", effectiveIntent:"UNDECIDED", rentalType:null, specialReasons:[], balancePaidAt:null, actualMoveInDate:null, revision:"r", fetchedAt:"2026-11-26" };

test("a floorplan tile opens the consultation with its building in the return context", () => {
  const output = renderToStaticMarkup(createElement(FloorplanBoard, { projectId:"p", units:[unit], returnBuildingNo:"105" }));
  expect(output).toContain('/projects/p/move-in/units/u?returnTo=%2Fprojects%2Fp%2Fmove-in%2Ffloorplan%3FbuildingNo%3D105#consultation-create-form');
  expect(getMoveInReturnContext("p", "/projects/p/move-in/floorplan?buildingNo=105")).toEqual({kind:"floorplan",returnTo:"/projects/p/move-in/floorplan?buildingNo=105"});
  expect(getSafeMoveInListUrl("p", "/projects/other/move-in/floorplan")).toBeNull();
});

test("only an existing Today target is marked on the floorplan", () => {
  const output = renderToStaticMarkup(createElement(FloorplanBoard, { projectId:"p", units:[unit,{...unit,unitId:"other",unitNo:"202"}], todayUnitIds:["u"], focusUnitId:"u" }));
  expect(output.match(/data-today-target="true"/g)).toHaveLength(1);
  expect(output).toContain('id="floorplan-unit-u"');
  expect(output).toContain('data-focused-unit="true"');
});
