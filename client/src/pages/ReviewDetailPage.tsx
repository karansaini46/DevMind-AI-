import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useState, useEffect, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DocumentationPanel } from "../components/DocumentationPanel";
import {
  type Documentation,
  type ReReviewResponse,
  type ReviewDetailResponse,
} from "../lib/api";
import {
  getLanguageExtensions,
  getLanguageLabel,
} from "../lib/code-editor";
import { authConfig, apiClient, getRequestErrorMessage } from "../lib/http";
import {
  formatReviewDate,
  getScoreTone,
  getSourceLabel,
} from "../lib/review-display";
import { useAuthStore } from "../store/auth-store";

export function ReviewDetailPage() {
  const token = useAuthStore((state) => state.token);
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetailResponse["review"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [documentationError, setDocumentationError] = useState<string | null>(null);
  const [isGeneratingDocumentation, setIsGeneratingDocumentation] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [activeDocumentationTab, setActiveDocumentationTab] = useState<
    "commentedCode" | "readmeSection"
  >("commentedCode");
  const [copiedCommentedCode, setCopiedCommentedCode] = useState(false);
  const [copiedReadmeSection, setCopiedReadmeSection] = useState(false);

  useEffect(() => {
    if (!token || !reviewId) {
      setError("Review is unavailable");
      setIsLoading(false);
      return;
    }

    const currentToken = token;
    const currentReviewId = reviewId;
    let isMounted = true;

    async function loadReview() {
      try {
        const response = await apiClient.get<ReviewDetailResponse>(
          `/reviews/${currentReviewId}`,
          authConfig(currentToken),
        );

        if (isMounted) {
          setReview(response.data.review);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getRequestErrorMessage(caughtError, "Unable to load review"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReview();

    return () => {
      isMounted = false;
    };
  }, [reviewId, token]);

  const codeExtensions = useMemo(
    () => getLanguageExtensions(review?.snippet.language ?? "other"),
    [review?.snippet.language],
  );
  const documentationExtensions = useMemo(
    () => getLanguageExtensions(documentation?.language.toLowerCase() ?? "other"),
    [documentation?.language],
  );

  async function handleReReview() {
    if (!token || !reviewId) {
      return;
    }

    setIsReReviewing(true);
    setError(null);

    try {
      const response = await apiClient.post<ReReviewResponse>(
        `/reviews/${reviewId}/re-review`,
        undefined,
        authConfig(token),
      );
      navigate(`/reviews/${response.data.reviewId}`);
    } catch (caughtError) {
      setError(getRequestErrorMessage(caughtError, "Unable to create a fresh review"));
    } finally {
      setIsReReviewing(false);
    }
  }

  async function handleGenerateDocumentation() {
    if (!token || !review) {
      return;
    }

    setShowDocumentation(true);
    setDocumentationError(null);
    setCopiedCommentedCode(false);
    setCopiedReadmeSection(false);
    setIsGeneratingDocumentation(true);

    try {
      const response = await apiClient.post<Documentation>(
        "/docs/generate",
        {
          snippetId: review.snippet.id,
        },
        authConfig(token),
      );
      setDocumentation(response.data);
    } catch (caughtError) {
      setDocumentationError(
        getRequestErrorMessage(caughtError, "Unable to generate documentation"),
      );
    } finally {
      setIsGeneratingDocumentation(false);
    }
  }

  async function handleDelete() {
    if (!token || !reviewId) {
      return;
    }

    const confirmed = window.confirm("Delete this review?");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.delete(`/reviews/${reviewId}`, authConfig(token));
      navigate("/history");
    } catch (caughtError) {
      setError(getRequestErrorMessage(caughtError, "Unable to delete review"));
      setIsDeleting(false);
    }
  }

  async function handleCopyCommentedCode() {
    if (!documentation) {
      return;
    }

    await navigator.clipboard.writeText(documentation.commentedCode);
    setCopiedCommentedCode(true);
  }

  async function handleCopyReadmeSection() {
    if (!documentation) {
      return;
    }

    await navigator.clipboard.writeText(documentation.readmeSection);
    setCopiedReadmeSection(true);
  }

  return (
    <section className="review-detail-page">
      <div className="review-detail-header">
        <div>
          <p className="eyebrow">Review Detail</p>
          <h1>{review?.snippet.filename ?? "Loading review"}</h1>
        </div>
        <Link className="ghost-link" to="/history">
          Back to history
        </Link>
      </div>

      {isLoading ? <p className="empty-review">Loading review.</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {review ? (
        <>
          <section className="review-detail-summary panel-card">
            <div
              className={`score-ring ${getScoreTone(review.score)}`}
              style={
                {
                  "--score-angle": `${review.score * 36}deg`,
                } as CSSProperties
              }
            >
              <strong>{review.score}/10</strong>
            </div>

            <dl className="metadata-grid">
              <div>
                <dt>Language</dt>
                <dd>{getLanguageLabel(review.snippet.language)}</dd>
              </div>
              <div>
                <dt>Filename</dt>
                <dd>{review.snippet.filename}</dd>
              </div>
              <div>
                <dt>Reviewed</dt>
                <dd>{formatReviewDate(review.createdAt)}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{getSourceLabel(review.source)}</dd>
              </div>
            </dl>

            <div className="review-detail-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => void handleReReview()}
                disabled={isReReviewing}
              >
                {isReReviewing ? "Reviewing..." : "Re-Review"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void handleGenerateDocumentation()}
                disabled={isGeneratingDocumentation}
              >
                {isGeneratingDocumentation ? "Generating..." : "Generate Docs"}
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>

          <section className="review-detail-grid">
            <article className="panel-card detail-panel">
              <div>
                <p className="eyebrow">Original Code</p>
                <h2>Submitted snippet</h2>
              </div>
              <div className="editor-shell">
                <CodeMirror
                  value={review.snippet.rawCode}
                  height="32rem"
                  extensions={codeExtensions}
                  editable={false}
                  basicSetup={{
                    foldGutter: true,
                    lineNumbers: true,
                    highlightActiveLine: false,
                  }}
                />
              </div>
            </article>

            <article className="panel-card detail-panel">
              <div>
                <p className="eyebrow">Feedback</p>
                <h2>Review notes</h2>
              </div>
              <article className="markdown-output">
                <ReactMarkdown>{review.feedbackMarkdown}</ReactMarkdown>
              </article>
            </article>
          </section>

          {showDocumentation || documentation ? (
            <section className="panel-card detail-panel">
              <DocumentationPanel
                activeTab={activeDocumentationTab}
                documentation={documentation}
                documentationExtensions={documentationExtensions}
                error={documentationError}
                hasSnippet
                isGenerating={isGeneratingDocumentation}
                isLoading={false}
                copiedCommentedCode={copiedCommentedCode}
                copiedReadmeSection={copiedReadmeSection}
                onGenerate={() => void handleGenerateDocumentation()}
                onTabChange={setActiveDocumentationTab}
                onCopyCommentedCode={() => void handleCopyCommentedCode()}
                onCopyReadmeSection={() => void handleCopyReadmeSection()}
              />
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
