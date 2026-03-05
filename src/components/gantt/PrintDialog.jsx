import { useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Printer, X, FileText, RotateCcw, BarChart2, TrendingUp, LayoutTemplate } from 'lucide-react';
import PrintReport from './PrintReport';

const SIZES = [
  { key: 'A4', label: 'A4', dim: '210 × 297 mm' },
  { key: 'A3', label: 'A3', dim: '297 × 420 mm' },
];
const ORIENTATIONS = [
  { key: 'landscape', label: 'แนวนอน', sub: 'Landscape' },
  { key: 'portrait',  label: 'แนวตั้ง',  sub: 'Portrait'  },
];
const CONTENTS = [
  { key: 'gantt',     label: 'Gantt Chart',         sub: 'ตาราง WBS + แผนงาน',        Icon: BarChart2     },
  { key: 'scurve',    label: 'S-Curve',              sub: 'กราฟความก้าวหน้าสะสม',       Icon: TrendingUp    },
  { key: 'both',      label: 'Gantt + S-Curve',      sub: 'ครบทั้งตารางและกราฟ',        Icon: LayoutTemplate },
];

// Collect all <style> and <link rel="stylesheet"> from the main document
function getStylesheetHTML(size, orientation) {
  const styles = [];
  // Page rule
  styles.push(`<style>@page{size:${size} ${orientation};margin:10mm 12mm;} body{margin:0;padding:0;}</style>`);
  // Copy all stylesheets from parent document into the iframe
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      if (sheet.href) {
        styles.push(`<link rel="stylesheet" href="${sheet.href}">`);
      } else if (sheet.ownerNode?.tagName === 'STYLE') {
        styles.push(`<style>${sheet.ownerNode.textContent}</style>`);
      }
    } catch (_) { /* cross-origin */ }
  });
  return styles.join('\n');
}

export default function PrintDialog({ isOpen, onClose, project, activities, scale }) {
  const [size, setSize]               = useState('A4');
  const [orientation, setOrientation] = useState('landscape');
  const [content, setContent]         = useState('both');
  const iframeRef = useRef(null);
  const rootRef   = useRef(null);

  const handlePrint = useCallback(() => {
    // Remove old iframe if exists
    if (iframeRef.current) {
      document.body.removeChild(iframeRef.current);
      iframeRef.current = null;
    }

    // Create hidden iframe (off-screen but full size so React renders correctly)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:-9999;opacity:0;';
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      ${getStylesheetHTML(size, orientation)}
      <style>
        body { margin: 0; padding: 0; background: white; }
        .print-report { display: block !important; visibility: visible !important; }
      </style>
    </head><body><div id="cmg-iframe-root"></div></body></html>`);
    iDoc.close();

    const mountEl = iDoc.getElementById('cmg-iframe-root');
    const root = createRoot(mountEl);
    rootRef.current = root;

    root.render(
      <PrintReport
        project={project}
        activities={activities}
        scale={scale}
        size={size}
        orientation={orientation}
        content={content}
      />
    );

    // Wait for React to fully paint, then print
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      // Cleanup after print dialog closes
      setTimeout(() => {
        if (iframeRef.current) {
          root.unmount();
          document.body.removeChild(iframeRef.current);
          iframeRef.current = null;
        }
      }, 3000);
    }, 600);
  }, [size, orientation, content, project, activities, scale]);

  return (
    <>
      {/* ── Dialog UI — only shown when isOpen ─────────────────────── */}
      {isOpen && <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(10,21,32,0.88)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="card w-full max-w-sm shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-industrial-700">
            <div className="w-8 h-8 bg-industrial-600 rounded-lg flex items-center justify-center shrink-0">
              <Printer size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">ตั้งค่าการพิมพ์</h2>
              <p className="text-[10px] text-industrial-400">Print Settings</p>
            </div>
            <button onClick={onClose} className="ml-auto btn-ghost p-1.5">
              <X size={15} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Content selector */}
            <div>
              <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={10} /> เนื้อหาที่พิมพ์
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CONTENTS.map(({ key, label, sub, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setContent(key)}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all ${
                      content === key
                        ? 'border-green-500 bg-green-500/10 text-white'
                        : 'border-industrial-600 bg-industrial-700/40 text-industrial-300 hover:border-industrial-500'
                    }`}
                  >
                    <Icon size={16} className={content === key ? 'text-green-400' : 'text-industrial-400'} />
                    <span className="text-[11px] font-semibold leading-tight text-center">{label}</span>
                    <span className="text-[9px] text-industrial-400 leading-tight text-center">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paper size */}
            <div>
              <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={10} /> ขนาดกระดาษ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSize(s.key)}
                    className={`flex flex-col items-center justify-center py-3 rounded-lg border-2 transition-all ${
                      size === s.key
                        ? 'border-accent-500 bg-accent-500/10 text-white'
                        : 'border-industrial-600 bg-industrial-700/40 text-industrial-300 hover:border-industrial-500'
                    }`}
                  >
                    <span className="text-sm font-bold">{s.label}</span>
                    <span className="text-[10px] text-industrial-400 mt-0.5">{s.dim}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-[10px] font-semibold text-industrial-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <RotateCcw size={10} /> การวางแนว
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ORIENTATIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setOrientation(o.key)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                      orientation === o.key
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-industrial-600 bg-industrial-700/40 text-industrial-300 hover:border-industrial-500'
                    }`}
                  >
                    {/* Page shape icon */}
                    <div
                      className={`border-2 rounded-sm shrink-0 ${orientation === o.key ? 'border-blue-400' : 'border-industrial-500'}`}
                      style={
                        o.key === 'landscape'
                          ? { width: 20, height: 14 }
                          : { width: 14, height: 20 }
                      }
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold leading-tight">{o.label}</div>
                      <div className="text-[10px] text-industrial-400">{o.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary badge */}
            <div className="flex items-center gap-2 bg-industrial-700/40 border border-industrial-600 rounded-lg px-3 py-2">
              <Printer size={12} className="text-industrial-400 shrink-0" />
              <span className="text-xs text-industrial-200">
                {CONTENTS.find((c) => c.key === content)?.label}
                {' · '}
                {size} {orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}
                {' · '}
                <span className="text-industrial-400">
                  {size === 'A4' && orientation === 'landscape' && '297 × 210 mm'}
                  {size === 'A4' && orientation === 'portrait'  && '210 × 297 mm'}
                  {size === 'A3' && orientation === 'landscape' && '420 × 297 mm'}
                  {size === 'A3' && orientation === 'portrait'  && '297 × 420 mm'}
                </span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 pb-4">
            <button onClick={onClose} className="btn-secondary text-xs">ยกเลิก</button>
            <button onClick={handlePrint} className="btn-primary text-xs">
              <Printer size={13} />
              พิมพ์เลย
            </button>
          </div>
        </div>
      </div>}
    </>
  );
}
