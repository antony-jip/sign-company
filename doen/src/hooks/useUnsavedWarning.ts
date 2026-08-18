/**
 * Previously showed a native browser `beforeunload` warning.
 * Now a no-op — unsaved-change protection is handled by the
 * tab dirty-state system and the in-app ConfirmDialog.
 */
export function useUnsavedWarning(_isDirty: boolean) {
  // intentionally empty – kept for backwards compatibility
}
