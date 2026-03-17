// ======================
// PolygonTool 构造函数
// ======================
function PolygonTool(graph, ui) {
    this.graph = graph;
    this.ui = ui;

    this.points = [];
    this.active = false;
    this.previewCell = null;
    this.previewHaloCell = null;
    this.guideVCell = null;
    this.guideHCell = null;
    this.prevContainerCursor = null;
    this.prevCellsSelectable = null;
    this.prevCellsMovable = null;

    // ====== 新增：长度 / 角度 HUD ======
    var container = graph.container;
    var hud = document.createElement('div');
    hud.className = 'polygon-measure-hud';
    hud.style.position = 'absolute';
    hud.style.zIndex = 1000;
    hud.style.pointerEvents = 'none';
    hud.style.padding = '2px 6px';
    hud.style.borderRadius = '4px';
    hud.style.background = 'rgba(0,0,0,0.75)';
    hud.style.color = '#fff';
    hud.style.fontSize = '11px';
    hud.style.whiteSpace = 'nowrap';
    hud.style.display = 'none';
    document.body.appendChild(hud);

    this.hud = hud;
    // ===================================

    // 强制绘制态十字光标（覆盖 cell 自身 cursor）
    if (!document.getElementById('polygon-tool-cursor-style')) {
        var styleTag = document.createElement('style');
        styleTag.id = 'polygon-tool-cursor-style';
        styleTag.textContent =
            '.polygon-tool-active, .polygon-tool-active * { cursor: crosshair !important; }';
        document.head.appendChild(styleTag);
    }

    var self = this;
    this.keydownHandler = function (evt) {
        self.onKeyDown(evt);
    };

    this.mouseListener = {
        mouseDown: function (sender, me) {
            if (!self.active) return;

            console.log('[PolygonTool] mouseDown');

            var evt = me.getEvent();
            if (!mxEvent.isLeftMouseButton(evt)) return;

            var pt = self.getConstrainedPoint(self.getPoint(me), evt);
            console.log('[PolygonTool] add point', pt.x, pt.y);

            if (self.points.length === 0) {
                self.points.push(pt);
                self.createPreview();
            }
            else {
                if (self.isCloseToFirst(pt)) {
                    console.log('[PolygonTool] close polygon');
                    self.finish();
                    me.consume();
                    return;
                }

                self.points.push(pt);
                self.updatePreview(pt);
            }

            // 点击确定一个点后，HUD 先收一下，下一次移动再更新
            self.hideHud();
            me.consume();
        },

        mouseMove: function (sender, me) {
            if (!self.active) return;
            if (self.points.length === 0) return;

            var evt = me.getEvent();
            var pt = self.getConstrainedPoint(self.getPoint(me), evt);
            self.updatePreview(pt);

            // 更新 HUD：基于“最后一个固定点”和当前鼠标位置
            var last = self.points[self.points.length - 1];
            self.updateHud(last, pt, me);

            me.consume();
        },

        mouseUp: function (sender, me) {
            if (!self.active) return;
            // 现在我们只靠“点回起点”来结束，不用双击，就不写 finish 了
        }
    };
}

// ===== 关键：把鼠标 event 转成图纸上的坐标 =====
PolygonTool.prototype.getPoint = function (me) {
    var evt = me.getEvent();
    var p = this.graph.getPointForEvent(evt);
    return new mxPoint(p.x, p.y);
};

PolygonTool.prototype.getConstrainedPoint = function (rawPt, evt) {
    if (!rawPt) return rawPt;
    if (!evt || !evt.shiftKey) return rawPt;
    if (!this.points || this.points.length === 0) return rawPt;

    var last = this.points[this.points.length - 1];
    var dx = rawPt.x - last.x;
    var dy = rawPt.y - last.y;

    // Shift 锁 90°：仅允许水平或垂直
    if (Math.abs(dx) >= Math.abs(dy)) {
        return new mxPoint(rawPt.x, last.y);
    }

    return new mxPoint(last.x, rawPt.y);
};

PolygonTool.prototype.isCloseToFirst = function (pt) {
    if (this.points.length == 0) return false;

    var first = this.points[0];
    return pt.x === first.x && pt.y === first.y;
};

PolygonTool.prototype.getPreviewDashPattern = function () {
    var gridSize = Math.max(2, Math.round(this.graph.gridSize || 10));
    var dash = Math.max(2, gridSize - 1);
    var gap = 1;

    return dash + ' ' + gap;
};

PolygonTool.prototype.createPreview = function () {
    if (this.previewCell != null) return;

    console.log('[PolygonTool] createPreview');

    var graph = this.graph;
    var model = graph.getModel();
    var parent = graph.getDefaultParent();

    model.beginUpdate();
    try {
        // Halo + 主线双层预览，避免与底图线条混在一起看不清
        var haloStyle = 'strokeColor=#ffffff;strokeWidth=5;opacity=80;endArrow=none;rounded=0;lineJoin=miter;';
        var style = 'strokeColor=#00cc00;strokeWidth=2;dashed=1;dashPattern=' + this.getPreviewDashPattern() + ';endArrow=none;rounded=0;lineJoin=miter;';

        this.previewHaloCell = graph.insertEdge(
            parent,
            null,
            '',
            null,
            null,
            haloStyle
        );

        // 创建一条不连任何 cell 的 edge
        this.previewCell = graph.insertEdge(
            parent,
            null,
            '',
            null,
            null,
            style
        );

        var guideStyle = 'strokeColor=#4aa3ff;strokeWidth=1;dashed=1;dashPattern=4 4;endArrow=none;rounded=0;lineJoin=miter;';
        this.guideVCell = graph.insertEdge(parent, null, '', null, null, guideStyle);
        this.guideHCell = graph.insertEdge(parent, null, '', null, null, guideStyle);

        var geo = this.previewCell.getGeometry();

        // 有可能为 null，稳妥起见先判断一下
        if (geo != null) {
            geo = geo.clone();
            geo.relative = false;
            geo.points = [];

            if (this.points.length > 0) {
                var p = this.points[0];
                geo.setTerminalPoint(new mxPoint(p.x, p.y), true);  // source
                geo.setTerminalPoint(new mxPoint(p.x, p.y), false); // target
            }

            // 关键：通过 model 来设置几何，这样视图才会刷新
            model.setGeometry(this.previewCell, geo);
            if (this.previewHaloCell != null) {
                model.setGeometry(this.previewHaloCell, geo.clone());
            }
            this.updateGuideGeometry(this.guideVCell, null);
            this.updateGuideGeometry(this.guideHCell, null);
        }
    }
    finally {
        model.endUpdate();
    }
};

PolygonTool.prototype.updatePreview = function (mousePt) {
    if (!this.previewCell || this.points.length == 0) return;

    var pts = this.points.slice(0);
    if (mousePt) {
        pts.push(mousePt);
    }

    var first = pts[0];
    var last = pts[pts.length - 1];

    var graph = this.graph;
    var model = graph.getModel();
    var geo = this.previewCell.getGeometry();

    if (geo == null) return;

    geo = geo.clone();

    // 起点终点
    geo.setTerminalPoint(new mxPoint(first.x, first.y), true);
    geo.setTerminalPoint(new mxPoint(last.x, last.y), false);

    // 中间拐点
    geo.points = [];
    if (pts.length > 2) {
        for (var i = 1; i < pts.length - 1; i++) {
            geo.points.push(new mxPoint(pts[i].x, pts[i].y));
        }
    }

    model.beginUpdate();
    try {
        // 用 model.setGeometry
        model.setGeometry(this.previewCell, geo);
        if (this.previewHaloCell != null) {
            model.setGeometry(this.previewHaloCell, geo.clone());
        }
    }
    finally {
        model.endUpdate();
    }

    this.updateGuides(mousePt);
};

PolygonTool.prototype.findAlignedPoint = function (mousePt) {
    if (!mousePt || !this.points || this.points.length === 0) return { vertical: null, horizontal: null };

    var gridSize = Math.max(1, Math.round(this.graph.gridSize || 10));
    var tol = Math.max(1, Math.round(gridSize / 2));
    var vertical = null;
    var horizontal = null;

    for (var i = 0; i < this.points.length; i++) {
        var pt = this.points[i];
        if (vertical == null && Math.abs(mousePt.x - pt.x) <= tol) vertical = pt.x;
        if (horizontal == null && Math.abs(mousePt.y - pt.y) <= tol) horizontal = pt.y;
        if (vertical != null && horizontal != null) break;
    }

    return { vertical: vertical, horizontal: horizontal };
};

PolygonTool.prototype.updateGuideGeometry = function (cell, line) {
    if (!cell) return;

    var model = this.graph.getModel();
    var geo = cell.getGeometry();
    if (geo == null) return;

    geo = geo.clone();

    if (!line) {
        geo.setTerminalPoint(new mxPoint(0, 0), true);
        geo.setTerminalPoint(new mxPoint(0, 0), false);
        geo.points = [];
        model.setGeometry(cell, geo);
        model.setVisible(cell, false);
        return;
    }

    geo.setTerminalPoint(new mxPoint(line.x1, line.y1), true);
    geo.setTerminalPoint(new mxPoint(line.x2, line.y2), false);
    geo.points = [];
    model.setGeometry(cell, geo);
    model.setVisible(cell, true);
};

PolygonTool.prototype.updateGuides = function (mousePt) {
    if (!this.guideVCell && !this.guideHCell) return;

    var aligned = this.findAlignedPoint(mousePt);
    var pts = this.points.slice(0);
    if (mousePt) pts.push(mousePt);

    var minX = null, minY = null, maxX = null, maxY = null;
    for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        minX = minX == null ? p.x : Math.min(minX, p.x);
        minY = minY == null ? p.y : Math.min(minY, p.y);
        maxX = maxX == null ? p.x : Math.max(maxX, p.x);
        maxY = maxY == null ? p.y : Math.max(maxY, p.y);
    }

    var pad = Math.max(10, Math.round((this.graph.gridSize || 10) * 2));
    var vLine = aligned.vertical == null ? null : { x1: aligned.vertical, y1: minY - pad, x2: aligned.vertical, y2: maxY + pad };
    var hLine = aligned.horizontal == null ? null : { x1: minX - pad, y1: aligned.horizontal, x2: maxX + pad, y2: aligned.horizontal };

    var model = this.graph.getModel();
    model.beginUpdate();
    try {
        this.updateGuideGeometry(this.guideVCell, vLine);
        this.updateGuideGeometry(this.guideHCell, hLine);
    }
    finally {
        model.endUpdate();
    }
};


PolygonTool.prototype.destroyPreview = function () {
    if (!this.previewCell && !this.previewHaloCell && !this.guideVCell && !this.guideHCell) return;

    var graph = this.graph;
    var model = graph.getModel();

    model.beginUpdate();
    try {
        var toRemove = [];
        if (this.previewHaloCell) toRemove.push(this.previewHaloCell);
        if (this.previewCell) toRemove.push(this.previewCell);
        if (this.guideVCell) toRemove.push(this.guideVCell);
        if (this.guideHCell) toRemove.push(this.guideHCell);
        if (toRemove.length > 0) graph.removeCells(toRemove, false);
        this.previewHaloCell = null;
        this.previewCell = null;
        this.guideVCell = null;
        this.guideHCell = null;
    }
    finally {
        model.endUpdate();
    }
};

PolygonTool.prototype.computeBounds = function () {
    var pts = this.points;
    if (!pts || pts.length == 0) return null;

    var minX = pts[0].x, minY = pts[0].y;
    var maxX = pts[0].x, maxY = pts[0].y;

    for (var i = 1; i < pts.length; i++) {
        var p = pts[i];
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }

    return new mxRectangle(minX, minY, maxX - minX, maxY - minY);
};

PolygonTool.prototype.computePolyPointsStyle = function (bounds) {
    var pts = this.points;
    var res = [];

    for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var rx = (p.x - bounds.x) / bounds.width;
        var ry = (p.y - bounds.y) / bounds.height;

        rx = Math.round(rx * 1000) / 1000;
        ry = Math.round(ry * 1000) / 1000;

        res.push(rx + ',' + ry);
    }

    return res.join(' '); 
};

PolygonTool.prototype.ensureFloorplanPerimeter = function () {
    var lineNS = window.DftsFloorplanLine || null;
    if (lineNS && typeof lineNS.ensurePerimeterRegistered === 'function') {
        lineNS.ensurePerimeterRegistered();
    }
};

PolygonTool.prototype.resolveFloorplanLabel = function () {
    var floorplanNS = window.DftsFloorplan || null;
    if (floorplanNS && typeof floorplanNS.getNextAutoLabel === 'function') {
        return floorplanNS.getNextAutoLabel(this.graph, 'MODULE');
    }
    return 'MODULE';
};

PolygonTool.prototype.buildFloorplanPolygonStyle = function (polyStr, label) {
    return [
        'shape=' + CustomPolygonShape.prototype.cst.SHAPE,
        'polyPoints=' + polyStr,
        'rounded=0',
        'lineJoin=miter',
        'whiteSpace=wrap',
        'html=1',
        'align=left',
        'verticalAlign=top',
        'labelPosition=center',
        'verticalLabelPosition=middle',
        'spacingLeft=6',
        'spacingTop=4',
        'connectable=1',
        'resizable=1',
        'movable=1',
        'editable=1',
        'strokeWidth=1',
        'fontSize=20',
        'floorplan=1',
        'perimeter=floorplanAnyPoint',
        'dftsFloorplanRect=1',
        'dftsFloorplan_type=module',
        'dftsFloorplan_labelPolicy=user_or_auto_increment',
        'dftsFloorplan_defKey=FloorplanModule',
        'dftsIP_type=floorplan_module',
        'dftsFloorplan_moduleName=' + String(label || ''),
        'dftsFloorplan_instanceName=',
        'dftsFloorplan_designLevel='
    ].join(';') + ';';
};

PolygonTool.prototype.finish = function () {
    if (this.points.length < 3) {
        this.cancel();
        return;
    }

    var bounds = this.computeBounds();
    if (!bounds || bounds.width == 0 || bounds.height == 0) {
        this.cancel();
        return;
    }

    var polyStr = this.computePolyPointsStyle(bounds);
    this.ensureFloorplanPerimeter();

    var label = this.resolveFloorplanLabel();
    var style = this.buildFloorplanPolygonStyle(polyStr, label);

    var graph = this.graph;
    var model = graph.getModel();
    var parent = graph.getDefaultParent();

    var vertex = null;

    model.beginUpdate();
    try {
        vertex = graph.insertVertex(
            parent,
            null,
            label,
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            style
        );
        if (vertex) vertex.connectable = true;
        if (window.__DFTS_FLOORPLAN_DEBUG__ && typeof console !== 'undefined' && console.log) {
            console.log('[PolygonTool] floorplan polygon created', {
                cellId: vertex && vertex.id,
                label: label,
                style: vertex && vertex.style
            });
        }
        var floorplanNS = window.DftsFloorplan || null;
        if (vertex && floorplanNS && typeof floorplanNS.syncFloorplanModuleCell === 'function') {
            floorplanNS.syncFloorplanModuleCell(graph, vertex);
            if (window.__DFTS_FLOORPLAN_DEBUG__ && typeof console !== 'undefined' && console.log) {
                console.log('[PolygonTool] floorplan polygon synced', {
                    cellId: vertex && vertex.id,
                    value: vertex && vertex.value,
                    style: vertex && vertex.style,
                    childCount: vertex && vertex.children ? vertex.children.length : 0
                });
            }
        }
    }
    finally {
        model.endUpdate();
    }

    // 保存为模板配置，下次打开软件还能用
    this.savePolygonTemplate(vertex);
    // 新增：把这个多边形加入 Palette
    try {
        this.addToPalette(vertex);
    } catch (e) {
        console.log('[PolygonTool] addToPalette error', e);
    }

    this.stop();
};


PolygonTool.prototype.cancel = function () {
    this.stop();
};

PolygonTool.prototype.undoLastPoint = function () {
    if (!this.active || this.points.length === 0) return;

    this.points.pop();

    if (this.points.length === 0) {
        this.destroyPreview();
        this.hideHud();
        return;
    }

    this.updatePreview();
    this.hideHud();
};

PolygonTool.prototype.onKeyDown = function (evt) {
    if (!this.active || !evt) return;

    var key = evt.key;
    var isUndo = (key === 'Backspace' || key === 'Delete') ||
        ((evt.ctrlKey || evt.metaKey) && (key === 'z' || key === 'Z'));

    if (key === 'Escape') {
        evt.preventDefault();
        evt.stopPropagation();
        this.cancel();
        return;
    }

    if (key === 'Enter' || key === ' ') {
        evt.preventDefault();
        evt.stopPropagation();
        if (this.points.length >= 3) this.finish();
        return;
    }

    if (isUndo) {
        evt.preventDefault();
        evt.stopPropagation();
        this.undoLastPoint();
    }
};

PolygonTool.prototype.start = function () {
    if (this.active) return;

    console.log('[PolygonTool] start');

    this.active = true;
    this.graph.addMouseListener(this.mouseListener);
    window.addEventListener('keydown', this.keydownHandler, true);
    this.graph.setPanning(false);
    this.prevCellsSelectable = this.graph.isCellsSelectable ? this.graph.isCellsSelectable() : null;
    this.prevCellsMovable = this.graph.isCellsMovable ? this.graph.isCellsMovable() : null;
    if (this.graph.setCellsSelectable) this.graph.setCellsSelectable(false);
    if (this.graph.setCellsMovable) this.graph.setCellsMovable(false);
    if (this.graph.container) {
        this.prevContainerCursor = this.graph.container.style.cursor || '';
        this.graph.container.classList.add('polygon-tool-active');
        this.graph.container.style.cursor = 'crosshair';
    }
    this.hideHud();  // ★ 一开始隐藏
};

PolygonTool.prototype.stop = function () {
    if (!this.active) return;

    console.log('[PolygonTool] stop');

    this.active = false;
    window.removeEventListener('keydown', this.keydownHandler, true);
    this.graph.removeMouseListener(this.mouseListener);
    this.destroyPreview();
    this.points = [];
    if (this.graph.setCellsSelectable && this.prevCellsSelectable != null) {
        this.graph.setCellsSelectable(this.prevCellsSelectable);
    }
    if (this.graph.setCellsMovable && this.prevCellsMovable != null) {
        this.graph.setCellsMovable(this.prevCellsMovable);
    }
    this.prevCellsSelectable = null;
    this.prevCellsMovable = null;
    if (this.graph.container) {
        this.graph.container.classList.remove('polygon-tool-active');
        this.graph.container.style.cursor = this.prevContainerCursor || '';
    }
    this.prevContainerCursor = null;
    this.hideHud();  // ★ 停止时隐藏
};



// 把一个 cell 作为模板塞进左侧 myPolygon palette
PolygonTool.prototype.addToPalette = function (cell) {
    if (!cell || !this.ui || !this.ui.sidebar) return;

    var sidebar = this.ui.sidebar;

    // 1) 找到 myPolygon palette 对应的 DOM
    // addGeneralPalette 里 id 用的是 'general'
    var pal = sidebar.palettes['myPolygon'];

    if (!pal || pal.length < 2) {
        console.log('[PolygonTool] myPolygon palette not found');
        return;
    }

    // pal[0] = 标题元素, pal[1] = outer div, outer.firstChild = content div
    var outer = pal[1];
    var content = outer.firstChild;

    if (!content) {
        console.log('[PolygonTool] myPolygon content not found');
        return;
    }

    // 2) 克隆一下 cell，位置改成 (0,0)，避免缩略图偏移
    var clone = cell.clone();

    if (clone.geometry) {
        clone.geometry = clone.geometry.clone();
        clone.geometry.x = 0;
        clone.geometry.y = 0;
    }

    var w = clone.geometry ? clone.geometry.width : 80;
    var h = clone.geometry ? clone.geometry.height : 60;

    // 3) 用官方的 API 生成“缩略图按钮”
    //    这里的第四个参数是 tooltip/title，你可以改成 'Polygon' 或中文名字
    var elt = sidebar.createVertexTemplateFromCells(
        [clone],
        w,
        h,
        'Polygon'
    );

    // 4) 直接 append 到内容容器里
    content.appendChild(elt);
};


PolygonTool.prototype.savePolygonTemplate = function (cell) {
    if (!cell || !cell.geometry) return;

    var style = cell.getStyle() || '';
    var geo   = cell.geometry;

    var tpl = {
        style: style,
        w: geo.width,
        h: geo.height,
        label: 'Polygon'  // 想改名字可以从别处传进来
    };

    var key = 'myPolygonTemplates';
    var arr = [];

    try {
        var raw = localStorage.getItem(key);
        if (raw) {
            arr = JSON.parse(raw);
        }
    } catch (e) {
        console.log('[PolygonTool] parse saved templates error', e);
    }

    arr.push(tpl);

    try {
        localStorage.setItem(key, JSON.stringify(arr));
        console.log('[PolygonTool] template saved, count = ' + arr.length);
    } catch (e) {
        console.log('[PolygonTool] save templates error', e);
    }
};

// ===== 长度 / 角度 HUD 更新 =====
PolygonTool.prototype.updateHud = function (fromPt, cursorPt, me) {
    if (!this.hud || !fromPt || !cursorPt || !me) return;

    // 1) 长度
    var dx = cursorPt.x - fromPt.x;
    var dy = cursorPt.y - fromPt.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var text = 'L: ' + len.toFixed(1);

    // 2) 内角（和上一段）
    if (this.points.length >= 2) {
        var p0 = this.points[this.points.length - 2];
        var p1 = this.points[this.points.length - 1];

        var v1x = p1.x - p0.x;
        var v1y = p1.y - p0.y;
        var v2x = cursorPt.x - p1.x;
        var v2y = cursorPt.y - p1.y;

        var a1 = Math.atan2(v1y, v1x);
        var a2 = Math.atan2(v2y, v2x);
        var ang = (a2 - a1) * 180 / Math.PI;

        while (ang > 180) ang -= 360;
        while (ang <= -180) ang += 360;

        var outer = Math.abs(ang);
        var inner = 180 - outer;
        if (inner < 0) inner = 0;

        text += '  ∠: ' + inner.toFixed(1) + '°';
    }

    this.hud.textContent = text;

    // 3) 用鼠标位置放 HUD
    var evt = me.getEvent();
    var screenX = evt.clientX + window.pageXOffset + 12;
    var screenY = evt.clientY + window.pageYOffset + 12;

    this.hud.style.left = screenX + 'px';
    this.hud.style.top = screenY + 'px';
    this.hud.style.display = 'block';
};

PolygonTool.prototype.hideHud = function () {
    if (this.hud) {
        this.hud.style.display = 'none';
    }
};
