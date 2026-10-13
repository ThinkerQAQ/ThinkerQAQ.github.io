import type { SlideData } from "photoswipe";

export function initLifeAlbums(): void {
  document.querySelectorAll<HTMLElement>("[data-life-album]").forEach((album) => {
    if (album.dataset.ready) return;
    album.dataset.ready = "true";
    const dataElement = album.querySelector("[data-album-images]");
    if (!dataElement?.textContent) return;
    const photos: SlideData[] = JSON.parse(dataElement.textContent);
    const more = album.querySelector<HTMLButtonElement>("[data-load-photos]");
    const template = album.querySelector<HTMLTemplateElement>("[data-photo-batch]");
    const grid = album.querySelector(".life-gallery");
    if (more && template && grid) {
      more.hidden = false;
      more.addEventListener("click", () => {
        const batch = Array.from(template.content.children).slice(0, 9);
        batch.forEach((photo) => grid.append(photo));
        const nextPhoto = batch[0] as HTMLElement | undefined;
        if (!template.content.children.length) {
          more.hidden = true;
          // Preserve keyboard focus when the final load button disappears.
          nextPhoto?.focus();
        }
      });
    }
    let opening = false;
    album.addEventListener("click", async (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-photo-index]");
      if (!link || !album.contains(link) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (opening) return;
      opening = true;
      try {
        const { default: PhotoSwipe } = await import("photoswipe");
        const zh = album.dataset.locale === "zh";
        const viewer = new PhotoSwipe({
          dataSource: photos,
          index: Number(link.dataset.photoIndex),
          loop: false,
          showHideAnimationType: "none",
          closeTitle: zh ? "关闭" : "Close",
          zoomTitle: zh ? "缩放" : "Zoom",
          arrowPrevTitle: zh ? "上一张" : "Previous",
          arrowNextTitle: zh ? "下一张" : "Next",
          errorMsg: zh ? "照片加载失败" : "The photo could not be loaded",
          preload: [1, 1],
        });
        viewer.on("destroy", () => { opening = false; link.focus(); });
        viewer.init();
      } catch {
        opening = false;
        window.location.assign(link.href);
      }
    });
  });
}
