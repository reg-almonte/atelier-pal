import { useEffect } from 'react';
import { CheckCircle2, RefreshCw, Terminal, X, XCircle } from 'lucide-react';
import type { AIStatus } from '../../domain/models';

interface OllamaSetupModalProps {
  isOpen: boolean;
  aiStatus: AIStatus | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function OllamaSetupModal({
  isOpen,
  aiStatus,
  onClose,
  onRefresh,
}: OllamaSetupModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isConnected = aiStatus?.available ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Local AI Stylist Status"
    >
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {isConnected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600" />
            )}
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Local AI Stylist Status (Ollama)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Status Modal"
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-stone-600">
          <p>{aiStatus?.message ?? 'Checking Ollama connection...'}</p>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Endpoint</span>
              <span className="font-mono text-stone-800">
                {aiStatus?.base_url ?? 'http://localhost:11434'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Configured Model</span>
              <span className="font-mono text-stone-800">
                {aiStatus?.configured_model ?? 'llama3.2'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Active Model</span>
              <span className="font-mono text-stone-800">
                {aiStatus?.active_model ?? 'None'}
              </span>
            </div>
          </div>

          {aiStatus?.installed_models && aiStatus.installed_models.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-700">
                Installed Local Models
              </p>
              <div className="flex flex-wrap gap-1.5">
                {aiStatus.installed_models.map((m) => (
                  <span
                    key={m}
                    className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-xs text-stone-700"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
                <Terminal className="h-3.5 w-3.5" />
                <span>Quick Setup</span>
              </div>
              <p className="mb-2">
                {aiStatus?.setup_instructions ??
                  'Install Ollama and pull the default model:'}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-stone-900 p-2.5 font-mono text-[11px] text-stone-100">
                ollama serve{'\n'}ollama pull {aiStatus?.configured_model ?? 'llama3.2'}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-check Status
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
