#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function safeText(v) {
  return v == null ? '' : String(v);
}

function normalize(v) {
  return safeText(v).toLowerCase();
}

function stripComments(text) {
  text = safeText(text);
  text = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
  text = text.replace(/\/\/.*$/gm, '');
  return text;
}

function splitTopLevelComma(text) {
  const out = [];
  let cur = '';
  let p = 0, b = 0, c = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === '(') p++;
    else if (ch === ')') p = Math.max(0, p - 1);
    else if (ch === '[') b++;
    else if (ch === ']') b = Math.max(0, b - 1);
    else if (ch === '{') c++;
    else if (ch === '}') c = Math.max(0, c - 1);
    if (ch === ',' && p === 0 && b === 0 && c === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function normalizeDirection(v) {
  v = normalize(v);
  return v === 'input' || v === 'output' || v === 'inout' ? v : '';
}

function numericWidthFromRange(range) {
  const m = /^\[\s*(-?\d+)\s*:\s*(-?\d+)\s*\]$/.exec(safeText(range).trim());
  if (!m) return 0;
  return Math.abs(parseInt(m[1], 10) - parseInt(m[2], 10)) + 1;
}

function inferPinType(direction, name) {
  const n = normalize(name);
  if (n.includes('clk') || n.includes('clock')) return direction === 'output' ? 'clock_out' : 'clock_in';
  if (n.includes('rst') || n.includes('reset')) return 'reset_in';
  if (n.includes('en') || n.includes('enable')) return 'enable_in';
  if (n.includes('done') || n.includes('pass') || n.includes('fail') || n.includes('valid')) return 'status_out';
  if (direction === 'output') return 'data_out';
  if (direction === 'inout') return 'inout';
  return 'data_in';
}

function inferPinSide(direction) {
  if (direction === 'output') return 'east';
  if (direction === 'inout') return 'south';
  return 'west';
}

function parseAnsiPortChunk(chunk) {
  const s = safeText(chunk).replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const m = /^(input|output|inout)\s+(.*)$/i.exec(s);
  if (!m) return [];
  const dir = normalizeDirection(m[1]);
  let rest = m[2].replace(/\b(?:wire|reg|logic|signed|unsigned|var)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  let range = '';
  const rm = /^(\[[^\]]+\])\s*(.*)$/.exec(rest);
  if (rm) {
    range = rm[1].trim();
    rest = rm[2];
  }
  const names = splitTopLevelComma(rest);
  return names.map((nm) => safeText(nm).replace(/=[\s\S]*$/, '').trim()).filter(Boolean).map((name) => ({
    name,
    direction: dir,
    range
  }));
}

function parseBodyPorts(body) {
  const out = [];
  const re = /(?:^|;)\s*(input|output|inout)\s+([\s\S]*?);/gi;
  let m;
  while ((m = re.exec(body))) {
    const dir = normalizeDirection(m[1]);
    let rest = safeText(m[2]).replace(/\s+/g, ' ').trim();
    rest = rest.replace(/\b(?:wire|reg|logic|signed|unsigned|var)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    let range = '';
    const rm = /^(\[[^\]]+\])\s*(.*)$/.exec(rest);
    if (rm) {
      range = rm[1].trim();
      rest = rm[2];
    }
    splitTopLevelComma(rest).forEach((raw) => {
      const name = safeText(raw).replace(/=[\s\S]*$/, '').trim();
      if (!name) return;
      out.push({ name, direction: dir, range });
    });
  }
  return out;
}

function readBalanced(src, startIndex) {
  const open = src.charAt(startIndex);
  const close = open === '(' ? ')' : (open === '[' ? ']' : (open === '{' ? '}' : ''));
  if (!close) return null;
  let depth = 0;
  for (let i = startIndex; i < src.length; i++) {
    const ch = src.charAt(i);
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return { text: src.slice(startIndex + 1, i), end: i };
      }
    }
  }
  return null;
}

function extractModuleBlocks(content) {
  const src = stripComments(content);
  const out = [];
  let idx = 0;
  while (idx < src.length) {
    const hit = src.slice(idx).search(/\bmodule\b/);
    if (hit < 0) break;
    const pos = idx + hit;
    let p = pos + 6;
    while (p < src.length && /\s/.test(src.charAt(p))) p++;
    const nameMatch = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(src.slice(p));
    if (!nameMatch) { idx = p + 1; continue; }
    const moduleName = nameMatch[0];
    p += moduleName.length;
    while (p < src.length && /\s/.test(src.charAt(p))) p++;
    if (src.charAt(p) === '#') {
      p++;
      while (p < src.length && /\s/.test(src.charAt(p))) p++;
      if (src.charAt(p) === '(') {
        const params = readBalanced(src, p);
        if (!params) { idx = p + 1; continue; }
        p = params.end + 1;
      }
    }
    while (p < src.length && /\s/.test(src.charAt(p))) p++;
    if (src.charAt(p) !== '(') { idx = p + 1; continue; }
    const ports = readBalanced(src, p);
    if (!ports) { idx = p + 1; continue; }
    let afterPorts = ports.end + 1;
    while (afterPorts < src.length && /\s/.test(src.charAt(afterPorts))) afterPorts++;
    if (src.charAt(afterPorts) !== ';') { idx = afterPorts + 1; continue; }
    const endMatch = /\bendmodule\b/.exec(src.slice(afterPorts + 1));
    if (!endMatch) break;
    const bodyStart = afterPorts + 1;
    const bodyEnd = bodyStart + endMatch.index;
    out.push({ moduleName, portText: ports.text, bodyText: src.slice(bodyStart, bodyEnd) });
    idx = bodyEnd + endMatch[0].length;
  }
  return out;
}

function buildOrderedPorts(headerText, bodyPorts) {
  const names = splitTopLevelComma(headerText).map((item) => safeText(item).replace(/=[\s\S]*$/, '').trim()).filter(Boolean);
  if (!names.length) return bodyPorts;
  const byName = {};
  bodyPorts.forEach((port) => { byName[port.name] = port; });
  const out = [];
  names.forEach((name) => { if (byName[name]) out.push(byName[name]); });
  bodyPorts.forEach((port) => { if (!names.includes(port.name)) out.push(port); });
  return out;
}

function dedupePorts(ports) {
  const seen = new Set();
  const out = [];
  (ports || []).forEach((port) => {
    if (!port || !port.name) return;
    const key = normalize(port.name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(port);
  });
  return out;
}

function decoratePorts(ports) {
  return dedupePorts(ports).map((port) => {
    const range = safeText(port.range).trim();
    const width = numericWidthFromRange(range) || 1;
    return {
      name: port.name,
      direction: port.direction,
      range,
      width,
      isBus: !!range,
      side: inferPinSide(port.direction),
      pinType: inferPinType(port.direction, port.name),
      displayName: port.name + (range ? range.replace(/\s+/g, '') : ''),
      pinKey: safeText(port.name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'pin'
    };
  });
}

function parseVerilogModules(text, meta, sharedDiagnostics) {
  return extractModuleBlocks(text).map((block, idx) => {
    const headerParts = splitTopLevelComma(block.portText || '');
    let ansiPorts = [];
    let hasAnsi = false;
    headerParts.forEach((chunk) => {
      const parsed = parseAnsiPortChunk(chunk);
      if (parsed.length) hasAnsi = true;
      ansiPorts = ansiPorts.concat(parsed);
    });
    const ports = hasAnsi ? ansiPorts : buildOrderedPorts(block.portText || '', parseBodyPorts(block.bodyText || ''));
    return {
      moduleName: block.moduleName,
      sourceFileName: safeText(meta.name),
      sourcePath: safeText(meta.path),
      ports: decoratePorts(ports),
      diagnostics: [].concat(sharedDiagnostics || []),
      __id: `${safeText(meta.path || meta.name || 'file')}::${block.moduleName}::${idx}`
    };
  });
}

function runCommand(bin, args, cwd) {
  const res = cp.spawnSync(bin, args, {
    encoding: 'utf8',
    windowsHide: true,
    cwd: cwd || undefined,
    maxBuffer: 32 * 1024 * 1024
  });
  return {
    status: typeof res.status === 'number' ? res.status : 1,
    stdout: safeText(res.stdout),
    stderr: safeText(res.stderr),
    error: res.error ? String(res.error.message || res.error) : ''
  };
}

function collectDiagnostics(rawText) {
  if (!rawText) return [];
  let parsed = [];
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    return rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  return parsed.map((entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    const sev = safeText(entry.severity || entry.level || '').toLowerCase();
    const msg = safeText(entry.message || entry.text || entry.formatted || '');
    const file = safeText(entry.fileName || entry.file || entry.source || '');
    const line = entry.lineNumber || entry.line || entry.startLine || '';
    const prefix = [sev ? sev.toUpperCase() : '', file, line ? `:${line}` : ''].join('');
    return (prefix ? `${prefix} ` : '') + msg;
  }).filter(Boolean);
}

function parseOneFile(file, opts) {
  const slangPath = safeText(opts.slangPath || 'slang').trim() || 'slang';
  const defines = Array.isArray(opts.defines) ? opts.defines : [];
  const includeDirs = Array.isArray(opts.includeDirs) ? opts.includeDirs : [];
  const sharedArgs = [];

  includeDirs.forEach((dir) => {
    const value = safeText(dir).trim();
    if (!value) return;
    sharedArgs.push('-I', value);
  });
  defines.forEach((def) => {
    const value = safeText(def).trim();
    if (!value) return;
    sharedArgs.push('-D', value);
  });

  const preprocess = runCommand(slangPath, ['-E'].concat(sharedArgs, [file.path]), path.dirname(file.path));
  const diagRun = runCommand(slangPath, ['--parse-only', '--diag-json', '-'].concat(sharedArgs, [file.path]), path.dirname(file.path));

  const diagnostics = [];
  diagnostics.push(...collectDiagnostics(diagRun.stdout));
  if (diagRun.stderr) diagnostics.push(...collectDiagnostics(diagRun.stderr));

  if (preprocess.error) {
    throw new Error(`Unable to start slang (${slangPath}): ${preprocess.error}`);
  }
  if (preprocess.status !== 0 && !preprocess.stdout) {
    const extra = preprocess.stderr || diagRun.stderr || `slang exited with ${preprocess.status}`;
    throw new Error(extra);
  }

  const text = preprocess.stdout || fs.readFileSync(file.path, 'utf8');
  return {
    modules: parseVerilogModules(text, file, diagnostics),
    diagnostics
  };
}

function main() {
  const input = fs.readFileSync(0, 'utf8');
  const opts = JSON.parse(input || '{}');
  const files = Array.isArray(opts.files) ? opts.files : [];
  const modules = [];
  const diagnostics = [];
  if (!files.length) {
    process.stdout.write(JSON.stringify({ error: 'No HDL files were provided to the bridge.' }));
    return;
  }
  try {
    files.forEach((file) => {
      if (!file || !file.path) return;
      const result = parseOneFile(file, opts);
      modules.push(...result.modules);
      diagnostics.push(...result.diagnostics);
    });
    process.stdout.write(JSON.stringify({
      engine: 'slang-preprocess',
      language: 'verilog',
      modules,
      diagnostics
    }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: safeText(err && err.message || err) }));
  }
}

main();
