import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Users, Share, MoreHorizontal, LayoutGrid, X, FileText, Plus, Eye, Download, ChevronRight, Search, UploadCloud, Loader2, ChevronLeft, Minus, ZoomIn, ZoomOut, Maximize, FileSpreadsheet, FileIcon, RefreshCw, AlertTriangle, ExternalLink, Info, Database, Globe, Vote } from 'lucide-react';
import { Meeting, Document, User } from '../types';
import { USERS, getUserById } from '../data';
import mammoth from 'mammoth';
import * as docxPreview from 'docx-preview';
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
  
  // Ref specific for DOCX Preview
  const docxContainerRef = useRef<HTMLDivElement>(null);
  
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Viewer Type State
  const [viewerType, setViewerType] = useState<'local-pdf' | 'local-docx' | 'local-doc-legacy' | 'google' | 'microsoft' | 'native-frame' | 'none'>('none');
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

  // --- Keyboard Navigation for PDF ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewDoc || viewerType !== 'local-pdf') return;
      
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        changePdfPage(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        changePdfPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, viewerType, pdfPageNum, pdfTotalPages]);

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
    let fileBlob: Blob | null = uploadedFiles[previewDoc.id] || null;
    if (!fileBlob) {
        try { fileBlob = await getFileFromLocal(previewDoc.id); } catch (e) {}
    }

    // 2. Local Render (Priority 1)
    if (fileBlob) {
        setIsLocalLoaded(true);
        const arrayBuffer = await fileBlob.arrayBuffer();
        const ext = previewDoc.name.split('.').pop()?.toLowerCase();

        if (previewDoc.type === 'doc') {
             // Handle DOCX with docx-preview (High Fidelity)
             if (ext === 'docx') {
                 setViewerType('local-docx');
                 // Effect will handle rendering once state updates and ref is available
                 setIsLoadingPreview(false);
                 return;
             } 
             // Handle Legacy DOC with Mammoth (Low Fidelity fallback)
             else {
                 try {
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    if (result.value) {
                        setDocxContent(result.value);
                        setViewerType('local-doc-legacy');
                        setIsLoadingPreview(false);
                        return;
                    }
                 } catch (e) { console.warn("Mammoth failed", e); }
             }
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
    }

    // 3. Remote URL Strategy
    if (previewDoc.url) {
        if (previewDoc.url.startsWith('blob:') && !fileBlob) {
            setLoadError("File chưa đồng bộ. Người upload cần tải lại file này.");
            setIsLoadingPreview(false);
            return;
        }

        if (!previewDoc.url.startsWith('blob:')) {
             if (['doc', 'xls', 'ppt'].includes(previewDoc.type)) {
                 setViewerType('microsoft');
                 setIsLoadingPreview(false);
                 return;
             }
             if (previewDoc.type === 'pdf') {
                 setViewerType('native-frame');
                 setIsLoadingPreview(false);
                 return;
             }
             setViewerType('google');
             setIsLoadingPreview(false);
             return;
        }
    }

    // 4. Fallback: Demo Content
    if (DEMO_FILE_IDS.includes(previewDoc.id)) {
        await new Promise(r => setTimeout(r, 600)); 
        generateMockContent(previewDoc);
        setViewerType('local-doc-legacy');
        setIsLoadingPreview(false);
        return;
    }

    // 5. Final Error
    setLoadError("Không thể tải nội dung file.");
    setIsLoadingPreview(false);
  };

  const generateMockContent = (doc: Document) => {
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

  // --- DOCX RENDER EFFECT ---
  useEffect(() => {
    if (viewerType === 'local-docx' && isLocalLoaded && previewDoc) {
        let active = true;
        const render = async () => {
            if (!docxContainerRef.current) return;
            
            // Get blob again
            let fileBlob = uploadedFiles[previewDoc.id];
            if (!fileBlob) {
                try { fileBlob = await getFileFromLocal(previewDoc.id); } catch(e) {}
            }
            if (!fileBlob || !active) return;
            
            // Clear previous
            docxContainerRef.current.innerHTML = "";
            const arrayBuffer = await fileBlob.arrayBuffer();
            if (!active) return;

            try {
                 // Robust import access for esm.sh which might bundle as default or named
                 const renderAsyncFn = (docxPreview as any).renderAsync || (docxPreview as any).default?.renderAsync;
                 
                 if (typeof renderAsyncFn === 'function') {
                    await renderAsyncFn(arrayBuffer, docxContainerRef.current, undefined, {
                        className: "docx-wrapper",
                        inWrapper: true, 
                        ignoreWidth: false,
                    });
                 } else {
                    console.error("renderAsync not found in docx-preview", docxPreview);
                    setLoadError("Lỗi thư viện hiển thị DOCX.");
                 }
            } catch (err) {
                console.error("DOCX Render error:", err);
                setLoadError("Lỗi hiển thị file DOCX. File có thể bị hỏng.");
            }
        };
        
        // Small delay to ensure DOM is ready
        const timer = setTimeout(render, 50);
        return () => { active = false; clearTimeout(timer); };
    }
  }, [viewerType, isLocalLoaded, previewDoc, uploadedFiles]);

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
                    <Globe className="w-4 h-4" /> Mở tab mới
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

    // --- REMOTE VIEWERS ---

    // 1. Native Iframe (Best for PDF)
    if (viewerType === 'native-frame' && previewDoc.url) {
        return (
             <div className="w-full h-full bg-slate-100 relative flex flex-col">
                <object 
                    data={previewDoc.url} 
                    type="application/pdf" 
                    className="w-full h-full"
                >
                    {/* Fallback inside Object tag if not supported */}
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <p>Trình duyệt không hỗ trợ xem PDF trực tiếp.</p>
                        <a href={previewDoc.url} target="_blank" className="text-blue-500 underline mt-2">Mở trong tab mới</a>
                    </div>
                </object>
                <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded text-xs text-slate-500 shadow border border-slate-200 pointer-events-none z-10 flex items-center gap-2">
                    <Globe className="w-3 h-3"/>
                    <span>Native Viewer</span>
                </div>
            </div>
        )
    }

    // 2. Microsoft Office Viewer
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

    // 3. Google Viewer (Fallback)
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

    // 4. Local PDF Viewer
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
                    <div className="bg-white shadow-2xl transition-transform duration-200">
                        <canvas ref={canvasRef} style={{ display: 'block' }} />
                    </div>
                </div>

                {/* --- NAVIGATION OVERLAY BUTTONS (PREV / NEXT) --- */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                   {pdfPageNum > 1 && (
                     <button
                       onClick={() => changePdfPage(-1)}
                       className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-emerald-600/90 text-white/70 hover:text-white backdrop-blur-sm transition-all shadow-lg hover:scale-110 group"
                       title="Trang trước (Phím mũi tên trái)"
                     >
                       <ChevronLeft className="w-8 h-8 group-hover:drop-shadow-md" />
                     </button>
                   )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                   {pdfPageNum < pdfTotalPages && (
                     <button
                       onClick={() => changePdfPage(1)}
                       className="pointer-events-auto p-3 rounded-full bg-black/40 hover:bg-emerald-600/90 text-white/70 hover:text-white backdrop-blur-sm transition-all shadow-lg hover:scale-110 group"
                       title="Trang sau (Phím mũi tên phải)"
                     >
                       <ChevronRight className="w-8 h-8 group-hover:drop-shadow-md" />
                     </button>
                   )}
                </div>

             </div>
          </div>
        );
    }

    // 5. Local Docx (High Fidelity using docx-preview)
    if (viewerType === 'local-docx') {
        return (
            <div className="bg-slate-200 text-slate-900 w-full h-full shadow-none overflow-y-auto">
               <div ref={docxContainerRef} className="w-full min-h-full"></div>
            </div>
        );
    }

    // 6. Legacy Doc (Low Fidelity using Mammoth)
    if (viewerType === 'local-doc-legacy' && docxContent) {
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
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden relative select-none">
      
      {/* --- MAIN AREA --- */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 relative ${activeSidebar ? 'mr-80' : ''}`}>
        
        {/* Header Overlay */}
        <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10 flex justify-between items-start transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
           <div>
              <h1 className="text-lg font-bold text-white shadow-sm flex items-center gap-2">
                 {meeting.title}
                 <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded animate-pulse">LIVE</span>
              </h1>
              <p className="text-xs text-slate-300">ID: {meeting.id} • {meeting.participants} đang tham gia</p>
           </div>
           <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                 {otherParticipants.map(u => (
                   <div key={u.id} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs font-bold" title={u.name}>
                     {u.name.charAt(0)}
                   </div>
                 ))}
                 {USERS.length > 5 && (
                   <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                     +{meeting.participants - 4}
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Central Content (Document or Placeholder) */}
        <div className="flex-1 bg-slate-900 relative flex flex-col overflow-hidden">
           {previewDoc ? (
             <div className="w-full h-full relative">
                {renderPreviewContent()}
                
                {/* Close Doc Button */}
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors z-20"
                  title="Đóng tài liệu"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center relative">
                <div className="absolute inset-0 bg-slate-900/90"></div>
                <div className="relative z-10 text-center p-8">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Video className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Cuộc họp đang diễn ra</h2>
                    <p className="text-slate-400 max-w-md mx-auto">Chọn một tài liệu từ danh sách bên phải để trình chiếu hoặc chia sẻ màn hình của bạn.</p>
                </div>
             </div>
           )}
        </div>

      </div>

      {/* --- RIGHT SIDEBAR --- */}
      <div className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-30 transform transition-transform duration-300 flex flex-col border-l border-gray-200 ${activeSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
         
         {/* Tabs */}
         <div className="flex border-b border-gray-200 bg-gray-50">
            <button 
              onClick={() => setActiveSidebar('chat')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeSidebar === 'chat' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
               <MessageSquare className="w-4 h-4" /> Thảo luận
            </button>
            <button 
              onClick={() => setActiveSidebar('docs')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeSidebar === 'docs' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
               <FileText className="w-4 h-4" /> Tài liệu ({attachedDocIds.length})
            </button>
            <button 
               onClick={() => setActiveSidebar(null)}
               className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
               <X className="w-5 h-5" />
            </button>
         </div>

         {/* Sidebar Content */}
         <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            
            {/* DOCUMENTS TAB */}
            {activeSidebar === 'docs' && (
               <div className="space-y-4">
                  {/* Upload / Add Area */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                     <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <input 
                              type="file" 
                              multiple 
                              ref={fileInputRef} 
                              className="hidden" 
                              onChange={handleFileChange}
                            />
                            <button 
                                onClick={handleUploadClick}
                                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center justify-center gap-1 transition-colors"
                            >
                                <UploadCloud className="w-3 h-3" /> Tải lên
                            </button>
                          </>
                        )}
                        <button 
                            onClick={() => setIsAddingDoc(!isAddingDoc)}
                            className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 flex items-center justify-center gap-1 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Từ kho
                        </button>
                     </div>

                     {/* Picker from Library */}
                     {isAddingDoc && (
                        <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-2">
                           <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Chọn từ kho tài liệu:</p>
                           <div className="max-h-40 overflow-y-auto space-y-1">
                              {availableDocsToAdd.map(doc => (
                                 <button 
                                    key={doc.id}
                                    onClick={() => handleAddExistingDocument(doc.id)}
                                    className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-xs text-gray-700 truncate flex items-center gap-2"
                                 >
                                    <Plus className="w-3 h-3 text-gray-400" /> {doc.name}
                                 </button>
                              ))}
                              {availableDocsToAdd.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Hết tài liệu khả dụng</p>}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* List Attached Docs */}
                  <div className="space-y-2">
                     {getAttachedDocsResolved().map(doc => (
                        <div 
                           key={doc.id}
                           className={`bg-white p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md ${previewDoc?.id === doc.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-300'}`}
                           onClick={() => setPreviewDoc(doc)}
                        >
                           <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                                 {getDocIcon(doc.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <h4 className={`text-sm font-bold truncate ${previewDoc?.id === doc.id ? 'text-emerald-700' : 'text-gray-800'}`}>{doc.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{doc.type}</span>
                                    <span className="text-[10px] text-gray-400">{doc.size}</span>
                                 </div>
                              </div>
                              {previewDoc?.id === doc.id && (
                                <div className="absolute top-2 right-2">
                                   <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                   </span>
                                </div>
                              )}
                           </div>
                        </div>
                     ))}
                     {getAttachedDocsResolved().length === 0 && (
                        <div className="text-center py-10 opacity-50">
                           <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                           <p className="text-xs text-gray-500">Chưa có tài liệu nào</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {/* CHAT TAB (Mock UI) */}
            {activeSidebar === 'chat' && (
               <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4">
                     <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">A</div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm max-w-[85%]">
                           <p className="text-xs text-gray-800">Chào mọi người, chúng ta bắt đầu điểm danh nhé.</p>
                           <span className="text-[10px] text-gray-400 mt-1 block">08:00</span>
                        </div>
                     </div>
                     <div className="flex gap-2 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">Tôi</div>
                        <div className="bg-emerald-500 text-white p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%]">
                           <p className="text-xs">Đã rõ thưa sếp!</p>
                           <span className="text-[10px] text-emerald-100 mt-1 block">08:01</span>
                        </div>
                     </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                     <div className="relative">
                        <input 
                           type="text" 
                           placeholder="Nhập tin nhắn..." 
                           className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button className="absolute right-1.5 top-1.5 p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white transition-colors">
                           <ChevronRight className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>

      {/* --- BOTTOM CONTROLS --- */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
         
         <button 
           onClick={() => setIsMicOn(!isMicOn)}
           className={`p-4 rounded-xl transition-all ${isMicOn ? 'bg-slate-700/50 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'}`}
           title={isMicOn ? 'Tắt mic' : 'Bật mic'}
         >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
         </button>
         
         <button 
           onClick={() => setIsCamOn(!isCamOn)}
           className={`p-4 rounded-xl transition-all ${isCamOn ? 'bg-slate-700/50 text-white hover:bg-slate-600' : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'}`}
           title={isCamOn ? 'Tắt Camera' : 'Bật Camera'}
         >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
         </button>

         <div className="w-px h-8 bg-white/10 mx-2"></div>

         <button className="p-4 rounded-xl bg-slate-700/50 text-white hover:bg-slate-600 transition-all" title="Chia sẻ màn hình">
            <Share className="w-5 h-5" />
         </button>

         {/* Voting Button - New Feature */}
         <button 
            className="p-4 rounded-xl bg-slate-700/50 text-yellow-400 hover:bg-slate-600 transition-all shadow-sm shadow-yellow-500/10" 
            title="Biểu quyết"
         >
            <Vote className="w-5 h-5" />
         </button>
         
         <button 
            onClick={() => toggleSidebar('chat')}
            className={`p-4 rounded-xl transition-all relative ${activeSidebar === 'chat' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-700/50 text-white hover:bg-slate-600'}`}
            title="Trò chuyện"
         >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
         </button>

         <button 
            onClick={() => toggleSidebar('docs')}
            className={`p-4 rounded-xl transition-all ${activeSidebar === 'docs' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-700/50 text-white hover:bg-slate-600'}`}
            title="Tài liệu"
         >
            <FileText className="w-5 h-5" />
         </button>

         <button className="p-4 rounded-xl bg-slate-700/50 text-white hover:bg-slate-600 transition-all" title="Khác">
            <MoreHorizontal className="w-5 h-5" />
         </button>

         <div className="w-px h-8 bg-white/10 mx-2"></div>

         <button 
           onClick={onLeave}
           className="px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
         >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden md:inline">Rời họp</span>
         </button>
      </div>

    </div>
  );
};