import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'ยืนยัน', danger = false, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10,21,32,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="card w-full max-w-sm shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-industrial-700">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-900' : 'bg-accent-500'}`}>
            <AlertTriangle size={18} className={danger ? 'text-red-300' : 'text-white'} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-industrial-300 mt-0.5 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="btn-ghost p-1 shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3">
          <button onClick={onCancel} className="btn-secondary text-xs">ยกเลิก</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger text-xs' : 'btn-primary text-xs'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
