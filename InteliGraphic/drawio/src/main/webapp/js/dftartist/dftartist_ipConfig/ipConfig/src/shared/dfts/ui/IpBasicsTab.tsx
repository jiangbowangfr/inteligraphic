// src/shared/dfts/ui/IpBasicsTab.tsx
import React, { useRef } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Tag, Typography } from 'antd';
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
  instanceNameLabel?: string;
  value: IpBasicsDraft;
  onChange: (next: IpBasicsDraft) => void;
  specialFields?: SpecialFieldDef[];
  specialValues?: Record<string, any>;
  onSpecialChange?: (next: Record<string, any>) => void;
}) {
  const {
    typeLabel,
    categoryLabel,
    instanceNameLabel = '实例名',
    value,
    onChange,
    specialFields = [],
    specialValues = {},
    onSpecialChange,
  } = props;

  const setField = <K extends keyof IpBasicsDraft>(key: K, next: IpBasicsDraft[K]) => {
    onChange({ ...value, [key]: next });
  };

  const setSpecialField = (attr: string, next: any) => {
    onSpecialChange?.({ ...specialValues, [attr]: next });
  };
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pickPath = async (attr: string) => {
    try {
      const electronApi = (window as any).electron;
      if (electronApi?.requestPromise) {
        const currentPath = String(specialValues[attr] || '').trim();
        const filePaths = await electronApi.requestPromise({
          action: 'showOpenDialog',
          defaultPath: currentPath || undefined,
          filters: [
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        });
        if (Array.isArray(filePaths) && filePaths[0]) {
          setSpecialField(attr, filePaths[0]);
          return;
        }
      }
    } catch {}

    fileInputRefs.current[attr]?.click();
  };

  const hasSpecialBlock = specialFields.length > 0;

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '300px minmax(720px, 1fr)',
        gap: 16,
      }}
    >
      <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 16 }}>
        <Card size="small" style={{ borderRadius: 12, borderColor: '#E2E8F0' }} styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Space size={8} wrap>
              <Text strong style={{ fontSize: 15 }}>{typeLabel}</Text>
              <Tag color="blue" style={{ borderRadius: 999 }}>{categoryLabel}</Tag>
            </Space>
            <Text type="secondary">当前 IP 的基础属性</Text>
          </Space>
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
              {value.instanceName || `未设置${instanceNameLabel}`}
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
                <Form.Item label={instanceNameLabel}>
                  <Input value={value.instanceName} placeholder={`显示在图形下方的${instanceNameLabel}`} onChange={(e) => setField('instanceName', e.target.value)} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {hasSpecialBlock ? (
            <Card size="small" title="特殊参数" style={{ marginBottom: 16, borderRadius: 12, borderColor: '#EEF2F7' }} styles={{ body: { paddingBottom: 6 } }}>
              <Row gutter={16}>
                {specialFields.map((field) => (
                  <Col span={12} key={field.attr}>
                    <Form.Item label={field.label} extra={field.help || ''}>
                      {field.kind === 'number' ? (
                        <InputNumber
                          value={specialValues[field.attr]}
                          min={field.min}
                          max={field.max}
                          style={{ width: '100%' }}
                          placeholder={field.placeholder || '默认为空'}
                          onChange={(v) => setSpecialField(field.attr, typeof v === 'number' ? v : undefined)}
                        />
                      ) : field.kind === 'select' ? (
                        <Select
                          value={specialValues[field.attr] ?? undefined}
                          style={{ width: '100%' }}
                          placeholder={field.placeholder || '请选择'}
                          options={field.options || []}
                          allowClear
                          onChange={(v) => setSpecialField(field.attr, v)}
                        />
                      ) : field.kind === 'path' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Input
                            value={specialValues[field.attr] ?? ''}
                            placeholder={field.placeholder || '请选择文件路径'}
                            onChange={(e) => setSpecialField(field.attr, e.target.value)}
                          />
                          <input
                            ref={(node) => {
                              fileInputRefs.current[field.attr] = node;
                            }}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const input = e.target as HTMLInputElement;
                              const pickedPath =
                                (file as any).path ||
                                file.webkitRelativePath ||
                                file.name;
                              setSpecialField(field.attr, pickedPath);
                              input.value = '';
                            }}
                          />
                          <Button
                            onClick={() => {
                              void pickPath(field.attr);
                            }}
                          >
                            选择
                          </Button>
                        </div>
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

        </Form>
      </Card>
    </div>
  );
}
