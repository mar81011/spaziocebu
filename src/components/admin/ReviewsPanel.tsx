import { useMemo } from "react";
import { deleteReview } from "../../lib/storage";
import { formatTime, formatTimeAgo } from "../../lib/format";
import { useReviews } from "../../hooks/useReviews";
import { StarRating } from "../customer/StarRating";

export function ReviewsPanel() {
  const { reviews } = useReviews();

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-espresso">Reviews</h1>
          <p className="mt-1 text-sm text-warm-gray">Public comments from customers on the site.</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-cream px-4 py-2 text-sm">
            <StarRating value={Math.round(average)} size="sm" />
            <span className="font-medium">{average.toFixed(1)}</span>
            <span className="text-warm-gray">({reviews.length})</span>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <p className="rounded-[18px] border border-espresso/8 bg-white p-8 text-center text-sm text-warm-gray">
            No reviews yet.
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[18px] border border-espresso/8 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-espresso">{review.customerName}</p>
                  <p className="mt-1 text-xs text-warm-gray">
                    {formatTimeAgo(review.createdAt)} · {formatTime(review.createdAt)}
                    {review.orderId ? ` · Order #${review.orderId}` : ""}
                  </p>
                  <div className="mt-2">
                    <StarRating value={review.rating} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteReview(review.id)}
                  className="text-sm text-warm-gray hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-espresso/90">
                {review.comment}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
