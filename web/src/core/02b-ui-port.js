// ================= 界面接口 =================
// 游戏逻辑（engine/、rules/）要和界面打交道时都经过这里：UI.ask(spec) 问玩家、UI.render() 重画、UI.FX.xxx() 放特效……
// 实现由 ui/49-ui-bind.js 在加载时注册进来；游戏逻辑本身不 import 任何 ui/ 模块。有哪些接口见 ui/49-ui-bind.js
export const UI = {};
