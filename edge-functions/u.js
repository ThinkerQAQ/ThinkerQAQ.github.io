import { AI_WORKER, noStoreResponse, translateResponse, upstreamError, upstreamFetch } from "./_proxy.js";

export default async function onRequest({ request }) {
  if (request.method !== "GET") return noStoreResponse("Method not allowed", 405, { allow: "GET" });
  try {
    const response = await upstreamFetch(AI_WORKER + "/u.js", {
      headers: { accept: "application/javascript,text/javascript,*/*;q=0.1" },
    });
    return translateResponse(response, { script: true });
  } catch {
    return upstreamError();
  }
}
