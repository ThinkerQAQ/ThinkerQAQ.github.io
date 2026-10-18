// Runs only in the actual Medium editor's MAIN world. No Cookie or XSRF
// value is ever returned to BlogCTL; only native fileId and dimensions.
export async function uploadMediumInPage(base64, mimeType, filename, expectedDraftID) {
  const expectedPath = "/p/" + expectedDraftID + "/edit";
  if (location.origin !== "https://medium.com" || location.pathname !== expectedPath ||
      !/^[a-f0-9]{8,24}$/.test(expectedDraftID)) {
    return { error: "Medium editor tab URL does not match the selected draft" };
  }
  if (!/^[a-zA-Z0-9._-]{1,160}$/.test(filename) || !/^image\/(?:png|jpeg|webp|gif)$/.test(mimeType)) {
    return { error: "Unsupported Medium image filename or format" };
  }
  try {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append("uploadedFile", new Blob([bytes], { type: mimeType }), filename);
    const xsrfCookie = document.cookie.split(";").map((entry) => entry.trim())
      .find((entry) => entry.startsWith("xsrf="));
    if (!xsrfCookie) return { error: "Medium editor XSRF cookie is unavailable" };
    const xsrf = decodeURIComponent(xsrfCookie.slice("xsrf=".length));
    const response = await fetch("/_/upload?source=6", {
      method: "POST", credentials: "same-origin", body: form,
      headers: { accept: "*/*", "x-obvious-cid": "web", "x-xsrf-token": xsrf },
    });
    if (!response.ok) return { error: "Medium browser upload HTTP " + response.status };
    const raw = await response.text();
    const start = raw.indexOf("{");
    if (start < 0) return { error: "Medium image upload returned no JSON" };
    const payload = JSON.parse(raw.slice(start));
    const value = payload?.payload?.value;
    if (payload?.success !== true || !value?.fileId) {
      return { error: "Medium image upload returned no native file ID" };
    }
    return { fileId: String(value.fileId), width: Number(value.imgWidth), height: Number(value.imgHeight) };
  } catch {
    return { error: "Medium browser image upload request failed" };
  }
}

export function validMediumUploadTask(task) {
  return Boolean(task && /^[a-f0-9]{32}$/.test(task.id ?? "") &&
    /^[a-f0-9]{8,24}$/.test(task.draftId ?? "") &&
    /^[a-zA-Z0-9._-]{1,160}$/.test(task.filename ?? "") &&
    /^image\/(?:png|jpeg|gif|webp)$/.test(task.mimeType ?? "") &&
    typeof task.base64 === "string" && task.base64.length > 0 &&
    task.base64.length <= 28 * 1024 * 1024);
}
