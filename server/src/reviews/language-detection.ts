import type { ReviewContextTag } from "../prompts/languageRules";
import type {
  ReviewLanguage,
  ReviewLanguageInput,
} from "./schema";

const languageByExtension: Record<string, ReviewLanguage> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".h": "cpp",
};

export interface ResolvedReviewContext {
  language: ReviewLanguage;
  contexts: ReviewContextTag[];
}

export function resolveReviewContext(input: {
  code: string;
  filename: string;
  language: ReviewLanguageInput;
}): ResolvedReviewContext {
  const language =
    input.language === "auto"
      ? detectLanguage(input.filename, input.code)
      : input.language;

  const contexts = new Set<ReviewContextTag>();

  if (looksLikeReact(input.filename, input.code)) {
    contexts.add("react");
  }

  if (looksLikeBackend(input.code)) {
    contexts.add("backend");
  }

  return {
    language,
    contexts: [...contexts],
  };
}

export function detectLanguage(filename: string, code: string): ReviewLanguage {
  const lowerCaseName = filename.toLowerCase();
  const extension = Object.keys(languageByExtension).find((candidate) =>
    lowerCaseName.endsWith(candidate),
  );

  if (extension) {
    return languageByExtension[extension];
  }

  if (/\b(interface|type)\s+[A-Z]\w*\b|:\s*(string|number|boolean)\b|\bas\s+const\b/.test(code)) {
    return "typescript";
  }

  if (
    /^\s*def\s+\w+\s*\(/m.test(code) ||
    /^\s*from\s+[\w.]+\s+import\s+\w+/m.test(code) ||
    (/^\s*import\s+[\w.]+(?:\s+as\s+\w+)?\s*$/m.test(code) &&
      !/\b(export|from)\b/.test(code))
  ) {
    return "python";
  }

  if (/\bpackage\s+\w+\b|\bfunc\s+\w+\s*\(/.test(code)) {
    return "go";
  }

  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\bResult<.+>/.test(code)) {
    return "rust";
  }

  if (/\b(public|private|protected)\s+(class|static)|\bclass\s+\w+\s*\{/.test(code)) {
    return "java";
  }

  if (/\b#include\s*<|\bstd::|\bint\s+main\s*\(/.test(code)) {
    return "cpp";
  }

  if (/\b(const|let|var|function|=>)\b/.test(code)) {
    return "javascript";
  }

  return "other";
}

function looksLikeReact(filename: string, code: string) {
  return (
    /\.(jsx|tsx)$/i.test(filename) ||
    /\b(useState|useEffect|useMemo|useCallback|createContext)\s*\(/.test(code) ||
    /\breturn\s*\(/.test(code) && /<\w+[\s>]/.test(code)
  );
}

function looksLikeBackend(code: string) {
  return (
    /\b(app|router)\.(get|post|put|patch|delete)\s*\(/.test(code) ||
    /\b(req|request)\.(body|params|query|headers)\b/.test(code) ||
    /\b(res|response)\.(json|status|send)\s*\(/.test(code) ||
    /\bprisma\.|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/.test(code)
  );
}
