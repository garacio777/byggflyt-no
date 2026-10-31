import {
  resolveSmtpConfig,
  sendSmtpMessage,
  verifySmtpConnection
} from "../functions/lib/smtp-node.js";

async function main(): Promise<void> {
  const authOnly = process.argv.includes("--auth-only");
  const cfg = resolveSmtpConfig(process.env);

  if (!cfg) {
    console.error(
      [
        "[email:test] Direct Mailbox SMTP is not configured.",
        "Set all three required variables in .env or .env.local (never commit secrets):",
        "  SMTP_USER=<mailbox@dittdomene.no>",
        "  SMTP_PASSWORD=<Proton SMTP Submission Token / app-passord>",
        "  BOOKING_NOTIFY_EMAIL=<mailbox@dittdomene.no>"
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `[email:test] Verifying SMTP (${cfg.tlsMode.toUpperCase()}) -> ${cfg.host}:${cfg.port} as ${cfg.user}...`
  );

  if (authOnly) {
    const probe = await verifySmtpConnection(cfg);
    console.log(
      `[email:test] AUTH OK (TLS=${String(probe.tlsUpgraded)}) — Server banner: ${probe.banner}`
    );
    return;
  }

  const stamp = new Date().toISOString();
  const ref = `TEST-${stamp.slice(0, 10).replace(/-/g, "")}`;
  const result = await sendSmtpMessage(
    {
      kind: "partner_inquiry",
      referenceId: ref,
      subject: `[BYGGFLYT TEST] Direkte SMTP-verifisering (${stamp.slice(0, 19)}Z)`,
      text: [
        "✓ ByggFlyt.no Direkte ESMTP-verifisering vellykket!",
        "───────────────────────────────────────────────────",
        `Tidspunkt:   ${stamp}`,
        `Fra:         ${cfg.fromHeader}`,
        `Til:         ${cfg.notifyEmail}`,
        `SMTP-tjener: ${cfg.host}:${cfg.port} (${cfg.tlsMode.toUpperCase()})`,
        "",
        "Både /bli-partner/ (48t territorie-reservasjon) og B2B-bestillinger rutes nå direkte til denne innboksen uten ekstern database eller tredjeparts API."
      ].join("\n")
    },
    cfg
  );

  console.log(`[email:test] DELIVERED OK — Message-ID: ${result.messageId}`);
  console.log(`[email:test] Server response: ${result.smtpResponse}`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[email:test] FAILED: ${msg}`);
  process.exitCode = 1;
});
