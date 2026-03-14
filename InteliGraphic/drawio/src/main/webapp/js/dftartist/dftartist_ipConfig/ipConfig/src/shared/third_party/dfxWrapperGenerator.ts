export type ThirdPartyPort = {
  name: string;
  displayName?: string;
  direction?: string;
  dir?: string;
  range?: string;
  bus?: string;
  busWidth?: number;
  side?: string;
  type?: string;
  pinType?: string;
  order?: number;
  visible?: boolean;
};

export type WrapperGenerateInput = {
  moduleName: string;
  inputPorts: ThirdPartyPort[];
  outputPorts: ThirdPartyPort[];
};

export type WrapperGenerateResult = {
  moduleName: string;
  inputPorts: ThirdPartyPort[];
  outputPorts: ThirdPartyPort[];
  wrapperPorts: ThirdPartyPort[];
  verilogText: string;
  iclText: string;
};

function trim(v: any): string {
  return v == null ? '' : String(v).trim();
}

function normalizeDir(v: any): 'input' | 'output' | 'inout' | '' {
  const s = trim(v).toLowerCase();
  if (s === 'in') return 'input';
  if (s === 'out') return 'output';
  if (s === 'input' || s === 'output' || s === 'inout') return s;
  return '';
}

function busWidthFromRange(range: string): number | undefined {
  const m = /^\[(\d+)\s*:\s*(\d+)\]$/.exec(trim(range));
  if (!m) return undefined;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return Math.abs(a - b) + 1;
}

function normalizeRange(port: ThirdPartyPort): string {
  const explicit = trim(port.range || port.bus || '');
  if (explicit) return explicit;
  const width = Number(port.busWidth);
  if (Number.isFinite(width) && width > 1) return `[${width - 1}:0]`;
  return '';
}

function normalizePort(port: ThirdPartyPort, fallbackDir: 'input' | 'output', idx: number): ThirdPartyPort {
  const range = normalizeRange(port);
  const dir = normalizeDir(port.direction || port.dir) || fallbackDir;
  const width = busWidthFromRange(range) || (Number.isFinite(Number(port.busWidth)) ? Number(port.busWidth) : undefined);
  return {
    ...port,
    name: trim(port.name) || `pin_${idx + 1}`,
    displayName: trim(port.displayName || port.name),
    direction: dir,
    dir,
    range,
    busWidth: width,
    side: trim(port.side || ''),
    order: Number.isFinite(Number(port.order)) ? Number(port.order) : idx,
    visible: port.visible !== false,
  };
}

function sanitizeId(v: string): string {
  const out = trim(v).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return out || 'sig';
}

function portLabel(port: ThirdPartyPort): string {
  return `${trim(port.name)}${normalizeRange(port)}`;
}

function tdrName(port: ThirdPartyPort): string {
  return `${trim(port.name)}_tdr`;
}

function verilogDecl(kind: 'input' | 'output', port: ThirdPartyPort, overrideName?: string): string {
  const range = normalizeRange(port);
  const name = trim(overrideName || port.name);
  return `${kind} wire ${range ? `${range} ` : ''}${name}`;
}

function iclDecl(kind: 'DataInPort' | 'DataOutPort', port: ThirdPartyPort): string {
  const range = normalizeRange(port);
  const name = `${tdrName(port)}${range}`;
  if (kind === 'DataInPort') {
    return `${kind} ${name} {DefaultLoadValue ${range ? '0' : "1'b0"};}`;
  }
  return `${kind} ${name} {}`;
}

function buildOutputLogic(port: ThirdPartyPort): string[] {
  const range = normalizeRange(port);
  const clean = sanitizeId(port.name);
  if (!range) {
    return [
      `cell_and2 u_${clean}_out ( .Z(${port.name}), .A1(${tdrName(port)}), .A2(dfx_mode) );`,
    ];
  }
  const width = busWidthFromRange(range) || Number(port.busWidth) || 1;
  return [
    `genvar gi_${clean}_out;`,
    `generate`,
    `  for (gi_${clean}_out = 0; gi_${clean}_out < ${width}; gi_${clean}_out = gi_${clean}_out + 1) begin : gen_${clean}_out`,
    `    cell_and2 u_${clean}_out ( .Z(${port.name}[gi_${clean}_out]), .A1(${tdrName(port)}[gi_${clean}_out]), .A2(dfx_mode) );`,
    `  end`,
    `endgenerate`,
  ];
}

function buildInputLogic(port: ThirdPartyPort): string[] {
  const range = normalizeRange(port);
  const clean = sanitizeId(port.name);
  if (!range) {
    return [
      `cell_and2 u_${clean}_in ( .Z(${tdrName(port)}), .A1(${port.name}), .A2(dfx_mode) );`,
    ];
  }
  const width = busWidthFromRange(range) || Number(port.busWidth) || 1;
  return [
    `genvar gi_${clean}_in;`,
    `generate`,
    `  for (gi_${clean}_in = 0; gi_${clean}_in < ${width}; gi_${clean}_in = gi_${clean}_in + 1) begin : gen_${clean}_in`,
    `    cell_and2 u_${clean}_in ( .Z(${tdrName(port)}[gi_${clean}_in]), .A1(${port.name}[gi_${clean}_in]), .A2(dfx_mode) );`,
    `  end`,
    `endgenerate`,
  ];
}

export function buildWrapperPorts(inputPorts: ThirdPartyPort[], outputPorts: ThirdPartyPort[]): ThirdPartyPort[] {
  const west: ThirdPartyPort[] = [
    { name: 'dfx_mode', displayName: 'dfx_mode', direction: 'input', dir: 'input', side: 'west', order: 0, type: 'enable_in' },
  ];
  const east: ThirdPartyPort[] = [];

  outputPorts.forEach((port, idx) => {
    const norm = normalizePort(port, 'output', idx);
    west.push({
      name: tdrName(norm),
      displayName: tdrName(norm),
      direction: 'input',
      dir: 'input',
      range: normalizeRange(norm),
      busWidth: norm.busWidth,
      side: 'west',
      order: west.length,
      type: 'data_in',
    });
    east.push({
      name: norm.name,
      displayName: norm.displayName || norm.name,
      direction: 'output',
      dir: 'output',
      range: normalizeRange(norm),
      busWidth: norm.busWidth,
      side: 'east',
      order: east.length,
      type: norm.pinType || norm.type || 'data_out',
    });
  });

  inputPorts.forEach((port, idx) => {
    const norm = normalizePort(port, 'input', idx);
    west.push({
      name: norm.name,
      displayName: norm.displayName || norm.name,
      direction: 'input',
      dir: 'input',
      range: normalizeRange(norm),
      busWidth: norm.busWidth,
      side: 'west',
      order: west.length,
      type: norm.pinType || norm.type || 'data_in',
    });
    east.push({
      name: tdrName(norm),
      displayName: tdrName(norm),
      direction: 'output',
      dir: 'output',
      range: normalizeRange(norm),
      busWidth: norm.busWidth,
      side: 'east',
      order: east.length,
      type: 'data_out',
    });
  });

  return [...west, ...east];
}

export function buildIclText(moduleName: string, inputPorts: ThirdPartyPort[], outputPorts: ThirdPartyPort[]): string {
  const lines: string[] = [];
  lines.push(`Module ${moduleName} {`);
  outputPorts.forEach((port, idx) => lines.push(`    ${iclDecl('DataInPort', normalizePort(port, 'output', idx))}`));
  inputPorts.forEach((port, idx) => lines.push(`    ${iclDecl('DataOutPort', normalizePort(port, 'input', idx))}`));
  lines.push('}');
  return lines.join('\n');
}

export function buildVerilogText(moduleName: string, inputPorts: ThirdPartyPort[], outputPorts: ThirdPartyPort[]): string {
  const inputs = inputPorts.map((p, i) => normalizePort(p, 'input', i));
  const outputs = outputPorts.map((p, i) => normalizePort(p, 'output', i));

  const portDecls: string[] = [];
  outputs.forEach((port) => portDecls.push(`    ${verilogDecl('input', port, tdrName(port))}`));
  portDecls.push(`    input wire dfx_mode`);
  inputs.forEach((port) => portDecls.push(`    ${verilogDecl('input', port)}`));
  outputs.forEach((port) => portDecls.push(`    ${verilogDecl('output', port)}`));
  inputs.forEach((port) => portDecls.push(`    ${verilogDecl('output', port, tdrName(port))}`));

  const lines: string[] = [];
  lines.push(`module ${moduleName} (`);
  lines.push(portDecls.join(',\n'));
  lines.push(');');
  lines.push('');
  outputs.forEach((port) => {
    buildOutputLogic(port).forEach((line) => lines.push(line));
    lines.push('');
  });
  inputs.forEach((port) => {
    buildInputLogic(port).forEach((line) => lines.push(line));
    lines.push('');
  });
  lines.push('endmodule');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function generateDfxWrapper(input: WrapperGenerateInput): WrapperGenerateResult {
  const moduleName = trim(input.moduleName) || 'third_party_wrapper';
  const inputPorts = (input.inputPorts || []).map((p, idx) => normalizePort(p, 'input', idx));
  const outputPorts = (input.outputPorts || []).map((p, idx) => normalizePort(p, 'output', idx));
  return {
    moduleName,
    inputPorts,
    outputPorts,
    wrapperPorts: buildWrapperPorts(inputPorts, outputPorts),
    verilogText: buildVerilogText(moduleName, inputPorts, outputPorts),
    iclText: buildIclText(moduleName, inputPorts, outputPorts),
  };
}

export function getPortDisplayText(port: ThirdPartyPort): string {
  return portLabel(port);
}

export type WrapperPort = ThirdPartyPort;
export type WrapperResult = WrapperGenerateResult;

export function parseRangeToBusWidth(range?: string): number | undefined {
  return busWidthFromRange(String(range || ''));
}