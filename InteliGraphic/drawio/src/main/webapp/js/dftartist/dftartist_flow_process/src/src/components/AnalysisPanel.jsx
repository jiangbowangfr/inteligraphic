import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Alert } from 'antd';
const { Title } = Typography;

export default function AnalysisPanel() {
  const [snap, setSnap] = useState(null);
  useEffect(()=>{
    try { setSnap(JSON.parse(localStorage.getItem('DFT_SNAPSHOT') || 'null')); }
    catch { setSnap(null); }
  }, []);

  if (!snap) {
    return <Alert type="info" showIcon message="尚无分析数据" description="请先在 Load 界面加载并保存一次。" />;
  }

  const reg = snap.counts?.regCount || 0;
  const chains = snap.counts?.chainCount || 0;

  return (
    <div>
      <Alert type="info" showIcon message="此处可接入可测性/冲突检查等后端报告；当前展示派生分析。" style={{marginBottom:12}}/>
      <Card title="扫描结构质量">
        <Row gutter={12}>
          <Col span={8}><Statistic title="不可控点(估)" value={Math.max(0, Math.floor(reg*0.01 - chains))}/></Col>
          <Col span={8}><Statistic title="不可观测点(估)" value={Math.max(0, Math.floor(reg*0.008 - chains))}/></Col>
          <Col span={8}><Statistic title="潜在冲突(估)" value={(snap.features?.lbist && !snap.features?.occ) ? 3 : 1}/></Col>
        </Row>
      </Card>
      <Card style={{marginTop:12}} title={<Title level={5} style={{margin:0}}>建议动作</Title>}>
        <ul style={{margin:0, paddingLeft:18}}>
          {(snap.features?.lbist && !snap.features?.occ) && <li>已启用 LBIST，建议同时启用 OCC 以稳定测试时钟。</li>}
          {(snap.checklist||[]).map((c,i)=><li key={i}>{c}</li>)}
          {(!snap.checklist || !snap.checklist.length) && <li>配置良好，建议运行快速 ATPG 评估以获取真实覆盖率。</li>}
        </ul>
      </Card>
    </div>
  );
}