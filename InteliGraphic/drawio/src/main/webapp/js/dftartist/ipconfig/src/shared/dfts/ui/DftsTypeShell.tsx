// src/shared/dfts/ui/DftsTypeShell.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Tabs,
  Tag,
  Tree,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type {
  DftsCategory,
  DftsExtraTabDef,
  DftsPinDraft,
  DftsSymbolModel,
  DftsTypeDef,
  IpBasicsDraft,
  SpecialFieldDef,
} from "../types";
import { buildTreeFromPaths } from "../tree";
import { getCellAttr, getDftsTypeFromCell, setCellAttr } from "../cell";
import SchemaForm from "./SchemaForm";
import PreviewPanel from "./PreviewPanel";
import IpBasicsTab from "./IpBasicsTab";
import IpLayoutTab from "./IpLayoutTab";

const { Text, Title } = Typography;
type TreeNode = { key: string; title: string; children?: TreeNode[] };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.trim().toLowerCase();
  const visit = (items: TreeNode[]): TreeNode[] =>
    items.flatMap((item) => {
      const label = String(item.title || "").toLowerCase();
      const children = item.children ? visit(item.children) : [];
      return label.includes(q) || children.length
        ? [{ ...item, children }]
        : [];
    });
  return visit(nodes);
}
function humanPath(key: string) {
  return key ? key.split("/").join(" / ") : "";
}
function parseStyle(raw?: string | null, key?: string) {
  if (!raw || !key) return null;
  for (const seg of String(raw).split(";")) {
    const idx = seg.indexOf("=");
    if (idx <= 0) continue;
    const k = seg.slice(0, idx).trim();
    if (k === key) return seg.slice(idx + 1).trim();
  }
  return null;
}
function getRawStyle(graph: any, cell: any) {
  try {
    const model = graph.getModel ? graph.getModel() : graph.model;
    return (
      (model?.getStyle ? model.getStyle(cell) : undefined) ?? cell?.style ?? ""
    );
  } catch {
    return cell?.style ?? "";
  }
}
function inferCategory(def: DftsTypeDef): DftsCategory {
  if (def.category) return def.category;
  return def.nodes && Object.keys(def.nodes).length ? "dft_ip" : "dft_ip";
}
function defaultTabsForCategory(category: DftsCategory): string[] {
  switch (category) {
    case "logic_gate":
      return ["ip-basic", "ip-layout", "preview"];
    case "interface":
    case "data_source":
    case "third_party_ip":
      return ["ip-basic", "ip-layout", "preview"];
    default:
      return ["dft", "ip-basic", "ip-layout", "preview"];
  }
}
function inferBodyLabel(graph: any, cell: any, fallback: string) {
  const fromAttr =
    getCellAttr(graph, cell, "dftsIP_bodyLabel", null) ||
    getCellAttr(graph, cell, "bodyLabel", null);
  if (fromAttr) return String(fromAttr);
  try {
    const model = graph.getModel ? graph.getModel() : graph.model;
    const val = model?.getValue?.(cell);
    if (val && typeof val.getAttribute === "function") {
      const attr =
        val.getAttribute("label") ||
        val.getAttribute("value") ||
        val.getAttribute("name");
      if (attr) return String(attr);
    }
    if (typeof val === "string" && val) return val;
  } catch {}
  try {
    const label = graph.convertValueToString?.(cell);
    if (label) return String(label);
  } catch {}
  return fallback;
}
function inferInstanceName(graph: any, cell: any) {
  return (
    getCellAttr(graph, cell, "dftsIP_instanceName", null) ||
    getCellAttr(graph, cell, "instanceName", null) ||
    getCellAttr(graph, cell, "instance", null) ||
    ""
  );
}
function asBool(v: any, d: boolean) {
  if (v === undefined || v === null || v === "") return d;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (["1", "true", "on", "yes"].includes(s)) return true;
  if (["0", "false", "off", "no"].includes(s)) return false;
  return d;
}
function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function encodeModel(model: any) {
  try {
    return encodeURIComponent(JSON.stringify(model));
  } catch {
    return "";
  }
}
function tryParseModel(raw: any): DftsSymbolModel | null {
  if (!raw) return null;
  if (typeof raw === "object" && Array.isArray(raw?.pins))
    return raw as DftsSymbolModel;
  const str = String(raw);
  const candidates = [str];
  try {
    candidates.push(decodeURIComponent(str));
  } catch {}
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && Array.isArray(parsed.pins)) return parsed;
    } catch {}
  }
  return null;
}
function readSymbolModel(
  graph: any,
  cell: any,
  titleFallback: string,
  instanceFallback: string,
): DftsSymbolModel {
  try {
    const ns = (window as any).DftsIP;
    const parsed = tryParseModel(ns?.Symbol?.getModel?.(cell));
    if (parsed) return parsed;
  } catch {}
  const attr = getCellAttr(graph, cell, "dftsIP_symbolModel", null);
  const styleValue = parseStyle(getRawStyle(graph, cell), "dftsIP_symbolModel");
  const parsed = tryParseModel(attr) || tryParseModel(styleValue);
  if (parsed) return parsed;
  return { title: titleFallback, instanceName: instanceFallback, pins: [] };
}
function normalizePins(model: DftsSymbolModel): DftsPinDraft[] {
  const sideFallback = ["west", "east", "north", "south"] as const;
  return (model.pins || []).map((pin: any, idx: number) => ({
    key: String(pin.key || pin.name || `pin_${idx}`),
    name: String(pin.name || pin.displayName || pin.key || `pin_${idx}`),
    displayName: pin.displayName != null ? String(pin.displayName) : undefined,
    dir: pin.dir || pin.direction || undefined,
    type: pin.type || undefined,
    busWidth: Number(pin.busWidth || pin.bus || 1) || 1,
    side: (pin.side || sideFallback[idx % 4]) as any,
    order: Number(pin.order ?? idx) || 0,
    visible: pin.visible == null ? true : !!pin.visible,
  }));
}
function writeBodyLabel(graph: any, cell: any, label: string) {
  setCellAttr(graph, cell, "dftsIP_bodyLabel", label || null);
  setCellAttr(graph, cell, "bodyLabel", label || null);
  try {
    graph.cellLabelChanged?.(cell, label, false);
  } catch {}
}
function applySymbolModel(
  graph: any,
  cell: any,
  baseModel: DftsSymbolModel,
  pins: DftsPinDraft[],
  title: string,
  instanceName: string,
) {
  const nextModel: DftsSymbolModel = {
    ...baseModel,
    title,
    instanceName,
    pins: pins.map((p) => ({
      ...p,
      displayName: p.displayName || p.name,
      direction: p.dir,
    })),
  };
  try {
    const ns = (window as any).DftsIP;
    if (ns?.Symbol?.setModel) {
      ns.Symbol.setModel(cell, nextModel);
      ns.Symbol.relayout?.(graph, cell);
      graph.refresh?.(cell);
      return;
    }
  } catch {}
  setCellAttr(graph, cell, "dftsIP_symbolModel", encodeModel(nextModel));
}
function countPinDiff(base: DftsPinDraft[], next: DftsPinDraft[]) {
  const map = new Map(base.map((p) => [p.key, p]));
  return next.reduce((acc, pin) => {
    const b = map.get(pin.key);
    if (!b) return acc + 1;
    return b.side !== pin.side ||
      b.order !== pin.order ||
      b.visible !== pin.visible ||
      b.displayName !== pin.displayName ||
      b.name !== pin.name
      ? acc + 1
      : acc;
  }, 0);
}
function readInitialSpecialValues(
  graph: any,
  cell: any,
  fields: SpecialFieldDef[],
) {
  const out: Record<string, any> = {};
  fields.forEach((field) => {
    const raw = getCellAttr(graph, cell, field.attr, field.defaultValue);
    out[field.attr] =
      field.kind === "number"
        ? toNumber(raw)
        : (raw ?? field.defaultValue ?? "");
  });
  return out;
}
export default function DftsTypeShell(props: {
  def: DftsTypeDef;
  graph: any;
  cell: any;
  onClose: () => void;
}) {
  const { def, graph, cell, onClose } = props;
  const category = inferCategory(def);
  const nodes = def.nodes || {};
  const nodeKeys = useMemo(() => Object.keys(nodes), [nodes]);
  const rawTreeData = useMemo(
    () => buildTreeFromPaths(nodeKeys) as TreeNode[],
    [nodeKeys],
  );
  const extraTabs = (def.extraTabs || []) as DftsExtraTabDef[];
  const specialFields = def.specialFields || [];
  const defaultTabs = useMemo(() => {
    const base = defaultTabsForCategory(category);
    return extraTabs.length ? [...extraTabs.map((t) => t.id), ...base] : base;
  }, [category, extraTabs]);
  const visibleTabs = def.tabs && def.tabs.length ? def.tabs : defaultTabs;
  const firstTab = visibleTabs[0] || "ip-basic";
  const [activeTab, setActiveTab] = useState<string>(firstTab);
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(firstTab);
  }, [activeTab, firstTab, visibleTabs]);
  const [selected, setSelected] = useState<string>(
    def.defaultNode ?? nodeKeys[0] ?? "",
  );
  const [search, setSearch] = useState("");
  const [shadow, setShadow] = useState<Record<string, Record<string, any>>>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const initialRef = useRef<Record<string, Record<string, any>>>({});
  const initialBasics = useMemo<IpBasicsDraft>(
    () => ({
      bodyLabel: inferBodyLabel(
        graph,
        cell,
        def.title.replace(/^DFT\s*[·•-]\s*/i, ""),
      ),
      instanceName: String(inferInstanceName(graph, cell) || ""),
      showInstance: asBool(
        getCellAttr(
          graph,
          cell,
          "dftsIP_showInstance",
          getCellAttr(graph, cell, "showInstance", "1"),
        ),
        true,
      ),
      lockBodyLabel: asBool(
        getCellAttr(
          graph,
          cell,
          "dftsIP_lockBodyLabel",
          getCellAttr(graph, cell, "lockBodyLabel", "0"),
        ),
        false,
      ),
      width: toNumber(
        getCellAttr(
          graph,
          cell,
          "dftsIP_defaultWidth",
          getCellAttr(graph, cell, "width", undefined),
        ),
      ),
      height: toNumber(
        getCellAttr(
          graph,
          cell,
          "dftsIP_defaultHeight",
          getCellAttr(graph, cell, "height", undefined),
        ),
      ),
    }),
    [graph, cell, def.title],
  );
  const initialBasicsRef = useRef<IpBasicsDraft>(clone(initialBasics));
  const [basicDraft, setBasicDraft] = useState<IpBasicsDraft>(initialBasics);
  const initialSpecials = useMemo(
    () => readInitialSpecialValues(graph, cell, specialFields),
    [graph, cell, specialFields],
  );
    const rawCellTypeRef = useRef<string>(
        getDftsTypeFromCell(graph, cell) || def.type
    );
  const initialSpecialsRef = useRef<Record<string, any>>(
    clone(initialSpecials),
  );
  const [specialDraft, setSpecialDraft] = useState<Record<string, any>>(
    clone(initialSpecials),
  );
  const symbolModel = useMemo(
    () =>
      readSymbolModel(
        graph,
        cell,
        initialBasics.bodyLabel,
        initialBasics.instanceName,
      ),
    [graph, cell, initialBasics.bodyLabel, initialBasics.instanceName],
  );
  const initialModelRef = useRef<DftsSymbolModel>(clone(symbolModel));
  const initialPins = useMemo(() => normalizePins(symbolModel), [symbolModel]);
  const [layoutBaselinePins, setLayoutBaselinePins] = useState<DftsPinDraft[]>(
    clone(initialPins),
  );
  const [layoutPins, setLayoutPins] = useState<DftsPinDraft[]>(
    clone(initialPins),
  );
  const initialExtraDrafts = useMemo(() => {
    const map: Record<string, any> = {};
    extraTabs.forEach((tab) => {
      map[tab.id] = tab.initial({ def, graph, cell });
    });
    return map;
  }, [extraTabs, def, graph, cell]);
  const extraInitialRef = useRef<Record<string, any>>(
    clone(initialExtraDrafts),
  );
  const [extraDrafts, setExtraDrafts] = useState<Record<string, any>>(
    clone(initialExtraDrafts),
  );
  const treeData = useMemo(
    () => filterTree(rawTreeData, search),
    [rawTreeData, search],
  );
  const selectedNode = nodes[selected];
  const getCellRaw = (attr: string) => {
    const MISSING = Symbol("MISSING");
    const v = getCellAttr(graph, cell, attr, MISSING);
    return v === MISSING ? undefined : v;
  };
  const getInitialValuesForNode = (nodeKey: string) => {
    if (shadow[nodeKey]) return shadow[nodeKey];
    const node = nodes[nodeKey];
    const init: Record<string, any> = {};
    for (const f of node?.fields ?? [])
      init[f.attr] = getCellAttr(graph, cell, f.attr, f.defaultValue);
    if (!initialRef.current[nodeKey]) initialRef.current[nodeKey] = init;
    return init;
  };
  const handleFormChange = (values: Record<string, any>) =>
    setShadow((prev) => ({ ...prev, [selected]: values }));
  const hasDftTab = visibleTabs.includes("dft") && nodeKeys.length > 0;
  const touchedFieldCount = useMemo(() => {
    let count = 0;
    for (const [nodeKey, values] of Object.entries(shadow)) {
      const node = nodes[nodeKey];
      if (!node) continue;
      for (const f of node.fields) {
        const raw = values?.[f.attr];
        const normalized = f.normalize ? f.normalize(raw) : raw;
        const base = initialRef.current[nodeKey]?.[f.attr];
        const baseNormalized = f.normalize ? f.normalize(base) : base;
        if (!Object.is(normalized, baseNormalized)) count += 1;
      }
    }
    return count;
  }, [shadow, nodes]);
  const basicTouchedCount = useMemo(() => {
    const base = initialBasicsRef.current;
    return (
      [
        "bodyLabel",
        "instanceName",
        "showInstance",
        "lockBodyLabel",
        "width",
        "height",
      ] as const
    ).reduce(
      (acc, key) => acc + (Object.is(base[key], basicDraft[key]) ? 0 : 1),
      0,
    );
  }, [basicDraft]);
  const specialTouchedCount = useMemo(
    () =>
      specialFields.reduce(
        (acc, field) =>
          acc +
          (Object.is(
            initialSpecialsRef.current[field.attr],
            specialDraft[field.attr],
          )
            ? 0
            : 1),
        0,
      ),
    [specialFields, specialDraft],
  );
  const layoutTouchedCount = useMemo(
    () => countPinDiff(layoutBaselinePins, layoutPins),
    [layoutBaselinePins, layoutPins],
  );
  const extraTouchedCount = useMemo(
    () =>
      extraTabs.reduce((acc, tab) => {
        const initial = extraInitialRef.current[tab.id];
        const current = extraDrafts[tab.id];
        if (!tab.touchedCount)
          return (
            acc + (JSON.stringify(initial) === JSON.stringify(current) ? 0 : 1)
          );
        return acc + tab.touchedCount(initial, current);
      }, 0),
    [extraTabs, extraDrafts],
  );
  const totalTouched =
    touchedFieldCount +
    basicTouchedCount +
    specialTouchedCount +
    layoutTouchedCount +
    extraTouchedCount;
  const resetAfterApply = () => {
    setShadow({});
    initialRef.current = {};
    initialBasicsRef.current = clone(basicDraft);
    initialSpecialsRef.current = clone(specialDraft);
    initialModelRef.current = {
      ...initialModelRef.current,
      title: basicDraft.bodyLabel,
      instanceName: basicDraft.instanceName,
      pins: clone(layoutPins),
    };
    setLayoutBaselinePins(clone(layoutPins));
    extraInitialRef.current = clone(extraDrafts);
    setRefreshToken((v) => v + 1);
  };
  const applyChanges = (closeAfter: boolean) => {
    const model = graph.getModel ? graph.getModel() : graph.model;
    model.beginUpdate();
    try {
      if (hasDftTab) {
        for (const [nodeKey, values] of Object.entries(shadow)) {
          const node = nodes[nodeKey];
          if (!node) continue;
          for (const f of node.fields) {
            const raw = values?.[f.attr];
            const normalized = f.normalize ? f.normalize(raw) : raw;
            const base = initialRef.current[nodeKey]?.[f.attr];
            const baseNormalized = f.normalize ? f.normalize(base) : base;
            if (Object.is(normalized, baseNormalized)) continue;
            const defaultNormalized = f.normalize
              ? f.normalize(f.defaultValue)
              : f.defaultValue;
            if (
              f.defaultValue !== undefined &&
              Object.is(normalized, defaultNormalized)
            )
              setCellAttr(graph, cell, f.attr, null);
            else setCellAttr(graph, cell, f.attr, normalized);
          }
        }
      }
      if (!Object.is(initialBasicsRef.current.bodyLabel, basicDraft.bodyLabel))
        writeBodyLabel(graph, cell, basicDraft.bodyLabel);
      if (
        !Object.is(
          initialBasicsRef.current.instanceName,
          basicDraft.instanceName,
        )
      ) {
        setCellAttr(
          graph,
          cell,
          "dftsIP_instanceName",
          basicDraft.instanceName || null,
        );
        setCellAttr(
          graph,
          cell,
          "instanceName",
          basicDraft.instanceName || null,
        );
      }
      if (
        !Object.is(
          initialBasicsRef.current.showInstance,
          basicDraft.showInstance,
        )
      )
        setCellAttr(
          graph,
          cell,
          "dftsIP_showInstance",
          basicDraft.showInstance ? "1" : "0",
        );
      if (
        !Object.is(
          initialBasicsRef.current.lockBodyLabel,
          basicDraft.lockBodyLabel,
        )
      )
        setCellAttr(
          graph,
          cell,
          "dftsIP_lockBodyLabel",
          basicDraft.lockBodyLabel ? "1" : "0",
        );
      if (!Object.is(initialBasicsRef.current.width, basicDraft.width))
        setCellAttr(
          graph,
          cell,
          "dftsIP_defaultWidth",
          basicDraft.width ?? null,
        );
      if (!Object.is(initialBasicsRef.current.height, basicDraft.height))
        setCellAttr(
          graph,
          cell,
          "dftsIP_defaultHeight",
          basicDraft.height ?? null,
        );
      specialFields.forEach((field) => {
        const next = specialDraft[field.attr];
        const prev = initialSpecialsRef.current[field.attr];
        if (Object.is(prev, next)) return;
        setCellAttr(graph, cell, field.attr, next ?? null);
      });
      let handledSymbol = false;
      if (def.applySpecialBasics) {
        def.applySpecialBasics({
          def,
          graph,
          cell,
          basicDraft,
          specialDraft,
          layoutPins,
        });
      }
      for (const tab of extraTabs) {
        const res = tab.apply?.({
          def,
          graph,
          cell,
          draft: extraDrafts[tab.id],
          basicDraft,
          layoutPins,
        });
        if (res && typeof res === "object" && res.handledSymbol)
          handledSymbol = true;
      }
      if (!handledSymbol && (layoutTouchedCount > 0 || basicTouchedCount > 0))
        applySymbolModel(
          graph,
          cell,
          initialModelRef.current,
          layoutPins,
          basicDraft.bodyLabel,
          basicDraft.instanceName,
        );
        setCellAttr(graph, cell, 'dftsIP_type', rawCellTypeRef.current || def.type);
    } finally {
      model.endUpdate();
    }
    resetAfterApply();
    if (closeAfter) onClose();
  };
  const renderTreeTitle = (node: TreeNode) => {
    const dirty = Object.keys(shadow).some(
      (k) => k === node.key || k.startsWith(`${node.key}/`),
    );
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.title}
        </span>
        {dirty ? <Badge color="#2563EB" /> : null}
      </div>
    );
  };
  const pinSummary = useMemo(
    () => ({
      pins: layoutPins.length,
      inputs: layoutPins.filter((p) => (p.dir || "").toLowerCase() === "input")
        .length,
      outputs: layoutPins.filter(
        (p) => (p.dir || "").toLowerCase() === "output",
      ).length,
      hidden: layoutPins.filter((p) => !p.visible).length,
    }),
    [layoutPins],
  );
  const dftParamPane = hasDftTab ? (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "300px minmax(520px, 1fr) minmax(360px, 420px)",
        gap: 16,
      }}
    >
      <Card
        size="small"
        style={{ borderRadius: 12, borderColor: "#E2E8F0", minHeight: 0 }}
        styles={{
          body: {
            height: "100%",
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "auto auto minmax(0,1fr)",
            padding: 12,
          },
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <Input
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索参数节点"
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
          />
        </div>
        <div style={{ marginBottom: 10, padding: "0 4px" }}>
          <Text type="secondary">DFT IP 共用同一套 DFT 参数树。</Text>
        </div>
        <div style={{ minHeight: 0, overflow: "auto", paddingRight: 4 }}>
          <Tree
            className="dfts-tree"
            blockNode
            defaultExpandAll
            selectedKeys={[selected]}
            treeData={treeData as any}
            onSelect={(keys) => keys[0] && setSelected(String(keys[0]))}
            titleRender={(node: any) => renderTreeTitle(node)}
          />
        </div>
      </Card>
      <Card
        size="small"
        style={{ borderRadius: 12, borderColor: "#E2E8F0", minHeight: 0 }}
        styles={{
          body: {
            height: "100%",
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "auto auto minmax(0,1fr)",
            padding: 0,
          },
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid #EEF2F7",
          }}
        >
          <Space size={10} align="center" wrap>
            <Title level={5} style={{ margin: 0, fontSize: 18 }}>
              {selectedNode?.title || "未选择节点"}
            </Title>
            <Tag
              color="default"
              style={{
                borderRadius: 999,
                background: "#F8FAFC",
                borderColor: "#E2E8F0",
                color: "#475569",
              }}
            >
              {humanPath(selected)}
            </Tag>
          </Space>
          {selectedNode?.description ? (
            <Text
              style={{
                display: "block",
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.65,
              }}
            >
              {selectedNode.description}
            </Text>
          ) : null}
        </div>
        <div
          style={{
            padding: "12px 20px",
            background: "#F8FAFC",
            borderBottom: "1px solid #EEF2F7",
            color: "#475569",
            fontSize: 12,
          }}
        >
          {selectedNode?.fields?.length ?? 0} 个字段 · 默认值不会写入 cell
        </div>
        <div style={{ minHeight: 0, overflow: "auto", padding: 20 }}>
          {selectedNode ? (
            <SchemaForm
              key={`${selected}-${refreshToken}`}
              nodeKey={selected}
              node={selectedNode}
              initialValues={getInitialValuesForNode(selected)}
              resetToken={refreshToken}
              onChange={handleFormChange}
            />
          ) : (
            <Empty description="请选择一个参数节点" />
          )}
        </div>
      </Card>
      <PreviewPanel
        def={def}
        nodeKey={selected}
        nodeLiveValues={shadow[selected] ?? getInitialValuesForNode(selected)}
        getCellRaw={getCellRaw}
        shadowAll={shadow}
      />
    </div>
  ) : (
    <Empty description="该分类不使用 DFT 参数页" />
  );
  const tabItems = visibleTabs.map((tabId) => {
    if (tabId === "dft") return { key: "dft", label: "DFT 参数" };
    if (tabId === "ip-basic") return { key: "ip-basic", label: "IP 基础参数" };
    if (tabId === "ip-layout")
      return { key: "ip-layout", label: "IP 界面布局" };
    if (tabId === "preview") return { key: "preview", label: "预览" };
    const extra = extraTabs.find((t) => t.id === tabId);
    return { key: tabId, label: extra?.label || tabId };
  });
  const activeExtra = extraTabs.find((t) => t.id === activeTab);
  const rawExtraComponent: any =
    (activeExtra as any)?.component || (activeExtra as any)?.render || null;
  const ActiveExtraComponent =
    (rawExtraComponent && rawExtraComponent.default) ||
    rawExtraComponent ||
    null;
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: "auto auto minmax(0,1fr) auto",
        background: "#F8FAFC",
      }}
    >
      <div
        style={{
          padding: "22px 24px 16px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Space align="center" size={10} wrap>
            <Title level={4} style={{ margin: 0, fontSize: 16 }}>
              {def.title.replace(/^DFT\s*[·•-]\s*/i, "")} Configuration
            </Title>
            <Tag color="blue" style={{ borderRadius: 999 }}>
              {def.type}
            </Tag>
            <Tag color="default" style={{ borderRadius: 999 }}>
              {category}
            </Tag>
            {totalTouched > 0 ? (
              <Tag color="processing" style={{ borderRadius: 999 }}>
                {totalTouched} 项待保存
              </Tag>
            ) : null}
          </Space>
          <Text type="secondary">
            页签由 category + extraTabs 决定：DFT IP 用 DFT 参数页；logic gate
            用「逻辑配置」；interface / data source 可直接隐藏 DFT 参数页。
          </Text>
        </Space>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems as any}
      />
      <div style={{ minHeight: 0, overflow: "hidden", padding: 16 }}>
        {activeTab === "dft" && dftParamPane}
        {activeTab === "ip-basic" && (
          <IpBasicsTab
            typeLabel={def.title.replace(/^DFT\s*[·•-]\s*/i, "")}
            categoryLabel={String(category)}
            summary={pinSummary}
            initialValues={initialBasicsRef.current}
            value={basicDraft}
            onChange={setBasicDraft}
            specialFields={specialFields}
            specialInitialValues={initialSpecialsRef.current}
            specialValues={specialDraft}
            onSpecialChange={setSpecialDraft}
          />
        )}
        {activeTab === "ip-layout" && (
          <IpLayoutTab
            title={basicDraft.bodyLabel}
            instanceName={basicDraft.instanceName}
            initialPins={layoutBaselinePins}
            pins={layoutPins}
            onChange={setLayoutPins}
          />
        )}
        {activeTab === "preview" && (
          <div
            style={{
              height: "100%",
              display: "grid",
              gridTemplateColumns: "minmax(360px, 420px) minmax(520px, 1fr)",
              gap: 16,
            }}
          >
            {hasDftTab ? (
              <PreviewPanel
                mode="full"
                def={def}
                nodeKey={selected}
                nodeLiveValues={
                  shadow[selected] ?? getInitialValuesForNode(selected)
                }
                getCellRaw={getCellRaw}
                shadowAll={shadow}
              />
            ) : (
              <Card
                size="small"
                title="分类说明"
                style={{ borderRadius: 12, borderColor: "#E2E8F0" }}
              >
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Text type="secondary">
                    {category === "logic_gate"
                      ? "Logic gate 不使用 DFT 参数树；预览页主要用于检查图元与布局摘要。"
                      : "该分类不使用 DFT 参数树。"}
                  </Text>
                </Space>
              </Card>
            )}
            <Card
              size="small"
              title="图元预览摘要"
              style={{ borderRadius: 12, borderColor: "#E2E8F0", minHeight: 0 }}
            >
              <Space wrap>
                <Tag color="processing" style={{ borderRadius: 999 }}>
                  DFT 修改：{touchedFieldCount}
                </Tag>
                <Tag color="processing" style={{ borderRadius: 999 }}>
                  基础属性：{basicTouchedCount}
                </Tag>
                {specialTouchedCount > 0 ? (
                  <Tag color="processing" style={{ borderRadius: 999 }}>
                    特殊参数：{specialTouchedCount}
                  </Tag>
                ) : null}
                <Tag color="processing" style={{ borderRadius: 999 }}>
                  布局修改：{layoutTouchedCount}
                </Tag>
                {extraTouchedCount > 0 ? (
                  <Tag color="processing" style={{ borderRadius: 999 }}>
                    扩展页：{extraTouchedCount}
                  </Tag>
                ) : null}
              </Space>
              <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.7 }}>
                这里用于保存前总检查。
              </div>
            </Card>
          </div>
        )}
        {activeExtra &&
          activeTab === activeExtra.id &&
          (ActiveExtraComponent ? (
            <ActiveExtraComponent
              def={def}
              graph={graph}
              cell={cell}
              draft={extraDrafts[activeExtra.id]}
              setDraft={(next: any) =>
                setExtraDrafts((prev) => ({ ...prev, [activeExtra.id]: next }))
              }
              basicDraft={basicDraft}
              setBasicDraft={setBasicDraft}
              layoutPins={layoutPins}
              setLayoutPins={setLayoutPins}
              layoutBaselinePins={layoutBaselinePins}
              setLayoutBaselinePins={setLayoutBaselinePins}
            />
          ) : (
            <Card
              size="small"
              style={{ borderRadius: 12, borderColor: "#E2E8F0" }}
            >
              <Space direction="vertical" size={10}>
                <Text type="danger">
                  扩展页组件未正确加载：{activeExtra.id}
                </Text>
              </Space>
            </Card>
          ))}
      </div>
      <div
        style={{
          padding: "14px 24px",
          background: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Space size={12} wrap>
          {hasDftTab ? (
            <Text type="secondary">DFT 修改：{touchedFieldCount}</Text>
          ) : null}
          <Text type="secondary">基础属性：{basicTouchedCount}</Text>
          {specialFields.length > 0 ? (
            <Text type="secondary">特殊参数：{specialTouchedCount}</Text>
          ) : null}
          <Text type="secondary">布局修改：{layoutTouchedCount}</Text>
          {extraTouchedCount > 0 ? (
            <Text type="secondary">扩展页：{extraTouchedCount}</Text>
          ) : null}
        </Space>
        <Space size={10}>
          <Button
            onClick={() => applyChanges(false)}
            disabled={totalTouched === 0}
          >
            Apply
          </Button>
          <Button type="primary" onClick={() => applyChanges(true)}>
            OK
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </Space>
      </div>
    </div>
  );
}
