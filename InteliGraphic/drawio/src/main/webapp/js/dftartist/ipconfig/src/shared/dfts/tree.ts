// src/shared/dfts/tree.ts
export function buildTreeFromPaths(paths: string[]) {
  const root: any = {};
  for (const p of paths) {
    const parts = p.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const k = parts.slice(0, i + 1).join('/');
      cur.children = cur.children || {};
      cur.children[parts[i]] = cur.children[parts[i]] || { key: k, title: parts[i] };
      cur = cur.children[parts[i]];
    }
  }
  function toTree(node: any): any[] {
    if (!node.children) return [];
    return Object.values(node.children).map((n: any) => ({
      key: n.key,
      title: n.title,
      children: toTree(n),
    }));
  }
  return toTree(root);
}
