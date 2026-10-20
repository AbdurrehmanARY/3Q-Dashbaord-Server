-- 0028_dispatch_dc_image.sql
--
-- Adds an optional DC-copy image to work orders, captured alongside the
-- artwork image during dispatch.
--
-- Mirrors the existing `image_url` pattern exactly: a nullable `text` column
-- holding either an inline base64 `data:image/...;base64,...` URI (file-upload
-- path) or an external `http(s)` URL. The column is plain text so a Cloudinary
-- URL drops in with no schema change, and the ~4 MB base64 ceiling is enforced
-- by the Zod validation schema rather than the database.
--> statement-breakpoint

-- Added after image_url to keep dispatch-related columns grouped together.
ALTER TABLE work_orders
  ADD COLUMN dc_image_url text;
COMMENT ON COLUMN work_orders.dc_image_url IS
  'DC-copy image — base64 data URI (uploaded) or external image URL; optional, captured during dispatch alongside the artwork image';
