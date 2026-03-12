(function (global) {
  'use strict';

  var NS = global.DftsIP = global.DftsIP || {};
  var LG = NS.LogicGate = NS.LogicGate || {};

  function install() {
    if (LG.__shapesLoaded) return true;
    if (typeof mxCellRenderer === 'undefined' || typeof mxShape === 'undefined' || typeof mxUtils === 'undefined') {
      return false;
    }

    function sVal(style, key, dflt) {
      if (!style) return dflt;
      var v = style[key];
      if (v == null) return dflt;
      return String(v);
    }

    function clamp01(v) {
      v = Number(v);
      if (isNaN(v)) v = 0;
      if (v < 0) return 0;
      if (v > 1) return 1;
      return v;
    }

    function drawBubble(c, cx, cy, r) {
      c.ellipse(cx - r, cy - r, r * 2, r * 2);
      c.fillAndStroke();
    }

    function DftsLogicGateShape() { mxShape.call(this); }
    mxUtils.extend(DftsLogicGateShape, mxShape);

    DftsLogicGateShape.prototype.paintVertexShape = function (c, x, y, w, h) {
      var kind = (sVal(this.style, 'dftsGateKind', 'and') || 'and').toLowerCase();
      var invOut = sVal(this.style, 'dftsGateInvertOutput', '0') === '1';

      c.setFillColor(this.fill);
      c.setStrokeColor(this.stroke);
      c.setStrokeWidth(this.strokewidth || 1);

      if (kind === 'mux') {
        // Standard trapezoid: vertical left/right, slanted top/bottom.
        var taper = Math.max(8, Math.round(h * 0.18));
        var x0 = x + 1;
        var x1 = x + w - 1;
        var y0 = y + 1;
        var y1 = y + h - 1;

        c.begin();
        c.moveTo(x0, y0);
        c.lineTo(x1, y0 + taper);
        c.lineTo(x1, y1 - taper);
        c.lineTo(x0, y1);
        c.close();
        c.fillAndStroke();
        return;
      }

      if (kind === 'not' || kind === 'buf') {
        var bubbleR = Math.max(4, Math.round(Math.min(w, h) * 0.055));
        var rightPad = 1;
        var tipX = x + w - rightPad;
        if (invOut || kind === 'not') {
          tipX = x + w - (bubbleR * 2) - rightPad - 1;
        }

        c.begin();
        c.moveTo(x + 1, y + 1);
        c.lineTo(x + 1, y + h - 1);
        c.lineTo(tipX, y + h * 0.5);
        c.close();
        c.fillAndStroke();

        if (invOut || kind === 'not') {
          var bubbleCx = x + w - bubbleR - rightPad;
          drawBubble(c, bubbleCx, y + h * 0.5, bubbleR);
        }
        return;
      }

      if (kind === 'or' || kind === 'xor') {
        var right = x + w - 1;
        var top = y + 1;
        var bot = y + h - 1;
        var midY = y + h * 0.5;
        var leftOuter = x + w * 0.04;
        var leftMain = x + w * 0.18;

        c.begin();
        c.moveTo(leftMain, top);
        c.curveTo(x + w * 0.60, y + h * 0.03, right, y + h * 0.20, right, midY);
        c.curveTo(right, y + h * 0.80, x + w * 0.60, y + h * 0.97, leftMain, bot);
        c.curveTo(x + w * 0.30, y + h * 0.84, x + w * 0.25, y + h * 0.67, leftOuter, midY);
        c.curveTo(x + w * 0.25, y + h * 0.33, x + w * 0.30, y + h * 0.16, leftMain, top);
        c.close();
        c.fillAndStroke();

        if (kind === 'xor') {
          c.begin();
          c.moveTo(x + w * 0.00, top + h * 0.02);
          c.curveTo(x + w * 0.17, y + h * 0.20, x + w * 0.17, y + h * 0.80, x + w * 0.00, bot - h * 0.02);
          c.stroke();
        }

        if (invOut) {
          var r2 = Math.max(4, Math.round(Math.min(w, h) * 0.055));
          var bubbleCx2 = x + w - r2 - 1;
          drawBubble(c, bubbleCx2, midY, r2);
        }
        return;
      }

      // AND / NAND fallback: true D-shape with a half-ellipse right side.
      var leftX = x + 1;
      var topY = y + 1;
      var botY = y + h - 1;
      var midY2 = y + h * 0.5;
      var bubbleR3 = Math.max(4, Math.round(Math.min(w, h) * 0.055));
      var bubbleCx3 = invOut ? (x + w - bubbleR3 - 1) : null;
      var outerRight = invOut ? (bubbleCx3 - bubbleR3) : (x + w - 1);
      var ry = Math.max(4, (botY - topY) / 2);
      var rectRight = Math.max(leftX + 8, outerRight - ry);
      var rx = Math.max(4, outerRight - rectRight);
      var k = 0.55228475;

      c.begin();
      c.moveTo(leftX, topY);
      c.lineTo(rectRight, topY);
      c.curveTo(rectRight + rx * k, topY, outerRight, midY2 - ry * k, outerRight, midY2);
      c.curveTo(outerRight, midY2 + ry * k, rectRight + rx * k, botY, rectRight, botY);
      c.lineTo(leftX, botY);
      c.close();
      c.fillAndStroke();

      if (invOut) {
        drawBubble(c, bubbleCx3, midY2, bubbleR3);
      }
    };

    if (!mxCellRenderer.defaultShapes || !mxCellRenderer.defaultShapes['dftsLogicGate']) {
      mxCellRenderer.registerShape('dftsLogicGate', DftsLogicGateShape);
    }

    LG.__shapesLoaded = true;
    return true;
  }

  LG.installShapes = install;

  if (!install() && typeof global.setInterval === 'function' && typeof global.clearInterval === 'function') {
    var tries = 0;
    var timer = global.setInterval(function () {
      tries += 1;
      if (install() || tries >= 50) {
        global.clearInterval(timer);
      }
    }, 100);
  }
})(this);
