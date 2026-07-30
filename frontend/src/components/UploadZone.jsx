import { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useApp, STAGE_LABELS } from '../context/AppContext.jsx';
import { useIsProcessing } from '../hooks/useIsProcessing.js';

export default function UploadZone() {
  const { stage, uploadFile, errorMessage } = useApp();
  const isProcessing = useIsProcessing();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file || isProcessing) return;
    uploadFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={[
        'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300',
        dragOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50/60 hover:border-sky-400 hover:bg-sky-50/40',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md">
        {isProcessing ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
      </div>
      <button
        type="button"
        disabled={isProcessing}
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {STAGE_LABELS[stage]}
      </button>
      <p className="mt-2 text-xs text-slate-400">Drag &amp; drop a billing log JSON file, or click to browse</p>
      {isProcessing && <p className="mt-3 text-sm font-medium text-sky-600">{STAGE_LABELS[stage]}</p>}
      {stage === 'error' && errorMessage && <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>}
    </div>
  );
}
