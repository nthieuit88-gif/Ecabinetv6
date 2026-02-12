import React, { useState, useRef, useEffect } from 'react';
import { FileText, FileSpreadsheet, FileIcon, Download, Trash2, Search, UploadCloud, Filter, Loader2, Edit } from 'lucide-react';
import { getUserById } from '../data';
import { Document, User } from '../types';
import { supabase } from '../supabaseClient';

interface DocumentListProps {
  currentUser: User;
  pendingAction?: string | null;
  onActionComplete?: () => void;
  documents: Document[];
  onAddDocument: (doc: Document) => void;
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

// Helper function to remove Vietnamese accents and special characters
const sanitizeFileName = (fileName: string): string => {
  // 1. Remove accents
  let str = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // 2. Replace spaces with underscores
  str = str.replace(/\s+/g, '_');
  // 3. Remove non-alphanumeric chars except dots and underscores
  str = str.replace(/[^a-zA-Z0-9._-]/g, '');
  return str;
};

export const DocumentList: React.FC<DocumentListProps> = ({ 
  currentUser,
  pendingAction, 
  onActionComplete, 
  documents, 
  onAddDocument, 
  onDeleteDocument 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    // Only allow auto-open if admin
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
    fileInputRef.current?.click();
  };

  // Helper to force reload and keep scroll position
  const reloadPage = () => {
    localStorage.setItem('ecabinet_scrollY', window.scrollY.toString());
    window.location.reload();
  };

  const handleEdit = async (doc: Document) => {
    const newName = window.prompt("Nhập tên mới cho tài liệu:", doc.name);
    
    if (newName === null || newName.trim() === "") return;
    if (newName === doc.name) return;

    try {
        const { error } = await supabase
            .from('documents')
            .update({ name: newName })
            .eq('id', doc.id);

        if (error) throw error;

        alert("Cập nhật tên tài liệu thành công!");
        reloadPage();

    } catch (error: any) {
        console.error("Error updating document:", error);
        alert(`Lỗi khi cập nhật: ${error.message}`);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
        // 1. Sanitize Filename to ensure valid URL
        const originalName = file.name;
        const cleanName = sanitizeFileName(originalName);
        
        // Generate unique path: timestamp_cleanName
        // Example: "Báo Cáo.docx" -> "17098822_Bao_Cao.docx"
        const filePath = `${Date.now()}_${cleanName}`;

        // 2. Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(uploadError.message);
        }

        // 3. Get Public URL correctly using the returned path
        // Note: uploadData.path is the key used in storage
        const storagePath = uploadData?.path || filePath;
        
        const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // 4. Create Document Record in DB
        const newDoc: Document = {
            id: Date.now().toString(),
            name: originalName, // Keep original display name
            type: getFileType(originalName),
            size: formatFileSize(file.size),
            updatedAt: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            ownerId: currentUser.id,
            url: publicUrl // Save the valid URL
        };

        // Call parent handler (Syncs to DB via App.tsx)
        onAddDocument(newDoc);
        
        // Reset input
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

    // 1. Delete from Storage if URL exists
    if (docUrl) {
      try {
        // Parse URL to get file path
        // URL format: .../storage/v1/object/public/documents/[filePath]
        const urlParts = docUrl.split('/documents/');
        if (urlParts.length > 1) {
           // We must decodeURI to handle any encoded characters in the URL
           const filePath = decodeURIComponent(urlParts[1]);
           console.log("Deleting storage file:", filePath);
           
           const { error: storageError } = await supabase.storage
             .from('documents')
             .remove([filePath]);
             
           if (storageError) {
             console.error('Error deleting file from storage:', storageError);
           }
        }
      } catch (e) {
        console.error("Error parsing URL for storage deletion:", e);
      }
    }

    // 2. Delete Record from DB
    const { error: dbError } = await supabase.from('documents').delete().eq('id', id);

    if (dbError) {
        alert("Lỗi khi xóa dữ liệu: " + dbError.message);
    } else {
        alert("Xóa tài liệu thành công!");
        reloadPage();
    }
    
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        {/* Toolbar */}
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

        {/* Table */}
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
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                          {getFileIcon(doc.type)}
                        </div>
                        <div>
                          <a 
                             href={doc.url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="font-medium text-gray-800 text-sm hover:text-emerald-600 cursor-pointer block"
                          >
                             {doc.name}
                          </a>
                          <p className="text-xs text-gray-400 uppercase mt-0.5">{doc.type}</p>
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
                        {doc.url && (
                          <a 
                            href={doc.url} 
                            target="_blank"
                            download={doc.name}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center" 
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