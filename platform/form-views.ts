import { html, type SafeHtml } from "./html.ts";

export interface InputSpec {
  readonly name: string;
  readonly label: string;
  readonly type?: string;
  readonly value?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly autocomplete?: string;
}

/** Renders one labelled input. Attribute values are escaped by the html tag. */
export function input(spec: InputSpec): SafeHtml {
  return html`<label>${spec.label} <input name="${spec.name}" type="${spec.type ?? "text"}" value="${spec.value ?? ""}" maxlength="${spec.maxLength ?? 200}" autocomplete="${spec.autocomplete ?? "off"}"${spec.required === false ? "" : html` required`}></label>`;
}

/** Simple POST form wrapper used by sign-in style pages. */
export function simpleForm(action: string, fields: readonly InputSpec[], submitLabel: string, extra: SafeHtml | string = ""): SafeHtml {
  return html`<form method="post" action="${action}">${fields.map(input)}${extra}<button type="submit">${submitLabel}</button></form>`;
}
