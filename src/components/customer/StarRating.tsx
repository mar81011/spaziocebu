interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const interactive = Boolean(onChange);
  const starClass = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const button = (
          <span className={filled ? "text-terracotta" : "text-espresso/20"}>★</span>
        );

        if (!interactive) return <span key={star} className={starClass}>{button}</span>;

        return (
          <button
            key={star}
            type="button"
            className={`${starClass} leading-none transition hover:scale-110`}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            {button}
          </button>
        );
      })}
    </div>
  );
}
