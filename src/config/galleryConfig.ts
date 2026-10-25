import type { GalleryConfig } from "@/types/galleryConfig";

// 相册配置
export const galleryConfig: GalleryConfig = {
	// 相册列表（当前为空；添加相册时：1. 在 public/gallery/ 下建立对应目录并放入图片；
	// 2. 在此添加一个相册配置项；3. 在 siteConfig.ts 中把 pages.gallery 改回 true）
	albums: [],

	// 瀑布流最小列宽(px)，浏览器根据容器宽度自动计算列数，默认 240
	// 值越小列数越多，值越大列数越少
	columnWidth: 240,
};
