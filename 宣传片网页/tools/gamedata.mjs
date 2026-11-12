// 从 index.html 里取出游戏数据（服务、卡牌、题库、图标），给文档和卡牌生成脚本用
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 游戏的中文原文件。默认是 ROOT/code/index.html（开发目录）；在 aws_game 仓库里（脚本在 宣传片网页/tools/）跑时，
// 仓库的 code/index.html 是多语言打包页，要用 GAME_HTML 指向开发目录里的 code/index.html
export const GAME_HTML = process.env.GAME_HTML ? path.resolve(process.env.GAME_HTML) : path.join(ROOT, 'code', 'index.html');
if (!fs.existsSync(GAME_HTML)) throw new Error(`找不到 ${GAME_HTML}：在 aws_game 仓库里跑要用 GAME_HTML=开发目录/code/index.html 指定游戏的中文原文件`);
const html = fs.readFileSync(GAME_HTML, 'utf8');
// 主脚本：带「状态」分界线的那一段（<head> 里还有一段先定外观的小脚本）
const script = html.split('<script>').map(s => s.split('</script>')[0]).find(s => s.includes('// ================= 状态 ================='));
if (!script || !script.includes('const FIXED_FEE')) throw new Error(`${GAME_HTML} 不是游戏的中文原文件（可能是仓库里的多语言打包页），请用 GAME_HTML=开发目录/code/index.html 指定`);
const pre = script.split('// ================= 状态 =================')[0];
// 过路费、运行费、升级效果这几个函数在状态区之后，单独摘出来
const grab = re => { const m = script.match(re); if (!m) throw new Error('找不到 ' + re); return m[0]; };
const fns = [
  grab(/const effActive = [^\n]*\n/),
  grab(/const FIXED_FEE = [\s\S]*?\};\n/),
  grab(/function runCost\(i[^)]*\) \{[\s\S]*?\n\}\n/),   // 参数可能不止 i（比如 noIp）
  grab(/const trafficMul = [^\n]*\n/),
  grab(/function baseRent\(i, dice\) \{[^\n]*\n/),
  grab(/function baseRent0\(i, dice\) \{[\s\S]*?\n\}\n/),
  grab(/const capCost = [^\n]*\n/),
].join('');
globalThis.location = { search: '' };
const D = new Function(`${pre}
let S = { props: {} };
const P = () => ({ id: 0 });
const ownsGroup = () => false, active = () => false;
${fns}
// 某块服务在第 lv 级、集齐/没集齐整组时的过路费和每圈运行费（点数按平均 7 算）
function stats(i, lv, full = false) {
  S.props = { [i]: { level: lv, cap: 0, stopped: false, owner: 0 } };
  const r = full && lv === 0 ? baseRent(i, 7) * 2 : baseRent(i, 7);
  return { rent: r, run: runCost(i) };
}
// 第 lv 级时收到过路费另交的比例：按用量计费的请求费（第几级有「降成本」就减半）、按 token 计费的 token 成本；别的计费方式是 0
function feeAt(i, lv) {
  const s = SQ[i]; S.props = { [i]: { level: lv, cap: 0, stopped: false, owner: 0 } };
  return s.bill === 'token' ? BAL.token : s.bill === 'req' ? (effActive(i, 'cost') ? BAL.req / 2 : BAL.req) : 0;
}
return { DLC, QBANK, AWSI, AWSBG, GROUPS, SVC, UTIL, CAP, CAP_MAX, SQ, IX, LAYOUT, SPECIAL, COMBOS, INC, REI, ROLES, QUIZ, CATS, TYPE_N, BILL_N, EFF_N, effLabel, BAL, TOKEN,
  isInst, haOf, lvName, labColor, stats, feeAt, capCost, sideCost, upCost, CARDN: typeof CARDN !== 'undefined' ? CARDN : {} };`)();
export default D;
