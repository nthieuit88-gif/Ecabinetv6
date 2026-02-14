import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Share, MoreHorizontal, LayoutGrid, X, FileText, Plus, Eye, Download, ChevronRight, Search, UploadCloud, Loader2, ChevronLeft, Minus, ZoomIn, ZoomOut, Maximize, FileSpreadsheet, FileIcon, RefreshCw, AlertTriangle, ExternalLink, Info, Database, Globe } from 'lucide-react';
import { Meeting, Document, User } from '../types';
import { USERS, getUserById } from '../data';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { getFileFromLocal, saveFileToLocal } from '../utils/indexedDB';

// Configure PDF.js worker
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
  const [activeSidebar, setActiveSidebar] = useState<'chat' | 'docs' | null>('docs');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);
  
  // Document logic
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>(meeting.documentIds || []);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  
  // Viewers State
  const [docxContent, setDocxContent] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageNum, setPdfPageNum] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.2); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Viewer Type State
  const [viewerType, setViewerType] = useState<'local-pdf' | 'local-docx' | 'google' | 'microsoft' | 'none'>('none');
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);

  // Demo file IDs that are allowed to show mock content
  const DEMO_FILE_IDS = ['d1', 'd2', 'd4', 'd5'];

  const otherParticipants = USERS.filter(u => u.id !== currentUser.id).slice(0, 4); 
  const isAdmin = currentUser.role === 'admin';

  // --- Auto-hide Controls Logic ---
  const resetIdleTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 10000);
  };

  useEffect(() => {
    resetIdleTimer();
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

  const toggleSidebar = (type: 'chat' | 'docs') => {
    setActiveSidebar(activeSidebar === type ? null : type);
  };

  const handleAddExistingDocument = (docId: string) => {
    if (!attachedDocIds.includes(docId)) {
        const updatedIds = [...attachedDocIds, docId];
        setAttachedDocIds(updatedIds);
        const updatedMeeting: Meeting = { ...meeting, documentIds: updatedIds };
        onUpdateMeeting(updatedMeeting);
    }
    setIsAddingDoc(false);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const getAttachedDocsResolved = () => {
      return attachedDocIds.map(id => allDocuments.find(d => d.id === id)).filter(Boolean) as Document[];
  };

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
              };
              newDocs.push(newDoc);
              newFilesMap[newDocId] = file;
              newDocIds.push(newDocId);
              
              // Cache immediately to IndexedDB
              saveFileToLocal(newDocId, file);
          });

          newDocs.forEach(doc => onAddDocument(doc));
          setUploadedFiles(prev => ({ ...prev, ...newFilesMap }));
          const updatedDocIds = [...attachedDocIds, ...newDocIds];
          setAttachedDocIds(updatedDocIds);
          
          const updatedMeeting: Meeting = { ...meeting, documentIds: updatedDocIds };
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
    setViewerType('none');
    setIsLocalLoaded(false);

    // 1. Check Local Cache (IndexedDB)
    // Only attempt local render if we are 100% sure we have the binary data (Blob).
    let fileBlob: Blob | null = uploadedFiles[previewDoc.id] || null;
    
    if (!fileBlob) {
        try {
            fileBlob = await getFileFromLocal(previewDoc.id);
        } catch (e) { console.error("DB Error", e); }
    }

    // 2. Render Local Content (If Blob exists in Cache)
    if (fileBlob) {
        setIsLocalLoaded(true);
        const arrayBuffer = await fileBlob.arrayBuffer();

        if (previewDoc.type === 'doc') {
             try {
                const result = await mammoth.convertToHtml({ arrayBuffer });
                if (!result.value) throw new Error("Empty result from conversion");
                setDocxContent(result.value);
                setViewerType('local-docx');
                setIsLoadingPreview(false);
                return;
             } catch (e) { console.warn("Mammoth failed", e); }
        } else if (previewDoc.type === 'pdf') {
             try {
                const loadingTask = pdfjs.getDocument({ 
                  data: arrayBuffer,
                  cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                  cMapPacked: true,
                });
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setPdfTotalPages(pdf.numPages);
                setPdfPageNum(1);
                await pdf.getPage(1);
                setViewerType('local-pdf');
                setIsLoadingPreview(false);
                return;
             } catch (e) { console.warn("PDF load failed", e); }
        }
        // If XLS/PPT is found locally, we fall through to remote viewer 
        // because we don't have a good local XLS/PPT renderer in React without heavy libs.
    }

    // 3. Remote URL Strategy (The Fix for Cross-IP/CORS)
    // Instead of trying to 'fetch' and getting blocked by CORS,
    // we directly assign the URL to Google/Microsoft Viewers (iframe).
    if (previewDoc.url && !previewDoc.url.startsWith('blob:')) {
        
        console.log(`[Preview] Using Remote Viewer for: ${previewDoc.name}`);
        
        // Strategy A: Microsoft Office Viewer (Best for Office Files)
        if (['doc', 'xls', 'ppt'].includes(previewDoc.type)) {
            setViewerType('microsoft');
            setIsLoadingPreview(false);
            return;
        }

        // Strategy B: Google Viewer (Best for PDF and Fallback)
        setViewerType('google');
        setIsLoadingPreview(false);
        
        // Optional: Attempt to fetch in background to cache for NEXT time (Silent, non-blocking)
        fetch(previewDoc.url)
            .then(res => {
                if(res.ok) return res.blob();
                throw new Error("Fetch failed");
            })
            .then(blob => saveFileToLocal(previewDoc.id, blob))
            .catch(() => console.log("Background cache attempt skipped (likely CORS). Viewer will handle it."));

        return;
    }

    // 4. Fallback: Demo Content (Only for system demo files with no URL)
    if (DEMO_FILE_IDS.includes(previewDoc.id)) {
        await new Promise(r => setTimeout(r, 600)); 
        generateMockContent(previewDoc);
        setViewerType('local-docx');
        setIsLoadingPreview(false);
        return;
    }

    // 5. Final Error
    setLoadError("Không tìm thấy nội dung file. Vui lòng tải về để xem.");
    setIsLoadingPreview(false);
  };

  const generateMockContent = (doc: Document) => {
    // Only used for System Demo Files
    let mockHtml = `
       <div class="prose prose-slate max-w-none bg-white p-12 min-h-[800px] shadow-sm mx-auto">
          <h1 class="text-3xl font-bold text-slate-800 mb-2">${doc.name}</h1>
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p class="font-bold text-blue-800">File Demo Hệ Thống</p>
            <p class="text-sm text-blue-700">Đây là dữ liệu mẫu để minh họa giao diện.</p>
          </div>
          <p>Nội dung mô phỏng...</p>
       </div>`;
    setDocxContent(mockHtml);
  };

  useEffect(() => {
    if (previewDoc) {
        setPdfPageNum(1);
        setPdfScale(1.2); 
        loadContent();
    }
  }, [previewDoc]);

  // Render PDF Canvas (Only for Local PDF)
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      try {
        const page = await pdfDoc.getPage(pdfPageNum);
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: pdfScale * pixelRatio });
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = `${viewport.width / pixelRatio}px`;
          canvas.style.height = `${viewport.height / pixelRatio}px`;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (error) { console.error("PDF Render error", error); }
    };
    if (viewerType === 'local-pdf') {
        renderPage();
    }
  }, [pdfDoc, pdfPageNum, pdfScale, viewerType]);

  const changePdfPage = (delta: number) => {
    if (!pdfDoc) return;
    const newPage = pdfPageNum + delta;
    if (newPage >= 1 && newPage <= pdfTotalPages) setPdfPageNum(newPage);
  };
  const changePdfScale = (delta: number) => {
    setPdfScale(prev => Math.max(0.5, Math.min(3.0, prev + delta)));
  };
  const fitToScreen = async () => {
      if (!pdfDoc || !containerRef.current) return;
      const page = await pdfDoc.getPage(pdfPageNum);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleH = (clientHeight - 20) / unscaledViewport.height;
      const scaleW = (clientWidth - 20) / unscaledViewport.width;
      setPdfScale(Math.min(scaleH, scaleW));
  };

  const getDocIcon = (type: string) => {
      if (type === 'pdf') return <FileText className="w-6 h-6 text-red-400" />;
      if (type === 'xls' || type === 'xlsx') return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
      if (type === 'ppt' || type === 'pptx') return <FileIcon className="w-6 h-6 text-orange-400" />;
      return <FileText className="w-6 h-6 text-blue-400" />;
  };

  const renderPreviewContent = () => {
    if (!previewDoc) return null;

    if (isLoadingPreview) {
      return (
         <div className="flex flex-col items-center justify-center h-full text-slate-500">
           <Loader2 className="w-10 h-10 animate-spin mb-3 text-emerald-500" />
           <p>Đang tải tài liệu...</p>
        </div>
      );
    }

    if (loadError) {
       return (
          <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto text-center px-6">
             <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Không thể hiển thị</h3>
             <p className="text-slate-400 mb-6 leading-relaxed max-w-md">{loadError}</p>
             {previewDoc.url && (
                <div className="flex gap-3">
                    <a 
                    href={previewDoc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2 font-medium transition-colors"
                    >
                    <Globe className="w-4 h-4" /> Mở trong trình duyệt
                    </a>
                    <a 
                    href={previewDoc.url} 
                    download
                    target="_blank" 
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-2 font-medium transition-colors"
                    >
                    <Download className="w-4 h-4" /> Tải về máy
                    </a>
                </div>
             )}
          </div>
       );
    }

    // --- RENDER BASED ON VIEWER TYPE ---

    // 1. Microsoft Office Viewer (Doc/Xls/Ppt)
    // Note: We use encodeURIComponent to handle filenames with spaces or special chars
    if (viewerType === 'microsoft' && previewDoc.url) {
        return (
            <div className="w-full h-full bg-white relative flex flex-col">
                <iframe 
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDoc.url)}`}
                    className="w-full h-full border-none flex-1"
                    title="Office Document Preview"
                    onError={() => setLoadError("Không thể kết nối tới Office Viewer.")}
                ></iframe>
                <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded text-xs text-slate-500 shadow border border-slate-200 pointer-events-none z-10 flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg" className="w-4 h-4" alt="MS Office" />
                    <span>Office Viewer (Remote)</span>
                </div>
            </div>
        );
    }

    // 2. Google Viewer (PDF / Generic)
    if (viewerType === 'google' && previewDoc.url) {
        return (
            <div className="w-full h-full bg-white relative flex flex-col">
                <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.url)}&embedded=true`}
                    className="w-full h-full border-none flex-1"
                    title="Google Document Preview"
                    onError={() => setLoadError("Không thể kết nối tới Google Viewer.")}
                ></iframe>
                <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded text-xs text-slate-500 shadow border border-slate-200 pointer-events-none z-10 flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" alt="Google" />
                    <span>Google Viewer (Remote)</span>
                </div>
            </div>
        );
    }

    // 3. Local PDF Viewer (Only if file is in IndexedDB)
    if (viewerType === 'local-pdf' && pdfDoc) {
        return (
          <div className="flex flex-col h-full w-full bg-slate-900 rounded-none overflow-hidden relative shadow-2xl">
             <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-center gap-4 px-4 shadow-sm z-10 shrink-0 select-none">
                <div className="flex items-center gap-1">
                   <button onClick={() => changePdfPage(-1)} disabled={pdfPageNum <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-5 h-5 text-gray-700" /></button>
                   <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">Trang {pdfPageNum} / {pdfTotalPages}</span>
                   <button onClick={() => changePdfPage(1)} disabled={pdfPageNum >= pdfTotalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-5 h-5 text-gray-700" /></button>
                </div>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <div className="flex items-center gap-1">
                   <button onClick={() => changePdfScale(-0.1)} className="p-1.5 rounded hover:bg-gray-100"><Minus className="w-5 h-5 text-gray-700" /></button>
                   <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">{Math.round(pdfScale * 100)}%</span>
                   <button onClick={() => changePdfScale(0.1)} className="p-1.5 rounded hover:bg-gray-100"><Plus className="w-5 h-5 text-gray-700" /></button>
                   <button onClick={fitToScreen} className="p-1.5 rounded hover:bg-gray-100 ml-2"><Maximize className="w-4 h-4 text-gray-600" /></button>
                </div>
             </div>
             <div className="flex-1 relative bg-slate-900 overflow-hidden">
                <div ref={containerRef} className="w-full h-full overflow-auto flex justify-center p-8">
                    <div className="bg-white shadow-2xl">
                        <canvas ref={canvasRef} style={{ display: 'block' }} />
                    </div>
                </div>
             </div>
          </div>
        );
    }

    // 4. Local Docx Preview (Mammoth - Only if file is in IndexedDB)
    if (viewerType === 'local-docx' && docxContent) {
        return (
          <div className="bg-white text-slate-900 w-full h-full shadow-none overflow-y-auto px-8 py-8">
             {previewDoc.type === 'doc' && !previewDoc.url && (
                 <div className="max-w-4xl mx-auto mb-6 bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center gap-3 text-orange-800 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Đang xem bản xem trước cục bộ (giản lược).</span>
                 </div>
             )}
             
             <div 
               className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-emerald-600 prose-lg mx-auto"
               dangerouslySetInnerHTML={{ __html: docxContent || '' }} 
             />
          </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100">
           <div className="text-center p-8">
              <p className="text-slate-500 mb-4">Không thể hiển thị bản xem trước cho tài liệu này.</p>
              {previewDoc.url && (
                  <a href={previewDoc.url} target="_blank" className="px-4 py-2 bg-emerald-600 text-white rounded-lg inline-flex items-center gap-2">
                     <Download className="w-4 h-4" /> Tải về máy
                  </a>
              )}
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
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative pb-0">
        
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-4 auto-rows-fr overflow-y-auto">
           {/* Current User */}
           <div className="bg-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center group border border-slate-700">
              {isCamOn ? (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                   <span className="text-slate-500 text-sm">Camera Stream Placeholder</span>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center text-3xl font-bold shadow-lg">Tôi</div>
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
                <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-bold text-slate-300">{user.name.charAt(0)}</div>
                <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-medium">{user.name}</div>
                {user.id === 'u2' && (
                  <div className="absolute inset-0 border-2 border-emerald-500 rounded-xl pointer-events-none opacity-50"></div>
                )}
             </div>
           ))}
        </div>

        {/* Right Sidebar */}
        {activeSidebar && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col animate-in slide-in-from-right duration-200 shadow-2xl z-20">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <h3 className="font-bold">{activeSidebar === 'chat' ? 'Tin nhắn' : 'Tài liệu cuộc họp'}</h3>
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
                        <div className="flex items-baseline gap-2"><span className="font-bold text-sm">Nguyễn Văn A</span><span className="text-xs text-slate-400">09:32</span></div>
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
                    {isAdmin && (
                      <button 
                        onClick={() => setIsAddingDoc(!isAddingDoc)}
                        className={`w-full py-2 border border-dashed ${isAddingDoc ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/50'} rounded-lg flex items-center justify-center gap-2 text-sm transition-all`}
                      >
                        {isAddingDoc ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAddingDoc ? 'Đóng' : 'Bổ sung tài liệu'}
                      </button>
                    )}

                    {isAddingDoc && (
                      <div className="bg-slate-700 rounded-lg p-2 space-y-2 animate-in slide-in-from-top-2 duration-200 border border-slate-600">
                        <button onClick={handleUploadClick} className="w-full text-left px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-2 mb-2 font-medium transition-colors">
                           <UploadCloud className="w-4 h-4" /> Tải lên từ máy tính
                        </button>
                        <div className="border-t border-slate-600 my-2"></div>
                        <div className="px-2 py-1 text-xs text-slate-400 font-medium uppercase">Chọn từ kho</div>
                        {availableDocsToAdd.length > 0 ? (
                           <div className="max-h-40 overflow-y-auto space-y-1">
                             {availableDocsToAdd.map(doc => (
                               <button key={doc.id} onClick={() => handleAddExistingDocument(doc.id)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-600 rounded flex items-center gap-2 truncate group">
                                 <Plus className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                                 <FileText className="w-3 h-3 text-slate-400" />
                                 <span className="truncate text-slate-200">{doc.name}</span>
                               </button>
                             ))}
                           </div>
                        ) : (<div className="p-2 text-xs text-slate-500 text-center">Không còn tài liệu có sẵn</div>)}
                      </div>
                    )}

                    <div className="space-y-2 mt-4">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã đính kèm ({getAttachedDocsResolved().length})</h4>
                       {getAttachedDocsResolved().map(doc => (
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
                                <button onClick={() => setPreviewDoc(doc)} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors text-slate-300 hover:text-white">
                                  <Eye className="w-3 h-3" /> Xem
                                </button>
                                {doc.url && (
                                    <a href={doc.url} download target="_blank" className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors text-slate-300 hover:text-white">
                                      <Download className="w-3 h-3" /> Tải
                                    </a>
                                )}
                              </div>
                           </div>
                         ))}
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Preview Modal Overlay */}
        {previewDoc && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
               <div className="flex items-center gap-3 text-white overflow-hidden">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">{getDocIcon(previewDoc.type)}</div>
                  <span className="font-bold truncate text-slate-100">{previewDoc.name}</span>
                  {(viewerType === 'google' || viewerType === 'microsoft') && !isLocalLoaded && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">HQ Remote</span>}
                  {isLocalLoaded && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1"><Database className="w-3 h-3"/> Local DB</span>}
               </div>
               <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                     <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Thêm ghi chú"><Plus className="w-4 h-4" /></button>
                     <span className="px-2 text-xs text-slate-400 font-mono">{previewDoc.type === 'pdf' ? Math.round(pdfScale * 100) + '%' : '100%'}</span>
                     <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  {previewDoc.url && (
                    <a href={previewDoc.url} target="_blank" className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white" title="Mở trong tab mới"><ExternalLink className="w-5 h-5"/></a>
                  )}
                  <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-full transition-colors"><X className="w-6 h-6" /></button>
               </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-900/50 p-0 flex-col">
                   {renderPreviewContent()}
                </div>

                {/* Right Sidebar List */}
                <div className="w-28 md:w-36 bg-slate-900 border-l border-slate-800 p-2 z-30 shrink-0 overflow-y-auto hidden md:block">
                   <div className="flex flex-col gap-3 pb-4">
                      {getAttachedDocsResolved().map((doc) => {
                        const isActive = previewDoc.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => setPreviewDoc(doc)}
                            className={`group relative flex flex-col items-center gap-2 p-2 rounded-xl border transition-all w-full ${isActive ? 'bg-emerald-900/20 border-emerald-500/50 ring-1 ring-emerald-500/30' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}`}
                          >
                             <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${isActive ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>{getDocIcon(doc.type)}</div>
                             <span className={`text-[10px] font-medium truncate w-full text-center leading-tight ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{doc.name}</span>
                          </button>
                        )
                      })}
                   </div>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-20 bg-slate-800/95 backdrop-blur-md border-t border-slate-700 flex items-center justify-center gap-4 px-6 z-40 shrink-0 transition-transform duration-500 ease-in-out ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
         <div className="flex items-center gap-3">
            <button onClick={() => setIsMicOn(!isMicOn)} className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>{isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}</button>
            <button onClick={() => setIsCamOn(!isCamOn)} className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>{isCamOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}</button>
         </div>
         <div className="w-px h-10 bg-slate-600 mx-2"></div>
         <div className="flex items-center gap-3">
            <button onClick={() => toggleSidebar('chat')} className={`p-3 rounded-xl hover:bg-slate-600 text-slate-200 transition-colors ${activeSidebar === 'chat' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50'}`}><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => toggleSidebar('docs')} className={`p-3 rounded-xl hover:bg-slate-600 text-slate-200 transition-colors ${activeSidebar === 'docs' ? 'bg-emerald-600 text-white' : 'bg-slate-700/50'}`}><FileText className="w-5 h-5" /></button>
         </div>
         <div className="w-px h-10 bg-slate-600 mx-2"></div>
         <button onClick={onLeave} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-500/20"><PhoneOff className="w-5 h-5" /><span className="hidden md:inline">Rời cuộc họp</span></button>
      </div>
    </div>
  );
};