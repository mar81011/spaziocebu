-- Add GCash QR image URL for scan-to-pay checkout
alter table public.store_config
  add column if not exists gcash_qr_url text not null default '';
