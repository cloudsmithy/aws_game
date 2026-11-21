import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

// 被测的游戏页面。默认是仓库里的 code/index.html；
// 设 GAME_HTML=<绝对路径> 可以测另一份构建产物（比如并行开发时自己 vite build 到 /tmp 的那份），不用覆盖 code/index.html。
// 只影响测试读哪份页面；lint、体积、版本这些按 git 比较的工具仍然看 code/index.html。
const custom = process.env.GAME_HTML;
if (custom && !isAbsolute(custom)) throw new Error(`GAME_HTML 必须是绝对路径：${custom}`);
export const gameFile = custom ? pathToFileURL(custom) : new URL('../../code/index.html', import.meta.url);
