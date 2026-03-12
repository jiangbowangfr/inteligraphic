// src/shared/dfts/ui/LogicGateConfigTab.tsx
import React from 'react';
import { Card, InputNumber, Segmented, Select, Space, Switch, Tag, Typography } from 'antd';
import type { DftsExtraTabRenderProps } from '../types';
import type { LogicGateDraft } from '../logicGateBridge';
import { buildLogicGatePins } from '../logicGateBridge';

const { Text, Title } = Typography;

const GATE_OPTIONS = [
  { label: 'AND', value: 'and' },
  { label: 'OR', value: 'or' },
  { label: 'NAND', value: 'nand' },
  { label: 'NOR', value: 'nor' },
  { label: 'XOR', value: 'xor' },
  { label: 'XNOR', value: 'xnor' },
  { label: 'NOT', value: 'not' },
  { label: 'BUF', value: 'buf' },
  { label: 'MUX', value: 'mux' },
] as const;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export default function LogicGateConfigTab(props: DftsExtraTabRenderProps<LogicGateDraft>) {
  const { def, graph, cell, draft, setDraft, basicDraft, layoutPins, setLayoutPins, setLayoutBaselinePins } = props;

  const gateKind = String(draft.gateKind || 'and').toLowerCase();
  const isMux = gateKind === 'mux';
  const isUnary = gateKind === 'not' || gateKind === 'buf';
  const minInputs = isUnary ? 1 : 2;

  const pinSummary = {
    total: layoutPins.length,
    visible: layoutPins.filter((p) => p.visible).length,
    hidden: layoutPins.filter((p) => !p.visible).length,
    input: layoutPins.filter((p) => (p.dir || '').toLowerCase() === 'input').length,
    output: layoutPins.filter((p) => (p.dir || '').toLowerCase() === 'output').length,
  };

  const syncDraft = (next: LogicGateDraft, rebuild = true) => {
    setDraft(next);
    if (!rebuild) return;
    const nextPins = buildLogicGatePins(graph, cell, next, layoutPins, def);
    setLayoutPins(nextPins);
    setLayoutBaselinePins(clone(nextPins));
  };

  const patchParams = (patch: Partial<LogicGateDraft['params']>) => {
    syncDraft({ ...draft, params: { ...(draft.params || {}), ...patch } });
  };

  const setGateKind = (value: string) => {
    const nextKind = String(value || 'and').toLowerCase();
    const next: LogicGateDraft = {
      ...draft,
      gateKind: nextKind,
      params:
        nextKind === 'mux'
          ? {
              dataInputs: 2,
              busWidth: Number(draft.params?.busWidth || 1),
              hasEnable: false,
              selectSide: 'south',
            }
          : {
              inputCount: nextKind === 'not' || nextKind === 'buf' ? 1 : Math.max(2, Number(draft.params?.inputCount || 2)),
              busWidth: Number(draft.params?.busWidth || 1),
            },
    };
    syncDraft(next);
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(560px, 1fr) 380px',
        gap: 16,
      }}
    >
      <Card
        size="small"
        title="逻辑配置"
        style={{ borderRadius: 12, borderColor: '#E2E8F0' }}
        styles={{ body: { display: 'grid', gap: 18 } }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>门类型</div>
            <Select
              style={{ width: '100%' }}
              value={gateKind}
              options={GATE_OPTIONS as any}
              onChange={(value) => setGateKind(String(value || 'and'))}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>总线宽度</div>
            <InputNumber
              min={1}
              max={1024}
              style={{ width: '100%' }}
              value={Number(draft.params?.busWidth || 1)}
              onChange={(v) => patchParams({ busWidth: typeof v === 'number' ? v : 1 })}
            />
          </div>

          {isMux ? (
            <>
              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>数据输入数</div>
                <InputNumber
                  min={2}
                  max={256}
                  style={{ width: '100%' }}
                  value={Number(draft.params?.dataInputs || 2)}
                  onChange={(v) => patchParams({ dataInputs: typeof v === 'number' ? v : 2 })}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>选择信号位置</div>
                <Segmented
                  block
                  options={[
                    { label: '顶部', value: 'north' },
                    { label: '底部', value: 'south' },
                  ]}
                  value={draft.params?.selectSide || 'south'}
                  onChange={(v) => patchParams({ selectSide: (v as 'north' | 'south') || 'south' })}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>Enable 引脚</div>
                <Switch
                  checked={!!draft.params?.hasEnable}
                  onChange={(checked) => patchParams({ hasEnable: checked })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>输入引脚数</div>
                <InputNumber
                  min={minInputs}
                  max={64}
                  disabled={isUnary}
                  style={{ width: '100%' }}
                  value={Number(draft.params?.inputCount || minInputs)}
                  onChange={(v) => patchParams({ inputCount: typeof v === 'number' ? v : minInputs })}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>反相输出</div>
                <Switch
                  checked={!!draft.invertOutput}
                  onChange={(checked) => syncDraft({ ...draft, invertOutput: checked }, false)}
                />
              </div>
            </>
          )}
        </div>

        <Card size="small" style={{ borderRadius: 12, borderColor: '#EEF2F7', background: '#F8FAFC' }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Title level={5} style={{ margin: 0, fontSize: 14 }}>
              引脚生成规则
            </Title>
            <Text type="secondary" style={{ lineHeight: 1.7 }}>
              {isMux
                ? 'MUX 的 dataInputs 会自动决定选择位数量；hasEnable 打开后会额外生成 EN 引脚。'
                : isUnary
                ? 'NOT / BUF 固定为 1 输入；你仍然可以修改总线宽度和输出极性。'
                : '基础门支持修改输入数，AND/OR/XOR 系列可以从 2 输入扩展到更多输入。'}
            </Text>
            <Text type="secondary" style={{ lineHeight: 1.7 }}>
              当前图元标题优先使用「IP 基础参数」页中的模块标题：<b>{basicDraft.bodyLabel || '未设置'}</b>。
            </Text>
          </Space>
        </Card>
      </Card>

      <Card
        size="small"
        title="生成结果摘要"
        style={{ borderRadius: 12, borderColor: '#E2E8F0' }}
        styles={{ body: { display: 'grid', gap: 14 } }}
      >
        <Space wrap>
          <Tag color="processing" style={{ borderRadius: 999 }}>引脚总数：{pinSummary.total}</Tag>
          <Tag color="processing" style={{ borderRadius: 999 }}>输入：{pinSummary.input}</Tag>
          <Tag color="processing" style={{ borderRadius: 999 }}>输出：{pinSummary.output}</Tag>
          <Tag color="default" style={{ borderRadius: 999 }}>隐藏：{pinSummary.hidden}</Tag>
        </Space>

        <div>
          <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>当前生成的引脚</div>
          <Space wrap>
            {layoutPins.map((pin) => (
              <Tag key={pin.key} color={pin.visible ? 'default' : 'warning'} style={{ borderRadius: 999 }}>
                {(pin.displayName || pin.name || pin.key) + ' · ' + pin.side}
              </Tag>
            ))}
          </Space>
        </div>

        <Card size="small" style={{ borderRadius: 12, borderColor: '#EEF2F7' }}>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Text type="secondary">这里修改的是“默认引脚集合”。</Text>
            <Text type="secondary">更细的 side / 顺序 / 显隐，请到「IP 界面布局」页继续调整。</Text>
          </Space>
        </Card>
      </Card>
    </div>
  );
}
