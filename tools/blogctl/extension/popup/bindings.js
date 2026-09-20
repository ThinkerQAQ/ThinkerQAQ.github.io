"use strict";

(function (root) {
  const state = { initialized: false, active: false, binding: null, articles: [] };
  let articleSelect, bindingStatus, bindingMessage, findButton, candidatesSelect;
  let referenceInput, bindButton, updatePublishedButton;

  function render() {
    const selected = Boolean(articleSelect.value);
    findButton.disabled = !selected;
    bindButton.disabled = !selected;
    updatePublishedButton.disabled = !selected || state.binding?.state !== "published";
    const binding = state.binding;
    bindingStatus.textContent = !selected ? "选择文章后查看绑定。"
      : !binding ? "尚未绑定博客园文章。"
        : `${binding.state === "published" ? "已发布" : "草稿"} · ID ${binding.postId} · ${binding.account || "账号待验证"} · ${binding.source}`;
  }

  async function loadBinding() {
    const article = articleSelect.value;
    state.binding = null;
    BlogCTLPopup.setMessage(bindingMessage);
    candidatesSelect.replaceChildren(new Option("可选择候选文章", ""));
    referenceInput.value = "";
    render();
    if (!article) return;
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.binding", { article });
      if (article !== articleSelect.value) return;
      state.binding = response.found ? response.binding : null;
      render();
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  async function find() {
    const article = articleSelect.value;
    if (!article) return;
    findButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在查询博客园文章…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.search", { article });
      if (article !== articleSelect.value) return;
      candidatesSelect.replaceChildren(new Option("选择候选文章", ""));
      for (const post of response.candidates ?? []) {
        candidatesSelect.append(new Option(`${post.title} · ${post.published ? "已发布" : "草稿"} · ID ${post.id} · ${post.url || ""}`, post.id));
      }
      BlogCTLPopup.setMessage(bindingMessage, `找到 ${(response.candidates ?? []).length} 篇候选文章，请核对后绑定。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { render(); }
  }

  async function bind() {
    const article = articleSelect.value;
    const reference = referenceInput.value.trim() || candidatesSelect.value;
    if (!article || !reference) {
      BlogCTLPopup.setMessage(bindingMessage, "请先选候选文章，或填写文章 ID／链接。", "error");
      return;
    }
    const replace = Boolean(state.binding);
    if (replace && !confirm("将重新验证博客园文章，并更新当前绑定及远端修改时间基线。继续吗？")) return;
    bindButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在验证博客园文章与当前账号…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.bind", { article, reference, replace });
      state.binding = response.binding;
      render();
      BlogCTLPopup.setMessage(bindingMessage, "绑定已保存到内容仓库。", "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { render(); }
  }

  async function updatePublished() {
    const article = articleSelect.value;
    if (!article || state.binding?.state !== "published") return;
    if (!confirm("将本地文章内容更新到已发布的博客园文章。继续吗？")) return;
    updatePublishedButton.disabled = true;
    BlogCTLPopup.setMessage(bindingMessage, "正在启动已发布文章更新任务…");
    try {
      const response = await BlogCTLPopup.send("blogctl.cnblogs.update", { article });
      BlogCTLPopup.setMessage(bindingMessage, `任务 ${response.job?.id || ""} 已启动，请在“任务”页查看结果。`, "ok");
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    } finally { render(); }
  }

  async function refresh() {
    if (!state.active) return;
    const previous = articleSelect.value || localStorage.getItem("blogctl.selectedArticle") || "";
    try {
      const response = await BlogCTLPopup.send("blogctl.articles");
      state.articles = response.articles ?? [];
      articleSelect.replaceChildren(new Option("选择文章", ""));
      for (const article of state.articles) articleSelect.append(new Option(`${article.title} · ${article.slug}`, article.slug));
      if (state.articles.some((article) => article.slug === previous)) articleSelect.value = previous;
      await loadBinding();
    } catch (error) {
      BlogCTLPopup.setMessage(bindingMessage, BlogCTLPopup.errorMessage(error), "error");
    }
  }

  function init() {
    if (state.initialized) return;
    articleSelect = document.getElementById("cnblogsBindingArticle");
    bindingStatus = document.getElementById("cnblogsBindingStatus");
    bindingMessage = document.getElementById("cnblogsBindingMessage");
    findButton = document.getElementById("cnblogsFind");
    candidatesSelect = document.getElementById("cnblogsCandidates");
    referenceInput = document.getElementById("cnblogsReference");
    bindButton = document.getElementById("cnblogsBind");
    updatePublishedButton = document.getElementById("cnblogsUpdatePublished");
    articleSelect.addEventListener("change", loadBinding);
    findButton.addEventListener("click", find);
    bindButton.addEventListener("click", bind);
    updatePublishedButton.addEventListener("click", updatePublished);
    state.initialized = true;
    render();
  }

  function activate() { state.active = true; refresh(); }
  function deactivate() { state.active = false; }
  root.BlogCTLBindings = { init, activate, deactivate, refresh };
})(globalThis);
