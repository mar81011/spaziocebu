import { useStoreStatus } from "../../hooks/useStoreStatus";

export function ClosedBanner() {
  const { isOpen } = useStoreStatus();
  if (isOpen) return null;

  return (
    <div className="bg-espresso px-6 py-2.5 text-center text-sm text-white/90">
      We're closed for orders right now — pickup will be back soon.
    </div>
  );
}
