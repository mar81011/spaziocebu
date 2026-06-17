import { useCallback, useEffect, useState } from "react";
import type { OrderReview } from "../types";
import { REVIEWS_UPDATED, getReviews } from "../lib/storage";

export function useReviews() {
  const [reviews, setReviews] = useState<OrderReview[]>(() => getReviews());

  const refresh = useCallback(() => {
    setReviews(getReviews());
  }, []);

  useEffect(() => {
    window.addEventListener(REVIEWS_UPDATED, refresh);
    return () => window.removeEventListener(REVIEWS_UPDATED, refresh);
  }, [refresh]);

  return { reviews, refresh };
}
