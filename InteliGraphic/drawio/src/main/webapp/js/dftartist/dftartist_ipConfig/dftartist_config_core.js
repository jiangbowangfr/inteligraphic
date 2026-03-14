(function (global) {
  var NS = global.DftsConfig = global.DftsConfig || {};
  if (NS.__coreLoaded) { return; }
  NS.__coreLoaded = true;

  function showError(text) {
    if (global.mxUtils && typeof global.mxUtils.alert === 'function') {
      global.mxUtils.alert(text);
    } else {
      global.alert(text);
    }
  }

  function getVisiblePages(cfg, ctx, state) {
    var pages = [];
    var i;
    var page;
    for (i = 0; i < cfg.pages.length; i += 1) {
      page = cfg.pages[i];
      if (!page.visible || page.visible(ctx, state) !== false) {
        pages.push(page);
      }
    }
    return pages;
  }

  function open(graph, cell) {
    var ctx = NS.State.buildContext(graph, cell);
    var state = NS.State.buildState(ctx);
    var cfg = NS.Registry.resolveConfig(ctx);
    var pages;
    var modal;
    var activePageId = '';
    var contentHost;
    var pageMap = {};
    var i;

    if (!ctx.body || !ctx.dftsType) {
      showError('当前选中的对象不是 DFT IP body，无法打开配置。');
      return null;
    }

    if (!cfg) {
      showError('未找到配置定义：type=' + ctx.dftsType + ', category=' + ctx.category);
      return null;
    }

    pages = getVisiblePages(cfg, ctx, state);
    if (!pages.length) {
      showError('配置已注册，但没有可显示的页面。');
      return null;
    }

    for (i = 0; i < pages.length; i += 1) {
      pageMap[pages[i].id] = pages[i];
      if (typeof pages[i].init === 'function') {
        pages[i].init(ctx, state);
      }
    }

    modal = NS.Modal.create({
      title: cfg.title || (ctx.dftsType + ' Configuration'),
      onClose: function () {
        modal.destroy();
      }
    });

    contentHost = document.createElement('div');
    contentHost.style.height = '100%';

    function renderPage(pageId) {
      var page = pageMap[pageId];
      var api;
      activePageId = pageId;
      contentHost.innerHTML = '';
      if (!page) { return; }

      api = {
        getState: function () { return state; },
        refresh: function () { renderPage(activePageId); },
        showError: showError
      };

      page.render(contentHost, ctx, state, api);
      modal.setBody(contentHost);
    }

    function collectErrors() {
      var errors = [];
      var j;
      var page;
      var pageErrors;
      for (j = 0; j < pages.length; j += 1) {
        page = pages[j];
        if (typeof page.validate === 'function') {
          pageErrors = page.validate(ctx, state) || [];
          if (pageErrors.length) {
            errors = errors.concat(pageErrors);
          }
        }
      }
      return errors;
    }

    function collectPatches() {
      var patches = [];
      var j;
      var page;
      var patch;
      for (j = 0; j < pages.length; j += 1) {
        page = pages[j];
        if (typeof page.buildPatch === 'function') {
          patch = page.buildPatch(ctx, state);
          if (patch) {
            patches.push(patch);
          }
        }
      }
      return patches;
    }

    function save(closeAfter) {
      var errors = collectErrors();
      var patches;
      var merged;
      if (errors.length) {
        showError(errors.join('\n'));
        return false;
      }
      patches = collectPatches();
      merged = NS.Apply.mergePatches(patches);
      NS.Apply.applyMergedPatch(ctx, merged);
      if (closeAfter) {
        modal.destroy();
      } else {
        renderPage(activePageId);
      }
      return true;
    }

    modal.setTabs(pages.map(function (page) {
      return { id: page.id, title: page.title || page.id };
    }), function (pageId) {
      renderPage(pageId);
    });

    modal.setFooterButtons([
      modal.button('Apply', function () { save(false); }, false),
      modal.button('OK', function () { save(true); }, true),
      modal.button('Cancel', function () { modal.destroy(); }, false)
    ]);

    renderPage(pages[0].id);

    return {
      ctx: ctx,
      state: state,
      config: cfg,
      modal: modal
    };
  }

  function install(graph) {
    if (!graph || graph.__dftsConfigInstalled) { return; }
    graph.__dftsConfigInstalled = true;
  }

  NS.open = open;
  NS.install = install;
})(this);
