(function (global) {
  'use strict';
  global = global || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
  var NS = global.DFTDialogService = global.DFTDialogService || {};

  var CSS_ID = 'dft-dialog-service-v2-css';
  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    var style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = '' +
      '.dftdlg-overlay{position:fixed;inset:0;background:rgba(17,24,39,.18);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;}' +
      '.dftdlg{width:min(760px,92vw);max-height:min(86vh,900px);overflow:auto;background:#fff;border:1px solid #d7dce6;border-radius:18px;box-shadow:0 12px 28px rgba(15,23,42,.12);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;}' +
      '.dftdlg.small{width:min(520px,92vw);}' +
      '.dftdlg-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 8px 24px;font-size:17px;font-weight:600;}' +
      '.dftdlg-close{border:0;background:transparent;font-size:30px;line-height:1;color:#6b7280;cursor:pointer;padding:0 2px;}' +
      '.dftdlg-body{padding:8px 24px 16px 24px;}' +
      '.dftdlg-text{font-size:13px;line-height:1.55;color:#4b5563;margin:0 0 16px 0;}' +
      '.dftdlg-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;}' +
      '.dftdlg-field{display:flex;flex-direction:column;gap:6px;}' +
      '.dftdlg-field.full{grid-column:1 / -1;}' +
      '.dftdlg-label{font-size:13px;font-weight:500;color:#374151;}' +
      '.dftdlg-input,.dftdlg-select{height:40px;border:1px solid #cfd6e3;border-radius:12px;padding:0 12px;font-size:14px;color:#111827;background:#fff;box-sizing:border-box;outline:none;}' +
      '.dftdlg-input:focus,.dftdlg-select:focus{border-color:#8fb8ff;box-shadow:0 0 0 3px rgba(59,130,246,.12);}' +
      '.dftdlg-help{font-size:12px;color:#6b7280;}' +
      '.dftdlg-checks{display:flex;flex-wrap:wrap;gap:10px 14px;padding-top:4px;}' +
      '.dftdlg-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;}' +
      '.dftdlg-check input{width:16px;height:16px;}' +
      '.dftdlg-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:0 24px 22px 24px;}' +
      '.dftdlg-btn{height:38px;padding:0 16px;border-radius:12px;border:1px solid #cfd6e3;background:#fff;color:#334155;font-size:14px;font-weight:500;cursor:pointer;}' +
      '.dftdlg-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;}' +
      '.dftdlg-btn.ghost{background:#fff;color:#475569;}' +
      '.dftdlg-btn:disabled{opacity:.55;cursor:not-allowed;}' +
      '.dftdlg-actions-picker{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
      '.dftdlg-tile{border:1px solid #d7dce6;border-radius:16px;padding:18px 16px;cursor:pointer;background:#fff;}' +
      '.dftdlg-tile:hover{border-color:#93c5fd;background:#f8fbff;}' +
      '.dftdlg-tile-title{font-size:15px;font-weight:600;margin-bottom:6px;}' +
      '.dftdlg-tile-sub{font-size:12px;line-height:1.5;color:#6b7280;}' +
      '.dftdlg-preview{margin-top:8px;padding:10px 12px;border:1px dashed #d5d9e2;border-radius:12px;background:#fafbfc;font-size:12px;line-height:1.55;color:#475569;}' +
      '.dftdlg-error{margin-top:10px;color:#b91c1c;font-size:12px;display:none;}' +
      '.dftdlg-error.show{display:block;}';
    document.head.appendChild(style);
  }

  function createDialogShell(title, options) {
    ensureCss();
    options = options || {};
    var overlay = document.createElement('div');
    overlay.className = 'dftdlg-overlay';
    var box = document.createElement('div');
    box.className = 'dftdlg' + (options.small ? ' small' : '');
    var header = document.createElement('div');
    header.className = 'dftdlg-header';
    var h = document.createElement('div'); h.textContent = title || 'Dialog';
    var close = document.createElement('button'); close.className = 'dftdlg-close'; close.type='button'; close.innerHTML='&times;';
    header.appendChild(h); header.appendChild(close);
    var body = document.createElement('div'); body.className = 'dftdlg-body';
    var actions = document.createElement('div'); actions.className = 'dftdlg-actions';
    box.appendChild(header); box.appendChild(body); box.appendChild(actions); overlay.appendChild(box);
    function destroy() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    close.onclick = destroy;
    overlay.addEventListener('mousedown', function (evt) { if (evt.target === overlay && options.closeOnBackdrop !== false) destroy(); });
    return { overlay: overlay, box: box, body: body, actions: actions, close: close, open: function(){ document.body.appendChild(overlay); }, destroy: destroy };
  }

  function makeButton(text, cls, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'dftdlg-btn' + (cls ? ' ' + cls : '');
    b.textContent = text;
    if (onClick) b.onclick = onClick;
    return b;
  }

  NS.pickAction = function (title, actions, options) {
    return new Promise(function (resolve) {
      var dlg = createDialogShell(title || 'Choose an action', { small: false });
      var p = document.createElement('p'); p.className='dftdlg-text'; p.textContent = options && options.text ? options.text : 'Choose what you want to create.';
      dlg.body.appendChild(p);
      var wrap = document.createElement('div'); wrap.className = 'dftdlg-actions-picker';
      (actions || []).forEach(function (a) {
        var tile = document.createElement('div'); tile.className = 'dftdlg-tile';
        var tt = document.createElement('div'); tt.className = 'dftdlg-tile-title'; tt.textContent = a.title || a.key;
        var sub = document.createElement('div'); sub.className = 'dftdlg-tile-sub'; sub.textContent = a.description || '';
        tile.appendChild(tt); tile.appendChild(sub);
        tile.onclick = function () { dlg.destroy(); resolve(a.key); };
        wrap.appendChild(tile);
      });
      dlg.body.appendChild(wrap);
      dlg.actions.appendChild(makeButton('Cancel', 'ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.open();
    });
  };

  NS.promptText = function (title, label, initialValue, options) {
    return new Promise(function (resolve) {
      var dlg = createDialogShell(title || 'Input', { small: true });
      var field = document.createElement('div'); field.className = 'dftdlg-field full';
      var lab = document.createElement('label'); lab.className='dftdlg-label'; lab.textContent = label || 'Value';
      var input = document.createElement('input'); input.className='dftdlg-input'; input.value = initialValue || ''; input.placeholder = (options && options.placeholder) || '';
      var err = document.createElement('div'); err.className='dftdlg-error';
      field.appendChild(lab); field.appendChild(input); field.appendChild(err); dlg.body.appendChild(field);
      function apply() {
        var val = String(input.value || '').trim();
        if (options && typeof options.validate === 'function') {
          var msg = options.validate(val);
          if (msg) { err.textContent = msg; err.className = 'dftdlg-error show'; return; }
        }
        dlg.destroy(); resolve(val || null);
      }
      dlg.actions.appendChild(makeButton('Cancel', 'ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.actions.appendChild(makeButton('Apply', 'primary', apply));
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') apply(); });
      dlg.open(); input.focus(); input.select();
    });
  };

  NS.confirm = function (title, text, options) {
    return new Promise(function (resolve) {
      var dlg = createDialogShell(title || 'Confirm', { small: true });
      var p = document.createElement('p'); p.className='dftdlg-text'; p.textContent = text || 'Are you sure?'; dlg.body.appendChild(p);
      dlg.actions.appendChild(makeButton((options && options.cancelText) || 'Cancel', 'ghost', function(){ dlg.destroy(); resolve(false); }));
      dlg.actions.appendChild(makeButton((options && options.okText) || 'Confirm', 'primary', function(){ dlg.destroy(); resolve(true); }));
      dlg.open();
    });
  };

  NS.createProject = function (defaults) {
    return new Promise(function (resolve) {
      defaults = defaults || {};
      var dlg = createDialogShell('Create Project');
      var txt = document.createElement('p'); txt.className='dftdlg-text'; txt.textContent='Create a new DFT project. The project root will also contain a project-level floorplan directory and ip_config directory.';
      dlg.body.appendChild(txt);
      var grid = document.createElement('div'); grid.className='dftdlg-grid';
      function field(label, value, placeholder, full) {
        var wrap = document.createElement('div'); wrap.className='dftdlg-field' + (full ? ' full' : '');
        var lab = document.createElement('label'); lab.className='dftdlg-label'; lab.textContent=label;
        var input = document.createElement('input'); input.className='dftdlg-input'; input.value=value||''; input.placeholder=placeholder||'';
        wrap.appendChild(lab); wrap.appendChild(input); grid.appendChild(wrap); return input;
      }
      var name = field('Project Name', defaults.name || '', 'e.g. chip_alpha', false);
      var path = field('Project Path', defaults.path || '', 'e.g. /work/chip_alpha', true);
      var help = document.createElement('div'); help.className='dftdlg-help'; help.textContent='By default this creates <project>/floorplan and <project>/ip_config.';
      grid.lastChild.appendChild(help);
      dlg.body.appendChild(grid);
      function submit() {
        var out = { name: String(name.value||'').trim(), path: String(path.value||'').trim() };
        if (!out.name || !out.path) return;
        dlg.destroy(); resolve(out);
      }
      dlg.actions.appendChild(makeButton('Cancel','ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.actions.appendChild(makeButton('Create','primary', submit));
      [name, path].forEach(function (el) { el.addEventListener('keydown', function(e){ if (e.key==='Enter') submit(); }); });
      dlg.open(); name.focus();
    });
  };

  NS.createDesign = function (defaults) {
    return new Promise(function (resolve) {
      defaults = defaults || {};
      var dlg = createDialogShell('Create Design');
      var txt = document.createElement('p'); txt.className='dftdlg-text'; txt.textContent='Create a new design. Flow pages are fixed; Arch and IP Config pages can be added later.';
      dlg.body.appendChild(txt);
      var grid = document.createElement('div'); grid.className='dftdlg-grid';
      function field(label, value, placeholder, full) {
        var wrap = document.createElement('div'); wrap.className='dftdlg-field' + (full ? ' full' : '');
        var lab = document.createElement('label'); lab.className='dftdlg-label'; lab.textContent=label;
        var input = document.createElement('input'); input.className='dftdlg-input'; input.value=value||''; input.placeholder=placeholder||'';
        wrap.appendChild(lab); wrap.appendChild(input); grid.appendChild(wrap); return input;
      }
      var name = field('Design Name', defaults.name || '', 'e.g. cpu0', false);
      var path = field('Design Path', defaults.path || '', 'defaults inside project if left blank', true);
      var help = document.createElement('div'); help.className='dftdlg-help'; help.textContent='Recommended default: <project>/designs/<designName>/';
      grid.lastChild.appendChild(help);
      dlg.body.appendChild(grid);
      function submit() {
        var out = { name: String(name.value||'').trim(), path: String(path.value||'').trim() };
        if (!out.name) return;
        dlg.destroy(); resolve(out);
      }
      dlg.actions.appendChild(makeButton('Cancel','ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.actions.appendChild(makeButton('Create','primary', submit));
      [name, path].forEach(function (el) { el.addEventListener('keydown', function(e){ if (e.key==='Enter') submit(); }); });
      dlg.open(); name.focus();
    });
  };

  NS.configureFloorplan = function (defaults) {
    return new Promise(function (resolve) {
      defaults = defaults || {};
      var dlg = createDialogShell('Create Floorplan');
      var txt = document.createElement('p'); txt.className='dftdlg-text'; txt.textContent='Configure the floorplan structure and included domains. A floorplan domain page will be created for each selected domain.';
      dlg.body.appendChild(txt);
      var grid = document.createElement('div'); grid.className='dftdlg-grid';
      var wf = document.createElement('div'); wf.className='dftdlg-field';
      var wl = document.createElement('label'); wl.className='dftdlg-label'; wl.textContent='Floorplan Name';
      var wi = document.createElement('input'); wi.className='dftdlg-input'; wi.value=defaults.name||'floorplan';
      wf.appendChild(wl); wf.appendChild(wi); grid.appendChild(wf);
      var sf = document.createElement('div'); sf.className='dftdlg-field';
      var sl = document.createElement('label'); sl.className='dftdlg-label'; sl.textContent='Structure Type';
      var ss = document.createElement('select'); ss.className='dftdlg-select'; ['Hierarchical','Tiling'].forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; if ((defaults.structureType||'Hierarchical')===v) o.selected=true; ss.appendChild(o); });
      sf.appendChild(sl); sf.appendChild(ss); grid.appendChild(sf);
      var df = document.createElement('div'); df.className='dftdlg-field full';
      var dl = document.createElement('label'); dl.className='dftdlg-label'; dl.textContent='Included Domains';
      var checks = document.createElement('div'); checks.className='dftdlg-checks';
      var domains = ['SSN','BSCAN','JTAG','BISR'];
      var chosen = Array.isArray(defaults.domains) && defaults.domains.length ? defaults.domains.slice() : ['SSN'];
      var boxes = [];
      domains.forEach(function (d) {
        var wrap = document.createElement('label'); wrap.className='dftdlg-check';
        var cb = document.createElement('input'); cb.type='checkbox'; cb.checked = chosen.indexOf(d) >= 0; cb.dataset.domain = d;
        var tx = document.createElement('span'); tx.textContent = d;
        wrap.appendChild(cb); wrap.appendChild(tx); checks.appendChild(wrap); boxes.push(cb);
      });
      df.appendChild(dl); df.appendChild(checks);
      var preview = document.createElement('div'); preview.className='dftdlg-preview'; df.appendChild(preview);
      function updatePreview() {
        var selected = boxes.filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.dataset.domain; });
        preview.textContent = 'Will create: ' + (selected.length ? selected.map(function (d) { return 'floorplan_' + d.toLowerCase(); }).join(', ') : '(none)');
      }
      boxes.forEach(function (cb) { cb.onchange = updatePreview; }); updatePreview();
      grid.appendChild(df);
      dlg.body.appendChild(grid);
      function submit() {
        var selected = boxes.filter(function (cb) { return cb.checked; }).map(function (cb) { return cb.dataset.domain; });
        if (!selected.length) return;
        dlg.destroy(); resolve({ name: String(wi.value||'').trim() || 'floorplan', structureType: ss.value, domains: selected });
      }
      dlg.actions.appendChild(makeButton('Cancel','ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.actions.appendChild(makeButton('Create','primary', submit));
      dlg.open(); wi.focus();
    });
  };

  NS.createArchPage = function (designName) {
    return new Promise(function (resolve) {
      var dlg = createDialogShell('Add Arch Page', { small: true });
      var text = document.createElement('p'); text.className='dftdlg-text'; text.textContent='Create a new architecture page for design ' + (designName || '') + '.'; dlg.body.appendChild(text);
      var grid = document.createElement('div'); grid.className='dftdlg-grid';
      var f1 = document.createElement('div'); f1.className='dftdlg-field';
      var l1 = document.createElement('label'); l1.className='dftdlg-label'; l1.textContent='Page Name';
      var i1 = document.createElement('input'); i1.className='dftdlg-input'; i1.placeholder = (designName || 'design') + '_ssn';
      f1.appendChild(l1); f1.appendChild(i1); grid.appendChild(f1);
      var f2 = document.createElement('div'); f2.className='dftdlg-field';
      var l2 = document.createElement('label'); l2.className='dftdlg-label'; l2.textContent='Domain Type';
      var s2 = document.createElement('select'); s2.className='dftdlg-select'; ['SSN','BSCAN','JTAG','BISR'].forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; s2.appendChild(o); });
      f2.appendChild(l2); f2.appendChild(s2); grid.appendChild(f2);
      dlg.body.appendChild(grid);
      function submit() {
        var domain = s2.value;
        var name = String(i1.value || '').trim() || ((designName || 'design') + '_' + domain.toLowerCase());
        dlg.destroy(); resolve({ name: name, domain: domain });
      }
      dlg.actions.appendChild(makeButton('Cancel','ghost', function(){ dlg.destroy(); resolve(null); }));
      dlg.actions.appendChild(makeButton('Create','primary', submit));
      dlg.open(); i1.focus();
    });
  };

  NS.toast = function (msg) {
    try { if (global.console && console.info) console.info('[DFTDialogService]', msg); } catch (e) {}
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this)));
