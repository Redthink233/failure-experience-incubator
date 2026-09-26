/**
 * PRE-PSA-BLOCKER-01 ｜ The root renderer: one state change, one re-render, and the focus that
 * survives it.
 *
 * 🔴 THE ENTIRE TREE IS REBUILT ON EVERY STATE CHANGE. That is affordable here (a few hundred nodes)
 *    and it removes the whole class of "the view and the model disagree" bugs. The ONE piece of state
 *    that must outlive a rebuild is the user's place in the form, so it is captured and restored
 *    explicitly below - a focused text field keeps focus and its caret, a focused button keeps focus.
 * 🔴 THE RULE ITSELF IS NOT HERE (task §3). `captureFocus` / `restoreFocus` are the framework-neutral
 *    functions in `./settings/control-identity.js`; this file only supplies the two-method DOM adapter
 *    (`document.activeElement` / `root.querySelector`). Keeping the rule out of the DOM scope is what
 *    makes "the focused control is the one the snapshot names" testable without a browser.
 *    ⚠️ TWO SEPARATE FACTS, KEPT APART (`CORRECTION-02` §7, aligning with §23.2):
 *      · OBSERVED ROOT CAUSE of the lost caret = the pre-authorization render path below returned
 *        BEFORE restoring the focus it had captured (mechanism 1);
 *      · EXPLICIT CONTROL IDENTITY = PREVENTIVE HARDENING. The label-derived scheme it replaced was a
 *        duplicate-id factory, but the ids that actually shipped were built from ASCII labels and did
 *        not collide, so it was never established as the cause of the symptom.
 * 🔴 ESCAPE CLOSES THE SETTINGS PANEL AND NOTHING ELSE (task §6). The listener is bound once for the
 *    lifetime of the shell - not per render, and not on the panel - so it cannot accumulate; it acts
 *    only while the panel is open, and it cannot clear a key, save a draft or touch the workspace.
 * 🔴 THE NOTICE STRIP IS FED FROM THE SESSION AND THE SNAPSHOT, and its recovery buttons run the
 *    EXISTING workflow commands (task §45). No retry loop, no timer, no background queue is built
 *    here - or anywhere else in this App Shell.
 * 🔴 `original_error`, a `DOMException` and a raw provider body can never reach the DOM: the only
 *    failure text rendered is `WorkflowNotice.message`, a fixed product sentence produced by `M15`.
 *
 * DOM scope only.
 */

import { clear, el } from './dom.js';
import { noticeStrip, settingsCenter, modelRequiredNotice, topBar, workspaceEntry, heroCard } from './components/shell.js';
import type { ViewContext } from './components/shell.js';
import { leftRail } from './components/left-rail.js';
import { evidenceRail } from './components/evidence-rail.js';
import { workbench } from './components/steps.js';
import { noticeViewOf, noticeViewsOf, retryLabel, shellRuntimeNoticeView } from './presenters/notices.js';
import type { NoticeView } from './presenters/notices.js';
import { workspaceAllowsRead } from './presenters/rail.js';
import { captureFocus, restoreFocus } from './settings/control-identity.js';
import type { CaretControl, FocusScope } from './settings/control-identity.js';
import type { AppSession, AppSessionState } from './session/app-session.js';

export interface AppShellDeps {
  readonly session: AppSession;
  readonly picker_supported: boolean;
  readonly pickWorkspace: () => void;
}

/**
 * Reduces ONE rendered node to what focus preservation needs.
 *
 * 🔴 A CONTROL WITH NO TEXT HAS NO CARET (`text_length: null`): a button or a `<select>` keeps focus
 *    across a rebuild and is never given an invented selection range.
 */
function caretControlOf(node: HTMLElement): CaretControl {
  const field = node as HTMLInputElement | HTMLTextAreaElement;
  const selectable =
    typeof field.value === 'string' &&
    typeof field.selectionStart === 'number' &&
    typeof field.selectionEnd === 'number';
  return {
    id: node.id,
    text_length: selectable ? field.value.length : null,
    selection_start: selectable ? (field.selectionStart as number) : null,
    selection_end: selectable ? (field.selectionEnd as number) : null,
    focus() {
      node.focus();
    },
    set_selection_range(start, end) {
      field.setSelectionRange(start, end);
    },
  };
}

/** The DOM adapter for the focus rule: "what is focused in this tree" and "who carries this id". */
function focusScopeOf(root: HTMLElement): FocusScope {
  return {
    focused() {
      const active = document.activeElement;
      /* 🔴 A node outside the re-rendered tree - or an anonymous one - is not a restorable control. */
      if (!(active instanceof HTMLElement) || !root.contains(active) || active.id.length === 0) {
        return null;
      }
      return caretControlOf(active);
    },
    named(id) {
      const node = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      return node === null ? null : caretControlOf(node);
    },
  };
}

function noticesOf(state: AppSessionState): readonly NoticeView[] {
  const views: NoticeView[] = [];
  if (state.provider.status === 'unsupported' && state.provider.message !== null) {
    views.push(shellRuntimeNoticeView(state.provider.message, 'PROVIDER_CONNECTION_UNSUPPORTED'));
  }
  if (state.workspace.notice !== null) {
    views.push(noticeViewOf(state.workspace.notice));
  }
  views.push(...noticeViewsOf([...(state.snapshot?.notices ?? []), ...state.notices]));
  return views;
}

export function mountAppShell(root: HTMLElement, deps: AppShellDeps): () => void {
  function render(): void {
    const state = deps.session.getState();
    const focus = captureFocus(focusScopeOf(root));
    const context: ViewContext = {
      state,
      session: deps.session,
      picker_supported: deps.picker_supported,
      pickWorkspace: deps.pickWorkspace,
    };

    const shell = el('div', { class: 'app-shell' });
    shell.appendChild(topBar(context));

    const layout = el('div', { class: 'app-layout' });
    const authorized = workspaceAllowsRead(state.workspace.status);

    if (!authorized) {
      /* 🔴 NOTHING IS READ AND NO RAIL IS DRAWN BEFORE AUTHORIZATION (task §9 / U2).
       *    The entry spans the WHOLE grid: with no rails there are no columns to fit into, and a
       *    card squeezed into the 264px rail column would misrepresent the page's structure. */
      layout.appendChild(el('div', { class: 'workbench workbench-solo' }, workspaceEntry(context)));
      shell.appendChild(layout);
      shell.appendChild(settingsOverlay(context));
      root.replaceChildren(shell);
      /*
       * 🔴 THE FOCUS IS RESTORED HERE TOO, AND THAT IS THE FIX FOR THE REPORTED DEFECT
       *    (`PRE-PSA-BLOCKER-01` §2). This path renders the Settings Center as well, and it used to
       *    `return` BEFORE restoring - so a user configuring a model with no workspace chosen yet
       *    (the normal first run) lost the caret on every single keystroke: the keystroke changed the
       *    session state, the tree was rebuilt, and nothing put the focus back. A render path that
       *    can show a form MUST restore the focus it captured.
       */
      restoreFocus(focusScopeOf(root), focus);
      return;
    }

    layout.appendChild(leftRail(context));
    const notices = noticesOf(state);
    const center = el('div', { class: 'workbench-column' });
    /*
     * 🔴 The 「此操作需要模型服务」 prompt is rendered SEPARATELY from the notice strip: it is guidance,
     *    not a failure reported by a module, so it carries no layer, no code and no retry.
     */
    const needs_model = modelRequiredNotice(context);
    if (needs_model !== null) {
      center.appendChild(needs_model);
    }
    const strip = noticeStrip(
      notices,
      (key, attempt_id) => {
        void runRecovery(deps.session, deps.pickWorkspace, key, attempt_id);
      },
      () => deps.session.dismissNotices(),
      retryLabel(),
    );
    if (strip !== null) {
      center.appendChild(strip);
    }
    if (state.snapshot === null && !state.new_attempt_open) {
      center.appendChild(heroCard(context));
    } else {
      center.appendChild(workbench(context));
    }
    layout.appendChild(center);
    layout.appendChild(evidenceRail(context));
    shell.appendChild(layout);
    shell.appendChild(settingsOverlay(context));

    root.replaceChildren(shell);
    restoreFocus(focusScopeOf(root), focus);
  }

  /**
   * Escape leaves the Settings Center.
   *
   * 🔴 ONE listener for the whole shell lifetime, and it does nothing unless the panel is open.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !deps.session.getState().settings_open) {
      return;
    }
    event.preventDefault();
    deps.session.closeSettings();
  }

  document.addEventListener('keydown', onKeyDown);
  const unsubscribe = deps.session.subscribe(() => render());
  render();
  return () => {
    document.removeEventListener('keydown', onKeyDown);
    unsubscribe();
  };
}

function settingsOverlay(context: ViewContext): HTMLElement {
  const panel = settingsCenter(context);
  return el('div', { class: `settings-layer ${panel === null ? 'is-hidden' : ''}` }, panel);
}

/** Runs the recovery action a notice names - and only that one (task §45). */
async function runRecovery(
  session: AppSession,
  pickWorkspace: () => void,
  key: string,
  _attempt_id: string | null,
): Promise<void> {
  if (key === 'rerun_retrieval') {
    await session.rerunRetrieval();
    return;
  }
  if (key === 'regenerate_insights') {
    await session.generateInsights();
    return;
  }
  if (key === 'regenerate_hypotheses') {
    await session.generateHypotheses();
    return;
  }
  if (key === 'select_workspace' || key === 'grant_workspace_access') {
    /* 🔴 The picker needs a real user gesture, so the CLICK opens it - nothing is opened for the user. */
    pickWorkspace();
    return;
  }
  session.dismissNotices();
}

/** Clears a node (exported so a future route change can reset the shell deliberately). */
export function unmount(root: HTMLElement): void {
  clear(root);
}
