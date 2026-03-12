// == Real, movable, edge-constrained pins for mxGraph / draw.io ==
/**
 * Real pins (line port with single connection point)
 * - labels stay INSIDE the chip, perpendicular to edge
 * - pins slide along the edge only
 * - chip keeps a computed minimum size to avoid label/pin overlap
 */

function getLinePinText(graph, pinCell) {
    var model = graph.getModel();
    if (!pinCell) return '';
    // 兼容：如果 pin 自己有 value 也可以读
    var v = (pinCell.value != null) ? String(pinCell.value) : '';
    if (v) return v;

    // 你的 label 子节点有 dftsIP_pin_label=1
    for (var i = 0; i < model.getChildCount(pinCell); i++) {
        var ch = model.getChildAt(pinCell, i);
        var cs = graph.getCellStyle(ch);
        if (mxUtils.getValue(cs, 'dftsIP_pin_label', '0') == '1') {
            return (ch.value != null) ? String(ch.value) : '';
        }
    }
    return '';
}

function busSuffix(width) {
    width = parseInt(width, 10) || 1;
    if (width <= 1) return '';
    return '[' + (width - 1) + ':0]';
}

function computeChipMinSize(graph, body) {
    var model = graph.getModel();
    // 统计四边引脚信息
    var wPins = [], ePins = [], nPins = [], sPins = [];
    var wMaxLen = 0, eMaxLen = 0, nMaxLen = 0, sMaxLen = 0;
    var pinLenW = 26, pinLenE = 26, pinLenN = 26, pinLenS = 26;
    var rowFont = 20;

    for (var j = 0; j < model.getChildCount(body); j++) {
        var p = model.getChildAt(body, j);
        var ps = graph.getCellStyle(p);
        if (mxUtils.getValue(ps, 'pin', '0') != '1') continue;
        var dir = mxUtils.getValue(ps, 'portDir', 'east');
        var txt = getLinePinText(graph, p);
        var fz = parseInt(mxUtils.getValue(ps, 'fontSize', 20), 10) || 20;
        rowFont = Math.max(rowFont, fz);

        if (dir === 'west') { wPins.push(p); wMaxLen = Math.max(wMaxLen, txt.length); pinLenW = Math.max(pinLenW, p.geometry.width || 26); }
        if (dir === 'east') { ePins.push(p); eMaxLen = Math.max(eMaxLen, txt.length); pinLenE = Math.max(pinLenE, p.geometry.width || 26); }
        if (dir === 'north') { nPins.push(p); nMaxLen = Math.max(nMaxLen, txt.length); pinLenN = Math.max(pinLenN, p.geometry.height || 26); }
        if (dir === 'south') { sPins.push(p); sMaxLen = Math.max(sMaxLen, txt.length); pinLenS = Math.max(pinLenS, p.geometry.height || 26); }
    }

    var rows = Math.max(wPins.length, ePins.length);
    var pitch = Math.max(24, Math.round(rowFont * 1.6));
    var minH_rows = Math.max(160, (rows + 1) * pitch);

    function labelReserve(chars, fz, pinLen) {
        if (chars <= 0) return 0;
        return pinLen + 8 + Math.round(chars * fz * 0.6) + 8;
    }
    var westRes = labelReserve(wMaxLen, rowFont, pinLenW);
    var eastRes = labelReserve(eMaxLen, rowFont, pinLenE);
    var northRes = labelReserve(nMaxLen, rowFont, pinLenN);
    var southRes = labelReserve(sMaxLen, rowFont, pinLenS);

    // 让中心“核心区”始终可见（芯片名能放下）
    var coreMinW = 160, coreMinH = 120;

    var minW = Math.max(coreMinW + westRes + eastRes, 200);
    var minH = Math.max(minH_rows, coreMinH + northRes + southRes);

    return { minW: minW, minH: minH };
}

function installResizeClamp(graph) {
    var _resizeCell = graph.resizeCell;
    var _resizeCells = graph.resizeCells;
    var _cellsResized = graph.cellsResized;

    function clampBody(graph, cell, b) {
        var style = graph.getCellStyle(cell);
        if (mxUtils.getValue(style, 'dftsIP_chipBody', '0') == '1') {
            var min = computeChipMinSize(graph, cell);
            return new mxRectangle(
                b.x, b.y,
                Math.max(b.width, min.minW),
                Math.max(b.height, min.minH)
            );
        }
        return b;
    }

    graph.resizeCell = function (cell, bounds, recurse) {
        return _resizeCell.call(this, cell, clampBody(this, cell, bounds), recurse);
    };

    graph.resizeCells = function (cells, boundsArr, recurse) {
        if (cells && boundsArr) {
            // draw.io 有时传“单个 bounds 供所有 cell 共用”
            var single = boundsArr.length === 1 && cells.length > 1;
            var newBounds = new Array(cells.length);
            for (var i = 0; i < cells.length; i++) {
                var b = single ? boundsArr[0] : boundsArr[i];
                newBounds[i] = b ? clampBody(this, cells[i], b) : b;
            }
            return _resizeCells.call(this, cells, newBounds, recurse);
        }
        return _resizeCells.call(this, cells, boundsArr, recurse);
    };

    graph.cellsResized = function (cells, bounds, recurse, constrain, extend) {
        if (cells && bounds) {
            var single = bounds.length === 1 && cells.length > 1;
            var newBounds = new Array(cells.length);
            for (var i = 0; i < cells.length; i++) {
                var b = single ? bounds[0] : bounds[i];
                newBounds[i] = b ? clampBody(this, cells[i], b) : b;
            }
            return _cellsResized.call(this, cells, newBounds, recurse, constrain, extend);
        }
        return _cellsResized.call(this, cells, bounds, recurse, constrain, extend);
    };
}

/* ========== B. 创建“短线引脚”：标签在内侧，文本与边垂直（仅北/南旋转） ========== */
function createLinePin(name, side, t, opt) {
    opt = opt || {};
    var len = opt.len || 26;      // 短线长度（水平为 width，垂直为 height）
    var thick = opt.thick || 8;   // 短线粗细（水平为 height，垂直为 width）
    var fontSize = opt.fontSize || 20;
    var spacing = opt.spacing || 8; // 标签向芯片内的额外偏移
    var pinType = opt.pinType || 'data_in'; // 引脚类型（data_in, data_out, clock_in, clock_out）
    var dir = opt.pinDirection || 'input'; // 引脚方向（input, output, inout）
    var pinKey = opt.pinKey || ''; //  用于后续 update pin name

    // —— 仅一个连接点，放在对应边的几何中点（修正 north/south） ——
    // points 语法：[x, y, perimeterFlag(0/1), dx, dy]
    var pointsStyle =
        (side === 'west') ? 'points=[[0,0.5,0,0,0]];' :
            (side === 'east') ? 'points=[[1,0.5,0,0,0]];' :
                (side === 'north') ? 'points=[[1,0.5,0,0,0]];' :
                    'points=[[0,0.5,0,0,0]];';

    // —— 线段几何（不带文字） ——
    var g = new mxGeometry();
    g.relative = true;

    if (side === 'west' || side === 'east') {
        // 水平短线：长度 = width，粗细 = height
        g.x = (side === 'west') ? 0 : 1;
        g.y = t;                 // 以“父芯片高度”为基准的相对位置
        g.width = len;           // 真实长度
        g.height = thick;        // 粗细
        g.offset = new mxPoint((side === 'west' ? -len : 0), -thick / 2);
    } else {
        // 垂直短线：粗细 = width，长度 = height
        g.x = t;                 // 以“父芯片宽度”为基准的相对位置
        g.y = (side === 'north') ? 0 : 1;
        g.width = thick;        // 粗细
        g.height = len;          // 真实长度
        g.offset = new mxPoint(-thick / 2, (side === 'north' ? -len : 0));
    }

    // 垂直线段需要显式 direction=north 才渲染为竖线
    var lineDir = (side === 'north' || side === 'south') ? 'direction=north;' : '';

    var lineStyle = [
        'shape=line', 'strokeWidth=1', 'fillColor=none',
        'html=1',
        'noLabel=1',           // ★ 线段自身不渲染文字
        'resizable=0', 'rotatable=0',
        'dftsIP_pin=1',
        'dftsIP_pinType=' + pinType,
        'dftsIP_pin_direction=' + dir,
        'dftsIP_pin_location=' + side,
        'dftsIP_pinKey=' + pinKey,
        lineDir,
        'outlineConnect=0',
        'perimeter=none',
        'connectable=1',
        pointsStyle
    ].join(';');

    var pin = new mxCell('', g, lineStyle); // ★ 线段 value 置空
    pin.vertex = true;
    pin.connectable = true;

    // —— 独立标签（作为 pin 的子节点，只旋转文字，不影响线段） ——
    var labelGeo = new mxGeometry();
    labelGeo.relative = true;

    // 注意：子节点的 x/y 是以“父 pin 的矩形”做 0..1 归一化
    if (side === 'west') {
        labelGeo.x = 1;      // 父矩形内侧边
        labelGeo.y = 0.5;    // 居中
        labelGeo.offset = new mxPoint(spacing, 0);
    } else if (side === 'east') {
        labelGeo.x = 0;
        labelGeo.y = 0.5;
        labelGeo.offset = new mxPoint(-spacing, 0);
    } else if (side === 'north') {
        labelGeo.x = 0.5;
        labelGeo.y = 1;      // y=1 为内侧边
        labelGeo.offset = new mxPoint(0, spacing);
    } else { // south
        labelGeo.x = 0.5;
        labelGeo.y = 0;
        labelGeo.offset = new mxPoint(0, -spacing);
    }
    labelGeo.width = 0;
    labelGeo.height = 0;

    var isVertical = (side === 'north' || side === 'south');
    // var labelAlign =
    //     (side === 'west')  ? 'align=left;verticalAlign=middle;'
    //   : (side === 'east')  ? 'align=right;verticalAlign=middle;'
    //   : (side === 'south') ?  'align=right;verticalAlign=middle;'
    //   : (side === 'north') ?  'align=left;verticalAlign=middle;';
    const alignMap = {
        west: 'align=left;verticalAlign=middle;',
        east: 'align=right;verticalAlign=middle;',
        north: 'align=left;verticalAlign=middle;',
        south: 'align=right;verticalAlign=middle;'
    };

    const labelAlign = alignMap[side]

    var labelStyle = [
        'shape=label',
        'dftsIP_pin_label=1',
        'whiteSpace=wrap',
        'html=1',
        'connectable=0',
        'pointerEvents=0',
        'resizable=0',
        'rotatable=0',                 // 不旋转形状，只旋转文字
        'fontSize=' + fontSize,
        labelAlign,
        (isVertical ? 'rotation=90' : 'rotation=0') // ★ 仅 north/south 竖排
        // 如更偏好 textRotation：用 'textRotation=90' 替换上行也可
    ].join(';');

    var labelCell = new mxCell(name, labelGeo, labelStyle);
    labelCell.vertex = true;
    labelCell.connectable = false;

    // 让标签跟随 pin：当 pin 被移动/约束时，标签一起走
    pin.insert(labelCell);

    return pin;
}

/* ========== C. 引脚仅沿所属边滑动 ========== */
function installPinGuards(graph) {

    var _isCellResizable = graph.isCellResizable;
    graph.isCellResizable = function (cell) {
        var s = this.getCellStyle(cell);
        if (mxUtils.getValue(s, 'pin', '0') == '1') return false;
        return _isCellResizable.apply(this, arguments);
    };

    graph.addListener(mxEvent.CELLS_MOVED, function (sender, evt) {
        var cells = evt.getProperty('cells');
        var model = graph.getModel();

        model.beginUpdate();
        try {
            for (var i = 0; i < cells.length; i++) {
                var c = cells[i];
                if (!model.isVertex(c)) continue;

                var s = graph.getCellStyle(c);
                if (mxUtils.getValue(s, 'pin', '0') != '1') continue;

                var parent = model.getParent(c);
                if (!parent) continue;

                var pb = graph.getCellBounds(parent);
                var cb = graph.getCellBounds(c);
                var geo = c.geometry.clone();
                var dir = mxUtils.getValue(s, 'portDir', 'east');

                var relX = (cb.getCenterX() - pb.x) / pb.width;
                var relY = (cb.getCenterY() - pb.y) / pb.height;

                var m = 0.05; // 角落缓冲

                if (dir === 'east' || dir === 'west') {
                    var t = Math.max(m, Math.min(1 - m, relY));
                    geo.y = t;
                    geo.x = (dir === 'west') ? 0 : 1;
                    geo.offset = new mxPoint((dir === 'west' ? -geo.width : 0), -geo.height / 2);
                } else {
                    var t = Math.max(m, Math.min(1 - m, relX));
                    geo.x = t;
                    geo.y = (dir === 'north') ? 0 : 1;
                    geo.offset = new mxPoint(-geo.width / 2, (dir === 'north' ? -geo.height : 0));
                }
                model.setGeometry(c, geo);
            }
        } finally {
            model.endUpdate();
        }
    });
}

/* ========== D. 芯片最小尺寸保护（避免标签/引脚重叠） ========== */
function installChipMinSizeGuards(graph) {
    graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
        var cells = evt.getProperty('cells');
        var model = graph.getModel();

        model.beginUpdate();
        try {
            for (var i = 0; i < cells.length; i++) {
                var body = cells[i];
                if (!model.isVertex(body)) continue;
                var style = graph.getCellStyle(body);
                if (mxUtils.getValue(style, 'dftsIP_chipBody', '0') != '1') continue;

                // 统计四边引脚数量、最长标签长度、字体大小、短线长度
                var wPins = [], ePins = [], nPins = [], sPins = [];
                var wMaxLen = 0, eMaxLen = 0, nMaxLen = 0, sMaxLen = 0;
                var pinLenW = 26, pinLenE = 26, pinLenN = 26, pinLenS = 26;
                var rowFont = 20;

                for (var j = 0; j < model.getChildCount(body); j++) {
                    var p = model.getChildAt(body, j);
                    var ps = graph.getCellStyle(p);
                    if (mxUtils.getValue(ps, 'pin', '0') != '1') continue;

                    var dir = mxUtils.getValue(ps, 'portDir', 'east');
                    var txt = getLinePinText(graph, p);
                    var fz = parseInt(mxUtils.getValue(ps, 'fontSize', 20), 10) || 20;
                    rowFont = Math.max(rowFont, fz);

                    if (dir === 'west') { wPins.push(p); wMaxLen = Math.max(wMaxLen, txt.length); pinLenW = Math.max(pinLenW, p.geometry.width || 26); }
                    if (dir === 'east') { ePins.push(p); eMaxLen = Math.max(eMaxLen, txt.length); pinLenE = Math.max(pinLenE, p.geometry.width || 26); }
                    if (dir === 'north') { nPins.push(p); nMaxLen = Math.max(nMaxLen, txt.length); pinLenN = Math.max(pinLenN, p.geometry.height || 26); }
                    if (dir === 'south') { sPins.push(p); sMaxLen = Math.max(sMaxLen, txt.length); pinLenS = Math.max(pinLenS, p.geometry.height || 26); }
                }

                var rows = Math.max(wPins.length, ePins.length);
                var pitch = Math.max(24, Math.round(rowFont * 1.6));   // 行距
                var minH = Math.max(160, (rows + 1) * pitch);          // 高度下限

                // 估算：一个字符≈0.6 * fontSize 宽
                function labelReserve(chars, fz, pinLen) {
                    if (chars <= 0) return 0;
                    return pinLen + 8 + Math.round(chars * fz * 0.6) + 8;
                }
                var westRes = labelReserve(wMaxLen, rowFont, pinLenW);
                var eastRes = labelReserve(eMaxLen, rowFont, pinLenE);
                var northRes = labelReserve(nMaxLen, rowFont, pinLenN);
                var southRes = labelReserve(sMaxLen, rowFont, pinLenS);

                var coreMinW = 160; // 中央工作区最小宽度
                var minW = Math.max(coreMinW + westRes + eastRes, 200);
                var minH2 = Math.max(minH, 140 + northRes + southRes);

                // 应用最小尺寸（保持左上角不变）
                var geo = body.geometry.clone();
                var need = false;
                if (geo.width < minW) { geo.width = minW; need = true; }
                if (geo.height < minH2) { geo.height = minH2; need = true; }
                if (need) model.setGeometry(body, geo);
            }
        } finally {
            model.endUpdate();
        }
    });
}

/* ========== E. 等距放置引脚 ========== */
function placeLinePins(graph, body, side, items, opt) {
    if (!items || !items.length) return;

    for (var i = 0; i < items.length; i++) {
        var t = (i + 1) / (items.length + 1);

        var it = items[i];
        var pinName = (typeof it === 'string') ? it : it.name;
        var pinType = (typeof it === 'string') ? (opt && opt.pinType) : (it.type || (opt && opt.pinType));
        // pinDirection 支持 input / output / inout
        var pinDirection = (typeof it === 'string')
            ? (opt && opt.pinDirection)                 // 字符串 pin 用 opt 默认
            : (it.dir || it.direction || (opt && opt.pinDirection) || 'input');

        var pin = createLinePin(pinName, side, t, Object.assign({}, opt, { pinType, pinDirection }));
        graph.addCell(pin, body);
    }
}

// =====================================
// 通用工厂：创建芯片外壳并按边放置引脚
// =====================================
function buildChip(graph, {
    label,               // 顶部文字（如 'EDT'）
    dfts,                // dfts_type（如 'edt'）
    w = 260, h = 180,    // 外壳尺寸
    rounded = 0,         // 圆角
    strokeWidth = 1,     // 外壳线宽
    bodyFont = 16,       // 外壳“label”字号
    pinFont = 16,        // 引脚默认字号
    pins = { west: [], east: [], north: [], south: [] },   // 各边引脚
    pinFontBySide = {},   // 单边覆盖字号：{west: 28, east: 16, ...}
    instanceName = '',    // 可选：实例名
    createInstance = true,// 默认画布创建带实例，模板可关

    labelRotation = 0,                 // 0/90/-90
    labelAlign = 'center',             // left/center/right
    labelVAlign = 'top',               // top/middle/bottom
    labelSpacing = { left: 0, top: 0, right: 0, bottom: 0 },
} = {}) {
    var bodyGeo = new mxGeometry(0, 0, w, h);
    var bodyStyle = [
        'dftsIP_chipBody=1',
        'shape=rectangle',
        'html=1',
        'whiteSpace=wrap',
        'connectable=0',
        'rounded=' + rounded,
        'strokeWidth=' + strokeWidth,
        'fontSize=' + bodyFont + ';' +          // ★ 主体“label”字号
        'rotation=' + labelRotation + ';' +     // ★ 主体“label”旋转
        'verticalAlign=' + (labelVAlign === 'middle' ? 'middle' : labelVAlign), // 你也可以直接传 middle
        'spacingLeft=' + (labelSpacing.left ?? 0),
        'spacingTop=' + (labelSpacing.top ?? 0),
        'spacingRight=' + (labelSpacing.right ?? 0),
        'spacingBottom=' + (labelSpacing.bottom ?? 0),
        'dftsIP_type=' + dfts + ';'             // ★ 直接写入 dfts_type
    ].join(';') + ';';

    var body = new mxCell(label, bodyGeo, bodyStyle);
    body.vertex = true; body.connectable = false;

    if (pins.west && pins.west.length) placeLinePins(graph, body, 'west', pins.west, { fontSize: pinFontBySide.west ?? pinFont });
    if (pins.east && pins.east.length) placeLinePins(graph, body, 'east', pins.east, { fontSize: pinFontBySide.east ?? pinFont });
    if (pins.north && pins.north.length) placeLinePins(graph, body, 'north', pins.north, { fontSize: pinFontBySide.north ?? pinFont });
    if (pins.south && pins.south.length) placeLinePins(graph, body, 'south', pins.south, { fontSize: pinFontBySide.south ?? pinFont });

    if (createInstance) {
        var ipName = (label != null) ? String(label) : '';
        var instName = (instanceName != null && instanceName !== '') ? instanceName : getNextInstanceName(graph, ipName);
        createInstanceLabelCell(graph, body, instName);
    }
    return body;
}

// =======================
// 具体模块
// =======================
function buildSSNHostInterface(graph, opt) {
    opt = opt || {};
    var busWidth = opt.busWidth ?? 4;

    return buildChip(graph, Object.assign({
        label: 'SSN_HOST',     // 你也可以传 opt.label 覆盖外壳标题
        dfts: 'ssn_host_interface',
        w: 460, h: 140,
        bodyFont: 20, pinFont: 16,

        pins: {
            west: [
                { name: 'ssn_bus_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                { name: 'ssn_bus_data_in' + busSuffix(busWidth), type: 'data_in', dir: 'ouput', pinKey: 'data_in', busWidth: busWidth },
                { name: 'ssn_bus_data_out' + busSuffix(busWidth), type: 'data_out', dir: 'input', pinKey: 'data_out', busWidth: busWidth }
            ]
        }
    }, opt));
}

function buildSSNSlaveInterface(graph, opt) {
    opt = opt || {};
    if (!opt.pin_label) { //如果没传 pin_label，就自动分配 U0/U1/U2...
        buildSSNSlaveInterface._autoIdx ??= 0;
        opt.pin_label = 'U' + (buildSSNSlaveInterface._autoIdx++);
    }
    var pin_label = opt.pin_label;
    var busWidth = opt.busWidth ?? 4;

    return buildChip(graph, Object.assign({
        label: 'SSN_SLAVE',     // 外壳标题想跟 label 也行：label: label + '_SSN_SLAVE'
        dfts: 'ssn_slave_interface',
        w: 520, h: 140,
        bodyFont: 20, pinFont: 16,

        pins: {
            west: [
                { name: pin_label + '_ssn_to_bus_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                { name: pin_label + '_ssn_to_bus_data_in' + busSuffix(busWidth), type: 'data_in', dir: 'input', pinKey: 'data_in', busWidth: busWidth },
                { name: pin_label + '_ssn_from_bus_data_out' + busSuffix(busWidth), type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: busWidth }
            ]
        }
    }, opt));
}

function renderName(tpl, params) {
    params = params || {};
    return String(tpl)
        .replace(/\$\{label\}/g, params.label ?? '')
        .replace(/\$\{pdg\}/g, params.pdg ?? '');
}

function buildBSCANHostInterface(graph, opt) {
    opt = opt || {};
    return buildChip(graph, Object.assign({
        label: 'BSCAN_HOST',
        dfts: 'bscan_host_interface',
        w: 520, h: 220,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: 'bscan_select', type: 'data_in', dir: 'input', pinKey: 'select' },
                { name: 'bscan_force_disable', type: 'data_in', dir: 'input', pinKey: 'force_disable' },
                { name: 'bscan_select_jtag_input', type: 'data_in', dir: 'input', pinKey: 'select_jtag_input' },
                { name: 'bscan_select_jtag_output', type: 'data_in', dir: 'input', pinKey: 'select_jtag_output' },
                { name: 'bscan_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                { name: 'bscan_capture_en', type: 'data_in', dir: 'input', pinKey: 'capture_en' },
                { name: 'bscan_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                { name: 'bscan_update_en', type: 'data_in', dir: 'input', pinKey: 'update_en' },
                { name: 'bscan_scan_in', type: 'data_in', dir: 'input', pinKey: 'scan_in' },
                { name: 'bscan_scan_out', type: 'data_out', dir: 'output', pinKey: 'scan_out' }
            ]
        }
    }, opt));
}

function buildBSCANSlaveInterface(graph, opt) {
    opt = opt || {};
    var label = opt.label || 'U0';

    return buildChip(graph, Object.assign({
        label: 'BSCAN_SLAVE',
        dfts: 'bscan_slave_interface',
        w: 600, h: 220,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: label + '_bscan_to_force_disable', type: 'data_in', dir: 'input', pinKey: 'force_disable' },
                { name: label + '_bscan_to_select_jtag_input', type: 'data_in', dir: 'input', pinKey: 'select_jtag_input' },
                { name: label + '_bscan_to_select_jtag_output', type: 'data_in', dir: 'input', pinKey: 'select_jtag_output' },
                { name: label + '_bscan_to_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                { name: label + '_bscan_to_capture_en', type: 'data_in', dir: 'input', pinKey: 'capture_en' },
                { name: label + '_bscan_to_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                { name: label + '_bscan_to_update_en', type: 'data_in', dir: 'input', pinKey: 'update_en' },
                { name: label + '_bscan_to_scan_in', type: 'data_in', dir: 'input', pinKey: 'scan_in' },
                { name: label + '_bscan_from_scan_out', type: 'data_out', dir: 'output', pinKey: 'scan_out' }
            ]
        }
    }, opt));
}

function buildIJTAGHostInterface(graph, opt) {
    opt = opt || {};
    return buildChip(graph, Object.assign({
        label: 'IJTAG_HOST',
        dfts: 'ijtag_host_interface',
        w: 520, h: 200,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: 'ijtag_tck', type: 'clock_in', dir: 'input', pinKey: 'tck' },
                { name: 'ijtag_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                { name: 'ijtag_ce', type: 'data_in', dir: 'input', pinKey: 'ce' },
                { name: 'ijtag_se', type: 'data_in', dir: 'input', pinKey: 'se' },
                { name: 'ijtag_ue', type: 'data_in', dir: 'input', pinKey: 'ue' },
                { name: 'ijtag_sel', type: 'data_in', dir: 'input', pinKey: 'sel' },
                { name: 'ijtag_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                { name: 'ijtag_so', type: 'data_out', dir: 'output', pinKey: 'so' }
            ]
        }
    }, opt));
}

function buildIJTAGSlaveInterface(graph, opt) {
    opt = opt || {};
    var label = opt.label || 'U0';

    return buildChip(graph, Object.assign({
        label: 'IJTAG_SLAVE',
        dfts: 'ijtag_slave_interface',
        w: 600, h: 200,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: label + '_ijtag_to_tck', type: 'clock_in', dir: 'input', pinKey: 'tck' },
                { name: label + '_ijtag_to_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                { name: label + '_ijtag_to_ce', type: 'data_in', dir: 'input', pinKey: 'ce' },
                { name: label + '_ijtag_to_se', type: 'data_in', dir: 'input', pinKey: 'se' },
                { name: label + '_ijtag_to_ue', type: 'data_in', dir: 'input', pinKey: 'ue' },
                { name: label + '_ijtag_to_sel', type: 'data_in', dir: 'input', pinKey: 'sel' },
                { name: label + '_ijtag_to_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                { name: label + '_ijtag_from_so', type: 'data_out', dir: 'output', pinKey: 'so' }
            ]
        }
    }, opt));
}


function buildBISRHostInterface(graph, opt) {
    opt = opt || {};
    var pdg = opt.pdg || 'PDG0';

    return buildChip(graph, Object.assign({
        label: 'BISR_HOST',
        dfts: 'bisr_host_interface',
        w: 620, h: 220,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: pdg + '_bisr_mem_chain_select', type: 'data_in', dir: 'input', pinKey: 'mem_chain_select' },
                { name: pdg + '_bisr_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                { name: pdg + '_bisr_clk', type: 'clock_in', dir: 'input', pinKey: 'clk' },
                { name: pdg + '_bisr_mem_disable', type: 'data_in', dir: 'input', pinKey: 'mem_disable' },
                { name: pdg + '_bisr_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                { name: pdg + '_bisr_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                { name: pdg + '_bisr_so', type: 'data_out', dir: 'output', pinKey: 'so' }
            ]
        }
    }, opt));
}


function buildBISRSlaveInterface(graph, opt) {
    opt = opt || {};
    var pdg = opt.pdg || 'PDG0';
    var label = opt.label || 'U0';

    var prefix = pdg + '_' + label;

    return buildChip(graph, Object.assign({
        label: 'BISR_SLAVE',
        dfts: 'bisr_slave_interface',
        w: 680, h: 220,
        bodyFont: 20, pinFont: 16,
        pins: {
            west: [
                { name: prefix + '_bisr_to_mem_chain_select', type: 'data_in', dir: 'input', pinKey: 'mem_chain_select' },
                { name: prefix + '_bisr_to_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                { name: prefix + '_bisr_to_clk', type: 'clock_in', dir: 'input', pinKey: 'clk' },
                { name: prefix + '_bisr_to_mem_disable', type: 'data_in', dir: 'input', pinKey: 'mem_disable' },
                { name: prefix + '_bisr_to_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                { name: prefix + '_bisr_to_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                { name: prefix + '_bisr_so', type: 'data_out', dir: 'output', pinKey: 'so' }
            ]
        }
    }, opt));
}

function buildMBISRHost(graph, opt) {
    opt = opt || {};
    var busWidth = opt.busWidth ?? 4;

    return buildChip(graph, Object.assign({
        label: 'MBISR\nCONTROLLER',     // 你也可以传 opt.label 覆盖外壳标题
        dfts: 'mbist_controller',
        w: 520, h: 100,
        bodyFont: 20, pinFont: 16,

        pins: {
            west: [
                { name: 'mbisr_bus_data_in' + busSuffix(busWidth), type: 'data_in', dir: 'input', pinKey: 'data_in', busWidth: busWidth },
                { name: 'mbisr_bus_data_out' + busSuffix(busWidth), type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: busWidth }
            ],
            east: [
                { name: 'mbisr_bus_data_in' + busSuffix(busWidth), type: 'data_in', dir: 'input', pinKey: 'data_in', busWidth: busWidth },
                { name: 'mbisr_bus_data_out' + busSuffix(busWidth), type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: busWidth }
            ]
        }
    }, opt));
}

function updateParamInterface(graph, body, params) {
    params = params || {};
    var model = graph.getModel();
    var style = graph.getCellStyle(body);
    var dfts = mxUtils.getValue(style, 'dftsIP_type', '');

    function setPinLabel(pin, newText) {
        for (var k = 0; k < model.getChildCount(pin); k++) {
            var ch = model.getChildAt(pin, k);
            var cs = graph.getCellStyle(ch);
            if (mxUtils.getValue(cs, 'dftsIP_pin_label', '0') == '1') {
                model.setValue(ch, newText);
                return;
            }
        }
        model.setValue(pin, newText);
    }

    function sufBus() { // 给 SSN 用
        var w = parseInt(params.busWidth, 10) || 1;
        return (w > 1) ? '[' + (w - 1) + ':0]' : '';
    }

    function makeName(pinKey) {
        var label = params.label || 'U0';
        var pdg = params.pdg || 'PDG0';

        // ===== SSN（如果你也想放进来） =====
        if (dfts === 'ssn_host_interface') {
            if (pinKey === 'clock') return 'ssn_bus_clock';
            if (pinKey === 'data_in') return 'ssn_bus_data_in' + sufBus();
            if (pinKey === 'data_out') return 'ssn_bus_data_out' + sufBus();
        }
        if (dfts === 'ssn_slave_interface') {
            if (pinKey === 'clock') return label + '_ssn_to_bus_clock';
            if (pinKey === 'data_in') return label + '_ssn_to_bus_data_in' + sufBus();
            if (pinKey === 'data_out') return label + '_ssn_from_bus_data_out' + sufBus();
        }

        // ===== BSCAN =====
        if (dfts === 'bscan_host_interface') {
            if (pinKey === 'select') return 'bscan_select';
            if (pinKey === 'force_disable') return 'bscan_force_disable';
            if (pinKey === 'select_jtag_input') return 'bscan_select_jtag_input';
            if (pinKey === 'select_jtag_output') return 'bscan_select_jtag_output';
            if (pinKey === 'clock') return 'bscan_clock';
            if (pinKey === 'capture_en') return 'bscan_capture_en';
            if (pinKey === 'shift_en') return 'bscan_shift_en';
            if (pinKey === 'update_en') return 'bscan_update_en';
            if (pinKey === 'scan_in') return 'bscan_scan_in';
            if (pinKey === 'scan_out') return 'bscan_scan_out';
        }
        if (dfts === 'bscan_slave_interface') {
            if (pinKey === 'force_disable') return label + '_bscan_to_force_disable';
            if (pinKey === 'select_jtag_input') return label + '_bscan_to_select_jtag_input';
            if (pinKey === 'select_jtag_output') return label + '_bscan_to_select_jtag_output';
            if (pinKey === 'clock') return label + '_bscan_to_clock';
            if (pinKey === 'capture_en') return label + '_bscan_to_capture_en';
            if (pinKey === 'shift_en') return label + '_bscan_to_shift_en';
            if (pinKey === 'update_en') return label + '_bscan_to_update_en';
            if (pinKey === 'scan_in') return label + '_bscan_to_scan_in';
            if (pinKey === 'scan_out') return label + '_bscan_from_scan_out';
        }

        // ===== IJTAG =====
        if (dfts === 'ijtag_host_interface') {
            if (pinKey === 'tck') return 'ijtag_tck';
            if (pinKey === 'reset') return 'ijtag_reset';
            if (pinKey === 'ce') return 'ijtag_ce';
            if (pinKey === 'se') return 'ijtag_se';
            if (pinKey === 'ue') return 'ijtag_ue';
            if (pinKey === 'sel') return 'ijtag_sel';
            if (pinKey === 'si') return 'ijtag_si';
            if (pinKey === 'so') return 'ijtag_so';
        }
        if (dfts === 'ijtag_slave_interface') {
            if (pinKey === 'tck') return label + '_ijtag_to_tck';
            if (pinKey === 'reset') return label + '_ijtag_to_reset';
            if (pinKey === 'ce') return label + '_ijtag_to_ce';
            if (pinKey === 'se') return label + '_ijtag_to_se';
            if (pinKey === 'ue') return label + '_ijtag_to_ue';
            if (pinKey === 'sel') return label + '_ijtag_to_sel';
            if (pinKey === 'si') return label + '_ijtag_to_si';
            if (pinKey === 'so') return label + '_ijtag_from_so';
        }

        // ===== BISR =====
        if (dfts === 'bisr_host_interface') {
            if (pinKey === 'mem_chain_select') return pdg + '_bisr_mem_chain_select';
            if (pinKey === 'shift_en') return pdg + '_bisr_shift_en';
            if (pinKey === 'clk') return pdg + '_bisr_clk';
            if (pinKey === 'mem_disable') return pdg + '_bisr_mem_disable';
            if (pinKey === 'reset') return pdg + '_bisr_reset';
            if (pinKey === 'si') return pdg + '_bisr_si';
            if (pinKey === 'so') return pdg + '_bisr_so';
        }
        if (dfts === 'bisr_slave_interface') {
            var pre = pdg + '_' + label;
            if (pinKey === 'mem_chain_select') return pre + '_bisr_to_mem_chain_select';
            if (pinKey === 'shift_en') return pre + '_bisr_to_shift_en';
            if (pinKey === 'clk') return pre + '_bisr_to_clk';
            if (pinKey === 'mem_disable') return pre + '_bisr_to_mem_disable';
            if (pinKey === 'reset') return pre + '_bisr_to_reset';
            if (pinKey === 'si') return pre + '_bisr_to_si';
            if (pinKey === 'so') return pre + '_bisr_so';
        }

        return null;
    }

    model.beginUpdate();
    try {
        for (var i = 0; i < model.getChildCount(body); i++) {
            var p = model.getChildAt(body, i);
            var ps = graph.getCellStyle(p);
            if (mxUtils.getValue(ps, 'dftsIP_pin', '0') != '1') continue;

            var pinKey = mxUtils.getValue(ps, 'dftsIP_pinKey', '');
            if (!pinKey) continue;

            var newText = makeName(pinKey);
            if (newText != null) setPinLabel(p, newText);
        }

        // 触发重算尺寸（可选）
        var g = body.geometry.clone();
        model.setGeometry(body, g);
    } finally {
        model.endUpdate();
    }
}


