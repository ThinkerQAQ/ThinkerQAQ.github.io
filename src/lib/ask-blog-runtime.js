// @ts-nocheck
import { unified } from "unified";
import remarkParse from "remark-parse";

export function initAskBlog(root) {
  if (!root) return null;

  const endpoint = root.dataset.endpoint?.trim() || "";
  const turnstileSiteKey = root.dataset.turnstileSitekey?.trim() || "";
  const locale = root.dataset.locale?.trim() || "zh";
  const nonDefaultLocales = new Set(JSON.parse(root.dataset.nonDefaultLocales || "[]"));
  const copyElement = root.querySelector("[data-ask-copy]");
  const copy = JSON.parse(copyElement?.textContent || "{}");
  const toggle = root.querySelector("[data-ask-toggle]");
  const close = root.querySelector("[data-ask-close]");
  const clear = root.querySelector("[data-ask-clear]");
  const panel = root.querySelector("[data-ask-panel]");
  const form = root.querySelector("[data-ask-form]");
  const input = root.querySelector("[data-ask-input]");
  const submit = root.querySelector("[data-ask-submit]");
  const status = root.querySelector("[data-ask-status]");
  const conversationElement = root.querySelector("[data-ask-conversation]");
  const turnstileContainer = root.querySelector("[data-turnstile-container]");
  const markdownParser = unified().use(remarkParse);

  const CONVERSATION_KEY = `thinkerqaq:ask-blog:conversation:${locale}:v2`;
  const SECURITY_KEY = "thinkerqaq:ask-blog:security-session:v1";
  const MAX_STORED_MESSAGES = 12;
  const MAX_HISTORY_MESSAGES = 6;
  const MAX_HISTORY_CHARS = 9000;
  const MAX_HISTORY_MESSAGE_CHARS = 3000;
  const SESSION_SAFETY_WINDOW_MS = 15_000;

  let conversation = [];
  let turnstileLoadPromise;
  let turnstileWidgetId = null;
  let turnstileAttempt = null;

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) window.setTimeout(() => input.focus(), 0);
  };

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const normalizeSourceUrl = (rawUrl, collection) => {
    const url = new URL(String(rawUrl || ""), window.location.origin);
    if (url.origin !== window.location.origin) return null;

    let segments = url.pathname.split("/").filter(Boolean);
    if (
      (segments[0] === "articles" || segments[0] === "notes")
      && nonDefaultLocales.has(segments[1])
    ) {
      segments = [segments[1], segments[0], ...segments.slice(2)];
      url.pathname = `/${segments.join("/")}/`;
    }

    const collectionIndex = nonDefaultLocales.has(segments[0]) ? 1 : 0;
    if (segments[collectionIndex] !== collection || segments.length <= collectionIndex + 1) return null;
    return url;
  };

  const normalizeStoredSource = (source) => {
    try {
      const citationIndex = Number(source?.citationIndex);
      const collection = String(source?.collection || "");
      const title = String(source?.title || "").trim().slice(0, 200);
      if (!Number.isInteger(citationIndex) || citationIndex < 1 || citationIndex > 20) return null;
      if (collection !== "articles" && collection !== "notes") return null;
      const url = normalizeSourceUrl(source?.url, collection);
      if (!title || !url) return null;
      return { citationIndex, collection, title, url: url.href };
    } catch {
      return null;
    }
  };

  const loadConversation = () => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(CONVERSATION_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(-MAX_STORED_MESSAGES).map((message) => {
        const role = message?.role === "assistant" ? "assistant" : message?.role === "user" ? "user" : "";
        const content = String(message?.content || "").trim();
        if (!role || !content) return null;
        const sources = role === "assistant" && Array.isArray(message?.sources)
          ? message.sources.map(normalizeStoredSource).filter(Boolean)
          : [];
        return { role, content, sources };
      }).filter(Boolean);
    } catch {
      return [];
    }
  };

  const saveConversation = () => {
    conversation = conversation.slice(-MAX_STORED_MESSAGES);
    try { sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversation)); } catch {}
  };

  const clearSecuritySession = () => {
    try { sessionStorage.removeItem(SECURITY_KEY); } catch {}
  };

  const loadSecuritySession = () => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SECURITY_KEY) || "null");
      const token = String(parsed?.token || "");
      const expiresAt = Number(parsed?.expiresAt || 0);
      if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now() + SESSION_SAFETY_WINDOW_MS) {
        clearSecuritySession();
        return null;
      }
      return { token, expiresAt };
    } catch {
      clearSecuritySession();
      return null;
    }
  };

  const saveSecuritySession = (payload) => {
    const token = String(payload?.sessionToken || "");
    const expiresAt = Number(payload?.sessionExpiresAt || 0);
    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return;
    try { sessionStorage.setItem(SECURITY_KEY, JSON.stringify({ token, expiresAt })); } catch {}
  };

  const renderMarkdownNode = (node, parent) => {
    const appendChildren = (element = parent) => {
      for (const child of node.children || []) renderMarkdownNode(child, element);
    };
    switch (node.type) {
      case "root": appendChildren(); return;
      case "text": parent.append(document.createTextNode(node.value || "")); return;
      case "paragraph": { const el = document.createElement("p"); appendChildren(el); parent.append(el); return; }
      case "strong": { const el = document.createElement("strong"); appendChildren(el); parent.append(el); return; }
      case "emphasis": { const el = document.createElement("em"); appendChildren(el); parent.append(el); return; }
      case "inlineCode": { const el = document.createElement("code"); el.textContent = node.value || ""; parent.append(el); return; }
      case "code": {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = node.value || "";
        pre.append(code); parent.append(pre); return;
      }
      case "heading": { const el = document.createElement(node.depth <= 2 ? "h3" : "h4"); appendChildren(el); parent.append(el); return; }
      case "list": { const el = document.createElement(node.ordered ? "ol" : "ul"); appendChildren(el); parent.append(el); return; }
      case "listItem": { const el = document.createElement("li"); appendChildren(el); parent.append(el); return; }
      case "blockquote": { const el = document.createElement("blockquote"); appendChildren(el); parent.append(el); return; }
      case "break": parent.append(document.createElement("br")); return;
      case "link":
      case "linkReference": appendChildren(); return;
      case "html": parent.append(document.createTextNode(node.value || "")); return;
      default:
        if (node.children) appendChildren();
        else if (typeof node.value === "string") parent.append(document.createTextNode(node.value));
    }
  };

  const renderMarkdownInto = (container, markdown) => {
    renderMarkdownNode(markdownParser.parse(String(markdown || "")), container);
  };

  const renderSourcesInto = (container, sources) => {
    if (!sources.length) return;
    const wrapper = document.createElement("div");
    wrapper.className = "ask-blog__sources";
    const heading = document.createElement("h3");
    heading.textContent = copy.sources;
    const list = document.createElement("ol");
    for (const source of sources) {
      const item = document.createElement("li");
      item.value = source.citationIndex;
      const badge = document.createElement("span");
      badge.className = "ask-blog__source-type";
      badge.textContent = source.collection === "articles" ? copy.articleSource : copy.noteSource;
      const link = document.createElement("a");
      link.href = source.url;
      link.textContent = source.title;
      item.append(badge, document.createTextNode(" "), link);
      list.append(item);
    }
    wrapper.append(heading, list);
    container.append(wrapper);
  };

  const createMessageElement = (message) => {
    const section = document.createElement("section");
    section.className = `ask-blog__message ask-blog__message--${message.role}`;
    const label = document.createElement("div");
    label.className = "ask-blog__message-label";
    label.textContent = message.role === "user" ? copy.userLabel : copy.assistantLabel;
    const body = document.createElement("div");
    body.className = "ask-blog__message-body";
    if (message.role === "assistant") renderMarkdownInto(body, message.content);
    else body.textContent = message.content;
    section.append(label, body);
    if (message.role === "assistant") renderSourcesInto(section, message.sources || []);
    return section;
  };

  const createPendingMessage = (message) => {
    const section = document.createElement("section");
    section.className = "ask-blog__message ask-blog__message--assistant ask-blog__message--pending";
    const label = document.createElement("div");
    label.className = "ask-blog__message-label";
    label.textContent = copy.assistantLabel;
    const loading = document.createElement("div");
    loading.className = "ask-blog__loading";
    const spinner = document.createElement("span");
    spinner.className = "ask-blog__spinner";
    spinner.setAttribute("aria-hidden", "true");
    const text = document.createElement("strong");
    text.dataset.askPendingText = "";
    text.textContent = message;
    const detail = document.createElement("span");
    detail.className = "ask-blog__loading-detail";
    detail.textContent = copy.loadingDetail;
    loading.append(spinner, text);
    const progress = document.createElement("div");
    progress.className = "ask-blog__progress";
    progress.append(document.createElement("span"));
    section.append(label, loading, detail, progress);
    return section;
  };

  const updatePendingText = (pending, text) => {
    const target = pending?.querySelector("[data-ask-pending-text]");
    if (target) target.textContent = text;
  };

  const renderConversation = () => {
    conversationElement.replaceChildren();
    if (!conversation.length) {
      const empty = document.createElement("p");
      empty.className = "ask-blog__empty";
      empty.textContent = copy.emptyConversation;
      conversationElement.append(empty);
    } else {
      for (const message of conversation) conversationElement.append(createMessageElement(message));
    }
    clear.hidden = conversation.length === 0;
  };

  const scrollConversation = () => {
    window.requestAnimationFrame(() => conversationElement.scrollTo({ top: conversationElement.scrollHeight, behavior: "smooth" }));
  };

  const buildRequestHistory = () => {
    const selected = [];
    let totalChars = 0;
    for (let index = conversation.length - 1; index >= 0 && selected.length < MAX_HISTORY_MESSAGES; index -= 1) {
      const message = conversation[index];
      const content = String(message.content || "").slice(0, MAX_HISTORY_MESSAGE_CHARS);
      if (!content) continue;
      if (totalChars + content.length > MAX_HISTORY_CHARS) break;
      totalChars += content.length;
      selected.push({ role: message.role, content });
    }
    return selected.reverse();
  };

  const loadTurnstile = () => {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileLoadPromise) return turnstileLoadPromise;
    turnstileLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => window.turnstile ? resolve(window.turnstile) : reject(new Error(copy.securityLoadFailed)));
      script.addEventListener("error", () => reject(new Error(copy.securityLoadFailed)));
      document.head.append(script);
    });
    return turnstileLoadPromise;
  };

  const settleTurnstile = (error, token = "") => {
    if (!turnstileAttempt) return;
    const pending = turnstileAttempt;
    turnstileAttempt = null;
    window.clearTimeout(pending.timeoutId);
    if (error) pending.reject(error);
    else pending.resolve(token);
  };

  const ensureTurnstileWidget = async () => {
    if (!turnstileSiteKey) throw new Error(copy.securityNotConfigured);
    const turnstile = await loadTurnstile();
    if (turnstileWidgetId !== null) return turnstile;
    turnstileWidgetId = turnstile.render(turnstileContainer, {
      sitekey: turnstileSiteKey,
      action: "ask_blog",
      theme: "auto",
      size: "flexible",
      appearance: "interaction-only",
      execution: "execute",
      callback: (token) => settleTurnstile(null, token),
      "error-callback": () => { settleTurnstile(new Error(copy.securityFailed)); return true; },
      "expired-callback": () => settleTurnstile(new Error(copy.securityExpired)),
      "timeout-callback": () => settleTurnstile(new Error(copy.securityTimeout)),
    });
    return turnstile;
  };

  const getTurnstileToken = async () => {
    const turnstile = await ensureTurnstileWidget();
    if (turnstileAttempt) return turnstileAttempt.promise;
    let resolveAttempt;
    let rejectAttempt;
    const promise = new Promise((resolve, reject) => { resolveAttempt = resolve; rejectAttempt = reject; });
    const timeoutId = window.setTimeout(() => settleTurnstile(new Error(copy.securityTimeout)), 90_000);
    turnstileAttempt = { promise, resolve: resolveAttempt, reject: rejectAttempt, timeoutId };
    try { turnstile.execute(turnstileWidgetId); }
    catch (error) { settleTurnstile(error instanceof Error ? error : new Error(copy.securityFailed)); }
    return promise;
  };

  const resetTurnstile = () => {
    if (turnstileAttempt) settleTurnstile(new Error(copy.securityReset));
    if (turnstileWidgetId !== null && window.turnstile) window.turnstile.reset(turnstileWidgetId);
  };

  const requestChat = async (question, history, security) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, history, locale, ...security }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.sessionToken) saveSecuritySession(payload);
    return { response, payload };
  };

  close.addEventListener("click", () => setOpen(false));
  clear.addEventListener("click", () => {
    conversation = [];
    try { sessionStorage.removeItem(CONVERSATION_KEY); } catch {}
    clearSecuritySession();
    renderConversation();
    setStatus("");
    input.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || submit.disabled) return;
    if (!endpoint) { setStatus(copy.backendNotConfigured, true); return; }

    const previousConversation = conversation.map((message) => ({ ...message, sources: [...(message.sources || [])] }));
    const history = buildRequestHistory();
    conversation.push({ role: "user", content: question, sources: [] });
    saveConversation();
    renderConversation();
    input.value = "";
    setStatus("");
    submit.disabled = true;
    submit.textContent = copy.processing;
    conversationElement.setAttribute("aria-busy", "true");

    const existingSession = loadSecuritySession();
    const pending = createPendingMessage(existingSession ? copy.searching : copy.verifying);
    conversationElement.append(pending);
    scrollConversation();

    try {
      let response;
      let payload;

      if (existingSession) {
        ({ response, payload } = await requestChat(question, history, { sessionToken: existingSession.token }));
        if (response.status === 401 && payload.requiresTurnstile) {
          clearSecuritySession();
          updatePendingText(pending, copy.sessionExpired);
          const turnstileToken = await getTurnstileToken();
          updatePendingText(pending, copy.verifiedSearching);
          ({ response, payload } = await requestChat(question, history, { turnstileToken, requestSession: true }));
        }
      } else {
        if (!turnstileSiteKey) throw new Error(copy.securityNotConfigured);
        const turnstileToken = await getTurnstileToken();
        updatePendingText(pending, copy.verifiedSearching);
        ({ response, payload } = await requestChat(question, history, { turnstileToken, requestSession: true }));
      }

      if (!response.ok) {
        const fallbackError = String(copy.requestFailed || "Request failed ({status})")
          .replace("{status}", String(response.status));
        throw new Error(payload.error || fallbackError);
      }

      const sources = Array.isArray(payload.sources)
        ? payload.sources.map(normalizeStoredSource).filter(Boolean)
        : [];
      conversation.push({ role: "assistant", content: payload.answer || copy.emptyAnswer, sources });
      saveConversation();
      renderConversation();
      scrollConversation();
    } catch (error) {
      console.error("Ask this blog failed", error);
      conversation = previousConversation;
      saveConversation();
      renderConversation();
      input.value = question;
      setStatus(error instanceof Error ? error.message : copy.unavailable, true);
    } finally {
      resetTurnstile();
      submit.disabled = false;
      submit.textContent = copy.submit;
      conversationElement.setAttribute("aria-busy", "false");
      input.focus();
    }
  });

  conversation = loadConversation();
  renderConversation();

  return {
    setOpen,
    toggle: () => setOpen(panel.hidden),
  };
}
