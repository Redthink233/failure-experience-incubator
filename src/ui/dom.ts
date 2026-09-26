/**
 * S01-06 ｜ A very small DOM builder.
 *
 * 🔴 WHY NO FRAMEWORK (task §47 / §48): the App Shell is a browser-only, single-page tool whose
 *    output is standard ESM. A framework would add a dependency tree, a transform step and a test
 *    environment for no functional gain - and the ONE piece of behaviour a framework would provide
 *    here (re-render the tree when the session state changes) is thirty lines. Those thirty lines are
 *    in this file, and `app-root.ts` keeps the only stateful bit (focus restoration) explicit.
 * 🔴 IT BUILDS DOM AND NOTHING ELSE: no data, no derivation, no business rule. Every text node it
 *    receives was produced by a presenter.
 *
 * DOM scope only - this file is compiled by `tsconfig.web.json` and is never pulled into the
 * framework-neutral core or the Node test build.
 */

export type Child = Node | string | null | undefined | false;

export type EventHandlers = Readonly<Record<string, EventListener>>;

export interface ElementProps {
  readonly class?: string;
  /** Plain text content - always assigned as a text node, never as HTML. */
  readonly text?: string;
  /** Direct DOM property assignment (`value`, `disabled`, `checked`, `type`, …). */
  readonly props?: Readonly<Record<string, unknown>>;
  /** `setAttribute` entries (`role`, `aria-*`, `title`, `placeholder`, …). */
  readonly attrs?: Readonly<Record<string, string>>;
  readonly on?: EventHandlers;
}

function appendChildren(target: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    target.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/**
 * Creates one element.
 *
 * 🔴 `text` (and any string child) goes through `createTextNode`, so record content can never be
 *    parsed as markup. There is deliberately NO `innerHTML` in this codebase - a value that came from
 *    a model or a user is displayed, not interpreted.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class !== undefined) {
    node.className = props.class;
  }
  if (props.text !== undefined) {
    node.appendChild(document.createTextNode(props.text));
  }
  for (const [name, value] of Object.entries(props.props ?? {})) {
    (node as unknown as Record<string, unknown>)[name] = value;
  }
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    node.setAttribute(name, value);
  }
  for (const [name, handler] of Object.entries(props.on ?? {})) {
    node.addEventListener(name, handler);
  }
  appendChildren(node, children);
  return node;
}

/** A button with a real text label (task §59: a button always has a readable name). */
export function button(
  label: string,
  onClick: () => void,
  options: { readonly class?: string; readonly disabled?: boolean; readonly attrs?: Readonly<Record<string, string>> } = {},
): HTMLButtonElement {
  return el(
    'button',
    {
      class: options.class ?? 'btn',
      props: { type: 'button', disabled: options.disabled === true },
      attrs: options.attrs ?? {},
      on: { click: () => onClick() },
      text: label,
    },
  );
}

export function fragment(...children: Child[]): DocumentFragment {
  const node = document.createDocumentFragment();
  appendChildren(node, children);
  return node;
}

export function clear(node: Node): void {
  while (node.firstChild !== null) {
    node.removeChild(node.firstChild);
  }
}

/** A definition-style row used across the workbench and the evidence rail. */
export function row(label: string, value: Child, className = 'kv'): HTMLElement {
  return el('div', { class: className }, el('div', { class: 'kv-key', text: label }), el('div', { class: 'kv-value' }, value));
}

/** A muted note. Never used to carry a failure - notices have their own component. */
export function note(text: string): HTMLElement {
  return el('p', { class: 'note', text });
}

export function badge(text: string, variant: string): HTMLElement {
  return el('span', { class: `badge badge-${variant}`, text });
}

export function listItem(...children: Child[]): HTMLElement {
  return el('li', { class: 'plain-item' }, ...children);
}
