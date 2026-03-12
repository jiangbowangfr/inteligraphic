import { setCellAttr } from "../../shared/dfts/cell";
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
        { label: "Tailing", value: "tailing" },
      ],
    },
  ],
  applySpecialBasics: ({ graph, cell, basicDraft }) => {
    setCellAttr(graph, cell, "dftsFloorplan_moduleName", basicDraft.bodyLabel || null);
    setCellAttr(graph, cell, "dftsFloorplan_instanceName", basicDraft.instanceName || null);
  },
};
