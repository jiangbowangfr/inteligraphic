(function (global) {
  'use strict';

  var NS = global.DftsIP = global.DftsIP || {};
  var LG = NS.LogicGate = NS.LogicGate || {};
  var Model = LG.Model;
  var Config = LG.Config = LG.Config || {};
  if (!Model) return;
  if (Config.__phase2Loaded) return;
  Config.__phase2Loaded = true;

  function toStr(v) { return v == null ? '' : String(v); }
  function trim(v) { return toStr(v).replace(/^\s+|\s+$/g, ''); }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function el(tag, cls) { var d = document.createElement(tag); if (cls) d.className = cls; return d; }
  function btn(label, primary, onClick) {
    var b = el('button'); b.type='button'; b.textContent=label;
    b.style.cssText='height:34px;padding:0 14px;border-radius:10px;border:1px solid '+(primary?'#2563eb':'#d0d0d0')+';background:'+(primary?'#2563eb':'#fff')+';color:'+(primary?'#fff':'#111')+';cursor:pointer;font-size:13px;';
    b.onclick=onClick; return b;
  }
  function inputText(v){ var i=el('input'); i.type='text'; i.value=v==null?'':String(v); i.style.cssText='height:32px;border:1px solid #d0d0d0;border-radius:9px;padding:0 10px;font-size:13px;box-sizing:border-box;'; return i;}
  function inputNum(v,min,max,step){ var i=el('input'); i.type='number'; i.value=v==null?'':String(v); if(min!=null)i.min=String(min); if(max!=null)i.max=String(max); if(step!=null)i.step=String(step); i.style.cssText='height:32px;border:1px solid #d0d0d0;border-radius:9px;padding:0 10px;font-size:13px;box-sizing:border-box;'; return i;}
  function selectBox(opts,cur){ var s=el('select'); s.style.cssText='height:32px;border:1px solid #d0d0d0;border-radius:9px;padding:0 8px;font-size:13px;background:#fff;'; opts.forEach(function(o){ var op=el('option'); op.value=o.value; op.textContent=o.label; if(String(cur)===String(o.value)) op.selected=true; s.appendChild(op); }); return s;}
  function field(label, ctl){ var w=el('label'); w.style.cssText='display:flex;flex-direction:column;gap:4px;font-size:12px;color:#444;'; var t=el('div'); t.textContent=label; w.appendChild(t); w.appendChild(ctl); return w;}

  function getUi(){ return global.__dftsEditorUi || global.editorUi || null; }

  function normalizeSide(side){ side=String(side||'').toLowerCase(); if(side==='left'||side==='w')return'west'; if(side==='right'||side==='e')return'east'; if(side==='top'||side==='n')return'north'; if(side==='bottom'||side==='s')return'south'; if(side==='west'||side==='east'||side==='north'||side==='south')return side; return 'west'; }

  function groupPins(pins){
    var r={west:[],east:[],north:[],south:[],hidden:[]};
    (pins||[]).forEach(function(p){
      if(!p||!p.key)return;
      if(p.visible===false){ r.hidden.push(p); return; }
      var s=normalizeSide(p.side||'west'); r[s].push(p);
    });
    ['west','east','north','south'].forEach(function(s){ r[s].sort(function(a,b){return (a.order||0)-(b.order||0);}); for(var i=0;i<r[s].length;i++) r[s][i].order=i; });
    r.hidden.sort(function(a,b){ return String(a.key).localeCompare(String(b.key));});
    return r;
  }

  function buildDraftPins(def,draft,prevPins){
    var base = Model.buildPins(def,{gateKind:draft.gateKind,params:draft.params,invertOutput:draft.invertOutput});
    return Model.mergePinOverrides(base, prevPins||[], draft.pinOverrides||{});
  }

  function preview(host, def, draft, pins){
    host.innerHTML='';
    host.style.cssText='width:100%;height:260px;border:1px solid #eee;border-radius:12px;background:#fafafa;display:flex;align-items:center;justify-content:center;';
    var box=el('div'); box.style.cssText='width:240px;height:180px;position:relative;';
    host.appendChild(box);
    var label=el('div'); label.textContent=draft.customTitle||def.defaultLabel||''; label.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-weight:800;font-size:13px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    box.appendChild(label);

    // minimal svg body
    var svg=el('div'); svg.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:130px;height:100px;';
    var k=String(draft.gateKind||def.gateKind||'and').toLowerCase();
    var inv=!!draft.invertOutput || k==='nand'||k==='nor'||k==='xnor'||k==='not';
    var bk=k; if(k==='nand')bk='and'; if(k==='nor')bk='or'; if(k==='xnor')bk='xor';
    var bubble=inv?'<circle cx="120" cy="50" r="6" fill="white" stroke="#111" stroke-width="1"/>':'';
    var path='';
    if(bk==='mux'){ path='<path d="M20 10 L110 35 L110 65 L20 90 L10 90 L10 10 Z" fill="white" stroke="#111" stroke-width="1"/>'; }
    else if(bk==='not'||bk==='buf'){ path='<path d="M15 10 L15 90 L95 50 Z" fill="white" stroke="#111" stroke-width="1"/>'; if(inv||bk==='not') bubble='<circle cx="102" cy="50" r="6" fill="white" stroke="#111" stroke-width="1"/>'; }
    else if(bk==='or'||bk==='xor'){ path='<path d="M25 10 C70 5 110 25 110 50 C110 75 70 95 25 90 C40 70 40 30 25 10 Z" fill="white" stroke="#111" stroke-width="1"/>'; if(bk==='xor') path+='<path d="M18 12 C32 30 32 70 18 88" fill="none" stroke="#111" stroke-width="1"/>'; }
    else { path='<path d="M10 10 L70 10 C110 10 110 90 70 90 L10 90 Z" fill="white" stroke="#111" stroke-width="1"/>'; }
    svg.innerHTML='<svg viewBox="0 0 130 100" width="130" height="100">'+path+bubble+'</svg>';
    box.appendChild(svg);

    var g=groupPins(pins);
    function draw(list, side){
      for(var i=0;i<list.length;i++){
        var p=list[i]; var txt=p.displayName||p.name||''; var bus=(parseInt(p.busWidth,10)||1)>1 || !!p.range; var sw=bus?2:1;
        var line=el('div'); var t=el('div'); t.textContent=txt; t.style.cssText='font-size:12px;white-space:nowrap;max-width:60px;overflow:hidden;text-overflow:ellipsis;';
        if(side==='west'){ var y=30+i*18; line.style.cssText='position:absolute;left:30px;top:'+y+'px;width:18px;height:0;border-top:'+sw+'px solid #111;'; t.style.cssText+='position:absolute;left:0;top:'+(y-8)+'px;width:28px;text-align:right;';}
        if(side==='east'){ var y2=30+i*18; line.style.cssText='position:absolute;right:30px;top:'+y2+'px;width:18px;height:0;border-top:'+sw+'px solid #111;'; t.style.cssText+='position:absolute;right:0;top:'+(y2-8)+'px;width:28px;text-align:left;';}
        if(side==='south'){ var x=70+i*20; line.style.cssText='position:absolute;left:'+x+'px;bottom:30px;width:0;height:18px;border-left:'+sw+'px solid #111;'; t.style.cssText+='position:absolute;left:'+(x-10)+'px;bottom:8px;width:40px;text-align:center;';}
        if(side==='north'){ var x2=70+i*20; line.style.cssText='position:absolute;left:'+x2+'px;top:22px;width:0;height:18px;border-left:'+sw+'px solid #111;'; t.style.cssText+='position:absolute;left:'+(x2-10)+'px;top:0;width:40px;text-align:center;';}
        box.appendChild(line); box.appendChild(t);
      }
    }
    draw(g.west,'west'); draw(g.east,'east'); draw(g.north,'north'); draw(g.south,'south');
  }

  function pinItem(pin){
    var row=el('div'); row.draggable=true; row.dataset.pinKey=pin.key;
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid #e5e5e5;border-radius:10px;background:#fff;cursor:grab;user-select:none;margin-bottom:6px;';
    var name=el('div'); name.textContent=pin.displayName||pin.name; name.style.cssText='flex:1;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    var meta=el('div'); meta.textContent=(pin.side||'')+' '+(pin.type||''); meta.style.cssText='font-size:11px;color:#666;';
    row.appendChild(name); row.appendChild(meta);
    row.ondragstart=function(ev){ ev.dataTransfer.setData('text/plain', pin.key); ev.dataTransfer.effectAllowed='move'; };
    return row;
  }

  function makeDrop(title, side, onDrop){
    var w=el('div'); w.style.cssText='display:flex;flex-direction:column;gap:8px;min-height:120px;';
    var h=el('div'); h.textContent=title; h.style.cssText='font-size:12px;font-weight:800;color:#333;';
    var list=el('div'); list.dataset.side=side; list.style.cssText='flex:1;padding:8px;border:1px dashed #cfcfcf;border-radius:12px;background:#fafafa;min-height:120px;';
    list.ondragover=function(ev){ ev.preventDefault(); ev.dataTransfer.dropEffect='move'; };
    list.ondrop=function(ev){ ev.preventDefault(); var key=ev.dataTransfer.getData('text/plain'); if(key) onDrop(key, side, ev.target); };
    w.appendChild(h); w.appendChild(list);
    return {wrap:w, list:list};
  }

  Config.open = function(graph, body){
    var ui=getUi();
    if(!ui||!ui.showDialog){ if(mxUtils&&mxUtils.alert) mxUtils.alert('找不到 EditorUi'); return; }

    var defKey = Model._styleGet(graph.getModel().getStyle(body)||'', 'dftsIP_defKey', '');
    var def = (typeof NS.getDefinitionByKey==='function') ? NS.getDefinitionByKey(defKey) : (NS._defsByKey&&NS._defsByKey[defKey]) || null;
    if(!def){ if(mxUtils&&mxUtils.alert) mxUtils.alert('缺少 definition: '+defKey); return; }

    if(NS.Symbol && typeof NS.Symbol.getModel==='function' && !NS.Symbol.getModel(body)){
      var st0=Model.readStateFromBody(graph, body, def);
      var sym0=Model.buildSymbolModel(def, st0, {});
      NS.Symbol.setModel(body, sym0); NS.Symbol.relayout(graph, body);
    }

    var state0=Model.readStateFromBody(graph, body, def);
    var draft=clone(state0);
    draft.gateKind = draft.gateKind || def.gateKind;
    draft.params = Model.normalizeParams(def, draft.params || def.defaultParams || {});
    draft.pinOverrides = draft.pinOverrides || {};
    var curPins = (NS.Symbol&&NS.Symbol.getModel) ? ((NS.Symbol.getModel(body)||{}).pins||[]) : [];
    var draftPins = buildDraftPins(def, draft, curPins);

    var dlg=el('div'); dlg.style.cssText='width:980px;max-width:98vw;height:640px;max-height:92vh;display:flex;flex-direction:column;gap:10px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;';
    var tabs=el('div'); tabs.style.cssText='display:flex;gap:8px;';
    var content=el('div'); content.style.cssText='flex:1;min-height:0;border:1px solid #e8e8e8;border-radius:14px;padding:12px;box-sizing:border-box;overflow:hidden;background:#fff;';
    var footer=el('div'); footer.style.cssText='display:flex;justify-content:flex-end;gap:10px;padding:4px 2px;';
    dlg.appendChild(tabs); dlg.appendChild(content); dlg.appendChild(footer);

    var previewBox=el('div');

    function setTab(name){
      Array.from(tabs.children).forEach(function(b){ b.style.background='#fff'; b.style.borderColor='#d0d0d0'; b.style.color='#111';});
      var a=tabs.querySelector('[data-tab="'+name+'"]'); if(a){ a.style.background='#111'; a.style.borderColor='#111'; a.style.color='#fff'; }
      render(name);
    }
    function tabBtn(name,label){
      var b=el('button'); b.type='button'; b.dataset.tab=name; b.textContent=label;
      b.style.cssText='height:32px;padding:0 12px;border-radius:999px;border:1px solid #d0d0d0;background:#fff;cursor:pointer;font-size:13px;';
      b.onclick=function(){ setTab(name); }; tabs.appendChild(b);
    }
    tabBtn('basic','Basic'); tabBtn('pins','Pins (Drag)'); tabBtn('preview','Preview');

    function rebuild(prev){
      draft.params = Model.normalizeParams(def, draft.params||{});
      draftPins = buildDraftPins(def, draft, prev||draftPins);
      draft.pinOverrides = Model.toOverrideMap(draftPins);
    }

    function renderBasic(){
      content.innerHTML='';
      var grid=el('div'); grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;';
      var tIn=inputText(draft.customTitle||''); tIn.oninput=function(){ draft.customTitle=trim(tIn.value); preview(previewBox, def, draft, draftPins); };
      var iIn=inputText(draft.instanceName||''); iIn.oninput=function(){ draft.instanceName=trim(iIn.value); preview(previewBox, def, draft, draftPins); };
      grid.appendChild(field('Title (center label)', tIn));
      grid.appendChild(field('Instance name', iIn));

      var kindSel=selectBox([{value:'and',label:'AND'},{value:'or',label:'OR'},{value:'nand',label:'NAND'},{value:'nor',label:'NOR'},{value:'xor',label:'XOR'},{value:'xnor',label:'XNOR'},{value:'not',label:'NOT'},{value:'buf',label:'BUF'},{value:'mux',label:'MUX'}], draft.gateKind||def.gateKind);
      kindSel.onchange=function(){
        draft.gateKind=kindSel.value;
        draft.pinOverrides={};
        draft.params = (draft.gateKind==='mux') ? { dataInputs:2, busWidth:draft.params.busWidth||1, hasEnable:false, selectSide:'south' } : { inputCount:(draft.gateKind==='not'||draft.gateKind==='buf')?1:2, busWidth:draft.params.busWidth||1 };
        rebuild([]);
        renderBasic();
      };
      grid.appendChild(field('Gate type', kindSel));

      if((draft.gateKind||def.gateKind)==='mux'){
        var di=inputNum(draft.params.dataInputs||2,2,256,1); di.oninput=function(){ draft.params.dataInputs=parseInt(di.value,10)||2; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var bw=inputNum(draft.params.busWidth||1,1,1024,1); bw.oninput=function(){ draft.params.busWidth=parseInt(bw.value,10)||1; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var ss=selectBox([{value:'south',label:'Select bottom'},{value:'north',label:'Select top'}], draft.params.selectSide||'south'); ss.onchange=function(){ draft.params.selectSide=ss.value; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var en=el('input'); en.type='checkbox'; en.checked=!!draft.params.hasEnable; en.onchange=function(){ draft.params.hasEnable=!!en.checked; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var enWrap=el('div'); enWrap.style.cssText='display:flex;align-items:center;gap:8px;height:32px;'; enWrap.appendChild(en); var et=el('div'); et.textContent='Enable (EN)'; enWrap.appendChild(et);
        grid.appendChild(field('Data inputs', di));
        grid.appendChild(field('Bus width', bw));
        grid.appendChild(field('Select side', ss));
        grid.appendChild(field('Enable', enWrap));
      }else{
        var minIn=(draft.gateKind==='not'||draft.gateKind==='buf')?1:2;
        var ic=inputNum(draft.params.inputCount||minIn,minIn,64,1); ic.oninput=function(){ draft.params.inputCount=parseInt(ic.value,10)||minIn; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var bw2=inputNum(draft.params.busWidth||1,1,1024,1); bw2.oninput=function(){ draft.params.busWidth=parseInt(bw2.value,10)||1; rebuild(draftPins); preview(previewBox, def, draft, draftPins);};
        var inv=el('input'); inv.type='checkbox'; inv.checked=!!draft.invertOutput || draft.gateKind==='nand'||draft.gateKind==='nor'||draft.gateKind==='xnor'||draft.gateKind==='not';
        inv.onchange=function(){ draft.invertOutput=!!inv.checked; preview(previewBox, def, draft, draftPins);};
        var invWrap=el('div'); invWrap.style.cssText='display:flex;align-items:center;gap:8px;height:32px;'; invWrap.appendChild(inv); var it=el('div'); it.textContent='Invert output (bubble)'; invWrap.appendChild(it);
        grid.appendChild(field('Input count', ic));
        grid.appendChild(field('Bus width', bw2));
        grid.appendChild(field('Invert', invWrap));
      }

      content.appendChild(grid);
      var spacer=el('div'); spacer.style.height='12px'; content.appendChild(spacer);
      content.appendChild(previewBox);
      preview(previewBox, def, draft, draftPins);
    }

    function renderPins(){
      content.innerHTML='';
      var wrap=el('div'); wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;height:100%;min-height:0;overflow:auto;';
      content.appendChild(wrap);

      var g=groupPins(draftPins);

      function findPin(key){ for(var i=0;i<draftPins.length;i++) if(draftPins[i].key===key) return draftPins[i]; return null; }

      function applyOrder(side){
        var arr=g[side]||[];
        arr.sort(function(a,b){return (a.order||0)-(b.order||0);});
        for(var i=0;i<arr.length;i++) arr[i].order=i;
      }

      function refresh(){
        g=groupPins(draftPins);
        left.list.innerHTML=''; right.list.innerHTML=''; top.list.innerHTML=''; bot.list.innerHTML=''; hidden.list.innerHTML='';
        g.west.forEach(function(p){ left.list.appendChild(pinItem(p)); });
        g.east.forEach(function(p){ right.list.appendChild(pinItem(p)); });
        g.north.forEach(function(p){ top.list.appendChild(pinItem(p)); });
        g.south.forEach(function(p){ bot.list.appendChild(pinItem(p)); });
        g.hidden.forEach(function(p){ hidden.list.appendChild(pinItem(p)); });
        draft.pinOverrides = Model.toOverrideMap(draftPins);
        preview(previewBox, def, draft, draftPins);
      }

      function onDrop(key, dest, target){
        var p=findPin(key); if(!p) return;
        if(dest==='hidden'){ p.visible=false; }
        else { p.visible=true; p.side=dest; }
        // drop before target pin if any
        if(dest!=='hidden'){
          var beforeKey=null;
          var node=target;
          while(node && node !== (dest==='west'?left.list:dest==='east'?right.list:dest==='north'?top.list:bot.list)){
            if(node.dataset && node.dataset.pinKey){ beforeKey=node.dataset.pinKey; break; }
            node=node.parentNode;
          }
          var arr=g[dest].filter(function(pp){ return pp.key!==p.key; }).map(function(pp){return pp.key;});
          if(beforeKey && arr.indexOf(beforeKey)>=0){ arr.splice(arr.indexOf(beforeKey),0,p.key); } else { arr.push(p.key); }
          for(var i=0;i<arr.length;i++){ var pp=findPin(arr[i]); if(pp){ pp.side=dest; pp.visible=true; pp.order=i; } }
        }
        refresh();
      }

      var left=makeDrop('Left (west)','west',onDrop);
      var right=makeDrop('Right (east)','east',onDrop);
      var top=makeDrop('Top (north)','north',onDrop);
      var bot=makeDrop('Bottom (south)','south',onDrop);
      var hidden=makeDrop('Hidden','hidden',onDrop);

      wrap.appendChild(left.wrap); wrap.appendChild(right.wrap); wrap.appendChild(top.wrap); wrap.appendChild(bot.wrap); wrap.appendChild(hidden.wrap);

      // initial fill
      refresh();
    }

    function renderPreview(){
      content.innerHTML='';
      content.appendChild(previewBox);
      preview(previewBox, def, draft, draftPins);
    }

    function render(name){
      if(name==='basic') return renderBasic();
      if(name==='pins') return renderPins();
      return renderPreview();
    }

    footer.appendChild(btn('Cancel', false, function(){ ui.hideDialog(); }));
    footer.appendChild(btn('Apply', true, function(){
      draft.pinOverrides = Model.toOverrideMap(draftPins);
      graph.getModel().beginUpdate();
      try{
        Model.writeStateToBody(graph, body, def, draft);
        var sym = Model.buildSymbolModel(def, Object.assign({}, draft, { pinOverrides: draft.pinOverrides, prevPins: draftPins }), {});
        NS.Symbol.setModel(body, sym);
        var nat = NS.Symbol.computeNaturalMetrics(sym);
        var g2 = body.geometry && body.geometry.clone ? body.geometry.clone() : null;
        if(g2){ g2.width = Math.min(g2.width, nat.naturalW); g2.height = Math.min(g2.height, nat.naturalH); graph.getModel().setGeometry(body, g2); }
        NS.Symbol.relayout(graph, body);
      } finally { graph.getModel().endUpdate(); }
      ui.hideDialog();
    }));

    ui.showDialog(dlg, 980, 640, true, true);
    setTab('basic');
  };
})(this);
