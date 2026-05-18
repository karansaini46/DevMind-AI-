export const antiHallucinationRules = [
  "Accuracy rules:",
  "- Only call something a bug when it can actually fail in the shown code path.",
  "- If a concern is plausible but not proven, label it as a risk or consideration instead of a bug.",
  "- Do not invent security issues, performance problems, dependencies, callers, or missing files.",
  "- Do not overpraise simple code.",
  "- Do not use vague advice without a concrete example or fix.",
  "- Do not recommend heavy architecture for a tiny snippet.",
  "- Do not rewrite code just for style.",
  "- Never call code production-ready unless the provided evidence supports that claim.",
].join("\n");
