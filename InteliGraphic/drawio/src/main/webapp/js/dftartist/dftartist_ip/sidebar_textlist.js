Draw.loadPlugin(function (ui) {
    const css = `
  .geSidebar .geItem,.geSidebarContainer .geItem{
    float:none!important; display:block!important; width:100%!important;
    margin:2px 0!important; height:auto!important;
  }
  .geSidebar .geTextItem{ display:block!important; width:100%!important;
    line-height:28px; padding:0 10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .geSidebar .geThumb,.geSidebar .geIcon,.geSidebar .geSprite,.geSidebar .geItem img{ display:none!important; }
  `;
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    //确保每行一个
    if (Sidebar) Sidebar.prototype.thumbsPerRow = 1;
});
