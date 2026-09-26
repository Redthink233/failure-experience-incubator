/**
 * PRE-PSA-BLOCKER-01 ｜ STABLE CONTROL IDENTITY + FOCUS PRESERVATION (the settings input fix).
 *
 * ── THE DEFECT, AND BOTH OF ITS MECHANISMS ──────────────────────────────────────────
 * 🔴 MECHANISM 1 - THE ONE THE USER ACTUALLY HIT: `app-root.ts` has TWO render paths, and the
 *    pre-authorization one (`if (!authorized)`) `return`ed BEFORE restoring the focus it had captured.
 *    That path renders the Settings Center too, so on a first run - open the app, open Settings,
 *    start typing with no workspace chosen yet - every keystroke changed the session state, rebuilt
 *    the whole tree, and put the focus back NOWHERE. The caret was gone after one character. A render
 *    path that can show a form must restore the focus it captured; that is now an asserted property
 *    of BOTH paths, not of one of them.
 * 🔴 MECHANISM 2 - THE LATENT ONE, FIXED HERE: a control's DOM `id` used to be DERIVED FROM ITS LABEL
 *    (`field-${label.replace(/[^A-Za-z0-9]/gu, '')}-${type}`). That scheme is a duplicate factory.
 *    The labels the task quotes as the trigger - 「模型」, 「自定义 Base URL」 - both strip to the EMPTY
 *    string and therefore both produce `field--text`; and any two labels sharing an ASCII skeleton
 *    collide as well. With a duplicated id, focus restoration - which looks a control up BY ID, with
 *    `querySelector`'s first-match-wins - hands the caret to the WRONG control.
 *    ⚠️ FACTUAL PRECISION, because this project separates fact from inference: with the copy deck as
 *    it actually shipped (`Model` / `Custom Base URL` / `API Key`, all ASCII) the three ids did NOT
 *    collide (`field-Model-text` / `field-CustomBaseURL-text` / `field-APIKey-password`). So
 *    mechanism 2 is a real defect of the SCHEME and a real hazard for any future non-ASCII label, but
 *    it is NOT established as the cause of the observed symptom. Mechanism 1 is.
 * 🔴 THE FIX IS EXPLICIT LOGICAL IDENTITY, NOT A BETTER STRING TRANSFORM. A control id is now a
 *    product constant, chosen once, that no label edit and no translation can change - so the
 *    duplicate class cannot come back, and the id a snapshot was taken under is the id the restore
 *    looks up.
 *
 * ── WHY THE FOCUS RULE LIVES HERE AND NOT IN `app-root.ts` ──────────────────────────
 * 🔴 IT IS A RULE, NOT A DOM CALL. "Remember the id and the caret before the rebuild, then put both
 *    back on the control carrying that id" is decidable without a browser, so it belongs in the
 *    framework-neutral layer: the Node test scope compiles THIS file (it has no `lib.dom`) and
 *    asserts the behaviour directly, while the DOM-scope root renderer only supplies a two-method
 *    adapter. Left as a private function inside the DOM renderer it was untestable by construction.
 * 🔴 IT RESTORES IDENTITY, NEVER POSITION. A re-created control with the same id is the same control;
 *    a control that is gone is simply not restored (the renderer must not guess a stand-in).
 *
 * Framework-neutral: NO DOM types, NO DOM api, NO Node runtime api, NO storage, NO I/O.
 */

/* ------------------------------------------------------------------ *
 * 1. The logical identity of every Settings control
 * ------------------------------------------------------------------ */

/**
 * Every control the Settings Center renders, under a FIXED, language-independent id.
 *
 * 🔴 THESE STRINGS ARE PRODUCT CONSTANTS. They are not keys, not labels and not translations: the
 *    panel renders them as `id` attributes and the focus rule uses them as identity. Adding a
 *    section (task §5 allows a future one) means adding a fresh entry here - never re-using one.
 * 🔴 THE LIST IS UNIQUE BY CONSTRUCTION AND BY TEST (F1-F4): a duplicate id is exactly the defect
 *    this file exists to make impossible, so it is asserted rather than assumed.
 * 🔴 NONE OF THESE STRINGS MAY BE DERIVED FROM A LABEL. `labelInput` now REQUIRES an `id`, so the
 *    label is only ever rendered text and can be re-worded without touching identity.
 */
export const SETTINGS_CONTROL_IDS = {
  /** The provider `<select>`. */
  provider: 'settings-provider',
  /** The model text input. */
  model: 'settings-model',
  /** The session-only API key (a password field). */
  api_key: 'settings-api-key',
  /** The custom Base URL - browser-direct only. */
  base_url: 'settings-base-url',
  /** The primary save button. */
  save: 'settings-save',
  /** The bottom 「取消」 button. */
  cancel: 'settings-cancel',
  /** The top-right 「×」 button. */
  close: 'settings-close',
} as const;

export type SettingsControlKey = keyof typeof SETTINGS_CONTROL_IDS;

/**
 * Every id above, in render order.
 *
 * 🔴 ONE SOURCE OF TRUTH: the panel and the F1-F4 regression tests read this SAME list, so a new
 *    control cannot be added to the panel while escaping the duplicate-id check.
 */
export const SETTINGS_CONTROL_ID_LIST: readonly string[] = Object.values(SETTINGS_CONTROL_IDS);

/** The three TEXT controls a user types into - the ones whose caret must survive (F5-F8). */
export const SETTINGS_TEXT_CONTROL_IDS: readonly string[] = [
  SETTINGS_CONTROL_IDS.model,
  SETTINGS_CONTROL_IDS.api_key,
  SETTINGS_CONTROL_IDS.base_url,
];

/** The section a control belongs to. V1 has exactly one; the shape allows a second later (task §5). */
export type SettingsSectionKey = 'model_service';

/** The single V1 section (its title copy lives in `copy.ts`). */
export const SETTINGS_SECTIONS: readonly SettingsSectionKey[] = ['model_service'];

/* ------------------------------------------------------------------ *
 * 2. Focus preservation
 * ------------------------------------------------------------------ */

/**
 * What the renderer remembers about the focused control before a rebuild.
 *
 * 🔴 `start` / `end` are `null` for a control with no caret (a button, a `<select>`): the focused
 *    element is restored, and no selection is invented for it.
 */
export interface FocusSnapshot {
  readonly id: string;
  readonly start: number | null;
  readonly end: number | null;
}

/**
 * The minimum a control must expose for focus preservation.
 *
 * 🔴 THE ADAPTER IS THIS SMALL ON PURPOSE. The DOM layer implements it over a real element
 *    (`document.activeElement` / `root.querySelector('#' + id)`); a test implements it over a plain
 *    object. Neither the rule below nor its tests need anything else.
 */
export interface CaretControl {
  readonly id: string;
  /** The length of the control's text, or `null` when it holds no text (button / `<select>`). */
  readonly text_length: number | null;
  readonly selection_start: number | null;
  readonly selection_end: number | null;
  focus(): void;
  set_selection_range(start: number, end: number): void;
}

/** The two lookups the rule needs: "what is focused now" and "who carries this id now". */
export interface FocusScope {
  /**
   * The focused control, or `null`.
   *
   * 🔴 A control with no id, or one outside the re-rendered scope, must answer `null` - the renderer
   *    owns the "is it inside the tree" decision and the rule never guesses.
   */
  focused(): CaretControl | null;
  /** The control currently carrying `id`, or `null` when it is not on screen. */
  named(id: string): CaretControl | null;
}

/** Takes the snapshot the rebuild must restore. Returns `null` when there is nothing to restore. */
export function captureFocus(scope: FocusScope): FocusSnapshot | null {
  const focused = scope.focused();
  if (focused === null || focused.id.length === 0) {
    return null;
  }
  if (
    focused.text_length === null ||
    focused.selection_start === null ||
    focused.selection_end === null
  ) {
    return { id: focused.id, start: null, end: null };
  }
  return { id: focused.id, start: focused.selection_start, end: focused.selection_end };
}

/**
 * Puts the snapshot back, and returns the control that received focus (`null` when none did).
 *
 * 🔴 IDENTITY LOOKUP. `scope.named(id)` is the only way a target is found: a control that is no
 *    longer rendered is NOT restored, and no "nearest control" is ever chosen. That is what makes a
 *    duplicated id show up as the bug it is instead of being papered over.
 * 🔴 THE CARET IS CLAMPED TO THE NEW VALUE. A rebuild can legitimately render a shorter value (a
 *    preset switch replaces the model default, a trim drops characters), and `setSelectionRange`
 *    beyond the value length throws in a real browser. Clamping is part of the rule, not an
 *    afterthought.
 */
export function restoreFocus(scope: FocusScope, snapshot: FocusSnapshot | null): CaretControl | null {
  if (snapshot === null) {
    return null;
  }
  const target = scope.named(snapshot.id);
  if (target === null) {
    return null;
  }
  target.focus();
  if (snapshot.start === null || snapshot.end === null || target.text_length === null) {
    return target;
  }
  const end = Math.min(snapshot.end, target.text_length);
  const start = Math.min(snapshot.start, end);
  target.set_selection_range(start, end);
  return target;
}
