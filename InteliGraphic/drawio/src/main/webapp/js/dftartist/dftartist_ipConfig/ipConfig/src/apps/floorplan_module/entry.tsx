import { registerDftsType } from '../../shared/dfts/registry';
import { getDftsTypeFromCell } from '../../shared/dfts/cell';
import { floorplanModuleDefinition } from './definition';

registerDftsType(floorplanModuleDefinition);

declare global {
  interface Window {
    __DFTS_FLOORPLAN_LABEL_DRAG_PATCHED__?: boolean;
    Graph?: any;
    mxGraph?: any;
  }
}

function patchFloorplanLabelDrag() {
  if (window.__DFTS_FLOORPLAN_LABEL_DRAG_PATCHED__) return;

  const GraphCtor = window.Graph || window.mxGraph;
  if (!GraphCtor?.prototype) return;

  const proto = GraphCtor.prototype;
  const originalIsLabelMovable = proto.isLabelMovable;

  proto.isLabelMovable = function (cell: any) {
    try {
      if (getDftsTypeFromCell(this, cell) === "floorplan_module") {
        return !this.isCellLocked(cell);
      }
    } catch {}

    return originalIsLabelMovable?.apply(this, arguments as any);
  };

  window.__DFTS_FLOORPLAN_LABEL_DRAG_PATCHED__ = true;
}

function patchFloorplanLabelDragOnce() {
  if (window.__DFTS_FLOORPLAN_LABEL_DRAG_PATCHED__) return;
  if (window.Graph?.prototype || window.mxGraph?.prototype) {
    patchFloorplanLabelDrag();
    return;
  }

  let tries = 0;
  const timer = window.setInterval(() => {
    if (window.__DFTS_FLOORPLAN_LABEL_DRAG_PATCHED__) {
      window.clearInterval(timer);
      return;
    }
    if (window.Graph?.prototype || window.mxGraph?.prototype) {
      patchFloorplanLabelDrag();
      window.clearInterval(timer);
      return;
    }
    tries += 1;
    if (tries >= 400) window.clearInterval(timer);
  }, 50);
}

patchFloorplanLabelDragOnce();
