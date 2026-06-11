import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import type { ChangeEvent } from "react";
import type { ReviewMode } from "../../lib/api";
import { languages, type Language } from "../../lib/code-editor";
import { ReviewModeSelector } from "./ReviewModeSelector";

export function CodeInputPanel({
  code,
  filename,
  language,
  mode,
  extensions,
  isReviewing,
  onCodeChange,
  onFilenameChange,
  onLanguageChange,
  onModeChange,
  onFileChange,
}: {
  code: string;
  filename: string;
  language: Language;
  mode: ReviewMode;
  extensions: Extension[];
  isReviewing: boolean;
  onCodeChange: (value: string) => void;
  onFilenameChange: (value: string) => void;
  onLanguageChange: (value: Language) => void;
  onModeChange: (value: ReviewMode) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  return (
    <section className="code-input-panel">
      <div className="cockpit-step-heading">
        <span>01</span>
        <div>
          <p className="eyebrow">Paste code</p>
          <h2>Give DevMind the code path.</h2>
        </div>
      </div>

      <div className="editor-shell cockpit-editor">
        <CodeMirror
          value={code}
          height="min(31rem, 56vh)"
          extensions={extensions}
          onChange={onCodeChange}
          editable={!isReviewing}
          basicSetup={{
            foldGutter: true,
            lineNumbers: true,
            highlightActiveLine: true,
          }}
        />
      </div>

      <section className="lens-panel">
        <div className="cockpit-step-heading compact">
          <span>02</span>
          <div>
            <p className="eyebrow">Choose lens</p>
            <h2>Tell the review what to punish.</h2>
          </div>
        </div>
        <ReviewModeSelector mode={mode} disabled={isReviewing} onChange={onModeChange} />
      </section>

      <details className="advanced-input-controls">
        <summary>Advanced input controls</summary>
        <div className="review-fields review-fields-wide">
          <label>
            Language
            <select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
              disabled={isReviewing}
            >
              {languages.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filename
            <input
              value={filename}
              onChange={(event) => onFilenameChange(event.target.value)}
              placeholder="optional"
              disabled={isReviewing}
            />
          </label>

          <label className="file-upload">
            Upload file
            <input
              type="file"
              onChange={(event) => void onFileChange(event)}
              disabled={isReviewing}
            />
          </label>
        </div>
      </details>
    </section>
  );
}
