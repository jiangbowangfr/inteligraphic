// src/shared/dfts/ui/PreviewPanel.tsx
import React, { useMemo, useState } from 'react';
import { Button, Card, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import type { DftsTypeDef } from '../types';

type LocalFieldDef = {
  attr: string;
  label?: string;
  defaultValue?: any;
  normalize?: (v: any) => any;
};

function isEmptyInput(v: any) {
  return v === undefined || v === null || v === '';
}

function toSpecValue(v: any) {
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  return String(v);
}

type BlockNode = {
  name: string;
  children: Map<string, BlockNode>;
  lines: string[];
};

function getOrCreateChild(parent: BlockNode, name: string) {
  let child = parent.children.get(name);
  if (!child) {
    child = { name, children: new Map(), lines: [] };
    parent.children.set(name, child);
  }
  return child;
}

function addLinesToTree(root: BlockNode, path: string, lines: string[]) {
  const parts = String(path || '')
    .split(/[\/.]/g)
    .map((s) => s.trim())
    .filter(Boolean);

  let cur = root;
  for (const p of parts) cur = getOrCreateChild(cur, p);
  cur.lines.push(...lines);
}

function renderTree(node: BlockNode, indentLevel: number): string {
  const indent = '    '.repeat(indentLevel);

  if (node.name === '__root__') {
    const out: string[] = [];
    for (const child of node.children.values()) {
      const s = renderTree(child, indentLevel);
      if (s) out.push(s);
    }
    return out.join('\n');
  }

  const childStrings: string[] = [];
  for (const child of node.children.values()) {
    const s = renderTree(child, indentLevel + 1);
    if (s) childStrings.push(s);
  }

  const hasOwnLines = node.lines.length > 0;
  const hasChild = childStrings.length > 0;
  if (!hasOwnLines && !hasChild) return '';

  const out: string[] = [];
  out.push(`${indent}${node.name} {`);

  if (hasOwnLines) {
    const innerIndent = '    '.repeat(indentLevel + 1);
    for (const line of node.lines) out.push(`${innerIndent}${line}`);
  }

  if (hasChild) out.push(...childStrings);
  out.push(`${indent}}`);
  return out.join('\n');
}

function buildSpec(params: {
  def: DftsTypeDef;
  nodeKey: string;
  nodeLiveValues: Record<string, any>;
  getCellRaw: (attr: string) => any;
  shadowAll?: Record<string, Record<string, any>>;
}) {
  const { def, nodeKey, nodeLiveValues, getCellRaw, shadowAll } = params;

  const allNodeKeys = Object.keys(def.nodes || {});
  if (!nodeKey) {
    const root: BlockNode = { name: '__root__', children: new Map(), lines: [] };
    let totalChanged = 0;

    for (const nk of allNodeKeys) {
      const n = def.nodes[nk];
      if (!n) continue;
      const fields = (n.fields ?? []) as LocalFieldDef[];
      if (!fields.length) continue;

      const live = ((shadowAll && shadowAll[nk]) || {}) as Record<string, any>;
      const changedLines: string[] = [];

      for (const f of fields) {
        const attr = f.attr;
        const outputKey = String(f.label || f.attr || '').trim() || attr;
        const norm = (v: any) => (f.normalize ? f.normalize(v) : v);

        const hasShadow = Object.prototype.hasOwnProperty.call(live, attr);
        const shadowRaw = hasShadow ? live[attr] : undefined;

        let cellRaw = getCellRaw ? getCellRaw(attr) : undefined;
        if (cellRaw === null) cellRaw = undefined;

        const defv = norm(f.defaultValue);
        const cell = norm(cellRaw);
        const baseline = cellRaw === undefined ? defv : cell;
        const shadowEffective = hasShadow && !isEmptyInput(shadowRaw) && !Object.is(norm(shadowRaw), baseline);

        if (shadowEffective) {
          const shadow = norm(shadowRaw);
          if (Object.is(shadow, defv)) continue;
          changedLines.push(`${outputKey} : ${toSpecValue(shadow)} ;`);
        } else {
          if (cellRaw === undefined) continue;
          if (Object.is(cell, defv)) continue;
          changedLines.push(`${outputKey} : ${toSpecValue(cell)} ;`);
        }
      }

      if (changedLines.length > 0) {
        totalChanged += changedLines.length;
        addLinesToTree(root, nk, changedLines);
      }
    }

    if (totalChanged === 0) {
      return {
        text: '当前 IP 没有非默认配置项。',
        changedCount: 0,
      };
    }

    const body = renderTree(root, 1);
    return {
      text: `read_config_data -in_wrapper $dftspec -from_string {\n${body}\n}`,
      changedCount: totalChanged,
    };
  }

  const prefix = nodeKey ? `${nodeKey}/` : '';
  const hasChildren = nodeKey ? allNodeKeys.some((k) => k.startsWith(prefix)) : false;

  const scopedKeys = hasChildren ? allNodeKeys.filter((k) => k === nodeKey || k.startsWith(prefix)) : [nodeKey];
  const root: BlockNode = { name: '__root__', children: new Map(), lines: [] };
  let totalChanged = 0;

  for (const nk of scopedKeys) {
    const n = def.nodes[nk];
    if (!n) continue;
    const fields = (n.fields ?? []) as LocalFieldDef[];
    if (!fields.length) continue;

    const live = ((shadowAll && shadowAll[nk]) || (nk === nodeKey ? nodeLiveValues : undefined) || {}) as Record<
      string,
      any
    >;

    const changedLines: string[] = [];

    for (const f of fields) {
      const attr = f.attr;
      const outputKey = String(f.label || f.attr || '').trim() || attr;
      const norm = (v: any) => (f.normalize ? f.normalize(v) : v);

      const hasShadow = Object.prototype.hasOwnProperty.call(live, attr);
      const shadowRaw = hasShadow ? live[attr] : undefined;

      let cellRaw = getCellRaw ? getCellRaw(attr) : undefined;
      if (cellRaw === null) cellRaw = undefined;

      const defv = norm(f.defaultValue);
      const cell = norm(cellRaw);
      const baseline = cellRaw === undefined ? defv : cell;

      const shadowEffective = hasShadow && !isEmptyInput(shadowRaw) && !Object.is(norm(shadowRaw), baseline);

      if (shadowEffective) {
        const shadow = norm(shadowRaw);
        if (Object.is(shadow, defv)) continue;
        changedLines.push(`${outputKey} : ${toSpecValue(shadow)} ;`);
      } else {
        if (cellRaw === undefined) continue;
        if (Object.is(cell, defv)) continue;
        changedLines.push(`${outputKey} : ${toSpecValue(cell)} ;`);
      }
    }

    if (changedLines.length > 0) {
      totalChanged += changedLines.length;
      addLinesToTree(root, nk, changedLines);
    }
  }

  if (totalChanged === 0) {
    return {
      text: '使用节点的所有参数均为默认值，无修改项。',
      changedCount: 0,
    };
  }

  const body = renderTree(root, 1);
  return {
    text: `read_config_data -in_wrapper $dftspec -from_string {\n${body}\n}`,
    changedCount: totalChanged,
  };
}

export default function PreviewPanel(props: {
  def: DftsTypeDef;
  nodeKey?: string;
  nodeLiveValues: Record<string, any>;
  getCellRaw: (attr: string) => any;
  shadowAll?: Record<string, Record<string, any>>;
  mode?: 'side' | 'full';
}) {
  const { def, nodeKey = '', nodeLiveValues, getCellRaw, shadowAll, mode = 'side' } = props;
  const [copied, setCopied] = useState(false);

  const spec = useMemo(
    () =>
      buildSpec({
        def,
        nodeKey,
        nodeLiveValues,
        getCellRaw,
        shadowAll,
      }),
    [def, nodeKey, nodeLiveValues, getCellRaw, shadowAll],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(spec.text);
      setCopied(true);
      message.success('已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      message.warning('复制失败，请手动复制');
    }
  };

  const specCard = (
    <Card
      size="small"
      title={<span style={{ fontWeight: 600 }}>DftSpec 预览</span>}
      extra={
        <Button type={copied ? 'primary' : 'default'} size="small" icon={<CopyOutlined />} onClick={handleCopy}>
          {copied ? '已复制' : '复制'}
        </Button>
      }
      style={{ borderRadius: 12, borderColor: '#E2E8F0', flex: 1, minHeight: 0 }}
      bodyStyle={{ padding: 0, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #E2E8F0',
          background: '#F8FAFC',
          color: '#475569',
          fontSize: 12,
        }}
      >
        {spec.changedCount > 0 ? `已检测到 ${spec.changedCount} 项非默认配置。` : '当前没有非默认配置项。'}
      </div>
      <pre
        style={{
          margin: 0,
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 16,
          background: '#0F172A',
          color: '#D6E4FF',
          fontSize: 12,
          lineHeight: 1.7,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      >
        {spec.text}
      </pre>
    </Card>
  );

  if (mode === 'full') {
    return <div style={{ height: '100%', minHeight: 0 }}>{specCard}</div>;
  }

  return <div style={{ height: '100%', minHeight: 0 }}>{specCard}</div>;
}
