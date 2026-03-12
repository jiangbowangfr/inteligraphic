import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import YAML from 'yaml';
import {
  Steps, Space, Button, Badge, Card, Row, Col, Divider, Alert,
  Upload, Table, Tag, Switch, Typography, Tooltip, Segmented,
  Modal, message, Select, Input, Popconfirm, Checkbox,
  Tabs, Dropdown, Menu, Popover, Form, Radio, Progress
} from 'antd';
import {
  FolderAddOutlined, FileAddOutlined, UploadOutlined, DeleteOutlined,
  ExclamationCircleTwoTone, CheckCircleOutlined, FolderOpenOutlined,
  SyncOutlined, UpOutlined, DownOutlined, UndoOutlined,
  PlusOutlined, EyeOutlined, DownloadOutlined, ImportOutlined,
  FileTextOutlined, LinkOutlined, EditOutlined, SaveOutlined,
  CopyOutlined, FileOutlined, CodeOutlined, MoreOutlined,
  FileSearchOutlined, AppstoreOutlined, ConsoleSqlOutlined,
  ClearOutlined, DisconnectOutlined, BugOutlined, ReloadOutlined,
  PlayCircleOutlined, PauseCircleOutlined, ClusterOutlined,
  RocketOutlined, ThunderboltOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;
const { TabPane } = Tabs;

/* ========= 新增：配置存储管理器 ========= */
class ConfigStorageManager {
  constructor() {
    this.storageKey = 'dft_configurator_data_v2';
    this.filePathKey = 'dft_file_paths_v2';
  }

  saveFullConfig(config) {
    try {
      const configToSave = {
        ...config,
        timestamp: new Date().toISOString(),
        version: '2.0'
      };
      localStorage.setItem(this.storageKey, JSON.stringify(configToSave));
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }

  loadFullConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;
      
      const config = JSON.parse(saved);
      if (config.version && config.features && config.design) {
        return config;
      }
      return null;
    } catch (error) {
      console.error('加载配置失败:', error);
      return null;
    }
  }

  saveFilePathMapping(fileType, filePath, fileData) {
    try {
      const existing = this.loadFilePathMapping();
      const mapping = {
        ...existing,
        [fileType]: {
          ...existing[fileType],
          [filePath]: {
            ...fileData,
            lastAccessed: new Date().toISOString()
          }
        }
      };
      localStorage.setItem(this.filePathKey, JSON.stringify(mapping));
      return true;
    } catch (error) {
      console.error('保存文件路径失败:', error);
      return false;
    }
  }

  loadFilePathMapping() {
    try {
      const saved = localStorage.getItem(this.filePathKey);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('加载文件路径失败:', error);
      return {};
    }
  }

  getFileByPath(filePath) {
    const mapping = this.loadFilePathMapping();
    for (const fileType in mapping) {
      if (mapping[fileType][filePath]) {
        return {
          ...mapping[fileType][filePath],
          type: fileType
        };
      }
    }
    return null;
  }

  clearAll() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.filePathKey);
  }
}

const configStorage = new ConfigStorageManager();

/* ========= 新增：运行模式配置 ========= */
const RUN_MODES = {
  SINGLE: 'single',
  BATCH: 'batch'
};

const BATCH_RUN_OPTIONS = [
  { value: 'all', label: '所有Block' },
  { value: 'cpu_core', label: 'CPU Core' },
  { value: 'gpu_core', label: 'GPU Core' },
  { value: 'memory_ctrl', label: 'Memory Controller' },
  { value: 'io_interface', label: 'IO Interface' },
  { value: 'dsp_unit', label: 'DSP Unit' },
  { value: 'analog_core', label: 'Analog Core' }
];

/* ========= 错误边界组件（保持不变） ========= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('DFT Configurator Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
          <Card
            title={
              <Space>
                <BugOutlined style={{ color: '#ff4d4f' }} />
                应用遇到错误
              </Space>
            }
            actions={[
              <Button key="reset" icon={<ReloadOutlined />} onClick={this.handleReset}>
                重试组件
              </Button>,
              <Button key="reload" type="primary" onClick={this.handleReload}>
                刷新页面
              </Button>
            ]}
          >
            <Alert
              message="DFT配置器遇到意外错误"
              description="这可能是由于配置数据损坏或浏览器兼容性问题导致的。"
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>建议操作：</Text>
              <ul>
                <li>点击"重试组件"尝试恢复当前会话</li>
                <li>如果问题持续，点击"刷新页面"重新加载应用</li>
                <li>检查浏览器控制台获取详细错误信息</li>
              </ul>
            </div>

            <Button 
              type="link" 
              size="small" 
              onClick={this.toggleDetails}
              style={{ padding: 0 }}
            >
              {this.state.showDetails ? '隐藏' : '显示'}技术细节
            </Button>

            {this.state.showDetails && (
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 4,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                <Text code style={{ fontSize: 12 }}>
                  {this.state.error && this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Text>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ========= 系统内嵌库路径（保持不变） ========= */
const SYSTEM_LIBRARIES = {
  standardCellLib: 'syn_library/standard_cells/tessent/adk.tcelllib',
  verilogModel: 'syn_library/standard_cells/verilog/adk.v'
};

/* ========= 支持的库类型和设计文件类型（保持不变） ========= */
const SUPPORTED_LIBRARY_TYPES = [
  { value: 'lvlib', label: 'LVLIB' },
  { value: 'tcd_memory_library', label: 'TCD Memory Library' },
  { value: 'standard_cell', label: 'Standard Cell Library' },
  { value: 'timing_lib', label: 'Timing Library' },
  { value: 'lef', label: 'LEF' },
  { value: 'techfile', label: 'Tech File' },
  { value: 'other', label: 'Other' }
];

const SUPPORTED_DESIGN_TYPES = [
  { value: 'verilog_rtl', label: 'Verilog RTL' },
  { value: 'verilog_netlist', label: 'Verilog Netlist' },
  { value: 'vhdl_rtl', label: 'VHDL RTL' },
  { value: 'vhdl_netlist', label: 'VHDL Netlist' },
  { value: 'filelist', label: 'File List' },
  { value: 'sdc', label: 'SDC' },
  { value: 'cfg', label: 'CFG' },
  { value: 'dft_cfg', label: 'DFT CFG' },
  { value: 'list', label: 'List' },
  { value: 'def', label: 'DEF' },
  { value: 'other', label: 'Other' }
];

// 支持的步骤功能类型（保持不变）
const STEP_FUNCTIONS = [
  { value: 'insert_mbist_bscan', label: 'MBIST/边界扫描插入' },
  { value: 'logic_test_insertion', label: '逻辑级DFT结构插入' },
  { value: 'scan_insertion', label: '扫描链插入' },
  { value: 'atpg_pr', label: 'ATPG PR NETLIST' },
  { value: 'atpg_map', label: 'ATPG MAPPING NETLIST' },
  { value: 'atpg_syn', label: 'ATPG SYN NETLIST' },
  { value: 'atpg_retargeting', label: 'ATPG重定向' },
  { value: 'lbist_fault_simulation', label: 'LBIST故障仿真' },
  { value: 'lbist_pattern_gen', label: 'LBIST测试向量生成' },
  { value: 'lec', label: '等价性检查' },
  { value: 'deliver', label: '交付打包' },
];

/* ========= Shell 命令历史（保持不变） ========= */
const SHELL_HISTORY = [
  'ls -la',
  'pwd',
  'cd dft_flow',
  'ls -l */',
  'cat dft_project.yaml | head -20',
  './01.scan_insertion/run_scan_insertion.tcl',
  'grep -r "ERROR" logs/',
  'find . -name "*.rpt" -type f'
];

/* ========= 模板加载核心逻辑（保持不变） ========= */
const loadExternalTemplate = async (templateFileName) => {
  try {
    let response = await fetch(templateFileName);
    if (!response.ok) {
      const wildcardName = templateFileName.replace(/(_sa|_as)\.tcl$/, '_*.tcl');
      response = await fetch(wildcardName);
      if (!response.ok) {
        throw new Error(`无法加载模板 ${templateFileName} 及其通配符版本 ${wildcardName}`);
      }
      message.info(`使用通配符模板 ${wildcardName} 替代 ${templateFileName}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`模板加载失败 [${templateFileName}]:`, error.message);
    return `# 模板文件 ${templateFileName} 未找到或加载失败
# 请在脚本同级目录放置同名模板文件或对应通配符模板
# 支持变量：TOP(顶层模块)、NETLIST(网表)、SDC_FILES(约束列表)、LOG_DIR(日志目录)

set LOG_DIR "$::env(PROJECT_ROOT)/logs"
file mkdir $LOG_DIR
puts "警告：使用默认空模板，建议补充外部模板文件 ${templateFileName}"
`;
  }
};

/* ========= 小工具函数（保持不变） ========= */
const ext = (name = '') => (name.split('.').pop() || '').toLowerCase();
const detectDesignType = (name = '', content = '') => {
  const e = ext(name);
  
  if (e === 'f' || e === 'flist' || e === 'filelist') return 'filelist';
  
  if (['v', 'sv', 'vh'].includes(e)) {
    if (content) {
      const hasModule = /module\s+\w+/.test(content);
      const hasInstance = /\w+\s+\w+\s*[#(]/.test(content);
      if (hasModule && !hasInstance) return 'verilog_rtl';
      if (hasModule && hasInstance) return 'verilog_netlist';
    }
    if (name.toLowerCase().includes('netlist')) return 'verilog_netlist';
    return 'verilog_rtl';
  }
  
  if (['vhd', 'vhdl'].includes(e)) {
    if (content) {
      const hasEntity = /entity\s+\w+\s+is/.test(content);
      const hasComponent = /component\s+\w+/.test(content);
      if (hasEntity && !hasComponent) return 'vhdl_rtl';
      if (hasEntity && hasComponent) return 'vhdl_netlist';
    }
    if (name.toLowerCase().includes('netlist')) return 'vhdl_netlist';
    return 'vhdl_rtl';
  }
  
  if (['sdc'].includes(e)) return 'sdc';
  if (['cfg', 'def'].includes(e)) return e;
  if (['yaml', 'yml', 'json'].includes(e)) return 'dft_cfg';
  if (['csv', 'tsv'].includes(e)) return 'list';
  
  return 'other';
};

const detectLibraryType = (name = '') => {
  const e = ext(name);
  if (['lib', 'db', 'tcelllib'].includes(e)) return 'timing_lib';
  if (['lef'].includes(e)) return 'lef';
  if (['tf', 'tlu', 'tlu+', 'tluplus'].includes(e)) return 'techfile';
  if (['lvlib'].includes(e)) return 'lvlib';
  if (name.toLowerCase().includes('memory') && ['tcd'].includes(e)) return 'tcd_memory_library';
  if (name.toLowerCase().includes('standard') || name.toLowerCase().includes('cell')) return 'standard_cell';
  return 'other';
};

const hashLike = (s = '') => [...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(16);
const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const truncateText = (text, maxLines = 100, maxChars = 10000) => {
  if (!text) return '';
  let truncated = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
  const lines = truncated.split('\n');
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join('\n') + '\n... 更多内容已截断 ...';
  }
  return truncated;
};

const parseScripts = (scriptsStr) => {
  if (!scriptsStr) return [];
  return scriptsStr.split(',').map(s => s.trim()).filter(s => s);
};

const stringifyScripts = (scriptsArray) => {
  return scriptsArray.join(', ');
};

/* ========= 动态步骤生成逻辑（保持不变） ========= */
const generateStepsByFeatures = (features, hasAtpgRetargeting) => {
  const steps = [];
  let stepIndex = 1;

  if (!features.mbist && !features.bscan) {
    steps.push({
      key: `step${stepIndex}`,
      name: 'logic_test_insertion',
      enabled: true,
      desc: STEP_FUNCTIONS.find(f => f.value === 'logic_test_insertion').label,
      script: 'run_logic_test_insertion.tcl',
      dir: `${stepIndex.toString().padStart(2, '0')}.logic_test_insertion`,
      dependencies: [],
      templates: { 'run_logic_test_insertion.tcl': 'run_logic_test_insertion.tcl' }
    });
    stepIndex++;
  } else {
    if (features.mbist && features.bscan) {	  
      steps.push({
        key: `step${stepIndex}`,
        name: 'insert_mbist_bscan',
        enabled: true,
        desc: STEP_FUNCTIONS.find(f => f.value === 'insert_mbist_bscan').label,
        script: 'run_mbist_bscan_insertion.tcl',
        dir: `${stepIndex.toString().padStart(2, '0')}.insert_mbist_bscan`,
        dependencies: [],
        templates: {
          'run_mbist_bscan_insertion.tcl': 'run_mbist_bscan_insertion.tcl',
        }
      });
      stepIndex++;
    } else if (features.mbist && !features.bscan) {	  
      steps.push({
        key: `step${stepIndex}`,
        name: 'insert_mbist',
        enabled: true,
        desc: 'MBIST插入',
        script: 'run_mbist_insertion.tcl',
        dir: `${stepIndex.toString().padStart(2, '0')}.insert_mbist`,
        dependencies: [],
        templates: { 'run_mbist_insertion.tcl': 'run_mbist_insertion.tcl' }
      });
      stepIndex++;
    } else if (!features.mbist && features.bscan) {	  
      steps.push({
        key: `step${stepIndex}`,
        name: 'insert_bscan',
        enabled: true,
        desc: '边界扫描插入',
        script: 'run_bscan_insertion.tcl',
        dir: `${stepIndex.toString().padStart(2, '0')}.insert_bscan`,
        dependencies: [],
        templates: { 'run_bscan_insertion.tcl': 'run_bscan_insertion.tcl' }
      });
      stepIndex++;
    }
  }

  if (!(steps.length > 0 && steps[0].name === 'logic_test_insertion')) {
    const newStep = {
      key: `step${stepIndex}`,
      name: 'logic_test_insertion',
      enabled: true,
      desc: STEP_FUNCTIONS.find(f => f.value === 'logic_test_insertion').label,
      script: 'run_logic_test_insertion.tcl',
      dir: `${stepIndex.toString().padStart(2, '0')}.logic_test_insertion`,
      dependencies: steps.length > 0 ? [steps[0].key] : [],
      templates: { 'run_logic_test_insertion.tcl': 'run_logic_test_insertion.tcl' }
    };
    steps.push(newStep);
    stepIndex++;
  }

  const scanStep = {
    key: `step${stepIndex}`,
    name: 'scan_insertion',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'scan_insertion').label,
    script: 'run_scan_insertion.tcl',
    dir: `${stepIndex.toString().padStart(2, '0')}.scan_insertion`,
    dependencies: [steps[steps.length - 1].key],
    templates: {
      'run_scan_insertion.tcl': 'run_scan_insertion.tcl',
    }
  };
  steps.push(scanStep);
  stepIndex++;

  if (features.lbist) {
    const lbistSimStep = {
      key: `step${stepIndex}`,
      name: 'lbist_fault_simulation',
      enabled: true,
      desc: STEP_FUNCTIONS.find(f => f.value === 'lbist_fault_simulation').label,
      script: 'run_lbist_fault_simulation.tcl',
      dir: `${stepIndex.toString().padStart(2, '0')}.lbist_fault_simulation`,
      dependencies: [steps[steps.length - 1].key],
      templates: { 'run_lbist_fault_simulation.tcl': 'run_lbist_fault_simulation.tcl' }
    };
    steps.push(lbistSimStep);
    stepIndex++;

    const lbistGenStep = {
      key: `step${stepIndex}`,
      name: 'lbist_pattern_gen',
      enabled: true,
      desc: STEP_FUNCTIONS.find(f => f.value === 'lbist_pattern_gen').label,
      script: 'run_lbist_pattern_gen.tcl',
      dir: `${stepIndex.toString().padStart(2, '0')}.lbist_pattern_gen`,
      dependencies: [steps[steps.length - 1].key],
      templates: { 'run_lbist_pattern_gen.tcl': 'run_lbist_pattern_gen.tcl' }
    };
    steps.push(lbistGenStep);
    stepIndex++;
  }

  const atpgPrStep = {
    key: `step${stepIndex}`,
    name: 'atpg_pr',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'atpg_pr').label,
    script: 'run_atpg_pr_sa_intest.tcl, run_atpg_pr_as_intest.tcl,run_atpg_pr_sa_extest.tcl, run_atpg_pr_as_extest.tcl',
    dir: `${stepIndex.toString().padStart(2, '0')}.atpg_pr`,
    dependencies: [steps[steps.length - 1].key],
    templates: {
      'run_atpg_pr_sa.tcl': 'run_atpg_pr_*.tcl',
      'run_atpg_pr_as.tcl': 'run_atpg_pr_*.tcl'
    }
  };
  steps.push(atpgPrStep);
  stepIndex++;

  const atpgMapStep = {
    key: `step${stepIndex}`,
    name: 'atpg_map',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'atpg_map').label,
    script: 'run_atpg_map_sa_intest.tcl, run_atpg_map_as_intest.tcl,run_atpg_map_sa_extest.tcl, run_atpg_map_as_extest.tcl',
    dir: `${stepIndex.toString().padStart(2, '0')}.atpg_map`,
    dependencies: [steps[steps.length - 1].key],
    templates: {
      'run_atpg_map_sa.tcl': 'run_atpg_map_*.tcl',
      'run_atpg_map_as.tcl': 'run_atpg_map_*.tcl'
    }
  };
  steps.push(atpgMapStep);
  stepIndex++;

  const atpgSynStep = {
    key: `step${stepIndex}`,
    name: 'atpg_syn',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'atpg_syn').label,
    script: 'run_atpg_syn_sa_intest.tcl, run_atpg_syn_as_intest.tcl,run_atpg_syn_sa_extest.tcl, run_atpg_syn_as_extest.tcl',
    dir: `${stepIndex.toString().padStart(2, '0')}.atpg_syn`,
    dependencies: [steps[steps.length - 1].key],
    templates: {
      'run_atpg_syn_sa.tcl': 'run_atpg_syn_*.tcl',
      'run_atpg_syn_as.tcl': 'run_atpg_syn_*.tcl'
    }
  };
  steps.push(atpgSynStep);
  stepIndex++;

  if (hasAtpgRetargeting) {
    const retargetStep = {
      key: `step${stepIndex}`,
      name: 'atpg_retargeting',
      enabled: true,
      desc: STEP_FUNCTIONS.find(f => f.value === 'atpg_retargeting').label,
      script: 'run_atpg_retarget_sa.tcl, run_atpg_retarget_as.tcl',
      dir: `${stepIndex.toString().padStart(2, '0')}.atpg_retargeting`,
      dependencies: [steps[steps.length - 1].key],
      templates: {
        'run_atpg_retarget_sa.tcl': 'run_atpg_retarget_*.tcl',
        'run_atpg_retarget_as.tcl': 'run_atpg_retarget_*.tcl'
      }
    };
    steps.push(retargetStep);
    stepIndex++;
  }

  const lecStep = {
    key: `step${stepIndex}`,
    name: 'lec',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'lec').label,
    script: 'run_r2r_lec.tcl, run_g2g_lec.tcl',
    dir: `${stepIndex.toString().padStart(2, '0')}.lec`,
    dependencies: [steps[steps.length - 1].key],
    templates: {
      'run_r2r_lec.tcl': 'run_r2r_lec.tcl',
      'run_g2g_lec.tcl': 'run_g2g_lec.tcl'
    }
  };
  steps.push(lecStep);
  stepIndex++;

  const deliverStep = {
    key: `step${stepIndex}`,
    name: 'deliver',
    enabled: true,
    desc: STEP_FUNCTIONS.find(f => f.value === 'deliver').label,
    script: 'run.sh, generate_report.tcl, package_results.py',
    dir: `${stepIndex.toString().padStart(2, '0')}_deliver`,
    dependencies: steps.map(step => step.key),
    templates: {
      'run.sh': 'run.sh',
      'generate_report.tcl': 'generate_report.tcl',
      'package_results.py': 'package_results.py'
    }
  };
  steps.push(deliverStep);

  return steps;
};

/* ========= 备份功能（保持不变） ========= */
const backupStep = async (rootDirHandle, stepDir) => {
  try {
    const backupRootHandle = await createDirectory(rootDirHandle, 'dft_env_backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `${stepDir}_backup_${timestamp}`;
    const backupDirHandle = await createDirectory(backupRootHandle, backupDir);
    
    let stepDirHandle;
    try {
      stepDirHandle = await rootDirHandle.getDirectoryHandle(stepDir, { create: false });
    } catch {
      message.warning(`步骤目录 ${stepDir} 不存在，无需备份`);
      return false;
    }
    
    await copyDirectory(stepDirHandle, backupDirHandle);
    
    message.success(`已备份 ${stepDir} 到 dft_env_backup/${backupDir}`);
    return true;
  } catch (error) {
    message.error(`备份失败：${error.message}`);
    return false;
  }
};

const copyDirectory = async (sourceHandle, destinationHandle) => {
  for await (const [name, entry] of sourceHandle.entries()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      const writable = await destinationHandle.getFileHandle(name, { create: true }).then(h => h.createWritable());
      await writable.write(await file.arrayBuffer());
      await writable.close();
    } else if (entry.kind === 'directory') {
      const subDir = await destinationHandle.getDirectoryHandle(name, { create: true });
      await copyDirectory(entry, subDir);
    }
  }
};

/* ========= 目录和文件操作（保持不变） ========= */
const createDirectory = async (parentHandle, dirPath) => {
  const pathParts = dirPath.split('/').filter(part => part);
  let currentHandle = parentHandle;

  for (const part of pathParts) {
    try {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: false });
    } catch {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
    }
  }
  return currentHandle;
};

const createFile = async (dirHandle, fileName, content) => {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (error) {
    message.warning(`创建文件 ${fileName} 失败：${error.message}`);
    return false;
  }
};

/* ========= 配置构建（增强路径存储） ========= */
const buildProjectYaml = ({ features, library, design, env }) => {
  const systemLibs = [SYSTEM_LIBRARIES.standardCellLib, SYSTEM_LIBRARIES.verilogModel];
  const data = {
    project_root: env.root,
    features,
    library: {
      paths: [...library.paths, 'syn_library/standard_cells'],
      files: [
        ...library.files.map(x => ({ 
          name: x.name, 
          type: x.type,
          absolutePath: x.absolutePath || x.name, // 新增：存储绝对路径
          hash: x.hash,
          size: x.size,
          lastModified: x.lastModified
        })), 
        ...systemLibs.map(name => ({ 
          name, 
          type: 'standard_cell',
          absolutePath: name
        }))
      ]
    },
    design: {
      paths: design.paths,
      files: {
        netlist: design.files.find(x => x.type.includes('netlist')) ? {
          ...design.files.find(x => x.type.includes('netlist')),
          absolutePath: design.files.find(x => x.type.includes('netlist'))?.absolutePath || ''
        } : null,
        rtl: design.files.filter(x => x.type.includes('rtl')).map(x => ({
          ...x,
          absolutePath: x.absolutePath || ''
        })),
        sdc: design.files.filter(x => x.type === 'sdc').map(x => ({
          ...x,
          absolutePath: x.absolutePath || ''
        })),
        scan_def: design.files.find(x => (x.name || '').toLowerCase().includes('scan_def')) ? {
          ...design.files.find(x => (x.name || '').toLowerCase().includes('scan_def')),
          absolutePath: design.files.find(x => (x.name || '').toLowerCase().includes('scan_def'))?.absolutePath || ''
        } : null,
        dft_cfg: design.files.find(x => x.type === 'dft_cfg') ? {
          ...design.files.find(x => x.type === 'dft_cfg'),
          absolutePath: design.files.find(x => x.type === 'dft_cfg')?.absolutePath || ''
        } : null,
        filelists: design.files.filter(x => x.type === 'filelist').map(x => ({
          ...x,
          absolutePath: x.absolutePath || ''
        }))
      },
      top_module: design.topModule || ''
    },
    env: { 
      template: env.template, 
      root: env.root, 
      steps: env.steps.map(s => ({ 
        enabled: s.enabled, 
        name: s.name, 
        dir: s.dir, 
        script: s.script,
        templates: s.templates,
        dependencies: s.dependencies || [],
        absolutePath: s.absolutePath || s.dir // 新增：步骤绝对路径
      })),
      vars: env.vars
    },
    metadata: {
      created: new Date().toISOString(),
      version: '2.0',
      hasAbsolutePaths: true
    }
  };
  return YAML.stringify(data);
};

const parseProjectYaml = (yamlContent) => {
  try {
    const config = YAML.parse(yamlContent);
    
    // 验证并修复路径信息
    if (config.design && config.design.files) {
      Object.keys(config.design.files).forEach(key => {
        const files = config.design.files[key];
        if (Array.isArray(files)) {
          config.design.files[key] = files.map(file => ({
            ...file,
            absolutePath: file.absolutePath || file.name || '',
            uid: file.uid || generateUniqueId()
          }));
        } else if (files && typeof files === 'object') {
          config.design.files[key] = {
            ...files,
            absolutePath: files.absolutePath || files.name || '',
            uid: files.uid || generateUniqueId()
          };
        }
      });
    }
    
    return config;
  } catch (error) {
    message.error(`解析配置文件失败：${error.message}`);
    return null;
  }
};

/* ========= 真实 Shell 组件（保持不变） ========= */
const RealShellInterface = ({ rootDirName, projectRoot }) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(['正在初始化 Shell 连接...']);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  
  const ws = useRef(null);
  const outputEndRef = useRef(null);

  const DFT_COMMANDS = [
    'ls -la',
    'pwd',
    'find . -name "*.tcl" -type f | head -20',
    'find . -name "*.v" -type f | head -20',
    'find . -name "*.sv" -type f | head -20',
    'which tessent',
    'tessent -version',
    'cd dft_flow && ls -l',
    'grep -r "ERROR" logs/ 2>/dev/null | head -10',
    'find . -name "*.rpt" -type f | head -10'
  ];

  const scrollToBottom = () => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  const connectToShell = () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionError('');
    setOutput(prev => [...prev, '正在连接到真实 Linux Shell...']);

    try {
      const wsUrl = `ws://localhost:3001?projectPath=${encodeURIComponent(projectRoot || rootDirName || process.cwd())}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket 连接已建立');
        setIsConnected(true);
        setIsConnecting(false);
        setOutput(prev => [...prev, '✓ 已连接到真实 Linux Shell', '']);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'output':
              setOutput(prev => [...prev, data.data]);
              break;
            case 'error':
              setOutput(prev => [...prev, `错误: ${data.data}`]);
              break;
            case 'close':
              setOutput(prev => [...prev, `提示: ${data.data}`]);
              setIsConnected(false);
              break;
            default:
              setOutput(prev => [...prev, data.data]);
          }
        } catch (error) {
          setOutput(prev => [...prev, `接收消息错误: ${error.message}`]);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket 连接关闭:', event);
        setIsConnected(false);
        setIsConnecting(false);
        if (!event.wasClean) {
          setConnectionError('连接异常断开');
          setOutput(prev => [...prev, '✗ Shell 连接已断开']);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        setConnectionError('连接失败，请确保后端服务正在运行');
        setIsConnecting(false);
        setOutput(prev => [...prev, '✗ 连接失败']);
      };

    } catch (error) {
      console.error('连接错误:', error);
      setConnectionError(`连接错误: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const disconnectShell = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setOutput(prev => [...prev, 'Shell 连接已手动断开']);
  };

  const executeCommand = (cmd) => {
    if (!cmd.trim()) return;
    
    if (!isConnected) {
      setOutput(prev => [...prev, '错误: 未连接到 Shell', '请先点击"连接"按钮']);
      return;
    }

    setOutput(prev => [...prev, `$ ${cmd}`]);
    
    try {
      ws.current.send(JSON.stringify({
        type: 'command',
        command: cmd
      }));
      
      setCommandHistory(prev => [...prev, cmd]);
      setHistoryIndex(-1);
      setCommand('');
    } catch (error) {
      setOutput(prev => [...prev, `发送命令错误: ${error.message}`]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : commandHistory.length - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      setCommand(newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex]);
    }
  };

  const clearOutput = () => {
    setOutput(['Shell 输出已清空', '']);
  };

  useEffect(() => {
    connectToShell();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <Card 
      title={
        <Space>
          <ConsoleSqlOutlined />
          真实 Linux Shell
          <Tag color={isConnected ? "green" : isConnecting ? "orange" : "red"}>
            {isConnected ? "已连接" : isConnecting ? "连接中..." : "未连接"}
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={clearOutput}
            disabled={!isConnected}
          >
            清屏
          </Button>
          {isConnected ? (
            <Button 
              size="small" 
              danger
              icon={<DisconnectOutlined />}
              onClick={disconnectShell}
            >
              断开
            </Button>
          ) : (
            <Button 
              size="small" 
              type="primary"
              icon={<LinkOutlined />}
              onClick={connectToShell}
              loading={isConnecting}
            >
              {isConnecting ? '连接中...' : '连接'}
            </Button>
          )}
        </Space>
      }
      style={{ height: '100%' }}
    >
      {connectionError && (
        <Alert 
          message={connectionError} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={connectToShell}>
              重试
            </Button>
          }
        />
      )}
      
      <div style={{ 
        backgroundColor: '#1e1e1e', 
        color: '#00ff00', 
        fontFamily: 'monospace, "Courier New"',
        height: 400,
        padding: 16,
        borderRadius: 4,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {output.map((line, index) => (
          <div key={index} style={{ 
            marginBottom: 2,
            lineHeight: '1.4'
          }}>
            {line}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#00ff00' }}>$ </span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#00ff00',
              fontFamily: 'monospace, "Courier New"',
              fontSize: 14,
              outline: 'none',
              flex: 1,
              marginLeft: 8,
              opacity: isConnected ? 1 : 0.6
            }}
            placeholder={isConnected ? "输入 Linux 命令..." : "请先连接 Shell..."}
          />
        </div>
        <div ref={outputEndRef} />
      </div>
      
      <div style={{ marginTop: 16 }}>
        <Text strong>常用 DFT 命令:</Text>
        <Space size="small" wrap style={{ marginTop: 8 }}>
          {DFT_COMMANDS.map((cmd, index) => (
            <Button 
              key={index} 
              size="small" 
              onClick={() => executeCommand(cmd)}
              disabled={!isConnected}
            >
              {cmd.length > 20 ? cmd.substring(0, 20) + '...' : cmd}
            </Button>
          ))}
        </Space>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text type="secondary">
          当前项目路径: {projectRoot || rootDirName || '未设置'}
          {!isConnected && (
            <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
              • 请确保后端服务运行在 localhost:3001
            </span>
          )}
        </Text>
      </div>
    </Card>
  );
};

/* ========= 新增：运行控制组件 ========= */
const RunControlPanel = ({ 
  envSteps, 
  rootDirHandle, 
  designTop, 
  runMode, 
  onRunModeChange,
  selectedBlocks,
  onBlocksChange 
}) => {
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [selectedStep, setSelectedStep] = useState('');
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [runLog, setRunLog] = useState([]);
  const [currentRunningStep, setCurrentRunningStep] = useState('');

  const getRunnableSteps = useCallback(() => {
    return envSteps
      .filter(step => step.enabled)
      .map(step => ({
        value: step.key,
        label: `${step.dir} - ${step.desc}`,
        step
      }));
  }, [envSteps]);

  const buildDependencyChain = (steps, targetStepKey) => {
    const targetStep = steps.find(s => s.key === targetStepKey);
    if (!targetStep) return [];

    const chain = [];
    const visited = new Set();

    const addDependencies = (stepKey) => {
      const step = steps.find(s => s.key === stepKey);
      if (!step || visited.has(stepKey)) return;

      if (step.dependencies) {
        step.dependencies.forEach(dep => addDependencies(dep));
      }

      if (!visited.has(stepKey)) {
        chain.push(step);
        visited.add(stepKey);
      }
    };

    addDependencies(targetStepKey);
    return chain;
  };

  const executeStepRun = useCallback(async (stepKey, mode, blocks = []) => {
    if (!rootDirHandle) {
      message.error('请先选择根目录');
      return;
    }

    setRunning(true);
    setRunProgress(0);
    setRunLog([`开始执行 ${mode} 模式运行...`]);

    try {
      const targetStep = envSteps.find(step => step.key === stepKey);
      if (!targetStep) {
        throw new Error('未找到指定步骤');
      }

      const stepsToRun = buildDependencyChain(envSteps, stepKey);
      const totalSteps = stepsToRun.length;
      
      setRunLog(prev => [...prev, `将运行以下步骤: ${stepsToRun.map(s => s.dir).join(' -> ')}`]);

      if (mode === RUN_MODES.BATCH) {
        setRunLog(prev => [...prev, `批量模式运行 Blocks: ${blocks.join(', ')}`]);
        
        for (const block of blocks) {
          setRunLog(prev => [...prev, `开始处理 Block: ${block}`]);
          
          for (let i = 0; i < stepsToRun.length; i++) {
            const step = stepsToRun[i];
            setCurrentRunningStep(step.dir);
            setRunLog(prev => [...prev, `[${block}] 执行步骤: ${step.dir}`]);
            
            // 模拟步骤执行
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const progress = ((i + 1) / totalSteps) * 100;
            setRunProgress(progress);
            setRunLog(prev => [...prev, `[${block}] 完成步骤: ${step.dir}`]);
          }
        }
      } else {
        // 单模式运行
        for (let i = 0; i < stepsToRun.length; i++) {
          const step = stepsToRun[i];
          setCurrentRunningStep(step.dir);
          setRunLog(prev => [...prev, `执行步骤: ${step.dir}`]);
          
          // 模拟步骤执行
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const progress = ((i + 1) / totalSteps) * 100;
          setRunProgress(progress);
          setRunLog(prev => [...prev, `完成步骤: ${step.dir}`]);
        }
      }

      setRunProgress(100);
      setRunLog(prev => [...prev, '🎉 所有步骤执行完成！']);
      setCurrentRunningStep('');
      message.success('运行完成');

    } catch (error) {
      setRunLog(prev => [...prev, `❌ 运行错误: ${error.message}`]);
      message.error(`运行失败: ${error.message}`);
      setCurrentRunningStep('');
    } finally {
      setRunning(false);
    }
  }, [envSteps, rootDirHandle]);

  const handleRun = () => {
    if (!selectedStep) {
      message.warning('请选择要运行的步骤');
      return;
    }

    if (runMode === RUN_MODES.BATCH && selectedBlocks.length === 0) {
      message.warning('请选择要运行的Blocks');
      return;
    }

    executeStepRun(
      selectedStep, 
      runMode, 
      runMode === RUN_MODES.BATCH ? selectedBlocks : []
    );
    setRunModalVisible(false);
  };

  const clearLog = () => {
    setRunLog([]);
    setRunProgress(0);
  };

  return (
    <Card 
      title={
        <Space>
          <RocketOutlined />
          运行控制
          <Tag color={running ? "orange" : "green"}>
            {running ? "运行中..." : "就绪"}
          </Tag>
        </Space>
      }
      style={{ marginTop: 20 }}
      extra={
        <Button 
          size="small" 
          icon={<ClearOutlined />}
          onClick={clearLog}
          disabled={running}
        >
          清空日志
        </Button>
      }
    >
      <Form layout="vertical">
        <Form.Item label="运行模式">
          <Radio.Group 
            value={runMode} 
            onChange={(e) => onRunModeChange(e.target.value)}
            disabled={running}
          >
            <Radio.Button value={RUN_MODES.SINGLE}>
              <ThunderboltOutlined /> 单模式 (当前设计)
            </Radio.Button>
            <Radio.Button value={RUN_MODES.BATCH}>
              <ClusterOutlined /> 批量模式 (多Block)
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {runMode === RUN_MODES.BATCH && (
          <Form.Item label="选择Blocks">
            <Checkbox.Group 
              value={selectedBlocks}
              onChange={onBlocksChange}
              disabled={running}
            >
              <Row>
                {BATCH_RUN_OPTIONS.map(option => (
                  <Col span={8} key={option.value} style={{ marginBottom: 8 }}>
                    <Checkbox value={option.value}>{option.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => setRunModalVisible(true)}
              disabled={!rootDirHandle || !designTop || running}
              size="large"
            >
              运行脚本
            </Button>
            {running && (
              <Button 
                danger
                icon={<PauseCircleOutlined />}
                onClick={() => {
                  setRunning(false);
                  setRunLog(prev => [...prev, '⏹️ 运行已停止']);
                }}
              >
                停止运行
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>

      {/* 运行进度 */}
      {running && (
        <div style={{ marginTop: 20 }}>
          <Text strong>当前运行: {currentRunningStep}</Text>
          <Progress 
            percent={Math.round(runProgress)} 
            status={runProgress === 100 ? "success" : "active"}
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      {/* 运行日志 */}
      {runLog.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Text strong>运行日志:</Text>
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            color: '#00ff00', 
            fontFamily: 'monospace',
            height: 200,
            padding: 10,
            borderRadius: 4,
            overflow: 'auto',
            marginTop: 8,
            fontSize: 12
          }}>
            {runLog.map((log, index) => (
              <div key={index} style={{ lineHeight: '1.4' }}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* 运行配置弹窗 */}
      <Modal
        title="运行配置"
        visible={runModalVisible}
        onCancel={() => setRunModalVisible(false)}
        onOk={handleRun}
        confirmLoading={running}
        width={700}
        okText="开始运行"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="运行到步骤" required>
            <Select
              value={selectedStep}
              onChange={setSelectedStep}
              placeholder="选择要运行到的步骤"
              disabled={running}
            >
              {getRunnableSteps().map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="运行信息">
            <Alert
              message="运行说明"
              description={
                <div>
                  <p>• 系统将自动运行所有前置依赖步骤</p>
                  <p>• 单模式：运行当前设计 {designTop}</p>
                  <p>• 批量模式：为每个选中的Block独立运行</p>
                  {selectedStep && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong>依赖步骤链:</Text>
                      <div style={{ 
                        marginTop: 8, 
                        padding: 8, 
                        backgroundColor: '#f0f8ff', 
                        borderRadius: 4 
                      }}>
                        {buildDependencyChain(envSteps, selectedStep)
                          .map((step, index) => (
                            <div key={step.key}>
                              {index + 1}. {step.dir} - {step.desc}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              }
              type="info"
              showIcon
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

/* ========= 主组件（保持所有原有功能，只添加新功能） ========= */
function LoadPanel() {
  // 所有原有状态保持不变
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [rootDirHandle, setRootDirHandle] = useState(null);
  const [rootDirName, setRootDirName] = useState('未选择');
  const [editingField, setEditingField] = useState(null);
  const [stepHistory, setStepHistory] = useState([]);

  // 文件预览相关状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  
  // 步骤依赖配置相关状态
  const [dependencyModalVisible, setDependencyModalVisible] = useState(false);
  const [currentStepDependencies, setCurrentStepDependencies] = useState([]);
  const [currentStepKey, setCurrentStepKey] = useState(null);

  // 模板相关状态
  const [customTemplates, setCustomTemplates] = useState({});
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [loadedTemplates, setLoadedTemplates] = useState({});

  // 多脚本编辑弹窗状态
  const [scriptsEditorVisible, setScriptsEditorVisible] = useState(false);
  const [currentScripts, setCurrentScripts] = useState([]);
  const [currentEditingStepKey, setCurrentEditingStepKey] = useState(null);

  // 配置复制相关状态
  const [copySourceConfig, setCopySourceConfig] = useState(null);
  const [copyConfigModalVisible, setCopyConfigModalVisible] = useState(false);
  const [copyOptions, setCopyOptions] = useState({
    copyFeatures: true,
    copyLibrary: true,
    copySteps: true,
    copyEnvVars: true,
    copyDesignName: false,
    copyFileList: false
  });

  // 新增：运行模式相关状态
  const [runMode, setRunMode] = useState(RUN_MODES.SINGLE);
  const [selectedBlocks, setSelectedBlocks] = useState([]);

  // 功能选择状态（保持不变）
  const [features, setFeatures] = useState({
    bscan: true, ijtag: true, tap: true, mbist: true,
    mbisr_chain: false, mbisr_ctrl: false, lbist: true,
    ssn: false, edt: true, occ: true
  });

  // ATPG重定向使能状态
  const [hasAtpgRetargeting, setHasAtpgRetargeting] = useState(false);

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
  
  // 动态生成步骤列表
  const [envSteps, setEnvSteps] = useState(
    generateStepsByFeatures(features, hasAtpgRetargeting)
  );
  
  const [envVars, setEnvVars] = useState({ 
    TOP: '', NETLIST: '', SDC_FILES: [], 
    SCAN_DEF: '', LIB_DIRS: ['syn_library/standard_cells'], 
    DFT_CFG: '' 
  });

  // 用于文件导入的ref
  const importInputRef = useRef(null);
  const templateImportRef = useRef(null);
  const copyConfigInputRef = useRef(null);

  // 新增：自动保存配置到本地存储
  useEffect(() => {
    const autoSaveConfig = () => {
      const configToSave = {
        features,
        library: { 
          paths: ['libs/tech', 'libs/dft_ip', 'syn_library/standard_cells'], 
          files: libraryFiles.map(file => ({
            ...file,
            absolutePath: file.absolutePath || file.name
          }))
        },
        design: { 
          paths: ['design'], 
          files: designFiles.map(file => ({
            ...file,
            absolutePath: file.absolutePath || file.name
          })), 
          topModule: designTop 
        },
        env: { 
          template: envTemplate, 
          root: rootDirName, 
          steps: envSteps.map(step => ({
            ...step,
            absolutePath: step.absolutePath || step.dir
          })), 
          vars: envVars 
        },
        runMode,
        selectedBlocks,
        hasAtpgRetargeting
      };
      
      configStorage.saveFullConfig(configToSave);
    };

    const timeoutId = setTimeout(autoSaveConfig, 1000);
    return () => clearTimeout(timeoutId);
  }, [features, libraryFiles, designFiles, designTop, envTemplate, rootDirName, envSteps, envVars, runMode, selectedBlocks, hasAtpgRetargeting]);

  // 新增：加载保存的配置
  useEffect(() => {
    const savedConfig = configStorage.loadFullConfig();
    if (savedConfig) {
      setFeatures(savedConfig.features || features);
      setLibraryFiles(savedConfig.library?.files || []);
      setDesignFiles(savedConfig.design?.files || []);
      setDesignTop(savedConfig.design?.topModule || '');
      setEnvTemplate(savedConfig.env?.template || 'tessent');
      setEnvRoot(savedConfig.env?.root || 'dft_flow');
      setEnvSteps(savedConfig.env?.steps || generateStepsByFeatures(features, hasAtpgRetargeting));
      setEnvVars(savedConfig.env?.vars || envVars);
      setRunMode(savedConfig.runMode || RUN_MODES.SINGLE);
      setSelectedBlocks(savedConfig.selectedBlocks || []);
      setHasAtpgRetargeting(savedConfig.hasAtpgRetargeting || false);
      
      message.info('已加载保存的配置');
    }
  }, []);

  // 保存步骤历史记录（保持不变）
  const saveStepHistory = useCallback((steps) => {
    setStepHistory(prev => {
      const newHistory = [...prev.slice(-10), JSON.stringify(steps)];
      return newHistory;
    });
  }, []);

  // 当功能选择变化时，重新生成步骤列表（保持不变）
  const [stepsModified, setStepsModified] = useState(false);
  useEffect(() => {
    if (!stepsModified) {
      const newSteps = generateStepsByFeatures(features, hasAtpgRetargeting);
      setEnvSteps(newSteps);
      saveStepHistory(newSteps);
      setLoadedTemplates({});
    }
  }, [features, hasAtpgRetargeting, stepsModified, saveStepHistory]);

  /* ========= 配置复制功能（保持不变） ========= */
  const openCopyConfigModal = useCallback(() => {
    setCopyConfigModalVisible(true);
  }, []);

  const handleCopyConfig = useCallback(() => {
    if (!copySourceConfig) {
      message.error('请先选择要复制的配置');
      return;
    }

    try {
      if (copyOptions.copyFeatures) {
        setFeatures(copySourceConfig.features || features);
      }
      
      if (copyOptions.copyLibrary) {
        setLibraryFiles([...(copySourceConfig.library?.files || [])]);
      }
      
      if (copyOptions.copySteps) {
        const normalizedSteps = copySourceConfig.env?.steps?.map(step => {
          const scripts = parseScripts(step.script);
          const templates = step.templates || {};
          
          scripts.forEach(script => {
            if (!templates[script]) {
              templates[script] = script;
            }
          });
          
          return { ...step, templates };
        }) || [];
        setEnvSteps(normalizedSteps);
        setStepsModified(true);
        saveStepHistory(normalizedSteps);
      }
      
      if (copyOptions.copyEnvVars) {
        setEnvVars({ ...copySourceConfig.env?.vars });
        setEnvTemplate(copySourceConfig.env?.template || 'tessent');
        setEnvRoot(copySourceConfig.env?.root || 'dft_flow');
      }
      
      if (copyOptions.copyDesignName) {
        setDesignTop(copySourceConfig.design?.top_module || '');
      }
      
      if (copyOptions.copyFileList) {
        setDesignFiles([...(copySourceConfig.design?.files || [])]);
      }

      setCopyConfigModalVisible(false);
      message.success('配置复制成功');
      setLoadedTemplates({});
      
    } catch (error) {
      message.error(`配置复制失败: ${error.message}`);
    }
  }, [copySourceConfig, copyOptions, features, saveStepHistory]);

  const handleConfigFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      message.error('请选择YAML格式的配置文件');
      event.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const config = parseProjectYaml(content);
        
        if (config) {
          setCopySourceConfig(config);
          message.success(`已加载配置: ${file.name}`);
        }
      } catch (error) {
        message.error(`配置文件解析失败: ${error.message}`);
      }
      
      event.target.value = '';
    };
    reader.readAsText(file);
  }, []);

  // 复制配置弹窗组件（保持不变）
  const CopyConfigModal = () => (
    <Modal
      title="从现有配置复制"
      visible={copyConfigModalVisible}
      onCancel={() => setCopyConfigModalVisible(false)}
      width={700}
      footer={[
        <Button key="cancel" onClick={() => setCopyConfigModalVisible(false)}>
          取消
        </Button>,
        <Button 
          key="copy" 
          type="primary" 
          onClick={handleCopyConfig}
          disabled={!copySourceConfig}
        >
          应用复制配置
        </Button>
      ]}
    >
      <Alert
        message="配置复制说明"
        description="选择要复制的配置部分，可以快速基于现有配置创建新项目。"
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />
      
      <div style={{ marginBottom: 20 }}>
        <Typography.Text strong>选择配置文件：</Typography.Text>
        <input
          type="file"
          accept=".yaml,.yml"
          onChange={handleConfigFileSelect}
          style={{ marginLeft: 10 }}
          ref={copyConfigInputRef}
        />
        {copySourceConfig && (
          <Tag color="green" style={{ marginLeft: 10 }}>
            已加载: {copySourceConfig.env?.root || '未知项目'}
          </Tag>
        )}
      </div>
      
      <Divider />
      
      <Typography.Text strong>复制选项：</Typography.Text>
      <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copyFeatures}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copyFeatures: e.target.checked
            }))}
          >
            DFT功能选择
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copyLibrary}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copyLibrary: e.target.checked
            }))}
          >
            库文件配置
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copySteps}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copySteps: e.target.checked
            }))}
          >
            步骤流程配置
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copyEnvVars}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copyEnvVars: e.target.checked
            }))}
          >
            环境变量
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copyDesignName}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copyDesignName: e.target.checked
            }))}
          >
            设计名称 (Top Module)
          </Checkbox>
        </Col>
        <Col span={12}>
          <Checkbox 
            checked={copyOptions.copyFileList}
            onChange={(e) => setCopyOptions(prev => ({
              ...prev,
              copyFileList: e.target.checked
            }))}
          >
            设计文件列表
          </Checkbox>
        </Col>
      </Row>
      
      {copySourceConfig && (
        <div style={{ marginTop: 20, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
          <Typography.Text strong>配置预览：</Typography.Text>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>项目根目录: {copySourceConfig.env?.root || '未设置'}</li>
            <li>顶层模块: {copySourceConfig.design?.top_module || '未设置'}</li>
            <li>设计文件数: {copySourceConfig.design?.files?.length || 0}</li>
            <li>库文件数: {copySourceConfig.library?.files?.length || 0}</li>
            <li>步骤数: {copySourceConfig.env?.steps?.length || 0}</li>
          </ul>
        </div>
      )}
    </Modal>
  );

  /* ========= 模板核心操作（保持不变） ========= */
  const getTemplateContent = useCallback(async (templateFileName, scriptName) => {
    if (customTemplates[`${scriptName}|${templateFileName}`]) {
      return customTemplates[`${scriptName}|${templateFileName}`];
    }
    
    if (loadedTemplates[`${scriptName}|${templateFileName}`]) {
      return loadedTemplates[`${scriptName}|${templateFileName}`];
    }

    const templateContent = await loadExternalTemplate(templateFileName);
    setLoadedTemplates(prev => ({ 
      ...prev, 
      [`${scriptName}|${templateFileName}`]: templateContent 
    }));
    return templateContent;
  }, [customTemplates, loadedTemplates]);

  const openTemplateEditor = useCallback(async (stepKey, scriptName, templateFileName) => {
    setGenerating(true);
    try {
      const templateContent = await getTemplateContent(templateFileName, scriptName);
      setEditingTemplate({
        stepKey,
        scriptName,
        templateName: templateFileName,
        content: templateContent,
        isCustom: !!customTemplates[`${scriptName}|${templateFileName}`]
      });
      setTemplateModalVisible(true);
    } catch (error) {
      message.error(`打开模板编辑失败：${error.message}`);
    } finally {
      setGenerating(false);
    }
  }, [getTemplateContent, customTemplates]);

  const saveTemplateChanges = useCallback(() => {
    if (!editingTemplate) return;

    const key = `${editingTemplate.scriptName}|${editingTemplate.templateName}`;
    setCustomTemplates(prev => ({
      ...prev,
      [key]: editingTemplate.content
    }));
    setLoadedTemplates(prev => ({
      ...prev,
      [key]: editingTemplate.content
    }));

    message.success(`模板 ${editingTemplate.scriptName} -> ${editingTemplate.templateName} 已保存`);
    setTemplateModalVisible(false);
    setEditingTemplate(null);
  }, [editingTemplate]);

  const changeScriptTemplate = useCallback((stepKey, scriptName, newTemplateName) => {
    saveStepHistory(envSteps);
    
    const updatedSteps = envSteps.map(step => {
      if (step.key === stepKey) {
        const newTemplates = { ...step.templates };
        newTemplates[scriptName] = newTemplateName;
        return { ...step, templates: newTemplates };
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
    
    getTemplateContent(newTemplateName, scriptName).then(() => {
      message.success(`脚本 ${scriptName} 的模板已切换为 ${newTemplateName}`);
    }).catch(error => {
      message.warning(`切换模板成功，但预加载失败：${error.message}`);
    });
  }, [envSteps, saveStepHistory, getTemplateContent]);

  const batchUpdateTemplates = useCallback((stepKey, newTemplatePattern) => {
    saveStepHistory(envSteps);
    
    const updatedSteps = envSteps.map(step => {
      if (step.key === stepKey) {
        const scripts = parseScripts(step.script);
        const newTemplates = { ...step.templates };
        
        scripts.forEach(script => {
          const ext = script.split('.').pop();
          const baseName = script.replace(`.${ext}`, '');
          newTemplates[script] = newTemplatePattern.replace('*', baseName.split('_').pop());
        });
        
        return { ...step, templates: newTemplates };
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
    message.success(`已批量更新步骤中所有脚本的模板`);
  }, [envSteps, saveStepHistory]);

  /* ========= 步骤生成相关功能（保持不变） ========= */
  const selectRootDirectory = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
        title: '选择DFT环境根目录'
      });
      setRootDirHandle(handle);
      setRootDirName(handle.name);
      message.success(`已选择根目录：${handle.name}`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        message.error(`目录选择失败：${error.message}`);
      }
    }
  }, []);

  const generateSingleStep = useCallback(async (step) => {
    if (!rootDirHandle) {
      message.warning('请先选择根目录');
      return;
    }

    setGenerating(true);
    try {
      const vars = { ...envVars };
      vars.TOP = designTop || vars.TOP;
      vars.NETLIST = designFiles.find(x => x.type.includes('netlist'))?.name || vars.NETLIST;
      vars.SDC_FILES = designFiles.filter(x => x.type === 'sdc').map(x => x.name);
      vars.SCAN_DEF = designFiles.find(x => (x.name || '').toLowerCase().includes('scan_def'))?.name || vars.SCAN_DEF;
      vars.LIB_DIRS = ['syn_library/standard_cells/tessent', 'syn_library/standard_cells/verilog', ...vars.LIB_DIRS];
      vars.DFT_CFG = designFiles.find(x => x.type === 'dft_cfg')?.name || vars.DFT_CFG;
      vars.PROJECT_ROOT = rootDirHandle.name;

      const stepDirHandle = await createDirectory(rootDirHandle, step.dir);
      
      const scripts = parseScripts(step.script);
      for (const script of scripts) {
        const templateFileName = step.templates[script] || script;
        const templateContent = await getTemplateContent(templateFileName, script);
        
        let scriptContent = templateContent;
        Object.entries(vars).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            scriptContent = scriptContent.replace(new RegExp(`\\$${key}`, 'g'), value.join(' '));
          } else {
            scriptContent = scriptContent.replace(new RegExp(`\\$${key}`, 'g'), value);
          }
        });
        
        if (script.endsWith('.tcl')) {
          scriptContent = `# 自动生成的TCL脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
        } else if (script.endsWith('.sh')) {
          scriptContent = `#!/bin/bash\n# 自动生成的Shell脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
        } else if (script.endsWith('.py')) {
          scriptContent = `#!/usr/bin/env python3\n# 自动生成的Python脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
        }
        
        await createFile(stepDirHandle, script, scriptContent);
      }
      
      message.success(`已生成步骤：${step.dir}（${scripts.length}个脚本）`);
    } catch (error) {
      message.error(`生成步骤失败：${error.message}`);
    } finally {
      setGenerating(false);
    }
  }, [rootDirHandle, envVars, designTop, designFiles, getTemplateContent]);

  const regenerateSingleStep = useCallback(async (step) => {
    if (!rootDirHandle) {
      message.warning('请先选择根目录');
      return;
    }

    Modal.confirm({
      title: '重新生成步骤',
      content: `确定要重新生成 ${step.dir} 吗？\n会先备份当前目录到 dft_env_backup`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setGenerating(true);
        try {
          await backupStep(rootDirHandle, step.dir);
          await generateSingleStep(step);
        } finally {
          setGenerating(false);
        }
      }
    });
  }, [rootDirHandle, generateSingleStep]);

  const generateAllSteps = useCallback(async () => {
    if (!designTop) {
      message.warning('请先设置顶层模块名（Top Module）');
      return;
    }
    if (!rootDirHandle) {
      await selectRootDirectory();
      if (!rootDirHandle) return;
    }

    const dependencyIssues = checkStepDependencies(envSteps);
    if (dependencyIssues.length > 0) {
      Modal.error({
        title: '步骤依赖配置错误',
        content: (
          <div>
            <p>发现以下依赖问题：</p>
            <ul>
              {dependencyIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
            <p>请修复后再生成步骤。</p>
          </div>
        )
      });
      return;
    }

    setGenerating(true);
    try {
      const vars = { ...envVars };
      vars.TOP = designTop || vars.TOP;
      vars.NETLIST = designFiles.find(x => x.type.includes('netlist'))?.name || vars.NETLIST;
      vars.SDC_FILES = designFiles.filter(x => x.type === 'sdc').map(x => x.name);
      vars.SCAN_DEF = designFiles.find(x => (x.name || '').toLowerCase().includes('scan_def'))?.name || vars.SCAN_DEF;
      vars.LIB_DIRS = ['syn_library/standard_cells/tessent', 'syn_library/standard_cells/verilog', ...vars.LIB_DIRS];
      vars.DFT_CFG = designFiles.find(x => x.type === 'dft_cfg')?.name || vars.DFT_CFG;
      vars.PROJECT_ROOT = rootDirHandle.name;

      const yamlContent = buildProjectYaml({
        features,
        library: { paths: ['libs/tech', 'libs/dft_ip', 'syn_library/standard_cells'], files: libraryFiles },
        design: { paths: ['design'], files: designFiles, topModule: designTop },
        env: { 
          template: envTemplate, 
          root: rootDirHandle.name, 
          steps: envSteps, 
          vars
        }
      });

      const baseDirs = [
        'libs/tech', 'libs/dft_ip',
        'syn_library/standard_cells/tessent', 'syn_library/standard_cells/verilog',
        'design', 'scripts', 'dft_env_backup', 'logs'
      ];
      for (const dir of baseDirs) {
        await createDirectory(rootDirHandle, dir);
      }

      let totalScripts = 0;
      for (const step of envSteps.filter(s => s.enabled)) {
        const stepDirHandle = await createDirectory(rootDirHandle, step.dir);
        const scripts = parseScripts(step.script);
        totalScripts += scripts.length;
        
        for (const script of scripts) {
          const templateFileName = step.templates[script] || script;
          const templateContent = await getTemplateContent(templateFileName, script);
          
          let scriptContent = templateContent;
          Object.entries(vars).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              scriptContent = scriptContent.replace(new RegExp(`\\$${key}`, 'g'), value.join(' '));
            } else {
              scriptContent = scriptContent.replace(new RegExp(`\\$${key}`, 'g'), value);
            }
          });
          
          if (script.endsWith('.tcl')) {
            scriptContent = `# 自动生成的TCL脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
          } else if (script.endsWith('.sh')) {
            scriptContent = `#!/bin/bash\n# 自动生成的Shell脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
          } else if (script.endsWith('.py')) {
            scriptContent = `#!/usr/bin/env python3\n# 自动生成的Python脚本: ${script}\n# 基于模板: ${templateFileName}\n` + scriptContent;
          }
          
          await createFile(stepDirHandle, script, scriptContent);
        }
      }

      const designDirHandle = await createDirectory(rootDirHandle, 'design');
      for (const file of designFiles) {
        await createFile(designDirHandle, file.name, file.content || '');
      }
      await createFile(rootDirHandle, 'dft_project.yaml', yamlContent);

      const tessentDirHandle = await createDirectory(rootDirHandle, 'syn_library/standard_cells/tessent');
      await createFile(tessentDirHandle, 'adk.tcelllib', '# 系统标准单元库占位文件\n# 请替换为实际的.tcelllib文件内容');
      const verilogDirHandle = await createDirectory(rootDirHandle, 'syn_library/standard_cells/verilog');
      await createFile(verilogDirHandle, 'adk.v', '// 系统Verilog模型占位文件\n// 请替换为实际的标准单元Verilog模型');

      Modal.success({
        title: 'ENV生成完成！',
        content: (
          <div>
            <p>根目录：{rootDirHandle.name}</p>
            <p>已创建 {envSteps.filter(s => s.enabled).length} 个步骤目录，共 {totalScripts} 个脚本文件</p>
            <p>配置文件：dft_project.yaml（可用于导入配置）</p>
          </div>
        ),
        maskClosable: true
      });
    } catch (error) {
      console.error('Generate steps error:', error);
      message.error(`ENV生成失败：${error.message}`);
    } finally {
      setGenerating(false);
    }
  }, [
    designTop, rootDirHandle, selectRootDirectory, designFiles, libraryFiles,
    features, envTemplate, envSteps, envVars, getTemplateContent
  ]);

  /* ========= 步骤管理功能（保持不变） ========= */
  const checkStepDependencies = (steps) => {
    const issues = [];
    const stepKeys = steps.map(step => step.key);
    
    steps.forEach(step => {
      if (step.dependencies && step.dependencies.length) {
        step.dependencies.forEach(depKey => {
          if (!stepKeys.includes(depKey)) {
            issues.push(`步骤 "${step.name}" 依赖了不存在的步骤（${depKey}）`);
          }
        });
      }
    });
    
    const checkCycles = (startKey, currentKey, path = []) => {
      if (currentKey === startKey && path.length > 0) {
        return [...path, currentKey];
      }
      if (path.includes(currentKey)) {
        return null;
      }
      const currentStep = steps.find(s => s.key === currentKey);
      if (!currentStep || !currentStep.dependencies || !currentStep.dependencies.length) {
        return null;
      }
      for (const depKey of currentStep.dependencies) {
        const cycle = checkCycles(startKey, depKey, [...path, currentKey]);
        if (cycle) {
          return cycle;
        }
      }
      return null;
    };
    
    steps.forEach(step => {
      const cycle = checkCycles(step.key, step.key);
      if (cycle) {
        issues.push(`发现循环依赖：${cycle.join(' → ')}`);
      }
    });
    
    return issues;
  };

  const addNewStep = useCallback(() => {
    saveStepHistory(envSteps);
    
    const newStepIndex = envSteps.length + 1;
    const scriptNames = [
      `run_custom_step_${newStepIndex}_1.tcl`,
      `run_custom_step_${newStepIndex}_2.tcl`,
      `report_results.sh`
    ];
    
    const templates = {};
    scriptNames.forEach(script => {
      templates[script] = script;
    });
    
    const newStep = {
      key: `step_${generateUniqueId()}`,
      name: 'custom_step',
      enabled: true,
      desc: `自定义步骤${newStepIndex}`,
      script: stringifyScripts(scriptNames),
      dir: `${newStepIndex.toString().padStart(2, '0')}_custom_step`,
      dependencies: envSteps.length > 0 ? [envSteps[envSteps.length - 1].key] : [],
      templates
    };
    
    setEnvSteps([...envSteps, newStep]);
    setStepsModified(true);
    message.success(`已添加新步骤，包含 ${scriptNames.length} 个脚本`);
  }, [envSteps, saveStepHistory]);

  const openScriptsEditor = useCallback((step) => {
    if (step.name.startsWith('atpg_')) {
      Modal.warning({
        title: '保护提示',
        content: 'ATPG相关步骤的脚本不允许修改'
      });
      return;
    }
    
    setCurrentEditingStepKey(step.key);
    setCurrentScripts(parseScripts(step.script));
    setScriptsEditorVisible(true);
  }, []);

  const saveScriptsEditor = useCallback(() => {
    if (!currentEditingStepKey) return;
    
    const validScripts = currentScripts.filter(s => s.trim());
    if (validScripts.length === 0) {
      message.warning('至少需要保留一个脚本');
      return;
    }
    
    saveStepHistory(envSteps);
    
    const updatedSteps = envSteps.map(step => {
      if (step.key === currentEditingStepKey) {
        const newScriptStr = stringifyScripts(validScripts);
        const newTemplates = { ...step.templates };
        
        validScripts.forEach(script => {
          if (!newTemplates[script]) {
            newTemplates[script] = script;
          }
        });
        
        Object.keys(newTemplates).forEach(script => {
          if (!validScripts.includes(script)) {
            delete newTemplates[script];
          }
        });
        
        return { ...step, script: newScriptStr, templates: newTemplates };
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
    setScriptsEditorVisible(false);
    message.success(`已更新脚本列表（共 ${validScripts.length} 个脚本）`);
  }, [envSteps, currentEditingStepKey, currentScripts, saveStepHistory]);

  const addScriptInEditor = useCallback(() => {
    const step = envSteps.find(s => s.key === currentEditingStepKey);
    if (!step) return;
    
    const stepNumber = parseInt(step.dir.substring(0, 2));
    const newScriptIndex = currentScripts.length + 1;
    const newScriptName = `run_step_${stepNumber}_${newScriptIndex}.tcl`;
    
    setCurrentScripts([...currentScripts, newScriptName]);
  }, [envSteps, currentEditingStepKey, currentScripts]);

  const removeScriptInEditor = useCallback((index) => {
    if (currentScripts.length <= 1) {
      message.warning('至少需要保留一个脚本');
      return;
    }
    
    setCurrentScripts(currentScripts.filter((_, i) => i !== index));
  }, [currentScripts]);

  const toggleStepEnabled = useCallback((key, enabled) => {
    saveStepHistory(envSteps);
    
    setEnvSteps(envSteps.map(step => 
      step.key === key ? { ...step, enabled } : step
    ));
    setStepsModified(true);
  }, [envSteps, saveStepHistory]);

  const undoStepChange = useCallback(() => {
    if (stepHistory.length === 0) {
      message.warning('没有可撤销的操作');
      return;
    }
    
    const previousSteps = JSON.parse(stepHistory[stepHistory.length - 1]);
    setEnvSteps(previousSteps);
    setStepHistory(prev => prev.slice(0, -1));
    setStepsModified(true);
    setLoadedTemplates({});
    message.success('已撤销上一步操作');
  }, [stepHistory]);

  const moveStep = useCallback((key, direction) => {
    const stepIndex = envSteps.findIndex(step => step.key === key);
    const stepToMove = envSteps[stepIndex];
    
    if (stepToMove.name.startsWith('atpg_')) {
      Modal.warning({
        title: '保护提示',
        content: 'ATPG相关步骤为核心步骤，不允许移动位置。'
      });
      return;
    }
    
    if ((direction === 'up' && stepIndex === 0) || 
        (direction === 'down' && stepIndex === envSteps.length - 1)) {
      return;
    }
    
    saveStepHistory(envSteps);
    const newSteps = [...envSteps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];
    
    const updatedSteps = newSteps.map((step, idx) => {
      const stepNumber = idx + 1;
      const paddedNumber = stepNumber.toString().padStart(2, '0');
      if (!step.name.startsWith('atpg_') && step.dir) {
        const dirParts = step.dir.split('_');
        if (!isNaN(parseInt(dirParts[0]))) {
          return { ...step, dir: `${paddedNumber}_${dirParts.slice(1).join('_')}` };
        } else {
          return { ...step, dir: `${paddedNumber}_${step.dir}` };
        }
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
  }, [envSteps, saveStepHistory]);

  const updateStepField = useCallback((key, field, value) => {
    const stepToUpdate = envSteps.find(step => step.key === key);
    if (stepToUpdate && stepToUpdate.name.startsWith('atpg_')) {
      if (field === 'name') {
        Modal.warning({
          title: '保护提示',
          content: 'ATPG相关步骤的功能类型不允许修改'
        });
        setEditingField(null);
        return;
      }
    }
    
    saveStepHistory(envSteps);
    
    let updatedSteps = envSteps.map(step => {
      if (step.key === key) {
        let updatedStep = { ...step, [field]: value };
        
        if (field === 'dir') {
          const stepIndex = envSteps.findIndex(s => s.key === key);
          const stepNumber = stepIndex + 1;
          const paddedNumber = stepNumber.toString().padStart(2, '0');
          if (!value.startsWith(`${paddedNumber}_`)) {
            const dirParts = value.split('_');
            if (!isNaN(parseInt(dirParts[0]))) {
              updatedStep.dir = `${paddedNumber}_${dirParts.slice(1).join('_')}`;
            } else {
              updatedStep.dir = `${paddedNumber}_${value}`;
            }
          }
        }
        
        if (field === 'name' && !step.name.startsWith('atpg_')) {
          const stepFunc = STEP_FUNCTIONS.find(f => f.value === value);
          if (stepFunc) {
            updatedStep.desc = stepFunc.label;
            
            const scripts = [
              `run_${value}_1.tcl`,
              `run_${value}_2.tcl`
            ];
            
            updatedStep.script = stringifyScripts(scripts);
            
            const newTemplates = {};
            scripts.forEach(script => {
              newTemplates[script] = script;
            });
            updatedStep.templates = newTemplates;
            
            setLoadedTemplates(prev => {
              const newLoaded = { ...prev };
              Object.keys(step.templates).forEach(template => {
                delete newLoaded[`${template}|${step.templates[template]}`];
              });
              return newLoaded;
            });
          }
        }
        
        return updatedStep;
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
    setEditingField(null);
  }, [envSteps, saveStepHistory]);

  /* ========= 其他辅助功能（保持不变） ========= */
  const openDependencyModal = useCallback((step) => {
    if (step.name.startsWith('atpg_')) {
      Modal.warning({
        title: '保护提示',
        content: 'ATPG相关步骤的依赖关系不允许修改'
      });
      return;
    }
    
    setCurrentStepKey(step.key);
    setCurrentStepDependencies([...(step.dependencies || [])]);
    setDependencyModalVisible(true);
  }, []);

  const saveStepDependencies = useCallback(() => {
    if (!currentStepKey) return;
    
    saveStepHistory(envSteps);
    const updatedSteps = envSteps.map(step => {
      if (step.key === currentStepKey) {
        return { ...step, dependencies: currentStepDependencies };
      }
      return step;
    });
    
    setEnvSteps(updatedSteps);
    setStepsModified(true);
    setDependencyModalVisible(false);
    message.success('步骤依赖已更新');
  }, [envSteps, currentStepKey, currentStepDependencies, saveStepHistory]);

  const toggleDependency = useCallback((depKey) => {
    setCurrentStepDependencies(prev => {
      if (prev.includes(depKey)) {
        return prev.filter(key => key !== depKey);
      } else {
        if (depKey !== currentStepKey) {
          return [...prev, depKey];
        }
        return prev;
      }
    });
  }, [currentStepKey]);

  const resetSteps = useCallback(() => {
    Modal.confirm({
      title: '重置步骤列表',
      content: '确定要将步骤列表重置为默认状态吗？当前修改将会丢失',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        const newSteps = generateStepsByFeatures(features, hasAtpgRetargeting);
        setEnvSteps(newSteps);
        saveStepHistory(newSteps);
        setStepsModified(false);
        setLoadedTemplates({});
        setCustomTemplates({});
        message.success('已重置步骤列表');
      }
    });
  }, [features, hasAtpgRetargeting, saveStepHistory]);

  const showFilePreview = useCallback((file) => {
    setPreviewFile(file);
    if (file.size > 1024 * 1024) {
      const lines = file.content.split('\n').slice(0, 100).join('\n');
      setPreviewContent(`文件过大（${formatFileSize(file.size)}），仅显示前100行...\n\n${lines}`);
    } else {
      setPreviewContent(file.content || '文件内容为空');
    }
    setPreviewVisible(true);
  }, []);

  const exportConfiguration = useCallback(() => {
    try {
      const yamlContent = buildProjectYaml({
        features,
        library: { paths: ['libs/tech', 'libs/dft_ip', 'syn_library/standard_cells'], files: libraryFiles },
        design: { paths: ['design'], files: designFiles, topModule: designTop },
        env: { 
          template: envTemplate, 
          root: rootDirName, 
          steps: envSteps, 
          vars: envVars
        }
      });
      
      const blob = new Blob([yamlContent], { type: 'application/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dft_project_${new Date().toISOString().slice(0,10)}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      message.success('配置已导出');
    } catch (error) {
      message.error(`导出配置失败：${error.message}`);
    }
  }, [features, libraryFiles, designFiles, designTop, envTemplate, rootDirName, envSteps, envVars]);

  const importConfiguration = useCallback(() => {
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  }, []);

  // 增强的配置导入处理 - 包含自动更新所有页面
  const handleFileImport = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      message.error('请导入YAML格式的配置文件');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const config = parseProjectYaml(content);
        
        if (config) {
          Modal.confirm({
            title: '导入配置',
            content: '确定要导入配置文件吗？这将覆盖当前所有设置并自动更新到所有页面。',
            okText: '确认导入',
            cancelText: '取消',
            onOk: () => {
              // 全面更新所有状态
              setFeatures(config.features || features);
              setDesignTop(config.design?.top_module || '');
              setEnvTemplate(config.env?.template || 'tessent');
              setEnvRoot(config.env?.root || 'dft_flow');
              
              // 处理文件路径映射
              if (config.design && config.design.files) {
                const designFilesWithPaths = [];
                Object.values(config.design.files).forEach(fileGroup => {
                  if (Array.isArray(fileGroup)) {
                    fileGroup.forEach(file => {
                      if (file.absolutePath) {
                        const fileData = configStorage.getFileByPath(file.absolutePath);
                        if (fileData) {
                          designFilesWithPaths.push(fileData);
                        } else {
                          designFilesWithPaths.push(file);
                        }
                      }
                    });
                  } else if (fileGroup && fileGroup.absolutePath) {
                    const fileData = configStorage.getFileByPath(fileGroup.absolutePath);
                    if (fileData) {
                      designFilesWithPaths.push(fileData);
                    } else {
                      designFilesWithPaths.push(fileGroup);
                    }
                  }
                });
                setDesignFiles(designFilesWithPaths);
              }
              
              if (config.env?.steps) {
                const normalizedSteps = config.env.steps.map(step => {
                  const scripts = parseScripts(step.script);
                  const templates = step.templates || {};
                  
                  scripts.forEach(script => {
                    if (!templates[script]) {
                      templates[script] = script;
                    }
                  });
                  
                  return { ...step, templates };
                });
                setEnvSteps(normalizedSteps);
                setStepsModified(true);
                saveStepHistory(normalizedSteps);
                setLoadedTemplates({});
              }
              
              // 更新环境变量
              setEnvVars(config.env?.vars || envVars);
              
              // 更新运行模式设置
              setRunMode(config.runMode || RUN_MODES.SINGLE);
              setSelectedBlocks(config.selectedBlocks || []);
              setHasAtpgRetargeting(config.hasAtpgRetargeting || false);
              
              message.success('配置导入成功，所有页面已更新');
              
              // 自动跳转到步骤配置页面
              setCurrentStep(3);
            }
          });
        }
      } catch (error) {
        message.error(`导入配置失败：${error.message}`);
      }
      
      e.target.value = '';
    };
    reader.readAsText(file);
  }, [features, envVars, saveStepHistory]);

  const handleTemplateImport = useCallback(() => {
    if (templateImportRef.current) {
      templateImportRef.current.click();
    }
  }, []);

  const processTemplateUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedExts = ['tcl', 'sh', 'py'];
    const fileExt = ext(file.name);
    if (!allowedExts.includes(fileExt)) {
      message.error(`请上传${allowedExts.join('/')}格式的模板文件`);
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        
        let associated = false;
        const updatedSteps = [...envSteps];
        
        updatedSteps.forEach(step => {
          Object.entries(step.templates).forEach(([script, template]) => {
            if (template === file.name) {
              setCustomTemplates(prev => ({
                ...prev,
                [`${script}|${template}`]: content
              }));
              setLoadedTemplates(prev => ({
                ...prev,
                [`${script}|${template}`]: content
              }));
              associated = true;
            }
          });
        });
        
        if (associated) {
          message.success(`已导入自定义模板并关联到相关脚本: ${file.name}`);
        } else {
          setCustomTemplates(prev => ({
            ...prev,
            [`*|${file.name}`]: content
          }));
          message.success(`已导入自定义模板: ${file.name}（未关联到特定脚本）`);
        }
      } catch (error) {
        message.error(`导入模板失败：${error.message}`);
      }
      
      e.target.value = '';
    };
    reader.readAsText(file);
  }, [envSteps]);

  const updateLibraryType = useCallback((uid, newType) => {
    setLibraryFiles(prev => 
      prev.map(file => 
        file.uid === uid ? { ...file, type: newType } : file
      )
    );
  }, []);

  const updateDesignType = useCallback((uid, newType) => {
    setDesignFiles(prev => 
      prev.map(file => 
        file.uid === uid ? { ...file, type: newType } : file
      )
    );
  }, []);

  // 增强的文件上传处理 - 包含路径存储
  const makeUploadProps = useCallback((dest) => ({
    multiple: true,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        let type;
        
        if (dest === 'lib') {
          type = detectLibraryType(file.name);
        } else {
          type = detectDesignType(file.name, content);
        }

        // 构建包含路径信息的文件对象
        const item = {
          uid: file.uid || generateUniqueId(),
          name: file.name,
          type,
          hash: hashLike(file.name),
          size: file.size,
          lastModified: file.lastModified,
          content,
          absolutePath: file.webkitRelativePath || file.name, // 存储文件路径
          uploadTime: new Date().toISOString()
        };

        let role;
        if (dest === 'design' && (item.type.includes('verilog') || item.type.includes('vhdl')) && content) {
          const m = content.match(/module\s+(\w+)/);
          if (m && m[1]) {
            if (!designTop) setDesignTop(m[1]);
            if (m[1] === designTop) role = item.type.includes('rtl') ? 'rtl_root' : 'netlist';
          }
        }
        
        if (dest === 'lib') {
          setLibraryFiles(prev => [...prev, item]);
          // 保存到路径映射
          configStorage.saveFilePathMapping('library', item.absolutePath, item);
          message.success(`已添加库文件: ${file.name}`);
        } else {
          setDesignFiles(prev => [...prev, { ...item, role }]);
          // 保存到路径映射
          configStorage.saveFilePathMapping('design', item.absolutePath, { ...item, role });
          message.success(`已添加设计文件: ${file.name}`);
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
      setFeatures({ mbist: true, mbisr_chain: true, mbisr_ctrl: false, tap: true, lbist: false, ssn: false, edt: false, occ: false, bscan: true, ijtag: true });
    } else if (p === 'Logic-Only') {
      setFeatures({ mbist: false, mbisr_chain: false, mbisr_ctrl: false, tap: false, lbist: false, ssn: false, edt: true, occ: true, bscan: false, ijtag: true });
    } else if (p === 'Full DFT') {
      setFeatures({ mbist: true, mbisr_chain: true, mbisr_ctrl: true, tap: true, lbist: true, ssn: false, edt: true, occ: true, bscan: true, ijtag: true });
    }
  }, []);

  const onValidate = useCallback(() => {
    const atpgSteps = ['atpg_pr', 'atpg_map', 'atpg_syn'];
    const missingSteps = atpgSteps.filter(stepName => 
      !envSteps.some(s => s.name === stepName)
    );
    
    const dependencyIssues = checkStepDependencies(envSteps);
    
    const scriptIssues = [];
    envSteps.forEach(step => {
      const scripts = parseScripts(step.script);
      scripts.forEach(script => {
        if (!step.templates[script]) {
          scriptIssues.push(`步骤 "${step.name}" 中的脚本 "${script}" 缺少模板配置`);
        }
      });
    });
    
    if (missingSteps.length > 0 || dependencyIssues.length > 0 || scriptIssues.length > 0) {
      Modal.warning({
        title: '配置验证不通过',
        content: (
          <div>
            {missingSteps.length > 0 && (
              <div>
                <p>缺少以下ATPG核心步骤：</p>
                <p>{missingSteps.join(', ')}</p>
              </div>
            )}
            {dependencyIssues.length > 0 && (
              <div>
                <p>步骤依赖存在问题：</p>
                <ul>
                  {dependencyIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {scriptIssues.length > 0 && (
              <div>
                <p>脚本模板配置存在问题：</p>
                <ul>
                  {scriptIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{ marginTop: 12 }}>建议点击"重置步骤"恢复完整路径</p>
          </div>
        )
      });
      return;
    }
    
    Modal.success({
      title: <><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />验证完成</>,
      content: `配置验证已完成。ATPG相关路径完整。\n系统将使用内嵌库：${SYSTEM_LIBRARIES.standardCellLib}`,
      maskClosable: true
    });
  }, [envSteps]);

  const filteredDesignFiles = useMemo(() => {
    if (activeTab === 'all') return designFiles;
    if (activeTab === 'verilog') return designFiles.filter(file => file.type.includes('verilog'));
    if (activeTab === 'vhdl') return designFiles.filter(file => file.type.includes('vhdl'));
    return designFiles.filter(file => file.type === activeTab);
  }, [designFiles, activeTab]);

  /* ========= 表格列定义（保持不变） ========= */
  const libraryColumns = [
    { title: '文件名', dataIndex: 'name', width: 250 },
    { 
      title: '类型', 
      dataIndex: 'type', 
      width: 180,
      render: (type, rec) => (
        <Select 
          value={type} 
          style={{ width: '100%' }}
          onChange={(value) => updateLibraryType(rec.uid, value)}
        >
          {SUPPORTED_LIBRARY_TYPES.map(t => (
            <Option key={t.value} value={t.value}>{t.label}</Option>
          ))}
        </Select>
      )
    },
    { 
      title: '路径', 
      dataIndex: 'absolutePath', 
      width: 200,
      render: path => (
        <Tooltip title={path}>
          <Text style={{ fontSize: 12 }} ellipsis>
            {path}
          </Text>
        </Tooltip>
      )
    },
    { 
      title: '大小', 
      dataIndex: 'size', 
      width: 100,
      render: size => formatFileSize(size)
    },
    { 
      title: '操作', 
      dataIndex: 'uid', 
      width: 160,
      render: (uid, rec) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => showFilePreview(rec)}
          >
            预览
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => removeRow('lib', uid, rec.name)}
          />
        </Space>
      )
    }
  ];

  const designColumns = [
    { title: '文件名', dataIndex: 'name', width: 250 },
    { 
      title: '类型', 
      dataIndex: 'type', 
      width: 180,
      render: (type, rec) => (
        <Select 
          value={type} 
          style={{ width: '100%' }}
          onChange={(value) => updateDesignType(rec.uid, value)}
        >
          {SUPPORTED_DESIGN_TYPES.map(t => (
            <Option key={t.value} value={t.value}>{t.label}</Option>
          ))}
        </Select>
      )
    },
    { 
      title: '路径', 
      dataIndex: 'absolutePath', 
      width: 200,
      render: path => (
        <Tooltip title={path}>
          <Text style={{ fontSize: 12 }} ellipsis>
            {path}
          </Text>
        </Tooltip>
      )
    },
    { 
      title: '角色', 
      dataIndex: 'role', 
      width: 120,
      render: role => role ? <Tag color={role === 'rtl_root' ? 'green' : 'blue'}>{role}</Tag> : '-'
    },
    { 
      title: '大小', 
      dataIndex: 'size', 
      width: 100,
      render: size => formatFileSize(size)
    },
    { 
      title: '操作', 
      dataIndex: 'uid', 
      width: 160,
      render: (uid, rec) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => showFilePreview(rec)}
          >
            预览
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={() => removeRow('design', uid, rec.name)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const stepColumns = [
    { 
      title: '序号', 
      dataIndex: 'dir', 
      width: 60, 
      render: (dir) => dir.substring(0, 2) 
    },
    { 
      title: '步骤功能', 
      dataIndex: 'name', 
      width: 200, 
      render: (name, rec) => (
        <span>
          {editingField?.key === rec.key && editingField?.field === 'name' ? (
            <Select 
              value={name} 
              style={{ width: '100%' }}
              onChange={(value) => updateStepField(rec.key, 'name', value)}
              autoFocus
              disabled={name.startsWith('atpg_')}
              onBlur={() => setEditingField(null)}
            >
              {STEP_FUNCTIONS.map(func => (
                <Option key={func.value} value={func.value}>{func.label}</Option>
              ))}
            </Select>
          ) : (
            <Text 
              code 
              style={{ 
                backgroundColor: name.startsWith('atpg_') ? '#e6f7ff' : 'inherit',
                padding: name.startsWith('atpg_') ? '2px 4px' : 0,
                borderRadius: name.startsWith('atpg_') ? '2px' : 0,
                cursor: name.startsWith('atpg_') ? 'default' : 'pointer'
              }}
              onClick={() => !name.startsWith('atpg_') && setEditingField({ key: rec.key, field: 'name' })}
            >
              {name}
              {name.startsWith('atpg_') && <Tag color="blue" size="small" style={{ marginLeft: 5 }}>ATPG</Tag>}
            </Text>
          )}
        </span>
      )
    },
    { 
      title: '目标目录', 
      dataIndex: 'dir', 
      width: 220,
      render: (dir, rec) => editingField?.key === rec.key && editingField?.field === 'dir' ? (
        <Input 
          value={dir} 
          onChange={(e) => updateStepField(rec.key, 'dir', e.target.value)}
          autoFocus
          onBlur={() => setEditingField(null)}
          onPressEnter={() => setEditingField(null)}
        />
      ) : (
        <span 
          style={{ cursor: !rec.name.startsWith('atpg_') ? 'pointer' : 'default' }}
          onClick={() => !rec.name.startsWith('atpg_') && setEditingField({ key: rec.key, field: 'dir' })}
        >
          {dir}
        </span>
      )
    },
    { 
      title: '脚本文件', 
      dataIndex: 'script', 
      width: 300,
      render: (script, rec) => (
        <Space>
          <Text 
            style={{ 
              cursor: !rec.name.startsWith('atpg_') ? 'pointer' : 'default',
              display: 'inline-block',
              maxWidth: 200,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {parseScripts(script).length}个脚本
          </Text>
          <Button 
            size="small" 
            icon={<FileSearchOutlined />}
            onClick={() => openScriptsEditor(rec)}
            disabled={rec.name.startsWith('atpg_')}
          >
            编辑
          </Button>
        </Space>
      )
    },
    { 
      title: '模板配置', 
      dataIndex: 'templates', 
      width: 300,
      render: (templates, rec) => {
        const scripts = parseScripts(rec.script);
        if (scripts.length === 0) return '-';
        
        const firstScript = scripts[0];
        const firstTemplate = templates[firstScript] || firstScript;
        const hasMultiple = scripts.length > 1;
        
        return (
          <Space>
            <div>
              <Text code>{firstScript}</Text>
              <Text> → </Text>
              <Text code>
                {firstTemplate}
                {customTemplates[`${firstScript}|${firstTemplate}`] && 
                  <Tag color="orange" size="small">自定义</Tag>
                }
              </Text>
              {hasMultiple && <Text> ... (+{scripts.length - 1})</Text>}
            </div>
            
            <Dropdown
              overlay={
                <Menu>
                  {scripts.map(script => (
                    <Menu.Item key={script}>
                      <Space>
                        <Text code style={{ fontSize: 12 }}>{script}</Text>
                        <Text style={{ fontSize: 12 }}>→</Text>
                        <Text code style={{ fontSize: 12 }}>
                          {templates[script] || script}
                        </Text>
                        <Button 
                          size="small" 
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openTemplateEditor(rec.key, script, templates[script] || script);
                          }}
                          style={{ marginLeft: 5 }}
                        />
                        <Select 
                          size="small" 
                          style={{ width: 120, marginLeft: 5 }}
                          value={templates[script] || script}
                          onChange={(value) => changeScriptTemplate(rec.key, script, value)}
                          disabled={rec.name.startsWith('atpg_')}
                        >
                          <Option value={script}>{script}</Option>
                          <Option value={`${script.replace(/\.\w+$/, '')}_custom$&`}>
                            自定义版本
                          </Option>
                          <Option value={`${script.replace(/\.\w+$/, '')}_debug$&`}>
                            调试版本
                          </Option>
                        </Select>
                      </Space>
                    </Menu.Item>
                  ))}
                  
                  {!rec.name.startsWith('atpg_') && scripts.length > 1 && (
                    <>
                      <Menu.Divider />
                      <Menu.Item 
                        key="batch-update"
                        icon={<AppstoreOutlined />}
                        onClick={() => batchUpdateTemplates(rec.key, 'run_*.tcl')}
                      >
                        批量更新模板
                      </Menu.Item>
                    </>
                  )}
                </Menu>
              }
              placement="bottomLeft"
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      }
    },
    { 
      title: '依赖步骤', 
      dataIndex: 'dependencies', 
      width: 180,
      render: (deps, rec) => (
        <Space>
          <Badge count={deps?.length || 0} showZero>
            <span>依赖</span>
          </Badge>
          {!rec.name.startsWith('atpg_') && (
            <Button 
              size="small" 
              icon={<LinkOutlined />}
              onClick={() => openDependencyModal(rec)}
            />
          )}
        </Space>
      )
    },
    { 
      title: '启用', 
      dataIndex: 'enabled', 
      width: 80,
      render: (enabled, rec) => (
        <Switch 
          checked={enabled} 
          onChange={(checked) => toggleStepEnabled(rec.key, checked)}
          disabled={rec.name.startsWith('atpg_')}
        />
      )
    },
    { 
      title: '操作', 
      dataIndex: 'key', 
      width: 200,
      render: (key, rec) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<FileAddOutlined />}
            onClick={() => generateSingleStep(rec)}
            loading={generating}
          >
            生成
          </Button>
          <Button 
            size="small" 
            icon={<SyncOutlined spin={generating} />}
            onClick={() => regenerateSingleStep(rec)}
            loading={generating}
          >
            重生成
          </Button>
          {!rec.name.startsWith('atpg_') && (
            <>
              <Button 
                size="small" 
                icon={<UpOutlined />}
                onClick={() => moveStep(key, 'up')}
              />
              <Button 
                size="small" 
                icon={<DownOutlined />}
                onClick={() => moveStep(key, 'down')}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 20, maxWidth: '100%', overflowX: 'auto', minWidth: 1200 }}>
      <Typography.Title level={3}>DFT 环境配置器（增强版 - 完整功能）</Typography.Title>
      
      <Steps current={currentStep} onChange={setCurrentStep} style={{ marginBottom: 30 }}>
        <Steps.Step title="配置导入" description="导入现有配置或创建新配置" />
        <Steps.Step title="功能选择" description="选择DFT功能选项" />
        <Steps.Step title="文件管理" description="添加库文件和设计文件" />
        <Steps.Step title="步骤配置" description="配置DFT流程步骤（支持多脚本）" />
        <Steps.Step title="生成环境" description="生成完整DFT环境" />
        <Steps.Step title="Shell终端" description="执行命令和管理环境" />
      </Steps>

      {/* 步骤1: 配置导入（保持不变） */}
      {currentStep === 0 && (
        <Card title="配置管理" bordered={false}>
          <Alert 
            message="配置管理说明" 
            description="您可以导入现有配置、从其他配置复制设置，或者从头开始创建新配置。所有配置会自动保存。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 20 }}
          />
          
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card 
                title="导入现有配置" 
                bordered={true}
                style={{ height: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert 
                    message="完整导入" 
                    description="导入完整的DFT项目配置文件" 
                    type="info" 
                    showIcon 
                    size="small"
                  />
                  <Button 
                    icon={<ImportOutlined />}
                    type="primary"
                    onClick={importConfiguration}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    导入完整配置
                  </Button>
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card 
                title="复制配置设置" 
                bordered={true}
                style={{ height: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert 
                    message="选择性复制" 
                    description="从其他配置复制部分设置，不复制设计文件" 
                    type="success" 
                    showIcon 
                    size="small"
                  />
                  <Button 
                    icon={<CopyOutlined />}
                    onClick={openCopyConfigModal}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    从配置复制
                  </Button>
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card 
                title="创建新配置" 
                bordered={true}
                style={{ height: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert 
                    message="全新开始" 
                    description="从头开始配置新的DFT环境" 
                    type="warning" 
                    showIcon 
                    size="small"
                  />
                  <Button 
                    onClick={() => setCurrentStep(1)}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    创建新配置
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
          
          {/* 复制配置弹窗 */}
          <CopyConfigModal />
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button type="primary" onClick={() => setCurrentStep(1)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* 步骤2: 功能选择（保持不变） */}
      {currentStep === 1 && (
        <Card title="DFT功能选择" bordered={false}>
          <Alert 
            message="功能选择说明" 
            description="选择需要实现的DFT功能，系统将根据选择自动生成对应的流程步骤。ATPG核心步骤为必选。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 20 }}
          />
          
          <div style={{ marginBottom: 20 }}>
            <Typography.Text strong>功能预设：</Typography.Text>
            <Space size="middle" style={{ marginLeft: 10 }}>
              <Button onClick={() => featurePreset('MBIST')}>MBIST为主</Button>
              <Button onClick={() => featurePreset('Logic-Only')}>仅逻辑测试</Button>
              <Button onClick={() => featurePreset('Full DFT')}>完整DFT</Button>
            </Space>
          </div>
          
          <Row gutter={[16, 16]}>
            {Object.entries(features).map(([key, value]) => (
              <Col key={key} xs={24} sm={12} md={8} lg={6}>
                <Space>
                  <Checkbox 
                    checked={value} 
                    onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                  >
                    <Tooltip title={featureDescriptions[key]}>
                      <span style={{ textTransform: 'uppercase' }}>{key}</span>
                    </Tooltip>
                  </Checkbox>
                </Space>
              </Col>
            ))}
          </Row>
          
          <Divider />
          
          <div style={{ margin: '10px 0' }}>
            <Typography.Text strong>ATPG 高级选项：</Typography.Text>
          </div>
          
          <Space>
            <Checkbox 
              checked={hasAtpgRetargeting} 
              onChange={(e) => setHasAtpgRetargeting(e.target.checked)}
            >
              启用 ATPG 重定向步骤
            </Checkbox>
          </Space>
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button onClick={() => setCurrentStep(0)} style={{ marginRight: 10 }}>
              上一步
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(2)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* 步骤3: 文件管理（保持不变） */}
      {currentStep === 2 && (
        <Card title="文件管理" bordered={false}>
          <Tabs defaultActiveKey="design" style={{ marginBottom: 20 }}>
            <TabPane tab="设计文件" key="design">
              <Alert 
                message="设计文件说明" 
                description="上传RTL、网表、SDC约束等设计相关文件，系统会自动识别文件类型并存储绝对路径。" 
                type="info" 
                showIcon 
                style={{ marginBottom: 20 }}
              />
              
              <div style={{ marginBottom: 20 }}>
                <Typography.Text strong>顶层模块名 (Top Module)：</Typography.Text>
                <Input 
                  value={designTop}
                  onChange={(e) => setDesignTop(e.target.value)}
                  placeholder="输入设计的顶层模块名称"
                  style={{ width: 300, marginLeft: 10 }}
                />
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <Dragger {...makeUploadProps('design')}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此处上传设计文件</p>
                  <p className="ant-upload-hint">
                    支持Verilog/VHDL代码、SDC约束、文件列表等
                  </p>
                </Dragger>
              </div>
              
              <div style={{ marginBottom: 10 }}>
                <Typography.Text strong>已上传设计文件 ({designFiles.length})</Typography.Text>
                <Segmented 
                  options={[
                    { value: 'all', label: '全部' },
                    { value: 'verilog', label: 'Verilog' },
                    { value: 'vhdl', label: 'VHDL' },
                    { value: 'sdc', label: 'SDC' },
                    { value: 'filelist', label: 'Filelist' },
                    { value: 'dft_cfg', label: 'DFT配置' }
                  ]}
                  value={activeTab}
                  onChange={setActiveTab}
                  style={{ marginLeft: 10 }}
                />
              </div>
              
              <Table 
                columns={designColumns}
                dataSource={filteredDesignFiles}
                rowKey="uid"
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
              />
            </TabPane>
            
            <TabPane tab="库文件" key="library">
              <Alert 
                message="库文件说明" 
                description="上传标准单元库、时序库、内存库等工艺相关文件。系统会存储文件的绝对路径信息。" 
                type="info" 
                showIcon 
                style={{ marginBottom: 20 }}
              />
              
              <div style={{ marginBottom: 20 }}>
                <Dragger {...makeUploadProps('lib')}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此处上传库文件</p>
                  <p className="ant-upload-hint">
                    支持时序库(.lib)、LEF文件、工艺文件等
                  </p>
                </Dragger>
              </div>
              
              <div style={{ marginBottom: 10 }}>
                <Typography.Text strong>已上传库文件 ({libraryFiles.length})</Typography.Text>
              </div>
              
              <Table 
                columns={libraryColumns}
                dataSource={libraryFiles}
                rowKey="uid"
                pagination={{ pageSize: 5 }}
                scroll={{ x: 'max-content' }}
              />
            </TabPane>
          </Tabs>
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button onClick={() => setCurrentStep(1)} style={{ marginRight: 10 }}>
              上一步
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(3)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* 步骤4: 步骤配置（保持不变） */}
      {currentStep === 3 && (
        <Card title="步骤配置" bordered={false}>
          <Alert 
            message="步骤配置说明" 
            description="系统已根据功能选择生成默认步骤流程，每个步骤可包含多个脚本文件，支持为每个脚本配置独立模板或使用通配符共享模板。ATPG核心步骤受保护，不可删除或禁用。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 20 }}
          />
          
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Typography.Text strong>
                流程步骤 ({envSteps.filter(s => s.enabled).length}/{envSteps.length})
                总脚本数: {envSteps.reduce((sum, step) => sum + parseScripts(step.script).length, 0)}
              </Typography.Text>
              <Button 
                size="small" 
                icon={<UndoOutlined />}
                onClick={undoStepChange}
                disabled={stepHistory.length === 0}
              >
                撤销
              </Button>
              <Button 
                size="small" 
                icon={<FileTextOutlined />}
                onClick={resetSteps}
              >
                重置步骤
              </Button>
              <Button 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={onValidate}
              >
                验证配置
              </Button>
            </Space>
            
            <Space>
              <Button 
                icon={<ImportOutlined />} 
                onClick={handleTemplateImport}
                size="small"
              >
                导入模板
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                onClick={addNewStep}
                size="small"
              >
                添加步骤
              </Button>
            </Space>
          </div>
          
          <Table 
            columns={stepColumns}
            dataSource={envSteps}
            rowKey="key"
            pagination={{ pageSize: 8 }}
            scroll={{ x: 'max-content' }}
          />
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button onClick={() => setCurrentStep(2)} style={{ marginRight: 10 }}>
              上一步
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(4)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* 步骤5: 生成环境（添加运行控制面板） */}
      {currentStep === 4 && (
        <Card title="生成环境" bordered={false}>
          <Alert 
            message="环境生成说明" 
            description="请选择根目录，系统将根据配置生成完整的DFT环境目录结构和所有脚本文件。多脚本将根据各自配置的模板生成。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 20 }}
          />
          
          <div style={{ marginBottom: 20 }}>
            <Typography.Text strong>根目录：</Typography.Text>
            <Space>
              <Text ellipsis style={{ width: 300, display: 'inline-block' }}>
                {rootDirName}
              </Text>
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={selectRootDirectory}
              >
                选择目录
              </Button>
            </Space>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <Typography.Text strong>环境参数：</Typography.Text>
            <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
              <Col xs={24} sm={12} md={8}>
                <Input 
                  value={envRoot}
                  onChange={(e) => setEnvRoot(e.target.value)}
                  placeholder="项目根目录名称"
                  prefix="根目录名："
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select 
                  value={envTemplate}
                  onChange={setEnvTemplate}
                  placeholder="选择模板类型"
                  style={{ width: '100%' }}
                >
                  <Option value="tessent">Tessent</Option>
                  <Option value="mentor">Mentor</Option>
                  <Option value="custom">自定义</Option>
                </Select>
              </Col>
            </Row>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <Typography.Text strong>配置管理：</Typography.Text>
            <Space size="middle" style={{ marginLeft: 10 }}>
              <Button 
                icon={<ImportOutlined />}
                onClick={importConfiguration}
              >
                导入配置
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={exportConfiguration}
              >
                导出配置
              </Button>
              <Button 
                icon={<SaveOutlined />}
                onClick={() => {
                  configStorage.clearAll();
                  message.success('已清除所有保存的配置');
                }}
              >
                清除保存
              </Button>
            </Space>
          </div>
          
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <Button 
              type="primary" 
              icon={<FolderAddOutlined />}
              size="large"
              onClick={generateAllSteps}
              loading={generating}
              disabled={!rootDirHandle || !designTop}
            >
              生成完整DFT环境
            </Button>
          </div>

          {/* 新增：运行控制面板 */}
          <RunControlPanel
            envSteps={envSteps}
            rootDirHandle={rootDirHandle}
            designTop={designTop}
            runMode={runMode}
            onRunModeChange={setRunMode}
            selectedBlocks={selectedBlocks}
            onBlocksChange={setSelectedBlocks}
          />
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button onClick={() => setCurrentStep(3)} style={{ marginRight: 10 }}>
              上一步
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(5)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {/* 步骤6: Shell终端（保持不变） */}
      {currentStep === 5 && (
        <Card title="真实 Linux Shell" bordered={false}>
          <Alert 
            message="真实 Shell 终端" 
            description="这是一个连接到真实 Linux 系统的 Shell 终端。您可以直接执行任何 Linux 命令，工作目录已设置为当前 DFT 项目路径。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 20 }}
          />
          
          <RealShellInterface 
            rootDirName={rootDirName}
            projectRoot={rootDirHandle ? rootDirName : 'dft_flow'}
          />
          
          <div style={{ marginTop: 20, textAlign: 'right' }}>
            <Button onClick={() => setCurrentStep(4)} style={{ marginRight: 10 }}>
              上一步
            </Button>
            <Button type="primary" onClick={() => setCurrentStep(0)}>
              完成
            </Button>
          </div>
        </Card>
      )}

      {/* 文件预览弹窗（保持不变） */}
      <Modal
        title={`文件预览: ${previewFile?.name || ''}`}
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all',
          maxHeight: '60vh',
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          padding: 16,
          borderRadius: 4
        }}>
          {previewContent}
        </pre>
      </Modal>

      {/* 模板编辑弹窗（保持不变） */}
      <Modal
        title={`编辑模板: ${editingTemplate?.scriptName} -> ${editingTemplate?.templateName || ''}`}
        visible={templateModalVisible}
        onCancel={() => {
          setTemplateModalVisible(false);
          setEditingTemplate(null);
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => {
            setTemplateModalVisible(false);
            setEditingTemplate(null);
          }}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={saveTemplateChanges}>
            保存
          </Button>
        ]}
        maskClosable={false}
      >
        <Alert 
          message="模板编辑说明" 
          description={`支持变量替换：\${TOP}、\${NETLIST}、\${SDC_FILES}、\${LOG_DIR}等。${editingTemplate?.isCustom ? '这是一个用户自定义模板。' : '此模板从外部文件加载，修改后将保存为自定义模板。'}`} 
          type="info" 
          showIcon 
          style={{ marginBottom: 15 }}
        />
        <textarea
          value={editingTemplate?.content || ''}
          onChange={(e) => setEditingTemplate({
            ...editingTemplate,
            content: e.target.value
          })}
          style={{
            width: '100%',
            height: '50vh',
            fontFamily: 'monospace',
            padding: 10,
            borderRadius: 4,
            border: '1px solid #ddd',
            resize: 'none'
          }}
        />
      </Modal>

      {/* 多脚本编辑弹窗（保持不变） */}
      <Modal
        title="编辑脚本列表"
        visible={scriptsEditorVisible}
        onCancel={() => setScriptsEditorVisible(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setScriptsEditorVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={saveScriptsEditor}>
            保存
          </Button>
        ]}
        maskClosable={false}
      >
        <Alert 
          message="脚本编辑说明" 
          description="每行输入一个脚本文件名，支持.tcl、.sh、.py等格式。系统会为新添加的脚本自动创建模板映射。" 
          type="info" 
          showIcon 
          style={{ marginBottom: 15 }}
        />
        
        <div style={{ marginBottom: 15 }}>
          <Button 
            icon={<PlusOutlined />} 
            onClick={addScriptInEditor}
            size="small"
            style={{ marginBottom: 10 }}
          >
            添加脚本
          </Button>
          
          <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
            {currentScripts.map((script, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Input 
                  value={script}
                  onChange={(e) => {
                    const newScripts = [...currentScripts];
                    newScripts[index] = e.target.value;
                    setCurrentScripts(newScripts);
                  }}
                  style={{ flex: 1, marginRight: 10 }}
                />
                <Button 
                  danger 
                  size="small" 
                  icon={<DeleteOutlined />}
                  onClick={() => removeScriptInEditor(index)}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 步骤依赖配置弹窗（保持不变） */}
      <Modal
        title="配置步骤依赖"
        visible={dependencyModalVisible}
        onCancel={() => setDependencyModalVisible(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setDependencyModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={saveStepDependencies}>
            保存
          </Button>
        ]}
      >
        <Alert 
          message="依赖配置说明" 
          description="选择当前步骤依赖的前置步骤，当前步骤将在所有依赖步骤完成后执行。" 
          type="info" 
          showIcon 
          style={{ marginBottom: 15 }}
        />
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {envSteps
            .filter(step => step.key !== currentStepKey)
            .map(step => (
              <div key={step.key} style={{ marginBottom: 8 }}>
                <Checkbox 
                  checked={currentStepDependencies.includes(step.key)}
                  onChange={() => toggleDependency(step.key)}
                >
                  {step.dir.substring(0, 2)} - {step.name} ({step.desc})
                </Checkbox>
              </div>
            ))}
        </div>
      </Modal>

      {/* 隐藏的文件导入输入框 */}
      <input
        ref={importInputRef}
        type="file"
        accept=".yaml,.yml"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
      
      {/* 隐藏的模板导入输入框 */}
      <input
        ref={templateImportRef}
        type="file"
        accept=".tcl,.sh"
        style={{ display: 'none' }}
        onChange={processTemplateUpload}
      />
    </div>
  );
}

// 导出包装了错误边界的组件
export default function DFTConfigurator() {
  return (
    <ErrorBoundary>
      <LoadPanel />
    </ErrorBoundary>
  );
}
