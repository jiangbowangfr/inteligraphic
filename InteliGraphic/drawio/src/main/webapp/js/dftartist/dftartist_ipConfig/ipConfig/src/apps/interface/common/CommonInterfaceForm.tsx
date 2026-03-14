import React, { useMemo, useState } from 'react';
import {
  DftsPageProps,
  InterfaceFieldSchema,
  InterfaceFormValues,
  InterfacePageConfig,
} from './types';
import {
  applyInterfaceValues,
  collectInitialValues,
  getBodyFromCell,
  getDftsTypeFromBody,
} from './bridge';

function readDefaultValue(field: InterfaceFieldSchema): string | number | undefined {
  return field.defaultValue;
}

function mergeInitialValues(
  base: InterfaceFormValues,
  fields: InterfaceFieldSchema[]
): InterfaceFormValues {
  const next: InterfaceFormValues = { ...base };
  for (const f of fields) {
    const cur = (next as any)[f.key];
    if (cur == null || cur === '') {
      const dv = readDefaultValue(f);
      if (dv != null) {
        (next as any)[f.key] = dv;
      }
    }
  }
  return next;
}

function validate(values: InterfaceFormValues, fields: InterfaceFieldSchema[]): string[] {
  const errors: string[] = [];

  for (const field of fields) {
    const v = (values as any)[field.key];

    if (field.required) {
      if (v == null || String(v).trim() === '') {
        errors.push(`${field.label} 不能为空`);
        continue;
      }
    }

    if (field.kind === 'number' && v != null && v !== '') {
      const n = Number(v);
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
  field: InterfaceFieldSchema;
  value: any;
  onChange: (value: any) => void;
}) {
  const { field, value, onChange } = props;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>
        {field.label}
      </label>

      {field.kind === 'number' ? (
        <input
          type="number"
          value={value ?? ''}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{
            height: 36,
            border: '1px solid #d0d7de',
            borderRadius: 8,
            padding: '0 12px',
            fontSize: 14,
            outline: 'none',
          }}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            height: 36,
            border: '1px solid #d0d7de',
            borderRadius: 8,
            padding: '0 12px',
            fontSize: 14,
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

export function CommonInterfaceForm(
  props: DftsPageProps & {
    config: InterfacePageConfig;
  }
) {
  const { graph, cell, close, onClose, config } = props;

  const body = useMemo(() => getBodyFromCell(graph, props.body ?? cell), [graph, cell, props.body]);
  const dftsType = useMemo(() => getDftsTypeFromBody(body), [body]);

  const fields = useMemo(() => {
    return config.fields.filter((field) => {
      if (!field.visible) return true;
      return field.visible({ dftsType });
    });
  }, [config.fields, dftsType]);

  const [values, setValues] = useState<InterfaceFormValues>(() => {
    const init = collectInitialValues(graph, body);
    return mergeInitialValues(init, fields);
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const setFieldValue = (key: keyof InterfaceFormValues, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const nextErrors = validate(values, fields);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    setSaving(true);
    try {
      applyInterfaceValues(graph, body, values);
      (close || onClose)?.();
    } catch (err: any) {
      setErrors([err?.message || '保存失败']);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    (close || onClose)?.();
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
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        {fields.map((field) => (
          <InputField
            key={String(field.key)}
            field={field}
            value={(values as any)[field.key]}
            onChange={(val) => setFieldValue(field.key, val)}
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
        <div>1. Label 会更新图元 body 名称。</div>
        <div>2. SSN 的 Bus Width 会同步影响相关 data pin 的名字和总线粗细。</div>
        <div>3. Pin Label / Device Label / PDG 会通过老的 interface 引擎批量刷新 pin 文本。</div>
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
          {errors.map((e, idx) => (
            <div key={idx}>{e}</div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
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
