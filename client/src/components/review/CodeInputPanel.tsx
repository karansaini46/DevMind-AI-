import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import type { ChangeEvent } from "react";
import { languages, type Language } from "../../lib/code-editor";
import type { ReviewMode } from "../../lib/api";
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

      <div>
        <p className="eyebrow">Review lens</p>
        <ReviewModeSelector mode={mode} disabled={isReviewing} onChange={onModeChange} />
      </div>

      <div className="editor-shell cockpit-editor">
        <CodeMirror
          value={code}
          height="31rem"
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
    </section>
  );
}
