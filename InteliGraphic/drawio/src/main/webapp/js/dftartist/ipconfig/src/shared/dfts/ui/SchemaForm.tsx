// src/shared/dfts/ui/SchemaForm.tsx
import React, { useEffect, useMemo } from 'react';
import {
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { FieldDef, NodeDef } from '../types';

const { Text } = Typography;

type SectionGroup = {
  name: string;
  fields: FieldDef[];
};

function groupFields(fields: FieldDef[]): SectionGroup[] {
  const map = new Map<string, FieldDef[]>();
  for (const field of fields) {
    const key = field.section?.trim() || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(field);
  }
  return Array.from(map.entries()).map(([name, fs]) => ({ name, fields: fs }));
}

function fieldSpan(f: FieldDef) {
  if (f.colSpan) return f.colSpan;
  if ((f.kind ?? 'string') === 'textarea') return 24;
  return 12;
}

function renderLabel(f: FieldDef) {
  return (
    <Space size={6} align="center">
      <span>{f.label}</span>
      {f.tooltip ? (
        <Tooltip title={f.tooltip}>
          <InfoCircleOutlined style={{ color: '#94A3B8', fontSize: 12 }} />
        </Tooltip>
      ) : null}
      {f.defaultValue !== undefined ? (
        <Tag
          color="default"
          style={{
            marginInlineStart: 2,
            borderRadius: 999,
            color: '#64748B',
            borderColor: '#E2E8F0',
            background: '#F8FAFC',
          }}
        >
          默认
        </Tag>
      ) : null}
    </Space>
  );
}

export default function SchemaForm(props: {
  nodeKey: string;
  node: NodeDef;
  initialValues: Record<string, any>;
  resetToken?: number;
  onChange: (values: Record<string, any>) => void;
}) {
  const { nodeKey, node, initialValues, resetToken, onChange } = props;
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(initialValues);
    onChange(form.getFieldsValue(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, resetToken]);

  const allValues = Form.useWatch([], form) || {};

  const sections = useMemo(() => groupFields(node.fields || []), [node.fields]);

  const renderField = (f: FieldDef) => {
    const kind = f.kind ?? 'string';
    const disabled = f.disabledWhen ? !!f.disabledWhen(allValues) : false;

    if (kind === 'textarea') {
      return (
        <Input.TextArea
          disabled={disabled}
          autoSize={{ minRows: 4, maxRows: 10 }}
          placeholder={f.placeholder}
          style={{ borderRadius: 10 }}
        />
      );
    }

    if (kind === 'number') {
      return (
        <InputNumber
          disabled={disabled}
          style={{ width: '100%' }}
          placeholder={f.placeholder}
          addonAfter={f.unit ? <span style={{ color: '#64748B' }}>{f.unit}</span> : undefined}
        />
      );
    }

    if (kind === 'select') {
      return (
        <Select
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={f.options ?? []}
          placeholder={f.placeholder}
        />
      );
    }

    if (kind === 'switch') {
      return <Switch disabled={disabled} />;
    }

    return (
      <Input
        disabled={disabled}
        placeholder={f.placeholder}
        suffix={f.unit ? <Text type="secondary">{f.unit}</Text> : undefined}
      />
    );
  };

  const visibleFields = (fields: FieldDef[]) =>
    fields.filter((f) => (f.visibleWhen ? !!f.visibleWhen(allValues) : true));

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      onValuesChange={(_, all) => onChange(all)}
      style={{ minHeight: '100%' }}
    >
      {sections.map((section, index) => {
        const fields = visibleFields(section.fields);
        if (!fields.length) return null;

        return (
          <div
            key={section.name}
            style={{
              paddingBottom: 18,
              marginBottom: index === sections.length - 1 ? 0 : 22,
              borderBottom: index === sections.length - 1 ? 'none' : '1px solid #EEF2F7',
            }}
          >
            <div style={{ marginBottom: 14 }}>
              <Text
                strong
                style={{
                  fontSize: 13,
                  color: '#0F172A',
                  letterSpacing: 0.1,
                }}
              >
                {section.name}
              </Text>
            </div>

            <Row gutter={[16, 0]}>
              {fields.map((f) => (
                <Col key={f.attr} span={fieldSpan(f)}>
                  <Form.Item
                    name={f.attr}
                    label={renderLabel(f)}
                    valuePropName={(f.kind ?? 'string') === 'switch' ? 'checked' : 'value'}
                    rules={f.required ? [{ required: true, message: '必填项' }] : undefined}
                    extra={
                      f.help ? (
                        <span style={{ color: '#64748B', fontSize: 12, lineHeight: 1.45 }}>{f.help}</span>
                      ) : undefined
                    }
                  >
                    {renderField(f)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </div>
        );
      })}
    </Form>
  );
}
