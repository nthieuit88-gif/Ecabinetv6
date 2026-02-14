-- SCRIPT CẤU HÌNH STORAGE (SAFE MODE - FIX ERROR 42501)
-- Script này sẽ thêm quyền truy cập mà KHÔNG cố gắng xóa các quyền cũ (tránh lỗi must be owner)

-- 1. Đảm bảo Bucket 'documents' tồn tại và là Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Tạo Policy mới cho phép TẤT CẢ (Upload/Select/Update/Delete)
-- Sử dụng khối DO để kiểm tra xem policy đã tồn tại chưa, tránh lỗi khi chạy lại

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'eCabinet Full Access V6'
    ) THEN
        CREATE POLICY "eCabinet Full Access V6"
        ON storage.objects FOR ALL
        USING ( bucket_id = 'documents' )
        WITH CHECK ( bucket_id = 'documents' );
    END IF;
END
$$;

-- Lưu ý: Policy trong Supabase hoạt động theo cơ chế OR. 
-- Chỉ cần 1 policy cho phép là hành động được chấp nhận.
-- Do đó không cần xóa các policy cũ gây lỗi quyền chủ sở hữu.