import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ReviewCockpit } from "../components/review/ReviewCockpit";
import {
  API_URL,
  parseApiError,
  type ManualReviewSummary,
  type ReviewMode,
  type ReviewResponse,
} from "../lib/api";
import {
  getEditorLanguage,
  getLanguageExtensions,
  type Language,
} from "../lib/code-editor";
import { getPreferredReviewMode } from "../lib/onboarding";
import { useAuthStore } from "../store/auth-store";

export function CodeReviewPage() {
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("auto");
  const [filename, setFilename] = useState("");
  const [mode, setMode] = useState<ReviewMode>(() => getPreferredReviewMode());
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [indexingWarning, setIndexingWarning] = useState<string | null>(null);
  const [history, setHistory] = useState<ManualReviewSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const editorLanguage = getEditorLanguage(language, filename);
  const extensions = useMemo(() => getLanguageExtensions(editorLanguage), [editorLanguage]);

  useEffect(() => {
    if (!token) {
      setIsLoadingHistory(false);
      return;
    }

    let active = true;

    async function loadHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await fetch(`${API_URL}/reviews/history?limit=12`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const body = (await response.json()) as { reviews: ManualReviewSummary[] };

        if (active) {
          setHistory(body.reviews);
        }
      } catch (caughtError) {
        if (active) {
          setHistoryError(
            caughtError instanceof Error ? caughtError.message : "Unable to load review history",
          );
        }
      } finally {
        if (active) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!code.trim()) {
      setError("Code is required");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setError(null);
    setIndexingWarning(null);
    setIsReviewing(true);

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ code, language, filename, mode }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const body = (await response.json()) as ReviewResponse;

      if (!body.searchIndexed) {
        setIndexingWarning("Saved, but search indexing is pending.");
      }

      navigate(`/reviews/${body.reviewId}`, {
        state: {
          initialReview: body,
        },
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to complete review");
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setCode(text);
    setFilename(file.name);
    setLanguage("auto");
    event.target.value = "";
  }

  return (
    <ReviewCockpit
      code={code}
      filename={filename}
      language={language}
      mode={mode}
      extensions={extensions}
      isReviewing={isReviewing}
      error={error}
      indexingWarning={indexingWarning}
      history={history}
      historyError={historyError}
      isLoadingHistory={isLoadingHistory}
      onSubmit={handleSubmit}
      onCodeChange={setCode}
      onFilenameChange={setFilename}
      onLanguageChange={setLanguage}
      onModeChange={setMode}
      onFileChange={handleFileChange}
    />
  );
}
