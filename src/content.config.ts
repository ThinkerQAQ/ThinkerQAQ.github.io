import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SUPPORTED_LOCALES } from "./config/i18n";

const timestamp = z
  .string()
  .pipe(z.iso.datetime({ offset: true }))
  .transform((value) => new Date(value));

const noteTopicSegment = z.object({
  id: z.string(),
  label: z.string().optional(),
});

const localizedSummary = z.object({
  title: z.string(),
  description: z.string(),
});

const notes = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/notes",
    deferRender: true,
    generateId: ({ entry }) => entry.replace(/\.md$/i, "").replaceAll("\\", "/"),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    sourcePath: z.string(),
    category: z.string(),
    categoryLabel: z.string(),
    topic: z.string().optional(),
    topicLabel: z.string().optional(),
    topicPath: z.array(noteTopicSegment).optional(),
    order: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date(),
    status: z.enum(["active", "historical"]).default("active"),
    language: z.enum(SUPPORTED_LOCALES).default("zh"),
    featured: z.boolean().default(false),
    indexable: z.boolean().default(true),
    canonicalPath: z.string().optional(),
  }),
});

const articles = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/articles",
    generateId: ({ entry }) => entry.replace(/\.md$/i, "").replaceAll("\\", "/"),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: timestamp,
    updatedAt: timestamp.optional(),
    language: z.enum(SUPPORTED_LOCALES).default("zh"),
    tags: z.array(z.string()).default([]),
    status: z.enum(["draft", "published"]).default("draft"),
    featured: z.boolean().default(false),
    series: z.string().optional(),
    translationOf: z.string().optional(),
    sourceNote: z.string().optional(),
    relatedNotes: z.array(reference("notes")).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
    generateId: ({ entry }) => entry.replace(/\.md$/i, "").replaceAll("\\", "/"),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["exploring", "building", "maintained", "completed"]),
    startedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    repository: z.url().optional(),
    translations: z.record(z.string(), localizedSummary).default({}),
  }),
});

const relatedNoteScope = z.object({
  category: z.string(),
  topicPath: z.array(z.string()).min(1),
  label: z.string().optional(),
});

const series = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/series",
    generateId: ({ entry }) => entry.replace(/\.md$/i, "").replaceAll("\\", "/"),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(["planned", "active", "complete"]),
    updatedAt: z.coerce.date(),
    featured: z.boolean().default(false),
    relatedArticles: z.array(z.string()).default([]),
    relatedNoteCategories: z.array(z.string()).default([]),
    relatedNoteScopes: z.array(relatedNoteScope).default([]),
    relatedNotes: z.array(z.string()).default([]),
    translations: z.record(z.string(), localizedSummary).default({}),
  }),
});

export const collections = { notes, articles, projects, series };
