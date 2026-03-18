import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { DftsExtraTabRenderProps } from '../../../shared/dfts/types';
import { getDftsTypeFromCell } from '../../../shared/dfts/cell';
import {
  generateDfxWrapper,
  parseRangeToBusWidth,
  type WrapperPort,
  type WrapperResult,
} from '../../../shared/third_party/dfxWrapperGenerator';
import {
  readCurrentThirdPartyItem,
  type ThirdPartyItem,
  type ThirdPartyPort,
} from '../../../shared/third_party/thirdPartyWrapperHost';

const { Text, Title } = Typography;

type ScopeValue = 'project' | 'software';
type PreviewTabKey = 'v' | 'icl';

export type ThirdPartyWrapperDraft = {
  sourceType?: string;
  sourceItemKey?: string;
  wrapperModuleName?: string;
  scope?: ScopeValue;
  selectedInputPins?: string[];
  selectedOutputPins?: string[];
};

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeDir(v: any): 'input' | 'output' | 'inout' | string {
  const s = String(v || '').toLowerCase();
  if (s === 'input' || s === 'output' || s === 'inout') return s;
  return s || 'input';
}

function sideOf(p: ThirdPartyPort | WrapperPort): string {
  const side = String((p as any).side || '').toLowerCase();
  if (side === 'east' || side === 'west' || side === 'north' || side === 'south') return side;
  const dir = normalizeDir((p as any).direction || (p as any).dir || (p as any).type);
  return dir === 'output' ? 'east' : 'west';
}

function labelOfPort(p: ThirdPartyPort | WrapperPort): string {
  return `${p.name}${p.range || ''}`;
}

function widthOfPort(p: ThirdPartyPort | WrapperPort): number | undefined {
  const bw = Number((p as any).busWidth);
  if (Number.isFinite(bw) && bw > 1) return bw;
  return parseRangeToBusWidth((p as any).range);
}

function cloneDraft(draft: ThirdPartyWrapperDraft): ThirdPartyWrapperDraft {
  return {
    sourceType: draft.sourceType,
    sourceItemKey: draft.sourceItemKey,
    wrapperModuleName: draft.wrapperModuleName,
    scope: draft.scope,
    selectedInputPins: [...(draft.selectedInputPins || [])],
    selectedOutputPins: [...(draft.selectedOutputPins || [])],
  };
}

function ensureDefaultDraft(
  draft: ThirdPartyWrapperDraft,
  sourceType: string,
  item: ThirdPartyItem,
): ThirdPartyWrapperDraft {
  const inputs = (item.ports || []).filter((p) => normalizeDir(p.direction || p.dir || p.type) === 'input');
  const outputs = (item.ports || []).filter((p) => normalizeDir(p.direction || p.dir || p.type) === 'output');
  return {
    sourceType,
    sourceItemKey: item.key,
    wrapperModuleName: draft.wrapperModuleName || `${item.moduleName || item.sourceModuleName || 'third_party'}_tdr`,
    scope: draft.scope || ((item.scope as ScopeValue) || 'project'),
    selectedInputPins: uniq((draft.selectedInputPins || inputs.map((p) => p.name)).filter(Boolean)),
    selectedOutputPins: uniq((draft.selectedOutputPins || outputs.map((p) => p.name)).filter(Boolean)),
  };
}

function matchQuery(port: ThirdPartyPort, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [port.name, port.range, port.side, port.direction, port.dir, port.type]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(q));
}

function PinList(props: {
  title: string;
  searchValue: string;
  onSearchChange: (next: string) => void;
  ports: ThirdPartyPort[];
  selected: string[];
  onToggle: (name: string, checked: boolean) => void;
  onToggleAllVisible: (checked: boolean) => void;
  onClear: () => void;
}) {
  const { title, searchValue, onSearchChange, ports, selected, onToggle, onToggleAllVisible, onClear } = props;
  const allVisibleSelected = ports.length > 0 && ports.every((p) => selected.includes(p.name));

  return (
    <Card
      title={title}
      size="small"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        borderColor: '#E2E8F0',
      }}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        },
      }}
    >
      <Input
        allowClear
        placeholder={`搜索 ${title}`}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Checkbox checked={allVisibleSelected} onChange={(e) => onToggleAllVisible(e.target.checked)}>
          当前结果全选
        </Checkbox>
        <Button size="small" onClick={onClear}>
          清空
        </Button>
        <Text type="secondary">{selected.length} / {ports.length}</Text>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 6,
        }}
      >
        {ports.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的引脚" />
        ) : (
          ports.map((pin) => {
            const checked = selected.includes(pin.name);
            return (
              <div
                key={`${title}-${pin.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <Checkbox checked={checked} onChange={(e) => onToggle(pin.name, e.target.checked)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={labelOfPort(pin)}
                  >
                    {labelOfPort(pin)}
                  </div>
                </div>
                <Tag>{normalizeDir(pin.direction || pin.dir || pin.type)}</Tag>
                <Tag>{sideOf(pin)}</Tag>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function PreviewCard(props: {
  previewTab: PreviewTabKey;
  setPreviewTab: (k: PreviewTabKey) => void;
  generated: WrapperResult;
}) {
  const { previewTab, setPreviewTab, generated } = props;
  return (
    <Card
      title="文件预览"
      size="small"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        borderColor: '#E2E8F0',
      }}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }}
    >
      <div style={{ padding: '0 16px' }}>
        <Tabs
          activeKey={previewTab}
          onChange={(k) => setPreviewTab(k as PreviewTabKey)}
          items={[
            { key: 'v', label: '.v' },
            { key: 'icl', label: '.icl' },
          ]}
        />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: '#06152f',
          color: '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          lineHeight: 1.65,
          padding: 16,
          whiteSpace: 'pre',
        }}
      >
        {previewTab === 'v' ? generated.verilogText : generated.iclText}
      </div>
    </Card>
  );
}

export default function ThirdPartyWrapperGenTab(
  props: DftsExtraTabRenderProps<ThirdPartyWrapperDraft>,
) {
  const { def, graph, cell, draft, setDraft } = props;
  const [inputKeyword, setInputKeyword] = useState('');
  const [outputKeyword, setOutputKeyword] = useState('');
  const [previewTab, setPreviewTab] = useState<PreviewTabKey>('v');

  const rawCellType = useMemo(() => getDftsTypeFromCell(graph, cell) || def.type, [graph, cell, def.type]);
  const sourceItem = useMemo(() => readCurrentThirdPartyItem(def, graph, cell), [def, graph, cell]);

  const safeDraft = useMemo(() => {
    if (!sourceItem) return cloneDraft(draft || {});
    return ensureDefaultDraft(draft || {}, rawCellType, sourceItem);
  }, [draft, rawCellType, sourceItem]);

  useEffect(() => {
    if (!sourceItem) return;
    const next = ensureDefaultDraft(draft || {}, rawCellType, sourceItem);
    const changed = JSON.stringify(next) !== JSON.stringify(draft || {});
    if (changed) setDraft(next);
  }, [sourceItem, rawCellType]);

  const allPorts = sourceItem?.ports || [];
  const allInputs = useMemo(
    () => allPorts.filter((p) => normalizeDir(p.direction || p.dir || p.type) === 'input'),
    [allPorts],
  );
  const allOutputs = useMemo(
    () => allPorts.filter((p) => normalizeDir(p.direction || p.dir || p.type) === 'output'),
    [allPorts],
  );
  const inouts = useMemo(
    () => allPorts.filter((p) => normalizeDir(p.direction || p.dir || p.type) === 'inout'),
    [allPorts],
  );

  const filteredInputs = useMemo(
    () => allInputs.filter((p) => matchQuery(p, inputKeyword)),
    [allInputs, inputKeyword],
  );
  const filteredOutputs = useMemo(
    () => allOutputs.filter((p) => matchQuery(p, outputKeyword)),
    [allOutputs, outputKeyword],
  );

  const selectedInputPorts = useMemo(
    () => allInputs.filter((p) => (safeDraft.selectedInputPins || []).includes(p.name)),
    [allInputs, safeDraft.selectedInputPins],
  );
  const selectedOutputPorts = useMemo(
    () => allOutputs.filter((p) => (safeDraft.selectedOutputPins || []).includes(p.name)),
    [allOutputs, safeDraft.selectedOutputPins],
  );

  const generated = useMemo(() => {
    return generateDfxWrapper({
      moduleName:
        safeDraft.wrapperModuleName || `${sourceItem?.moduleName || sourceItem?.sourceModuleName || 'third_party'}_tdr`,
      inputPorts: selectedInputPorts.map((p) => ({
        name: p.name,
        range: p.range || '',
        side: sideOf(p),
        direction: 'input',
        busWidth: widthOfPort(p),
      })),
      outputPorts: selectedOutputPorts.map((p) => ({
        name: p.name,
        range: p.range || '',
        side: sideOf(p),
        direction: 'output',
        busWidth: widthOfPort(p),
      })),
    });
  }, [safeDraft.wrapperModuleName, selectedInputPorts, selectedOutputPorts, sourceItem]);

  const updateDraft = (patch: Partial<ThirdPartyWrapperDraft>) => {
    setDraft({ ...safeDraft, ...patch });
  };

  const toggleOne = (kind: 'input' | 'output', name: string, checked: boolean) => {
    const key = kind === 'input' ? 'selectedInputPins' : 'selectedOutputPins';
    const prev = kind === 'input' ? safeDraft.selectedInputPins || [] : safeDraft.selectedOutputPins || [];
    const next = checked ? uniq([...prev, name]) : prev.filter((v) => v !== name);
    updateDraft({ [key]: next } as Partial<ThirdPartyWrapperDraft>);
  };

  const toggleAllVisible = (kind: 'input' | 'output', checked: boolean) => {
    const visibleNames = (kind === 'input' ? filteredInputs : filteredOutputs).map((p) => p.name);
    const prev = kind === 'input' ? safeDraft.selectedInputPins || [] : safeDraft.selectedOutputPins || [];
    const next = checked ? uniq([...prev, ...visibleNames]) : prev.filter((n) => !visibleNames.includes(n));
    updateDraft({ [kind === 'input' ? 'selectedInputPins' : 'selectedOutputPins']: next } as Partial<ThirdPartyWrapperDraft>);
  };

  const clearKind = (kind: 'input' | 'output') => {
    updateDraft({ [kind === 'input' ? 'selectedInputPins' : 'selectedOutputPins']: [] } as Partial<ThirdPartyWrapperDraft>);
  };

  if (!sourceItem) {
    return (
      <div style={{ height: '100%', minHeight: 0 }}>
        <Card style={{ borderRadius: 12, borderColor: '#E2E8F0' }}>
          <Empty description="未能找到当前 third_party_ip 对应的源信息" />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '320px minmax(0, 1fr) 560px',
        gap: 16,
      }}
    >
      <Card
        title="Wrapper 生成参数"
        size="small"
        style={{
          minHeight: 0,
          borderRadius: 12,
          borderColor: '#E2E8F0',
          display: 'flex',
          flexDirection: 'column',
        }}
        styles={{
          body: {
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          },
        }}
      >
        <div>
          <Text type="secondary">源模块</Text>
          <Title level={4} style={{ margin: '6px 0 4px', fontSize: 16 }}>
            {sourceItem.moduleName || sourceItem.sourceModuleName}
          </Title>
          <Text type="secondary">
            {sourceItem.sourceFileName || sourceItem.sourcePath || '-'} · {(sourceItem.ports || []).length} port(s)
          </Text>
        </div>

        <div>
          <Text>Wrapper 模块名</Text>
          <Input
            value={safeDraft.wrapperModuleName}
            onChange={(e) => updateDraft({ wrapperModuleName: e.target.value })}
            placeholder="请输入 wrapper 模块名"
            style={{ marginTop: 8 }}
          />
        </div>

        <Alert
          type="info"
          showIcon
          message="生成规则"
          description={
            <div style={{ lineHeight: 1.8 }}>
              output 会生成 DataInPort / &lt;pin&gt;_tdr 输入；input 会生成 DataOutPort / &lt;pin&gt;_tdr 输出；统一增加 dfx_mode。
            </div>
          }
        />

        {inouts.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message={`检测到 ${inouts.length} 个 inout 引脚`}
            description="当前版本不会自动处理 inout，引脚不会进入生成列表。"
          />
        ) : null}
      </Card>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <PinList
          title="Input Pins"
          searchValue={inputKeyword}
          onSearchChange={setInputKeyword}
          ports={filteredInputs}
          selected={safeDraft.selectedInputPins || []}
          onToggle={(name, checked) => toggleOne('input', name, checked)}
          onToggleAllVisible={(checked) => toggleAllVisible('input', checked)}
          onClear={() => clearKind('input')}
        />

        <PinList
          title="Output Pins"
          searchValue={outputKeyword}
          onSearchChange={setOutputKeyword}
          ports={filteredOutputs}
          selected={safeDraft.selectedOutputPins || []}
          onToggle={(name, checked) => toggleOne('output', name, checked)}
          onToggleAllVisible={(checked) => toggleAllVisible('output', checked)}
          onClear={() => clearKind('output')}
        />
      </div>

      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <PreviewCard previewTab={previewTab} setPreviewTab={setPreviewTab} generated={generated} />
      </div>
    </div>
  );
}
