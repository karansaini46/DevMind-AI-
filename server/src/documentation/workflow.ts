import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getTextModel } from "../reviews/client";

export interface DocumentationInput {
  code: string;
  filename: string;
}

export interface DocumentationResult {
  commentedCode: string;
  readmeSection: string;
  language: string;
}

const detectLanguageInputSchema = z.object({
  code: z.string(),
});

const inlineCommentsInputSchema = z.object({
  code: z.string(),
  language: z.string(),
});

const readmeSectionInputSchema = z.object({
  code: z.string(),
  language: z.string(),
  filename: z.string(),
});

const documentationResultSchema = z.object({
  commentedCode: z.string().trim().min(1),
  readmeSection: z.string().trim().min(1),
  language: z.string().trim().min(1),
});

export const detectLanguage = tool(
  async ({ code }) =>
    invokePrompt(
      [
        "What programming language is this code written in?",
        "Reply with just the language name.",
        "",
        code,
      ].join("\n"),
    ),
  {
    name: "detect_language",
    description: "Identify the programming language used by a code snippet.",
    schema: detectLanguageInputSchema,
  },
);

export const generateInlineComments = tool(
  async ({ code, language }) =>
    invokePrompt(
      [
        `Add professional ${language} documentation comments (JSDoc for JS/TS, docstrings for Python) to every function, class, and complex line in this code.`,
        "Return ONLY the commented code, no explanation:",
        "",
        code,
      ].join("\n"),
    ),
  {
    name: "generate_inline_comments",
    description: "Add documentation comments to code.",
    schema: inlineCommentsInputSchema,
  },
);

export const generateReadmeSection = tool(
  async ({ code, language, filename }) =>
    invokePrompt(
      [
        `Generate a professional markdown README section for this ${language} file called ${filename}.`,
        "Include: description, exported functions/classes with parameters and return types, and a usage example.",
        "",
        code,
      ].join("\n"),
    ),
  {
    name: "generate_readme_section",
    description: "Create a README section for a source file.",
    schema: readmeSectionInputSchema,
  },
);

const documentationTools = [
  detectLanguage,
  generateInlineComments,
  generateReadmeSection,
];

export async function createDocumentation(input: DocumentationInput) {
  const messages: BaseMessage[] = [
    new SystemMessage(
      [
        "You prepare technical documentation for source files by using the available tools.",
        "Determine the language before producing the commented code and README section.",
        "Use the detected language when calling the remaining tools.",
        "When every requested artifact is ready, respond with DONE.",
      ].join(" "),
    ),
    new HumanMessage(
      [
        `Filename: ${input.filename}`,
        "",
        "Prepare documentation for this code:",
        "",
        input.code,
      ].join("\n"),
    ),
  ];
  const workflowModel = getTextModel().bindTools(documentationTools);
  const partialResult: Partial<DocumentationResult> = {};

  for (let step = 0; step < 8; step += 1) {
    const response = await workflowModel.invoke(messages);
    messages.push(response);
    const toolCalls = response.tool_calls ?? [];

    if (toolCalls.length === 0) {
      break;
    }

    for (const toolCall of toolCalls) {
      if (!toolCall.id) {
        throw new Error("Documentation workflow requested an unsupported tool");
      }

      const content = await invokeRequestedTool(toolCall.name, toolCall.args);

      messages.push(
        new ToolMessage({
          content,
          tool_call_id: toolCall.id,
        }),
      );

      if (toolCall.name === detectLanguage.name) {
        partialResult.language = content.trim();
      }

      if (toolCall.name === generateInlineComments.name) {
        partialResult.commentedCode = content;
      }

      if (toolCall.name === generateReadmeSection.name) {
        partialResult.readmeSection = content;
      }
    }

    const parsedResult = documentationResultSchema.safeParse(partialResult);

    if (parsedResult.success) {
      return parsedResult.data;
    }
  }

  const parsedResult = documentationResultSchema.safeParse(partialResult);

  if (!parsedResult.success) {
    throw new Error("Documentation workflow did not complete");
  }

  return parsedResult.data;
}

async function invokePrompt(prompt: string) {
  return getTextModel().pipe(new StringOutputParser()).invoke(prompt);
}

async function invokeRequestedTool(name: string, args: unknown) {
  if (name === detectLanguage.name) {
    return stringifyToolOutput(
      await detectLanguage.invoke(detectLanguageInputSchema.parse(args)),
    );
  }

  if (name === generateInlineComments.name) {
    return stringifyToolOutput(
      await generateInlineComments.invoke(inlineCommentsInputSchema.parse(args)),
    );
  }

  if (name === generateReadmeSection.name) {
    return stringifyToolOutput(
      await generateReadmeSection.invoke(readmeSectionInputSchema.parse(args)),
    );
  }

  throw new Error("Documentation workflow requested an unsupported tool");
}

function stringifyToolOutput(output: unknown) {
  if (typeof output === "string") {
    return output;
  }

  return JSON.stringify(output);
}
