/** Philippine mobile for Semaphore (09xxxxxxxxx). */
export function normalizePhPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return `0${digits}`;
}
