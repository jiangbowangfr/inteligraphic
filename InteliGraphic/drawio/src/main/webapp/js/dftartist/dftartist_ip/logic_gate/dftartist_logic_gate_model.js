(function (global) {
  'use strict';

  var NS = global.DftsIP = global.DftsIP || {};
  var LG = NS.LogicGate = NS.LogicGate || {};
  var Model = LG.Model = LG.Model || {};
  if (Model.__phase2Loaded) return;
  Model.__phase2Loaded = true;

  function toStr(v) { return v == null ? '' : String(v); }
  function trim(v) { return toStr(v).replace(/^\s+|\s+$/g, ''); }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function clampInt(v, lo, hi, dflt) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = dflt;
    v = Math.max(lo, v);
    if (hi != null) v = Math.min(hi, v);
    return v;
  }
  function normalizeSide(side) {
    side = trim(side).toLowerCase();
    if (side === 'left' || side === 'w') return 'west';
    if (side === 'right' || side === 'e') return 'east';
    if (side === 'top' || side === 'n') return 'north';
    if (side === 'bottom' || side === 's') return 'south';
    if (side === 'west' || side === 'east' || side === 'north' || side === 'south') return side;
    return 'west';
  }

  // mxGraph style helpers
  function styleGet(style, key, dflt) {
    style = style || '';
    key = String(key || '');
    dflt = dflt == null ? '' : dflt;
    var re = new RegExp('(?:^|;)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)(?:;|$)');
    var m = re.exec(style);
    return m ? decodeURIComponent(m[1]) : dflt;
  }
  function styleSet(style, key, value) {
    style = style || '';
    key = String(key || '');
    value = value == null ? '' : String(value);
    var enc = encodeURIComponent(value);
    var re = new RegExp('(?:^|;)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=[^;]*(?=;|$)');
    if (re.test(style)) {
      style = style.replace(re, ';' + key + '=' + enc);
    } else {
      if (style && style.charAt(style.length - 1) !== ';') style += ';';
      style += key + '=' + enc + ';';
    }
    style = style.replace(/^;+/g, '');
    return style;
  }

  var STYLE_KEY_STATE = 'dftsLG';

  function baseKind(kind) {
    kind = trim(kind).toLowerCase();
    if (kind === 'nand') return { kind: 'and', invOut: true };
    if (kind === 'nor')  return { kind: 'or',  invOut: true };
    if (kind === 'xnor') return { kind: 'xor', invOut: true };
    if (kind === 'not')  return { kind: 'not', invOut: true };
    return { kind: kind || 'and', invOut: false };
  }

  function defaultParamsFor(def) {
    var p = clone(def && def.defaultParams) || {};
    if (p.busWidth == null) p.busWidth = 1;
    if ((def && def.gateKind) === 'mux') {
      if (p.dataInputs == null) p.dataInputs = 2;
      if (p.hasEnable == null) p.hasEnable = false;
      if (p.selectSide == null) p.selectSide = 'south';
    } else {
      if (p.inputCount == null) p.inputCount = 2;
    }
    return p;
  }

  function normalizeParams(def, params) {
    params = clone(params) || {};
    var kind = trim(def && def.gateKind).toLowerCase();
    var busWidth = clampInt(params.busWidth, 1, 1024, 1);

    if (kind === 'mux') {
      var dataInputs = clampInt(params.dataInputs, 2, 256, 2);
      var selBits = 0; var x = 1;
      while (x < dataInputs) { x *= 2; selBits++; }
      var hasEnable = !!params.hasEnable;
      var selectSide = normalizeSide(params.selectSide || 'south');
      return { busWidth: busWidth, dataInputs: dataInputs, selectBits: selBits, hasEnable: hasEnable, selectSide: selectSide };
    }

    var minIn = (kind === 'not' || kind === 'buf') ? 1 : 2;
    var inputCount = clampInt(params.inputCount, minIn, 64, minIn);
    return { busWidth: busWidth, inputCount: inputCount };
  }

  function titleForKind(kind) {
    kind = trim(kind).toUpperCase();
    return kind || 'AND';
  }

  function pinKey(name) {
    return trim(name).replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || ('pin_' + Math.random().toString(16).slice(2));
  }

  function buildPins(def, state) {
    def = def || {};
    state = state || {};
    var k0 = trim(state.gateKind || def.gateKind || 'and').toLowerCase();
    var b = baseKind(k0);
    var params = normalizeParams(def, state.params || defaultParamsFor(def));
    var pins = [];

    function add(pin) {
      pin.key = pin.key || pinKey(pin.name);
      pins.push(pin);
    }

    var bw = params.busWidth || 1;
    var range = bw > 1 ? '[' + (bw - 1) + ':0]' : '';

    if (b.kind === 'mux') {
      for (var i = 0; i < params.dataInputs; i++) {
        add({ name: 'D' + i, displayName: 'D' + i, dir: 'input', side: 'west', order: i, visible: true, type: 'data', busWidth: bw, range: range });
      }
      for (var s = 0; s < params.selectBits; s++) {
        add({ name: 'S' + s, displayName: 'S' + s, dir: 'input', side: params.selectSide || 'south', order: s, visible: true, type: 'select', busWidth: 1 });
      }
      if (params.hasEnable) {
        add({ name: 'EN', displayName: 'EN', dir: 'input', side: 'north', order: 0, visible: true, type: 'control', busWidth: 1 });
      }
      add({ name: 'Y', displayName: 'Y', dir: 'output', side: 'east', order: 0, visible: true, type: 'output', busWidth: bw, range: range });
      return pins;
    }

    if (b.kind === 'not' || b.kind === 'buf') {
      add({ name: 'A', displayName: 'A', dir: 'input', side: 'west', order: 0, visible: true, type: 'input', busWidth: bw, range: range });
      add({ name: 'Y', displayName: 'Y', dir: 'output', side: 'east', order: 0, visible: true, type: 'output', busWidth: bw, range: range });
      return pins;
    }

    var count = params.inputCount || 2;
    for (var j = 0; j < count; j++) {
      var nm = String.fromCharCode('A'.charCodeAt(0) + j);
      add({ name: nm, displayName: nm, dir: 'input', side: 'west', order: j, visible: true, type: 'input', busWidth: bw, range: range });
    }
    add({ name: 'Y', displayName: 'Y', dir: 'output', side: 'east', order: 0, visible: true, type: 'output', busWidth: bw, range: range });
    return pins;
  }

  function toOverrideMap(pins) {
    var map = {};
    (pins || []).forEach(function (p) {
      if (!p || !p.key) return;
      map[p.key] = {
        visible: p.visible !== false,
        side: normalizeSide(p.side || 'west'),
        order: isFinite(p.order) ? Number(p.order) : 0,
        displayName: trim(p.displayName || '')
      };
    });
    return map;
  }

  function mergePinOverrides(basePins, prevPins, overrides) {
    basePins = clone(basePins) || [];
    prevPins = clone(prevPins) || [];
    overrides = overrides || {};
    var prevMap = {};
    prevPins.forEach(function (p) { if (p && p.key) prevMap[p.key] = p; });

    for (var i = 0; i < basePins.length; i++) {
      var p = basePins[i];
      var ov = overrides[p.key] || {};
      var pv = prevMap[p.key] || {};
      if (ov.visible != null) p.visible = !!ov.visible;
      else if (pv.visible != null) p.visible = (pv.visible !== false);

      p.side = normalizeSide(ov.side || pv.side || p.side);
      p.order = isFinite(ov.order) ? Number(ov.order) : (isFinite(pv.order) ? Number(pv.order) : (p.order || 0));
      p.displayName = trim(ov.displayName || pv.displayName || p.displayName || '');
    }

    var bySide = { west: [], east: [], north: [], south: [] };
    basePins.forEach(function (p) {
      if (p.visible === false) return;
      bySide[normalizeSide(p.side)].push(p);
    });
    ['west','east','north','south'].forEach(function (s) {
      bySide[s].sort(function(a,b){ return (a.order||0)-(b.order||0); });
      for (var k = 0; k < bySide[s].length; k++) bySide[s][k].order = k;
    });
    return basePins;
  }

  function sanitizeStateForSave(def, state) {
    def = def || {};
    state = state || {};
    return {
      gateKind: trim(state.gateKind || def.gateKind || ''),
      params: normalizeParams(def, state.params || defaultParamsFor(def)),
      customTitle: trim(state.customTitle || ''),
      instanceName: trim(state.instanceName || ''),
      invertOutput: !!state.invertOutput,
      pinOverrides: state.pinOverrides || {}
    };
  }

  function computeBodyStyleExtras(def, state) {
    var k0 = trim(state.gateKind || def.gateKind || 'and').toLowerCase();
    var b = baseKind(k0);
    var invOut = !!(state.invertOutput || b.invOut);
    if (b.kind === 'not') invOut = true;
    return [
      'dftsGateKind=' + b.kind,
      'dftsGateInvertOutput=' + (invOut ? '1' : '0')
    ].join(';');
  }

  function buildSymbolModel(def, state, runtimeOpt) {
    def = def || {};
    state = state || {};
    runtimeOpt = runtimeOpt || {};
    var params = normalizeParams(def, state.params || defaultParamsFor(def));
    state = Object.assign({}, state, { params: params });

    var pinsBase = buildPins(def, state);
    var pins = mergePinOverrides(pinsBase, state.prevPins || [], state.pinOverrides || {});
    var title = trim(state.customTitle || def.defaultLabel || titleForKind(def.gateKind || state.gateKind));
    var instanceName = trim(state.instanceName || '');

    var layout = Object.assign({
      fontSize: 14,
      titleFontSize: 18,
      instanceFontSize: 12,
      bodyPaddingX: 10,
      bodyPaddingY: 8,
      titlePadding: 10,
      pinRowPitch: 26,
      pinStub: 18,
      labelGap: 3,
      instanceGap: 8,
      minBodyWidth: 90,
      minBodyHeight: 56
    }, clone(state.layout) || {});

    var st = sanitizeStateForSave(def, state);
    var encoded = encodeURIComponent(JSON.stringify(st));

    return {
      title: title,
      instanceName: instanceName,
      dftsType: def.dftsType || '',
      category: def.category || 'logic_gate',
      rounded: 0,
      strokeWidth: 1,
      bodyShape: 'dftsLogicGate',
      bodyExtraStyle: computeBodyStyleExtras(def, state) + ';' + STYLE_KEY_STATE + '=' + encoded,
      hidePinLabels: false,
      layout: layout,
      pins: pins
    };
  }

  function readStateFromBody(graph, body, def) {
    def = def || {};
    if (!graph || !body) return null;
    var style = graph.getModel().getStyle(body) || '';
    var raw = styleGet(style, STYLE_KEY_STATE, '');
    if (!raw) return {
      gateKind: trim(def.gateKind) || 'and',
      params: defaultParamsFor(def),
      customTitle: '',
      instanceName: '',
      invertOutput: false,
      pinOverrides: {}
    };
    try {
      var parsed = JSON.parse(raw);
      parsed = parsed || {};
      parsed.gateKind = trim(parsed.gateKind || def.gateKind || 'and');
      parsed.params = parsed.params || defaultParamsFor(def);
      parsed.customTitle = trim(parsed.customTitle || '');
      parsed.instanceName = trim(parsed.instanceName || '');
      parsed.invertOutput = !!parsed.invertOutput;
      parsed.pinOverrides = parsed.pinOverrides || {};
      return parsed;
    } catch (e) {
      return {
        gateKind: trim(def.gateKind) || 'and',
        params: defaultParamsFor(def),
        customTitle: '',
        instanceName: '',
        invertOutput: false,
        pinOverrides: {}
      };
    }
  }

  function writeStateToBody(graph, body, def, state) {
    if (!graph || !body) return;
    var m = graph.getModel();
    var style = m.getStyle(body) || '';
    var safe = sanitizeStateForSave(def, state);
    style = styleSet(style, STYLE_KEY_STATE, JSON.stringify(safe));
    m.setStyle(body, style);
  }

  Model.normalizeParams = normalizeParams;
  Model.titleForKind = titleForKind;
  Model.buildPins = buildPins;
  Model.mergePinOverrides = mergePinOverrides;
  Model.toOverrideMap = toOverrideMap;
  Model.buildSymbolModel = buildSymbolModel;
  Model.readStateFromBody = readStateFromBody;
  Model.writeStateToBody = writeStateToBody;
  Model._styleGet = styleGet;
  Model._styleSet = styleSet;
})(this);
