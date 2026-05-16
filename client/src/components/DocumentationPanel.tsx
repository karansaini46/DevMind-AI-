import CodeMirror from "@uiw/react-codemirror";
import ReactMarkdown from "react-markdown";
import type { Documentation } from "../lib/api";
import { getLanguageExtensions } from "../lib/code-editor";

export function DocumentationPanel({
  activeTab,
  documentation,
  documentationExtensions,
  error,
  hasSnippet,
  isGenerating,
  isLoading,
  copiedCommentedCode,
  copiedReadmeSection,
  onGenerate,
  onTabChange,
  onCopyCommentedCode,
  onCopyReadmeSection,
}: {
  activeTab: "commentedCode" | "readmeSection";
  documentation: Documentation | null;
  documentationExtensions: ReturnType<typeof getLanguageExtensions>;
  error: string | null;
  hasSnippet: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  copiedCommentedCode: boolean;
  copiedReadmeSection: boolean;
  onGenerate: () => void;
  onTabChange: (tab: "commentedCode" | "readmeSection") => void;
  onCopyCommentedCode: () => void;
  onCopyReadmeSection: () => void;
}) {
  return (
    <>
      <div className="review-output-header">
        <div>
          <p className="eyebrow">Documentation</p>
          <h2>{documentation ? "Ready" : "Waiting for documentation"}</h2>
        </div>

        {!documentation ? (
          <button
            className="primary-button"
            type="button"
            onClick={onGenerate}
            disabled={!hasSnippet || isGenerating || isLoading}
          >
            {isGenerating ? "Documenting..." : "Generate Docs"}
          </button>
        ) : null}
      </div>

      {isGenerating ? <p className="form-note">Documenting your code...</p> : null}
      {isLoading ? <p className="form-note">Loading documentation...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!hasSnippet && !documentation ? (
        <p className="empty-review">Run a review first, then generate documentation here.</p>
      ) : null}

      {hasSnippet && !documentation && !isGenerating && !isLoading && !error ? (
        <p className="empty-review">Generate documentation for the saved snippet when ready.</p>
      ) : null}

      {documentation ? (
        <>
          <div>
            <span className="language-badge">{documentation.language}</span>
          </div>

          <div className="documentation-tabs" role="tablist" aria-label="Documentation sections">
            <button
              className={
                activeTab === "commentedCode"
                  ? "documentation-tab is-active"
                  : "documentation-tab"
              }
              type="button"
              role="tab"
              aria-selected={activeTab === "commentedCode"}
              onClick={() => onTabChange("commentedCode")}
            >
              Commented Code
            </button>
            <button
              className={
                activeTab === "readmeSection"
                  ? "documentation-tab is-active"
                  : "documentation-tab"
              }
              type="button"
              role="tab"
              aria-selected={activeTab === "readmeSection"}
              onClick={() => onTabChange("readmeSection")}
            >
              README Section
            </button>
          </div>

          {activeTab === "commentedCode" ? (
            <section className="documentation-section">
              <div className="documentation-actions">
                <button className="ghost-button" type="button" onClick={onCopyCommentedCode}>
                  {copiedCommentedCode ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="editor-shell">
                <CodeMirror
                  value={documentation.commentedCode}
                  height="24rem"
                  extensions={documentationExtensions}
                  editable={false}
                  basicSetup={{
                    foldGutter: true,
                    lineNumbers: true,
                    highlightActiveLine: false,
                  }}
                />
              </div>
            </section>
          ) : (
            <section className="documentation-section">
              <div className="documentation-actions">
                <button className="ghost-button" type="button" onClick={onCopyReadmeSection}>
                  {copiedReadmeSection ? "Copied" : "Copy Markdown"}
                </button>
              </div>
              <article className="markdown-output">
                <ReactMarkdown>{documentation.readmeSection}</ReactMarkdown>
              </article>
            </section>
          )}
        </>
      ) : null}
    </>
  );
}
