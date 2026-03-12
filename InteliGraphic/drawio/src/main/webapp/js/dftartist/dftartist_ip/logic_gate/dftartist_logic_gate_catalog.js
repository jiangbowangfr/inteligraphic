(function (global) {
  'use strict';

  var NS = global.DftsIP = global.DftsIP || {};
  var LG = NS.LogicGate = NS.LogicGate || {};
  var Model = LG.Model;
  if (!Model) return;

  var Catalog = LG.Catalog = LG.Catalog || {};
  if (Catalog.__phase2Loaded) return;
  Catalog.__phase2Loaded = true;

  function reg(def) {
    if (def && typeof NS.registerDefinition === 'function') NS.registerDefinition(def);
  }

  function makeDef(opts) {
    opts = opts || {};
    var kind = String(opts.gateKind || '').toLowerCase();

    return {
      key: opts.key,
      dftsType: opts.dftsType,
      category: 'logic_gate',
      logicGroup: opts.logicGroup || 'Basic',
      gateKind: kind,
      defaultLabel: opts.defaultLabel || String(kind).toUpperCase(),
      rounded: 0,
      strokeWidth: 1,
      pinFont: 14,
      bodyFont: 18,
      w: opts.w || 140,
      h: opts.h || 90,
      labelPolicy: (NS.POLICY && NS.POLICY.LABEL_FIXED) || 'fixed',
      instancePolicy: (NS.POLICY && NS.POLICY.INSTANCE_OPTIONAL) || 'optional',
      configKey: 'logic_gate',
      useSymbolEngine: true,
      defaultParams: opts.defaultParams || {},
      buildSymbolModel: function (graph, def, runtimeOpt, baseModel) {
        var st = { gateKind: def.gateKind, params: def.defaultParams || {}, customTitle: '', instanceName: '' };
        return Model.buildSymbolModel(def, st, runtimeOpt);
      }
    };
  }

  // Basic gates
  reg(makeDef({ key: 'logic.and',  dftsType: 'logic_and',  gateKind: 'and',  defaultLabel: 'AND',  logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.or',   dftsType: 'logic_or',   gateKind: 'or',   defaultLabel: 'OR',   logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.nand', dftsType: 'logic_nand', gateKind: 'nand', defaultLabel: 'NAND', logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.nor',  dftsType: 'logic_nor',  gateKind: 'nor',  defaultLabel: 'NOR',  logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.xor',  dftsType: 'logic_xor',  gateKind: 'xor',  defaultLabel: 'XOR',  logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.xnor', dftsType: 'logic_xnor', gateKind: 'xnor', defaultLabel: 'XNOR', logicGroup: 'Basic', defaultParams: { inputCount: 2, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.not',  dftsType: 'logic_not',  gateKind: 'not',  defaultLabel: 'NOT',  logicGroup: 'Basic', defaultParams: { inputCount: 1, busWidth: 1 } }));
  reg(makeDef({ key: 'logic.buf',  dftsType: 'logic_buf',  gateKind: 'buf',  defaultLabel: 'BUF',  logicGroup: 'Basic', defaultParams: { inputCount: 1, busWidth: 1 } }));

  // Routing
  reg(makeDef({ key: 'logic.mux',  dftsType: 'logic_mux',  gateKind: 'mux',  defaultLabel: 'MUX',  logicGroup: 'Routing', defaultParams: { dataInputs: 2, busWidth: 1, hasEnable: false, selectSide: 'south' }, w: 160, h: 110 }));
})(this);
