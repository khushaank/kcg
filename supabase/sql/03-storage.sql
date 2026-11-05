-- Optional: Upload maker photos and product images in Storage > kcg-media.
-- Images are publicly readable; ONLY trusted service-role/admin uploads allowed.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kcg-media','kcg-media',true,2097152,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do nothing;
-- No browser INSERT/UPDATE/DELETE policies are created. Dashboard administrators
-- can upload, then paste the public URL into products.image or makers.image.
