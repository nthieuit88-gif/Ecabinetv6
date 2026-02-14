-- SCRIPT CẤU HÌNH STORAGE (RESET & FIX ALL PERMISSIONS)
-- Chạy script này để XÓA các quyền cũ và CẤP QUYỀN MỚI cho phép upload/view 100%

-- 1. Đảm bảo Bucket 'documents' tồn tại và là Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. XÓA BỎ CÁC POLICY CŨ (Để tránh xung đột)
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Documents" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;

-- 3. TẠO POLICY MỚI (CHO PHÉP TẤT CẢ)

-- Quyền xem file (SELECT): Cho phép tất cả mọi người (kể cả chưa đăng nhập)
CREATE POLICY "Public Access Documents" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'documents' );

-- Quyền upload file (INSERT): Cho phép tất cả (Authenticated + Anon)
-- Đây là fix quan trọng cho lỗi "new row violates..."
CREATE POLICY "Universal Upload Documents" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'documents' );

-- Quyền xóa file (DELETE): Cho phép tất cả (để thuận tiện cho demo)
CREATE POLICY "Universal Delete Documents" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'documents' );

-- Quyền sửa file (UPDATE)
CREATE POLICY "Universal Update Documents" 
ON storage.objects FOR UPDATE
USING ( bucket_id = 'documents' );