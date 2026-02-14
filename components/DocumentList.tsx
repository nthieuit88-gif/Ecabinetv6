import React, { useState, useRef, useEffect } from 'react';
import { FileText, FileSpreadsheet, FileIcon, Download, Trash2, Search, UploadCloud, Filter, Loader2, Edit, AlertCircle, Database, Link2, Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { getUserById } from '../data';
import { Document, User } from '../types';
import { supabase } from '../supabaseClient';
import { saveFileToLocal, deleteFileFromLocal } from '../utils/indexedDB';

interface DocumentListProps {
  currentUser: User;
  pendingAction?: string | null;
  onActionComplete?: () => void;
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onUpdateDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
}

const getFileIcon = (type: Document['type']) => {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
    case 'xls': return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    case 'ppt': return <FileIcon className="w-8 h-8 text-orange-500" />;
    default: return <FileText className="w-8 h-8 text-gray-400" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileType = (fileName: string): Document['type'] => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext || '')) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'xls';
  if (['ppt', 'pptx'].includes(ext || '')) return 'ppt';
  return 'other';
};

const sanitizeFileName = (fileName: string): string => {
  // Chuyển tiếng Việt có dấu thành không dấu
  let str = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Thay thế khoảng trắng bằng gạch dưới
  str = str.replace(/\s+/g, '_');
  // Chỉ giữ lại ký tự chữ, số, gạch dưới, gạch ngang và dấu chấm
  str = str.replace(/[^a-zA-Z0-9._-]/g, '');
  return str;
};

export const DocumentList: React.FC<DocumentListProps> = ({ 
  currentUser,
  pendingAction, 
  onActionComplete, 
  documents, 
  onAddDocument, 
  onUpdateDocument, 
  onDeleteDocument 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.role === 'admin';
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (pendingAction === 'upload' && isAdmin) {
      if (fileInputRef.current) {
         try {
           fileInputRef.current.click();
         } catch(e) {
           console.log("Auto-open blocked, user must click manually");
         }
      }
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete, isAdmin]);

  const handleUploadClick = () => {
    setUploadWarning(null);
    fileInputRef.current?.click();
  };

  const handleEdit = async (doc: Document) => {
    const newName = window.prompt("Nhập tên mới cho tài liệu:", doc.name);
    
    if (newName === null || newName.trim() === "") return;
    if (newName === doc.name) return;

    const updatedDoc = { ...doc, name: newName };
    onUpdateDocument(updatedDoc);
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadWarning(null);

    try {
        const originalName = file.name;
        // Clean filename strictly to avoid URL encoding issues in viewers
        const cleanName = sanitizeFileName(originalName);
        
        // Use a random prefix to avoid collisions and cache issues
        const filePath = `${Date.now()}_${cleanName}`;
        let publicUrl = '';
        
        // 1. Upload to Supabase
        console.log(`[Upload] Starting upload for ${cleanName}...`);
        
        // FIX: Thêm contentType để Server trả về Header đúng (application/pdf, etc.)
        // Nếu không có dòng này, file sẽ bị hiểu là application/octet-stream -> Trình duyệt sẽ bắt tải về thay vì Preview
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type // <--- QUAN TRỌNG: Thiết lập Response Header Content-Type
            });

        if (uploadError) {
            console.warn('Supabase Storage upload failed.', uploadError);
            
            let errorMsg = `Lỗi Server: ${uploadError.message}.`;
            
            // Suggest fixes for common RLS errors
            if (uploadError.message.includes('row-level security') || uploadError.message.includes('violates')) {
                errorMsg = `Lỗi Quyền (RLS). Đã chuyển sang chế độ Local. Hãy chạy script 'supabase_setup.sql' mới nhất để sửa triệt để.`;
            }
            
            setUploadWarning(`${errorMsg} File chỉ xem được trên máy của bạn.`);
            
            // Fallback to local Blob URL (Only visible to uploader)
            publicUrl = URL.createObjectURL(file);
        } else {
            const storagePath = uploadData?.path || filePath;
            const { data: publicUrlData } = supabase.storage
                .from('documents')
                .getPublicUrl(storagePath);
            publicUrl = publicUrlData.publicUrl;
            console.log(`[Upload] Success! Public URL: ${publicUrl}`);
        }

        // 2. Create Doc Record
        const newDocId = Date.now().toString();
        const newDoc: Document = {
            id: newDocId,
            name: originalName, // Display name can remain pretty
            type: getFileType(originalName),
            size: formatFileSize(file.size),
            updatedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            ownerId: currentUser.id,
            url: publicUrl // This is the crucial link for other users
        };

        // 3. IMPORTANT: Save to IndexedDB immediately for local speed
        await saveFileToLocal(newDocId, file);

        onAddDocument(newDoc);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

    } catch (error: any) {
        console.error("Unexpected error during upload:", error);
        alert(`Có lỗi xảy ra: ${error.message || "Không thể tải lên"}`);
    } finally {
        setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, docUrl?: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.')) {
      return;
    }

    // 1. Delete from Remote Storage
    if (docUrl && !docUrl.startsWith('blob:')) {
         try {
           const urlParts = docUrl.split('/documents/');
           if (urlParts.length > 1) {
              const filePath = decodeURIComponent(urlParts[1]);
              await supabase.storage.from('documents').remove([filePath]);
           }
         } catch (e) { console.error("Error parsing URL", e); }
    }
    
    // 2. Delete from Local IndexedDB
    await deleteFileFromLocal(id);

    onDeleteDocument(id); 
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kho Tài Liệu</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý và lưu trữ tài liệu cuộc họp</p>
        </div>
        
        {isAdmin && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />

            <button 
              onClick={handleUploadClick}
              disabled={isUploading}
              className={`bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-orange-200 ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Tải Lên
                </>
              )}
            </button>
          </>
        )}
      </div>

      {uploadWarning && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3 text-sm animate-in slide-in-from-top-2">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div className="flex-1">{uploadWarning}</div>
             <button onClick={() => setUploadWarning(null)} className="ml-auto text-red-600 hover:text-red-800 font-bold">✕</button>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm tài liệu..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>
            <button className="flex items-center gap-2 text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg text-sm border border-gray-200 transition-colors">
               <Filter className="w-4 h-4" /> Bộ lọc
            </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Tên Tài Liệu</th>
                <th className="px-6 py-4">Kích Thước</th>
                <th className="px-6 py-4">Ngày Tải Lên</th>
                <th className="px-6 py-4">Người Tải</th>
                <th className="px-6 py-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => {
                const owner = getUserById(doc.ownerId);
                const isLocalBlob = doc.url && doc.url.startsWith('blob:');
                const isSupabaseUrl = doc.url && !isLocalBlob;

                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                          {getFileIcon(doc.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                              <span className="font-medium text-sm block text-gray-800">{doc.name}</span>
                              {isLocalBlob && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 font-bold" title="Lỗi: File chưa được tải lên Server. Chỉ xem được trên máy này.">Lỗi Sync</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-xs text-gray-400 uppercase">{doc.type}</span>
                             
                             {/* URL Debugger Tools */}
                             {isSupabaseUrl && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="w-px h-3 bg-gray-300 mx-1"></div>
                                   <button 
                                      onClick={() => handleCopyUrl(doc.id, doc.url || '')}
                                      className="p-1 text-gray-400 hover:text-blue-500 rounded"
                                      title="Sao chép URL gốc"
                                   >
                                      {copiedId === doc.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                   </button>
                                </div>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{doc.size}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{doc.updatedAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-300">
                            {owner?.name.charAt(0) || '?'}
                         </div>
                         <span className="text-sm text-gray-700">{owner?.name || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                             className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                             title="Đã lưu trong cache cục bộ (IndexedDB)"
                        >
                            <Database className="w-4 h-4" />
                        </button>
                        {doc.url && (
                          <a 
                            href={doc.url} 
                            target="_blank"
                            download={doc.name}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center" 
                            title="Tải xuống"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        
                        {isAdmin && (
                          <>
                            <button 
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" 
                                title="Đổi tên"
                                onClick={() => handleEdit(doc)}
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" 
                                title="Xóa"
                                onClick={() => handleDelete(doc.id, doc.url)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Chưa có tài liệu nào. {isAdmin && "Hãy tải lên ngay!"}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};