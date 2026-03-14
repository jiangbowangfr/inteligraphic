import React from "react";
import type { DftsTypeDef } from "../../shared/dfts/types";
import ThirdPartyWrapperGenTab from "../../shared/dfts/ui/ThirdPartyWrapperGenTab";
import { resolveThirdPartySourceItem } from "../../shared/third_party/thirdPartyWrapperHost";

type ThirdPartyWrapperDraft = {
  wrapperModuleName: string;
  scope: "project" | "software";
  selectedInputKeys: string[];
  selectedOutputKeys: string[];
  searchInput: string;
  searchOutput: string;
};

function trim(v: any) {
  return v == null ? "" : String(v).trim();
}

function normalize(v: any) {
  return v == null ? "" : String(v).toLowerCase();
}

function dirOf(port: any) {
  const s = normalize(port?.direction || port?.dir);
  if (s === "in") return "input";
  if (s === "out") return "output";
  return s;
}

function portKey(port: any, idx: number) {
  return trim(port?.pinKey || port?.name) || `pin_${idx + 1}`;
}

function createInitialDraft(graph: any, cell: any): ThirdPartyWrapperDraft {
  const item = resolveThirdPartySourceItem(graph, cell);
  const ports = Array.isArray(item?.ports) ? item.ports : [];
  const inputs = ports.filter((p: any) => dirOf(p) === "input");
  const outputs = ports.filter((p: any) => dirOf(p) === "output");
  const baseName = trim(
    item?.sourceModuleName || item?.moduleName || "third_party_ip",
  );

  return {
    wrapperModuleName: `${baseName}_tdr`,
    scope: normalize(item?.scope) === "software" ? "software" : "project",
    selectedInputKeys: inputs.map((p: any, idx: number) => portKey(p, idx)),
    selectedOutputKeys: outputs.map((p: any, idx: number) => portKey(p, idx)),
    searchInput: "",
    searchOutput: "",
  };
}

const ThirdPartyWrapperGenTabComponent: any =
  (ThirdPartyWrapperGenTab as any)?.default || ThirdPartyWrapperGenTab;

export const thirdPartyIpDefinition: DftsTypeDef = {
  type: "third_party_ip",
  title: "3rd Party IP",
  category: "third_party_ip",
  tabs: ["wrapper-gen", "ip-basic", "ip-layout", "preview"],
  extraTabs: [
    {
      id: "wrapper-gen",
      label: "Wrapper Gen",
      initial: ({ graph, cell }) => createInitialDraft(graph, cell),
      touchedCount: () => 0,
      apply: () => undefined,
      component: ThirdPartyWrapperGenTabComponent,
    },
  ],
};
