/** Auto-escaping HTML templating. Interpolated values are escaped unless wrapped in SafeHtml. */
export class SafeHtml {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  toString(): string {
    return this.value;
  }
}

type HtmlValue = SafeHtml | string | number | boolean | null | undefined | readonly HtmlValue[];

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(value: HtmlValue): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map((v: HtmlValue) => render(v)).join("");
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml {
  let out = "";
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += render(values[i]);
  });
  return new SafeHtml(out);
}

export interface PageOptions {
  readonly title: string;
  readonly brand: string;
  readonly nav?: SafeHtml;
  readonly flashOk?: string | null;
  readonly flashErr?: string | null;
  readonly body: SafeHtml;
}

export function page(opts: PageOptions): string {
  return `<!doctype html>${html`<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${opts.title} · ${opts.brand}</title>
<link rel="stylesheet" href="/platform.css">
</head>
<body>
<header class="topbar"><strong>${opts.brand}</strong>${opts.nav ?? ""}</header>
<main class="wrap">
${opts.flashOk ? html`<p class="flash ok" role="status">${opts.flashOk}</p>` : ""}
${opts.flashErr ? html`<p class="flash err" role="alert">${opts.flashErr}</p>` : ""}
${opts.body}
</main>
</body>
</html>`.value}`;
}

export function csrfField(token: string): SafeHtml {
  return html`<input type="hidden" name="csrf" value="${token}">`;
}

export function checkbox(name: string, value: string, label: string, checked: boolean): SafeHtml {
  return html`<label class="check"><input type="checkbox" name="${name}" value="${value}"${
    checked ? new SafeHtml(" checked") : ""
  }> ${label}</label>`;
}

export function selectOptions(
  options: readonly { readonly value: string; readonly label: string }[],
  selected: string | null
): SafeHtml {
  return html`${options.map(
    (o) =>
      html`<option value="${o.value}"${o.value === selected ? new SafeHtml(" selected") : ""}>${o.label}</option>`
  )}`;
}

export function formatNok(value: number): string {
  return `${new Intl.NumberFormat("nb-NO").format(value)} kr`;
}
