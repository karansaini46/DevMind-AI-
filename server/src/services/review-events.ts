import { EventEmitter } from "events";

export interface AutoReviewEvent {
  id: string;
  snippetId: string;
  markdown: string;
  score: number;
  demoScore: number | null;
  productionScore: number | null;
  confidenceLevel: string | null;
  mode: string | null;
  createdAt: Date;
  source: string;
  filename: string;
  language: string;
}

const reviewEvents = new EventEmitter();
reviewEvents.setMaxListeners(0);

export function publishAutoReview(userId: string, review: AutoReviewEvent) {
  reviewEvents.emit(userId, review);
}

export function subscribeToAutoReviews(
  userId: string,
  listener: (review: AutoReviewEvent) => void,
) {
  reviewEvents.on(userId, listener);

  return () => {
    reviewEvents.off(userId, listener);
  };
}
