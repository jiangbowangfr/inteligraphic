function convertXmlToMermaid(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "text/xml");
  const root = xml.documentElement;

  const idToElement = {};
  const nodeLabels = {};
  const edges = [];

  // 建立 ID 映射
  root.querySelectorAll("*[id]")?.forEach(el => {
    const id = el.getAttribute("id");
    idToElement[id] = el;
  });

  // 提取 object 节点（实际图节点）
  const objects = Array.from(root.getElementsByTagName("object"));
  for (const obj of objects) {
    const id = obj.getAttribute("id");
    let label = obj.getAttribute("label") || id;
    label = label.replace(/<[^>]*>/g, "").trim(); // 去除 HTML 标签
    nodeLabels[id] = label;
  }

  // 提取边
  const cells = Array.from(root.getElementsByTagName("mxCell"));
  for (const cell of cells) {
    const source = cell.getAttribute("source");
    const target = cell.getAttribute("target");
    if (source && target) {
      edges.push({ source, target });
    }
  }

  // groupId => [child object IDs]
  const groupToChildren = {};
  for (const [id] of Object.entries(nodeLabels)) {
    const groupId = findParentObjectId(id, idToElement);
    if (groupId) {
      if (!groupToChildren[groupId]) groupToChildren[groupId] = [];
      groupToChildren[groupId].push(id);
    }
  }

  const mermaidLines = ["graph TD"];
  const renderedAsGroupLabel = new Set();

  // 渲染子图
  for (const [groupId, childIds] of Object.entries(groupToChildren)) {
    const groupEl = idToElement[groupId];

    // 忽略顶层 group
    if (
      groupEl?.tagName === "mxCell" &&
      groupEl?.getAttribute("parent") === "1"
    ) {
      continue;
    }

    // 忽略 object 类型（只处理纯 group）
    if (groupEl?.tagName === "object") continue;

    // 获取第一个 child object 的 label 作为子图名
    let subgraphLabel = `Group_${groupId}`;
    let skipId = null;
    for (const childId of childIds) {
      if (nodeLabels[childId]) {
        subgraphLabel = nodeLabels[childId];
        skipId = childId;
        renderedAsGroupLabel.add(childId);
        break;
      }
    }

const subgraphNodeId = sanitizeId(skipId || groupId); // 使用第一个 object 作为 no
mermaidLines.push(`  subgraph ${subgraphNodeId}["${subgraphLabel}"]`);    
//mermaidLines.push(`  subgraph ${sanitizeId(groupId)}["${subgraphLabel}"]`);
    for (const childId of childIds) {
      if (childId === skipId) continue; // 跳过用于标题的 object
      mermaidLines.push(`    ${sanitizeId(childId)}["${nodeLabels[childId]}"]`);
    }
    mermaidLines.push("  end");
  }

  // 渲染未分组的孤立 object 节点
  for (const [id, label] of Object.entries(nodeLabels)) {
    const groupId = findParentObjectId(id, idToElement);
    if (!groupId && !renderedAsGroupLabel.has(id)) {
      mermaidLines.push(`  ${sanitizeId(id)}["${label}"]`);
    }
  }

  // 渲染边
  for (const { source, target } of edges) {
    mermaidLines.push(`  ${sanitizeId(source)} --> ${sanitizeId(target)}`);
  }

  return mermaidLines.join("\n");
}

// 寻找 object 的 group 父节点（非顶层）
function findParentObjectId(objectId, idToElement) {
  const obj = idToElement[objectId];
  if (!obj) return null;

  const cell = obj.getElementsByTagName("mxCell")[0];
  if (!cell) return null;

  let parentId = cell.getAttribute("parent");
  const visited = new Set();

  while (parentId && parentId !== "1" && !visited.has(parentId)) {
    visited.add(parentId);
    const parentEl = idToElement[parentId];
    if (!parentEl) return null;

    // 如果 parent 是 object 包含的 mxCell
    for (const [otherId, el] of Object.entries(idToElement)) {
      if (el.tagName === "object") {
        const innerCell = el.getElementsByTagName("mxCell")[0];
        if (innerCell?.getAttribute("id") === parentId) {
          return otherId;
        }
      }
    }

    // 如果 parent 是 group（mxCell with style=group）
    if (
      parentEl.tagName === "mxCell" &&
      parentEl.getAttribute("style")?.includes("group")
    ) {
      const grandParent = parentEl.getAttribute("parent");
      if (grandParent && grandParent !== "1") {
        return parentId;
      } else {
        return null;
      }
    }

    parentId = parentEl.getAttribute("parent");
  }

  return null;
}

// ID 清洗，避免非法字符
function sanitizeId(id) {
  return `node_${id.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}


module.exports = convertXmlToMermaid;