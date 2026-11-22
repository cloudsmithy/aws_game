import { UI } from '../core/02b-ui-port.js';
import { CARD_DEAL, MODAL_CUR, VIEW_CUR, __set_CARD_DEAL, __set_MODAL_CUR, aipBtnUpd, ask, dealNow, info, modal, modalBlocks, modalHidden, modalMin, tourOpen, viewOpen } from './10-modal.js';
import { cardHtml, dealHtml, dealSfx, pcardHtml, peekCard, showCard } from './11-cards-deeds.js';
import { propInfoHtml } from './11c-level-table.js';
import { overScreens } from './26f-over-screens.js';
import { timedOver } from './26e-manual.js';
import { MOVE_TO, __set_MOVE_TO } from './27a-board.js';
import { SQFX, rentFx } from './27b-arch-notes.js';
import { hopRender, render } from './27d-side.js';
import { animK, reportErr, save, toast } from './28-setup-save.js';
import { sfx } from './32-sfx.js';
import { FX } from './33-fx3d.js';
import { inGame, vimErr } from './39-bosskey.js';
// ================= 界面接口：把 ui/ 的实现注册进 UI（core/02b-ui-port.js） =================
// engine/、rules/ 不 import ui/，要开弹窗、重画、放特效时调 UI.ask、UI.render、UI.FX……；这里在所有界面模块加载完、启动代码之前把实现挂上去。
// let 变量（弹窗、动画的当前状态）用 getter，读到的是实时值；改它们走对应的 UI.__set_X。
// 换一套界面（比如 Node 里跑电脑对局、单元测试）就换掉这个文件，给 UI 挂上自己的实现
Object.assign(UI, { aipBtnUpd, modalBlocks, modalHidden, modalMin, tourOpen, FX, SQFX, __set_CARD_DEAL, __set_MODAL_CUR, __set_MOVE_TO, animK, ask, cardHtml, dealHtml, dealNow, dealSfx, hopRender, inGame, info, modal, overScreens, pcardHtml, peekCard, propInfoHtml, render, rentFx, reportErr, save, sfx, showCard, timedOver, toast, viewOpen, vimErr });
Object.defineProperty(UI, 'CARD_DEAL', { get: () => CARD_DEAL, enumerable: true });
Object.defineProperty(UI, 'MODAL_CUR', { get: () => MODAL_CUR, enumerable: true });
Object.defineProperty(UI, 'MOVE_TO', { get: () => MOVE_TO, enumerable: true });
Object.defineProperty(UI, 'VIEW_CUR', { get: () => VIEW_CUR, enumerable: true });
