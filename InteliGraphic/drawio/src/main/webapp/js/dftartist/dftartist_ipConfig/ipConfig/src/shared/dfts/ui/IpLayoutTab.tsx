// src/shared/dfts/ui/IpLayoutTab.tsx
import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  List,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { DftsPinDraft, DftsPinSide } from '../types';

const { Text } = Typography;

const SIDE_OPTIONS: { label: string; value: DftsPinSide }[] = [
  { label: 'west', value: 'west' },
  { label: 'east', value: 'east' },
  { label: 'north', value: 'north' },
  { label: 'south', value: 'south' },
];

function sortPins(pins: DftsPinDraft[]) {
  const sideOrder = { west: 0, east: 1, north: 2, south: 3 } as Record<string, number>;
  return [...pins].sort((a, b) => {
    const sa = sideOrder[a.side] ?? 99;
    const sb = sideOrder[b.side] ?? 99;
    if (sa !== sb) return sa - sb;
    if (a.order !== b.order) return a.order - b.order;
    return a.key.localeCompare(b.key);
  });
}

function sidePins(pins: DftsPinDraft[], side: DftsPinSide) {
  return pins.filter((p) => p.side === side && p.visible).sort((a, b) => a.order - b.order);
}

function ensureSideOrder(pins: DftsPinDraft[]) {
  const next = [...pins];
  for (const side of ['west', 'east', 'north', 'south'] as DftsPinSide[]) {
    const group = next.filter((p) => p.side === side).sort((a, b) => a.order - b.order);
    group.forEach((p, idx) => {
      p.order = idx;
    });
  }
  return next;
}

function PinPreview(props: { title: string; instanceName: string; pins: DftsPinDraft[] }) {
  const { title, instanceName, pins } = props;

  const west = sidePins(pins, 'west');
  const east = sidePins(pins, 'east');
  const north = sidePins(pins, 'north');
  const south = sidePins(pins, 'south');

  const sideLabel = (items: DftsPinDraft[], align: 'left' | 'right' | 'center') => {
    if (!items.length) return <Text type="secondary">—</Text>;
    return (
      <Space direction="vertical" size={8} style={{ width: '100%', alignItems: align }}>
        {items.map((p) => (
          <div
            key={p.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent:
                align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
              width: '100%',
            }}
          >
            <div style={{ width: 16, height: 1, background: '#0F172A' }} />
            <span style={{ fontSize: 12, color: '#0F172A' }}>{p.displayName || p.name || p.key}</span>
          </div>
        ))}
      </Space>
    );
  };

  return (
    <div
      style={{
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '160px minmax(240px, 1fr) 160px',
        gridTemplateRows: '72px minmax(220px, 1fr) 72px auto',
        gap: 12,
        alignItems: 'stretch',
      }}
    >
      <div style={{ gridColumn: '2 / 3', display: 'grid', placeItems: 'center' }}>{sideLabel(north, 'center')}</div>
      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', display: 'grid', alignItems: 'center' }}>{sideLabel(west, 'right')}</div>
      <div
        style={{
          gridColumn: '2 / 3',
          gridRow: '2 / 3',
          border: '1px solid #CBD5E1',
          borderRadius: 14,
          background: '#FFFFFF',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: 0.2 }}>{title || 'IP'}</div>
        </div>
      </div>
      <div style={{ gridColumn: '3 / 4', gridRow: '2 / 3', display: 'grid', alignItems: 'center' }}>{sideLabel(east, 'left')}</div>
      <div style={{ gridColumn: '2 / 3', gridRow: '3 / 4', display: 'grid', placeItems: 'center' }}>{sideLabel(south, 'center')}</div>
      <div style={{ gridColumn: '2 / 3', gridRow: '4 / 5', display: 'grid', placeItems: 'center', color: '#475569' }}>
        {instanceName || '未设置实例名'}
      </div>
    </div>
  );
}

export default function IpLayoutTab(props: {
  title: string;
  instanceName: string;
  initialPins: DftsPinDraft[];
  pins: DftsPinDraft[];
  onChange: (pins: DftsPinDraft[]) => void;
}) {
  const { title, instanceName, initialPins, pins, onChange } = props;
  const [selectedKey, setSelectedKey] = useState<string>(pins[0]?.key || '');

  const sortedPins = useMemo(() => sortPins(pins), [pins]);
  const selected = useMemo(() => sortedPins.find((p) => p.key === selectedKey) || sortedPins[0], [sortedPins, selectedKey]);

  const dirtyCount = useMemo(() => {
    const map = new Map(initialPins.map((p) => [p.key, p]));
    return pins.reduce((acc, pin) => {
      const base = map.get(pin.key);
      if (!base) return acc + 1;
      if (
        base.side !== pin.side ||
        base.order !== pin.order ||
        base.visible !== pin.visible ||
        base.name !== pin.name ||
        base.displayName !== pin.displayName
      ) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [pins, initialPins]);

  const patchPin = (key: string, updater: (pin: DftsPinDraft) => DftsPinDraft) => {
    const next = pins.map((p) => (p.key === key ? updater({ ...p }) : { ...p }));
    onChange(ensureSideOrder(next));
  };

  const resetLayout = () => {
    onChange(initialPins.map((p) => ({ ...p })));
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '420px minmax(480px, 1fr) 320px',
        gap: 16,
      }}
    >
      <Card
        size="small"
        title="引脚列表"
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={resetLayout}>
            恢复默认布局
          </Button>
        }
        style={{ borderRadius: 12, borderColor: '#E2E8F0', minHeight: 0 }}
        styles={{ body: { height: '100%', minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        {sortedPins.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Empty description="未检测到可编辑的 symbol 引脚" />
          </div>
        ) : (
          <List
            dataSource={sortedPins}
            style={{ minHeight: 0, overflow: 'auto' }}
            renderItem={(pin) => {
              const active = selected?.key === pin.key;
              return (
                <List.Item
                  onClick={() => setSelectedKey(pin.key)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 14px',
                    background: active ? '#EFF6FF' : '#FFFFFF',
                    borderInlineStart: active ? '3px solid #2563EB' : '3px solid transparent',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <Space size={8}>
                        {pin.visible ? <EyeOutlined style={{ color: '#2563EB' }} /> : <EyeInvisibleOutlined style={{ color: '#94A3B8' }} />}
                        <Text strong>{pin.displayName || pin.name || pin.key}</Text>
                      </Space>
                      <Space size={6}>
                        <Tag color="default" style={{ borderRadius: 999 }}>
                          {pin.side}
                        </Tag>
                        <Tag color="default" style={{ borderRadius: 999 }}>
                          #{pin.order}
                        </Tag>
                      </Space>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Tag color={pin.dir === 'output' ? 'volcano' : 'cyan'} style={{ borderRadius: 999 }}>
                        {pin.dir || 'pin'}
                      </Tag>
                      {pin.busWidth && pin.busWidth > 1 ? (
                        <Tag color="processing" style={{ borderRadius: 999 }}>
                          [{pin.busWidth - 1}:0]
                        </Tag>
                      ) : null}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 16 }}>
        <Card size="small" title="布局变更摘要" style={{ borderRadius: 12, borderColor: '#E2E8F0' }}>
          <Space wrap>
            <Tag color="processing" style={{ borderRadius: 999 }}>
              已修改引脚：{dirtyCount}
            </Tag>
            {/* <Tag color="default" style={{ borderRadius: 999 }}>
              保存后将触发 relayout（若宿主提供）
            </Tag> */}
          </Space>
        </Card>

        <Card
          size="small"
          title="实时布局预览"
          style={{ borderRadius: 12, borderColor: '#E2E8F0', minHeight: 0 }}
          styles={{ body: { minHeight: 0, height: '100%', overflow: 'auto', padding: 20, background: '#F8FAFC' } }}
        >
          <PinPreview title={title} instanceName={instanceName} pins={sortedPins} />
        </Card>
      </div>

      <Card
        size="small"
        title="引脚检查器"
        style={{ borderRadius: 12, borderColor: '#E2E8F0', minHeight: 0 }}
        styles={{ body: { display: 'grid', gridTemplateRows: 'auto auto auto 1fr', gap: 14, minHeight: 0 } }}
      >
        {!selected ? (
          <Empty description="请选择一个引脚" />
        ) : (
          <>
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {selected.key}
              </Text>
              <div style={{ marginTop: 4, color: '#64748B', fontSize: 12 }}>
                {selected.dir || 'pin'} · {selected.type || 'signal'}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>显示名称</div>
              <Input
                value={selected.displayName ?? selected.name}
                onChange={(e) => patchPin(selected.key, (p) => ({ ...p, displayName: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>显示位置</div>
                <Segmented
                  block
                  options={SIDE_OPTIONS}
                  value={selected.side}
                  onChange={(v) => patchPin(selected.key, (p) => ({ ...p, side: v as DftsPinSide }))}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>顺序</div>
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  value={selected.order}
                  onChange={(v) => patchPin(selected.key, (p) => ({ ...p, order: typeof v === 'number' ? v : 0 }))}
                />
              </div>

              <div>
                <div style={{ marginBottom: 8, color: '#475569', fontSize: 12 }}>是否可见</div>
                <Switch checked={selected.visible} onChange={(v) => patchPin(selected.key, (p) => ({ ...p, visible: v }))} />
              </div>
            </div>

            <Card size="small" style={{ borderRadius: 12, borderColor: '#EEF2F7' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary">方向：{selected.dir || 'pin'}</Text>
                <Text type="secondary">类型：{selected.type || 'signal'}</Text>
                <Text type="secondary">总线宽度：{selected.busWidth || 1}</Text>
                {/* <Text type="secondary">保存后会更新 symbolModel.pins，并尝试调用宿主的 relayout。</Text> */}
              </Space>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
}
