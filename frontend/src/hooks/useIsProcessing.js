// Custom hook: returns true while the app is in any processing stage.
import { useApp, STAGES } from '../context/AppContext.jsx';

export function useIsProcessing() {
  const { stage } = useApp();
  return (
    stage === STAGES.UPLOADING ||
    stage === STAGES.VALIDATING ||
    stage === STAGES.RECONCILING ||
    stage === STAGES.ANALYTICS ||
    stage === STAGES.NARRATIVE
  );
}
