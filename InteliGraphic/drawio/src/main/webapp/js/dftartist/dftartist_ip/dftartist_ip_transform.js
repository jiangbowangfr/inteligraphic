(function (root) {
  'use strict';

  root = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
  var NS = root.DftsIP;
  if (!NS) throw new Error('请先加载 dftartist_common.js');
  if (NS.__transformLoadedExternalPinsFix3) return;
  NS.__transformLoadedExternalPinsFix3 = true;

  function withEachSelectedBody(graph, fn) {
    var cells = graph && graph.getSelectionCells ? (graph.getSelectionCells() || []) : [];
    if ((!cells || !cells.length) && graph && graph.getSelectionCell) {
      var sc = graph.getSelectionCell();
      if (sc) cells = [sc];
    }
    var seen = {};
    for (var i = 0; i < cells.length; i++) {
      var body = NS.findChipBodyForCell ? NS.findChipBodyForCell(graph, cells[i]) : cells[i];
      if (!body) continue;
      var id = body.getId ? body.getId() : mxObjectIdentity.get(body);
      if (seen[id]) continue;
      seen[id] = true;
      fn(body);
    }
  }

  function refreshGraph(graph, body) {
    if (graph && graph.refresh) graph.refresh(body || null);
  }

  function flipChipHorizontal(graph, body) {
    if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.flipHorizontal === 'function') {
      var out = NS.Symbol.flipHorizontal(graph, body);
      refreshGraph(graph, body);
      return out;
    }

    var model = graph.getModel();
    var pins = NS.getChipPins(graph, body);
    model.beginUpdate();
    try {
      for (var i = 0; i < pins.length; i++) {
        var pin = pins[i];
        var side = NS.getPinSide(graph, pin);
        var t = NS.getPinT(graph, pin);
        var newSide = side;
        var newT = t;
        if (side === 'west') newSide = 'east';
        else if (side === 'east') newSide = 'west';
        if (side === 'north' || side === 'south') newT = 1 - t;
        NS.setLinePinSideAndT(graph, pin, newSide, newT);
      }
      if (NS.syncInstanceLabelPosition) NS.syncInstanceLabelPosition(graph, body);
    } finally {
      model.endUpdate();
    }
    refreshGraph(graph, body);
  }

  function flipChipVertical(graph, body) {
    if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.flipVertical === 'function') {
      var out = NS.Symbol.flipVertical(graph, body);
      refreshGraph(graph, body);
      return out;
    }

    var model = graph.getModel();
    var pins = NS.getChipPins(graph, body);
    model.beginUpdate();
    try {
      for (var i = 0; i < pins.length; i++) {
        var pin = pins[i];
        var side = NS.getPinSide(graph, pin);
        var t = NS.getPinT(graph, pin);
        var newSide = side;
        var newT = t;
        if (side === 'north') newSide = 'south';
        else if (side === 'south') newSide = 'north';
        if (side === 'west' || side === 'east') newT = 1 - t;
        NS.setLinePinSideAndT(graph, pin, newSide, newT);
      }
      if (NS.syncInstanceLabelPosition) NS.syncInstanceLabelPosition(graph, body);
    } finally {
      model.endUpdate();
    }
    refreshGraph(graph, body);
  }

  function rotateChip90CW(graph, body) {
    if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.rotate90 === 'function') {
      var out = NS.Symbol.rotate90(graph, body);
      refreshGraph(graph, body);
      return out;
    }

    var model = graph.getModel();
    var pins = NS.getChipPins(graph, body);
    model.beginUpdate();
    try {
      var bg = body.geometry.clone();
      var oldW = bg.width;
      var oldH = bg.height;
      bg.width = oldH;
      bg.height = oldW;
      model.setGeometry(body, bg);

      for (var i = 0; i < pins.length; i++) {
        var pin = pins[i];
        var side = NS.getPinSide(graph, pin);
        var t = NS.getPinT(graph, pin);
        var newSide = 'west';
        if (side === 'west') newSide = 'north';
        else if (side === 'north') newSide = 'east';
        else if (side === 'east') newSide = 'south';
        else if (side === 'south') newSide = 'west';
        NS.setLinePinSideAndT(graph, pin, newSide, t);
      }

      var bodyStyle = body.getStyle ? (body.getStyle() || '') : (body.style || '');
      var cur = parseInt(mxUtils.getValue(graph.getCellStyle(body), 'dftsIP_orient', '0'), 10) || 0;
      var next = (cur + 90) % 360;
      bodyStyle = mxUtils.setStyle(bodyStyle, 'dftsIP_orient', String(next));
      bodyStyle = mxUtils.setStyle(bodyStyle, 'rotation', String(next));
      model.setStyle(body, bodyStyle);

      if (NS.syncInstanceLabelPosition) NS.syncInstanceLabelPosition(graph, body);
    } finally {
      model.endUpdate();
    }
    refreshGraph(graph, body);
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function runAction(ui, name) {
    if (!ui || !ui.actions) return;
    var action = ui.actions.get(name);
    if (action && typeof action.funct === 'function') action.funct();
  }

  function installHotkeys(ui) {
    if (!ui || ui.__ipTransformHotkeysInstalled) return;
    ui.__ipTransformHotkeysInstalled = true;

    function onKeyDown(evt) {
      if (!evt) return;
      if (!(evt.ctrlKey || evt.metaKey) || !evt.shiftKey || evt.altKey) return;
      if (isTypingTarget(evt.target)) return;
      var key = (evt.key || '').toLowerCase();
      if (key === 'r') { evt.preventDefault(); runAction(ui, 'ipRotate90'); }
      else if (key === 'h') { evt.preventDefault(); runAction(ui, 'ipFlipH'); }
      else if (key === 'v') { evt.preventDefault(); runAction(ui, 'ipFlipV'); }
    }

    if (root.document && root.document.addEventListener) root.document.addEventListener('keydown', onKeyDown, true);
  }

  function installIpTransformActions(ui) {
    var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : ui);
    if (!realUi || !realUi.editor || !realUi.editor.graph || !realUi.actions) return;
    if (realUi.__ipTransformActionsInstalled) return;
    realUi.__ipTransformActionsInstalled = true;

    var graph = realUi.editor.graph;
    var actFlipH = realUi.actions.addAction('ipFlipH', function () {
      withEachSelectedBody(graph, function (body) { flipChipHorizontal(graph, body); });
    });
    var actFlipV = realUi.actions.addAction('ipFlipV', function () {
      withEachSelectedBody(graph, function (body) { flipChipVertical(graph, body); });
    });
    var actRotate = realUi.actions.addAction('ipRotate90', function () {
      withEachSelectedBody(graph, function (body) { rotateChip90CW(graph, body); });
    });

    var isMac = !!(typeof mxClient !== 'undefined' && mxClient.IS_MAC);
    if (actFlipH) actFlipH.shortcut = isMac ? '⌘⇧H' : 'Ctrl+Shift+H';
    if (actFlipV) actFlipV.shortcut = isMac ? '⌘⇧V' : 'Ctrl+Shift+V';
    if (actRotate) actRotate.shortcut = isMac ? '⌘⇧R' : 'Ctrl+Shift+R';

    installHotkeys(realUi);
  }

  root.flipChipHorizontal = flipChipHorizontal;
  root.flipChipVertical = flipChipVertical;
  root.rotateChip90CW = rotateChip90CW;
  root.installIpTransformActions = installIpTransformActions;

  NS.flipChipHorizontal = flipChipHorizontal;
  NS.flipChipVertical = flipChipVertical;
  NS.rotateChip90CW = rotateChip90CW;
  NS.installIpTransformActions = installIpTransformActions;

  if (root.EditorUi && root.EditorUi.prototype && !root.EditorUi.prototype.__dftsEnsureIpTransformActions) {
    root.EditorUi.prototype.__dftsEnsureIpTransformActions = true;
    var _init = root.EditorUi.prototype.init;
    root.EditorUi.prototype.init = function () {
      var out = _init ? _init.apply(this, arguments) : undefined;
      try { installIpTransformActions(this); } catch (e) {}
      return out;
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
