(function () {
  'use strict';
  var id = 'dft-ui-surface-theme-patch';
  var old = document.getElementById(id);
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var style = document.createElement('style');
  style.id = id;
  style.textContent = '' +
    '.phase2-project-titlebar,.dftctx-titlebar{min-height:40px;box-sizing:border-box;}' +
    '.phase2-project-tabbar,.dftctx-tabs{min-height:40px;box-sizing:border-box;}' +
    '.phase2-project-toolbar,.dftctx-panel-toolbar{min-height:40px;box-sizing:border-box;}' +
    '.phase2-project-titlebar,.phase2-project-tabbar,.phase2-project-toolbar,.dftctx-titlebar,.dftctx-tabs,.dftctx-panel-toolbar{font-family:Helvetica,Arial,sans-serif;}' +
    '.phase2-project-titlebar{padding:6px 8px !important;}' +
    '.phase2-project-tabbar,.phase2-project-toolbar{padding:6px 8px !important;}' +
    '.phase2-project-search,.dftctx-search{height:28px !important;font-size:12px !important;}' +
    '.phase2-project-btn,.dftctx-btn,.dftctx-iconbtn{height:28px !important;min-width:28px !important;font-size:12px !important;}' +
    '.phase2-project-tab,.dftctx-tab{font-size:12px !important;}' +
    '.phase2-node,.dftctx-ip-item{min-height:32px !important;}' +
    '.phase2-section-title,.dftctx-hint,.dftctx-ip-preview-desc,.dftctx-ip-tooltip-desc{font-size:11px !important;}' +
    '.phase2-project-host,.dftctx-root{font-size:12px !important;}' +
    '';
  document.head.appendChild(style);
})();
