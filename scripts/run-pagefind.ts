// 在 astro build 之后运行 Pagefind。
// 之前直接在 package.json 里写 `pagefind --site dist`，在 Cloudflare Pages（产物在
// dist/client）上会索引出 /client/... 的假路径，并且索引输出到 dist/pagefind，
// 根本不会随站点部署 —— 线上搜索一直是 404。这里对准真正的站点根目录再跑，
// 索引会输出到 <root>/pagefind，随站点一起上传。

import { spawnSync } from "node:child_process";
import { resolveSiteRoot } from "./site-root";

const siteRoot = resolveSiteRoot();

// 索引输出到 <站点根>/pagefind。GitHub Pages 项目页会把整个产物挂载到 /<repo>/ 下，
// 站内通过 url("/pagefind/pagefind.js") 加载（自动拼上 base），两者正好对应；
// 搜索结果链接的 base 前缀由 Navbar 里 pagefind.options({ baseUrl }) 处理。
const result = spawnSync("pagefind", ["--site", siteRoot], {
	stdio: "inherit",
	// Windows 下 .bin 里是 .cmd 包装，需要 shell 才能解析到
	shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
