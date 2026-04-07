import { setStyleValue } from "../../shared/dfts/cell";
import type { DftsTypeDef } from "../../shared/dfts/types";

export const floorplanModuleDefinition: DftsTypeDef = {
  type: "floorplan_module",
  title: "Floorplan Module",
  category: "floorplan",

  // 只保留基础页，不要 dft / layout / preview
  tabs: ["ip-basic"],

  specialFields: [
    {
      attr: "dftsFloorplan_designLevel",
      label: "Design Level",
      kind: "select",
      defaultValue: "physical_block",
      options: [
        { label: "Chip", value: "chip" },
        { label: "Physical Block", value: "physical_block" },
        { label: "Sub Block", value: "sub_block" },
      ],
    },
    {
      attr: "dftsFloorplan_logicOnly",
      label: "Logic Only",
      kind: "select",
      defaultValue: "off",
      options: [
        { label: "On", value: "on" },
        { label: "Off", value: "off" },
      ],
    },
    {
      attr: "dftsFloorplan_designFilelist",
      label: "Design Filelist",
      kind: "path",
      defaultValue: "",
      placeholder: "请选择文件路径",
    },
    {
      attr: "dftsFloorplan_designType",
      label: "Design Type",
      kind: "select",
      defaultValue: "hierarchical",
      options: [
        { label: "Hierarchical", value: "hierarchical" },
        { label: "Tiling", value: "tiling" },
      ],
    },
    {
      attr: "dftsFloorplan_fontSize",
      label: "Text Scale",
      kind: "number",
      defaultValue: 24,
      min: 6,
      max: 200,
      placeholder: "请输入字号",
      help: "控制模块标题文字大小。",
    },
  ],
  applySpecialBasics: ({ graph, cell, basicDraft, specialDraft }) => {
    setStyleValue(graph, cell, "movableLabel", "1");
    setStyleValue(
      graph,
      cell,
      "dftsFloorplan_moduleName",
      basicDraft.bodyLabel || "",
    );
    setStyleValue(
      graph,
      cell,
      "dftsFloorplan_instanceName",
      basicDraft.instanceName || "",
    );
    const fontSize = specialDraft.dftsFloorplan_fontSize;
    setStyleValue(
      graph,
      cell,
      "fontSize",
      fontSize == null || fontSize === "" ? "" : String(fontSize),
    );
  },
};
