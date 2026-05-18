import type { ReviewLanguage } from "../reviews/schema";

export type ReviewContextTag = "react" | "backend";

export const languageRules: Record<ReviewLanguage, string> = {
  javascript: [
    "JavaScript checks:",
    "- async/await and Promise failure handling",
    "- runtime validation",
    "- weak object assumptions",
    "- Node versus browser compatibility",
    "- dependency and package usage risks when visible",
  ].join("\n"),
  typescript: [
    "TypeScript checks:",
    "- unsafe assertions, any, weak object types, and poor inference",
    "- null and undefined handling",
    "- generics, unions, and narrowing correctness",
    "- runtime validation despite compile-time types",
    "- async/await and Promise failure handling",
  ].join("\n"),
  python: [
    "Python checks:",
    "- exception handling",
    "- type hints where they materially improve safety",
    "- mutable defaults",
    "- input validation",
    "- security risks and realistic bottlenecks",
  ].join("\n"),
  go: "Go checks: error handling, nil handling, concurrency safety, resource cleanup, and context use.",
  rust: "Rust checks: ownership choices, panic paths, error propagation, cloning cost, and unsafe blocks.",
  java: "Java checks: null handling, exception design, resource management, concurrency, and API boundaries.",
  cpp: "C++ checks: ownership, lifetime, undefined behavior, exception safety, and unnecessary copying.",
  other: "Use the language evidence available in the snippet and avoid language-specific claims without proof.",
};

export const contextRules: Record<ReviewContextTag, string> = {
  react: [
    "React checks:",
    "- state handling, props typing, and component boundaries",
    "- unnecessary re-renders",
    "- accessibility",
    "- hydration and client-only assumptions when visible",
    "- unsafe rendering of user-provided markup",
  ].join("\n"),
  backend: [
    "Backend/API checks:",
    "- authentication and authorization",
    "- request validation and safe database access",
    "- rate limiting, logging, and error responses",
    "- transaction handling and environment configuration when relevant",
  ].join("\n"),
};
