import { defineConfig } from "astro/config";

// Fail-closed build guard: SMTP_USER, SMTP_PASSWORD, and BOOKING_NOTIFY_EMAIL must all be set together or all left unset.
(function assertAllOrNothingSmtpEnv(env) {
  const user = (env.SMTP_USER ?? "").trim();
  const pass = (env.SMTP_PASSWORD ?? "").trim();
  const explicitNotify = (env.BOOKING_NOTIFY_EMAIL ?? "").trim();
  const notify =
    explicitNotify.length > 0
      ? explicitNotify
      : user.length > 0 || pass.length > 0
        ? (env.LEAD_NOTIFY_EMAIL ?? "").trim()
        : "";

  const entries = [
    ["SMTP_USER", user],
    ["SMTP_PASSWORD", pass],
    ["BOOKING_NOTIFY_EMAIL", notify]
  ];
  const populated = entries.filter(([, v]) => v.length > 0).map(([k]) => k);
  if (populated.length > 0 && populated.length < entries.length) {
    const missing = entries.filter(([, v]) => v.length === 0).map(([k]) => k);
    throw new Error(
      `[astro.config] Partial SMTP configuration: set SMTP_USER, SMTP_PASSWORD, and BOOKING_NOTIFY_EMAIL together, or leave all three unset (set: ${populated.join(", ")}; missing: ${missing.join(", ")}).`
    );
  }
})(process.env);

export default defineConfig({
  site: "https://byggflyt-no.vercel.app",
  output: "static",
  trailingSlash: "always",
  build: {
    inlineStylesheets: "never"
  },
  vite: {
    build: {
      sourcemap: false
    }
  }
});
