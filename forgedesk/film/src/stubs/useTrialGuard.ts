export function useTrialGuard() {
  return { isBlocked: false, guardAction: (fn: () => void) => fn(), showDialog: false, setShowDialog: () => {} }
}
