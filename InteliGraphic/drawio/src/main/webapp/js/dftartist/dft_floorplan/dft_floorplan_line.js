(function (global) {
    var NS = global.DftsFloorplanLine = global.DftsFloorplanLine || {};
    if (NS.__loaded) return;
    NS.__loaded = true;

    NS.VERSION = '2.1.0';

    function normalizeUi(ui) {
        if (!ui) return null;
        if (ui.editor && ui.editor.graph) return ui;
        if (ui.editorUi && ui.editorUi.editor && ui.editorUi.editor.graph) return ui.editorUi;
        return null;
    }

    function normalizeGraph(ui) {
        var realUi = normalizeUi(ui);
        return realUi && realUi.editor ? realUi.editor.graph : null;
    }

    function toBool(v) {
        return v === true || v === '1' || v === 1;
    }

    function clonePoint(pt) {
        return pt ? new mxPoint(pt.x, pt.y) : null;
    }

    function cloneLineGeometry(geo) {
        if (!geo) return null;
        var g = geo.clone();
        g.sourcePoint = clonePoint(geo.sourcePoint);
        g.targetPoint = clonePoint(geo.targetPoint);
        g.points = [];
        if (geo.points && geo.points.length) {
            for (var i = 0; i < geo.points.length; i++) g.points.push(clonePoint(geo.points[i]));
        }
        return g;
    }

    function samePoint(a, b) {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return a.x === b.x && a.y === b.y;
    }

    function isDegenerateLine(geo) {
        var noPoints = !geo.points || geo.points.length === 0;
        return noPoints && samePoint(geo.sourcePoint, geo.targetPoint);
    }

    function getEndPointForMode(geo, mode) {
        return (mode === 'head') ? clonePoint(geo.sourcePoint) : clonePoint(geo.targetPoint);
    }

    function toGraphPoint(graph, evt) {
        var p = mxUtils.convertPoint(graph.container, mxEvent.getClientX(evt), mxEvent.getClientY(evt));
        var s = graph.view.scale;
        var tr = graph.view.translate;
        return new mxPoint(
            graph.snap(p.x / s - tr.x),
            graph.snap(p.y / s - tr.y)
        );
    }

    function ensurePerimeterRegistered() {
        if (typeof mxStyleRegistry === 'undefined' || typeof mxPerimeter === 'undefined') return;
        if (mxStyleRegistry.getValue('floorplanAnyPoint') != null) return;

        mxPerimeter.FloorplanAnyPoint = function (bounds, vertex, next, orthogonal) {
            return new mxPoint(next.x, next.y);
        };

        mxStyleRegistry.putValue('floorplanAnyPoint', mxPerimeter.FloorplanAnyPoint);
    }

    function buildFloorplanLineCell(opt) {
        opt = opt || {};

        var geo = new mxGeometry();
        geo.relative = false;
        geo.sourcePoint = new mxPoint(0, 0);
        geo.targetPoint = new mxPoint(80, 0);
        geo.points = [];

        var strokeWidth = Math.max(1, parseInt(opt.strokeWidth, 10) || 2);
        var strokeColor = opt.strokeColor || '#000000';
        var endArrow = (opt.endArrow == null) ? 'classic' : String(opt.endArrow);
        var dashed = toBool(opt.dashed) ? '1' : '0';

        var style = [
            'edgeStyle=none',
            'orthogonal=0',
            'rounded=0',
            'html=1',
            'movable=1',
            'resizable=0',
            'editable=0',
            'deletable=1',
            'jumpStyle=none',
            'startArrow=none',
            'endArrow=' + endArrow,
            'strokeColor=' + strokeColor,
            'strokeWidth=' + strokeWidth,
            'dashed=' + dashed,
            'floorplanLine=1'
        ].join(';') + ';';

        var e = new mxCell('', geo, style);
        e.edge = true;
        return e;
    }

    function enableFloorplanFreeConnect(ui) {
        var graph = normalizeGraph(ui);
        if (!graph || graph._dftsFloorplanFreeConnectInstalled) return;
        graph._dftsFloorplanFreeConnectInstalled = true;

        ensurePerimeterRegistered();

        var ch = graph.connectionHandler && graph.connectionHandler.constraintHandler;
        if (ch && ch.getConstraints) {
            var oldGetConstraints = ch.getConstraints;
            ch.getConstraints = function (state, source) {
                try {
                    if (state && state.cell) {
                        var style = graph.getCellStyle(state.cell);
                        if (style && mxUtils.getValue(style, 'floorplan', '0') === '1') return null;
                    }
                } catch (e) { }
                return oldGetConstraints.apply(this, arguments);
            };
        }

        if (graph.getAllConnectionConstraints) {
            var oldAll = graph.getAllConnectionConstraints;
            graph.getAllConnectionConstraints = function (terminal, source) {
                try {
                    if (terminal && terminal.cell) {
                        var style = graph.getCellStyle(terminal.cell);
                        if (style && mxUtils.getValue(style, 'floorplan', '0') === '1') return null;
                    }
                } catch (e) { }
                return oldAll.apply(this, arguments);
            };
        }
    }

    function resolveToolPoint(graph, tool, rawPt) {
        var basePt = tool.orth ? orthSnap(tool.baseGeo, rawPt, tool.continueMode) : clonePoint(rawPt);
        var result = {
            point: clonePoint(basePt),
            snap: null,
            snapped: false
        };

        if (tool && tool.options && typeof tool.options.snapPoint === 'function') {
            try {
                var custom = tool.options.snapPoint(clonePoint(basePt), {
                    graph: graph,
                    tool: tool,
                    rawPoint: clonePoint(rawPt),
                    basePoint: clonePoint(basePt)
                });

                if (custom) {
                    if (custom.point) {
                        result.point = clonePoint(custom.point);
                        result.snap = custom.meta || custom.snap || null;
                        result.snapped = true;
                    } else if (typeof custom.x === 'number' && typeof custom.y === 'number') {
                        result.point = new mxPoint(custom.x, custom.y);
                        result.snap = custom.meta || null;
                        result.snapped = true;
                    }
                }
            } catch (e) { }
        }

        return result;
    }

    function applyPreviewGeometry(graph, tool, rawPt) {
        if (!tool.edge || !tool.baseGeo) return;

        var g = cloneLineGeometry(tool.baseGeo);
        g.points = g.points || [];

        var resolved = resolveToolPoint(graph, tool, rawPt);
        var pt = resolved.point;
        tool.previewSnap = resolved.snap || null;
        var oldEnd = getEndPointForMode(tool.baseGeo, tool.continueMode);

        if (samePoint(pt, oldEnd)) {
            graph.getModel().setGeometry(tool.edge, cloneLineGeometry(tool.baseGeo));
            return;
        }

        if (tool.continueMode === 'head') {
            if (!isDegenerateLine(tool.baseGeo) && g.sourcePoint) {
                g.points.unshift(clonePoint(g.sourcePoint));
            }
            g.sourcePoint = clonePoint(pt);
        } else {
            if (!isDegenerateLine(tool.baseGeo) && g.targetPoint) {
                g.points.push(clonePoint(g.targetPoint));
            }
            g.targetPoint = clonePoint(pt);
        }

        graph.getModel().setGeometry(tool.edge, g);
    }

    function orthSnap(baseGeo, rawPt, mode) {
        var ref = getEndPointForMode(baseGeo, mode);
        if (!ref) return clonePoint(rawPt);

        var dx = Math.abs(rawPt.x - ref.x);
        var dy = Math.abs(rawPt.y - ref.y);
        return (dx >= dy) ? new mxPoint(rawPt.x, ref.y) : new mxPoint(ref.x, rawPt.y);
    }

    function commitPoint(graph, tool, rawPt) {
        if (!tool.edge || !tool.baseGeo) return;

        var g = cloneLineGeometry(tool.baseGeo);
        g.points = g.points || [];

        var resolved = resolveToolPoint(graph, tool, rawPt);
        var pt = resolved.point;
        var oldEnd = getEndPointForMode(g, tool.continueMode);

        if (samePoint(pt, oldEnd)) {
            graph.getModel().setGeometry(tool.edge, cloneLineGeometry(tool.baseGeo));
            return;
        }

        if (tool.continueMode === 'head') {
            if (isDegenerateLine(g)) {
                g.sourcePoint = clonePoint(pt);
            } else {
                if (g.sourcePoint) g.points.unshift(clonePoint(g.sourcePoint));
                g.sourcePoint = clonePoint(pt);
            }
        } else {
            if (isDegenerateLine(g)) {
                g.targetPoint = clonePoint(pt);
            } else {
                if (g.targetPoint) g.points.push(clonePoint(g.targetPoint));
                g.targetPoint = clonePoint(pt);
            }
        }

        graph.getModel().setGeometry(tool.edge, g);
        tool.baseGeo = cloneLineGeometry(g);
        tool.previewSnap = resolved.snap || null;
        if (!tool.history) tool.history = [];
        tool.history.push(cloneLineGeometry(g));

        if (tool.options && typeof tool.options.afterCommitPoint === 'function') {
            try {
                tool.options.afterCommitPoint({
                    graph: graph,
                    tool: tool,
                    point: clonePoint(pt),
                    rawPoint: clonePoint(rawPt),
                    snap: resolved.snap || null
                });
            } catch (e) { }
        }
    }

    function undoLastCommittedPoint(graph, tool) {
        if (!tool) return false;
        if (!tool.edge || !tool.baseGeo || !tool.history || tool.history.length <= 1) return false;

        graph.getModel().setGeometry(tool.edge, cloneLineGeometry(tool.baseGeo));

        tool.history.pop();
        var prev = cloneLineGeometry(tool.history[tool.history.length - 1]);

        graph.getModel().beginUpdate();
        try {
            graph.getModel().setGeometry(tool.edge, prev);
            tool.baseGeo = cloneLineGeometry(prev);
            if (graph.getSelectionCell && graph.getSelectionCell() !== tool.edge) {
                graph.setSelectionCell(tool.edge);
            }
        } finally {
            graph.getModel().endUpdate();
        }

        return true;
    }

    function clearTool(graph, tool, preserveSession) {
        if (!tool) return;
        if (tool.edge && tool.baseGeo) {
            graph.getModel().setGeometry(tool.edge, cloneLineGeometry(tool.baseGeo));
        }
        tool.active = false;
        if (!preserveSession) {
            tool.continueMode = 'tail';
            tool.edge = null;
            tool.baseGeo = null;
            tool.history = [];
            tool.options = null;
            tool.previewSnap = null;
        }
        if (tool.prevCursor != null) {
            graph.container.style.cursor = tool.prevCursor;
            tool.prevCursor = null;
        }
    }

    function installFloorplanLineTool(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor ? realUi.editor.graph : null;
        if (!graph || graph._dftsFloorplanLineToolInstalled) return;
        graph._dftsFloorplanLineToolInstalled = true;

        enableFloorplanFreeConnect(realUi);

        var tool = {
            active: false,
            continueMode: 'tail',
            edge: null,
            baseGeo: null,
            orth: true,
            prevCursor: null,
            history: [],
            options: null,
            previewSnap: null,
            ignoreNextMouseDown: false
        };

        realUi.floorplanLineTool = tool;

        function beginTool(mode, edgeCell, opt) {
            tool.active = true;
            tool.continueMode = mode || 'tail';
            tool.edge = edgeCell || null;
            tool.baseGeo = edgeCell ? cloneLineGeometry(graph.getCellGeometry(edgeCell)) : null;
            tool.history = tool.baseGeo ? [cloneLineGeometry(tool.baseGeo)] : [];
            tool.options = opt || null;
            tool.previewSnap = null;
            tool.ignoreNextMouseDown = false;
            if (tool.prevCursor == null) tool.prevCursor = graph.container.style.cursor;
            graph.container.style.cursor = 'crosshair';
        }

        function createEdgeAtPoint(pt, opt) {
            opt = opt || {};
            graph.getModel().beginUpdate();
            try {
                var e = buildFloorplanLineCell(opt.style || opt);
                var g = cloneLineGeometry(e.geometry);
                g.sourcePoint = clonePoint(pt);
                g.targetPoint = clonePoint(pt);
                g.points = [];
                e.geometry = g;
                tool.edge = graph.addCell(e, graph.getDefaultParent());
                tool.baseGeo = cloneLineGeometry(g);
                tool.history = [cloneLineGeometry(g)];
                if (typeof opt.decorateEdge === 'function') opt.decorateEdge(tool.edge, graph);
                graph.setSelectionCell(tool.edge);
                return tool.edge;
            } finally {
                graph.getModel().endUpdate();
            }
        }

        realUi.startFloorplanLine = function () {
            beginTool('tail', null, null);
        };

        realUi.startFloorplanLineFromPoint = function (pt, opt) {
            if (!pt) return null;
            beginTool('tail', null, opt || null);
            tool.ignoreNextMouseDown = true;
            return createEdgeAtPoint(pt, opt || {});
        };

        realUi.continueFloorplanLineFromTail = function (cell) {
            if (!cell || !cell.edge) return;
            var style = graph.getCellStyle(cell);
            if (String(mxUtils.getValue(style, 'floorplanLine', '0')) !== '1') return;
            beginTool('tail', cell, null);
            graph.setSelectionCell(cell);
        };

        realUi.continueFloorplanLineFromHead = function (cell) {
            if (!cell || !cell.edge) return;
            var style = graph.getCellStyle(cell);
            if (String(mxUtils.getValue(style, 'floorplanLine', '0')) !== '1') return;
            beginTool('head', cell, null);
            graph.setSelectionCell(cell);
        };

        realUi.finishFloorplanLine = function () {
            clearTool(graph, tool, true);
        };

        realUi.cancelFloorplanLine = function () {
            clearTool(graph, tool, false);
        };

        realUi.toggleFloorplanLineOrth = function () {
            tool.orth = !tool.orth;
            return tool.orth;
        };

        graph.addMouseListener({
            mouseDown: function (sender, me) {
                if (!tool.active) return;
                var evt = me.getEvent();
                if (!mxEvent.isLeftMouseButton(evt)) return;
                if (tool.ignoreNextMouseDown) {
                    tool.ignoreNextMouseDown = false;
                    me.consume();
                    mxEvent.consume(evt);
                    return;
                }

                var pt = toGraphPoint(graph, evt);

                graph.getModel().beginUpdate();
                try {
                    if (!tool.edge) {
                        createEdgeAtPoint(pt, {});
                    } else {
                        commitPoint(graph, tool, pt);
                    }
                } finally {
                    graph.getModel().endUpdate();
                }

                me.consume();
                mxEvent.consume(evt);
            },
            mouseMove: function (sender, me) {
                if (!tool.active || !tool.edge || !tool.baseGeo) return;
                var evt = me.getEvent();
                var pt = toGraphPoint(graph, evt);
                applyPreviewGeometry(graph, tool, pt);
                me.consume();
                mxEvent.consume(evt);
            },
            mouseUp: function (sender, me) {
                if (!tool.active || !tool.edge || !tool.baseGeo) return;
                var evt = me.getEvent ? me.getEvent() : null;
                if (!evt || !mxEvent.isLeftMouseButton(evt)) return;
                if (!(tool.options && tool.options.commitOnMouseUp)) return;

                var pt = toGraphPoint(graph, evt);
                graph.getModel().beginUpdate();
                try {
                    commitPoint(graph, tool, pt);
                } finally {
                    graph.getModel().endUpdate();
                }

                if (!tool.options || tool.options.autoFinishOnMouseUp !== false) {
                    clearTool(graph, tool, true);
                }

                me.consume();
                mxEvent.consume(evt);
            }
        });

        graph.dblClick = (function (oldFn) {
            return function (evt, cell) {
                if (tool.active) {
                    clearTool(graph, tool, true);
                    if (evt) mxEvent.consume(evt);
                    return;
                }
                if (oldFn) return oldFn.apply(this, arguments);
            };
        })(graph.dblClick);

        if (typeof document !== 'undefined') {
            var keydownHandler = function (evt) {
                var target = evt.target || evt.srcElement;
                var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
                var isInput = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
                if (isInput) return;

                var canUndoLocal = !!(tool.edge && tool.baseGeo && tool.history && tool.history.length > 1 && (tool.active || graph.getSelectionCell() === tool.edge));
                var isUndoKey = canUndoLocal && (
                    evt.key === 'Backspace' ||
                    (((evt.ctrlKey || evt.metaKey) && !evt.altKey) && (evt.key === 'z' || evt.key === 'Z'))
                );

                if (isUndoKey) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    undoLastCommittedPoint(graph, tool);
                    return false;
                }

                if (tool.active && (evt.key === 'Escape' || evt.key === 'Enter')) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    clearTool(graph, tool, true);
                    return false;
                }

                if (evt.shiftKey && !evt.ctrlKey && !evt.altKey && (evt.key === 'L' || evt.key === 'l')) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    realUi.startFloorplanLine();
                    return false;
                }
                if (evt.shiftKey && !evt.ctrlKey && !evt.altKey && (evt.key === 'H' || evt.key === 'h')) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    realUi.continueFloorplanLineFromHead(graph.getSelectionCell());
                    return false;
                }
                if (evt.shiftKey && !evt.ctrlKey && !evt.altKey && (evt.key === 'T' || evt.key === 't')) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    realUi.continueFloorplanLineFromTail(graph.getSelectionCell());
                    return false;
                }
                if (evt.shiftKey && !evt.ctrlKey && !evt.altKey && (evt.key === 'O' || evt.key === 'o')) {
                    if (typeof evt.preventDefault === 'function') evt.preventDefault();
                    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
                    else if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
                    realUi.toggleFloorplanLineOrth();
                    return false;
                }
            };

            if (document.addEventListener) document.addEventListener('keydown', keydownHandler, true);
            else mxEvent.addListener(document, 'keydown', keydownHandler);
        }
    }

    function installFloorplanLineContinueHandles(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor ? realUi.editor.graph : null;
        if (!graph || graph._dftsFloorplanLineContinueHandlesInstalled) return;
        if (typeof mxEdgeHandler === 'undefined' || typeof mxRectangle === 'undefined') return;

        function FloorplanLineEdgeHandler(state) {
            this.ui = realUi;
            mxEdgeHandler.call(this, state);
        }

        FloorplanLineEdgeHandler.prototype = Object.create(mxEdgeHandler.prototype);
        FloorplanLineEdgeHandler.prototype.constructor = FloorplanLineEdgeHandler;

        FloorplanLineEdgeHandler.prototype.isVirtualBendsEnabled = function () {
            return false;
        };

        FloorplanLineEdgeHandler.prototype.isLabelHandleVisible = function () {
            return false;
        };

        FloorplanLineEdgeHandler.prototype.createBends = function () {
            return [
                this.createTerminalContinueBend(true),
                this.createTerminalContinueBend(false)
            ];
        };

        FloorplanLineEdgeHandler.prototype.createVirtualBends = function () {
            return [];
        };

        FloorplanLineEdgeHandler.prototype.createTerminalContinueBend = function (isSource) {
            var bend = this.createHandleShape(isSource ? 0 : 1);
            bend.dialect = this.graph.dialect;
            bend.init(this.graph.getView().getOverlayPane());

            var self = this;
            function startContinue(evt) {
                global.setTimeout(function () {
                    if (isSource) self.ui.continueFloorplanLineFromHead(self.state.cell);
                    else self.ui.continueFloorplanLineFromTail(self.state.cell);
                }, 0);
                mxEvent.consume(evt);
            }

            if (bend.node) {
                bend.node.style.cursor = 'crosshair';
                bend.node.style.pointerEvents = 'all';
                mxEvent.addListener(bend.node, 'mousedown', startContinue);
                mxEvent.addListener(bend.node, 'touchstart', startContinue);
            }
            if (bend.innerNode && bend.innerNode !== bend.node) {
                bend.innerNode.style.cursor = 'crosshair';
                bend.innerNode.style.pointerEvents = 'all';
                mxEvent.addListener(bend.innerNode, 'mousedown', startContinue);
                mxEvent.addListener(bend.innerNode, 'touchstart', startContinue);
            }

            return bend;
        };

        FloorplanLineEdgeHandler.prototype.redraw = function () {
            mxEdgeHandler.prototype.redraw.apply(this, arguments);
            var pts = this.state ? this.state.absolutePoints : null;
            if (!pts || pts.length < 2 || !this.bends || this.bends.length < 2) return;
            positionBend(this.bends[0], pts[0]);
            positionBend(this.bends[1], pts[pts.length - 1]);
        };

        function positionBend(bend, pt) {
            if (!bend || !pt) return;
            var w = 8, h = 8;
            if (bend.bounds) {
                w = bend.bounds.width || w;
                h = bend.bounds.height || h;
            }
            bend.bounds = new mxRectangle(Math.round(pt.x - w / 2), Math.round(pt.y - h / 2), w, h);
            bend.redraw();
        }

        var oldCreateHandler = graph.createHandler;
        graph.createHandler = function (state) {
            try {
                if (state && state.cell && state.cell.edge) {
                    var style = graph.getCellStyle(state.cell);
                    if (String(mxUtils.getValue(style, 'floorplanLine', '0')) === '1') {
                        return new FloorplanLineEdgeHandler(state);
                    }
                }
            } catch (e) { }
            return oldCreateHandler.apply(this, arguments);
        };

        graph._dftsFloorplanLineContinueHandlesInstalled = true;

        try {
            if (graph.selectionCellsHandler && graph.selectionCellsHandler.clear) graph.selectionCellsHandler.clear();
            if (graph.selectionCellsHandler && graph.selectionCellsHandler.refresh) graph.selectionCellsHandler.refresh();
        } catch (e) { }
    }

    NS.normalizeUi = normalizeUi;
    NS.normalizeGraph = normalizeGraph;
    NS.clonePoint = clonePoint;
    NS.cloneLineGeometry = cloneLineGeometry;
    NS.ensurePerimeterRegistered = ensurePerimeterRegistered;
    NS.buildFloorplanLineCell = buildFloorplanLineCell;
    NS.enableFloorplanFreeConnect = enableFloorplanFreeConnect;
    NS.installFloorplanLineTool = installFloorplanLineTool;
    NS.installFloorplanLineContinueHandles = installFloorplanLineContinueHandles;

    global.buildFloorplanLineCell = buildFloorplanLineCell;
    global.enableFloorplanFreeConnect = enableFloorplanFreeConnect;
    global.installFloorplanLineTool = installFloorplanLineTool;
    global.installFloorplanLineContinueHandles = installFloorplanLineContinueHandles;

})(this);
