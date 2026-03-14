import React, { useMemo, useState } from 'react';
import type { DataSourceFieldSchema, DataSourceFormValues, DataSourcePageConfig } from './types';
import { applyDataSourceValues, collectInitialValues, getBodyFromCell, getDftsTypeFromBody } from './bridge';

function validate(values: DataSourceFormValues, fields: DataSourceFieldSchema[]): string[] {
  const errors: string[] = [];

  for (const field of fields) {
    const value = (values as any)[field.key];

    if (field.required && (value == null || String(value).trim() === '')) {
      errors.push(`${field.label} 不能为空`);
      continue;
    }

    if (field.kind === 'number' && value != null && value !== '') {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors.push(`${field.label} 必须是数字`);
        continue;
      }
      if (field.min != null && n < field.min) {
        errors.push(`${field.label} 不能小于 ${field.min}`);
      }
      if (field.max != null && n > field.max) {
        errors.push(`${field.label} 不能大于 ${field.max}`);
      }
    }
  }

  return errors;
}

function InputField(props: {
  field: DataSourceFieldSchema;
  value: any;
  onChange: (value: any) => void;
}) {
  const { field, value, onChange } = props;

  const commonStyle: React.CSSProperties = {
    height: 36,
    border: '1px solid #d0d7de',
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{field.label}</label>
      {field.kind === 'number' ? (
        <input
          type="number"
          value={value ?? ''}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={commonStyle}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={commonStyle}
        />
      )}
    </div>
  );
}

export function CommonDataSourceForm(
  props: any & {
    config: DataSourcePageConfig;
  }
) {
  const { graph, cell, body, close, onClose, config } = props;

  const realBody = useMemo(() => getBodyFromCell(graph, body ?? cell), [graph, cell, body]);
  const dftsType = useMemo(() => getDftsTypeFromBody(realBody), [realBody]);

  const [values, setValues] = useState<DataSourceFormValues>(() => {
    const init = collectInitialValues(graph, realBody);
    const next = { ...init };
    for (const field of config.fields) {
      const current = (next as any)[field.key];
      if ((current == null || current === '') && field.defaultValue != null) {
        (next as any)[field.key] = field.defaultValue;
      }
    }
    return next;
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const setFieldValue = (key: keyof DataSourceFormValues, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const nextErrors = validate(values, config.fields);
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setSaving(true);
    try {
      applyDataSourceValues(graph, realBody, values);
      (close || onClose)?.();
    } catch (err: any) {
      setErrors([err?.message || '保存失败']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minWidth: 560,
        maxWidth: 760,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{config.title}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
          Type: <code>{dftsType || config.type}</code>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#555', lineHeight: 1.6 }}>{config.description}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {config.fields.map((field) => (
          <InputField
            key={String(field.key)}
            field={field}
            value={(values as any)[field.key]}
            onChange={(value) => setFieldValue(field.key, value)}
          />
        ))}
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 12,
          background: '#fafafa',
          fontSize: 13,
          color: '#444',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>说明</div>
        <div>1. Label 会更新 data source body 的显示名。</div>
        <div>2. Bus Width 会同步更新输出总线 pin 的 bus 宽度和线宽。</div>
        <div>3. 各页的 pin label 会按 data source type 写回对应 pinKey。</div>
      </div>

      {errors.length > 0 && (
        <div
          style={{
            border: '1px solid #f5c2c7',
            background: '#fff5f5',
            color: '#842029',
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
          }}
        >
          {errors.map((err, index) => (
            <div key={index}>{err}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => (close || onClose)?.()}
          style={{
            height: 36,
            borderRadius: 8,
            padding: '0 14px',
            border: '1px solid #d0d7de',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          取消
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            height: 36,
            borderRadius: 8,
            padding: '0 14px',
            border: '1px solid #1677ff',
            background: '#1677ff',
            color: '#fff',
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
