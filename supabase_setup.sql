-- SCRIPT CẤU HÌNH STORAGE CHO ECABINET (SAFE MODE)
-- Script này sử dụng khối lệnh DO $$ để kiểm tra tồn tại trước khi tạo,
-- tránh lỗi "42501: must be owner of table objects" khi cố gắng DROP policy cũ.

-- 1. Kích hoạt RLS (Thường đã bật sẵn, chạy lại để chắc chắn)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Tạo Bucket 'documents' (Nếu chưa có thì tạo, có rồi thì set public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Tạo Policy: Cho phép xem file (Public Read)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access Documents'
    ) THEN
        CREATE POLICY "Public Access Documents" 
        ON storage.objects FOR SELECT 
        USING ( bucket_id = 'documents' );
    END IF;
END $$;

-- 4. Tạo Policy: Cho phép Upload file (Chỉ user đã đăng nhập)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Upload Documents'
    ) THEN
        CREATE POLICY "Auth Upload Documents" 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
    END IF;
END $$;

-- 5. Tạo Policy: Cho phép Xóa file (Chỉ user đã đăng nhập)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Delete Documents'
    ) THEN
        CREATE POLICY "Auth Delete Documents" 
        ON storage.objects FOR DELETE 
        USING ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
    END IF;
END $$;

-- 6. (Tùy chọn) Policy: Cho phép Update/Sửa file
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Update Documents'
    ) THEN
        CREATE POLICY "Auth Update Documents" 
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
    END IF;
END $$;
