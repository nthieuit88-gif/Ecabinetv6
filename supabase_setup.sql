-- SCRIPT CẤU HÌNH STORAGE (FIXED ERROR 42501)
-- Lệnh 'ALTER TABLE' đã bị loại bỏ vì yêu cầu quyền owner (gây lỗi 42501).
-- Script này chỉ tạo Bucket và Policy nếu chưa tồn tại, an toàn để chạy nhiều lần.

-- 1. Tạo Bucket 'documents' (Nếu chưa có)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Tạo Policy: Xem file (Public Read - Ai cũng xem được nếu có link)
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

-- 3. Tạo Policy: Upload file (Chỉ user đã đăng nhập)
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

-- 4. Tạo Policy: Xóa file (Chỉ user đã đăng nhập)
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

-- 5. Tạo Policy: Sửa file (Chỉ user đã đăng nhập)
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
