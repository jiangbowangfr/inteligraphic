import type { DftsTypeDef } from "../../shared/dfts/types";

export const floorplanModuleDefinition: DftsTypeDef = {
  type: "floorplan_module",
  title: "Floorplan Module",
  category: "floorplan",

  // 只保留基础页，不要 dft / layout / preview
  tabs: ["ip-basic"],

  specialFields: [
    {
      attr: "dftsFloorplan_moduleName",
      label: "Floorplan Module Name",
      kind: "string",
      defaultValue: "",
    },
    {
      attr: "dftsFloorplan_instanceName",
      label: "Module Instance Name",
      kind: "string",
      defaultValue: "",
    },
    {
      attr: "dftsFloorplan_designLevel",
      label: "Design Level",
      kind: "select",
      defaultValue: "",
      options: [
        { label: "Top", value: "top" },
        { label: "Subsystem", value: "subsystem" },
        { label: "Block", value: "block" },
        { label: "Module", value: "module" },
      ],
    },
  ],
};
