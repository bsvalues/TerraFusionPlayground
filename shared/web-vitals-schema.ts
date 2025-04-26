/**
 * Web Vitals Schema
 * 
 * Schema definitions for Web Vitals metrics tables, used for tracking performance
 * metrics from real users. Includes tables for raw metrics, aggregated metrics, and summaries.
 */

import { pgTable, serial, text, timestamp, integer, numeric, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Raw Web Vitals metrics table
 * Stores individual Web Vitals measurements from user devices
 */
export const webVitalsMetrics = pgTable("web_vitals_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: numeric("value").notNull(),
  delta: numeric("delta").notNull(),
  metricId: text("metric_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  navigationType: text("navigation_type"),
  rating: text("rating"),
  url: text("url").notNull(),
  userId: text("user_id"),
  sessionId: text("session_id"),
  deviceType: text("device_type"),
  browser: text("browser"),
  connection: text("connection"),
  deviceInfo: jsonb("device_info"),
  tags: jsonb("tags")
});

export const insertWebVitalsMetricsSchema = createInsertSchema(webVitalsMetrics).omit({
  id: true
});

export type WebVitalsMetric = typeof webVitalsMetrics.$inferSelect;
export type InsertWebVitalsMetric = z.infer<typeof insertWebVitalsMetricsSchema>;

/**
 * Web Vitals reports table
 * Stores batched reports from clients
 */
export const webVitalsReports = pgTable("web_vitals_reports", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  url: text("url").notNull(),
  metrics: jsonb("metrics").notNull(),
  percentiles: jsonb("percentiles"),
  deviceInfo: jsonb("device_info"),
  tags: jsonb("tags"),
  processed: boolean("processed").default(false)
});

export const insertWebVitalsReportsSchema = createInsertSchema(webVitalsReports).omit({
  id: true,
  processed: true
});

export type WebVitalsReport = typeof webVitalsReports.$inferSelect;
export type InsertWebVitalsReport = z.infer<typeof insertWebVitalsReportsSchema>;

/**
 * Web Vitals aggregated metrics table
 * Stores hourly aggregated metrics for faster queries
 */
export const webVitalsAggregates = pgTable("web_vitals_aggregates", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  urlPattern: text("url_pattern").notNull(),
  device: text("device"),
  connection: text("connection"),
  count: integer("count").notNull(),
  p50: numeric("p50").notNull(),
  p75: numeric("p75").notNull(),
  p95: numeric("p95").notNull(),
  p99: numeric("p99").notNull(),
  min: numeric("min").notNull(),
  max: numeric("max").notNull(),
  avg: numeric("avg").notNull()
});

export const insertWebVitalsAggregatesSchema = createInsertSchema(webVitalsAggregates).omit({
  id: true
});

export type WebVitalsAggregate = typeof webVitalsAggregates.$inferSelect;
export type InsertWebVitalsAggregate = z.infer<typeof insertWebVitalsAggregatesSchema>;

/**
 * Web Vitals performance budgets table
 * Stores performance budgets for different metrics and URL patterns
 */
export const webVitalsBudgets = pgTable("web_vitals_budgets", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  urlPattern: text("url_pattern").notNull(),
  device: text("device"),
  budget: numeric("budget").notNull(),
  severity: text("severity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertWebVitalsBudgetsSchema = createInsertSchema(webVitalsBudgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type WebVitalsBudget = typeof webVitalsBudgets.$inferSelect;
export type InsertWebVitalsBudget = z.infer<typeof insertWebVitalsBudgetsSchema>;

/**
 * Web Vitals alerts table
 * Stores alerts when metrics exceed budgets
 */
export const webVitalsAlerts = pgTable("web_vitals_alerts", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  urlPattern: text("url_pattern").notNull(),
  device: text("device"),
  budget: numeric("budget").notNull(),
  actual: numeric("actual").notNull(),
  severity: text("severity").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at")
});

export const insertWebVitalsAlertsSchema = createInsertSchema(webVitalsAlerts).omit({
  id: true,
  acknowledged: true,
  acknowledgedBy: true,
  acknowledgedAt: true
});

export type WebVitalsAlert = typeof webVitalsAlerts.$inferSelect;
export type InsertWebVitalsAlert = z.infer<typeof insertWebVitalsAlertsSchema>;