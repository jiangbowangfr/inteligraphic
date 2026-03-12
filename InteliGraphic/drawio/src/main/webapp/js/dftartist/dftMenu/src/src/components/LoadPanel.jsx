import React, { useMemo, useState, useCallback, useEffect } from 'react';
import YAML from 'yaml';
import {
  Steps, Space, Button, Badge, Card, Row, Col, Statistic, Divider, Alert,
  Upload, Table, Tag, Switch, Typography, Tooltip, Form, Input, Segmented,
  Radio, Collapse, Progress, Modal, message
} from 'antd';
import {
  FolderAddOutlined, FileAddOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined,
  ExclamationCircleTwoTone, CheckCircleOutlined, CodeOutlined, ClockCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Dragger } = Upload;

/* ========= 系统内嵌库路径 ========= */
const SYSTEM_LIBRARIES = {
  standardCellLib: 'syn_library/standard_cells/tessent/adk.tcelllib',
  verilogModel: 'syn_library/standard_cells/verilog/adk.v'
};

/* ========= 小工具 ========= */
const ext = (name='') => (name.split('.').pop() || '').toLowerCase();
const detectType = (name='') => {
  const e = ext(name);
  if (['lib','db','tcelllib'].includes(e)) return 'timing_lib';
  if (['lef'].includes(e)) return 'lef';
  if (['tf','tlu','tlu+','tluplus'].includes(e)) return 'techfile';
  if (['sv','v','vh','vhd','vhdl'].includes(e)) return 'rtl_netlist';
  if (['sdc'].includes(e)) return 'sdc';
  if (['cfg','def'].includes(e)) return e;
  if (['yaml','yml','json'].includes(e)) return 'dft_cfg';
  if (['csv','tsv'].includes(e)) return 'list';
  return 'other';
};
const hashLike = (s='') => [...s].reduce((a,c)=>((a<<5)-a + c.charCodeAt(0))|0,0).toString(16);
const formatFileSize = (bytes=0) => {
  if (!bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return `${(bytes/Math.pow(k,i)).toFixed(2)} ${sizes[i]}`;
};
const download = (filename, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type:'text/plain' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ========= 预览/检查 ========= */
const defaultEnvSteps = [
  { key:'01_insert_mbist_bscan', name:'insert_mbist_bscan', enabled:true, desc:'MBIST/边界扫描插入', script:'run.tcl' },
  { key:'02_logic_test_insertion', name:'logic_test_insertion', enabled:true, desc:'逻辑级DFT结构插入', script:'run.tcl' },
  { key:'03_scan_insertion', name:'scan_insertion', enabled:true, desc:'扫描链插入', script:'run.tcl' },
  { key:'04_lbist', name:'lbist', enabled:true, desc:'LBIST流程', script:'run.tcl' },
  { key:'05_atpg_map', name:'run_atpg_map', enabled:true, desc:'ATPG map', script:'run.tcl' },
  { key:'05_atpg_syn', name:'run_atpg_syn', enabled:true, desc:'ATPG syn', script:'run.tcl' },
  { key:'05_atpg_pr', name:'run_atpg_pr', enabled:true, desc:'ATPG pattern', script:'run.tcl' },
  { key:'06_lec', name:'lec', enabled:true, desc:'等价性检查', script:'run.tcl' },
  { key:'10_deliver', name:'deliver', enabled:true, desc:'交付打包', script:'run.sh' }
];
const filterStepsByFeatures = (steps, features) => {
  const s = steps.map(x=>({...x}));
  if (!features.lbist) return s.filter(x=>!x.name.startsWith('lbist'));
  if (!features.mbist) return s.filter(x=>x.name!=='insert_mbist_bscan');
  return s;
};

const parsePreview = (designFiles, libraryFiles, topModule) => {
  const f = [...designFiles, ...libraryFiles];
  const has = (t)=>f.some(x=>x.type===t) || (t==='timing_lib');
  const count = (t)=>f.filter(x=>x.type===t).length;
  const sdc = count('sdc');
  const net = f.filter(x=>x.type==='rtl_netlist').length;
  const scanDef = f.find(x=>x.type==='cfg' || (x.name||'').toLowerCase().includes('scan_def'));
  const tap = ['TCK','TMS','TDI','TDO'].filter(p => f.some(x => (x.name||'').toLowerCase().includes(p.toLowerCase())));
  return {
    clocks: Math.max(1, sdc||1),
    resets: Math.max(1, Math.floor(net/2)||1),
    regCount: net * 1000 + (f.reduce((n,x)=>n+(x.name||'').length,0) % 5000),
    chainCount: scanDef ? Math.max(1, Math.floor(net*1000/1500)) : Math.max(1, Math.floor(net*1000/2000)),
    tapPortsDetected: tap,
    hasLib: has('timing_lib') || has('lef') || has('techfile'),
    topFound: !!(topModule && designFiles.some(df=>df.type==='rtl_netlist' && df.content && df.content.includes(`module ${topModule}`)))
  };
};

const calculateChecklist = (features, designFiles, libraryFiles, topModule) => {
  const f = [...designFiles, ...libraryFiles];
  const need = [];
  const hasType = t => f.some(x=>x.type===t) || (t==='timing_lib');
  const hasName = s => f.some(x=> (x.name||'').toLowerCase().includes(s));

  if (!topModule) need.push('请在"加载设计"中设置顶层模块名（Top Module）');
  if (topModule && !designFiles.some(df=>df.type==='rtl_netlist' && df.content && df.content.includes(`module ${topModule}`)))
    need.push(`未在任何 RTL/NETLIST 文件中发现顶层模块 "${topModule}"`);

  if (!designFiles.length) need.push('未加载任何 Design 文件（RTL/SDC/DFT配置 等）');
  if (!hasType('sdc')) need.push('缺少 SDC 时钟约束文件');
  if (!designFiles.some(f=>f.type==='rtl_netlist')) need.push('缺少 Netlist/RTL');

  if (features.tap && !(hasName('tck')||hasName('tms')||hasName('tdi')||hasName('tdo')))
    need.push('TAP(JTAG) 端口未检测到（基于文件名的示意检查）');

  if (features.mbist && !(hasType('dft_cfg')||hasName('memory_list')||hasType('list')))
    need.push('MBIST 需要 memory list（csv/tsv）或 MBIST 配置(yaml/json)');

  if (features.lbist) {
    if (!(features.occ || features.edt)) need.push('LBIST 建议启用 OCC 或 EDT');
    if (!hasName('lbist') && !hasType('dft_cfg')) need.push('LBIST 配置/宏未检测到（示意检查）');
  }

  if (features.edt && !hasName('edt')) need.push('EDT 相关文件未检测到（示意检查）');
  if (!hasName('scan_def') && !hasType('cfg')) need.push('未提供 scan_def/scan.cfg（若需插链/重排建议提供）');

  return need;
};

const buildProjectYaml = ({features, library, design, env}) => {
  const systemLibs = [SYSTEM_LIBRARIES.standardCellLib, SYSTEM_LIBRARIES.verilogModel];
  const data = {
    project_root: '.',
    features,
    library: {
      paths: [...library.paths, 'syn_library/standard_cells'],
      files: [...library.files.map(x => x.name), ...systemLibs]
    },
    design: {
      paths: design.paths,
      files: {
        netlist: design.files.find(x=>x.role==='netlist')?.name || '',
        rtl_root: design.files.find(x=>x.role==='rtl_root')?.name || '',
        sdc: design.files.filter(x=>x.type==='sdc').map(x=>x.name),
        scan_def: design.files.find(x=>(x.name||'').toLowerCase().includes('scan_def'))?.name || '',
        dft_cfg: design.files.find(x=>x.type==='dft_cfg')?.name || ''
      },
      top_module: design.topModule || ''
    },
    env: {
      template: env.template,
      root: env.root,
      steps: env.steps.map(s => ({enabled:s.enabled, name:s.name, dir:s.dir, script:s.script})),
      vars: env.vars
    }
  };
  return YAML.stringify(data);
};

/* ========= 组件 ========= */
export default function LoadPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [isHovered, setIsHovered] = useState({});

  const [features, setFeatures] = useState({
    bscan: true, ijtag:true, tap: true, mbist:true, mbisr_chain:false, mbisr_ctrl:false, lbist:true, ssn:false, edt:true, occ:true
  });
  const featureDescriptions = {
    bscan: "边界扫描 (Boundary Scan)，用于PCB级测试",
    ijtag: "内部JTAG，用于芯片内部测试访问",
    tap: "测试访问端口 (Test Access Port)，JTAG标准接口",
    mbist: "存储器内建自测试 (Memory BIST)",
    mbisr_chain: "MBIST结果寄存器链",
    mbisr_ctrl: "MBIST结果控制逻辑",
    lbist: "逻辑内建自测试 (Logic BIST)",
    ssn: "同时开关噪声 (Simultaneous Switching Noise) 分析",
    edt: "嵌入式确定性测试 (Embedded Deterministic Test)",
    occ: "片上时钟 (On-Chip Clock) 生成器"
  };

  const [libraryFiles, setLibraryFiles] = useState([]);
  const [designFiles, setDesignFiles] = useState([]);
  const [designTop, setDesignTop] = useState('');

  const [envTemplate, setEnvTemplate] = useState('tessent');
  const [envRoot, setEnvRoot] = useState('dft_flow');
  const [envSteps, setEnvSteps] = useState(
    filterStepsByFeatures(defaultEnvSteps, {mbist:true,lbist:true})
      .map((s,i)=>({...s, dir:`${(i+1).toString().padStart(2,'0')}_${s.name}`}))
  );
  const [envVars, setEnvVars] = useState({ TOP:'', NETLIST:'', SDC_FILES:[], SCAN_DEF:'', LIB_DIRS:['syn_library/standard_cells'], DFT_CFG:'' });

  const [checklist, setChecklist] = useState([]);
  const [readiness, setReadiness] = useState(0);
  const [preview, setPreview] = useState({ clocks:1, resets:1, regCount:0, chainCount:0, tapPortsDetected:[], hasLib:false, topFound:false });

  useEffect(() => {
    const newChecklist = calculateChecklist(features, designFiles, libraryFiles, designTop);
    const newReadiness = Math.max(0, 100 - newChecklist.length * 15);
    const newPreview = parsePreview(designFiles, libraryFiles, designTop);

    setChecklist(newChecklist);
    setReadiness(newReadiness);
    setPreview(newPreview);

    // 保存快照，供 Status / Analysis 读取
    const snapshot = {
      features, designTop,
      counts: newPreview,
      files: {
        libs: libraryFiles.map(f=>f.name),
        design: designFiles.map(f=>f.name)
      },
      checklist: newChecklist
    };
    localStorage.setItem('DFT_SNAPSHOT', JSON.stringify(snapshot));
  }, [features, designFiles, libraryFiles, designTop]);

  useEffect(() => {
    const filteredSteps = filterStepsByFeatures(defaultEnvSteps, features);
    const stepsWithDir = filteredSteps.map((s, i) => ({
      ...s, dir: `${(i + 1).toString().padStart(2, '0')}_${s.name}`
    }));
    setEnvSteps(stepsWithDir);
  }, [features]);

  const makeUploadProps = useCallback((dest) => ({
    multiple: true,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const item = {
          uid: file.uid,
          name: file.name,
          type: detectType(file.name),
          hash: hashLike(file.name),
          size: file.size,
          lastModified: file.lastModified,
          content
        };

        let role;
        if (dest === 'design' && item.type === 'rtl_netlist' && content) {
          const m = content.match(/module\s+(\w+)/);
          if (m && m[1]) {
            if (!designTop) setDesignTop(m[1]);
            if (m[1] === designTop) role = 'netlist';
          }
        }
        if (dest === 'lib') {
          setLibraryFiles(prev => [...prev, item]);
          message.success(`已添加库文件: ${file.name} (${formatFileSize(file.size)})`);
        } else {
          setDesignFiles(prev => [...prev, { ...item, role }]);
          message.success(`已添加设计文件: ${file.name} (${formatFileSize(file.size)})`);
        }
      };
      reader.readAsText(file);
      return false;
    },
    showUploadList: false
  }), [designTop]);

  const removeRow = useCallback((dest, uid, name) => {
    if (dest === 'lib') setLibraryFiles(list => list.filter(x => x.uid !== uid));
    else setDesignFiles(list => list.filter(x => x.uid !== uid));
    message.warning(`已移除文件: ${name}`);
  }, []);

  const featurePreset = useCallback((p) => {
    if (p === 'MBIST') {
      setFeatures({ mbist:true, mbisr_chain:true, mbisr_ctrl:false, tap:true, lbist:false, ssn:false, edt:false, occ:false, bscan:true, ijtag:true });
      return;
    }
    if (p === 'Logic-Only') {
      setFeatures({ mbist:false, mbisr_chain:false, mbisr_ctrl:false, tap:false, lbist:false, ssn:false, edt:true, occ:true, bscan:true, ijtag:true });
      return;
    }
    if (p === 'Full DFT') {
      setFeatures({ mbist:true, mbisr_chain:true, mbisr_ctrl:true, tap:true, lbist:true, ssn:false, edt:true, occ:true, bscan:true, ijtag:true });
      return;
    }
  }, []);

  const onValidate = useCallback(() => {
    if (!checklist.length) {
      Modal.success({
        title: <><CheckCircleOutlined style={{color:'#52c41a',marginRight:8}}/>快速检查通过</>,
        content: `当前配置满足最小就绪条件（示意）。系统将使用内嵌库：${SYSTEM_LIBRARIES.standardCellLib}`,
        maskClosable: true
      });
    } else {
      Modal.warning({
        title: <><ExclamationCircleTwoTone twoToneColor="#faad14" style={{marginRight:8}}/>发现缺失/告警项</>,
        content: (
          <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {checklist.map((c,i)=><li key={i} style={{marginBottom:8}}>{c}</li>)}
            </ul>
            <p style={{ marginTop: 16, color: '#666' }}>
              默认使用标准单元库 {SYSTEM_LIBRARIES.standardCellLib} 和 Verilog 模型 {SYSTEM_LIBRARIES.verilogModel}
            </p>
          </div>
        ),
        maskClosable: true,
        okText: '我知道了'
      });
    }
  }, [checklist]);

  const onGenerateEnv = useCallback(() => {
    const vars = { ...envVars };
    vars.TOP = designTop || vars.TOP;
    vars.NETLIST = designFiles.find(x=>x.role==='netlist' || x.type==='rtl_netlist')?.name || vars.NETLIST;
    vars.SDC_FILES = designFiles.filter(x=>x.type==='sdc').map(x=>x.name);
    vars.SCAN_DEF = designFiles.find(x=>(x.name||'').toLowerCase().includes('scan_def'))?.name || vars.SCAN_DEF;
    vars.LIB_DIRS = ['syn_library/standard_cells/tessent', 'syn_library/standard_cells/verilog', ...vars.LIB_DIRS];
    vars.DFT_CFG = designFiles.find(x=>x.type==='dft_cfg')?.name || vars.DFT_CFG;

    const yaml = buildProjectYaml({
      features,
      library: { paths:['libs/tech','libs/dft_ip','syn_library/standard_cells'], files: libraryFiles },
      design: { paths:['design'], files: designFiles, topModule: designTop },
      env: { template: envTemplate, root: envRoot, steps: envSteps, vars }
    });

    download('dft_project.yaml', yaml);
    message.success({ content: '已生成 dft_project.yaml', duration: 2, icon: <CheckCircleOutlined/> });
  }, [designFiles, designTop, envRoot, envSteps, envTemplate, envVars, libraryFiles, features]);

  const filteredDesignFiles = useMemo(() => {
    if (activeTab === 'all') return designFiles;
    return designFiles.filter(file => file.type === activeTab);
  }, [designFiles, activeTab]);

  const colsCommon = [
    { title:'名称', dataIndex:'name', ellipsis:true, render:(t)=>(
      <Tooltip title={t}><span className="file-name">{t}</span></Tooltip>
    )},
    { title:'类型', dataIndex:'type', width:130, render:t=>{
      const m = {
        timing_lib:{ color:'geekblue', text:'LIB' }, lef:{ color:'cyan', text:'LEF' },
        techfile:{ color:'orange', text:'Tech' }, rtl_netlist:{ color:'blue', text:'RTL/NETLIST' },
        sdc:{ color:'gold', text:'SDC' }, cfg:{ color:'purple', text:'CFG' },
        dft_cfg:{ color:'lime', text:'DFT CFG' }, list:{ color:'volcano', text:'LIST' },
        def:{ color:'magenta', text:'DEF' }, other:{ color:'gray', text:'OTHER' }
      };
      const c = m[t] || { color:'gray', text:String(t).toUpperCase() };
      return <Tag color={c.color}>{c.text}</Tag>;
    }},
    { title:'大小', dataIndex:'size', width:100, render:s=>s?formatFileSize(s):'-' },
    { title:'操作', dataIndex:'uid', width:90, render:(v,rec)=>(
      <Button
        size="small" danger type="text" icon={<DeleteOutlined/>}
        onClick={()=>removeRow(rec.kind, rec.uid, rec.name)}
        onMouseEnter={()=>setIsHovered(p=>({...p,[rec.uid]:true}))}
        onMouseLeave={()=>setIsHovered(p=>({...p,[rec.uid]:false}))}
        className={isHovered[rec.uid] ? 'delete-button-hover' : ''}
      >删除</Button>
    )}
  ];

  return (
    <div className="load-panel-wrapper" style={{ paddingBottom: 8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
        <Space>
          <span style={{fontWeight: 600}}>加载数据 (DFT Load)</span>
          <Badge status={checklist.length ? 'warning' : 'success'} text={checklist.length ? '部分就绪' : '就绪'} />
        </Space>
        <Space>
          <Button onClick={()=>setCurrentStep(s=>Math.max(0, s-1))} disabled={currentStep===0}>上一步</Button>
          <Button onClick={()=>setCurrentStep(s=>Math.min(2, s+1))} disabled={currentStep===2}>下一步</Button>
          <Button onClick={onValidate}>验证</Button>
          <Button type="primary" icon={<DownloadOutlined/>} onClick={onGenerateEnv} disabled={!designTop}>生成ENV</Button>
        </Space>
      </div>

      <Steps
        current={currentStep}
        items={[
          {title:'功能选择', description:'选择DFT特性与配置'},
          {title:'加载设计', description:'导入库文件与设计文件'},
          {title:'环境设置', description:'配置流程与参数'}
        ]}
        style={{ marginBottom: 12 }}
      />

      {currentStep === 0 && (
        <>
          <Card className="step-card" title="选择要启用的 DFT 功能">
            <Row gutter={[16, 16]}>
              {Object.entries(features).map(([k, v]) => (
                <Col key={k} xs={12} sm={12} md={8} lg={6}>
                  <Tooltip title={featureDescriptions[k] || `${k.toUpperCase()} 功能`}>
                    <div className="feature-item">
                      <Switch checked={v} onChange={c=>setFeatures(p=>({...p,[k]:c}))} className="feature-switch" />{' '}
                      <Text strong>{k.toUpperCase()}</Text>
                    </div>
                  </Tooltip>
                </Col>
              ))}
            </Row>
            <Divider />
            <Space>
              <Text type="secondary">功能预设：</Text>
              <Segmented options={['Logic-Only','MBIST','Full DFT']} onChange={featurePreset} />
            </Space>
          </Card>

          <Card className="alert-card" title="当前配置检查" style={{ marginTop: 12 }}>
            {checklist.length === 0 ? (
              <Alert
                type="success" showIcon
                message="当前功能配置无明显冲突（示意）"
                description={`系统将使用内嵌标准单元库: ${SYSTEM_LIBRARIES.standardCellLib}`}
              />
            ) : (
              <>
                {checklist.map((c,i)=><Alert key={i} type="warning" showIcon message={c} style={{ marginBottom:8 }}/>)}
                <Alert type="info" showIcon message="系统库" description={`标准单元库: ${SYSTEM_LIBRARIES.standardCellLib}；Verilog模型: ${SYSTEM_LIBRARIES.verilogModel}`} />
              </>
            )}
          </Card>
        </>
      )}

      {currentStep === 1 && (
        <>
          <Card className="step-card" title="Library（共享库）" extra={
            <Space>
              <Tooltip title="添加目录（示例）"><Button icon={<FolderAddOutlined/>}/></Tooltip>
              <Tooltip title="添加文件"><Button icon={<FileAddOutlined/>}/></Tooltip>
            </Space>
          }>
            <Alert
              type="info" showIcon
              message="系统已包含标准单元库"
              description={`默认使用: ${SYSTEM_LIBRARIES.standardCellLib} 和 ${SYSTEM_LIBRARIES.verilogModel}，可上传额外库文件`}
              style={{ marginBottom: 12 }}
            />
            <Dragger {...makeUploadProps('lib')} itemRender={() => null} multiple height={140}>
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">拖拽或点击选择额外的库文件（.lib/.lef/.tf 等）。本示例不上传服务器。</p>
            </Dragger>
            <Table
              size="small" rowKey="uid" pagination={false}
              dataSource={libraryFiles.map(x=>({...x, kind:'lib'}))}
              columns={colsCommon}
              style={{ marginTop: 12 }}
              locale={{ emptyText:'暂无额外库文件，系统将使用默认库' }}
            />
          </Card>

          <Card className="step-card" title="Design（当前设计）" style={{ marginTop: 12 }}>
            <Dragger {...makeUploadProps('design')} itemRender={() => null} multiple height={140}>
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">拖拽或点击选择设计文件（RTL/SDC/scan_def/DFT配置 等）。</p>
            </Dragger>

            <Segmented
              options={[
                { label:'全部', value:'all' },
                { label:'RTL/NETLIST', value:'rtl_netlist' },
                { label:'SDC', value:'sdc' },
                { label:'CFG', value:'cfg' },
                { label:'其他', value:'other' }
              ]}
              value={activeTab}
              onChange={setActiveTab}
              style={{ marginTop: 12 }}
            />

            <Form layout="inline" style={{ marginTop: 12 }}>
              <Form.Item label="Top Module" required>
                <Input value={designTop} onChange={e=>setDesignTop(e.target.value)} placeholder="输入顶层模块名" />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {preview.topFound ? <span style={{ color:'green' }}>✔️ 已在RTL中找到该模块</span> : <span style={{ color:'red' }}>⚠️ 未在RTL中找到该模块</span>}
                </Text>
              </Form.Item>
              <Form.Item label="自动解析"><Switch defaultChecked /></Form.Item>
              <Form.Item label="仅建立索引"><Switch /></Form.Item>
            </Form>

            <Table
              size="small" rowKey="uid" pagination={false}
              dataSource={filteredDesignFiles.map(x=>({...x, kind:'design'}))}
              columns={[
                ...colsCommon.slice(0,3),
                { title:'角色', dataIndex:'role', width:120, render:r=> r ? <Tag color="green">{r}</Tag> : '-' },
                colsCommon[3]
              ]}
              style={{ marginTop: 12 }}
              locale={{ emptyText:'暂无设计文件，请上传' }}
            />
          </Card>

          <Card className="step-card" title="解析预览" style={{ marginTop: 12 }}>
            <Row gutter={16}>
              <Col xs={12} sm={12} md={6}><Statistic title="时钟域" value={preview.clocks} prefix={<ClockCircleOutlined/>}/></Col>
              <Col xs={12} sm={12} md={6}><Statistic title="复位信号" value={preview.resets}/></Col>
              <Col xs={12} sm={12} md={6}><Statistic title="寄存器数(估)" value={preview.regCount} prefix={<CodeOutlined/>}/></Col>
              <Col xs={12} sm={12} md={6}><Statistic title="预估扫描链数" value={preview.chainCount}/></Col>
            </Row>
            <Divider />
            <Space>
              <Text>检测到 TAP 端口：</Text>
              {preview.tapPortsDetected.length ? preview.tapPortsDetected.map(p => <Tag key={p} color="blue">{p}</Tag>) : <Text type="secondary">未检测到</Text>}
            </Space>
            <Divider />
            <Alert type="info" showIcon message="顶层模块" description={designTop ? `当前设置: ${designTop}` : '请设置顶层模块名'} style={{ marginTop: 8 }}/>
            <Alert type="info" showIcon message="库信息" description={`综合/分析时将使用系统标准单元库: ${SYSTEM_LIBRARIES.standardCellLib}`} style={{ marginTop: 8 }}/>
          </Card>
        </>
      )}

      {currentStep === 2 && (
        <>
          <Card className="step-card" title="流程模板与工程根">
            <Space wrap>
              <span>模板：</span>
              <Radio.Group value={envTemplate} onChange={e=>setEnvTemplate(e.target.value)}>
                <Radio.Button value="tessent">Tessent</Radio.Button>
                <Radio.Button value="modus">Modus</Radio.Button>
                <Radio.Button value="dftc">DFT Compiler</Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>
              <span style={{ marginLeft: 12 }}>工程根：</span>
              <Input value={envRoot} onChange={e=>setEnvRoot(e.target.value)} style={{ width: 220 }}/>
            </Space>
          </Card>

          <Card className="step-card" title="步骤列表（可启/停与重命名目录）" style={{ marginTop: 12 }}>
            <Table
              size="small" rowKey="key" pagination={false}
              dataSource={envSteps}
              columns={[
                { title:'启用', dataIndex:'enabled', width:70, render:(v,rec)=><Switch checked={rec.enabled} onChange={c=>setEnvSteps(s=>s.map(x=>x.key===rec.key?{...x,enabled:c}:x))}/> },
                { title:'步骤名', dataIndex:'name', width:220, render:(t)=><Text code>{t}</Text> },
                { title:'目标目录', dataIndex:'dir', width:260, render:(v,rec)=><Input value={rec.dir} onChange={e=>setEnvSteps(s=>s.map(x=>x.key===rec.key?{...x,dir:e.target.value}:x))}/> },
                { title:'脚本', dataIndex:'script', width:180, render:(v,rec)=><Input value={rec.script} onChange={e=>setEnvSteps(s=>s.map(x=>x.key===rec.key?{...x,script:e.target.value}:x))}/> },
                { title:'说明', dataIndex:'desc', render:(d)=><Tooltip title={d}><span>{d}</span></Tooltip> }
              ]}
            />
          </Card>

          <Collapse items={[{
            key:'vars',
            label:'模板变量（自动从“加载设计”填充，可手动覆写）',
            children: (
              <Form labelCol={{span:4}}>
                <Form.Item label="TOP"><Input value={envVars.TOP} onChange={e=>setEnvVars(v=>({...v,TOP:e.target.value}))} placeholder={designTop || '顶层模块名'}/></Form.Item>
                <Form.Item label="NETLIST"><Input value={envVars.NETLIST} onChange={e=>setEnvVars(v=>({...v,NETLIST:e.target.value}))}/></Form.Item>
                <Form.Item label="SDC_FILES"><Input
                  value={Array.isArray(envVars.SDC_FILES)? envVars.SDC_FILES.join(','): envVars.SDC_FILES}
                  onChange={e=>setEnvVars(v=>({...v, SDC_FILES: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}
                /></Form.Item>
                <Form.Item label="SCAN_DEF"><Input value={envVars.SCAN_DEF} onChange={e=>setEnvVars(v=>({...v,SCAN_DEF:e.target.value}))}/></Form.Item>
                <Form.Item label="LIB_DIRS"><Input
                  value={Array.isArray(envVars.LIB_DIRS)? envVars.LIB_DIRS.join(','): envVars.LIB_DIRS}
                  onChange={e=>setEnvVars(v=>({...v, LIB_DIRS: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}
                  placeholder={`默认包含: ${SYSTEM_LIBRARIES.standardCellLib.split('/').slice(0,-1).join('/')}`}
                /></Form.Item>
                <Form.Item label="DFT_CFG"><Input value={envVars.DFT_CFG} onChange={e=>setEnvVars(v=>({...v,DFT_CFG:e.target.value}))}/></Form.Item>
              </Form>
            )
          }]} style={{ marginTop: 12 }}/>

          <Card className="step-card" title="目录预览" style={{ marginTop: 12 }}>
            <pre style={{ whiteSpace:'pre-wrap', margin:0 }}>
{envRoot}/
  libs/
    tech/
    dft_ip/
  syn_library/
    standard_cells/
      tessent/
        adk.tcelllib
      verilog/
        adk.v
{envSteps.filter(s=>s.enabled).map(s=>`  ${s.dir}/\n    ${s.script}\n`).join('')}
            </pre>
          </Card>
        </>
      )}

      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <Card title="缺失项 / 告警">
            {checklist.length === 0 ? (
              <Alert type="success" showIcon message="暂无缺失项，配置基本就绪（示意）" description="系统将使用内嵌标准单元库"/>
            ) : (
              <>
                {checklist.map((c,i)=><Alert key={i} type="warning" showIcon message={c} style={{ marginBottom:8 }}/>)}
                <Alert type="info" showIcon message="系统库信息" description="已包含标准单元库和Verilog模型"/>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="就绪度">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Progress percent={Math.min(100, readiness)} status={checklist.length ? 'active' : 'normal'} style={{ flex:1 }}/>
              <div style={{ width:56, textAlign:'right' }}>{Math.min(100, readiness)}%</div>
            </div>
          </Card>
          <Card title="解析摘要" style={{ marginTop: 12 }}>
            <div style={{ whiteSpace:'pre-line', fontFamily:'monospace' }}>
{`系统库: ${SYSTEM_LIBRARIES.standardCellLib}
顶层模块: ${designTop || '未设置'}
额外库文件: ${libraryFiles.length}
设计文件: ${designFiles.length}
Preview: clocks=${preview.clocks}, resets=${preview.resets}, regs≈${preview.regCount}, chains≈${preview.chainCount}`}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}