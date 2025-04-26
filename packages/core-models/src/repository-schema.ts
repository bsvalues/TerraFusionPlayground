import { pgTable, text, serial, integer, timestamp, json, boolean, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Repository Marketplace Enums
export enum RepositoryVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ORGANIZATION = 'organization'
}

export enum RepositoryType {
  MODULE = 'module',
  TEMPLATE = 'template',
  PLUGIN = 'plugin',
  LIBRARY = 'library',
  TOOL = 'tool',
  PROJECT = 'project',
  INTEGRATION = 'integration'
}

export enum RepositoryLicense {
  MIT = 'mit',
  APACHE_2 = 'apache-2.0',
  GPL_3 = 'gpl-3.0',
  BSD_3 = 'bsd-3-clause',
  PROPRIETARY = 'proprietary',
  CC_BY = 'cc-by',
  CC_BY_SA = 'cc-by-sa',
  OTHER = 'other'
}

// Repositories - Stores repositories available in the TerraFusion marketplace
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  readmeContent: text("readme_content"), // Markdown content for the README
  repositoryType: text("repository_type").notNull(), // Corresponds to RepositoryType enum
  visibility: text("visibility").notNull().default('private'), // Corresponds to RepositoryVisibility enum
  license: text("license").default('mit'), // Corresponds to RepositoryLicense enum
  stars: integer("stars").default(0),
  forks: integer("forks").default(0),
  downloads: integer("downloads").default(0),
  gitUrl: text("git_url"), // Git URL for cloning
  websiteUrl: text("website_url"), // Optional website
  logoUrl: text("logo_url"), // Repository logo URL
  ownerId: integer("owner_id").notNull(), // User ID who owns the repository
  organizationId: integer("organization_id"), // Optional organization ID
  tags: text("tags").array(), // Tags for searching and filtering
  featured: boolean("featured").default(false), // Whether this is a featured repository
  verified: boolean("verified").default(false), // Whether this is a verified repository
  metadata: jsonb("metadata").default({}), // Additional metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index("repositories_name_idx").on(table.name),
    ownerIdIdx: index("repositories_owner_id_idx").on(table.ownerId),
    repoTypeIdx: index("repositories_type_idx").on(table.repositoryType),
  };
});

export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  stars: true,
  forks: true,
  downloads: true,
  featured: true,
  verified: true,
  createdAt: true,
  updatedAt: true,
});

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;

// Repository Versions - Stores different versions of repositories
export const repositoryVersions = pgTable("repository_versions", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(), // Foreign key to repositories
  version: text("version").notNull(), // Semantic version (e.g., "1.0.0")
  releaseNotes: text("release_notes"), // Markdown release notes
  commitHash: text("commit_hash"), // Git commit hash
  compatibilityInfo: jsonb("compatibility_info"), // Version compatibility information
  downloadUrl: text("download_url"), // URL to download this version
  isLatest: boolean("is_latest").default(false),
  isStable: boolean("is_stable").default(true),
  publishedBy: integer("published_by").notNull(), // User ID who published this version
  downloads: integer("downloads").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    repoIdVersionIdx: index("repo_versions_repo_id_version_idx").on(table.repositoryId, table.version),
  };
});

export const insertRepositoryVersionSchema = createInsertSchema(repositoryVersions).omit({
  id: true,
  downloads: true,
  createdAt: true,
});

export type RepositoryVersion = typeof repositoryVersions.$inferSelect;
export type InsertRepositoryVersion = z.infer<typeof insertRepositoryVersionSchema>;

// Repository Reviews - Stores user reviews of repositories
export const repositoryReviews = pgTable("repository_reviews", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(), // Foreign key to repositories
  userId: integer("user_id").notNull(), // User who wrote the review
  rating: integer("rating").notNull(), // 1-5 star rating
  reviewText: text("review_text"), // Review content
  versionUsed: text("version_used"), // Version being reviewed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    repoUserIdx: index("repo_reviews_repo_user_idx").on(table.repositoryId, table.userId),
  };
});

export const insertRepositoryReviewSchema = createInsertSchema(repositoryReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RepositoryReview = typeof repositoryReviews.$inferSelect;
export type InsertRepositoryReview = z.infer<typeof insertRepositoryReviewSchema>;

// Repository Dependencies - Stores dependencies between repositories
export const repositoryDependencies = pgTable("repository_dependencies", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull(), // Repository that has dependencies
  dependencyRepoId: integer("dependency_repo_id").notNull(), // Repository that is a dependency
  versionRange: text("version_range").notNull(), // Semver range (e.g., "^1.0.0")
  dependencyType: text("dependency_type").default('runtime'), // runtime, development, optional, peer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    repoDependencyIdx: index("repo_dependencies_ids_idx").on(table.repositoryId, table.dependencyRepoId),
  };
});

export const insertRepositoryDependencySchema = createInsertSchema(repositoryDependencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RepositoryDependency = typeof repositoryDependencies.$inferSelect;
export type InsertRepositoryDependency = z.infer<typeof insertRepositoryDependencySchema>;