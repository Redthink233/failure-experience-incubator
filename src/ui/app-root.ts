/**
 * S01-06 ｜ The root renderer: one state change, one re-render, and the focus that survives it.
 *
 * 🔴 THE ENTIRE TREE IS REBUILT ON EVERY STATE CHANGE. That is affordable here (a few hundred nodes)
 *    and it removes the whole class of "the view and the model disagree" bugs. The ONE piece of state
 *    that must outlive a rebuild is the user's place in the form, so it is captured and restored
 *    explicitly below - a focused textarea keeps focus and its caret, a focused button keeps focus.
 * 🔴 THE NOTICE STRIP IS FED FROM THE SESSION AND THE SNAPSHOT, and its recovery buttons run the
 *    EXISTING workflow commands (task §45). No retry loop, no timer, no background queue is built
 *    here - or anywhere else in this App Shell.
 * 🔴 `original_error`, a `DOMException` and a raw provider body can never reach the DOM: the only
 *    failure text rendered is `WorkflowNotice.message`, a fixed product sentence produced by `M15`.
 *
 * DOM scope only.
 */

import { clear, el } from './dom.js';
import { noticeStrip, modelSettings, modelRequiredNotice, topBar, workspaceEntry, heroCard } from './components/shell.js';
import type { ViewContext } from './components/shell.js';
import { leftRail } from './components/left-rail.js';
import { evidenceRail } from './components/evidence-rail.js';
import { workbench } from './components/steps.js';
import { noticeViewOf, noticeViewsOf, retryLabel, shellRuntimeNoticeView } from './presenters/notices.js';
import type { NoticeView } from './presenters/notices.js';
import { workspaceAllowsRead } from './presenters/rail.js';
import type { AppSession, AppSessionState } from './session/app-session.js';

export interface AppShellDeps {
  readonly session: AppSession;
  readonly picker_supported: boolean;
  readonly pickWorkspace: () => void;
}

interface FocusSnapshot {
  readonly id: string;
  readonly start: number | null;
  readonly end: number | null;
}

function captureFocus(root: HTMLElement): FocusSnapshot | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active) || active.id.length === 0) {
    return null;
  }
  const textarea = active as HTMLTextAreaElement;
  const selectable = typeof textarea.selectionStart === 'number' && typeof textarea.selectionEnd === 'number';
  return {
    id: active.id,
    start: selectable ? textarea.selectionStart : null,
    end: selectable ? textarea.selectionEnd : null,
  };
}

function restoreFocus(root: HTMLElement, snapshot: FocusSnapshot | null): void {
  if (snapshot === null) {
    return;
  }
  const target = root.querySelector<HTMLElement>(`#${CSS.escape(snapshot.id)}`);
  if (target === null) {
    return;
  }
  target.focus();
  if (snapshot.start === null || snapshot.end === null) {
    return;
  }
  const field = target as HTMLTextAreaElement;
  if (typeof field.setSelectionRange === 'function') {
    const end = Math.min(snapshot.end, field.value.length);
    field.setSelectionRange(Math.min(snapshot.start, end), end);
  }
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
    const focus = captureFocus(root);
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
    restoreFocus(root, focus);
  }

  const unsubscribe = deps.session.subscribe(() => render());
  render();
  return unsubscribe;
}

function settingsOverlay(context: ViewContext): HTMLElement {
  const panel = modelSettings(context);
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
