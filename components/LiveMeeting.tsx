import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Share, MoreHorizontal, LayoutGrid, X, FileText, Plus, Eye, Download, ChevronRight, Search, UploadCloud, Loader2, ChevronLeft, Minus, ZoomIn, ZoomOut, Maximize, FileSpreadsheet, FileIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { Meeting, Document, User } from '../types';
import { USERS, getUserById } from '../data';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using CDNJS which provides a reliable standalone worker script
// compatible with standard Worker API.
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface LiveMeetingProps {
  currentUser: User;
  meeting: Meeting;
  onLeave: () => void;
  allDocuments: Document[];
  onAddDocument: (doc: Document) => void;
  onUpdateMeeting: (meeting: Meeting) => void;
}

export const LiveMeeting: React.FC<LiveMeetingProps> = ({ currentUser, meeting, onLeave, allDocuments, onAddDocument, onUpdateMeeting }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  
  // Sidebar state: 'chat', 'docs', or null. Default is 'docs' to show files immediately.
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'docs' | null>('docs');
  
  // Control Bar Visibility State (Auto-hide)
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);
  
  // Document logic
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>(meeting.documentIds || []);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store actual File objects for uploaded files to enable preview (Local Session only)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  
  // DOCX State
  const [docxContent, setDocxContent] = useState<string | null>(null);
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation State for Flip Effect
  const [pageTransition, setPageTransition] = useState<'none' | 'flipping-next' | 'flipping-prev'>('none');
  
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mock participants based on USERS data, excluding current user to avoid duplicate
  // In a real app, this would come from a websocket/backend
  const otherParticipants = USERS.filter(u => u.id !== currentUser.id).slice(0, 4); 

  const isAdmin = currentUser.role === 'admin';

  // --- Auto-hide Controls Logic ---
  const resetIdleTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Set timer to hide after 10 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 10000);
  };

  useEffect(() => {
    // Initialize timer
    resetIdleTimer();

    // Attach listeners
    const handleActivity = () => resetIdleTimer();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);
  // --------------------------------

  const toggleSidebar = (type: 'chat' | 'docs') => {
    if (activeSidebar === type) {
      setActiveSidebar(null);
    } else {
      setActiveSidebar(type);
    }
  };

  const handleAddExistingDocument = (docId: string) => {
    if (!attachedDocIds.includes(docId)) {
        const updatedIds = [...attachedDocIds, docId];
        setAttachedDocIds(updatedIds);
        
        // Sync with Supabase: Update Meeting
        const updatedMeeting: Meeting = {
            ...meeting,
            documentIds: updatedIds
        };
        onUpdateMeeting(updatedMeeting);
    }
    setIsAddingDoc(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getAttachedDocsResolved = () => {
      // Look up docs from the global list based on attached IDs
      return attachedDocIds.map(id => {
          return allDocuments.find(d => d.id === id);
      }).filter(Boolean) as Document[];
  };

  // Update handleFileChange to Persist Data
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      if (files.length > 5) {
          alert("Vui lòng chỉ chọn tối đa 5 file cùng lúc.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      const getFileType = (fileName: string): Document['type'] => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext || '')) return 'doc';
        if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'xls';
        if (['ppt', 'pptx'].includes(ext || '')) return 'ppt';
        return 'other';
      };

      setTimeout(() => {
          const newDocs: Document[] = [];
          const newFilesMap: Record<string, File> = {};
          const newDocIds: string[] = [];

          (Array.from(files) as File[]).forEach((file, index) => {
              const newDocId = `doc-live-${Date.now()}-${index}`;
              const newDoc: Document = {
                  id: newDocId,
                  name: file.name,
                  type: getFileType(file.name),
                  size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                  updatedAt: new Date().toLocaleDateString('vi-VN'),
                  ownerId: currentUser.id
                  // NOTE: In live upload, we might not have URL immediately unless we upload to storage first.
                  // For now, these simulated local uploads won't have a URL, but will have a File object in newFilesMap.
              };
              
              newDocs.push(newDoc);
              newFilesMap[newDocId] = file;
              newDocIds.push(newDocId);
          });

          // 1. Save new documents to Supabase (via App prop)
          newDocs.forEach(doc => onAddDocument(doc));

          // 2. Update local file map for previewing immediately
          setUploadedFiles(prev => ({ ...prev, ...newFilesMap }));
          
          // 3. Update local state and Sync Meeting to Supabase
          const updatedDocIds = [...attachedDocIds, ...newDocIds];
          setAttachedDocIds(updatedDocIds);
          
          const updatedMeeting: Meeting = {
            ...meeting,
            documentIds: updatedDocIds
          };
          onUpdateMeeting(updatedMeeting);

          setIsAddingDoc(false);
          
          if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);
  };


  const availableDocsToAdd = allDocuments.filter(d => !attachedDocIds.includes(d.id));

  // --- PREVIEW LOGIC ---

  const loadContent = async () => {
    if (!previewDoc) return;
    
    setIsLoadingPreview(true);
    setLoadError(null);
    setDocxContent(null);
    setPdfDoc(null);

    // --- DEMO MODE HANDLING ---
    // Inject fake content for demo documents without URLs (d1, d2, d4, d5)
    // d3 is PDF and has a real URL in data.ts, so it will fall through to standard loading.
    // MODIFIED: Check !previewDoc.url so if we update DB with real URL, it takes precedence.
    if (['d1', 'd2', 'd4', 'd5'].includes(previewDoc.id) && !previewDoc.url) {
        await new Promise(r => setTimeout(r, 800)); // Simulate loading delay
        
        let demoContent = '';
        if (previewDoc.type === 'doc' || previewDoc.type === 'docx') {
           demoContent = `
             <div class="prose prose-slate max-w-none">
                <h1 style="color: #047857; margin-bottom: 0.5em;">${previewDoc.name}</h1>
                <p class="text-sm text-gray-500 italic border-b pb-4">Tài liệu mẫu (Demo Content)</p>
                
                <h3>1. Tổng quan</h3>
                <p>Đây là nội dung giả lập cho tài liệu Word/Docx trong chế độ Demo. Hệ thống đã nhận diện file nhưng không tìm thấy nguồn dữ liệu thực tế.</p>
                
                <h3>2. Nội dung chi tiết</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <ul>
                  <li>Điểm thảo luận 1: Tối ưu hóa quy trình.</li>
                  <li>Điểm thảo luận 2: Nâng cao hiệu suất hệ thống.</li>
                  <li>Điểm thảo luận 3: Kế hoạch triển khai Q2/2024.</li>
                </ul>
                
                <h3>3. Kết luận</h3>
                <p>Thống nhất các phương án đã đề ra. Các bộ phận liên quan chịu trách nhiệm thực hiện đúng tiến độ.</p>
             </div>
           `;
           setDocxContent(demoContent);
           setIsLoadingPreview(false);
           return;
        } else if (previewDoc.type === 'xls' || previewDoc.type === 'xlsx') {
            // Mock Excel View
            setDocxContent(`
               <div class="overflow-x-auto">
                 <h2 class="text-xl font-bold text-emerald-700 mb-4">${previewDoc.name}</h2>
                 <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr class="bg-gray-100">
                        <th class="border p-2">STT</th>
                        <th class="border p-2">Hạng Mục</th>
                        <th class="border p-2">Đơn Vị</th>
                        <th class="border p-2">Số Lượng</th>
                        <th class="border p-2">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody>
                       <tr><td class="border p-2">1</td><td class="border p-2">Thiết bị A</td><td class="border p-2">Cái</td><td class="border p-2">10</td><td class="border p-2">Mới 100%</td></tr>
                       <tr><td class="border p-2">2</td><td class="border p-2">Vật tư B</td><td class="border p-2">Hộp</td><td class="border p-2">50</td><td class="border p-2">Kho 2</td></tr>
                       <tr><td class="border p-2">3</td><td class="border p-2">Chi phí C</td><td class="border p-2">VND</td><td class="border p-2">5.000.000</td><td class="border p-2">Dự kiến</td></tr>
                       <tr><td class="border p-2">...</td><td class="border p-2">...</td><td class="border p-2">...</td><td class="border p-2">...</td><td class="border p-2">...</td></tr>
                    </tbody>
                 </table>
                 <p class="text-xs text-gray-400 mt-4 italic">* Dữ liệu hiển thị dạng bảng tính demo.</p>
               </div>
            `);
            setIsLoadingPreview(false);
            return;
        } else if (previewDoc.type === 'ppt' || previewDoc.type === 'pptx') {
             // Mock PPT View
             setDocxContent(`
                <div class="flex flex-col items-center justify-center h-full bg-gray-100 p-8 rounded-xl border border-gray-200">
                   <div class="w-full aspect-video bg-white shadow-lg flex flex-col items-center justify-center p-10 text-center">
                      <h1 class="text-3xl font-bold text-orange-600 mb-4">${previewDoc.name}</h1>
                      <h2 class="text-xl text-gray-600">Slide Trình Chiếu Demo</h2>
                      <div class="mt-8 flex gap-2">
                         <div class="w-3 h-3 rounded-full bg-orange-500"></div>
                         <div class="w-3 h-3 rounded-full bg-gray-300"></div>
                         <div class="w-3 h-3 rounded-full bg-gray-300"></div>
                      </div>
                   </div>
                   <p class="mt-4 text-gray-500">Trình xem trước Slide đang được cập nhật...</p>
                </div>
             `);
             setIsLoadingPreview(false);
             return;
        }
    }
    // ----------------------

    try {
      let arrayBuffer: ArrayBuffer | null = null;
      
      // Strategy: 
      // 1. Try to get from local file (uploaded in this session)
      // 2. Try to fetch from URL (uploaded previously by admin to Supabase)
      
      const localFile = uploadedFiles[previewDoc.id];
      
      if (localFile) {
          arrayBuffer = await localFile.arrayBuffer();
      } else if (previewDoc.url) {
          // Fetch from Supabase URL
          try {
            const response = await fetch(previewDoc.url);
            if (!response.ok) throw new Error(`Server returned ${response.status} ${response.statusText}`);
            arrayBuffer = await response.arrayBuffer();
          } catch (fetchErr: any) {
             console.error("Network fetch failed:", fetchErr);
             throw new Error("Không thể tải file từ máy chủ. Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập file.");
          }
      } else {
        // No URL and No Local File
        // We will let this fall through to trigger the "Missing URL" state in the UI
      }

      if (!arrayBuffer) {
         setIsLoadingPreview(false);
         // If we have a URL but failed to get buffer, the catch block handled it.
         // If we DON'T have a URL, we stay with null arrayBuffer, which is handled in render.
         return;
      }

      if (previewDoc.type === 'doc') {
        // Process DOCX
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxContent(result.value);
      } else if (previewDoc.type === 'pdf') {
        // Process PDF
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setPdfTotalPages(pdf.numPages);
        setPdfPageNum(1);

        // Prepare Page 1 to ensure it's ready
        await pdf.getPage(1);
        
        // Set scale to 100% (1.0) by default as requested
        setTimeout(() => {
           setPdfScale(1.0); 
        }, 100);
      }
    } catch (error: any) {
      console.error("Error loading document:", error);
      setLoadError(error.message || "Lỗi không xác định khi đọc tài liệu.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Trigger load when previewDoc changes
  useEffect(() => {
    if (previewDoc) {
        setPdfPageNum(1);
        setPdfScale(1.0);
        setPageTransition('none');
        loadContent();
    }
  }, [previewDoc]);

  // Render PDF Page when state changes
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      
      try {
        const page = await pdfDoc.getPage(pdfPageNum);
        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
          
          // Reset transition state after render is done
          // Small timeout to ensure visual sync if using CSS transitions
          setTimeout(() => setPageTransition('none'), 50);
        }
      } catch (error) {
        console.error("Error rendering PDF page:", error);
      }
    };

    renderPage();
  }, [pdfDoc, pdfPageNum, pdfScale]);

  // PDF Controls with Animation
  const changePdfPage = (delta: number) => {
    if (!pdfDoc) return;
    const newPage = pdfPageNum + delta;
    
    if (newPage >= 1 && newPage <= pdfTotalPages) {
      // 1. Start Animation
      setPageTransition(delta > 0 ? 'flipping-next' : 'flipping-prev');
      
      // 2. Delay page change slightly to allow "exit" animation to be visible
      setTimeout(() => {
        setPdfPageNum(newPage);
      }, 300); // 300ms matches the CSS transition time
    }
  };

  const changePdfScale = (delta: number) => {
    setPdfScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  const fitToScreen = async () => {
      if (!pdfDoc || !containerRef.current) return;
      const page = await pdfDoc.getPage(pdfPageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const { clientWidth, clientHeight } = containerRef.current;
      const padding = 10;
      const scaleH = (clientHeight - padding) / unscaledViewport.height;
      const scaleW = (clientWidth - padding) / unscaledViewport.width;
      setPdfScale(Math.min(scaleH, scaleW));
  };

  // Helper for icons
  const getDocIcon = (type: string) => {
      if (type === 'pdf') return <FileText className="w-6 h-6 text-red-400" />;
      if (type === 'xls' || type === 'xlsx') return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
      if (type === 'ppt' || type === 'pptx') return <FileIcon className="w-6 h-6 text-orange-400" />;
      return <FileText className="w-6 h-6 text-blue-400" />;
  };

  const renderPreviewContent = () => {
    if (!previewDoc) return null;

    // Loading State
    if (isLoadingPreview) {
      return (
         <div className="flex flex-col items-center justify-center h-full text-slate-500">
           <Loader2 className="w-10 h-10 animate-spin mb-3 text-emerald-500" />
           <p>Đang tải tài liệu...</p>
        </div>
      );
    }

    // Error State
    if (loadError) {
       return (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-6">
             <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Không thể tải tài liệu</h3>
             <p className="text-slate-400 mb-6">{loadError}</p>
             <button 
                onClick={loadContent}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
             >
                <RefreshCw className="w-4 h-4" /> Thử lại
             </button>
          </div>
       );
    }

    // Determine if we have real content to show (Either local file OR remote URL OR injected mock content)
    const hasContent = uploadedFiles[previewDoc.id] || previewDoc.url || docxContent;
    const hasLoadedData = pdfDoc || docxContent;

    if (hasContent || hasLoadedData) {
      // PDF Handling with Custom Viewer
      if (previewDoc.type === 'pdf' && pdfDoc) {
        return (
          <div className="flex flex-col h-full w-full bg-slate-900 rounded-none overflow-hidden relative shadow-2xl">
             <style>{`
                .book-container {
                   perspective: 1500px;
                   /* overflow auto handled by tailwind class */
                }
                .pdf-canvas-wrapper {
                   transition: transform 0.4s ease-in-out, opacity 0.3s ease-in-out;
                   transform-style: preserve-3d;
                   transform-origin: center center;
                   box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.8);
                }
                .flipping-next .pdf-canvas-wrapper {
                   transform: rotateY(-90deg) scale(0.9);
                   opacity: 0.5;
                }
                .flipping-prev .pdf-canvas-wrapper {
                   transform: rotateY(90deg) scale(0.9);
                   opacity: 0.5;
                }
             `}</style>

             {/* PDF Toolbar */}
             <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-center gap-4 px-4 shadow-sm z-10 shrink-0 select-none">
                <div className="flex items-center gap-1">
                   <button 
                     onClick={() => changePdfPage(-1)}
                     disabled={pdfPageNum <= 1}
                     className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                   >
                     <ChevronLeft className="w-5 h-5 text-gray-700" />
                   </button>
                   <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                      Trang {pdfPageNum} / {pdfTotalPages}
                   </span>
                   <button 
                     onClick={() => changePdfPage(1)}
                     disabled={pdfPageNum >= pdfTotalPages}
                     className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
                   >
                     <ChevronRight className="w-5 h-5 text-gray-700" />
                   </button>
                </div>
                
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                
                <div className="flex items-center gap-1">
                   <button 
                     onClick={() => changePdfScale(-0.1)}
                     className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                     title="Thu nhỏ"
                   >
                     <Minus className="w-5 h-5 text-gray-700" />
                   </button>
                   <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
                      {Math.round(pdfScale * 100)}%
                   </span>
                   <button 
                     onClick={() => changePdfScale(0.1)}
                     className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                     title="Phóng to"
                   >
                     <Plus className="w-5 h-5 text-gray-700" />
                   </button>
                   <button 
                     onClick={fitToScreen}
                     className="p-1.5 rounded hover:bg-gray-100 transition-colors ml-2 group"
                     title="Vừa màn hình"
                   >
                     <Maximize className="w-4 h-4 text-gray-600 group-hover:text-emerald-600" />
                   </button>
                </div>
             </div>

             {/* Container for Viewer + Overlays */}
             <div className="flex-1 relative bg-slate-900 overflow-hidden">
                 
                 {/* Navigation Overlay Buttons - z-20 - Fixed relative to viewer area */}
                 {pdfPageNum > 1 && (
                  <button 
                    onClick={() => changePdfPage(-1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all hover:scale-110 backdrop-blur-sm shadow-xl group hidden md:flex"
                  >
                    <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                  </button>
                )}

                {pdfPageNum < pdfTotalPages && (
                  <button 
                    onClick={() => changePdfPage(1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/30 hover:bg-black/60 text-white rounded-full transition-all hover:scale-110 backdrop-blur-sm shadow-xl group hidden md:flex"
                  >
                    <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* Scrollable Canvas Container */}
                <div 
                    ref={containerRef} 
                    className={`w-full h-full overflow-auto flex justify-center book-container ${pageTransition}`}
                >
                    <div className="pdf-canvas-wrapper bg-white shadow-2xl">
                        <canvas 
                            ref={canvasRef} 
                            style={{ maxWidth: 'none', display: 'block' }} 
                        />
                    </div>
                </div>
             </div>
          </div>
        );
      }

      // DOCX / HTML Handling
      if (docxContent) {
        return (
          <div className="bg-white text-slate-900 w-full h-full shadow-none overflow-y-auto px-8 py-8">
             <div 
               className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-emerald-600 prose-lg mx-auto"
               dangerouslySetInnerHTML={{ __html: docxContent || '' }} 
             />
          </div>
        );
      }
    }

    // 2. Fallback if URL is missing (Only for non-demo files that genuinely fail)
    return (
        <div className="bg-white text-slate-900 w-full h-full shadow-none px-8 py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">{previewDoc.name.replace(/_/g, ' ').replace(/\.[^/.]+$/, "")}</h1>
            <p className="text-sm text-slate-500 mb-8 border-b pb-4">Được tạo bởi Admin System vào ngày {previewDoc.updatedAt}</p>
            
            <div className="space-y-4 text-justify leading-relaxed text-slate-700 text-lg">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
                  <p className="text-amber-700 font-medium">File chưa có liên kết thực (Missing URL)</p>
                  <p className="text-sm text-amber-600 mt-1">
                     Hệ thống nhận diện file này chưa có đường dẫn (URL) lưu trữ trên server. 
                     Có thể file được tải lên trước khi tính năng lưu trữ được kích hoạt, hoặc quá trình đồng bộ bị lỗi.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold mb-1">Hướng dẫn khắc phục:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Nếu bạn là Admin: Vui lòng xóa file này và tải lên lại trong mục "Tài liệu".</li>
                        <li>Nếu bạn là User: Vui lòng liên hệ Admin để cập nhật lại file này.</li>
                    </ul>
                </div>
            </div>
          </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white overflow-hidden relative">
      {/* Hidden File Input */}
      {isAdmin && (
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.doc,.docx"
          multiple
          onChange={handleFileChange} 
        />
      )}

      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm z-10 shrink-0 relative transition-transform duration-500">
        <div>
          <h2 className="font-bold text-lg">{meeting.title}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            {meeting.startTime} - {meeting.endTime} • ID: {meeting.id}
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-xs bg-slate-700 px-3 py-1 rounded-full font-medium">
             {meeting.participants} đang tham gia
           </span>
        </div>
      </div>

      {/* Main Content Area - Extends to bottom (removed padding/margins for bottom bar) */}
      <div className="flex-1 flex overflow-hidden relative pb-0">
        
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-4 auto-rows-fr overflow-y-auto">
           {/* Current User (You) */}
           <div className="bg-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center group border border-slate-700">
              {isCamOn ? (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                   <span className="text-slate-500 text-sm">Camera Stream Placeholder</span>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-3xl font-bold shadow-lg">
                  Tôi
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2">
                Bạn {isMicOn ? '' : '(Đã tắt tiếng)'}
              </div>
              <div className="absolute top-4 right-4">
                 {!isMicOn && <div className="bg-red-500/90 p-1.5 rounded-full"><MicOff className="w-4 h-4" /></div>}
              </div>
           </div>

           {/* Other Participants */}
           {otherParticipants.map((user) => (
             <div key={user.id} className="bg-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
                <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-bold text-slate-300">
                  {user.name.charAt(0)}
                </div>
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-medium">
                  {user.name}
                </div>
                {/* Simulate talking state */}
                {user.id === 'u2' && (
                  <div className="absolute inset-0 border-2 border-emerald-500 rounded-xl pointer-events-none opacity-50"></div>
                )}
             </div>
           ))}
        </div>

        {/* Right Sidebar (Chat or Docs) */}
        {activeSidebar && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col animate-in slide-in-from-right duration-200 shadow-2xl z-20">
            
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <h3 className="font-bold">
                {activeSidebar === 'chat' ? 'Tin nhắn' : 'Tài liệu cuộc họp'}
              </h3>
              <button onClick={() => setActiveSidebar(null)} className="hover:bg-slate-700 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>

            {/* Chat Content */}
            {activeSidebar === 'chat' && (
              <>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                   <div className="text-xs text-center text-slate-500 my-4">Cuộc trò chuyện đã bắt đầu</div>
                   <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold shrink-0">A</div>
                      <div>
                        <div className="flex items-baseline gap-2">
                           <span className="font-bold text-sm">Nguyễn Văn A</span>
                           <span className="text-xs text-slate-400">09:32</span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">Mọi người đã xem tài liệu đính kèm chưa ạ?</p>
                      </div>
                   </div>
                </div>
                <div className="p-4 border-t border-slate-700 mt-auto">
                   <div className="bg-slate-700 rounded-lg flex items-center p-2">
                     <input type="text" placeholder="Gửi tin nhắn..." className="bg-transparent border-none outline-none text-sm text-white flex-1 px-2" />
                     <button className="text-emerald-500 font-bold text-sm px-2">Gửi</button>
                   </div>
                </div>
              </>
            )}

            {/* Docs Content */}
            {activeSidebar === 'docs' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {/* Add Doc Button (Admin only simulation) */}
                    {isAdmin && (
                      <button 
                        onClick={() => setIsAddingDoc(!isAddingDoc)}
                        className={`w-full py-2 border border-dashed ${isAddingDoc ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/50'} rounded-lg flex items-center justify-center gap-2 text-sm transition-all`}
                      >
                        {isAddingDoc ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAddingDoc ? 'Đóng' : 'Bổ sung tài liệu'}
                      </button>
                    )}

                    {/* Add Doc Dropdown/Panel */}
                    {isAddingDoc && (
                      <div className="bg-slate-700 rounded-lg p-2 space-y-2 animate-in slide-in-from-top-2 duration-200 border border-slate-600">
                        {/* Upload Option */}
                        <button 
                           onClick={handleUploadClick}
                           className="w-full text-left px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-2 mb-2 font-medium transition-colors"
                        >
                           <UploadCloud className="w-4 h-4" />
                           Tải lên từ máy tính (Tối đa 5 file)
                        </button>
                        
                        <div className="border-t border-slate-600 my-2"></div>

                        <div className="px-2 py-1 text-xs text-slate-400 font-medium uppercase">Chọn từ kho</div>
                        {availableDocsToAdd.length > 0 ? (
                           <div className="max-h-40 overflow-y-auto space-y-1">
                             {availableDocsToAdd.map(doc => (
                               <button 
                                 key={doc.id}
                                 onClick={() => handleAddExistingDocument(doc.id)}
                                 className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-600 rounded flex items-center gap-2 truncate group"
                               >
                                 <Plus className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                                 <FileText className="w-3 h-3 text-slate-400" />
                                 <span className="truncate text-slate-200">{doc.name}</span>
                               </button>
                             ))}
                           </div>
                        ) : (
                          <div className="p-2 text-xs text-slate-500 text-center">Không còn tài liệu có sẵn</div>
                        )}
                      </div>
                    )}

                    {/* List Attached Docs */}
                    <div className="space-y-2 mt-4">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã đính kèm ({getAttachedDocsResolved().length})</h4>
                       {getAttachedDocsResolved().length === 0 ? (
                         <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/50 rounded-lg border border-slate-800 border-dashed">
                            Chưa có tài liệu đính kèm
                         </div>
                       ) : (
                         getAttachedDocsResolved().map(doc => (
                           <div key={doc.id} className="bg-slate-700/50 border border-slate-700 p-3 rounded-lg group hover:border-slate-600 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3 overflow-hidden">
                                   <div className="p-2 bg-slate-800 rounded">
                                      <FileText className={`w-5 h-5 ${['pdf', 'ppt'].includes(doc.type) ? 'text-red-400' : doc.type === 'xls' ? 'text-emerald-400' : 'text-blue-400'}`} />
                                   </div>
                                   <div className="overflow-hidden">
                                      <h4 className="text-sm font-medium truncate text-slate-200" title={doc.name}>{doc.name}</h4>
                                      <p className="text-xs text-slate-400">{doc.size} • {doc.type.toUpperCase()}</p>
                                   </div>
                                </div>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <button 
                                  onClick={() => setPreviewDoc(doc)}
                                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors text-slate-300 hover:text-white"
                                >
                                  <Eye className="w-3 h-3" /> Xem
                                </button>
                                {doc.url ? (
                                    <a 
                                      href={doc.url}
                                      download
                                      target="_blank"
                                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors text-slate-300 hover:text-white"
                                    >
                                      <Download className="w-3 h-3" /> Tải
                                    </a>
                                ) : (
                                    <button className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors text-slate-300 hover:text-white">
                                      <Download className="w-3 h-3" /> Tải
                                    </button>
                                )}
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal Overlay */}
        {previewDoc && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            {/* Preview Toolbar */}
            <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
               <div className="flex items-center gap-3 text-white overflow-hidden">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    {getDocIcon(previewDoc.type)}
                  </div>
                  <span className="font-bold truncate text-slate-100">{previewDoc.name}</span>
               </div>
               <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                     <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Thêm ghi chú"><Plus className="w-4 h-4" /></button>
                     <span className="px-2 text-xs text-slate-400 font-mono">100%</span>
                     <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  <button 
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
               </div>
            </div>

            {/* Document Viewer + Right Sidebar Wrapper */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Document Viewer Container */}
                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-900/50 p-0 flex-col">
                   {renderPreviewContent()}
                </div>

                {/* Right Sidebar - Attached Files List */}
                <div className="w-28 md:w-36 bg-slate-900 border-l border-slate-800 p-2 z-30 shrink-0 overflow-y-auto">
                   <div className="flex flex-col gap-3 pb-4">
                      {getAttachedDocsResolved().map((doc) => {
                        const isActive = previewDoc.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => setPreviewDoc(doc)}
                            className={`
                              group relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all w-full
                              ${isActive 
                                ? 'bg-emerald-900/20 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                                : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
                            `}
                          >
                             <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${isActive ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>
                                {getDocIcon(doc.type)}
                             </div>
                             <span className={`text-[10px] font-medium truncate w-full text-center leading-tight ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                               {doc.name}
                             </span>
                             {isActive && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 shadow-sm animate-pulse" />}
                          </button>
                        )
                      })}
                   </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls (Main Meeting) - Fixed & Auto-hide */}
      <div 
         className={`
           absolute bottom-0 left-0 right-0 h-20 
           bg-slate-800/95 backdrop-blur-md border-t border-slate-700 
           flex items-center justify-center gap-4 px-6 z-40 shrink-0 
           transition-transform duration-500 ease-in-out
           ${showControls ? 'translate-y-0' : 'translate-y-full'}
         `}
      >
         <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              title={isMicOn ? "Tắt Micro" : "Bật Micro"}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setIsCamOn(!isCamOn)}
              className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              title={isCamOn ? "Tắt Camera" : "Bật Camera"}
            >
              {isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
         </div>

         <div className="w-px h-10 bg-slate-600 mx-2"></div>

         <div className="flex items-center gap-3">
            <button 
              onClick={() => toggleSidebar('chat')}
              className={`p-3 rounded-xl hover:bg-slate-600 text-slate-200 transition-colors ${activeSidebar === 'chat' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50'}`} 
              title="Trò chuyện"
            >
               <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={() => toggleSidebar('docs')}
              className={`p-3 rounded-xl hover:bg-slate-600 text-slate-200 transition-colors ${activeSidebar === 'docs' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50'}`} 
              title="Tài liệu cuộc họp"
            >
               <FileText className="w-5 h-5" />
            </button>
         </div>

         <div className="w-px h-10 bg-slate-600 mx-2"></div>

         <button 
           onClick={onLeave}
           className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
         >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden md:inline">Rời cuộc họp</span>
         </button>
      </div>
    </div>
  );
};