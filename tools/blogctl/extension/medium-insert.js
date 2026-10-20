// These functions execute in the logged-in Medium editor's MAIN world.
// Neither manipulates private Medium deltas or exposes browser credentials.
export async function insertMediumImageInPage(base64, mimeType, filename, expectedDraftID, marker) {
  const fail = (message) => ({ error: message });
  if (location.origin !== "https://medium.com" ||
      location.pathname !== "/p/" + expectedDraftID + "/edit" ||
      !/^[0-9a-f]{8,24}$/.test(expectedDraftID) ||
      !/^\[BLOGCTL_IMAGE_\d{3}\]$/.test(marker) ||
      !/^image\/(?:png|jpeg|gif|webp)$/.test(mimeType)) {
    return fail("Medium editor image task failed validation");
  }
  const imageCount = () => new Set([...document.querySelectorAll("figure img,article img,[contenteditable] img")]).size;
  const matches = () => {
    const all = [...document.querySelectorAll("p,div,span,h1,h2,h3,h4")].filter((el) =>
      el.isContentEditable && el.textContent?.trim() === marker &&
      ![...el.querySelectorAll("p,div,span,h1,h2,h3,h4")]
        .some((child) => child.isContentEditable && child.textContent?.trim() === marker));
    return all;
  };
  const locate = () => {
    const found = matches();
    if (found.length !== 1) throw new Error("Medium editor marker " + marker + " occurs " + found.length + " times");
    const node = found[0];
    let editable = node;
    while (editable && editable.getAttribute?.("contenteditable") !== "true") editable = editable.parentElement;
    if (!editable) throw new Error("Medium image marker is not editable");
    return { node, editable };
  };
  const select = (node, editable, collapse) => {
    node.scrollIntoView({ block: "center" });
    editable.focus({ preventScroll: true });
    const r = document.createRange();
    r.selectNodeContents(node);
    if (collapse) r.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(r);
  };
  try {
    // Medium may show a Cloudflare challenge at the SAME /p/{id}/edit URL.
    // Wait for the real editor and marker, not merely tab.status=complete.
    let ready = false;
    const readyStart = Date.now();
    while (Date.now() - readyStart < 70000) {
      if (document.querySelector('[contenteditable="true"]') && matches().length === 1) {
        ready = true; break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!ready) {
      const body = document.body?.innerText || "";
      if (/验证您是真人|请验证您是真人|verify you are human|Checking your browser|正在进行安全验证/i.test(body)) {
        return fail("Medium requires human verification in the browser; finish the challenge in this existing draft before resuming");
      }
      return fail("Medium editor did not render the image marker after 70 seconds; draft may be blocked or text save did not persist");
    }
    const { node, editable } = locate();
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const file = new File([bytes], filename, { type: mimeType });
    const before = imageCount();
    select(node, editable, true);
    const data = new DataTransfer();
    data.items.add(file);
    const event = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true, composed: true });
    editable.dispatchEvent(event);
    const start = Date.now();
    while (Date.now() - start < 24000 && imageCount() <= before) {
      await new Promise((r) => setTimeout(r, 250));
    }
    if (imageCount() <= before) return fail("Medium editor did not insert the PNG at " + marker);
    // Do not delete a marker if the editor mutated it unexpectedly.
    const current = locate();
    select(current.node, current.editable, false);
    if (!document.execCommand("delete", false, null) || matches().length !== 0) {
      return fail("Image was inserted, but marker deletion failed; inspect before retry");
    }
    // Wait for Medium's save indicator. The final task will reload and verify.
    await new Promise((r) => setTimeout(r, 500));
    return { inserted: true, imageCount: imageCount() };
  } catch (error) {
    return fail(String(error?.message || error).slice(0, 260));
  }
}

// This must run on a freshly loaded editor after all image tasks finish.
export function verifyMediumDraftInPage(expectedDraftID, expectedImages) {
  if (location.origin !== "https://medium.com" ||
      location.pathname !== "/p/" + expectedDraftID + "/edit") {
    return { error: "Browser verification is not on the expected Medium draft" };
  }
  const root = document.querySelector('[contenteditable="true"]');
  if (!root) return { error: "Medium draft editor has not loaded" };
  const markers = [...document.querySelectorAll("p,div,span")].filter((el) =>
    el.isContentEditable && /^\[BLOGCTL_IMAGE_\d{3}\]$/.test(el.textContent?.trim() || ""));
  const pictures = new Set([...document.querySelectorAll("figure img,article img,[contenteditable] img")]);
  if (markers.length !== 0) return { error: markers.length + " image placeholders remain after reload" };
  if (pictures.size !== expectedImages) {
    return { error: "Medium persisted " + pictures.size + " images; expected " + expectedImages };
  }
  return { inserted: true, imageCount: pictures.size };
}

export function validMediumEditorTask(task) {
  if (!task || !/^[0-9a-f]{32}$/.test(task.id || "") ||
      !/^[0-9a-f]{8,24}$/.test(task.draftId || "")) return false;
  if (task.mode === "verify") return Number.isInteger(task.expectedImages) && task.expectedImages >= 0 && task.expectedImages <= 500;
  return task.mode === "insert" && /^\[BLOGCTL_IMAGE_\d{3}\]$/.test(task.marker || "") &&
    /^[\w.-]{1,160}$/.test(task.filename || "") &&
    /^image\/(?:png|jpeg|gif|webp)$/.test(task.mimeType || "") &&
    typeof task.base64 === "string" && task.base64.length > 0 && task.base64.length < 28 * 1024 * 1024;
}
