import type { Locale } from "./i18n";

export interface SeriesUiCopy {
  articleProgress: (translated: number, total: number) => string;
  articlesAriaLabel: string;
  referenceNotes: string;
  untranslatedArticle: string;
}

export const SERIES_UI: Record<Locale, SeriesUiCopy> = {
  zh: {
    articleProgress: (translated, total) => `${total} 篇文章 · ${translated} 篇已翻译`,
    articlesAriaLabel: "系列文章",
    referenceNotes: "参考笔记",
    untranslatedArticle: "中文 · 未翻译",
  },
  en: {
    articleProgress: (translated, total) => `${total} ${total === 1 ? "article" : "articles"} · ${translated} translated`,
    articlesAriaLabel: "Series articles",
    referenceNotes: "Reference notes",
    untranslatedArticle: "Chinese · Not translated",
  },
};

export interface AskBlogUiCopy {
  title: string;
  description: string;
  clear: string;
  closeLabel: string;
  questionLabel: string;
  placeholder: string;
  securityLabel: string;
  submit: string;
  sources: string;
  articleSource: string;
  noteSource: string;
  userLabel: string;
  assistantLabel: string;
  loadingDetail: string;
  emptyConversation: string;
  securityLoadFailed: string;
  securityNotConfigured: string;
  securityFailed: string;
  securityExpired: string;
  securityTimeout: string;
  securityReset: string;
  backendNotConfigured: string;
  processing: string;
  searching: string;
  verifying: string;
  sessionExpired: string;
  verifiedSearching: string;
  requestFailed: (status: number) => string;
  emptyAnswer: string;
  unavailable: string;
}

export const ASK_BLOG_UI: Record<Locale, AskBlogUiCopy> = {
  zh: {
    title: "问博客",
    description: "只根据本站文章与笔记回答，可连续追问。",
    clear: "清空",
    closeLabel: "关闭问博客",
    questionLabel: "问题",
    placeholder: "输入问题，Enter 提问，Shift+Enter 换行",
    securityLabel: "安全验证",
    submit: "提问",
    sources: "来源",
    articleSource: "文章",
    noteSource: "笔记",
    userLabel: "你",
    assistantLabel: "问博客",
    loadingDetail: "检索本站内容 → 组织答案",
    emptyConversation: "可以先问一个问题，再像聊天一样继续追问。例如“Go CAS 为什么可以无锁？”→“那 ARM 呢？”。",
    securityLoadFailed: "安全验证加载失败。",
    securityNotConfigured: "安全验证尚未配置。请设置 Site Key。",
    securityFailed: "安全验证失败，请重试。",
    securityExpired: "安全验证已过期，请重试。",
    securityTimeout: "安全验证超时，请重试。",
    securityReset: "安全验证已重置。",
    backendNotConfigured: "AI 后端尚未配置。",
    processing: "处理中…",
    searching: "正在检索文章与笔记…",
    verifying: "正在进行安全验证…",
    sessionExpired: "安全会话已过期，正在重新验证…",
    verifiedSearching: "验证完成，正在检索文章与笔记…",
    requestFailed: (status) => `请求失败（${status}）`,
    emptyAnswer: "AI 没有返回回答。",
    unavailable: "问博客暂时不可用。",
  },
  en: {
    title: "Ask this blog",
    description: "Answers only from this site's articles and notes, with follow-up questions supported.",
    clear: "Clear",
    closeLabel: "Close Ask this blog",
    questionLabel: "Question",
    placeholder: "Type a question. Enter to ask; Shift+Enter for a new line",
    securityLabel: "Security verification",
    submit: "Ask",
    sources: "Sources",
    articleSource: "Article",
    noteSource: "Note",
    userLabel: "You",
    assistantLabel: "Ask this blog",
    loadingDetail: "Searching this site → composing an answer",
    emptyConversation: "Ask a question, then continue with follow-ups. For example: “Why can Go CAS work without a lock?” → “What about ARM?”",
    securityLoadFailed: "Security verification failed to load.",
    securityNotConfigured: "Security verification is not configured. Please set the Site Key.",
    securityFailed: "Security verification failed. Please retry.",
    securityExpired: "Security verification expired. Please retry.",
    securityTimeout: "Security verification timed out. Please retry.",
    securityReset: "Security verification was reset.",
    backendNotConfigured: "The AI backend is not configured yet.",
    processing: "Working…",
    searching: "Searching articles and notes…",
    verifying: "Running security verification…",
    sessionExpired: "The security session expired. Verifying again…",
    verifiedSearching: "Verified. Searching articles and notes…",
    requestFailed: (status) => `Request failed (${status})`,
    emptyAnswer: "The AI returned no answer.",
    unavailable: "Ask this blog is temporarily unavailable.",
  },
};
