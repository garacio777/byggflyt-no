import type { z } from "zod";

/** Helpers that turn urlencoded form fields into plain objects for Zod `.safeParse()`. */
export function field(form: URLSearchParams, name: string): string {
  return form.get(name) ?? "";
}

export function list(form: URLSearchParams, name: string): string[] {
  return form.getAll(name);
}

/** Integer input; empty string becomes undefined so optional schema fields stay optional. */
export function int(form: URLSearchParams, name: string): number | undefined {
  const raw = (form.get(name) ?? "").trim().replace(/\s+/g, "");
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function decimal(form: URLSearchParams, name: string): number | undefined {
  const raw = (form.get(name) ?? "").trim().replace(",", ".");
  if (raw === "") return undefined;
  return Number(raw);
}

export function checked(form: URLSearchParams, name: string): boolean {
  return form.get(name) === "on";
}

export function commaList(form: URLSearchParams, name: string): string[] {
  return field(form, name)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function zodMessage(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join(" · ");
}
