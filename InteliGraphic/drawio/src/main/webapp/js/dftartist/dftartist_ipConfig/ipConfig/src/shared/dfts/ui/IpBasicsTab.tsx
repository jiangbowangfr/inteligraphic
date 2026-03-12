// src/shared/dfts/ui/IpBasicsTab.tsx
import React, { useMemo } from 'react';
import { Card, Col, Descriptions, Form, Input, InputNumber, Row, Space, Switch, Tag, Typography } from 'antd';
import type { SpecialFieldDef } from '../types';

const { Text } = Typography;

export type IpBasicsDraft = {
  bodyLabel: string;
  instanceName: string;
  showInstance: boolean;
  lockBodyLabel: boolean;
  width?: number;
  height?: number;
};

export default function IpBasicsTab(props: {
  typeLabel: string;
  categoryLabel: string;
  summary: {
    pins: number;
    inputs: number;
    outputs: number;
    hidden: number;
  };
  initialValues: IpBasicsDraft;
  value: IpBasicsDraft;
  onChange: (next: IpBasicsDraft) => void;
  specialFields?: SpecialFieldDef[];
  specialInitialValues?: Record<string, any>;
  specialValues?: Record<string, any>;
  onSpecialChange?: (next: Record<string, any>) => void;
}) {
  const {
    typeLabel,
    categoryLabel,
    summary,
    initialValues,
    value,
    onChange,
    specialFields = [],
    specialInitialValues = {},
    specialValues = {},
    onSpecialChange,
  } = props;

  const changed = useMemo(() => {
    const basicChanged = Object.keys(value).filter((k) => !Object.is((value as any)[k], (initialValues as any)[k]));
    const specialChanged = specialFields
      .map((f) => f.attr)
      .filter((attr) => !Object.is(specialValues[attr], specialInitialValues[attr]));
    return [...basicChanged, ...specialChanged];
  }, [value, initialValues, specialFields, specialValues, specialInitialValues]);

  const setField = <K extends keyof IpBasicsDraft>(key: K, next: IpBasicsDraft[K]) => {
    onChange({ ...value, [key]: next });
  };

  const setSpecialField = (attr: string, next: any) => {
    onSpecialChange?.({ ...specialValues, [attr]: next });
  };

  const hasSpecialBlock = specialFields.length > 0;

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '300px minmax(560px, 1fr) 360px',
        gap: 16,
      }}
    >
      <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto auto minmax(0, 1fr)', gap: 16 }}>
        <Card size="small" style={{ borderRadius: 12, borderColor: '#E2E8F0' }} styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Text strong style={{ fontSize: 15 }}>{typeLabel}</Text>
              <Tag color="blue" style={{ borderRadius: 999 }}>{categoryLabel}</Tag>
            </Space>
            <Text type="secondary">当前 IP 的基础属性</Text>
          </Space>
        </Card>

        <Card size="small" title="连接摘要" style={{ borderRadius: 12, borderColor: '#E2E8F0' }}>
          <Descriptions column={1} size="small" labelStyle={{ width: 110, color: '#64748B' }}>
            <Descriptions.Item label="总引脚数">{summary.pins}</Descriptions.Item>
            <Descriptions.Item label="输入引脚">{summary.inputs}</Descriptions.Item>
            <Descriptions.Item label="输出引脚">{summary.outputs}</Descriptions.Item>
            <Descriptions.Item label="隐藏引脚">{summary.hidden}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          size="small"
          title="缩略预览"
          style={{ borderRadius: 12, borderColor: '#E2E8F0', minHeight: 0 }}
          styles={{ body: { display: 'grid', placeItems: 'center', minHeight: 180 } }}
        >
          <div style={{ width: 210, padding: '16px 14px 18px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{value.bodyLabel || typeLabel}</div>
            <div style={{ marginTop: 10, color: '#64748B', fontSize: 12 }}>
              {value.showInstance ? value.instanceName || '未设置实例名' : '实例名已隐藏'}
            </div>
          </div>
        </Card>
      </div>

      <Card size="small" style={{ borderRadius: 12, borderColor: '#E2E8F0', height: '100%', minHeight: 0 }} styles={{ body: { height: '100%', minHeight: 0, overflow: 'auto', padding: 20 } }}>
        <Form layout="vertical" requiredMark={false}>
          <Card size="small" title="标识信息" style={{ marginBottom: 16, borderRadius: 12, borderColor: '#EEF2F7' }} styles={{ body: { paddingBottom: 6 } }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="模块标题">
                  <Input value={value.bodyLabel} placeholder="显示在图形中央的标题" onChange={(e) => setField('bodyLabel', e.target.value)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="实例名">
                  <Input value={value.instanceName} placeholder="显示在图形下方的实例名" onChange={(e) => setField('instanceName', e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {hasSpecialBlock ? (
            <Card size="small" title="特殊参数" style={{ marginBottom: 16, borderRadius: 12, borderColor: '#EEF2F7' }} styles={{ body: { paddingBottom: 6 } }}>
              <Row gutter={16}>
                {specialFields.map((field) => (
                  <Col span={12} key={field.attr}>
                    <Form.Item label={field.label} extra={field.help || '留空时按默认规则处理。'}>
                      {field.kind === 'number' ? (
                        <InputNumber
                          value={specialValues[field.attr]}
                          min={field.min}
                          max={field.max}
                          style={{ width: '100%' }}
                          placeholder={field.placeholder || '默认为空'}
                          onChange={(v) => setSpecialField(field.attr, typeof v === 'number' ? v : undefined)}
                        />
                      ) : (
                        <Input
                          value={specialValues[field.attr] ?? ''}
                          placeholder={field.placeholder || '默认为空'}
                          onChange={(e) => setSpecialField(field.attr, e.target.value)}
                        />
                      )}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>
          ) : null}

          <Card size="small" title="显示与行为" style={{ marginBottom: 16, borderRadius: 12, borderColor: '#EEF2F7' }} styles={{ body: { paddingBottom: 6 } }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="显示实例名" extra="关闭后仅隐藏实例名展示，不删除存储值。">
                  <Switch checked={value.showInstance} onChange={(v) => setField('showInstance', v)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="锁定模块标题" extra="开启后可作为外部逻辑的“禁止编辑标题”依据。">
                  <Switch checked={value.lockBodyLabel} onChange={(v) => setField('lockBodyLabel', v)} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="默认宽度" extra="可选；仅写入配置属性，不强制立即改图。">
                  <InputNumber value={value.width} min={0} style={{ width: '100%' }} placeholder="例如 160" onChange={(v) => setField('width', typeof v === 'number' ? v : undefined)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="默认高度" extra="可选；仅写入配置属性，不强制立即改图。">
                  <InputNumber value={value.height} min={0} style={{ width: '100%' }} placeholder="例如 72" onChange={(v) => setField('height', typeof v === 'number' ? v : undefined)} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </Card>

      <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 16 }}>
        <Card size="small" title="字段说明" style={{ borderRadius: 12, borderColor: '#E2E8F0' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text strong>IP 基础参数页</Text>
            {hasSpecialBlock ? <Text type="secondary">当前类型包含专属参数，已在中间“特殊参数”区域显示。</Text> : null}
          </Space>
        </Card>

        <Card size="small" title="变更摘要" style={{ borderRadius: 12, borderColor: '#E2E8F0', minHeight: 0 }} styles={{ body: { display: 'grid', gridTemplateRows: 'auto auto minmax(0, 1fr)', gap: 12, minHeight: 0 } }}>
          <Text type="secondary">本页已修改字段：{changed.length}</Text>
          <div style={{ minHeight: 0, borderRadius: 12, background: '#0F172A', color: '#D6E4FF', padding: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace', fontSize: 12, lineHeight: 1.7, overflow: 'auto' }}>
            {JSON.stringify({ ...value, ...specialValues }, null, 2)}
          </div>
        </Card>
      </div>
    </div>
  );
}
