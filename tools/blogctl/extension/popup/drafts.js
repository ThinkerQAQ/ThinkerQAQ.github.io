"use strict";

// One Feature, two intents. Creation is never inferred from missing bindings;
// Update always carries the exact checked remote ID snapshot.
(function (root) {
  const state = {
    initialized:false, active:false, mode:"update", articles:[], selectedSlug:"",
    selectedPlatformIDs:new Set(BlogCTLSyncModel.visiblePlatformIDs(BlogCTLSyncState.loadPlatforms(localStorage))),
    status:null, publishing:[], tools:[], currentJob:null, pollTimer:null,
  };
  let articlePicker, articleOptions, articleMeta, platformList, actionButton,
      publishButton, nextActions, viewTaskButton, message, allButton, invertButton;

  const article = () => state.articles.find((item) => item.slug === state.selectedSlug);
  const profile = (id) => state.publishing.find((item) => item.id === id) || {};
  const running = () => ["queued","running"].includes(state.currentJob?.state);
  const selectedPlatformIDs = () => [...state.selectedPlatformIDs].filter((id) =>
    BlogCTLSyncModel.isVisiblePlatform(id));

  function availability(platform) {
    const source = BlogCTLSyncModel.platformAvailability(article(),platform,profile(platform.id));
    if (!source.available) return source;
    const dependency = BlogCTLSyncModel.deliveryToolAvailability(platform,state.tools);
    if (!dependency.available) return dependency;
    if (state.mode==="create" && !platform.capabilities?.draftCreate) {
      return {available:false,reason:"不支持创建草稿"};
    }
    if (state.mode==="update" && !platform.capabilities?.remoteList) {
      return {available:false,reason:"目前没有远端关联检测能力"};
    }
    return {available:true,reason:""};
  }

  function clearTask() {
    if (running()) return;
    if (state.pollTimer) clearTimeout(state.pollTimer);
    state.pollTimer=null;
    state.currentJob=null;
    BlogCTLPopup.setMessage(message);
  }

  function candidateTargets() {
    return (root.BlogCTLSync?.selectedTargets?.() || [])
      .filter((target) => state.selectedPlatformIDs.has(target.platform));
  }

  function canPublishAfter() {
    const platforms = state.mode === "create" ? selectedPlatformIDs() :
      [...new Set(candidateTargets().map((target) => target.platform))];
    if (!platforms.length || platforms.some((id) =>
      !state.status?.platforms?.find((p) => p.id===id)?.capabilities?.explicitPublish)) return false;
    return state.mode==="create" || candidateTargets().every((target) => target.state==="draft");
  }

  function updateAction() {
    const platforms = selectedPlatformIDs().filter((id) => {
      const platform=state.status?.platforms?.find((p)=>p.id===id);
      return platform && availability(platform).available;
    });
    const targets = candidateTargets();
    const canSubmit = Boolean(state.selectedSlug && state.status?.bridge?.running) &&
      !running() && !(root.BlogCTLSync?.isBindingBusy?.() ?? false) &&
      (state.mode==="create" ? platforms.length>0 : targets.length>0);
    actionButton.disabled=!canSubmit;
    publishButton.disabled=!canSubmit || !canPublishAfter();
    actionButton.textContent=state.mode==="create"?"创建草稿":"更新所选";
    publishButton.textContent=state.mode==="create"?"创建并发布":"更新并发布";
    const terminal=["completed","failed"].includes(state.currentJob?.state);
    nextActions.hidden=!terminal;
    if (terminal) {
      actionButton.disabled=true;
      publishButton.disabled=true;
    }
  }

  function articlePickerOpen(open) {
    articleOptions.hidden=!open;
    articlePicker.setAttribute("aria-expanded",String(open));
  }

  function renderArticles() {
    const query=articlePicker.value.trim().toLowerCase();
    const list=state.articles.filter((item)=>
      !query || (item.title+" "+item.slug).toLowerCase().includes(query));
    articleOptions.replaceChildren();
    for(const item of list) {
      const button=document.createElement("button");
      button.type="button";
      button.className="article-option";
      button.setAttribute("role","option");
      button.textContent=`${item.title} · ${item.slug}`;
      if(item.slug===state.selectedSlug) button.classList.add("active");
      button.addEventListener("click",()=>selectArticle(item));
      articleOptions.append(button);
    }
    if(!list.length)articleOptions.textContent="没有匹配文章";
    articlePickerOpen(true);
  }

  function selectArticle(item) {
    if(running())return;
    clearTask();
    state.selectedSlug=item.slug;
    articlePicker.value=`${item.title} · ${item.slug}`;
    articlePickerOpen(false);
    localStorage.setItem("blogctl.selectedArticle",item.slug);
    articleMeta.textContent=`${item.title} · ${item.slug}`;
    document.dispatchEvent(new CustomEvent("blogctl:article-selected",{
      detail:{article:item.slug},
    }));
    renderPlatforms();
  }

  function renderPlatforms() {
    platformList.replaceChildren();
    for(const platform of BlogCTLSyncModel.visiblePlatforms(state.status?.platforms || [])) {
      const card=document.createElement("div");
      card.className="platform-choice-card";
      card.dataset.platformCard=platform.id;
      const header=document.createElement("div");
      header.className="platform-choice";
      const check=document.createElement("input");
      check.type="checkbox";
      check.dataset.platform=platform.id;
      check.checked=state.selectedPlatformIDs.has(platform.id);
      const permission=availability(platform);
      check.disabled=!state.selectedSlug || running() || !permission.available ||
        (root.BlogCTLSync?.isBindingBusy?.() ?? false);
      check.addEventListener("change",()=>{
        if(check.checked)state.selectedPlatformIDs.add(platform.id);
        else state.selectedPlatformIDs.delete(platform.id);
        BlogCTLSyncState.savePlatforms(localStorage,state.selectedPlatformIDs);
        root.BlogCTLSync?.refresh?.();
        renderPlatforms();
        document.dispatchEvent(new CustomEvent("blogctl:update-platform-selection"));
      });
      const description=document.createElement("span");
      description.className="platform-choice-text";
      const name=document.createElement("strong");
      name.textContent=platform.label || platform.id;
      const hint=document.createElement("small");
      hint.textContent=state.mode==="create"?"创建新的远端草稿":
        "选中检测到的远端文章作为更新目标";
      description.append(name,hint);
      const status=document.createElement("strong");
      BlogCTLPopup.setStatus(status,permission.available?"ok":"disabled",
        permission.available?"可操作":permission.reason);
      header.append(check,description,status);
      card.append(header);
      const actions=document.createElement("div");
      actions.className="platform-card-actions";
      if(state.mode==="create"){
        const create=document.createElement("button");
        create.type="button";
        create.className="secondary compact";
        create.textContent="创建草稿";
        create.disabled=!permission.available || !state.selectedSlug || running();
        create.addEventListener("click",()=>startExplicit([platform.id],[],false));
        actions.append(create);
      } else {
        const detect=document.createElement("button");
        detect.type="button";
        detect.className="secondary compact";
        detect.textContent="检测关联";
        detect.disabled=!permission.available || !state.selectedSlug || running() ||
          (root.BlogCTLSync?.isBindingBusy?.() ?? false);
        detect.addEventListener("click", () => {
          state.selectedPlatformIDs.add(platform.id);
          BlogCTLSyncState.savePlatforms(localStorage,state.selectedPlatformIDs);
          renderPlatforms();
          root.BlogCTLSync?.refreshArticleMatches?.([platform.id]);
        });
        actions.append(detect);
      }
      card.append(actions);
      if(state.mode==="update")root.BlogCTLSync?.appendPlatformMatches?.(platform,card);
      const result=state.currentJob?.results?.[platform.id];
      if(result){
        const footer=document.createElement("div");
        footer.className="platform-task-status";
        const statusName=document.createElement("strong");
        statusName.textContent=result.result || result.state;
        const details=document.createElement("small");
        details.textContent=result.error || result.message || "";
        footer.append(statusName,details);
        card.append(footer);
      }
      platformList.append(card);
    }
    updateAction();
  }

  function selectAll(invert) {
    if(!state.selectedSlug || running())return;
    for(const platform of BlogCTLSyncModel.visiblePlatforms(state.status?.platforms || [])) {
      if(!availability(platform).available)continue;
      if(invert && state.selectedPlatformIDs.has(platform.id))state.selectedPlatformIDs.delete(platform.id);
      else state.selectedPlatformIDs.add(platform.id);
    }
    BlogCTLSyncState.savePlatforms(localStorage,state.selectedPlatformIDs);
    renderPlatforms();
    document.dispatchEvent(new CustomEvent("blogctl:update-platform-selection"));
  }

  function validateTargets(targets) {
    if(!targets.length)throw new Error("请先检测并勾选至少一篇远端文章。更新不会自动创建草稿。");
    if(targets.some((t)=>t.state==="published"&&
      !["cnblogs","devto"].includes(t.platform)))
      throw new Error("所选平台的已发布文章暂不支持安全更新。");
    if(targets.some((t)=>!state.selectedPlatformIDs.has(t.platform)))
      throw new Error("目标所属平台未勾选。");
  }

  async function startExplicit(platforms,targets,publishAfter=false) {
    if(!state.selectedSlug||running()||!platforms.length)return;
    try {
      if(state.mode==="update")validateTargets(targets);
      if(publishAfter && (state.mode==="update"&&targets.some((t)=>t.state==="published")))
        throw new Error("已发布文章无需再次发布，请使用「更新所选」。");
      if(publishAfter && !canPublishAfter())throw new Error("有平台不支持直接发布草稿。");
      if(!window.confirm(state.mode==="create"
        ? `将在 ${platforms.length} 个平台创建新草稿${publishAfter?"并发布":""}，确认？`
        : `将覆盖 ${targets.length} 篇所选远端文章${publishAfter?"并发布草稿":""}，确认？`))return;
      const request={
        article:state.selectedSlug,platforms,operation:state.mode,
        targets:state.mode==="create"?[]:targets.map((item)=>({...item})),
        publishAfter,dryRun:false,
      };
      actionButton.disabled=true;
      publishButton.disabled=true;
      BlogCTLPopup.setMessage(message,"正在启动任务…");
      const response=await BlogCTLPopup.send("blogctl.job.start",{request});
      state.currentJob=response.job;
      renderPlatforms();
      BlogCTLPopup.setMessage(message,"已启动任务，具体结果请查看任务页。","ok");
      if(state.currentJob?.id)pollJob(state.currentJob.id);
    } catch(error) {
      BlogCTLPopup.setMessage(message,BlogCTLPopup.errorMessage(error),"error");
      updateAction();
    }
  }

  async function pollJob(id) {
    if(state.pollTimer)clearTimeout(state.pollTimer);
    if(!state.active)return;
    try {
      const response=await BlogCTLPopup.send("blogctl.job.get",{id});
      state.currentJob=response.job;
      renderPlatforms();
      if(["completed","failed"].includes(state.currentJob?.state)){
        BlogCTLPopup.setMessage(message,state.currentJob.state==="completed"?
          "任务完成，结果已记录。":"部分或全部平台失败，请在任务页查看具体远端 ID 和错误。",
          state.currentJob.state==="completed"?"ok":"error");
        return;
      }
    }catch(error){
      BlogCTLPopup.setMessage(message,BlogCTLPopup.errorMessage(error),"error");
    }
    state.pollTimer=setTimeout(()=>pollJob(id),1400);
  }

  async function refresh() {
    if(!state.active)return;
    try {
      const [articles,status,publishing,tools]=await Promise.all([
        BlogCTLPopup.send("blogctl.articles"),
        BlogCTLPopup.send("blogctl.status"),
        BlogCTLPopup.send("blogctl.publishing"),
        BlogCTLPopup.send("blogctl.tools"),
      ]);
      state.articles=articles.articles||[];
      state.status=status.status;
      state.publishing=publishing.platforms||[];
      state.tools=tools.tools||[];
      const previous=state.selectedSlug || localStorage.getItem("blogctl.selectedArticle") || "";
      const found=state.articles.find((item)=>item.slug===previous);
      if(found){
        state.selectedSlug=found.slug;
        articlePicker.value=`${found.title} · ${found.slug}`;
        articleMeta.textContent=`${found.title} · ${found.slug}`;
        articlePickerOpen(false);
      } else {
        state.selectedSlug="";
        articleMeta.textContent="";
      }
      document.dispatchEvent(new CustomEvent("blogctl:article-selected",{
        detail:{article:state.selectedSlug},
      }));
      renderPlatforms();
      if(running()&&state.currentJob?.id)pollJob(state.currentJob.id);
      BlogCTLPopup.refreshBridgeIndicator(state.status).catch(()=>{});
    } catch(error) {
      BlogCTLPopup.setMessage(message,BlogCTLPopup.errorMessage(error),"error");
    }
  }

  function setMode(mode) {
    if(mode!=="create"&&mode!=="update")return;
    state.mode=mode;
    document.getElementById("draftModeTitle").textContent=mode==="create"?"创建":"更新";
    document.getElementById("draftModeHint").textContent=mode==="create"?
      "选择本地文章和平台，明确创建一篇新草稿，不读取历史绑定。":
      "选择本地文章，检测并勾选远端目标，然后直接更新。";
    document.getElementById("draftPlatformHint").textContent=mode==="create"?
      "勾选平台，创建草稿或直接创建并发布。":
      "勾选平台检测远端候选，选中明确目标后更新，无需绑定。";
    for(const id of ["refreshArticleMatches"])document.getElementById(id).hidden=mode==="create";
    root.BlogCTLSync?.clearMatches?.();
    if(state.initialized)renderPlatforms();
  }

  function init() {
    if(state.initialized)return;
    articlePicker=document.getElementById("draftArticlePicker");
    articleOptions=document.getElementById("draftArticleOptions");
    articleMeta=document.getElementById("draftArticleMeta");
    platformList=document.getElementById("draftPlatforms");
    actionButton=document.getElementById("saveDrafts");
    publishButton=document.getElementById("publishAfterSave");
    nextActions=document.getElementById("draftNextActions");
    viewTaskButton=document.getElementById("draftViewTask");
    message=document.getElementById("draftsMessage");
    allButton=document.getElementById("selectAllDraftPlatforms");
    invertButton=document.getElementById("invertDraftPlatforms");
    articlePicker.addEventListener("focus",renderArticles);
    articlePicker.addEventListener("input",()=>{
      if(running())return;
      state.selectedSlug="";
      document.dispatchEvent(new CustomEvent("blogctl:article-selected",{detail:{article:""}}));
      renderArticles();
      renderPlatforms();
    });
    articlePicker.addEventListener("keydown",(event)=>{
      if(event.key==="Escape")articlePickerOpen(false);
      if(event.key==="Enter"&&articleOptions.querySelector("button")){
        event.preventDefault();articleOptions.querySelector("button").click();
      }
    });
    allButton.addEventListener("click",()=>selectAll(false));
    invertButton.addEventListener("click",()=>selectAll(true));
    actionButton.addEventListener("click",()=>{
      const targets=candidateTargets();
      const platforms=state.mode==="create"?selectedPlatformIDs().filter((id)=>{
        const platform=state.status?.platforms?.find((p)=>p.id===id);
        return platform&&availability(platform).available;
      }):[...new Set(targets.map((t)=>t.platform))];
      startExplicit(platforms,targets,false);
    });
    publishButton.addEventListener("click",()=>{
      const targets=candidateTargets();
      const platforms=state.mode==="create"?selectedPlatformIDs():[...new Set(targets.map((t)=>t.platform))];
      startExplicit(platforms,targets,true);
    });
    viewTaskButton.addEventListener("click",()=>{
      if(state.currentJob?.id)document.dispatchEvent(new CustomEvent("blogctl:navigate-task",{
        detail:{jobId:state.currentJob.id},
      }));
    });
    document.addEventListener("blogctl:association-results-changed",()=>{
      if(state.active&&state.mode==="update")renderPlatforms();
    });
    state.initialized=true;
  }
  function activate(){state.active=true;refresh();}
  function deactivate(){
    state.active=false;
    if(state.pollTimer)clearTimeout(state.pollTimer);
    state.pollTimer=null;
  }

  root.BlogCTLDrafts={
    init,activate,deactivate,refresh,setMode,
    selectedPlatformIDs,
    isJobRunning:running,
    selectionChanged:updateAction,
    updateTargets:(targets,publishAfter=false)=>{
      for (const target of targets) state.selectedPlatformIDs.add(target.platform);
      BlogCTLSyncState.savePlatforms(localStorage,state.selectedPlatformIDs);
      return startExplicit([...new Set(targets.map((item)=>item.platform))],targets,publishAfter);
    },
  };
})(globalThis);
