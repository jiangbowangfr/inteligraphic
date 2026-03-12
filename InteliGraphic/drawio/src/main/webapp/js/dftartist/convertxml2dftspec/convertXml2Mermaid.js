// convertXmlToMermaid.js — Draw.io plugin-side converter
// 用法：
//   const xml = c.getFileData(true);
//   const mmd = convertXmlToMermaid(xml, "LR"); // 方向：LR/TB/RL/BT
//   c.saveData("diagram.mmd", "mmd", mmd, "text/plain", false);

function convertXmlToMermaid(xmlString, direction) {
  // ---- 参数规范化，避免传 true/false 导致 "flowchart true" 错误 ----
  function normalizeDirection(d) {
    const allowed = new Set(["LR", "TB", "RL", "BT"]);
    if (typeof d === "string") {
      const u = d.trim().toUpperCase();
      if (allowed.has(u)) return u;
    }
    return "LR";
  }
  direction = normalizeDirection(direction);

  try {
    const doc = mxUtils.parseXml(xmlString || "");
    const root = doc.documentElement;

    // -----------------------------
    // Helpers: text cleaning / escaping
    // -----------------------------
    function escapeMermaidLabel(s) {
      if (s == null) return "";
      let out = String(s);
      out = out.replace(/&/g, "&amp;");     // 先转 &
      out = out.replace(/"/g, "&quot;");    // 再转 "
      out = out.replace(/\|/g, "&#124;");   // 避免 -->|label| 冲突
      out = out.replace(/\n/g, "<br/>");    // 多行
      return out;
    }

    function stripHtml(s) {
      if (!s) return "";

      // 反转义（两轮，处理 &amp;lt; 这类双重）
      function decodeOnce(str) {
        const ta = document.createElement("textarea");
        ta.innerHTML = str;
        return ta.value;
      }
      let txt = String(s);
      for (let i = 0; i < 2; i++) {
        const dec = decodeOnce(txt);
        if (dec === txt) break;
        txt = dec;
      }

      // 标签处理（JS 用 /i，不支持 (?i)）
      txt = txt
        // 换行型标签
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<hr[^>]*>/gi, "\n")
        .replace(/<\/\s*(p|div|li|h[1-6]|table|tr|td|th)\s*>/gi, "\n")
        // 块起始标签直接去掉
        .replace(/<\s*(p|div|li|h[1-6]|table|tr|td|th)[^>]*>/gi, "")
        // 内联标签去掉，不换行
        .replace(/<\/?\s*(span|b|u|i|strong|em|small|sup|sub|font)[^>]*>/gi, "")
        // 兜底：剩余标签全部去掉
        .replace(/<[^>]+>/g, "")
        // 空白规范
        .replace(/\u00a0|&nbsp;/gi, " ")
        .replace(/\r\n|\r/g, "\n")
        .replace(/\n{2,}/g, "\n")
        .trim();
      return txt;
    }

    function splitTitleBody(value) {
      const txt = stripHtml(value);
      if (!txt) return { title: "", body: [] };
      const lines = txt.split(/\n/).map((ln) => ln.trim()).filter(Boolean);
      if (!lines.length) return { title: "", body: [] };
      return { title: lines[0], body: lines.slice(1) };
    }

    function sanitizeId(raw) {
      let sid = String(raw || "").replace(/[^a-zA-Z0-9_]/g, "_");
      if (!/^[A-Za-z_]/.test(sid)) sid = "N_" + sid;
      return sid;
    }

    // -----------------------------
    // Parse draw.io DOM to structures
    // -----------------------------
    function parseGraph(rootEl) {
      const objectsById = {};
      const cellsById = {};
      const childrenByParent = {};

      function push(map, key, val) {
        (map[key] || (map[key] = [])).push(val);
      }

      // <object>
      const objList = rootEl.getElementsByTagName("object");
      for (let i = 0; i < objList.length; i++) {
        const obj = objList[i];
        const at = {};
        for (let j = 0; j < obj.attributes.length; j++) {
          const a = obj.attributes[j];
          at[a.name] = a.value;
        }
        if (at.id) objectsById[at.id] = at;
      }

      // <mxCell>
      const cellList = rootEl.getElementsByTagName("mxCell");
      for (let i = 0; i < cellList.length; i++) {
        const cell = cellList[i];
        const at = {};
        for (let j = 0; j < cell.attributes.length; j++) {
          const a = cell.attributes[j];
          at[a.name] = a.value;
        }
        const id = at.id;
        if (id) {
          cellsById[id] = at;
          const par = at.parent;
          if (par) push(childrenByParent, par, at);
        }
      }

      // edge + edgeLabel（边文字：edge 的子 vertex）
      const edges = [];
      Object.keys(cellsById).forEach((cid) => {
        const c = cellsById[cid];
        if (c.edge === "1") {
          let lbl = null;
          const kids = childrenByParent[cid] || [];
          for (let k = 0; k < kids.length; k++) {
            const ch = kids[k];
            if (ch.vertex === "1") {
              const v = stripHtml(ch.value);
              if (v) { lbl = v; break; }
            }
          }
          edges.push({ id: cid, source: c.source, target: c.target, label: lbl });
        }
      });

      function isAnchorCell(cellAttr) {
        return !!(cellAttr && (cellAttr.style || "").indexOf("shape=mxgraph.er.anchor") >= 0);
      }

      function isEdgeLabelVertex(cellId) {
        const c = cellsById[cellId] || {};
        const style = c.style || "";
        const parent = c.parent;
        if (style.indexOf("edgeLabel") >= 0) return true;
        if (parent && (cellsById[parent] || {}).edge === "1") return true;
        return false;
      }

      function getNodeAttr(nodeId) { return objectsById[nodeId] || cellsById[nodeId] || {}; }
      function getType(nodeId) { return (getNodeAttr(nodeId).type || "").trim(); }
      function getLabel(nodeId) {
        const obj = objectsById[nodeId];
        if (obj) return stripHtml(obj.label || "");
        const cell = cellsById[nodeId];
        if (cell) return stripHtml(cell.value || "");
        return nodeId;
      }

      function getPrettyLabel(nodeId) {
        const kids = childrenByParent[nodeId] || [];
        for (let i = 0; i < kids.length; i++) {
          const ch = kids[i];
          if (isAnchorCell(ch)) {
            const t = stripHtml(ch.value);
            if (t) return t;
          }
        }
        for (let i = 0; i < kids.length; i++) {
          const ch = kids[i];
          const val = stripHtml(ch.value);
          if (!val) continue;
          const low = val.toLowerCase();
          if (low.startsWith("controller") || low.startsWith("connection") ||
              low.startsWith("compactor") || low.startsWith("shiftpoweroptions") ||
              low.startsWith("edt_channels_in") || low.startsWith("edt_channels_out") ||
              low.startsWith("chaingroup")) {
            continue;
          }
          if (val.length < 200) return val;
        }
        const v = getLabel(nodeId);
        return v || nodeId;
      }

      return {
        objectsById,
        cellsById,
        childrenByParent,
        edges,
        getNodeAttr,
        getType,
        getLabel,
        getPrettyLabel,
        isAnchorCell,
        isEdgeLabelVertex,
      };
    }

    // -----------------------------
    // Build Mermaid
    // -----------------------------
    function buildMermaid(docRoot, direction) {
      const {
        objectsById,
        cellsById,
        childrenByParent,
        edges,
        getLabel,
        getPrettyLabel,
        isAnchorCell,
        isEdgeLabelVertex,
      } = parseGraph(docRoot);

      const nodeLabel = {};      // id -> HTML label (escaped)
      const insideSubgraph = new Set();

      // a) object 自身（如 INT_EDT/ScanHost），先记录其 label，后面作为兜底候选
      Object.keys(objectsById).forEach((oid) => {
        const at = objectsById[oid];
        const lbl = stripHtml(at.label || "");
        if (lbl) nodeLabel[oid] = escapeMermaidLabel(lbl);
      });

      // b) 所有 vertex=1 的 mxCell（面板、三角等），排除 edgeLabel 与 anchor
      Object.keys(cellsById).forEach((cid) => {
        const c = cellsById[cid];
        if (c.vertex !== "1") return;
        if (isEdgeLabelVertex(cid)) return;
        if (isAnchorCell(c)) return;

        const { title, body } = splitTitleBody(c.value);
        if (!title && (!body || !body.length)) return;

        const label = body && body.length
          ? escapeMermaidLabel(title) + "<br/>" + body.map(escapeMermaidLabel).join("<br/>")
          : escapeMermaidLabel(title);
        nodeLabel[cid] = label;

        // 是否属于某个 object（用于 subgraph 成员判断）
        // 真正收集成员放到 subgraph 构建里，这里不做记录。
      });

      // c) subgraph：凡 object 下存在 anchor 的，用 subgraph 包裹其直属 vertex 子节点
      const subgraphs = []; // [ [oid, title, members[]] ]
      Object.keys(objectsById).forEach((oid) => {
        const at = objectsById[oid];
        let title = null;

        (childrenByParent[oid] || []).some((ch) => {
          if (ch.vertex === "1" && isAnchorCell(ch)) {
            title = stripHtml(ch.value);
            return true;
          }
          return false;
        });
        if (!title) title = stripHtml(at.label || at.type || oid);

        const members = [];
        (childrenByParent[oid] || []).forEach((ch) => {
          const cid = ch.id;
          if (!cid) return;
          if (isAnchorCell(ch)) return;
          if (ch.vertex === "1" && !isEdgeLabelVertex(cid)) {
            if (nodeLabel[cid]) members.push(cid);
          }
        });

        if (members.length) {
          subgraphs.push([oid, title, members]);
          members.forEach((m) => insideSubgraph.add(m));
        }
      });

      // d) 选一个最好看的标签（用于补节点时）
      function pickLabelFor(id) {
        // 1) object 的 label
        if (objectsById[id] && objectsById[id].label) {
          return escapeMermaidLabel(stripHtml(objectsById[id].label));
        }
        // 2) anchor 作为“漂亮名”
        const kids = (childrenByParent[id] || []);
        for (const ch of kids) {
          if ((ch.style || "").indexOf("shape=mxgraph.er.anchor") >= 0) {
            const t = stripHtml(ch.value);
            if (t) return escapeMermaidLabel(t);
          }
        }
        // 3) cell 的标题/正文
        if (cellsById[id] && "value" in cellsById[id]) {
          const { title, body } = splitTitleBody(cellsById[id].value);
          if (title || (body && body.length)) {
            return body && body.length
              ? escapeMermaidLabel(title) + "<br/>" + body.map(escapeMermaidLabel).join("<br/>")
              : escapeMermaidLabel(title);
          }
        }
        // 4) 兜底：id
        return escapeMermaidLabel(id);
      }

      // e) 🔧 补：确保每条边的端点都有节点（除 subgraph 容器对象）
      edges.forEach(({ source: s, target: t }) => {
        [s, t].forEach((id) => {
          if (!id) return;
          if (nodeLabel[id]) return; // 已有
          const isObject = id in objectsById;
          const isSubgraphObject = isObject && subgraphs.some(([sgOid]) => sgOid === id);
          if (isSubgraphObject) return; // subgraph 容器不重复建
          nodeLabel[id] = pickLabelFor(id);
        });
      });

      // -----------------------------
      // 输出 Mermaid
      // -----------------------------
      const out = [];
      out.push(`flowchart ${direction}`);

      // 1) subgraphs
      subgraphs.forEach(([oid, title, members]) => {
        const sgId = sanitizeId(oid);
        out.push(`  subgraph ${sgId}["${escapeMermaidLabel(title)}"]`);
        members.forEach((mid) => {
          const nid = sanitizeId(mid);
          out.push(`    ${nid}["${nodeLabel[mid]}"]`);
        });
        out.push("  end");
        out.push("");
      });

      // 2) 其余节点（不在 subgraph 内，且不是 subgraph 容器对象）
      Object.keys(nodeLabel).forEach((nid) => {
        if (insideSubgraph.has(nid)) return;
        const isSubgraphObject = (nid in objectsById) && subgraphs.some(([sgOid]) => sgOid === nid);
        if (isSubgraphObject) return; // 容器 object 不重复输出
        out.push(`  ${sanitizeId(nid)}["${nodeLabel[nid]}"]`);
      });

      // 3) 边（有标签用 -->|label|）
      edges.forEach((e) => {
        const s = e.source, t = e.target;
        if (!s || !t) return;

        const sid = sanitizeId(s);
        const tid = sanitizeId(t);
        const lbl = e.label;

        if (lbl) out.push(`  ${sid} -->|${escapeMermaidLabel(lbl)}| ${tid}`);
        else out.push(`  ${sid} --> ${tid}`);
      });

      return out.join("\n") + "\n";
    }

    return buildMermaid(root, direction);
  } catch (e) {
    console.error("convertXmlToMermaid error:", e);
    return "";
  }
}