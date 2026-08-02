'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { appService } from '@/services/appService';
import type { ImportSummary } from '@/lib/backup';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

/**
 * ImportDialog — Restore a MicroApp Studio JSON backup.
 * Offers merge (update existing ids, add new) or replace (wipe + restore)
 * modes, and reports an import summary after the batched transactional write.
 */
export default function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);

  const reset = () => {
    setBusy(false);
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Select a backup JSON file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const summary = await appService.importApps(text, mode);
      setResult(summary);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Backup</DialogTitle>
          <DialogDescription>
            Restore your micro apps from a JSON backup file. All data stays in
            your browser&apos;s IndexedDB — nothing is uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* File picker — carved-in clay input */}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#E8E0D8] bg-[#FFF5ED] px-4 py-8 text-center transition-all hover:scale-[1.01]">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={() => {
                setError(null);
                setResult(null);
              }}
            />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl clay-sm bg-[#C5E8F7] text-foreground">
              <FileUp className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {fileRef.current?.files?.[0]?.name || 'Choose a backup file'}
            </span>
            <span className="text-xs text-clay-muted">.json exported from MicroApp Studio</span>
          </label>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('merge')}
              className={`clay-sm flex flex-col items-start gap-0.5 px-3 py-3 text-left transition-all ${
                mode === 'merge'
                  ? 'bg-[#D5B8F5] text-foreground scale-[1.02]'
                  : 'bg-[#F5EDE5] text-foreground hover:scale-[1.02]'
              }`}
            >
              <span className="text-xs font-semibold">Merge</span>
              <span className="text-[11px] text-clay-muted">Keep existing apps, update matching ids</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`clay-sm flex flex-col items-start gap-0.5 px-3 py-3 text-left transition-all ${
                mode === 'replace'
                  ? 'bg-[#FFD0D0] text-foreground scale-[1.02]'
                  : 'bg-[#F5EDE5] text-foreground hover:scale-[1.02]'
              }`}
            >
              <span className="text-xs font-semibold">Replace</span>
              <span className="text-[11px] text-clay-muted">Wipe current apps, restore backup</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl bg-[#FFD0D0]/60 px-3 py-2.5 text-xs text-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="flex items-start gap-2 rounded-2xl bg-[#C5F0D5]/60 px-3 py-2.5 text-xs text-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Import complete —{' '}
                <span className="font-semibold">{result.imported} added</span>
                {result.replaced > 0 && (
                  <>
                    , <span className="font-semibold">{result.replaced} updated</span>
                  </>
                )}
                {result.failed > 0 && (
                  <>
                    , <span className="font-semibold">{result.failed} failed</span>
                  </>
                )}
                .
              </span>
            </div>
          )}

          {/* Format hint */}
          <div className="flex items-center gap-2 rounded-2xl bg-[#FFF2C5]/70 px-3 py-2 text-[11px] text-clay-muted">
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>
              Tip: use the <span className="font-medium text-foreground">Export</span> button on
              the dashboard to create backups.
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <button className="clay-sm h-9 px-4 text-sm font-medium text-foreground bg-[#F5EDE5]">
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={handleImport}
            disabled={busy}
            className="clay-button flex h-9 items-center gap-2 px-4 text-sm font-medium text-foreground bg-[#C5F0D5] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Importing…' : 'Import'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
