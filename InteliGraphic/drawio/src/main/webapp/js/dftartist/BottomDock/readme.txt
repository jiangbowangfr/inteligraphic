以后 floorplan / 检查流程怎么往 Dock 写

你后面的流程代码直接这样调：

ui.logDockOutput('Floorplan check started', 'info');
ui.logDockOutput('Macro overlap found at MACRO_U12', 'warning');

ui.pushDockMessage({
  level: 'warning',
  text: 'Macro overlap found at MACRO_U12',
  source: 'floorplan',
  location: 'MACRO_U12'
});

ui.setDockReports([
  {
    title: 'Floorplan Check',
    items: {
      overlap: 1,
      keepout: 0,
      offgrid: 0
    }
  }
]);

ui.setDockJobs([
  { name: 'floorplan_check_1', status: 'running', detail: 'checking macros', progress: 60 }
]);

如果你想一把把“检查结果”同时打到 Output / Messages / Reports，也可以直接用模块里带的快捷方法：

window.DFTDockRuntime.addCheckResult('Floorplan Check', {
  errors: 0,
  warnings: 2,
  violations: 2,
  status: 'issue'
});