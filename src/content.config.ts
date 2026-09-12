import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const timestamp = z
  .string()
  .pipe(z.iso.datetime({ offset: true }))
  .transform((value) => new Date(value));

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
    order: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date(),
    status: z.enum(["active", "historical"]).default("active"),
    language: z.enum(["zh", "en"]).default("zh"),
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
    language: z.enum(["zh", "en"]).default("zh"),
    tags: z.array(z.string()).default([]),
    status: z.enum(["draft", "published"]).default("draft"),
    featured: z.boolean().default(false),
    series: z.string().optional(),
    translationOf: z.string().optional(),
    sourceNote: z.string().optional(),
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
  }),
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
    relatedNotes: z.array(z.string()).default([]),
  }),
});

export const collections = { notes, articles, projects, series };
