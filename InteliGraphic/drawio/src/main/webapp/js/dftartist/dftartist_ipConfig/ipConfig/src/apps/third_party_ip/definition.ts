import React from "react";
import type { DftsTypeDef } from "../../shared/dfts/types";
import ThirdPartyWrapperGenTab from "../../shared/dfts/ui/ThirdPartyWrapperGenTab";
import {
  addGeneratedWrapperToLibrary,
  resolveThirdPartySourceItem,
} from "../../shared/third_party/thirdPartyWrapperHost";
import { generateDfxWrapper } from "../../shared/third_party/dfxWrapperGenerator";

type ThirdPartyWrapperDraft = {
  sourceType?: string;
  sourceItemKey?: string;
  wrapperModuleName: string;
  scope: "project" | "software";
  selectedInputPins: string[];
  selectedOutputPins: string[];
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

function portSide(port: any, fallbackDir: "input" | "output") {
  const side = normalize(port?.side);
  if (side === "east" || side === "west" || side === "north" || side === "south") {
    return side;
  }
  return fallbackDir === "output" ? "east" : "west";
}

function logWrapperSave(level: "info" | "warning" | "error", text: string) {
  try {
    const ui = (window as any).App?.editorUi;
    if (ui && typeof ui.logDockOutput === "function") {
      ui.logDockOutput(text, level, { source: "third-party-wrapper" });
    }
  } catch {}
  try {
    const fn =
      level === "error"
        ? console.error
        : level === "warning"
          ? console.warn
          : console.info;
    fn("[ThirdPartyWrapper]", text);
  } catch {}
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
    sourceType: trim(item?.dftsType || "third_party_ip"),
    sourceItemKey: trim(item?.key || ""),
    wrapperModuleName: `${baseName}_tdr`,
    scope: "project",
    selectedInputPins: inputs.map((p: any, idx: number) => portKey(p, idx)),
    selectedOutputPins: outputs.map((p: any, idx: number) => portKey(p, idx)),
  };
}

function diffCount(initial: ThirdPartyWrapperDraft, draft: ThirdPartyWrapperDraft) {
  return JSON.stringify(initial) === JSON.stringify(draft) ? 0 : 1;
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
      touchedCount: diffCount,
      applyAlwaysEnabled: true,
      apply: async ({ graph, cell, draft }) => {
        const sourceItem = resolveThirdPartySourceItem(graph, cell);
        if (!sourceItem) {
          throw new Error("未找到当前 third_party_ip 对应的源信息。");
        }

        const ports = Array.isArray(sourceItem.ports) ? sourceItem.ports : [];
        const inputPorts = ports.filter(
          (p: any) =>
            dirOf(p) === "input" &&
            (draft.selectedInputPins || []).includes(trim(p?.name)),
        );
        const outputPorts = ports.filter(
          (p: any) =>
            dirOf(p) === "output" &&
            (draft.selectedOutputPins || []).includes(trim(p?.name)),
        );

        logWrapperSave(
          "info",
          `Saving wrapper "${trim(draft.wrapperModuleName)}" from "${sourceItem.moduleName || sourceItem.sourceModuleName || sourceItem.key}" (inputs=${inputPorts.length}, outputs=${outputPorts.length}, scope=project).`,
        );

        const generated = generateDfxWrapper({
          moduleName: trim(draft.wrapperModuleName) || `${sourceItem.moduleName || sourceItem.sourceModuleName || "third_party"}_tdr`,
          inputPorts: inputPorts.map((p: any) => ({
            name: p.name,
            range: p.range || p.bus || "",
            side: portSide(p, "input"),
            direction: "input",
            busWidth: p.busWidth,
          })),
          outputPorts: outputPorts.map((p: any) => ({
            name: p.name,
            range: p.range || p.bus || "",
            side: portSide(p, "output"),
            direction: "output",
            busWidth: p.busWidth,
          })),
        });

        const created = await addGeneratedWrapperToLibrary({
          sourceItem,
          wrapperModuleName: generated.moduleName,
          scope: "project",
          generated,
        });

        logWrapperSave(
          "info",
          `Wrapper saved as "${created?.item?.moduleName || generated.moduleName}".`,
        );

        return {
          successMessage: `Wrapper 已保存：${created?.item?.moduleName || generated.moduleName}`,
        };
      },
      component: ThirdPartyWrapperGenTabComponent,
    },
  ],
};
