// src/shared/dfts/cell.ts
function parseFromRawStyle(
  raw?: string | null,
  key = "dftsIP_type",
): string | null {
  if (!raw) return null;
  for (const seg of raw.split(";")) {
    if (!seg) continue;
    const i = seg.indexOf("=");
    if (i <= 0) continue;
    const k = seg.slice(0, i).trim();
    if (k === key) {
      const v = seg.slice(i + 1).trim();
      if (v) return v;
    }
  }
  return null;
}

/** 读取 dftsIP_type*/
export function getDftsTypeFromCell(
  graph: any,
  cell: any,
  key = "dftsIP_type",
): string | null {
  if (!graph || !cell) return null;
  const model = graph.getModel ? graph.getModel() : graph.model;

  // A) XML value attribute
  try {
    const val = model?.getValue?.(cell);
    if (val && typeof val.getAttribute === "function") {
      const v = val.getAttribute(key);
      if (v) return String(v);
    }
  } catch {}

  // B) raw style string
  try {
    const raw =
      (model?.getStyle ? model.getStyle(cell) : undefined) ?? cell.style;
    const v2 = parseFromRawStyle(raw, key);
    if (v2) return v2;
  } catch {}

  // C) parsed style map
  try {
    const styleMap = graph.getCellStyle ? graph.getCellStyle(cell) : null;
    const v3 = styleMap
      ? (window as any).mxUtils?.getValue(styleMap, key, null)
      : null;
    if (v3 != null && String(v3) !== "") return String(v3);
  } catch {}

  // D) drawio graph helper
  try {
    const v4 = graph.getAttributeForCell?.(cell, key, null);
    if (v4) return String(v4);
  } catch {}

  return null;
}

export function getCellAttr(graph: any, cell: any, attr: string, d?: any) {
  // draw.io helper
  try {
    if (graph?.getAttributeForCell)
      return graph.getAttributeForCell(cell, attr, d);
  } catch {}

  // fallback: XML value
  try {
    const model = graph.getModel ? graph.getModel() : graph.model;
    const val = model?.getValue?.(cell);
    if (val && typeof val.getAttribute === "function") {
      const v = val.getAttribute(attr);
      return v != null && v !== "" ? v : d;
    }
  } catch {}

  return d;
}

export function setCellAttr(graph: any, cell: any, attr: string, value: any) {
  const isEmpty = value == null || value === "";
  const v = isEmpty ? "" : String(value);

  if (isEmpty) {
    // Prefer removing the attribute entirely to avoid persisting defaults.
    let removed = false;
    try {
      if (graph?.setAttributeForCell) {
        graph.setAttributeForCell(cell, attr, null);
        removed = true;
      }
    } catch {}
    try {
      const model = graph.getModel ? graph.getModel() : graph.model;
      const val = model?.getValue?.(cell);
      if (val && typeof val.removeAttribute === "function") {
        val.removeAttribute(attr);
        model?.setValue?.(cell, val);
        removed = true;
      }
    } catch {}
    if (!removed) {
      try {
        if (graph?.setAttributeForCell) {
          graph.setAttributeForCell(cell, attr, "");
        }
      } catch {}
    }
    return;
  }

  try {
    if (graph?.setAttributeForCell) {
      graph.setAttributeForCell(cell, attr, v);
      return;
    }
  } catch {}

  // fallback: XML value
  try {
    const model = graph.getModel ? graph.getModel() : graph.model;
    const val = model?.getValue?.(cell);
    if (val && typeof val.setAttribute === "function") {
      val.setAttribute(attr, v);
      model?.setValue?.(cell, val);
    }
  } catch {}
}

export function getCellStyleString(cell: any): string {
  if (!cell) return "";
  if (typeof cell.getStyle === "function") return cell.getStyle() || "";
  return cell.style || "";
}

export function parseStyleMap(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;

  for (const item of style.split(";")) {
    if (!item) continue;
    const i = item.indexOf("=");
    if (i < 0) continue;
    const k = item.slice(0, i).trim();
    const v = item.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function getStyleValue(cell: any, key: string): string {
  const map = parseStyleMap(getCellStyleString(cell));
  return map[key] ?? "";
}

export function setStyleValue(
  graph: any,
  cell: any,
  key: string,
  value: string,
) {
  if (!graph || !cell) return;
  graph.getModel().beginUpdate();
  try {
    const style = getCellStyleString(cell);
    const map = parseStyleMap(style);

    if (value == null || value === "") {
      delete map[key];
    } else {
      map[key] = String(value);
    }

    const next = Object.entries(map)
      .map(([k, v]) => `${k}=${v}`)
      .join(";");

    graph.getModel().setStyle(cell, next);
  } finally {
    graph.getModel().endUpdate();
  }
}