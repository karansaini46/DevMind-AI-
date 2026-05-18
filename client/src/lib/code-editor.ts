import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";

export const languages = [
  { value: "auto", label: "Auto detect" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "other", label: "Other" },
] as const;

export type Language = (typeof languages)[number]["value"];

export function getLanguageExtensions(language: string) {
  switch (language) {
    case "javascript":
      return [javascript()];
    case "typescript":
      return [javascript({ typescript: true })];
    case "python":
      return [python()];
    case "go":
      return [go()];
    case "rust":
      return [rust()];
    default:
      return [];
  }
}

export function getEditorLanguage(language: Language, filename: string) {
  if (language !== "auto") {
    return language;
  }

  const lowerCaseName = filename.toLowerCase();

  if (/\.tsx?$/.test(lowerCaseName)) {
    return "typescript";
  }

  if (/\.(jsx?|mjs|cjs)$/.test(lowerCaseName)) {
    return "javascript";
  }

  if (/\.py$/.test(lowerCaseName)) {
    return "python";
  }

  if (/\.go$/.test(lowerCaseName)) {
    return "go";
  }

  if (/\.rs$/.test(lowerCaseName)) {
    return "rust";
  }

  return "typescript";
}
