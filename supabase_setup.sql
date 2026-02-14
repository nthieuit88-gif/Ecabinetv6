-- SCRIPT CẤU HÌNH STORAGE (CẬP NHẬT V2 - FIX LỖI RLS CHO ANON)
-- Chạy toàn bộ script này trong Supabase SQL Editor để sửa lỗi upload.

-- 1. Tạo Bucket 'documents' (Nếu chưa có)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy: Xem file (Public Read - Ai cũng xem được)
-- Áp dụng cho cả 'authenticated' và 'anon'
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

-- 3. Policy: Upload file cho User đã đăng nhập
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

-- 4. [MỚI] Policy: Upload file cho Khách (Anon) 
-- Sửa lỗi "new row violates row-level security policy" khi chạy demo không cần đăng nhập Email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon Upload Documents'
    ) THEN
        CREATE POLICY "Anon Upload Documents" 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'anon' );
    END IF;
END $$;

-- 5. Policy: Xóa file (Chỉ user đã đăng nhập hoặc anon nếu cần thiết cho demo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Delete Documents'
    ) THEN
        CREATE POLICY "Public Delete Documents" 
        ON storage.objects FOR DELETE 
        USING ( bucket_id = 'documents' ); 
        -- Lưu ý: Cho phép xóa công khai để thuận tiện test, thực tế nên giới hạn lại.
    END IF;
END $$;

-- 6. Policy: Sửa file
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update Documents'
    ) THEN
        CREATE POLICY "Public Update Documents" 
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'documents' );
    END IF;
END $$;