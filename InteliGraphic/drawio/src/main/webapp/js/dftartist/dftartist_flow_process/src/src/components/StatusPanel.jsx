// src/components/StatusPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Alert, Statistic, Input, Button, Space, message } from 'antd';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function StatusPanel({ envName }) {
  // 1) 读取初始：若库里已有，优先用库；否则用本地快照
  const snap = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('DFT_SNAPSHOT') || 'null'); }
    catch { return null; }
  }, []);

  const getInitial = () => {
    const doc = window.DFT?.Store?.getDoc('env', envName);
    const d = doc?.data || {};
    return {
      designTop: d.designTop ?? snap?.designTop ?? '',
      counts: d.counts ?? snap?.counts ?? { clocks: 1, regCount: 0, chainCount: 0 },
      checklist: d.checklist ?? snap?.checklist ?? [],
      files: d.files ?? snap?.files ?? { design: [] },
    };
  };

  const [form, setForm] = useState(getInitial);
  const checklistStr = (form.checklist || []).join('\n');
  const designFilesStr = (form.files?.design || []).join('\n');

  // 订阅数据库变化（在别处更新时，这里也刷新）
  useEffect(() => {
    if (!window.DFT?.Store) return;
    const unsub = window.DFT.Store.subscribe('env', envName, (doc) => {
      if (doc?.data) setForm(prev => ({ ...prev, ...doc.data }));
    });
    return () => unsub?.();
  }, [envName]);

  const save = () => {
    if (!envName) return message.error('缺少 ENV 名称');
    window.DFT?.Store?.setDoc('env', envName, { data: form });
    message.success('已保存（自动写盘中）');
  };
  const saveNow = async () => {
    save();
    await window.DFT?.Store?.saveNow('env');
    message.success('已立即保存到磁盘');
  };

  const checklistOk = (form.checklist || []).length === 0;
  const designFilesCount = (form.files?.design || []).length;

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={save}>保存</Button>
        <Button onClick={saveNow}>立即写盘</Button>
      </Space>

      <Alert
        type={checklistOk ? 'success' : 'warning'}
        showIcon
        message={checklistOk ? '环境就绪（示意）' : '部分就绪，请完善缺失项'}
        description={`ENV: ${envName || '(未命名)'} `}
        style={{ marginBottom: 12 }}
      />

      {!checklistOk && (
        <Card title="缺失项/告警" style={{ marginBottom: 12 }}>
          {(form.checklist || []).map((c, i) => (
            <Alert key={i} type="warning" showIcon message={c} style={{ marginBottom: 8 }} />
          ))}
          <TextArea
            rows={4}
            placeholder="每行一条缺失项"
            value={checklistStr}
            onChange={e => setForm(f => ({ ...f, checklist: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
          />
        </Card>
      )}

      <Row gutter={12}>
        {[
          { label: '顶层模块', ok: !!form.designTop, render: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="designTop"
                value={form.designTop}
                onChange={e => setForm(f => ({ ...f, designTop: e.target.value }))}
              />
            </Space>
          )},
          { label: '系统标准单元库', ok: true, render: <Text>已包含</Text> },
          { label: '设计文件', ok: designFilesCount > 0, render: (
            <TextArea
              placeholder="每行一个设计文件路径"
              autoSize={{ minRows: 3, maxRows: 8 }}
              value={designFilesStr}
              onChange={e => setForm(f => ({ ...f, files: { ...(f.files||{}), design: e.target.value.split('\n').map(s=>s.trim()).filter(Boolean) } }))}
            />
          )},
          { label: 'SDC', ok: true, render: <Text>—</Text> },
        ].map((it, i) => (
          <Col span={12} key={i} style={{ marginBottom: 12 }}>
            <Card>
              <Tag color={it.ok ? 'green' : 'red'}>{it.ok ? 'OK' : 'MISS'}</Tag>{' '}
              <Text strong>{it.label}：</Text>
              <div style={{ marginTop: 8 }}>{it.render}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginTop: 12 }}>
        <Title level={5}>设计摘要</Title>
        <Row gutter={12}>
          <Col xs={8}>
            <Statistic title="时钟域"
              value={form.counts?.clocks ?? 0}
            />
            <Input
              type="number"
              min={0}
              style={{ marginTop: 6 }}
              value={form.counts?.clocks ?? 0}
              onChange={e => setForm(f => ({ ...f, counts: { ...(f.counts||{}), clocks: Number(e.target.value||0) } }))}
            />
          </Col>
          <Col xs={8}>
            <Statistic title="寄存器(估)" value={form.counts?.regCount ?? 0} />
            <Input
              type="number"
              min={0}
              style={{ marginTop: 6 }}
              value={form.counts?.regCount ?? 0}
              onChange={e => setForm(f => ({ ...f, counts: { ...(f.counts||{}), regCount: Number(e.target.value||0) } }))}
            />
          </Col>
          <Col xs={8}>
            <Statistic title="链条(估)" value={form.counts?.chainCount ?? 0} />
            <Input
              type="number"
              min={0}
              style={{ marginTop: 6 }}
              value={form.counts?.chainCount ?? 0}
              onChange={e => setForm(f => ({ ...f, counts: { ...(f.counts||{}), chainCount: Number(e.target.value||0) } }))}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
