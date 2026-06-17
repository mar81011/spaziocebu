import { useStoreStatus } from "../../hooks/useStoreStatus";

export function StoreToggle() {
  const { isOpen, setOpen } = useStoreStatus();

  return (
    <div className="rounded-lg bg-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{isOpen ? "Open for orders" : "Closed"}</p>
          <p className="mt-0.5 text-xs text-white/55">
            {isOpen ? "Customers can place orders" : "Ordering is paused on the site"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label={isOpen ? "Close store" : "Open store"}
          onClick={() => setOpen(!isOpen)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            isOpen ? "bg-[#6dd47e]" : "bg-white/25"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              isOpen ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
