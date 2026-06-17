import { useMemo, useState, useEffect, type FormEvent } from "react";
import { useOrders } from "../../hooks/useOrders";
import { useReviews } from "../../hooks/useReviews";
import {
  clearPendingReviewOrder,
  consumeReviewDraftRating,
  getPendingReviewOrder,
} from "../../lib/customerNotify";
import { formatTimeAgo } from "../../lib/format";
import { submitReview } from "../../lib/storage";
import { StarRating } from "./StarRating";

function avatarInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function averageRating(reviews: { rating: number }[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

export function ReviewsSection() {
  const { reviews } = useReviews();
  const { orders } = useOrders();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pendingOrderId = getPendingReviewOrder();
  const pendingOrder = orders.find((o) => o.id === pendingOrderId);
  const alreadyReviewedOrder = pendingOrderId
    ? reviews.some((r) => r.orderId === pendingOrderId)
    : false;

  const summary = useMemo(() => averageRating(reviews), [reviews]);

  useEffect(() => {
    if (!pendingOrderId || alreadyReviewedOrder) return;
    const draft = consumeReviewDraftRating();
    if (draft) setRating(draft);
  }, [pendingOrderId, alreadyReviewedOrder]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await submitReview({
        customerName: name,
        rating,
        comment,
        orderId: pendingOrderId && !alreadyReviewedOrder ? pendingOrderId : undefined,
      });
      setComment("");
      setSuccess(true);
      if (pendingOrderId) clearPendingReviewOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="reviews" className="border-t border-espresso/8 bg-cream/40 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="font-serif text-4xl font-medium md:text-5xl">Reviews</h2>
          <p className="mt-3 text-sm text-warm-gray">
            Share your Spazio experience — like a comment thread, but for coffee.
          </p>
          {reviews.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-espresso">
              <StarRating value={Math.round(summary)} size="sm" />
              <span className="font-medium">{summary.toFixed(1)}</span>
              <span className="text-warm-gray">· {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>

        <form
          id="review-form"
          onSubmit={handleSubmit}
          className="mt-10 rounded-[18px] border border-espresso/8 bg-white p-5 shadow-[0_8px_30px_rgba(26,18,14,0.06)] sm:p-6"
        >
          {pendingOrder && !alreadyReviewedOrder && (
            <p className="mb-4 rounded-lg bg-[#edf3ea] px-3 py-2 text-sm text-sage">
              How was order #{pendingOrder.id}? Rate your visit and share a quick comment.
            </p>
          )}

          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-espresso text-sm font-semibold text-white">
              {avatarInitial(name || "?")}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-lg border border-espresso/12 px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-warm-gray">Rating</span>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience…"
                required
                rows={3}
                className="w-full resize-y rounded-lg border border-espresso/12 px-3 py-2 text-sm outline-none focus:border-terracotta"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-sage">Thanks for your review!</p>}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-espresso px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post review"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-10 space-y-5">
          {reviews.length === 0 ? (
            <p className="text-center text-sm text-warm-gray">No reviews yet — be the first!</p>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="flex gap-3 border-b border-espresso/6 pb-5 last:border-0"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-sm font-semibold text-terracotta">
                  {avatarInitial(review.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-espresso">{review.customerName}</span>
                    <span className="text-xs text-warm-gray">{formatTimeAgo(review.createdAt)}</span>
                    {review.orderId && (
                      <span className="text-xs text-warm-gray">· Order #{review.orderId}</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-espresso/90">
                    {review.comment}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
