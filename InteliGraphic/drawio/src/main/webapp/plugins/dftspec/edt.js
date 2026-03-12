Sidebar.prototype.createVertexTemplateEntryTextOnly = function (
  a, b, f, e, g, d, h, m, showTextOnly
) {
  null != m && null != g && (m += " " + g);
  m = null != m && 0 < m.length ? m : null != g ? g.toLowerCase() : "";

  return this.addEntry(
    m,
    mxUtils.bind(this, function () {
      if (showTextOnly) {
        return this.createVertexTemplate("text;strokeColor=none;fillColor=none;",
          b, f, g || e || "Label", g || e || "Label");
      }
      return this.createVertexTemplate(a, b, f, e, g, d, h);
    }),
    g // 这里强制 palette 里显示文字
  );
};

Sidebar.prototype.addMiscPalette = function (a) {
  var b = this;
  this.setCurrentSearchEntryLibrary("general", "misc");
  var f = [
    this.createVertexTemplateEntryTextOnly(
      "text;strokeColor=none;fillColor=none;html=1;fontSize=24;fontStyle=1;verticalAlign=middle;align=center;",
      100,
      40,
      "Title",
      "Title",
      null,
      null,
      "text heading title",
      true
    ),
    this.createVertexTemplateEntryTextOnly(
      "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
      100,
      80,
      "<ul><li>Value 1</li><li>Value 2</li><li>Value 3</li></ul>",
      "Unordered List",
      true
    ),
    this.createVertexTemplateEntryTextOnly(
      "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
      100,
      80,
      "<ol><li>Value 1</li><li>Value 2</li><li>Value 3</li></ol>",
      "Ordered List",
      true
    ),
    this.createVertexTemplateEntryTextOnly(
      "shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;fontSize=11;fillColor=none;strokeColor=none;",
      60,
      60,
      "",
      "Vertical List",
      true
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