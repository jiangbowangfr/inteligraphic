(function (global) {
  'use strict';

  var NS = global.DftsIP = global.DftsIP || {};
  var LG = NS.LogicGate = NS.LogicGate || {};
  var Model = LG.Model;
  var Config = LG.Config;
  if (!Model) return;

  if (LG.__createPhase2Loaded) return;
  LG.__createPhase2Loaded = true;

  if (typeof NS.registerConfigOpener === 'function' && Config && typeof Config.open === 'function') {
    NS.registerConfigOpener('logic_gate', function (graph, body) {
      return Config.open(graph, body);
    });
  }

  if (typeof NS.getDefinitionByKey !== 'function') {
    NS.getDefinitionByKey = function (key) {
      return (NS._defsByKey && NS._defsByKey[key]) || null;
    };
  }
})(this);
