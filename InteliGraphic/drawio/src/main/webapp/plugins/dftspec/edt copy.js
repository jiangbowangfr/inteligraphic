Sidebar.prototype.init = function () {
    var a = STENCIL_PATH;
    this.addSearchPalette(!0);
    this.addGeneralPalette(!0);
    this.addMiscPalette(!1);
    this.addAdvancedPalette(!1);
    this.addBasicPalette(a);
    addtesttest();
    this.setCurrentSearchEntryLibrary("arrows");
    this.addStencilPalette(
        "arrows",
        mxResources.get("arrows"),
        a + "/arrows.xml",
        ";whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2",
    );
    this.setCurrentSearchEntryLibrary();
    this.addUmlPalette(!1);
    this.addBpmnPalette(a, !1);
    this.setCurrentSearchEntryLibrary("flowchart");
    this.addStencilPalette(
        "flowchart",
        "Flowchart",
        a + "/flowchart.xml",
        ";whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2",
    );
    this.setCurrentSearchEntryLibrary();
    this.setCurrentSearchEntryLibrary("clipart");
    this.addImagePalette(
        "clipart",
        mxResources.get("clipart"),
        a + "/clipart/",
        "_128x128.png",
        "Earth_globe Empty_Folder Full_Folder Gear Lock Software Virus Email Database Router_Icon iPad iMac Laptop MacBook Monitor_Tower Printer Server_Tower Workstation Firewall_02 Wireless_Router_N Credit_Card Piggy_Bank Graph Safe Shopping_Cart Suit1 Suit2 Suit3 Pilot1 Worker1 Soldier1 Doctor1 Tech1 Security1 Telesales1".split(
            " ",
        ),
        null,
        {
            Wireless_Router_N: "wireless router switch wap wifi access point wlan",
            Router_Icon: "router switch",
        },
    );
    this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.enableTooltips = !0;
Sidebar.prototype.tooltipBorder = 16;
Sidebar.prototype.tooltipDelay = 300;
Sidebar.prototype.dropTargetDelay = 200;
Sidebar.prototype.gearImage = STENCIL_PATH + "/clipart/Gear_128x128.png";
Sidebar.prototype.thumbWidth = 38;
Sidebar.prototype.thumbHeight = 38;
Sidebar.prototype.minThumbStrokeWidth = 1;
Sidebar.prototype.thumbAntiAlias = !1;
Sidebar.prototype.thumbBorder = 2;
Sidebar.prototype.livePreview = !0;
Sidebar.prototype.searchClosedLibraries = !0;
Sidebar.prototype.closedLibraryOpacity = null;
"large" != urlParams["sidebar-entries"] &&
    ((Sidebar.prototype.thumbBorder = 1),
        (Sidebar.prototype.thumbWidth = 32),
        (Sidebar.prototype.thumbHeight = 30),
        (Sidebar.prototype.minThumbStrokeWidth = 1.3),
        (Sidebar.prototype.thumbAntiAlias = !0));
Sidebar.prototype.sidebarTitleSize = 8;
Sidebar.prototype.sidebarTitles = !1;
Sidebar.prototype.tooltipTitles = !0;
Sidebar.prototype.maxTooltipWidth = 400;
Sidebar.prototype.maxTooltipHeight = 400;
Sidebar.prototype.addStencilsToIndex = !0;
Sidebar.prototype.defaultImageWidth = 80;
Sidebar.prototype.defaultImageHeight = 80;
Sidebar.prototype.tooltipMouseDown = null;
Sidebar.prototype.expandLibraries = !0;
Sidebar.prototype.refresh = function () {
    this.graph.stylesheet.styles = mxUtils.clone(
        this.editorUi.editor.graph.getStylesheet().styles,
    );
    var a = this.wrapper.scrollTop;
    this.wrapper.innerText = "";
    var b = this.palettes;
    this.palettes = {};
    var f = this.addPalette;
    this.addPalette = function (e, g, d, h) {
        d = this.wasPaletteExpanded(b, e, d);
        return f.apply(this, arguments);
    };
    this.init(b);
    this.addPalette = f;
    window.setTimeout(
        mxUtils.bind(this, function () {
            this.wrapper.scrollTop = a;
        }),
        0,
    );
};
Sidebar.prototype.wasPaletteExpanded = function (a, b, f) {
    a = null != a && null != b ? a[b] : null;
    null != a &&
        2 == a.length &&
        null != a[1].firstChild &&
        (f = "none" != a[1].firstChild.style.display);
    return f;
};
Sidebar.prototype.getEntryContainer = function () {
    return this.wrapper;
};
Sidebar.prototype.appendChild = function (a) {
    this.wrapper.appendChild(a);
};
Sidebar.prototype.getTooltipOffset = function (a, b) {
    if (mxUtils.isAncestorNode(this.container, a))
        return (
            (b = b.height + 2 * this.tooltipBorder),
            new mxPoint(
                this.container.offsetWidth + 2 + this.editorUi.container.offsetLeft,
                Math.min(
                    Math.max(
                        document.body.clientHeight || 0,
                        document.documentElement.clientHeight,
                    ) -
                    b -
                    20,
                    Math.max(
                        0,
                        this.editorUi.container.offsetTop +
                        this.container.offsetTop +
                        a.offsetTop -
                        this.wrapper.scrollTop -
                        b / 2 +
                        16,
                    ),
                ),
            )
        );
    a = a.getBoundingClientRect();
    return new mxPoint(
        a.x + a.width + this.tooltipBorder,
        a.y + a.height / 2 - b.height / 2 - 6,
    );
};
Sidebar.prototype.createMoreShapes = function () {
    var a = this.editorUi.createDiv("geSidebarFooter"),
        b = document.createElement("button");
    b.className = "geBtn gePrimaryBtn";
    this.editorUi.dependsOnLanguage(
        mxUtils.bind(this, function () {
            b.innerHTML = "<span>+</span>";
            mxUtils.write(b, mxResources.get("moreShapes"));
            b.setAttribute("title", mxResources.get("moreShapes"));
        }),
    );
    mxEvent.addListener(
        b,
        "click",
        mxUtils.bind(this, function (f) {
            this.editorUi.actions.get("shapes").funct();
            mxEvent.consume(f);
        }),
    );
    mxEvent.preventDefault(b);
    a.appendChild(b);
    return a;
};
Sidebar.prototype.createTooltip = function (a, b, f, e, g, d, h, m, p, k, u) {
    u = null != u ? u : !0;
    this.tooltipMouseDown = p;
    p = this.editorUi.editor.graph;
    if (null == this.tooltip) {
        this.tooltip = document.createElement("div");
        this.tooltip.className = "geSidebarTooltip";
        this.tooltip.style.userSelect = "none";
        this.tooltip.style.zIndex = mxPopupMenu.prototype.zIndex - 1;
        document.body.appendChild(this.tooltip);
        mxEvent.addMouseWheelListener(
            mxUtils.bind(this, function (y) {
                this.hideTooltip();
            }),
            this.tooltip,
        );
        this.graph2 = new Graph(
            this.tooltip,
            null,
            null,
            this.editorUi.editor.graph.getStylesheet(),
        );
        this.graph2.shapeBackgroundColor = this.graph.shapeBackgroundColor;
        this.graph2.resetViewOnRootChange = !1;
        this.graph2.foldingEnabled = !1;
        this.graph2.gridEnabled = !1;
        this.graph2.autoScroll = !1;
        this.graph2.setTooltips(!1);
        this.graph2.setConnectable(!1);
        this.graph2.setPanning(!1);
        this.graph2.setEnabled(!1);
        if (this.graph2.dialect == mxConstants.DIALECT_SVG) {
            var w = this.graph2.view.getDrawPane().ownerSVGElement;
            null != w && (w.style.overflow = "visible");
        } else this.graph2.view.canvas.style.overflow = "visible";
        this.graph2.openLink = mxUtils.bind(this, function () {
            this.hideTooltip();
        });
        mxEvent.addGestureListeners(
            this.tooltip,
            mxUtils.bind(this, function (y) {
                null != this.tooltipMouseDown && this.tooltipMouseDown(y);
                window.setTimeout(
                    mxUtils.bind(this, function () {
                        (null != this.tooltipCloseImage &&
                            "none" != this.tooltipCloseImage.style.display) ||
                            this.hideTooltip();
                    }),
                    0,
                );
            }),
            null,
            mxUtils.bind(this, function (y) {
                this.hideTooltip();
            }),
        );
        w = document.createElement("img");
        w.setAttribute("src", Editor.crossImage);
        w.setAttribute("title", mxResources.get("close"));
        w.className = "geButton";
        this.tooltip.appendChild(w);
        this.tooltipCloseImage = w;
        mxEvent.addListener(
            w,
            "click",
            mxUtils.bind(this, function (y) {
                this.hideTooltip();
                mxEvent.consume(y);
            }),
        );
    }
    this.tooltipCloseImage.style.display = k ? "" : "none";
    this.graph2.model.clear();
    this.graph2.view.setTranslate(this.tooltipBorder, this.tooltipBorder);
    this.graph2.view.scale =
        !m && (f > this.maxTooltipWidth || e > this.maxTooltipHeight)
            ? Math.round(
                100 * Math.min(this.maxTooltipWidth / f, this.maxTooltipHeight / e),
            ) / 100
            : 1;
    this.tooltip.style.display = "block";
    this.graph2.labelsVisible = null == d || d;
    d = mxClient.NO_FO;
    mxClient.NO_FO = Editor.prototype.originalNoForeignObject;
    null != b &&
        ((b = this.graph2.cloneCells(b)),
            this.graph2.pasteCellStyles(
                p.includeDescendants(b),
                u ? p.currentVertexStyle : p.defaultVertexStyle,
                u ? p.currentEdgeStyle : p.defaultEdgeStyle,
                null,
                p.pasteEdgeStyle,
            ),
            this.graph2.addCells(b));
    mxClient.NO_FO = d;
    u = this.graph2.getGraphBounds();
    m && 0 < f && 0 < e && (u.width > f || u.height > e)
        ? ((f = Math.round(100 * Math.min(f / u.width, e / u.height)) / 100),
            mxClient.NO_FO
                ? (this.graph2.view.setScale(
                    Math.round(
                        100 *
                        Math.min(
                            this.maxTooltipWidth / u.width,
                            this.maxTooltipHeight / u.height,
                        ),
                    ) / 100,
                ),
                    (u = this.graph2.getGraphBounds()))
                : ((this.graph2.view.getDrawPane().ownerSVGElement.style.transform =
                    "scale(" + f + ")"),
                    (this.graph2.view.getDrawPane().ownerSVGElement.style.transformOrigin =
                        "0 0"),
                    (u.width *= f),
                    (u.height *= f)))
        : mxClient.NO_FO ||
        (this.graph2.view.getDrawPane().ownerSVGElement.style.transform = "");
    f = u.width + 2 * this.tooltipBorder + 4;
    e = u.height + 2 * this.tooltipBorder;
    this.tooltip.style.overflow = "visible";
    this.tooltip.style.width = f + "px";
    m = f;
    this.tooltipTitles && null != g && 0 < g.length
        ? (null == this.tooltipTitle
            ? ((this.tooltipTitle = document.createElement("div")),
                (this.tooltipTitle.style.borderTopStyle = "solid"),
                (this.tooltipTitle.style.borderTopWidth = "1px"),
                (this.tooltipTitle.style.textAlign = "center"),
                (this.tooltipTitle.style.width = "100%"),
                (this.tooltipTitle.style.overflow = "hidden"),
                (this.tooltipTitle.style.position = "absolute"),
                (this.tooltipTitle.style.paddingTop = "6px"),
                (this.tooltipTitle.style.bottom = "6px"),
                this.tooltip.appendChild(this.tooltipTitle))
            : (this.tooltipTitle.innerText = ""),
            (this.tooltipTitle.style.display = ""),
            mxUtils.write(this.tooltipTitle, g),
            this.tooltipTitle.setAttribute("title", g),
            (m = Math.min(
                this.maxTooltipWidth,
                Math.max(f, this.tooltipTitle.scrollWidth + 4),
            )),
            (g = this.tooltipTitle.offsetHeight + 10),
            (e += g),
            (this.tooltipTitle.style.marginTop = 2 - g + "px"))
        : null != this.tooltipTitle &&
        null != this.tooltipTitle.parentNode &&
        (this.tooltipTitle.style.display = "none");
    m > f && (this.tooltip.style.width = m + "px");
    this.tooltip.style.height = e + "px";
    g = -Math.round(u.x - this.tooltipBorder) + (m > f ? (m - f) / 2 : 0);
    f = -Math.round(u.y - this.tooltipBorder);
    h = null != h ? h : this.getTooltipOffset(a, u);
    a = h.x;
    h = h.y;
    0 != g || 0 != f
        ? this.graph2.view.canvas.setAttribute(
            "transform",
            "translate(" + g + "," + f + ")",
        )
        : this.graph2.view.canvas.removeAttribute("transform");
    this.tooltip.style.position = "absolute";
    this.tooltip.style.left = a + "px";
    this.tooltip.style.top = h + "px";
    mxUtils.fit(this.tooltip, this.tooltipBorder);
    this.lastCreated = Date.now();
};
Sidebar.prototype.showTooltip = function (a, b, f, e, g, d) {
    if (this.enableTooltips && this.showTooltips && this.currentElt != a) {
        null != this.thread &&
            (window.clearTimeout(this.thread), (this.thread = null));
        var h = mxUtils.bind(this, function () {
            this.createTooltip(a, b, f, e, g, d);
        });
        null != this.tooltip && "none" != this.tooltip.style.display
            ? h()
            : (this.thread = window.setTimeout(h, this.tooltipDelay));
        this.currentElt = a;
    }
};
Sidebar.prototype.hideTooltip = function () {
    null != this.thread &&
        (window.clearTimeout(this.thread), (this.thread = null));
    null != this.tooltip &&
        ((this.tooltip.style.display = "none"), (this.currentElt = null));
    this.tooltipMouseDown = null;
};
Sidebar.prototype.addDataEntry = function (a, b, f, e, g) {
    null == a && (a = "");
    null != e && (a += " " + e);
    return this.addEntry(
        a,
        mxUtils.bind(this, function () {
            return this.createVertexTemplateFromData(g, b, f, e);
        }),
    );
};
Sidebar.prototype.addEntries = function (a) {
    for (var b = 0; b < a.length; b++)
        mxUtils.bind(this, function (f) {
            var e = f.data,
                g = null != f.title ? f.title : "";
            null != f.tags && (g += " " + f.tags);
            null != e && 0 < g.length
                ? this.addEntry(
                    g,
                    mxUtils.bind(this, function () {
                        e = this.editorUi.convertDataUri(e);
                        var d =
                            "shape=image;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=0;";
                        "fixed" == f.aspect && (d += "aspect=fixed;");
                        return this.createVertexTemplate(
                            d + "image=" + e,
                            f.w,
                            f.h,
                            "",
                            f.title || "",
                            !1,
                            !1,
                            !0,
                        );
                    }),
                )
                : null != f.xml &&
                0 < g.length &&
                this.addEntry(
                    g,
                    mxUtils.bind(this, function () {
                        var d = this.editorUi.stringToCells(
                            "<" == f.xml.charAt(0) ? f.xml : Graph.decompress(f.xml),
                        );
                        return this.createVertexTemplateFromCells(
                            d,
                            f.w,
                            f.h,
                            f.title || "",
                            !0,
                            !1,
                            !0,
                        );
                    }),
                );
        })(a[b]);
};
Sidebar.prototype.setCurrentSearchEntryLibrary = function (a, b) {
    this.currentSearchEntryLibrary = null != a ? { id: a, lib: b } : null;
};
Sidebar.prototype.getKeyStyle = function (a) {
    var b = [];
    if (null != a) {
        a = a.split(";");
        for (var f = 0; f < a.length; f++) {
            var e = a[f].split("=");
            1 < e.length &&
                0 > mxUtils.indexOf(this.ignoredStyles, e[0]) &&
                b.push(e[0] + "=" + e[1]);
        }
    }
    return b.join(";");
};
Sidebar.prototype.addLibForStyle = function (a, b) {
    "" != a &&
        (null == this.styleToLibs && (this.styleToLibs = {}),
            null == this.styleToLibs[a] && (this.styleToLibs[a] = []),
            this.styleToLibs[a].push(b));
};
Sidebar.prototype.getLibsForStyle = function (a) {
    return null != this.styleToLibs ? this.styleToLibs[a] : null;
};
Sidebar.prototype.addEntry = function (a, b) {
    if (null != this.currentSearchEntryLibrary) {
        var f = this,
            e = this.createVertexTemplateFromCells;
        this.createVertexTemplateFromCells = function (m, p, k, u, w) {
            if (null != m)
                for (p = 0; p < m.length; p++)
                    f.addLibForStyle(
                        f.getKeyStyle(m[p].style),
                        this.currentSearchEntryLibrary,
                    );
        };
        b();
        this.createVertexTemplateFromCells = e;
    }
    if (null != this.taglist && null != a && 0 < a.length) {
        null != this.currentSearchEntryLibrary &&
            (b.parentLibraries = [this.currentSearchEntryLibrary]);
        a = a
            .toLowerCase()
            .replace(/[\/,\(\)]/g, " ")
            .split(" ");
        e = [];
        for (var g = {}, d = 0; d < a.length; d++) {
            null == g[a[d]] && ((g[a[d]] = !0), e.push(a[d]));
            var h = Editor.soundex(a[d].replace(/\.*\d*$/, ""));
            h != a[d] && null == g[h] && ((g[h] = !0), e.push(h));
        }
        for (d = 0; d < e.length; d++) this.addEntryForTag(e[d], b);
    }
    return b;
};
Sidebar.prototype.addEntryForTag = function (a, b) {
    if (null != a && 1 < a.length) {
        var f = this.taglist[a];
        "object" !== typeof f && ((f = { entries: [] }), (this.taglist[a] = f));
        f.entries.push(b);
    }
};
Sidebar.prototype.isEntryIgnored = function (a, b) {
    b = !b;
    if (null != a.parentLibraries && b)
        for (var f = 0; f < a.parentLibraries.length; f++)
            if (this.isEntryVisible(a.parentLibraries[f].id)) {
                b = !1;
                break;
            }
    return b;
};
Sidebar.prototype.searchEntries = function (a, b, f, e, g, d) {
    if (null != this.taglist && null != a) {
        var h = a.toLowerCase().split(" ");
        a = new mxDictionary();
        g = (f + 1) * b;
        for (var m = [], p = 0, k = 0; k < h.length; k++) {
            var u = Editor.soundex(h[k].replace(/\.*\d*$/, ""));
            if (0 < u.length) {
                m = this.taglist[h[k]];
                var w = null != m ? m.entries.slice() : [];
                m = this.taglist[u];
                w = null != m ? w.concat(m.entries) : w;
                u = new mxDictionary();
                if (0 < w.length) {
                    m = [];
                    for (var y = 0; y < w.length; y++) {
                        var C = w[y];
                        if (
                            (0 == p) == (null == a.get(C)) &&
                            null == u.get(C) &&
                            (u.put(C, C),
                                !this.isEntryIgnored(C, d) &&
                                (m.push(C), k == h.length - 1 && m.length == g))
                        ) {
                            e(m.slice(f * b, g), g, !0, h);
                            return;
                        }
                    }
                } else m = [];
                a = u;
                p++;
            }
        }
        d = m.length;
        e(m.slice(f * b, (f + 1) * b), d, !1, h);
    } else e([], null, null, h);
};
Sidebar.prototype.filterTags = function (a) {
    if (null != a) {
        a = a.split(" ");
        for (var b = [], f = {}, e = 0; e < a.length; e++)
            null == f[a[e]] && ((f[a[e]] = "1"), b.push(a[e]));
        return b.join(" ");
    }
    return null;
};
Sidebar.prototype.cloneCell = function (a, b) {
    a = a.clone();
    null != b && (a.value = b);
    return a;
};
Sidebar.prototype.showPopupMenuForEntry = function (a, b, f) { };
Sidebar.prototype.addSearchPalette = function (a) {
    function b(H, S) {
        E = S;
        H = H.firstChild.nextSibling.nextSibling;
        S = document.createElement("span");
        S.style.color = "gray";
        S.innerHTML = "Enter";
        H.appendChild(S);
    }
    function f() {
        k.setAttribute("src", Editor.magnifyImage);
        k.setAttribute("title", mxResources.get("search"));
        G.style.display = "none";
        M = p.value = "";
        N();
    }
    var e = this.editorUi,
        g = e.editor.graph,
        d = document.createElement("div");
    d.style.visibility = "hidden";
    this.appendChild(d);
    var h = document.createElement("div");
    h.className = "geSidebar geSearchSidebar";
    a || (h.style.display = "none");
    var m = document.createElement("div");
    m.style.whiteSpace = "nowrap";
    m.style.textOverflow = "clip";
    m.style.cursor = "default";
    var p = document.createElement("input");
    p.setAttribute("id", "geOmniSearch");
    p.setAttribute("placeholder", mxResources.get("typeSlashToSearch"));
    p.setAttribute("type", "text");
    m.appendChild(p);
    var k = document.createElement("img");
    k.setAttribute("src", Editor.magnifyImage);
    k.setAttribute("title", mxResources.get("search"));
    k.className = "geAdaptiveAsset";
    m.appendChild(k);
    h.appendChild(m);
    var u = !1;
    mxEvent.addGestureListeners(
        p,
        mxUtils.bind(this, function (H) {
            u = !1;
            mxClient.IS_TOUCH ||
                mxEvent.getSource(H) != p ||
                document.activeElement == p ||
                (p.focus(),
                    mxClient.IS_GC || mxClient.IS_FF
                        ? p.select()
                        : document.execCommand("selectAll", !1, null),
                    (u = !0));
        }),
        mxUtils.bind(this, function (H) {
            mxEvent.getSource(H) == p && u && mxEvent.consume(H);
        }),
        mxUtils.bind(this, function (H) {
            u && (mxEvent.consume(H), (u = !1));
        }),
    );
    var w = [],
        y = mxUtils.bind(this, function (H, S) {
            e.hideCurrentMenu();
            mxUtils.remove(H, w);
            w.unshift(H);
            5 < w.length && w.pop();
            H.funct.apply(this, S);
            p.value = null;
        }),
        C =
            "about deleteAll showBoundingBox createSidebarEntry downloadDesktop toggleGoogleFonts".split(
                " ",
            ),
        D = mxUtils.bind(this, function (H) {
            var S = null,
                ea;
            for (ea in e.actions.actions) {
                var la =
                    0 > C.indexOf(ea) && "test" != ea.substring(0, 4)
                        ? e.actions.get(ea)
                        : null;
                if (null != la && la.isEnabled() && la.visible) {
                    if (ea.toLowerCase() == H) return la;
                    for (
                        var O = H.toLowerCase().split(" "), V = 0, Y = 0;
                        Y < O.length;
                        Y++
                    )
                        0 == O[Y].length
                            ? V++
                            : (0 <= ea.toLowerCase().indexOf(O[Y]) ||
                                0 <= la.getTitle().toLowerCase().indexOf(O[Y])) &&
                            V++;
                    V == O.length &&
                        (0 > w.indexOf(S) || (null != S && !S.isEnabled())) &&
                        (S = la);
                }
            }
            return S;
        }),
        E = null;
    e.addMenuHandler(
        p,
        mxUtils.bind(this, function (H, S) {
            function ea(ia) {
                if (null != ia && ia.visible) {
                    var ta = H.addItem(
                        ia.getTitle(),
                        null,
                        function () {
                            y(ia, arguments);
                        },
                        S,
                        null,
                        ia.isEnabled(),
                    );
                    ia.toggleAction &&
                        ia.isSelected() &&
                        H.addCheckmark(ta, Editor.checkmarkImage);
                    null != E ||
                        !ia.isEnabled() ||
                        (0 != p.value.length && V != ia) ||
                        b(ta, function () {
                            y(ia, arguments);
                            g.container.focus();
                        });
                }
            }
            var la = p.value.toLowerCase();
            E = null;
            var O = H.addItem(
                mxResources.get("searchShapes"),
                null,
                mxUtils.bind(this, function () {
                    ca();
                }),
                S,
            );
            b(O, function () {
                ca();
            });
            H.addItem(
                mxResources.get("findInDiagram"),
                null,
                mxUtils.bind(this, function () {
                    e.hideCurrentMenu();
                    e.showSearchWindow(!0, p.value);
                    p.value = "";
                }),
                S,
            );
            Editor.enableChatGpt &&
                !e.isOffline() &&
                e.isOwnGDriveDomain() &&
                e.isExternalDataComms() &&
                "draw.io" == e.getServiceName() &&
                "undefined" !== typeof mxMermaidToDrawio &&
                window.isMermaidEnabled &&
                H.addItem(
                    mxResources.get("generate"),
                    null,
                    mxUtils.bind(this, function () {
                        e.openTemplateDialog(encodeURIComponent(p.value));
                        p.value = "";
                    }),
                    S,
                );
            !e.isOffline() &&
                e.isOwnGDriveDomain() &&
                e.isExternalDataComms() &&
                H.addItem(
                    mxResources.get("help"),
                    null,
                    mxUtils.bind(this, function () {
                        e.searchHelp(p.value);
                        p.value = "";
                    }),
                    S,
                );
            H.addSeparator();
            var V = 0 < p.value.length ? D(la) : null;
            ea(V);
            for (O = 0; O < w.length; O++) w[O] != V && ea(w[O]);
            if (0 < la.length && null != e.pages)
                for (
                    H.addSeparator(), O = 0;
                    O < e.pages.length &&
                    !(function (ia) {
                        if (
                            null != ia.getName() &&
                            0 <= ia.getName().toLowerCase().indexOf(la)
                        ) {
                            var ta = function () {
                                e.selectPage(ia);
                                g.container.focus();
                                p.value = "";
                            },
                                aa = H.addItem(
                                    ia.getName() + " (" + mxResources.get("page") + ")",
                                    null,
                                    ta,
                                    S,
                                );
                            null == E && b(aa, ta);
                            return !0;
                        }
                        return !1;
                    })(e.pages[O]);
                    O++
                );
            if (0 < la.length && null != e.sidebar && null != e.sidebar.entries)
                for (H.addSeparator(), O = 0; O < e.sidebar.entries.length; O++)
                    for (
                        var Y = e.sidebar.entries[O].entries, ha = 0;
                        ha < Y.length;
                        ha++
                    )
                        (function (ia) {
                            var ta = e.sidebar.getConfigurationById(ia.id),
                                aa = ia.title.toLowerCase().split(" ");
                            null != ta &&
                                0 <= mxUtils.indexOf(aa, la) &&
                                ((aa = function () {
                                    var P = e.sidebar.showPalettes(
                                        ta.prefix || "",
                                        ta.libs || [ta.id],
                                        !0,
                                    );
                                    p.value = "";
                                    null != P &&
                                        1 < P.length &&
                                        (null == P[1].firstChild ||
                                            (null != P[1].firstChild.firstChild &&
                                                "none" != P[1].firstChild.style.display) ||
                                            P[0].click(),
                                            P[0].scrollIntoView({ behavior: "smooth" }));
                                }),
                                    (ia = H.addItem(
                                        ia.title + " (" + mxResources.get("openLibrary") + ")",
                                        null,
                                        aa,
                                        S,
                                    )),
                                    null == E && b(ia, aa));
                            return !0;
                        })(Y[ha]);
        }),
        null,
        !0,
    );
    var G = document.createElement("div");
  G.style.display = "none";
  G.style.paddingTop = "8px";
  G.style.alignItems = "center";
  G.style.justifyContent = "center";
  var J = mxUtils.button(mxResources.get("moreResults"), function () {
    ca();
  });
  J.setAttribute("title", mxResources.get("moreResults"));
  J.className = "geBtn gePrimaryBtn";
  J.style.borderRadius = "16px";
  J.style.padding = "8px 12px";
  G.appendChild(J);
  h.appendChild(G);
  var M = "",
    Q = !1,
    K = !1,
    W = 0,
    X = {},
    T = 12,
    N = mxUtils.bind(this, function () {
      Q = !1;
      this.currentSearch = null;
      for (var H = h.firstChild; null != H; ) {
        var S = H.nextSibling;
        H != m && H != G && H.parentNode.removeChild(H);
        H = S;
      }
    });
  mxEvent.addListener(k, "click", function () {
    k.getAttribute("src") != Editor.magnifyImage && f();
    p.focus();
  });
  var ca = mxUtils.bind(this, function () {
    e.hideCurrentMenu();
    T =
      4 *
      Math.max(
        1,
        Math.floor(this.container.clientWidth / (this.thumbWidth + 10)),
      );
    this.hideTooltip();
    if ("" != p.value) {
      if (
        null != G.parentNode &&
        (M != p.value && (N(), (M = p.value), (X = {}), (K = !1), (W = 0)),
        !Q && !K)
      ) {
        J.setAttribute("disabled", "true");
        G.style.display = "flex";
        J.style.cursor = "wait";
        J.innerHTML = "";
        mxUtils.write(J, mxResources.get("loading") + "...");
        Q = !0;
        var H = {};
        this.currentSearch = H;
        try {
          this.searchEntries(
            M,
            T,
            W,
            mxUtils.bind(this, function (S, ea, la, O) {
              if (this.currentSearch == H) {
                S = null != S ? S : [];
                Q = !1;
                W++;
                this.insertSearchHint(h, M, T, W, S, ea, la, O);
                0 == S.length && 1 == W && (M = "");
                null != G.parentNode && G.parentNode.removeChild(G);
                for (ea = 0; ea < S.length; ea++)
                  mxUtils.bind(this, function (V) {
                    try {
                      var Y = V();
                      null != this.closedLibraryOpacity &&
                        this.searchClosedLibraries &&
                        this.isEntryIgnored(V, !1) &&
                        (Y.style.opacity = this.closedLibraryOpacity);
                      null == X[Y.innerHTML]
                        ? ((X[Y.innerHTML] =
                            null != V.parentLibraries
                              ? V.parentLibraries.slice()
                              : []),
                          h.appendChild(Y))
                        : null != V.parentLibraries &&
                          (X[Y.innerHTML] = X[Y.innerHTML].concat(
                            V.parentLibraries,
                          ));
                      mxEvent.addGestureListeners(
                        Y,
                        null,
                        null,
                        mxUtils.bind(this, function (ha) {
                          var ia = X[Y.innerHTML];
                          mxEvent.isPopupTrigger(ha) &&
                            this.showPopupMenuForEntry(Y, ia, ha);
                        }),
                      );
                      mxEvent.disableContextMenu(Y);
                    } catch (ha) {
                      "1" == urlParams.test &&
                        (null == window.console || EditorUi.isElectronApp
                          ? (mxLog.show(), mxLog.debug(ha.stack))
                          : console.error(ha));
                    }
                  })(S[ea]);
                la
                  ? (J.removeAttribute("disabled"),
                    (J.innerHTML = ""),
                    mxUtils.write(J, mxResources.get("moreResults")))
                  : ((J.innerHTML = mxResources.get("reset")),
                    (G.style.display = "none"),
                    (K = !0));
                J.style.cursor = "";
                h.appendChild(G);
              }
            }),
            mxUtils.bind(this, function () {
              J.style.cursor = "";
            }),
            this.searchClosedLibraries,
          );
        } catch (S) {
          e.handleError(S);
        }
      }
    } else
      (N(),
        (M = p.value = ""),
        (X = {}),
        (G.style.display = "none"),
        (K = !1),
        p.focus());
  });
  this.searchShapes = function (H) {
    p.value = H;
    ca();
  };
  mxEvent.addListener(
    p,
    "keydown",
    mxUtils.bind(this, function (H) {
      13 == H.keyCode && null != E
        ? (E(H, H), mxEvent.consume(H))
        : 9 == H.keyCode
          ? (g.container.focus(), mxEvent.consume(H))
          : 27 == H.keyCode && (f(), mxEvent.consume(H));
    }),
  );
  a = mxUtils.bind(this, function () {
    window.setTimeout(
      mxUtils.bind(this, function () {
        "" == p.value
          ? (k.setAttribute("src", Editor.magnifyImage),
            k.setAttribute("title", mxResources.get("search")))
          : (k.setAttribute("src", Editor.crossImage),
            k.setAttribute("title", mxResources.get("reset")));
        "" == p.value
          ? ((K = !0), (G.style.display = "none"))
          : p.value != M
            ? ((G.style.display = "none"), (K = !1))
            : Q || (G.style.display = K ? "none" : "flex");
      }),
      0,
    );
  });
  mxEvent.addListener(p, "keyup", a);
  mxEvent.addListener(p, "paste", a);
  mxEvent.addListener(p, "cut", a);
  mxEvent.addListener(p, "mousedown", function (H) {
    H.stopPropagation && H.stopPropagation();
    H.cancelBubble = !0;
  });
  mxEvent.addListener(p, "selectstart", function (H) {
    H.stopPropagation && H.stopPropagation();
    H.cancelBubble = !0;
  });
  a = document.createElement("div");
  a.appendChild(h);
  this.appendChild(a);
  this.palettes.search = [d, a];
};
Sidebar.prototype.insertSearchHint = function (a, b, f, e, g, d, h, m) {
  0 == g.length &&
    1 == e &&
    ((f = document.createElement("div")),
    (f.className = "geSidebarText"),
    (b = mxResources.get("noResultsFor", [b])),
    f.setAttribute("title", b),
    mxUtils.write(f, b),
    a.appendChild(f));
};
Sidebar.prototype.addGeneralPalette = function (a) {
  this.setCurrentSearchEntryLibrary("general", "general");
  var b = this.editorUi.editor.graph,
    f = this,
    e = parseInt(this.initialDefaultVertexStyle.fontSize);
  e = isNaN(e) ? "" : "fontSize=" + Math.min(16, e) + ";";
  var g = b.appendFontSize("edgeLabel;resizable=0;html=1;", b.edgeFontSize),
    d = new mxCell(
      "List Item",
      new mxGeometry(0, 0, 80, 30),
      "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;rotatable=0;whiteSpace=wrap;html=1;" +
        e,
    );
  d.vertex = !0;
  b = [
    this.createVertexTemplateEntry(
      "rounded=0;whiteSpace=wrap;html=1;",
      120,
      60,
      "",
      "Rectangle",
      null,
      null,
      "rect rectangle box",
    ),
    this.createVertexTemplateEntry(
      "rounded=1;whiteSpace=wrap;html=1;",
      120,
      60,
      "",
      "Rounded Rectangle",
      null,
      null,
      "rounded rect rectangle box",
    ),
    this.createVertexTemplateEntry(
      b.appendFontSize(
        "text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;",
        b.vertexFontSize,
      ),
      60,
      30,
      "Text",
      "Text",
      null,
      null,
      "text textbox textarea label",
    ),
    this.createVertexTemplateEntry(
      "text;html=1;whiteSpace=wrap;overflow=hidden;rounded=0;",
      180,
      120,
      '<h1 style="margin-top: 0px;">Heading</h1><p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
      "Textbox",
      null,
      null,
      "text textbox textarea",
    ),
    this.createVertexTemplateEntry(
      "ellipse;whiteSpace=wrap;html=1;",
      120,
      80,
      "",
      "Ellipse",
      null,
      null,
      "oval ellipse state",
    ),
    this.createVertexTemplateEntry(
      "whiteSpace=wrap;html=1;aspect=fixed;",
      80,
      80,
      "",
      "Square",
      null,
      null,
      "square",
    ),
    this.createVertexTemplateEntry(
      "ellipse;whiteSpace=wrap;html=1;aspect=fixed;",
      80,
      80,
      "",
      "Circle",
      null,
      null,
      "circle",
    ),
    this.createVertexTemplateEntry(
      "shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;",
      120,
      60,
      "",
      "Process",
      null,
      null,
      "process task",
    ),
    this.createVertexTemplateEntry(
      "rhombus;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Diamond",
      null,
      null,
      "diamond rhombus if condition decision conditional question test",
    ),
    this.createVertexTemplateEntry(
      "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;",
      120,
      60,
      "",
      "Parallelogram",
    ),
    this.createVertexTemplateEntry(
      "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;",
      120,
      80,
      "",
      "Hexagon",
      null,
      null,
      "hexagon preparation",
    ),
    this.createVertexTemplateEntry(
      "triangle;whiteSpace=wrap;html=1;",
      60,
      80,
      "",
      "Triangle",
      null,
      null,
      "triangle logic inverter buffer",
    ),
    this.createVertexTemplateEntry(
      "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;",
      60,
      80,
      "",
      "Cylinder",
      null,
      null,
      "cylinder data database",
    ),
    this.createVertexTemplateEntry(
      "ellipse;shape=cloud;whiteSpace=wrap;html=1;",
      120,
      80,
      "",
      "Cloud",
      null,
      null,
      "cloud network",
    ),
    this.createVertexTemplateEntry(
      "shape=document;whiteSpace=wrap;html=1;boundedLbl=1;",
      120,
      80,
      "",
      "Document",
    ),
    this.createVertexTemplateEntry(
      "shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;",
      80,
      80,
      "",
      "Internal Storage",
    ),
    this.createVertexTemplateEntry(
      "shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0.05;darkOpacity2=0.1;",
      120,
      80,
      "",
      "Cube",
    ),
    this.createVertexTemplateEntry(
      "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;",
      120,
      80,
      "",
      "Step",
    ),
    this.createVertexTemplateEntry(
      "shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;fixedSize=1;",
      120,
      60,
      "",
      "Trapezoid",
    ),
    this.createVertexTemplateEntry(
      "shape=tape;whiteSpace=wrap;html=1;",
      120,
      100,
      "",
      "Tape",
    ),
    this.createVertexTemplateEntry(
      "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;",
      80,
      100,
      "",
      "Note",
    ),
    this.createVertexTemplateEntry(
      "shape=card;whiteSpace=wrap;html=1;",
      80,
      100,
      "",
      "Card",
    ),
    this.createVertexTemplateEntry(
      "shape=callout;whiteSpace=wrap;html=1;perimeter=calloutPerimeter;",
      120,
      80,
      "",
      "Callout",
      null,
      null,
      "bubble chat thought speech message",
    ),
    this.createVertexTemplateEntry(
      "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;",
      30,
      60,
      "Actor",
      "Actor",
      !1,
      null,
      "user person human stickman",
    ),
    this.createVertexTemplateEntry(
      "shape=xor;whiteSpace=wrap;html=1;",
      60,
      80,
      "",
      "Or",
      null,
      null,
      "logic or",
    ),
    this.createVertexTemplateEntry(
      "shape=or;whiteSpace=wrap;html=1;",
      60,
      80,
      "",
      "And",
      null,
      null,
      "logic and",
    ),
    this.createVertexTemplateEntry(
      "shape=dataStorage;whiteSpace=wrap;html=1;fixedSize=1;",
      100,
      80,
      "",
      "Data Storage",
    ),
    this.createVertexTemplateEntry(
      "swimlane;startSize=0;",
      200,
      200,
      "",
      "Container",
      null,
      null,
      "container swimlane lane pool group",
    ),
    this.createVertexTemplateEntry(
      "swimlane;whiteSpace=wrap;html=1;",
      200,
      200,
      "Vertical Container",
      "Container",
      null,
      null,
      "container swimlane lane pool group",
    ),
    this.createVertexTemplateEntry(
      "swimlane;horizontal=0;whiteSpace=wrap;html=1;",
      200,
      200,
      "Horizontal Container",
      "Horizontal Container",
      null,
      null,
      "container swimlane lane pool group",
    ),
    this.addEntry("list group erd table", function () {
      var h = new mxCell(
        "List",
        new mxGeometry(0, 0, 140, 120),
        "swimlane;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=30;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;",
      );
      h.vertex = !0;
      h.insert(f.cloneCell(d, "Item 1"));
      h.insert(f.cloneCell(d, "Item 2"));
      h.insert(f.cloneCell(d, "Item 3"));
      return f.createVertexTemplateFromCells(
        [h],
        h.geometry.width,
        h.geometry.height,
        "List",
      );
    }),
    this.addEntry("list item entry value group erd table", function () {
      return f.createVertexTemplateFromCells(
        [f.cloneCell(d, "List Item")],
        d.geometry.width,
        d.geometry.height,
        "List Item",
      );
    }),
    this.addEntry(
      "curve",
      mxUtils.bind(this, function () {
        var h = new mxCell(
          "",
          new mxGeometry(0, 0, 50, 50),
          "curved=1;endArrow=classic;html=1;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 50), !0);
        h.geometry.setTerminalPoint(new mxPoint(50, 0), !1);
        h.geometry.points = [new mxPoint(50, 50), new mxPoint(0, 0)];
        h.geometry.relative = !0;
        h.edge = !0;
        return this.createEdgeTemplateFromCells(
          [h],
          h.geometry.width,
          h.geometry.height,
          "Curve",
        );
      }),
    ),
    this.createEdgeTemplateEntry(
      "shape=flexArrow;endArrow=classic;startArrow=classic;html=1;",
      100,
      100,
      "",
      "Bidirectional Arrow",
      null,
      "line lines connector connectors connection connections arrow arrows bidirectional",
    ),
    this.createEdgeTemplateEntry(
      "shape=flexArrow;endArrow=classic;html=1;",
      50,
      50,
      "",
      "Arrow",
      null,
      "line lines connector connectors connection connections arrow arrows directional directed",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=none;dashed=1;html=1;",
      50,
      50,
      "",
      "Dashed Line",
      null,
      "line lines connector connectors connection connections arrow arrows dashed undirected no",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=none;dashed=1;html=1;dashPattern=1 3;strokeWidth=2;",
      50,
      50,
      "",
      "Dotted Line",
      null,
      "line lines connector connectors connection connections arrow arrows dotted undirected no",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=none;html=1;",
      50,
      50,
      "",
      "Line",
      null,
      "line lines connector connectors connection connections arrow arrows simple undirected plain blank no",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=classic;startArrow=classic;html=1;",
      50,
      50,
      "",
      "Bidirectional Connector",
      null,
      "line lines connector connectors connection connections arrow arrows bidirectional",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=classic;html=1;",
      50,
      50,
      "",
      "Directional Connector",
      null,
      "line lines connector connectors connection connections arrow arrows directional directed",
    ),
    this.createEdgeTemplateEntry(
      "shape=link;html=1;",
      100,
      0,
      "",
      "Link",
      null,
      "line lines connector connectors connection connections arrow arrows link",
    ),
    this.addEntry(
      "line lines connector connectors connection connections arrow arrows edge title",
      mxUtils.bind(this, function () {
        var h = new mxCell(
          "",
          new mxGeometry(0, 0, 0, 0),
          "endArrow=classic;html=1;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
        h.geometry.setTerminalPoint(new mxPoint(100, 0), !1);
        h.geometry.relative = !0;
        h.edge = !0;
        var m = new mxCell(
          "Label",
          new mxGeometry(0, 0, 0, 0),
          g + ";align=center;verticalAlign=middle;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        return this.createEdgeTemplateFromCells(
          [h],
          100,
          0,
          "Connector with Label",
        );
      }),
    ),
    this.addEntry(
      "line lines connector connectors connection connections arrow arrows edge title multiplicity",
      mxUtils.bind(this, function () {
        var h = new mxCell(
          "",
          new mxGeometry(0, 0, 0, 0),
          "endArrow=classic;html=1;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
        h.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
        h.geometry.relative = !0;
        h.edge = !0;
        var m = new mxCell(
          "Label",
          new mxGeometry(0, 0, 0, 0),
          g + ";align=center;verticalAlign=middle;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        m = new mxCell(
          "Source",
          new mxGeometry(-1, 0, 0, 0),
          g + ";align=left;verticalAlign=bottom;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        return this.createEdgeTemplateFromCells(
          [h],
          160,
          0,
          "Connector with 2 Labels",
        );
      }),
    ),
    this.addEntry(
      "line lines connector connectors connection connections arrow arrows edge title multiplicity",
      mxUtils.bind(this, function () {
        var h = new mxCell(
          "",
          new mxGeometry(0, 0, 0, 0),
          "endArrow=classic;html=1;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
        h.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
        h.geometry.relative = !0;
        h.edge = !0;
        var m = new mxCell(
          "Label",
          new mxGeometry(0, 0, 0, 0),
          g + ";align=center;verticalAlign=middle;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        m = new mxCell(
          "Source",
          new mxGeometry(-1, 0, 0, 0),
          g + ";align=left;verticalAlign=bottom;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        m = new mxCell(
          "Target",
          new mxGeometry(1, 0, 0, 0),
          g + ";align=right;verticalAlign=bottom;",
        );
        m.geometry.relative = !0;
        m.setConnectable(!1);
        m.vertex = !0;
        h.insert(m);
        return this.createEdgeTemplateFromCells(
          [h],
          160,
          0,
          "Connector with 3 Labels",
        );
      }),
    ),
    this.addEntry(
      "line lines connector connectors connection connections arrow arrows edge shape symbol message mail email",
      mxUtils.bind(this, function () {
        var h = new mxCell(
          "",
          new mxGeometry(0, 0, 0, 0),
          "endArrow=classic;html=1;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
        h.geometry.setTerminalPoint(new mxPoint(100, 0), !1);
        h.geometry.relative = !0;
        h.edge = !0;
        var m = new mxCell(
          "",
          new mxGeometry(0, 0, 20, 14),
          "shape=message;html=1;outlineConnect=0;",
        );
        m.geometry.relative = !0;
        m.vertex = !0;
        m.geometry.offset = new mxPoint(-10, -7);
        h.insert(m);
        return this.createEdgeTemplateFromCells(
          [h],
          100,
          0,
          "Connector with Symbol",
        );
      }),
    ),
  ];
  this.addPaletteFunctions(
    "general",
    mxResources.get("general"),
    null != a ? a : !0,
    b,
  );
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.addMiscPalette = function (a) {
  var b = this;
  this.setCurrentSearchEntryLibrary("general", "misc");
  var f = [
    this.createVertexTemplateEntry(
      "text;strokeColor=none;fillColor=none;html=1;fontSize=24;fontStyle=1;verticalAlign=middle;align=center;",
      100,
      40,
      "Title",
      "Title",
      null,
      null,
      "text heading title",
    ),
    this.createVertexTemplateEntry(
      "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
      100,
      80,
      "<ul><li>Value 1</li><li>Value 2</li><li>Value 3</li></ul>",
      "Unordered List",
    ),
    this.createVertexTemplateEntry(
      "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
      100,
      80,
      "<ol><li>Value 1</li><li>Value 2</li><li>Value 3</li></ol>",
      "Ordered List",
    ),
    this.createVertexTemplateEntry(
      "shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;fontSize=11;fillColor=none;strokeColor=none;",
      60,
      60,
      "",
      "Vertical List",
    ),
    this.addDataEntry(
      "vertical list",
      60,
      60,
      "Vertical List",
      "7VjbbqMwEP0aXldcQrp9hfSyUvel3R9wwwRba2xkJiX063eMnaRNgxR2V1EUIYHkGWYGzznjI0SQ5NXmwbCa/9QFyCC5C5LcaI1uVW1ykDKIQ1EEySKI45DuIL4feBr1T8OaGVB4SkLsEt6YXIPzOEeDnfSOhrPaLpG9WlfWIDP4It6tLyR7qRUyocCQHfW2lKxuRB/tIriQxRPr9Bq3dbZWtqJsXyyy2SshZa6lttWUVu6FRv+GA6ffNxiEzWDvvcs3/gC6AjQdhbSiQO4i5g6ekIMoOX72scbZ5S5zDyQtPJbHcU1G4vqsW2qKayPeLZzSI3eIddOKSjIFj8CKA1emi26X9REwoTgYYbFGXfsICSv0y1eNqCtvGI9CeJTHwuj6FzMlbEOOkFVrobAHLs3oIijz8FsapNRxTna0t+my4QZzrWjHNEK2LLAGW2gOR2N+KuXxX1Eepf9O+ewL5T8QKvJEg9TTxlEw+QxLZKrsTxfHSvqD1HKB8FKzpQ1tSSLcYVM2ek/KENmagFpJO1YLLooC1HG+xs1Ezy6YuzdwJEcHNBH0GZOipJctXL2soQaEKp9c9fRUHpP/zqMvtgd7dDUmqXfFkM7aWhXNl+HY7fOkeUknibgoieg+k34GxZgPKcbwJEyKMUhrevWKcTMpxiUqRhKeTTG+DylGMinGeMW4uXrFuJ0E4gIEYna+T4ooHFKI2aQQ4xXi9toUgsz9zyUX/vHf0x8=",
    ),
    this.addEntry(
      "vertical list",
      mxUtils.bind(this, function () {
        var e = new mxCell(
          "Link",
          new mxGeometry(0, 0, 60, 40),
          "text;html=1;strokeColor=none;fillColor=none;whiteSpace=wrap;align=center;verticalAlign=middle;fontColor=#0000EE;fontStyle=4;",
        );
        e.vertex = !0;
        this.graph.setLinkForCell(e, "https://www.draw.io");
        return this.createVertexTemplateFromCells(
          [e],
          e.geometry.width,
          e.geometry.height,
          "Vertical List",
        );
      }),
    ),
    this.addDataEntry(
      "table",
      180,
      120,
      "Table 1",
      "7VnbcpswEP0aXjtcYsd9NUnTh/Yl6Q8o1trSVEiMWAeTr+8KhGlSe2xwJpMSZvCMdtmVteccwY4IkjTb3VmWi5+GgwqS2yBJrTHYjLJdCkoFcSh5kNwEcRzSL4i/Hbkb1XfDnFnQeE5C3CQ8MbWFxtM4CqyUdxSC5W6I7NG5lgUyiw/y2flCsldGI5MaLNlRbSvF8kLW0U2EkIr/YJXZYjtPay3XlO0ni+Zk+/WARdgdral2+YLuwGSAtqKQUnIUPmLR1B0KkBvRpnkwQlY0js0+t4OIBh6lw4glPRG7NyWVJYyVzw4o5TF5jWJRykwxDd+B8VeupeHVPsua35AaZRzaUguw0qGIJvcRCtboh48G0WTesB6G8CBD3Jr8F7MbaEPWUqn2b7TRjvfcSI01cLMlXQRlGn6ZBTOqOCU76my6XLjF1GhaMYnDTQuswBKKwaTHw0i/egPOr87nnFaMkql7WCHTm3rDCMyU3xulkAgPOVu50JJ2fbN/tIvu2DjGsiGE1srp6UZIzkEfJqqfGGpawd4+QcNuNJSf5CQ/8570+Mk6LHvPxhSVphnSHtpqXvzD+X6dZ8lgNslgsAx2L0kbkSrmkyouVcX+xTwiWVxPfcKH6hOql6S/R9uwmJ4Mp+m6Hn3b8HWSwWAZjLdtiMJJFpfKYox9QxRNjcNHbBwW79g4RD2O5T7vsyE6fQz43z8Mepw2TkL4RM3DdCJ5uS5G0D2Q2X0rasL//pT0Bw==",
    ),
    this.addDataEntry(
      "table",
      180,
      120,
      "Table 2",
      "7ZlLc9owEMc/ja8dP3jlimnSQ3pJOr0reMGayFqPvNSQT9+VLUMCOEDbyaTYM2ZGWq9e/99K7MheFGfrOyPy9DsmoLzoqxfFBpHqUraOQSkv9GXiRTMvDH3+eeFty9ugeuvnwoCmcxqEdYNfQq2gttSGgjbKGYpU5LZI4smapillPM1ZwMUylQSPuZjb9yUvgm0FCUOP8sWafK7PUZOQGoxrM0elRF7IqrPaI5UquRcbXFEzTFOz3qtM33P7wnkbLF9XF9y9Gy0YVcMbfIYYFdoBE1iIlbIduXWCIVi3alWZnFB3gBmQ2bBLKRNKncek1tNPQS7TppkT2RdFbVhu2+6k54JT/ziJ6EISD1haGGjki1VYOT325S9KmSmh4RuIZM80xWTjTIS5KylYkCs+IRFmjexuuf5RhInB/IcwS2hcFlKpBoJGbeMmR6mpEmg45Ycli/0vQ2/IK4u5Huzq/Fh3QzFq5snRY7sFUVAJBZ2ELnUKRp4NPfwz6IN/wHxwwPxnVQz9oBU+T52kUA8wJ6GX5+xI3oHaeu9wHaFzWQQga7pQNgJnqUwS0HtQwr+FEp2EMrqQietsp9vFvQlFYLQg3jgrnRQHoLfzPIv9sJV9+8bvNPv1W1JXFAqj1lCI+lB4JxS2/7tXFAvjPg34VGnA5i30j8gKJq3HwaDjx8H46rOCm1b2w559t7KCwG+NhVEfCx1LC4Kgzws+Y14w+cC8IDi8rGsOhHHHD4Tg9M3df38CHF4QNvQnPf2u5QbtN4c3fTBceXLA1d0Hotr99fej3w==",
    ),
    this.addDataEntry(
      "table title",
      180,
      150,
      "Table with Title 1",
      "7VnbbtswDP0avw6WXSfda5yue9he2v6AGjGRMFkyZKZO+vWjbOWyJVluQ9G6BmxApChaOudIIOQozYvFveOl/GkF6Ci9i9LcWYttq1jkoHWUxEpE6ThKkpjeKPl2oJc1vXHJHRg8ZUDSDnjheg6t54k/a2i9FS518FaSl76JTW86qpA7fFSv3pfG5JhYg1wZcORgja01LyvVhI+bCKm0+MGXdo6rRCuL0jn7C3KrrR8vYMrn2vunlDV8hQ3IDrMFh7A4uOLGFZZ7D7YAdEsKqZVAGSJuW1RiCWomV8Oy4ORV65itx24ApEbAcD+e6Q6e/4bywda0LGmdevUA6oDVNryNXatCcwPfgYu/XCMrlutR2ygqI8EpjyLaMkRomGJoPltEWwTDBRjivcwJZ8sn7mawCpkqrVefMdZ4QZRWGWyAy0b0EJR5/CWLMlpxTjbb2PT4cIe5NTRjEo1PC7zCGqqLSU/2k74MtARqj2ng5j9I4OZ0CdACUHH9ABPkZtZsLImFDluolgrhseQTH1rTEdFuM+OjN+QcIt0SYFPt5TWWSggw+3k7TxsNy+DuXqAlm11KV3p0jw7OpCck22B5djauaWmGI22puRHVDufreZ4kg6yXwcUyWPxJWodUMehVca0qWNI9WQz7suE9lg3DNywbbvuT4Thdw86XDV97GVwsg+6WDSzuZXGtLLpYNzDWFw7vsXBg7A0rB7Z7idcfDru3gsevBT/8aXDG7WMvhE9UPfRXktfrogPlA5mbP0tt+PaPp98=",
    ),
    this.addDataEntry(
      "table title",
      180,
      120,
      "Table with Title 2",
      "7VhNb6MwEP01XFd8NNnmGtLtHrKXptq7Gw9grbGRmZSkv34HbEJ3CdtklaYoqgSSZxgP+L1nPwkvivPtvWFF9kNzkF5050Wx0RrtKN/GIKUX+oJ70cILQ59uL/w28DRonvoFM6DwmAmhnfDM5AZs5pE9SbDZEnfSZcuMFfUQm6fRvERmcCVe6lzkU2KtFTKhwFAiaGIpWVGKpnzRVGRC8iXb6Q22jdponogt8AddlW620dWSmpVuakLNV+5j/ObtRv+CWEtdv45DwjYS2zr7UcGUYrc4MAjbQYCalEPnHnQOaHZUUgmOmau4tSD6GYg0a6c5ZH1W2kS6n9vhTQMH+WH4ox78/0aeIKJlZdqIlxpvucejY6OJK5FLpuA7MP5Xaq75zqVQF24kIUE3fNKIOneBccv1DxLKjS4emUmhLUmElC0pSqtaJ4UWChuAJnO6CLLY/zLxJrSymOKgi+mqyw3GWhG/pKW6LbASKyixR7pQGRjx36SHh0nfOVoctW9pIDqDBG56EggGNUArQMHkA6yRqbTZiBnm0m2aKhMIq4Kt69KKjhS7LVVd3bF2gKTThKAJ2kTWQlxkgnNQLc1g7p7Bsh2cm6/ozU16cyI/rlmH5cndmKQlK4a0pzaKlz3S9995lA4mPR38bIahP3I9MClS0sDC1s5LeqFQ6dLOnA4I5hLi2P5J5evNfF6xHNXuvGqZfhrHGI1jekHj+NqTwLAGRnFQvPs5ML16k7gdNImRc//xJjEgjms2idmnSYzRJGYXNInA72kgGvdJ8e4HwezqXSIIBm1i5OR/vE0MqOOKbILC7v+iLX/9+/E3",
    ),
    this.addDataEntry(
      "crossfunctional cross-functional cross functional flowchart swimlane table",
      400,
      400,
      "Cross-Functional Flowchart",
      "7ZnfbpswFMafhstN/EnS7nIhS3fRSlO2F3DhNFhzfJB90iR9+tlgkirgFUXtqjIkItmHY2O+84v1yQRJutnfKFYWd5iDCJJvQZIqRKpbm30KQgRxyPMgWQRxHJpfEC89d6PqblgyBZL6DIjrAY9MbKGOmIdr/Wm5lRlxlMwmLwXusoIpqpM1HYRL1gUrbZPYvQ3Ns4KL/JYdcEtNtOnNNZkZfvInmz8JbTIKwUrNq6ELG1GQbZXmj7ACXSfaKOxLJnPXeUDZTBLNTN+tHxTB3qtBFXIC3ABugNTBpOx4TkWdMQlrncIC+LqgsyDTdWB9HHuS1DScqt0KJy2Fv2aEyoSiv8u5wp15vwIVfzLvbApRC6B3fCOYhO/A8rPQHPODCxGWriXggZo8UvgbUhTm8cmCywIUt5W5RyLcNDVw72/bucLyF1NroOfqu/VWfS5EM59EaREokUuq9JrOzWUUTMPP02Bq3i81/ejUN5dNV5SiNEtjvCoXME070O9MTNxNzKEBox7xEkBR/AoATVoA/SiYhm6AHAm9OTkvqA+RDKWEzP3NfaV/x3ol3fXae+t1LE3vernZV1YGuRZwyXxMECjJyJRgK3PdwuC49F5kTL1kxCMZ/ciIZsNEY+ZFIxnR6IdGfD1MNK68hqRj1xgNyYcwJF3b2Ns5kusWQa+/p7T3Dh8sL+wp/7ZMV/+jD/ky8nAZD0N1H1E4EnEZEUM1HVHkdR0dhnR0HR/CdXTB+nauI2qfVY6bSiOw54Rz2L4jap+tjkT0I2KwzqN9Wjoi0Q+JgVgP0z19PqvTn39d+wM=",
    ),
    this.addDataEntry(
      "table",
      280,
      160,
      "Table",
      "7Zpdc6IwFIZ/DfcksSqX1X7sxe6NdvY+ylEyjYQJsWp//QZIrDXSIkUdcZ3pTDiSNHmfHF5yRo8MF+tnSZPojwiBe+TRI0MphCpai/UQOPewz0KPPHgY+/rPw08l36L8Wz+hEmJVpQMuOrxRvoQicp+moNIinKoNN+FpxHj4m27EMhtX0QkHezWQMF3KlL3BCFL2nnXwdTRVUrzCUHAh8yFI0J/M9AzJYMY434nf94ZBB2c9IhqKlQ5mN5mJgVSwLl1cHjIrewaxACU3+pYVC1VkFtgvBPAjYPPIduuaIE2LwHzb90Mr3TByHZaOOBrp+Sdg1RllKxlEQrJ3ESvKt6pQqcY7Kq3YgtMYfgEN90IDEW5MSInEtDjMlGlOhFJiYS6kWV3WDqVIXqicgw1MBec0SdmE2397GBmsExrbacz0tMdmcS5PFkcgmXJpzvJPVYC4HkBCfs6v42z9F6b0arGP3N0v4himOdcvBayo0XbHU87msY5NtSAg90RH5nqn41P+yfaVWvBjEoV8q3NAjpPZDDbKZInnuW5Hjka5XnNMld7oyzhMHXbbeVbCeVeKE98MzvVn8Xd5dBqlW2G0Zul2S+m6j+GW00X9nov3ypO35+D9b64nM9fNZ6Lfei3+udf2Hb5/8+apvfYj6iTvKmIKxgmdZuOt9At4jUTt1XPVLwStkZh7ozWbmEEpuNO66mXAHemf9TlWGK1ZjsgvBXlaA70oyMpWeUUZidAteyWq7pWP90/4gTTjld27il6Jfu6VyK3J2FTtnClVm8hM9H1t5mDyfKFgjVTcG63hVCSlpO5aQOpIN6wPrsJoDYNzaz8WXLc94Cq73zWlnFvmuSH3u9BJMehWdL8GqrLIrfTY1OydKTX3FT/Ji2uxkVtdkUVuVcei7N8CyvZWY1F5PSe4IbJtrMQit+JzQwZ7oeMlsnW2c5wvcXkpyFaJruPtN6jnoFf0tovdWs8W1bkK56dE1d4Tpn1qHiLnPlCvllwLjpj68uPnVsXtu7/G+gc=",
    ),
    this.addDataEntry(
      "table",
      180,
      140,
      "Table",
      "7ZhNc5swEIZ/DXc+HH9cTdv00F7sTu8yWoOmi8QIOUB+fSUjJXEwMbZzgcl4PKNdIVn7PlovkhfFef0oSZH9FhTQi757USyFUG0rr2NA9EKfUS/65oWhr79e+KOnNzj2+gWRwNWQAWE74IngAVpP6yhVg9aRZAzpL9KIg5lRkR2Cs9YSkoMs2RNsoGTPZoCvvWVGqKissWeIsUAhtc0FB9OvpPgHzumFUeybj+6xqwGpoO6N6Oiy4TyCyEHJRj9SMaoy+8SyjdrPgKWZGzazTlK2jvRl7KtAumE1Oq9XdFkvHX0BTqmN0WGdCcmeBVcEnUKKSLV9o1jFciQcfgKh71xrQRvrUqKwLYS9ss2dUErk1pA2XNOmUhR/iEzBORKBSIqS7dD97Hl8UBeEu2Xs9bK3NrgenIOghbdBmy3uZzbrMPt7bIZ+0N3sgnNIjug+1Oh0C1shzmhDkKVcm4kWArR/XWVMwbYgiZmp0nlvtofKzcYIhmoZXdRyfqWUdrKNCZ2nCNfPRlDHx4nS+/XAadnh87LOQcgeepGd+X8aMbL6VOAJEZz3EoymSDAIp4dw8VXa7iltzSmji5Vufn+lW/Ym3WycSbe4rdJ9IOUNSfZuts9NslUvsodJIbuy0o2IYOD3IpxPEeHgUjcmht2TwFetu77WraKBte4TTnVB9+rCpV33xWUUaRdcvtgY+ytl0L0/cdCW04I23ZNd0H+fspokwwmc7bT5eqfcPv72yvk/",
    ),
    this.addDataEntry(
      "table",
      180,
      140,
      "Table",
      "7ZhLc5swEMc/DXcejh9X3CY9tBe707uM1qCpkBixDpBPX2GkvLBi7LgHmBw8s1okof3/tF4kL1rn9YMiRfZLUuBe9N2L1kpK7Ky8XgPnXugz6kXfvDD09c8L7x1Pg+NTvyAKBA4ZEHYDHgk/QOfpHCU23DiSjHH6kzTy0M6IZMfBtmIFyUGV7BE2ULKndoCvvWVGqKxMY884X0sulW4LKXSf2LwTFELtXPfRZRb9ADIHVI3uUjGKmemx7GLzM2BpZofNjJOUnSN9HvsigzaMEqdVic6romMswOqxaaONM6nYkxRIuNUBicLtK10qlnMi4AcQ+s4VS9oYF8rCWBz2aMydRJS5aSgTbmtTJYvfRKVgHYnknBQl23H72tOQoC6IsMvY62VvTXAOaCUq+Resk4kMFMOhMMPrYM4Wn2c567H8czRDP+hvdSkEJEekH2rn0uKEbISzVOhmorUA7Y+rjCFsC5K0k1U68dudg3m7Z4KhckZn5ZxfqKaZbNNGL1IOl89GuI5PENRb+SBo2UP0vM5B1O6c1E78QY2bWv1W4wlBnDshRhOFGITTo7j4qn3/o/Y1b9mdLYXzz5fCpTMfZ6PNx8V1pfADNa/Iv3ez3Tb/Vk5qd1OjdmEpHBHEwHdSnE+U4uBaOCaM/TPDVzG8XTFcRQOL4Q3OhUH/6sNmZP+LZywZGZy/NRn752jQv5yx3JaT4zbds2HgvpdZTRXjBE6HuvlyOd11f313/Q8=",
    ),
    this.createVertexTemplateEntry(
      "text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;overflow=fill;",
      180,
      180,
      '<table border="1" width="100%" height="100%" cellpadding="4" style="width:100%;height:100%;border-collapse:collapse;"><tr><th align="center"><b>Title</b></th></tr><tr><td align="center">Section 1.1\nSection 1.2\nSection 1.3</td></tr><tr><td align="center">Section 2.1\nSection 2.2\nSection 2.3</td></tr></table>',
      "HTML Table 4",
    ),
    this.addEntry(
      "link hyperlink",
      mxUtils.bind(this, function () {
        var e = new mxCell(
          "Link",
          new mxGeometry(0, 0, 60, 40),
          "text;html=1;strokeColor=none;fillColor=none;whiteSpace=wrap;align=center;verticalAlign=middle;fontColor=#0000EE;fontStyle=4;",
        );
        e.vertex = !0;
        this.graph.setLinkForCell(e, "https://www.draw.io");
        return this.createVertexTemplateFromCells(
          [e],
          e.geometry.width,
          e.geometry.height,
          "Link",
        );
      }),
    ),
    this.addEntry(
      "timestamp date time text label",
      mxUtils.bind(this, function () {
        var e = new mxCell(
          "%date{ddd mmm dd yyyy HH:MM:ss}%",
          new mxGeometry(0, 0, 160, 20),
          "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;overflow=hidden;",
        );
        e.vertex = !0;
        this.graph.setAttributeForCell(e, "placeholders", "1");
        return this.createVertexTemplateFromCells(
          [e],
          e.geometry.width,
          e.geometry.height,
          "Timestamp",
        );
      }),
    ),
    this.addEntry(
      "variable placeholder metadata hello world text label",
      mxUtils.bind(this, function () {
        var e = new mxCell(
          "%name% Text",
          new mxGeometry(0, 0, 80, 20),
          "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;overflow=hidden;",
        );
        e.vertex = !0;
        this.graph.setAttributeForCell(e, "placeholders", "1");
        this.graph.setAttributeForCell(e, "name", "Variable");
        return this.createVertexTemplateFromCells(
          [e],
          e.geometry.width,
          e.geometry.height,
          "Variable",
        );
      }),
    ),
    this.createVertexTemplateEntry(
      "shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;",
      120,
      80,
      "",
      "Double Rectangle",
      null,
      null,
      "rect rectangle box double",
    ),
    this.createVertexTemplateEntry(
      "shape=ext;double=1;rounded=1;whiteSpace=wrap;html=1;",
      120,
      80,
      "",
      "Double Rounded Rectangle",
      null,
      null,
      "rounded rect rectangle box double",
    ),
    this.createVertexTemplateEntry(
      "ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;",
      100,
      60,
      "",
      "Double Ellipse",
      null,
      null,
      "oval ellipse start end state double",
    ),
    this.createVertexTemplateEntry(
      "shape=ext;double=1;whiteSpace=wrap;html=1;aspect=fixed;",
      80,
      80,
      "",
      "Double Square",
      null,
      null,
      "double square",
    ),
    this.createVertexTemplateEntry(
      "ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;aspect=fixed;",
      80,
      80,
      "",
      "Double Circle",
      null,
      null,
      "double circle",
    ),
    this.createVertexTemplateEntry(
      "rounded=1;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=4;hachureGap=8;hachureAngle=45;fillColor=#1ba1e2;sketch=1;",
      120,
      60,
      "",
      "Rectangle Sketch",
      !0,
      null,
      "rectangle rect box text sketch comic retro",
    ),
    this.createVertexTemplateEntry(
      "ellipse;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=2;hachureGap=8;fillColor=#990000;fillStyle=dots;sketch=1;",
      120,
      60,
      "",
      "Ellipse Sketch",
      !0,
      null,
      "ellipse oval sketch comic retro",
    ),
    this.createVertexTemplateEntry(
      "rhombus;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=-1;hachureGap=8;fillStyle=cross-hatch;fillColor=#006600;sketch=1;",
      120,
      60,
      "",
      "Diamond Sketch",
      !0,
      null,
      "diamond sketch comic retro",
    ),
    this.createVertexTemplateEntry(
      "html=1;whiteSpace=wrap;shape=isoCube2;backgroundOutline=1;isoAngle=15;",
      90,
      100,
      "",
      "Isometric Cube",
      !0,
      null,
      "cube box iso isometric",
    ),
    this.createVertexTemplateEntry(
      "html=1;whiteSpace=wrap;aspect=fixed;shape=isoRectangle;",
      150,
      90,
      "",
      "Isometric Square",
      !0,
      null,
      "rectangle rect box iso isometric",
    ),
    this.createEdgeTemplateEntry(
      "edgeStyle=isometricEdgeStyle;endArrow=none;html=1;",
      50,
      100,
      "",
      "Isometric Edge 1",
    ),
    this.createEdgeTemplateEntry(
      "edgeStyle=isometricEdgeStyle;endArrow=none;html=1;elbow=vertical;",
      50,
      100,
      "",
      "Isometric Edge 2",
    ),
    this.createVertexTemplateEntry(
      "shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;",
      20,
      120,
      "",
      "Left Curly Bracket",
    ),
    this.createVertexTemplateEntry(
      "shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;flipH=1;labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;",
      20,
      120,
      "",
      "Right Curly Bracket",
    ),
    this.createVertexTemplateEntry(
      "line;strokeWidth=2;html=1;",
      160,
      10,
      "",
      "Horizontal Line",
    ),
    this.createVertexTemplateEntry(
      "line;strokeWidth=2;direction=south;html=1;",
      10,
      160,
      "",
      "Vertical Line",
    ),
    this.createVertexTemplateEntry(
      "line;strokeWidth=4;html=1;perimeter=backbonePerimeter;points=[];outlineConnect=0;",
      160,
      10,
      "",
      "Horizontal Backbone",
      !1,
      null,
      "backbone bus network",
    ),
    this.createVertexTemplateEntry(
      "line;strokeWidth=4;direction=south;html=1;perimeter=backbonePerimeter;points=[];outlineConnect=0;",
      10,
      160,
      "",
      "Vertical Backbone",
      !1,
      null,
      "backbone bus network",
    ),
    this.createVertexTemplateEntry(
      "shape=crossbar;whiteSpace=wrap;html=1;rounded=1;",
      120,
      20,
      "",
      "Horizontal Crossbar",
      !1,
      null,
      "crossbar distance measure dimension unit",
    ),
    this.createVertexTemplateEntry(
      "shape=crossbar;whiteSpace=wrap;html=1;rounded=1;direction=south;",
      20,
      120,
      "",
      "Vertical Crossbar",
      !1,
      null,
      "crossbar distance measure dimension unit",
    ),
    this.createVertexTemplateEntry(
      "shape=image;html=1;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=1;aspect=fixed;image=" +
        this.gearImage,
      52,
      61,
      "",
      "Image (Fixed Aspect)",
      !1,
      null,
      "fixed image icon symbol",
    ),
    this.createVertexTemplateEntry(
      "shape=image;html=1;verticalLabelPosition=bottom;verticalAlign=top;imageAspect=0;image=" +
        this.gearImage,
      50,
      60,
      "",
      "Image (Variable Aspect)",
      !1,
      null,
      "strechted image icon symbol",
    ),
    this.createVertexTemplateEntry(
      "icon;html=1;image=" + this.gearImage,
      60,
      60,
      "Icon",
      "Icon",
      !1,
      null,
      "icon image symbol",
    ),
    this.createVertexTemplateEntry(
      "label;whiteSpace=wrap;html=1;image=" + this.gearImage,
      140,
      60,
      "Label",
      "Label 1",
      null,
      null,
      "label image icon symbol",
    ),
    this.createVertexTemplateEntry(
      "label;whiteSpace=wrap;html=1;align=center;verticalAlign=bottom;spacingLeft=0;spacingBottom=4;imageAlign=center;imageVerticalAlign=top;image=" +
        this.gearImage,
      120,
      80,
      "Label",
      "Label 2",
      null,
      null,
      "label image icon symbol",
    ),
    this.addEntry("shape group container", function () {
      var e = new mxCell(
        "Label",
        new mxGeometry(0, 0, 160, 70),
        "html=1;whiteSpace=wrap;container=1;recursiveResize=0;collapsible=0;",
      );
      e.vertex = !0;
      var g = new mxCell(
        "",
        new mxGeometry(20, 20, 20, 30),
        "triangle;html=1;whiteSpace=wrap;",
      );
      g.vertex = !0;
      e.insert(g);
      return b.createVertexTemplateFromCells(
        [e],
        e.geometry.width,
        e.geometry.height,
        "Shape Group",
      );
    }),
    this.createVertexTemplateEntry(
      "shape=partialRectangle;whiteSpace=wrap;html=1;left=0;right=0;fillColor=none;",
      120,
      60,
      "",
      "Partial Rectangle",
    ),
    this.createVertexTemplateEntry(
      "shape=partialRectangle;whiteSpace=wrap;html=1;bottom=0;top=0;fillColor=none;",
      120,
      60,
      "",
      "Partial Rectangle",
    ),
    this.createVertexTemplateEntry(
      "shape=partialRectangle;whiteSpace=wrap;html=1;bottom=0;right=0;fillColor=none;",
      120,
      60,
      "",
      "Partial Rectangle",
    ),
    this.createVertexTemplateEntry(
      "shape=partialRectangle;whiteSpace=wrap;html=1;bottom=1;right=1;left=1;top=0;fillColor=none;routingCenterX=-0.5;",
      120,
      60,
      "",
      "Partial Rectangle",
    ),
    this.createVertexTemplateEntry(
      "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fontColor=#000000;darkOpacity=0.05;fillColor=#FFF9B2;strokeColor=none;fillStyle=solid;direction=west;gradientDirection=north;gradientColor=#FFF2A1;shadow=1;size=20;pointerEvents=1;",
      140,
      160,
      "",
      mxResources.get("note"),
    ),
    this.createVertexTemplateEntry(
      "shape=waypoint;sketch=0;fillStyle=solid;size=6;pointerEvents=1;points=[];fillColor=none;resizable=0;rotatable=0;perimeter=centerPerimeter;snapToPoint=1;",
      20,
      20,
      "",
      "Waypoint",
    ),
    this.createEdgeTemplateEntry(
      "edgeStyle=segmentEdgeStyle;endArrow=classic;html=1;curved=0;rounded=0;endSize=8;startSize=8;",
      50,
      50,
      "",
      "Manual Line",
      null,
      "line lines connector connectors connection connections arrow arrows manual",
    ),
    this.createEdgeTemplateEntry(
      "shape=filledEdge;curved=0;rounded=0;fixDash=1;endArrow=none;strokeWidth=10;fillColor=#ffffff;edgeStyle=orthogonalEdgeStyle;html=1;",
      60,
      40,
      "",
      "Filled Edge",
    ),
    this.createEdgeTemplateEntry(
      "edgeStyle=elbowEdgeStyle;elbow=horizontal;endArrow=classic;html=1;curved=0;rounded=0;endSize=8;startSize=8;",
      50,
      50,
      "",
      "Horizontal Elbow",
      null,
      "line lines connector connectors connection connections arrow arrows elbow horizontal",
    ),
    this.createEdgeTemplateEntry(
      "edgeStyle=elbowEdgeStyle;elbow=vertical;endArrow=classic;html=1;curved=0;rounded=0;endSize=8;startSize=8;",
      50,
      50,
      "",
      "Vertical Elbow",
      null,
      "line lines connector connectors connection connections arrow arrows elbow vertical",
    ),
  ];
  this.addPaletteFunctions(
    "misc",
    mxResources.get("misc"),
    null != a ? a : !0,
    f,
  );
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.addAdvancedPalette = function (a) {
  this.setCurrentSearchEntryLibrary("general", "advanced");
  this.addPaletteFunctions(
    "advanced",
    mxResources.get("advanced"),
    null != a ? a : !1,
    this.createAdvancedShapes(),
  );
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.addBasicPalette = function (a) {
  this.setCurrentSearchEntryLibrary("basic");
  this.addStencilPalette(
    "basic",
    mxResources.get("basic"),
    a + "/basic.xml",
    ";whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2",
    null,
    null,
    null,
    null,
    [
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;bottom=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;right=0;top=0;bottom=0;fillColor=none;routingCenterX=-0.5;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;bottom=0;right=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;left=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
    ],
  );
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.createAdvancedShapes = function () {
  var a = this,
    b = new mxCell(
      "List Item",
      new mxGeometry(0, 0, 60, 26),
      "text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;",
    );
  b.vertex = !0;
  return [
    this.createVertexTemplateEntry(
      "shape=tapeData;whiteSpace=wrap;html=1;perimeter=ellipsePerimeter;",
      80,
      80,
      "",
      "Tape Data",
    ),
    this.createVertexTemplateEntry(
      "shape=manualInput;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Manual Input",
    ),
    this.createVertexTemplateEntry(
      "shape=loopLimit;whiteSpace=wrap;html=1;",
      100,
      80,
      "",
      "Loop Limit",
    ),
    this.createVertexTemplateEntry(
      "shape=offPageConnector;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Off Page Connector",
    ),
    this.createVertexTemplateEntry(
      "shape=delay;whiteSpace=wrap;html=1;",
      80,
      40,
      "",
      "Delay",
    ),
    this.createVertexTemplateEntry(
      "shape=display;whiteSpace=wrap;html=1;",
      80,
      40,
      "",
      "Display",
    ),
    this.createVertexTemplateEntry(
      "shape=singleArrow;direction=west;whiteSpace=wrap;html=1;",
      100,
      60,
      "",
      "Arrow Left",
    ),
    this.createVertexTemplateEntry(
      "shape=singleArrow;whiteSpace=wrap;html=1;",
      100,
      60,
      "",
      "Arrow Right",
    ),
    this.createVertexTemplateEntry(
      "shape=singleArrow;direction=north;whiteSpace=wrap;html=1;",
      60,
      100,
      "",
      "Arrow Up",
    ),
    this.createVertexTemplateEntry(
      "shape=singleArrow;direction=south;whiteSpace=wrap;html=1;",
      60,
      100,
      "",
      "Arrow Down",
    ),
    this.createVertexTemplateEntry(
      "shape=doubleArrow;whiteSpace=wrap;html=1;",
      100,
      60,
      "",
      "Double Arrow",
    ),
    this.createVertexTemplateEntry(
      "shape=doubleArrow;direction=south;whiteSpace=wrap;html=1;",
      60,
      100,
      "",
      "Double Arrow Vertical",
      null,
      null,
      "double arrow",
    ),
    this.createVertexTemplateEntry(
      "shape=actor;whiteSpace=wrap;html=1;",
      40,
      60,
      "",
      "User",
      null,
      null,
      "user person human",
    ),
    this.createVertexTemplateEntry(
      "shape=cross;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Cross",
    ),
    this.createVertexTemplateEntry(
      "shape=corner;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Corner",
    ),
    this.createVertexTemplateEntry(
      "shape=tee;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Tee",
    ),
    this.createVertexTemplateEntry(
      "shape=datastore;whiteSpace=wrap;html=1;",
      60,
      60,
      "",
      "Data Store",
      null,
      null,
      "data store cylinder database",
    ),
    this.createVertexTemplateEntry(
      "shape=orEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;",
      80,
      80,
      "",
      "Or",
      null,
      null,
      "or circle oval ellipse",
    ),
    this.createVertexTemplateEntry(
      "shape=sumEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;",
      80,
      80,
      "",
      "Sum",
      null,
      null,
      "sum circle oval ellipse",
    ),
    this.createVertexTemplateEntry(
      "shape=lineEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;",
      80,
      80,
      "",
      "Ellipse with horizontal divider",
      null,
      null,
      "circle oval ellipse",
    ),
    this.createVertexTemplateEntry(
      "shape=lineEllipse;line=vertical;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;",
      80,
      80,
      "",
      "Ellipse with vertical divider",
      null,
      null,
      "circle oval ellipse",
    ),
    this.createVertexTemplateEntry(
      "shape=sortShape;perimeter=rhombusPerimeter;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Sort",
      null,
      null,
      "sort",
    ),
    this.createVertexTemplateEntry(
      "shape=collate;whiteSpace=wrap;html=1;",
      80,
      80,
      "",
      "Collate",
      null,
      null,
      "collate",
    ),
    this.createVertexTemplateEntry(
      "shape=switch;whiteSpace=wrap;html=1;",
      60,
      60,
      "",
      "Switch",
      null,
      null,
      "switch router",
    ),
    this.addEntry("process bar", function () {
      return a.createVertexTemplateFromData(
        "1ZVNboMwEIVP42UlfkqabCFtNokUiRO4MAWrBiPbKZDTd2xMSJMgVaraKgskzxs/e+YbS5AwqbqNpE25EzlwEj6TMJFC6GFVdQlwTgKP5SRckyDw8CPBy0zWt1mvoRJq/R1DMBg+KD/AoOylyEApFGMqh6zSPXdZ1bKK0xqjOCsZz7e0Fwdzk9I0ex+juBSSHUWtKTa09lF4Y5wngguJcS2sf9qTGq/bKEGxI+zHBi6lHe1Q9U7qlirthExwThvFXm2tRlFaine4uNYWGguZgxF9b5TShmasLlB78IPxfDocZqqgnBU1rjOswljjRrBaK4Mlikm0RqUtmQZzjvG0OFPTpa5GBg41SA3d7Lis5Ga1AVGBlj1uaVmuSzey1WKwlcCKcrR5w5w9qgahOHmn6ePCPYDbjyG8egyphgYV//odlLQBO3YwXTYgGV5nkRppP8U4+g7yFGflMPwOt+A2t9Hg6PSuUdfpGdUTwHOq0dPPoT7OQQ3uHepq+W9Qozmo4b1D9ZeLv6KK4fSjsbkv/6FP",
        296,
        100,
        "Process Bar",
      );
    }),
    this.createVertexTemplateEntry(
      "swimlane;",
      200,
      200,
      "Container",
      "Container",
      null,
      null,
      "container swimlane lane pool group",
    ),
    this.addEntry("list group erd table", function () {
      var f = new mxCell(
        "List",
        new mxGeometry(0, 0, 140, 110),
        "swimlane;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=26;fillColor=none;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;html=1;",
      );
      f.vertex = !0;
      f.insert(a.cloneCell(b, "Item 1"));
      f.insert(a.cloneCell(b, "Item 2"));
      f.insert(a.cloneCell(b, "Item 3"));
      return a.createVertexTemplateFromCells(
        [f],
        f.geometry.width,
        f.geometry.height,
        "List",
      );
    }),
    this.addEntry("list item entry value group erd table", function () {
      return a.createVertexTemplateFromCells(
        [a.cloneCell(b, "List Item")],
        b.geometry.width,
        b.geometry.height,
        "List Item",
      );
    }),
  ];
};
Sidebar.prototype.addBasicPalette = function (a) {
  this.setCurrentSearchEntryLibrary("basic");
  this.addStencilPalette(
    "basic",
    mxResources.get("basic"),
    a + "/basic.xml",
    ";whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2",
    null,
    null,
    null,
    null,
    [
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;bottom=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;right=0;top=0;bottom=0;fillColor=none;routingCenterX=-0.5;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;bottom=0;right=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
      this.createVertexTemplateEntry(
        "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;left=0;fillColor=none;",
        120,
        60,
        "",
        "Partial Rectangle",
      ),
    ],
  );
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.addUmlPalette = function (a) {
  var b = this,
    f = new mxCell(
      "+ field: type",
      new mxGeometry(0, 0, 100, 26),
      "text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;",
    );
  f.vertex = !0;
  var e = new mxCell(
    "",
    new mxGeometry(0, 0, 40, 8),
    "line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=inherit;",
  );
  e.vertex = !0;
  this.setCurrentSearchEntryLibrary("uml");
  var g = [
    this.createVertexTemplateEntry(
      "html=1;whiteSpace=wrap;",
      110,
      50,
      "Object",
      "Object",
      null,
      null,
      "uml static class object instance",
    ),
    this.createVertexTemplateEntry(
      "html=1;whiteSpace=wrap;",
      110,
      50,
      "&laquo;interface&raquo;<br><b>Name</b>",
      "Interface",
      null,
      null,
      "uml static class interface object instance annotated annotation",
    ),
    this.addEntry("uml static class object instance", function () {
      var d = new mxCell(
        "Classname",
        new mxGeometry(0, 0, 160, 90),
        "swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;",
      );
      d.vertex = !0;
      d.insert(f.clone());
      d.insert(e.clone());
      d.insert(b.cloneCell(f, "+ method(type): type"));
      return b.createVertexTemplateFromCells(
        [d],
        d.geometry.width,
        d.geometry.height,
        "Class",
      );
    }),
    this.addEntry("uml static class section subsection", function () {
      var d = new mxCell(
        "Classname",
        new mxGeometry(0, 0, 140, 110),
        "swimlane;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=26;fillColor=none;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;",
      );
      d.vertex = !0;
      d.insert(f.clone());
      d.insert(f.clone());
      d.insert(f.clone());
      return b.createVertexTemplateFromCells(
        [d],
        d.geometry.width,
        d.geometry.height,
        "Class 2",
      );
    }),
    this.addEntry(
      "uml static class item member method function variable field attribute label",
      function () {
        return b.createVertexTemplateFromCells(
          [b.cloneCell(f, "+ item: attribute")],
          f.geometry.width,
          f.geometry.height,
          "Item 1",
        );
      },
    ),
    this.addEntry(
      "uml static class item member method function variable field attribute label",
      function () {
        var d = new mxCell(
          "item: attribute",
          new mxGeometry(0, 0, 120, f.geometry.height),
          "label;fontStyle=0;strokeColor=none;fillColor=none;align=left;verticalAlign=top;overflow=hidden;spacingLeft=28;spacingRight=4;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;imageWidth=16;imageHeight=16;whiteSpace=wrap;html=1;image=" +
            b.gearImage,
        );
        d.vertex = !0;
        return b.createVertexTemplateFromCells(
          [d],
          d.geometry.width,
          d.geometry.height,
          "Item 2",
        );
      },
    ),
    this.addEntry("uml static class divider hline line separator", function () {
      return b.createVertexTemplateFromCells(
        [e.clone()],
        e.geometry.width,
        e.geometry.height,
        "Divider",
      );
    }),
    this.addEntry("uml static class spacer space gap separator", function () {
      var d = new mxCell(
        "",
        new mxGeometry(0, 0, 20, 14),
        "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=4;spacingRight=4;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;",
      );
      d.vertex = !0;
      return b.createVertexTemplateFromCells(
        [d.clone()],
        d.geometry.width,
        d.geometry.height,
        "Spacer",
      );
    }),
    this.createVertexTemplateEntry(
      "text;align=center;fontStyle=1;verticalAlign=middle;spacingLeft=3;spacingRight=3;strokeColor=none;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;",
      80,
      26,
      "Title",
      "Title",
      null,
      null,
      "uml static class title label",
    ),
    this.addEntry("uml static class component", function () {
      var d = new mxCell(
        "&laquo;Annotation&raquo;<br/><b>Component</b>",
        new mxGeometry(0, 0, 180, 90),
        "html=1;dropTarget=0;whiteSpace=wrap;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "",
        new mxGeometry(1, 0, 20, 20),
        "shape=module;jettyWidth=8;jettyHeight=4;",
      );
      h.vertex = !0;
      h.geometry.relative = !0;
      h.geometry.offset = new mxPoint(-27, 7);
      d.insert(h);
      return b.createVertexTemplateFromCells(
        [d],
        d.geometry.width,
        d.geometry.height,
        "Component",
      );
    }),
    this.addEntry("uml static class component", function () {
      var d = new mxCell(
        '<p style="margin:0px;margin-top:6px;text-align:center;"><b>Component</b></p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:8px;">+ Attribute1: Type<br/>+ Attribute2: Type</p>',
        new mxGeometry(0, 0, 180, 90),
        "align=left;overflow=fill;html=1;dropTarget=0;whiteSpace=wrap;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "",
        new mxGeometry(1, 0, 20, 20),
        "shape=component;jettyWidth=8;jettyHeight=4;",
      );
      h.vertex = !0;
      h.geometry.relative = !0;
      h.geometry.offset = new mxPoint(-24, 4);
      d.insert(h);
      return b.createVertexTemplateFromCells(
        [d],
        d.geometry.width,
        d.geometry.height,
        "Component with Attributes",
      );
    }),
    this.createVertexTemplateEntry(
      "verticalAlign=top;align=left;spacingTop=8;spacingLeft=2;spacingRight=12;shape=cube;size=10;direction=south;fontStyle=4;html=1;whiteSpace=wrap;",
      180,
      120,
      "Block",
      "Block",
      null,
      null,
      "uml static class block",
    ),
    this.createVertexTemplateEntry(
      "shape=module;align=left;spacingLeft=20;align=center;verticalAlign=top;whiteSpace=wrap;html=1;",
      100,
      50,
      "Module",
      "Module",
      null,
      null,
      "uml static class module component",
    ),
    this.createVertexTemplateEntry(
      "shape=folder;fontStyle=1;spacingTop=10;tabWidth=40;tabHeight=14;tabPosition=left;html=1;whiteSpace=wrap;",
      70,
      50,
      "package",
      "Package",
      null,
      null,
      "uml static class package",
    ),
    this.createVertexTemplateEntry(
      "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      160,
      90,
      '<p style="margin:0px;margin-top:4px;text-align:center;text-decoration:underline;"><b>Object:Type</b></p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:8px;">field1 = value1<br/>field2 = value2<br>field3 = value3</p>',
      "Object",
      null,
      null,
      "uml static class object instance",
    ),
    this.createVertexTemplateEntry(
      "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      180,
      90,
      '<div style="box-sizing:border-box;width:100%;background:#e4e4e4;padding:2px;">Tablename</div><table style="width:100%;font-size:1em;" cellpadding="2" cellspacing="0"><tr><td>PK</td><td>uniqueId</td></tr><tr><td>FK1</td><td>foreignKey</td></tr><tr><td></td><td>fieldname</td></tr></table>',
      "Entity",
      null,
      null,
      "er entity table",
    ),
    this.addEntry("uml static class object instance", function () {
      var d = new mxCell(
        '<p style="margin:0px;margin-top:4px;text-align:center;"><b>Class</b></p><hr size="1" style="border-style:solid;"/><div style="height:2px;"></div>',
        new mxGeometry(0, 0, 140, 60),
        "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      );
      d.vertex = !0;
      return b.createVertexTemplateFromCells(
        [d.clone()],
        d.geometry.width,
        d.geometry.height,
        "Class 3",
      );
    }),
    this.addEntry("uml static class object instance", function () {
      var d = new mxCell(
        '<p style="margin:0px;margin-top:4px;text-align:center;"><b>Class</b></p><hr size="1" style="border-style:solid;"/><div style="height:2px;"></div><hr size="1" style="border-style:solid;"/><div style="height:2px;"></div>',
        new mxGeometry(0, 0, 140, 60),
        "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      );
      d.vertex = !0;
      return b.createVertexTemplateFromCells(
        [d.clone()],
        d.geometry.width,
        d.geometry.height,
        "Class 4",
      );
    }),
    this.addEntry("uml static class object instance", function () {
      var d = new mxCell(
        '<p style="margin:0px;margin-top:4px;text-align:center;"><b>Class</b></p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:4px;">+ field: Type</p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:4px;">+ method(): Type</p>',
        new mxGeometry(0, 0, 160, 90),
        "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      );
      d.vertex = !0;
      return b.createVertexTemplateFromCells(
        [d.clone()],
        d.geometry.width,
        d.geometry.height,
        "Class 5",
      );
    }),
    this.addEntry("uml static class object instance", function () {
      var d = new mxCell(
        '<p style="margin:0px;margin-top:4px;text-align:center;"><i>&lt;&lt;Interface&gt;&gt;</i><br/><b>Interface</b></p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:4px;">+ field1: Type<br/>+ field2: Type</p><hr size="1" style="border-style:solid;"/><p style="margin:0px;margin-left:4px;">+ method1(Type): Type<br/>+ method2(Type, Type): Type</p>',
        new mxGeometry(0, 0, 190, 140),
        "verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;",
      );
      d.vertex = !0;
      return b.createVertexTemplateFromCells(
        [d.clone()],
        d.geometry.width,
        d.geometry.height,
        "Interface 2",
      );
    }),
    this.createVertexTemplateEntry(
      "shape=providedRequiredInterface;html=1;verticalLabelPosition=bottom;sketch=0;",
      20,
      20,
      "",
      "Provided/Required Interface",
      null,
      null,
      "uml provided required interface lollipop notation",
    ),
    this.createVertexTemplateEntry(
      "shape=requiredInterface;html=1;verticalLabelPosition=bottom;sketch=0;",
      10,
      20,
      "",
      "Required Interface",
      null,
      null,
      "uml required interface lollipop notation",
    ),
    this.addDataEntry(
      "uml lollipop notation provided required interface",
      20,
      20,
      "Required Interface",
      "jVNBbuMwDHyN7o6N9L5x2l66QIEe9qy1GUutIhoUHTt9/VKWNo7bBu0hgDicYeQZSlX1cXok3Zvf2IJT1b2qakLkdDpONTinysK2qtqrsizkp8qHG93N3C16TeD5J4IyCU7aDZCQBAQ+uwwQDr6FyC9UtUNigx167Z4QewE3Ar4C8/nFvkeFHhgFMnx0uQu+/UWEo5RGu0NtqYmzI/5gncuDpcoT7qQKTPgGf2zLJk8Jb8CNyeQDes7sTSl1M9BpvmJkpi+AtoOVKaypg2xK9dmnmZVNegQ8AtNZKAROsz2tR+mQyu7Cu0if0crEspiyv9ukOKdyu9YHHKiBLFlSksPVHRZozu7rHKvvcxSB7UM0fjSW4aXXTeyMsnvrvLSznZdzI94ARSD00ESbDnaKLu8OEluNDqW59+jhEtgHkCDYd/13vkGMrQey8lFxaJ7+vCA7QtZ8xdbO4ThvTvivj07N3m13aruP6ziws17+1/t0xWUBTkAM0813cSPvMa9cZKSnUxiwneE19tUGrOJbspJyec8p2uvn/g8=",
    ),
    this.addEntry(
      "uml lollipop notation provided required interface",
      function () {
        return b.createVertexTemplateFromData(
          "zZRNb9swDIZ/je6O3ey+OGsvG1Cgh55Vm7G0KqJB07HTXz/KUux4bbBdNvRgQHz5IYmPTFWUx/GBdGt+YA1OFd9UURIix9VxLME5lWe2VsVe5Xkmn8rvb3g3kzdrNYHnv0koYsJJux6iEoWOzy4JhL2vIcRnqtghscEGvXbfEVsRNyL+BObzk30LGbpnFMnw0SUv+PorEQ5iGu0OpaUq1A76vXUuFRYrVfgiVseEr/BsazapSvcKXJkUHA8JdQOre7OmBtK97963YopKfXgAPALTWUIInGZ7WpfSXTSbOW5OfUQrFfNsTBvFDmfnaG7X+R32VEFKWUDI4uoMizTh+RhV/n9RoWz0DtIKQroakJVbAD21urK+Sc6I4oZzYb35NDT/Nb67P+OTBNt24dcYjGUIPQueQabDGpN2tvGyrqQZQEHoWqhCXw52DPx3B2FWokNx7j16mH+p30SCzr7pl+kEAUV7ATZXf1yUHSFrvorWzuEwPZjukh86NfVuu1PbfXiFPTvrZV/v4xE3M/ETEMN4c3LdAHxJSKSGNCOClP5EA7YxvNY+egErmgs6MZcBHElfz+df",
          40,
          10,
          "Lollipop Notation",
        );
      },
    ),
    this.createVertexTemplateEntry(
      "shape=umlBoundary;whiteSpace=wrap;html=1;",
      100,
      80,
      "Boundary Object",
      "Boundary Object",
      null,
      null,
      "uml boundary object",
    ),
    this.createVertexTemplateEntry(
      "ellipse;shape=umlEntity;whiteSpace=wrap;html=1;",
      80,
      80,
      "Entity Object",
      "Entity Object",
      null,
      null,
      "uml entity object",
    ),
    this.createVertexTemplateEntry(
      "ellipse;shape=umlControl;whiteSpace=wrap;html=1;",
      70,
      80,
      "Control Object",
      "Control Object",
      null,
      null,
      "uml control object",
    ),
    this.createVertexTemplateEntry(
      "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",
      30,
      60,
      "Actor",
      "Actor",
      !1,
      null,
      "uml actor",
    ),
    this.createVertexTemplateEntry(
      "ellipse;whiteSpace=wrap;html=1;",
      140,
      70,
      "Use Case",
      "Use Case",
      null,
      null,
      "uml use case usecase",
    ),
    this.addEntry("uml activity state start", function () {
      var d = new mxCell(
        "",
        new mxGeometry(0, 0, 30, 30),
        "ellipse;html=1;shape=startState;fillColor=#000000;strokeColor=#ff0000;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;verticalAlign=bottom;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      h.geometry.setTerminalPoint(new mxPoint(15, 90), !1);
      h.geometry.relative = !0;
      h.edge = !0;
      d.insertEdge(h, !0);
      return b.createVertexTemplateFromCells([d, h], 30, 90, "Start");
    }),
    this.addEntry("uml activity state", function () {
      var d = new mxCell(
        "Activity",
        new mxGeometry(0, 0, 120, 40),
        "rounded=1;whiteSpace=wrap;html=1;arcSize=40;fontColor=#000000;fillColor=#ffffc0;strokeColor=#ff0000;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;verticalAlign=bottom;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      h.geometry.setTerminalPoint(new mxPoint(60, 100), !1);
      h.geometry.relative = !0;
      h.edge = !0;
      d.insertEdge(h, !0);
      return b.createVertexTemplateFromCells([d, h], 120, 100, "Activity");
    }),
    this.addEntry("uml activity composite state", function () {
      var d = new mxCell(
        "Composite State",
        new mxGeometry(0, 0, 160, 60),
        "swimlane;fontStyle=1;align=center;verticalAlign=middle;childLayout=stackLayout;horizontal=1;startSize=30;horizontalStack=0;resizeParent=0;resizeLast=1;container=0;fontColor=#000000;collapsible=0;rounded=1;arcSize=30;strokeColor=#ff0000;fillColor=#ffffc0;swimlaneFillColor=#ffffc0;dropTarget=0;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "Subtitle",
        new mxGeometry(0, 0, 200, 26),
        "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;spacingLeft=4;spacingRight=4;whiteSpace=wrap;overflow=hidden;rotatable=0;fontColor=#000000;",
      );
      h.vertex = !0;
      d.insert(h);
      h = new mxCell(
        "",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;verticalAlign=bottom;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      h.geometry.setTerminalPoint(new mxPoint(80, 120), !1);
      h.geometry.relative = !0;
      h.edge = !0;
      d.insertEdge(h, !0);
      return b.createVertexTemplateFromCells(
        [d, h],
        160,
        120,
        "Composite State",
      );
    }),
    this.addEntry("uml activity condition", function () {
      var d = new mxCell(
        "Condition",
        new mxGeometry(0, 0, 80, 40),
        "rhombus;whiteSpace=wrap;html=1;fontColor=#000000;fillColor=#ffffc0;strokeColor=#ff0000;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "no",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;align=left;verticalAlign=bottom;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      h.geometry.setTerminalPoint(new mxPoint(180, 20), !1);
      h.geometry.relative = !0;
      h.geometry.x = -1;
      h.edge = !0;
      d.insertEdge(h, !0);
      var m = new mxCell(
        "yes",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;align=left;verticalAlign=top;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      m.geometry.setTerminalPoint(new mxPoint(40, 100), !1);
      m.geometry.relative = !0;
      m.geometry.x = -1;
      m.edge = !0;
      d.insertEdge(m, !0);
      return b.createVertexTemplateFromCells([d, h, m], 180, 100, "Condition");
    }),
    this.addEntry("uml activity fork join", function () {
      var d = new mxCell(
        "",
        new mxGeometry(0, 0, 200, 10),
        "shape=line;html=1;strokeWidth=6;strokeColor=#ff0000;",
      );
      d.vertex = !0;
      var h = new mxCell(
        "",
        new mxGeometry(0, 0, 0, 0),
        "edgeStyle=orthogonalEdgeStyle;html=1;verticalAlign=bottom;endArrow=open;endSize=8;strokeColor=#ff0000;",
      );
      h.geometry.setTerminalPoint(new mxPoint(100, 80), !1);
      h.geometry.relative = !0;
      h.edge = !0;
      d.insertEdge(h, !0);
      return b.createVertexTemplateFromCells([d, h], 200, 80, "Fork/Join");
    }),
    this.createVertexTemplateEntry(
      "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#ff0000;",
      30,
      30,
      "",
      "End",
      null,
      null,
      "uml activity state end",
    ),
    this.createVertexTemplateEntry(
      'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
      100,
      300,
      ":Object",
      "Lifeline",
      null,
      null,
      "uml sequence participant lifeline",
    ),
    this.createVertexTemplateEntry(
      'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};participant=umlActor;',
      20,
      300,
      "",
      "Actor Lifeline",
      null,
      null,
      "uml sequence participant lifeline actor",
    ),
    this.createVertexTemplateEntry(
      'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};participant=umlBoundary;',
      50,
      300,
      "",
      "Boundary Lifeline",
      null,
      null,
      "uml sequence participant lifeline boundary",
    ),
    this.createVertexTemplateEntry(
      'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};participant=umlEntity;',
      40,
      300,
      "",
      "Entity Lifeline",
      null,
      null,
      "uml sequence participant lifeline entity",
    ),
    this.createVertexTemplateEntry(
      'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};participant=umlControl;',
      40,
      300,
      "",
      "Control Lifeline",
      null,
      null,
      "uml sequence participant lifeline control",
    ),
    this.createVertexTemplateEntry(
      "shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;",
      300,
      200,
      "frame",
      "Frame",
      null,
      null,
      "uml sequence frame",
    ),
    this.createVertexTemplateEntry(
      "shape=umlDestroy;whiteSpace=wrap;html=1;strokeWidth=3;targetShapes=umlLifeline;",
      30,
      30,
      "",
      "Destruction",
      null,
      null,
      "uml sequence destruction destroy",
    ),
    this.addEntry(
      "uml sequence invoke invocation call activation bar",
      function () {
        var d = new mxCell(
          "",
          new mxGeometry(0, 0, 10, 80),
          'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
        );
        d.vertex = !0;
        var h = new mxCell(
          "dispatch",
          new mxGeometry(0, 0, 0, 0),
          "html=1;verticalAlign=bottom;startArrow=oval;endArrow=block;startSize=8;curved=0;rounded=0;entryX=0;entryY=0;entryDx=0;entryDy=5;",
        );
        h.geometry.setTerminalPoint(new mxPoint(-70, 5), !0);
        h.geometry.relative = !0;
        h.edge = !0;
        d.insertEdge(h, !1);
        return b.createVertexTemplateFromCells([d, h], 10, 80, "Found Message");
      },
    ),
    this.addEntry(
      "uml sequence invoke call delegation synchronous invocation activation bar",
      function () {
        var d = new mxCell(
          "",
          new mxGeometry(0, 0, 10, 80),
          'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
        );
        d.vertex = !0;
        var h = new mxCell(
          "dispatch",
          new mxGeometry(0, 0, 0, 0),
          "html=1;verticalAlign=bottom;endArrow=block;curved=0;rounded=0;entryX=0;entryY=0;entryDx=0;entryDy=5;",
        );
        h.geometry.setTerminalPoint(new mxPoint(-70, 5), !0);
        h.geometry.relative = !0;
        h.edge = !0;
        d.insertEdge(h, !1);
        var m = new mxCell(
          "return",
          new mxGeometry(0, 0, 0, 0),
          "html=1;verticalAlign=bottom;endArrow=open;dashed=1;endSize=8;curved=0;rounded=0;exitX=0;exitY=1;exitDx=0;exitDy=-5;",
        );
        m.geometry.setTerminalPoint(new mxPoint(-70, 75), !1);
        m.geometry.relative = !0;
        m.edge = !0;
        d.insertEdge(m, !0);
        return b.createVertexTemplateFromCells(
          [d, h, m],
          10,
          80,
          "Synchronous Invocation",
        );
      },
    ),
    this.addEntry(
      "uml sequence self call recursion delegation activation bar",
      function () {
        var d = new mxCell(
          "",
          new mxGeometry(-5, 20, 10, 40),
          'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
        );
        d.vertex = !0;
        var h = new mxCell(
          "self call",
          new mxGeometry(0, 0, 0, 0),
          "html=1;align=left;spacingLeft=2;endArrow=block;rounded=0;edgeStyle=orthogonalEdgeStyle;curved=0;rounded=0;",
        );
        h.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
        h.geometry.points = [new mxPoint(30, 30)];
        h.geometry.relative = !0;
        h.edge = !0;
        d.insertEdge(h, !1);
        return b.createVertexTemplateFromCells([d, h], 10, 60, "Self Call");
      },
    ),
    this.addEntry(
      "uml sequence invoke call delegation callback activation bar",
      function () {
        var d = new mxCell(
          "",
          new mxGeometry(0, 0, 10, 80),
          'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
        );
        d.vertex = !0;
        var h = new mxCell(
          "callback",
          new mxGeometry(0, 0, 0, 0),
          "html=1;verticalAlign=bottom;endArrow=block;curved=0;rounded=0;entryX=1;entryY=0;entryDx=0;entryDy=5;",
        );
        h.geometry.setTerminalPoint(new mxPoint(80, 5), !0);
        h.geometry.relative = !0;
        h.edge = !0;
        d.insertEdge(h, !1);
        var m = new mxCell(
          "return",
          new mxGeometry(0, 0, 0, 0),
          "html=1;verticalAlign=bottom;endArrow=open;dashed=1;endSize=8;curved=0;rounded=0;exitX=1;exitY=1;exitDx=0;exitDy=-5;",
        );
        m.geometry.setTerminalPoint(new mxPoint(80, 75), !1);
        m.geometry.relative = !0;
        m.edge = !0;
        d.insertEdge(m, !0);
        return b.createVertexTemplateFromCells([d, h, m], 10, 80, "Callback");
      },
    ),
    this.createVertexTemplateEntry(
      'html=1;points=[[0,0,0,0,5],[0,1,0,0,-5],[1,0,0,0,5],[1,1,0,0,-5]];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={"curved":0,"rounded":0};',
      10,
      80,
      "",
      "Activation Bar",
      null,
      null,
      "uml sequence activation bar",
    ),
    this.createEdgeTemplateEntry(
      "html=1;verticalAlign=bottom;startArrow=oval;startFill=1;endArrow=block;startSize=8;curved=0;rounded=0;",
      60,
      0,
      "dispatch",
      "Found Message 1",
      null,
      "uml sequence message call invoke dispatch",
    ),
    this.createEdgeTemplateEntry(
      "html=1;verticalAlign=bottom;startArrow=circle;startFill=1;endArrow=open;startSize=6;endSize=8;curved=0;rounded=0;",
      80,
      0,
      "dispatch",
      "Found Message 2",
      null,
      "uml sequence message call invoke dispatch",
    ),
    this.createEdgeTemplateEntry(
      "html=1;verticalAlign=bottom;endArrow=block;curved=0;rounded=0;",
      80,
      0,
      "dispatch",
      "Message",
      null,
      "uml sequence message call invoke dispatch",
    ),
    this.addEntry("uml sequence return message", function () {
      var d = new mxCell(
        "return",
        new mxGeometry(0, 0, 0, 0),
        "html=1;verticalAlign=bottom;endArrow=open;dashed=1;endSize=8;curved=0;rounded=0;",
      );
      d.geometry.setTerminalPoint(new mxPoint(80, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !1);
      d.geometry.relative = !0;
      d.edge = !0;
      return b.createEdgeTemplateFromCells([d], 80, 0, "Return");
    }),
    this.addEntry("uml relation", function () {
      var d = new mxCell(
        "name",
        new mxGeometry(0, 0, 0, 0),
        "endArrow=block;endFill=1;html=1;edgeStyle=orthogonalEdgeStyle;align=left;verticalAlign=top;",
      );
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
      d.geometry.relative = !0;
      d.geometry.x = -1;
      d.edge = !0;
      var h = new mxCell(
        "1",
        new mxGeometry(-1, 0, 0, 0),
        "edgeLabel;resizable=0;html=1;align=left;verticalAlign=bottom;",
      );
      h.geometry.relative = !0;
      h.setConnectable(!1);
      h.vertex = !0;
      d.insert(h);
      return b.createEdgeTemplateFromCells([d], 160, 0, "Relation 1");
    }),
    this.addEntry("uml association", function () {
      var d = new mxCell(
        "",
        new mxGeometry(0, 0, 0, 0),
        "endArrow=none;html=1;edgeStyle=orthogonalEdgeStyle;",
      );
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
      d.geometry.relative = !0;
      d.edge = !0;
      var h = new mxCell(
        "parent",
        new mxGeometry(-1, 0, 0, 0),
        "edgeLabel;resizable=0;html=1;align=left;verticalAlign=bottom;",
      );
      h.geometry.relative = !0;
      h.setConnectable(!1);
      h.vertex = !0;
      d.insert(h);
      h = new mxCell(
        "child",
        new mxGeometry(1, 0, 0, 0),
        "edgeLabel;resizable=0;html=1;align=right;verticalAlign=bottom;",
      );
      h.geometry.relative = !0;
      h.setConnectable(!1);
      h.vertex = !0;
      d.insert(h);
      return b.createEdgeTemplateFromCells([d], 160, 0, "Association 1");
    }),
    this.addEntry("uml aggregation", function () {
      var d = new mxCell(
        "1",
        new mxGeometry(0, 0, 0, 0),
        "endArrow=open;html=1;endSize=12;startArrow=diamondThin;startSize=14;startFill=0;edgeStyle=orthogonalEdgeStyle;align=left;verticalAlign=bottom;",
      );
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
      d.geometry.relative = !0;
      d.geometry.x = -1;
      d.geometry.y = 3;
      d.edge = !0;
      return b.createEdgeTemplateFromCells([d], 160, 0, "Aggregation 1");
    }),
    this.addEntry("uml composition", function () {
      var d = new mxCell(
        "1",
        new mxGeometry(0, 0, 0, 0),
        "endArrow=open;html=1;endSize=12;startArrow=diamondThin;startSize=14;startFill=1;edgeStyle=orthogonalEdgeStyle;align=left;verticalAlign=bottom;",
      );
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
      d.geometry.relative = !0;
      d.geometry.x = -1;
      d.geometry.y = 3;
      d.edge = !0;
      return b.createEdgeTemplateFromCells([d], 160, 0, "Composition 1");
    }),
    this.addEntry("uml relation", function () {
      var d = new mxCell(
        "Relation",
        new mxGeometry(0, 0, 0, 0),
        "endArrow=open;html=1;endSize=12;startArrow=diamondThin;startSize=14;startFill=0;edgeStyle=orthogonalEdgeStyle;",
      );
      d.geometry.setTerminalPoint(new mxPoint(0, 0), !0);
      d.geometry.setTerminalPoint(new mxPoint(160, 0), !1);
      d.geometry.relative = !0;
      d.edge = !0;
      var h = new mxCell(
        "0..n",
        new mxGeometry(-1, 0, 0, 0),
        "edgeLabel;resizable=0;html=1;align=left;verticalAlign=top;",
      );
      h.geometry.relative = !0;
      h.setConnectable(!1);
      h.vertex = !0;
      d.insert(h);
      h = new mxCell(
        "1",
        new mxGeometry(1, 0, 0, 0),
        "edgeLabel;resizable=0;html=1;align=right;verticalAlign=top;",
      );
      h.geometry.relative = !0;
      h.setConnectable(!1);
      h.vertex = !0;
      d.insert(h);
      return b.createEdgeTemplateFromCells([d], 160, 0, "Relation 2");
    }),
    this.createEdgeTemplateEntry(
      "endArrow=open;endSize=12;dashed=1;html=1;",
      160,
      0,
      "Use",
      "Dependency",
      null,
      "uml dependency use",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=block;endSize=16;endFill=0;html=1;",
      160,
      0,
      "Extends",
      "Generalization",
      null,
      "uml generalization extend",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=block;startArrow=block;endFill=1;startFill=1;html=1;",
      160,
      0,
      "",
      "Association 2",
      null,
      "uml association",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=open;startArrow=circlePlus;endFill=0;startFill=0;endSize=8;html=1;",
      160,
      0,
      "",
      "Inner Class",
      null,
      "uml inner class",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=open;startArrow=cross;endFill=0;startFill=0;endSize=8;startSize=10;html=1;",
      160,
      0,
      "",
      "Terminate",
      null,
      "uml terminate",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=block;dashed=1;endFill=0;endSize=12;html=1;",
      160,
      0,
      "",
      "Implementation",
      null,
      "uml realization implementation",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=diamondThin;endFill=0;endSize=24;html=1;",
      160,
      0,
      "",
      "Aggregation 2",
      null,
      "uml aggregation",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=diamondThin;endFill=1;endSize=24;html=1;",
      160,
      0,
      "",
      "Composition 2",
      null,
      "uml composition",
    ),
    this.createEdgeTemplateEntry(
      "endArrow=open;endFill=1;endSize=12;html=1;",
      160,
      0,
      "",
      "Association 3",
      null,
      "uml association",
    ),
  ];
  this.addPaletteFunctions("uml", mxResources.get("uml"), a || !1, g);
  this.setCurrentSearchEntryLibrary();
};
Sidebar.prototype.createTitle = function (a) {
  var b = document.createElement("a");
  b.setAttribute("title", mxResources.get("sidebarTooltip"));
  b.className = "geTitle";
  var f = document.createElement("span");
  mxUtils.write(f, a);
  b.appendChild(f);
  return b;
};
Sidebar.prototype.createThumb = function (a, b, f, e, g, d, h, m, p, k, u, w) {
  this.graph.labelsVisible = null == d || d;
  d = mxClient.NO_FO;
  mxClient.NO_FO = Editor.prototype.originalNoForeignObject;
  this.graph.shapeForegroundColor = "light-dark(#000000, #ffffff)";
  this.graph.shapeBackgroundColor =
    null != k
      ? k
      : "light-dark(var(--ge-panel-color), var(--ge-dark-panel-color))";
  this.graph.view.scaleAndTranslate(null != w ? w : 1, 0, 0);
  this.graph.addCells(a);
  a = this.graph.getGraphBounds();
  null == w &&
    ((k =
      Math.floor(
        100 *
          Math.min(
            (b - 2 * this.thumbBorder) / a.width,
            (f - 2 * this.thumbBorder) / a.height,
          ),
      ) / 100),
    this.graph.view.scaleAndTranslate(
      k,
      (b - a.width * k) / 2 / k - a.x,
      (f - a.height * k) / 2 / k - a.y,
    ));
  this.graph.dialect != mxConstants.DIALECT_SVG ||
  mxClient.NO_FO ||
  null == this.graph.view.getCanvas().ownerSVGElement
    ? ((k = this.graph.container.cloneNode(!1)),
      (k.innerHTML = this.graph.container.innerHTML))
    : (k = this.graph.view.getCanvas().ownerSVGElement.cloneNode(!0));
  this.graph.getModel().clear();
  this.graph.view.scaleAndTranslate(1, 0, 0);
  mxClient.NO_FO = d;
  k.style.position = "relative";
  k.style.overflow = null != w ? "visible" : "hidden";
  k.style.left = (null != u ? u : this.thumbBorder - 1) + "px";
  k.style.top = k.style.left;
  k.style.width = b + "px";
  k.style.height = f + "px";
  k.style.visibility = "";
  k.style.minWidth = "";
  k.style.minHeight = "";
  this.disablePointerEvents(k);
  e.appendChild(k);
  this.sidebarTitles &&
    null != g &&
    0 != h &&
    ((e.style.height = this.thumbHeight + 0 + this.sidebarTitleSize + 8 + "px"),
    (b = document.createElement("div")),
    (b.style.color = Editor.isDarkMode() ? "#A0A0A0" : "#303030"),
    (b.style.fontSize = this.sidebarTitleSize + "px"),
    (b.style.textAlign = "center"),
    (b.style.whiteSpace = "nowrap"),
    (b.style.overflow = "hidden"),
    (b.style.textOverflow = "ellipsis"),
    mxClient.IS_IE && (b.style.height = this.sidebarTitleSize + 12 + "px"),
    (b.style.paddingTop = "4px"),
    mxUtils.write(b, g),
    e.appendChild(b));
  return a;
};
Sidebar.prototype.createSection = function (a) {
  return mxUtils.bind(this, function () {
    var b = document.createElement("div");
    b.setAttribute("title", a);
    b.style.textOverflow = "ellipsis";
    b.style.whiteSpace = "nowrap";
    b.style.textAlign = "center";
    b.style.overflow = "hidden";
    b.style.width = "100%";
    b.style.padding = "14px 0";
    mxUtils.write(b, a);
    return b;
  });
};
Sidebar.prototype.createItem = function (
  a,
  b,
  f,
  e,
  g,
  d,
  h,
  m,
  p,
  k,
  u,
  w,
  y,
  C,
) {
  m = null != m ? m : !0;
  k = null != k ? k : this.thumbWidth;
  u = null != u ? u : this.thumbHeight;
  var D = document.createElement("a"),
    E = 2 * this.thumbBorder;
  D.style.width = k + E + "px";
  D.style.height = u + E + "px";
  mxEvent.addListener(D, "click", function (J) {
    mxEvent.consume(J);
  });
  var G = new mxRectangle(0, 0, g, d);
  null != a && 0 < a.length
    ? ((E = a),
      (a = this.graph.cloneCells(a)),
      this.graph.pasteCellStyles(
        this.graph.includeDescendants(E),
        this.initialDefaultVertexStyle,
        this.initialDefaultEdgeStyle,
      ),
      null != w
        ? ((D.className = "geButton"),
          (D.style.backgroundImage = "url(" + w + ")"),
          (D.style.backgroundRepeat = "no-repeat"),
          (D.style.backgroundPosition = "center"),
          (D.style.backgroundSize = "24px 24px"))
        : ((D.className = "geItem"),
          this.createThumb(E, k, u, D, b, f, e, g, d)),
      1 < a.length || a[0].vertex
        ? ((e = this.createDragSource(
            D,
            this.createDropHandler(a, !0, h, G, y, C),
            this.createDragPreview(g, d),
            a,
            G,
            y,
          )),
          this.addClickHandler(D, e, a, p, y),
          (e.isGuidesEnabled = mxUtils.bind(this, function () {
            return this.editorUi.editor.graph.graphHandler.guidesEnabled;
          })))
        : null != a[0] &&
          a[0].edge &&
          ((e = this.createDragSource(
            D,
            this.createDropHandler(a, !1, h, G, y, C),
            this.createDragPreview(g, d),
            a,
            G,
            y,
          )),
          this.addClickHandler(D, e, a, p)),
      !mxClient.IS_IOS &&
        m &&
        mxEvent.addGestureListeners(
          D,
          null,
          mxUtils.bind(this, function (J) {
            mxEvent.isMouseEvent(J) &&
              this.showTooltip(D, a, G.width, G.height, b, f);
          }),
        ))
    : ((D.style.backgroundImage = "url(" + Editor.svgBrokenImage.src + ")"),
      D.setAttribute("title", b));
  return D;
};
Sidebar.prototype.createDropHandler = function (a, b, f, e, g, d) {
  f = null != f ? f : !0;
  return mxUtils.bind(this, function (h, m, p, k, u, w) {
    for (
      w = w
        ? null
        : mxEvent.isTouchEvent(m) || mxEvent.isPenEvent(m)
          ? document.elementFromPoint(
              mxEvent.getClientX(m),
              mxEvent.getClientY(m),
            )
          : mxEvent.getSource(m);
      null != w && w != this.container;

    )
      w = w.parentNode;
    if (null == w && h.isEnabled()) {
      a = h.getImportableCells(a);
      if (0 < a.length) {
        h.stopEditing();
        w =
          null == p || mxEvent.isAltDown(m) ? !1 : h.isValidDropTarget(p, a, m);
        var y = null;
        null == p || w || (p = null);
        if (!h.isCellLocked(p || h.getDefaultParent())) {
          h.model.beginUpdate();
          try {
            k = Math.round(k);
            u = Math.round(u);
            if (b && h.isSplitTarget(p, a, m)) {
              var C = h.view.scale,
                D = h.view.translate,
                E = (k + D.x) * C,
                G = (u + D.y) * C,
                J = h.cloneCells(a);
              h.splitEdge(p, J, null, k - e.width / 2, u - e.height / 2, E, G);
              y = J;
            } else if (
              0 < a.length &&
              ((y = h.importCells(a, k, u, p)),
              h.model.isVertex(d) && 1 == y.length && h.model.isVertex(y[0]))
            ) {
              var M = h.insertEdge(
                h.model.getParent(d),
                null,
                "",
                d,
                y[0],
                h.createCurrentEdgeStyle(),
              );
              h.applyNewEdgeStyle(d, [M]);
              y.push(M);
              h.connectionHandler.insertBeforeSource &&
                h.insertEdgeBeforeCell(M, d);
            }
            if (null != h.layoutManager) {
              var Q = h.layoutManager.getLayout(p);
              if (null != Q) {
                C = h.view.scale;
                D = h.view.translate;
                E = (k + D.x) * C;
                G = (u + D.y) * C;
                for (var K = 0; K < y.length; K++) Q.moveCell(y[K], E, G);
              }
            }
            !f ||
              (null != m && mxEvent.isShiftDown(m)) ||
              h.fireEvent(new mxEventObject("cellsInserted", "cells", y));
            for (K = 0; K < y.length; K++)
              h.model.isVertex(y[K]) &&
                h.isAutoSizeCell(y[K]) &&
                h.updateCellSize(y[K]);
          } catch (W) {
            this.editorUi.handleError(W);
          } finally {
            h.model.endUpdate();
          }
          null != y &&
            0 < y.length &&
            (h.scrollCellToVisible(y[0]), h.setSelectionCells(y));
          (g ||
            (h.editAfterInsert &&
              null != m &&
              mxEvent.isMouseEvent(m) &&
              null != y &&
              1 == y.length)) &&
            window.setTimeout(function () {
              h.startEditing(y[0]);
            }, 0);
        }
      }
      mxEvent.consume(m);
    }
  });
};
Sidebar.prototype.createDragPreview = function (a, b) {
  var f = document.createElement("div");
  f.className = "geDragPreview";
  f.style.width = a + "px";
  f.style.height = b + "px";
  return f;
};
Sidebar.prototype.dropAndConnect = function (a, b, f, e, g, d, h) {
  var m = this.editorUi.editor.graph,
    p = m.model.isEdge(a) || null != d ? d : h;
  p = this.getDropAndConnectGeometry(a, b[p], f, b);
  var k = [];
  if (null != p) {
    var u = null;
    m.model.beginUpdate();
    try {
      var w = m.getCellGeometry(a),
        y = m.getCellGeometry(b[e]),
        C = m.model.getParent(a),
        D = !0;
      if (null != m.layoutManager) {
        var E = m.layoutManager.getLayout(C);
        null != E && E.constructor == mxStackLayout && (D = !1);
      }
      k = m.model.isEdge(a) ? null : m.view.getState(C);
      var G = (E = 0);
      if (null != k) {
        var J = k.origin;
        E = J.x;
        G = J.y;
      }
      var M =
          !m.isTableRow(a) &&
          !m.isTableCell(a) &&
          (m.model.isEdge(a) || (null != w && !w.relative && D)),
        Q = m.getCellAt(
          (p.x + E + m.view.translate.x) * m.view.scale,
          (p.y + G + m.view.translate.y) * m.view.scale,
          null,
          null,
          null,
          function (ca, H, S) {
            return !m.isContainer(ca.cell);
          },
        );
      if (null != Q && Q != C)
        ((k = m.view.getState(Q)),
          null != k &&
            ((J = k.origin),
            (C = Q),
            (M = !0),
            m.model.isEdge(a) || ((p.x -= J.x - E), (p.y -= J.y - G))));
      else if (!D || m.isTableRow(a) || m.isTableCell(a))
        ((p.x += E), (p.y += G));
      E = y.x;
      G = y.y;
      m.model.isEdge(b[e]) && (G = E = 0);
      k = b = m.importCells(
        b,
        p.x - (M ? E : 0),
        p.y - (M ? G : 0),
        M ? C : null,
      );
      if (m.model.isEdge(a))
        (m.model.setTerminal(a, b[e], f == mxConstants.DIRECTION_NORTH),
          null != h &&
            null != d &&
            (m.model.remove(b[h]), m.updateShapes(b[h], [a])));
      else if (m.model.isEdge(b[e]) && null == d) {
        m.model.setTerminal(b[e], a, !0);
        var K = m.getCellGeometry(b[e]),
          W = null != K ? K.getTerminalPoint(!0) : null;
        K.points = null;
        if (null != W)
          for (f = 0; f < b.length; f++)
            if (m.model.isEdge(b[f]) && f != e) {
              var X = m.getCellGeometry(b[f]),
                T = null != X ? X.getTerminalPoint(!0) : null;
              null != T &&
                T.x == W.x &&
                T.y == W.y &&
                m.model.setTerminal(b[f], a, !0);
            }
        if (null != K.getTerminalPoint(!1))
          K.setTerminalPoint(p.getTerminalPoint(!1), !1);
        else if (M && m.model.isVertex(C)) {
          var N = m.view.getState(C);
          J = N.cell != m.view.currentRoot ? N.origin : new mxPoint(0, 0);
          m.cellsMoved(b, J.x, J.y, null, null, !0);
        }
      } else
        null != d &&
          ((y = m.getCellGeometry(b[d])),
          (E = p.x - Math.round(y.x)),
          (G = p.y - Math.round(y.y)),
          (p.x = Math.round(y.x)),
          (p.y = Math.round(y.y)),
          m.model.setGeometry(b[e], p),
          m.cellsMoved(b, E, G, null, null, !0),
          (k = b.slice()),
          (u = 1 == k.length ? k[0] : null),
          null != h
            ? m.model.setTerminal(b[h], a, !0)
            : b.push(
                m.insertEdge(
                  null,
                  null,
                  "",
                  a,
                  b[e],
                  m.createCurrentEdgeStyle(),
                ),
              ));
      (null != g && mxEvent.isShiftDown(g)) ||
        m.fireEvent(new mxEventObject("cellsInserted", "cells", b));
    } catch (ca) {
      this.editorUi.handleError(ca);
    } finally {
      m.model.endUpdate();
    }
    m.editAfterInsert &&
      null != g &&
      mxEvent.isMouseEvent(g) &&
      null != u &&
      window.setTimeout(function () {
        m.startEditing(u);
      }, 0);
  }
  null != h && 1 < k.length && k.splice(h, 1);
  return k;
};
Sidebar.prototype.getDropAndConnectGeometry = function (a, b, f, e) {
  var g = this.editorUi.editor.graph,
    d = g.view,
    h = 1 < e.length,
    m = g.view.getState(a),
    p = g.getCellGeometry(a);
  e = g.getCellGeometry(b);
  null != m &&
    null != p &&
    null != e &&
    ((e = e.clone()),
    g.model.isEdge(a)
      ? ((p = m.absolutePoints),
        (b = p[0]),
        (g = p[p.length - 1]),
        f == mxConstants.DIRECTION_NORTH
          ? ((e.x = b.x / d.scale - d.translate.x - e.width / 2),
            (e.y = b.y / d.scale - d.translate.y - e.height / 2))
          : ((e.x = g.x / d.scale - d.translate.x - e.width / 2),
            (e.y = g.y / d.scale - d.translate.y - e.height / 2)))
      : (p.relative &&
          ((p = p.clone()),
          (p.x = (m.x - d.translate.x) / d.scale),
          (p.y = (m.y - d.translate.y) / d.scale)),
        (d = g.defaultEdgeLength),
        g.model.isEdge(b) &&
        null != e.getTerminalPoint(!0) &&
        null != e.getTerminalPoint(!1)
          ? ((b = e.getTerminalPoint(!0)),
            (g = e.getTerminalPoint(!1)),
            (d = g.x - b.x),
            (b = g.y - b.y),
            (d = Math.sqrt(d * d + b * b)),
            (e.x = p.getCenterX()),
            (e.y = p.getCenterY()),
            (e.width = 1),
            (e.height = 1),
            f == mxConstants.DIRECTION_NORTH
              ? ((e.height = d),
                (e.y = p.y - d),
                e.setTerminalPoint(new mxPoint(e.x, e.y), !1))
              : f == mxConstants.DIRECTION_EAST
                ? ((e.width = d),
                  (e.x = p.x + p.width),
                  e.setTerminalPoint(new mxPoint(e.x + e.width, e.y), !1))
                : f == mxConstants.DIRECTION_SOUTH
                  ? ((e.height = d),
                    (e.y = p.y + p.height),
                    e.setTerminalPoint(new mxPoint(e.x, e.y + e.height), !1))
                  : f == mxConstants.DIRECTION_WEST &&
                    ((e.width = d),
                    (e.x = p.x - d),
                    e.setTerminalPoint(new mxPoint(e.x, e.y), !1)))
          : (!h &&
              45 < e.width &&
              45 < e.height &&
              45 < p.width &&
              45 < p.height &&
              ((e.width *= p.height / e.height), (e.height = p.height)),
            (e.x = p.x + p.width / 2 - e.width / 2),
            (e.y = p.y + p.height / 2 - e.height / 2),
            f == mxConstants.DIRECTION_NORTH
              ? (e.y = e.y - p.height / 2 - e.height / 2 - d)
              : f == mxConstants.DIRECTION_EAST
                ? (e.x = e.x + p.width / 2 + e.width / 2 + d)
                : f == mxConstants.DIRECTION_SOUTH
                  ? (e.y = e.y + p.height / 2 + e.height / 2 + d)
                  : f == mxConstants.DIRECTION_WEST &&
                    (e.x = e.x - p.width / 2 - e.width / 2 - d),
            g.model.isEdge(b) &&
              null != e.getTerminalPoint(!0) &&
              null != b.getTerminal(!1) &&
              ((p = g.getCellGeometry(b.getTerminal(!1))),
              null != p &&
                (f == mxConstants.DIRECTION_NORTH
                  ? ((e.x -= p.getCenterX()),
                    (e.y -= p.getCenterY() + p.height / 2))
                  : f == mxConstants.DIRECTION_EAST
                    ? ((e.x -= p.getCenterX() - p.width / 2),
                      (e.y -= p.getCenterY()))
                    : f == mxConstants.DIRECTION_SOUTH
                      ? ((e.x -= p.getCenterX()),
                        (e.y -= p.getCenterY() - p.height / 2))
                      : f == mxConstants.DIRECTION_WEST &&
                        ((e.x -= p.getCenterX() + p.width / 2),
                        (e.y -= p.getCenterY())))))));
  return e;
};
Sidebar.prototype.isDropStyleEnabled = function (a, b) {
  var f = !0;
  null != b &&
    1 == a.length &&
    ((a = this.graph.getCellStyle(a[b])),
    null != a &&
      (f =
        mxUtils.getValue(a, mxConstants.STYLE_STROKECOLOR, mxConstants.NONE) !=
          mxConstants.NONE ||
        mxUtils.getValue(a, mxConstants.STYLE_FILLCOLOR, mxConstants.NONE) !=
          mxConstants.NONE));
  return f;
};
Sidebar.prototype.isDropStyleTargetIgnored = function (a) {
  return (
    this.graph.isSwimlane(a.cell) ||
    this.graph.isTableCell(a.cell) ||
    this.graph.isTableRow(a.cell) ||
    this.graph.isTable(a.cell)
  );
};
Sidebar.prototype.disablePointerEvents = function (a) {
  mxUtils.visitNodes(
    a,
    mxUtils.bind(this, function (b) {
      b.nodeType == mxConstants.NODETYPE_ELEMENT &&
        null != b.style &&
        ((b.style.pointerEvents = "none"), b.removeAttribute("pointer-events"));
    }),
  );
};
Sidebar.prototype.createDragSource = function (a, b, f, e, g, d) {
  function h(na, ya) {
    var za = mxUtils.createImage(na.src);
    za.style.width = na.width + "px";
    za.style.height = na.height + "px";
    null != ya && za.setAttribute("title", ya);
    mxUtils.setOpacity(za, na == this.refreshTarget ? 30 : 20);
    za.style.position = "absolute";
    za.style.cursor = "crosshair";
    return za;
  }
  function m(na, ya, za, Ka) {
    null != Ka.parentNode &&
      (mxUtils.contains(za, na, ya)
        ? (mxUtils.setOpacity(Ka, 100), (V = Ka))
        : mxUtils.setOpacity(Ka, Ka == H ? 30 : 20));
    return za;
  }
  var p = this.editorUi,
    k = p.editor.graph,
    u = null,
    w = null,
    y = this;
  d = 0;
  for (var C = this.livePreview, D = 0; D < e.length && C; D++)
    ((d += k.model.getDescendants(e[D]).length),
      (C = d < k.graphHandler.maxLivePreview));
  for (
    D = 0;
    D < e.length &&
    (null == w && k.model.isVertex(e[D])
      ? (w = D)
      : null == u &&
        k.model.isEdge(e[D]) &&
        null == k.model.getTerminal(e[D], !0) &&
        (u = D),
    null == w || null == u);
    D++
  );
  var E = this.isDropStyleEnabled(e, w),
    G = mxUtils.makeDraggable(
      a,
      k,
      mxUtils.bind(this, function (na, ya, za, Ka, Qa) {
        null != this.updateThread && window.clearTimeout(this.updateThread);
        if (null != e && null != K && V == H) {
          var Ia = na.isCellSelected(K.cell)
            ? na.getSelectionCells()
            : [K.cell];
          na.updateShapes(na.model.isEdge(K.cell) ? e[0] : e[w], Ia, !0);
          na.setSelectionCells(Ia);
        } else
          null != e && null != V && null != M && V != H
            ? ((Ia = na.model.isEdge(M.cell) || null == u ? w : u),
              na.setSelectionCells(
                this.dropAndConnect(M.cell, e, O, Ia, ya, w, u),
              ))
            : b.apply(this, arguments);
        null != this.editorUi.hoverIcons &&
          this.editorUi.hoverIcons.update(
            na.view.getState(na.getSelectionCell()),
          );
      }),
      f,
      0,
      0,
      k.autoscroll,
      !0,
      !0,
    );
  C &&
    ((G.createDragElement = mxUtils.bind(this, function () {
      return G.createPreviewElement(this.graph);
    })),
    (G.createPreviewElement = mxUtils.bind(this, function (na) {
      var ya = document.createElement("a");
      ya.className = "geItem";
      ya.style.overflow = "visible";
      na = na.view.scale;
      ya.style.width = na * Math.max(1, g.width) + "px";
      ya.style.height = na * Math.max(1, g.height) + "px";
      mxUtils.setOpacity(ya, 50);
      var za = k.cloneCells(e);
      this.graph.pasteCellStyles(
        k.includeDescendants(za),
        k.currentVertexStyle,
        k.currentEdgeStyle,
        null,
        k.pasteEdgeStyle,
      );
      y.createThumb(
        za,
        na * Math.max(1, g.width),
        na * Math.max(1, g.height),
        ya,
        null,
        null,
        null,
        null,
        null,
        k.shapeBackgroundColor,
        0,
        na,
      );
      return ya;
    })));
  var J = G.mouseDown;
  G.mouseDown = function (na) {
    mxEvent.isPopupTrigger(na) ||
      mxEvent.isMultiTouchEvent(na) ||
      k.isCellLocked(k.getDefaultParent()) ||
      (k.stopEditing(), J.apply(this, arguments));
  };
  var M = null,
    Q = null,
    K = null,
    W = !1,
    X = h(this.triangleUp, mxResources.get("connect")),
    T = h(this.triangleRight, mxResources.get("connect")),
    N = h(this.triangleDown, mxResources.get("connect")),
    ca = h(this.triangleLeft, mxResources.get("connect")),
    H = h(this.refreshTarget, mxResources.get("replace")),
    S = null,
    ea = h(this.roundDrop),
    la = h(this.roundDrop),
    O = mxConstants.DIRECTION_NORTH,
    V = null,
    Y = G.createPreviewElement;
  G.createPreviewElement = function (na) {
    var ya = Y.apply(this, arguments);
    this.previewElementWidth = ya.style.width;
    this.previewElementHeight = ya.style.height;
    ya.style.pointerEvents = "none";
    return ya;
  };
  var ha = G.dragEnter;
  G.dragEnter = function (na, ya) {
    null != p.hoverIcons && p.hoverIcons.setDisplay("none");
    ha.apply(this, arguments);
  };
  var ia = G.dragExit;
  G.dragExit = function (na, ya) {
    null != p.hoverIcons && p.hoverIcons.setDisplay("");
    ia.apply(this, arguments);
  };
  G.dragOver = function (na, ya) {
    mxDragSource.prototype.dragOver.apply(this, arguments);
    null != this.currentGuide && null != V && this.currentGuide.hide();
    if (null != this.previewElement) {
      p.hideShapePicker();
      var za = na.view;
      if (null != K && V == H) this.previewElement.style.display = "none";
      else if (null != M && null != V) {
        null != G.currentHighlight &&
          null != G.currentHighlight.state &&
          G.currentHighlight.hide();
        var Ka = na.model.isEdge(M.cell) || null != w ? w : u,
          Qa = y.getDropAndConnectGeometry(M.cell, e[Ka], O, e),
          Ia = na.model.isEdge(M.cell) ? null : na.getCellGeometry(M.cell),
          Ha = na.getCellGeometry(e[Ka]),
          ra = na.model.getParent(M.cell),
          Da = za.translate.x * za.scale,
          Va = za.translate.y * za.scale;
        null != Ia &&
          !Ia.relative &&
          na.model.isVertex(ra) &&
          ra != za.currentRoot &&
          ((Va = za.getState(ra)), (Da = Va.x), (Va = Va.y));
        Ia = Ha.x;
        Ha = Ha.y;
        na.model.isEdge(e[Ka]) && (Ha = Ia = 0);
        this.previewElement.style.left = (Qa.x - Ia) * za.scale + Da + "px";
        this.previewElement.style.top = (Qa.y - Ha) * za.scale + Va + "px";
        1 == e.length &&
          ((this.previewElement.style.width = Qa.width * za.scale + "px"),
          (this.previewElement.style.height = Qa.height * za.scale + "px"),
          null != this.previewElement.firstChild &&
            ((this.previewElement.firstChild.style.display = "none"),
            (this.previewElement.className = "geDragPreview"),
            mxUtils.setOpacity(this.previewElement, 100)));
        this.previewElement.style.display = "";
      } else
        null != G.currentHighlight &&
        null != G.currentHighlight.state &&
        na.model.isEdge(G.currentHighlight.state.cell)
          ? ((this.previewElement.style.left =
              Math.round(
                parseInt(this.previewElement.style.left) -
                  (g.width * za.scale) / 2,
              ) + "px"),
            (this.previewElement.style.top =
              Math.round(
                parseInt(this.previewElement.style.top) -
                  (g.height * za.scale) / 2,
              ) + "px"))
          : ((this.previewElement.style.width = this.previewElementWidth),
            (this.previewElement.style.height = this.previewElementHeight),
            (this.previewElement.style.display = ""),
            null != this.previewElement.firstChild &&
              ((this.previewElement.firstChild.style.display = ""),
              mxUtils.setOpacity(this.previewElement, 50),
              (this.previewElement.className = "")));
    }
  };
  var ta = new Date().getTime(),
    aa = 0,
    P = null,
    ba = this.editorUi.editor.graph.getCellStyle(e[0]);
  G.getDropTarget = mxUtils.bind(this, function (na, ya, za, Ka) {
    var Qa =
      mxEvent.isAltDown(Ka) || null == e
        ? null
        : na.getCellAt(ya, za, null, null, null, function (Va, Wa, $a) {
            return (
              na.isContainer(Va.cell) &&
              "0" != mxUtils.getValue(Va.style, "dropTarget", "1")
            );
          });
    if (
      null != Qa &&
      !this.graph.isCellConnectable(Qa) &&
      !this.graph.model.isEdge(Qa)
    ) {
      var Ia = this.graph.getModel().getParent(Qa);
      this.graph.getModel().isVertex(Ia) &&
        this.graph.isCellConnectable(Ia) &&
        (Qa = Ia);
    }
    na.isCellLocked(Qa) && (Qa = null);
    var Ha = na.view.getState(Qa);
    Ia = V = null;
    P != Ha
      ? ((ta = new Date().getTime()),
        (aa = 0),
        (P = Ha),
        null != this.updateThread && window.clearTimeout(this.updateThread),
        null != Ha &&
          (this.updateThread = window.setTimeout(function () {
            null == V && ((P = Ha), G.getDropTarget(na, ya, za, Ka));
          }, this.dropTargetDelay + 10)))
      : (aa = new Date().getTime() - ta);
    if (
      E &&
      2500 > aa &&
      null != Ha &&
      !mxEvent.isShiftDown(Ka) &&
      ((mxUtils.getValue(Ha.style, mxConstants.STYLE_SHAPE) !=
        mxUtils.getValue(ba, mxConstants.STYLE_SHAPE) &&
        (mxUtils.getValue(
          Ha.style,
          mxConstants.STYLE_STROKECOLOR,
          mxConstants.NONE,
        ) != mxConstants.NONE ||
          mxUtils.getValue(
            Ha.style,
            mxConstants.STYLE_FILLCOLOR,
            mxConstants.NONE,
          ) != mxConstants.NONE ||
          mxUtils.getValue(
            Ha.style,
            mxConstants.STYLE_GRADIENTCOLOR,
            mxConstants.NONE,
          ) != mxConstants.NONE)) ||
        "image" == mxUtils.getValue(ba, mxConstants.STYLE_SHAPE) ||
        1500 < aa ||
        na.model.isEdge(Ha.cell)) &&
      aa > this.dropTargetDelay &&
      !this.isDropStyleTargetIgnored(Ha) &&
      ((na.model.isVertex(Ha.cell) && null != w) ||
        (na.model.isEdge(Ha.cell) && na.model.isEdge(e[0])))
    ) {
      if (na.isCellEditable(Ha.cell)) {
        K = Ha;
        var ra = na.model.isEdge(Ha.cell)
          ? na.view.getPoint(Ha)
          : new mxPoint(Ha.getCenterX(), Ha.getCenterY());
        ra = new mxRectangle(
          ra.x - this.refreshTarget.width / 2,
          ra.y - this.refreshTarget.height / 2,
          this.refreshTarget.width,
          this.refreshTarget.height,
        );
        H.style.left = Math.floor(ra.x) + "px";
        H.style.top = Math.floor(ra.y) + "px";
        null == S && (na.container.appendChild(H), (S = H.parentNode));
        m(ya, za, ra, H);
      }
    } else
      null == K ||
      !mxUtils.contains(K, ya, za) ||
      (1500 < aa && !mxEvent.isShiftDown(Ka))
        ? ((K = null), null != S && (H.parentNode.removeChild(H), (S = null)))
        : null != K &&
          null != S &&
          ((ra = na.model.isEdge(K.cell)
            ? na.view.getPoint(K)
            : new mxPoint(K.getCenterX(), K.getCenterY())),
          (ra = new mxRectangle(
            ra.x - this.refreshTarget.width / 2,
            ra.y - this.refreshTarget.height / 2,
            this.refreshTarget.width,
            this.refreshTarget.height,
          )),
          m(ya, za, ra, H));
    if (W && null != M && !mxEvent.isAltDown(Ka) && null == V) {
      Ia = mxRectangle.fromRectangle(M);
      if (na.model.isEdge(M.cell)) {
        var Da = M.absolutePoints;
        null != ea.parentNode &&
          ((ra = Da[0]),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                ra.x - this.roundDrop.width / 2,
                ra.y - this.roundDrop.height / 2,
                this.roundDrop.width,
                this.roundDrop.height,
              ),
              ea,
            ),
          ));
        null != la.parentNode &&
          ((Da = Da[Da.length - 1]),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                Da.x - this.roundDrop.width / 2,
                Da.y - this.roundDrop.height / 2,
                this.roundDrop.width,
                this.roundDrop.height,
              ),
              la,
            ),
          ));
      } else
        ((ra = mxRectangle.fromRectangle(M)),
          null != M.shape &&
            null != M.shape.boundingBox &&
            (ra = mxRectangle.fromRectangle(M.shape.boundingBox)),
          ra.grow(this.graph.tolerance),
          ra.grow(HoverIcons.prototype.arrowSpacing),
          (Da = this.graph.selectionCellsHandler.getHandler(M.cell)),
          null != Da &&
            ((ra.x -= Da.horizontalOffset / 2),
            (ra.y -= Da.verticalOffset / 2),
            (ra.width += Da.horizontalOffset),
            (ra.height += Da.verticalOffset),
            null != Da.rotationShape &&
              null != Da.rotationShape.node &&
              "hidden" != Da.rotationShape.node.style.visibility &&
              "none" != Da.rotationShape.node.style.display &&
              null != Da.rotationShape.boundingBox &&
              ra.add(Da.rotationShape.boundingBox)),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                M.getCenterX() - this.triangleUp.width / 2,
                ra.y - this.triangleUp.height,
                this.triangleUp.width,
                this.triangleUp.height,
              ),
              X,
            ),
          ),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                ra.x + ra.width,
                M.getCenterY() - this.triangleRight.height / 2,
                this.triangleRight.width,
                this.triangleRight.height,
              ),
              T,
            ),
          ),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                M.getCenterX() - this.triangleDown.width / 2,
                ra.y + ra.height,
                this.triangleDown.width,
                this.triangleDown.height,
              ),
              N,
            ),
          ),
          Ia.add(
            m(
              ya,
              za,
              new mxRectangle(
                ra.x - this.triangleLeft.width,
                M.getCenterY() - this.triangleLeft.height / 2,
                this.triangleLeft.width,
                this.triangleLeft.height,
              ),
              ca,
            ),
          ));
      null != Ia && Ia.grow(10);
    }
    O = mxConstants.DIRECTION_NORTH;
    V == T
      ? (O = mxConstants.DIRECTION_EAST)
      : V == N || V == la
        ? (O = mxConstants.DIRECTION_SOUTH)
        : V == ca && (O = mxConstants.DIRECTION_WEST);
    null != K && V == H && (Ha = K);
    ra =
      (null == w || na.isCellConnectable(e[w])) &&
      ((na.model.isEdge(Qa) && null != w) ||
        (na.model.isVertex(Qa) && na.isCellConnectable(Qa)));
    if (
      (null != M && 5e3 <= aa) ||
      (M != Ha &&
        (null == Ia ||
          !mxUtils.contains(Ia, ya, za) ||
          (500 < aa && null == V && ra)))
    )
      if (
        ((W = !1),
        (M =
          (5e3 > aa && aa > this.dropTargetDelay) || na.model.isEdge(Qa)
            ? Ha
            : null),
        null != M && ra)
      ) {
        Ia = [ea, la, X, T, N, ca];
        for (ra = 0; ra < Ia.length; ra++)
          null != Ia[ra].parentNode && Ia[ra].parentNode.removeChild(Ia[ra]);
        na.model.isEdge(Qa)
          ? ((Da = Ha.absolutePoints),
            null != Da &&
              ((ra = Da[0]),
              (Da = Da[Da.length - 1]),
              (ea.style.left =
                Math.floor(ra.x - this.roundDrop.width / 2) + "px"),
              (ea.style.top =
                Math.floor(ra.y - this.roundDrop.height / 2) + "px"),
              (la.style.left =
                Math.floor(Da.x - this.roundDrop.width / 2) + "px"),
              (la.style.top =
                Math.floor(Da.y - this.roundDrop.height / 2) + "px"),
              null == na.model.getTerminal(Qa, !0) &&
                na.container.appendChild(ea),
              null == na.model.getTerminal(Qa, !1) &&
                na.container.appendChild(la)))
          : ((ra = mxRectangle.fromRectangle(Ha)),
            null != Ha.shape &&
              null != Ha.shape.boundingBox &&
              (ra = mxRectangle.fromRectangle(Ha.shape.boundingBox)),
            ra.grow(this.graph.tolerance),
            ra.grow(HoverIcons.prototype.arrowSpacing),
            (Da = this.graph.selectionCellsHandler.getHandler(Ha.cell)),
            null != Da &&
              ((ra.x -= Da.horizontalOffset / 2),
              (ra.y -= Da.verticalOffset / 2),
              (ra.width += Da.horizontalOffset),
              (ra.height += Da.verticalOffset),
              null != Da.rotationShape &&
                null != Da.rotationShape.node &&
                "hidden" != Da.rotationShape.node.style.visibility &&
                "none" != Da.rotationShape.node.style.display &&
                null != Da.rotationShape.boundingBox &&
                ra.add(Da.rotationShape.boundingBox)),
            (X.style.left =
              Math.floor(Ha.getCenterX() - this.triangleUp.width / 2) + "px"),
            (X.style.top = Math.floor(ra.y - this.triangleUp.height) + "px"),
            (T.style.left = Math.floor(ra.x + ra.width) + "px"),
            (T.style.top =
              Math.floor(Ha.getCenterY() - this.triangleRight.height / 2) +
              "px"),
            (N.style.left = X.style.left),
            (N.style.top = Math.floor(ra.y + ra.height) + "px"),
            (ca.style.left = Math.floor(ra.x - this.triangleLeft.width) + "px"),
            (ca.style.top = T.style.top),
            "eastwest" != Ha.style.portConstraint &&
              (na.container.appendChild(X), na.container.appendChild(N)),
            na.container.appendChild(T),
            na.container.appendChild(ca));
        null != Ha &&
          ((Q = na.selectionCellsHandler.getHandler(Ha.cell)),
          null != Q && null != Q.setHandlesVisible && Q.setHandlesVisible(!1));
        W = !0;
      } else
        for (Ia = [ea, la, X, T, N, ca], ra = 0; ra < Ia.length; ra++)
          null != Ia[ra].parentNode && Ia[ra].parentNode.removeChild(Ia[ra]);
    W || null == Q || Q.setHandlesVisible(!0);
    Qa =
      (mxEvent.isAltDown(Ka) && !mxEvent.isShiftDown(Ka)) ||
      (null != K && V == H)
        ? null
        : mxDragSource.prototype.getDropTarget.apply(this, arguments);
    null == Qa ||
      (null == V && na.isSplitTarget(Qa, e, Ka)) ||
      (Qa = na.getDropTarget(e, Ka, Qa, !0));
    return Qa;
  });
  var ma = G.startDrag;
  G.startDrag = function (na) {
    y.activeDragSource = this;
    ma.apply(this, arguments);
  };
  var Ja = G.stopDrag;
  G.stopDrag = function () {
    Ja.apply(this, arguments);
    for (var na = [ea, la, H, X, T, N, ca], ya = 0; ya < na.length; ya++)
      null != na[ya].parentNode && na[ya].parentNode.removeChild(na[ya]);
    null != M && null != Q && Q.reset();
    V = S = K = M = Q = y.activeDragSource = null;
  };
  return G;
};
Sidebar.prototype.itemClicked = function (a, b, f, e) {
  e = this.editorUi.editor.graph;
  e.container.focus();
  if (mxEvent.isAltDown(f) && 1 == e.getSelectionCount()) {
    for (
      var g = (b = null), d = 0;
      d < a.length &&
      (null == g && e.model.isVertex(a[d])
        ? (g = d)
        : null == b &&
          e.model.isEdge(a[d]) &&
          null == e.model.getTerminal(a[d], !0) &&
          (b = d),
      null == g || null == b);
      d++
    );
    d = null == b ? g : b;
    e.setSelectionCells(
      this.dropAndConnect(
        e.getSelectionCell(),
        a,
        mxEvent.isMetaDown(f) || mxEvent.isControlDown(f)
          ? mxEvent.isShiftDown(f)
            ? mxConstants.DIRECTION_WEST
            : mxConstants.DIRECTION_NORTH
          : mxEvent.isShiftDown(f)
            ? mxConstants.DIRECTION_EAST
            : mxConstants.DIRECTION_SOUTH,
        d,
        f,
        g,
        b,
      ),
    );
    e.scrollCellToVisible(e.getSelectionCell());
  } else
    mxEvent.isShiftDown(f) && !e.isSelectionEmpty()
      ? ((f = e.getEditableCells(e.getSelectionCells())),
        e.updateShapes(a[0], f, !0),
        e.scrollCellToVisible(f))
      : ((a = mxEvent.isAltDown(f)
          ? e.getFreeInsertPoint()
          : e.getCenterInsertPoint(e.getBoundingBoxFromGeometry(a, !0))),
        b.drop(e, f, null, a.x, a.y, !0));
};
Sidebar.prototype.addClickHandler = function (a, b, f, e) {
  var g = b.getGraphForEvent,
    d = b.mouseDown,
    h = b.mouseMove,
    m = b.mouseUp,
    p = this.editorUi.editor.graph.tolerance,
    k = !1,
    u = null,
    w = this,
    y = null;
  b.getGraphForEvent = function (C) {
    return k ? g.apply(this, arguments) : null;
  };
  b.mouseDown = function (C) {
    d.apply(this, arguments);
    u = new mxPoint(mxEvent.getClientX(C), mxEvent.getClientY(C));
    y = a.style.opacity;
    k = !1;
    "" == y && (y = "1");
    null != this.dragElement && (this.dragElement.style.display = "none");
  };
  b.mouseMove = function (C) {
    (k =
      null != u &&
      (Math.abs(u.x - mxEvent.getClientX(C)) > p ||
        Math.abs(u.y - mxEvent.getClientY(C)) > p)) &&
      null != this.dragElement &&
      "none" == this.dragElement.style.display &&
      (this.dragElement.style.display = "");
    h.apply(this, arguments);
  };
  b.mouseUp = function (C) {
    try {
      (mxEvent.isPopupTrigger(C) ||
        null != this.currentGraph ||
        null == this.dragElement ||
        "none" != this.dragElement.style.display ||
        (null != e && e(C), mxEvent.isConsumed(C) || w.itemClicked(f, b, C, a)),
        m.apply(b, arguments),
        (u = null),
        (w.currentElt = a));
    } catch (D) {
      (b.reset(), w.editorUi.handleError(D));
    }
  };
};