export enum Semantics {
  /**
   * Accessibility semantics are disabled. No accessibility elements are
   * created, regardless of screen-reader state.
   */
  Off,

  /**
   * Accessibility semantics are always active. Elements are created and kept
   * up-to-date on every frame.
   */
  On,

  /**
   * Accessibility semantics activate and deactivate automatically based on
   * whether a screen reader (e.g. VoiceOver) is currently running.
   */
  Automatic,
}
