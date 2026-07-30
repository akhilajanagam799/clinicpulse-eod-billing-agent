// Global application context. Holds the single processed billing result so it
// persists across all three pages (Dashboard, Analytics, AI Summary) without
// requiring the user to re-upload.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { processBillingFile, deriveDateFromFilename } from '../services/api.js';

export const STAGES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  VALIDATING: 'validating',
  RECONCILING: 'reconciling',
  ANALYTICS: 'analytics',
  NARRATIVE: 'narrative',
  DONE: 'done',
  ERROR: 'error',
};

export const STAGE_LABELS = {
  idle: 'Upload Billing Log',
  uploading: 'Uploading Billing Log...',
  validating: 'Validating Records...',
  reconciling: 'Generating Reconciliation...',
  analytics: 'Computing Analytics...',
  narrative: 'Generating AI Summary...',
  done: 'Re-upload',
  error: 'Retry Upload',
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [result, setResult] = useState(null);
  const [source, setSource] = useState(null);
  const [stage, setStage] = useState(STAGES.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fileName, setFileName] = useState(null);

  const uploadFile = useCallback(async (file) => {
    setErrorMessage(null);
    setFileName(file.name);
    setStage(STAGES.UPLOADING);

    try {
      const dateStr = deriveDateFromFilename(file.name);

      // Staged labels give the UI its loading sequence.
      setStage(STAGES.VALIDATING);
      await new Promise((r) => setTimeout(r, 350));

      setStage(STAGES.RECONCILING);
      const { result: procResult, source: procSource } = await processBillingFile(file, dateStr);

      setStage(STAGES.ANALYTICS);
      await new Promise((r) => setTimeout(r, 350));

      setStage(STAGES.NARRATIVE);
      await new Promise((r) => setTimeout(r, 450));

      setResult(procResult);
      setSource(procSource);
      setStage(STAGES.DONE);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to process billing log.'
      );
      setStage(STAGES.ERROR);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setSource(null);
    setStage(STAGES.IDLE);
    setErrorMessage(null);
    setFileName(null);
  }, []);

  const value = useMemo(
    () => ({ result, source, stage, errorMessage, fileName, uploadFile, reset }),
    [result, source, stage, errorMessage, fileName, uploadFile, reset]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
