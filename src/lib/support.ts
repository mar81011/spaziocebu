import type { SupportSettings } from "../types";
import { formatGcashNumber } from "./payment";

export function normalizeSupportPageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("m.me/")) return `https://${trimmed}`;
  // Bare domains: facebook.com/page, instagram.com/spazio, etc.
  if (/^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }
  return trimmed;
}

/** @deprecated use normalizeSupportPageUrl */
export const normalizeMessengerUrl = normalizeSupportPageUrl;

export function formatSupportPhone(phone: string) {
  return formatGcashNumber(phone);
}

export function supportPhoneTelLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("09") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("63")) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function hasSupportPageLink(settings: SupportSettings) {
  return Boolean(normalizeSupportPageUrl(settings.supportPageUrl));
}

export function hasSupportContact(settings: SupportSettings) {
  return Boolean(settings.supportPhone.trim() || hasSupportPageLink(settings));
}

export function supportPageButtonLabel(settings: SupportSettings) {
  const custom = settings.supportPageLabel.trim();
  if (custom) return custom;
  return "Visit this page";
}

export function supportPhoneButtonLabel(settings: SupportSettings) {
  const custom = settings.supportPhoneLabel.trim();
  if (custom) return custom;
  const phone = settings.supportPhone.trim();
  if (!phone) return "Call or text us";
  return `Call or text ${formatSupportPhone(phone)}`;
}

/** Merge saved settings with defaults; supports older messengerUrl key */
export function mergeSupportSettings(
  data: Partial<SupportSettings> & { messengerUrl?: string } | null | undefined
): SupportSettings {
  const defaults = defaultSupportSettings();
  if (!data) return defaults;
  return {
    ...defaults,
    ...data,
    supportPageUrl: data.supportPageUrl?.trim() || data.messengerUrl?.trim() || "",
    supportPageLabel: data.supportPageLabel?.trim() || defaults.supportPageLabel,
    supportPhoneLabel: data.supportPhoneLabel?.trim() ?? defaults.supportPhoneLabel,
    supportPhone: data.supportPhone?.trim() || defaults.supportPhone,
  };
}

export function defaultSupportSettings(): SupportSettings {
  return {
    supportPhone: "09171234567",
    supportPhoneLabel: "",
    supportPageUrl: "",
    supportPageLabel: "Visit this page",
  };
}
