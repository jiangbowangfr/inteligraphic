export const opt = (...vals: string[]) => vals.map((v) => ({ label: v, value: v }));

export const ON_OFF = opt('on', 'off');
export const ON_OFF_AUTO = opt('on', 'off', 'auto');

export const DFF_LATCH = opt('dff', 'latch');

export const MCP_2_64 = opt('2', '4', '8', '16', '32', '64');
export const RES_2_8 = opt('2', '4', '8');

export function indent(n: number, s: string) {
  const pad = ' '.repeat(n);
  return s
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

export function kv(key: string, value: any, pad = 0) {
  if (value === undefined || value === null || value === '') return '';
  return `${' '.repeat(pad)}${key} : ${value} ;`;
}

export function block(name: string, inner: string, pad = 0) {
  const body = inner
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .join('\n');
  return `${' '.repeat(pad)}${name} {\n${body ? indent(pad + 2, body) : ''}\n${' '.repeat(pad)}}`;
}

export function wrapSSNDatapath(wrapperLine: string, inner: string) {
  const w = block(wrapperLine, inner, 6);
  return `DftSpecification(module_name,id) {\n  SSN {\n    Datapath(id) {\n${w}\n    }\n  }\n}`;
}
