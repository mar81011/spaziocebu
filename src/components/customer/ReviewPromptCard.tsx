import { useState } from "react";
import {
  scrollToReviewsSection,
  setPendingReviewOrder,
  setReviewDraftRating,
} from "../../lib/customerNotify";
import { StarRating } from "./StarRating";

interface ReviewPromptCardProps {
  orderId: string;
  onNavigate?: () => void;
}

export function ReviewPromptCard({ orderId, onNavigate }: ReviewPromptCardProps) {
  const [rating, setRating] = useState(0);

  function goToReviews(selectedRating?: number) {
    setPendingReviewOrder(orderId);
    if (selectedRating && selectedRating >= 1) {
      setReviewDraftRating(selectedRating);
    }
    onNavigate?.();
    requestAnimationFrame(() => scrollToReviewsSection());
  }

  return (
    <div className="mb-3 max-w-[88%] rounded-2xl border border-terracotta/20 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-espresso">How was order #{orderId}?</p>
      <p className="mt-1 text-xs text-warm-gray">Tap a rating or leave a review below.</p>
      <div className="mt-3 flex items-center gap-3">
        <StarRating
          value={rating}
          onChange={(value) => {
            setRating(value);
            goToReviews(value);
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => goToReviews(rating || undefined)}
        className="mt-3 w-full rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-white transition hover:bg-terracotta/90"
      >
        Leave a review
      </button>
    </div>
  );
}
