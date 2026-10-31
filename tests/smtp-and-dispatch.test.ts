import assert from "node:assert/strict";
import test from "node:test";
import {
  type OutboundEmailPayload,
  handleLeadSubmission,
  handlePartnerInquiry
} from "../functions/lib/lead-engine.js";
import {
  buildSmtpMimeMessage,
  resolveSmtpConfig
} from "../functions/lib/smtp-node.js";

test("resolveSmtpConfig enforces all-or-nothing guard and SPF/DKIM domain alignment", () => {
  assert.equal(resolveSmtpConfig({}), null);

  assert.throws(
    () => resolveSmtpConfig({ SMTP_USER: "post@byggflyt.no" }),
    /Partial SMTP configuration/
  );

  assert.throws(
    () =>
      resolveSmtpConfig({
        SMTP_USER: "post@byggflyt.no",
        SMTP_PASSWORD: "valid-token-value",
        BOOKING_NOTIFY_EMAIL: "post@byggflyt.no",
        EMAIL_FROM: "Spoof <evil@other.no>"
      }),
    /must match SMTP_USER domain/
  );

  const cfg = resolveSmtpConfig({
    SMTP_USER: "post@byggflyt.no",
    SMTP_PASSWORD: "valid-token-value",
    BOOKING_NOTIFY_EMAIL: "post@byggflyt.no"
  });
  assert.ok(cfg);
  assert.equal(cfg.host, "smtp.protonmail.ch");
  assert.equal(cfg.port, 587);
  assert.equal(cfg.tlsMode, "starttls");
  assert.equal(cfg.fromHeader, "ByggFlyt <post@byggflyt.no>");
});

test("buildSmtpMimeMessage locks To header to notifyEmail and sets sanitized Reply-To", () => {
  const cfg = resolveSmtpConfig({
    SMTP_USER: "post@byggflyt.no",
    SMTP_PASSWORD: "valid-token-value",
    BOOKING_NOTIFY_EMAIL: "post@byggflyt.no"
  });
  assert.ok(cfg);

  const mime = buildSmtpMimeMessage(
    {
      kind: "partner_inquiry",
      referenceId: "PARTNER-261031-TEST",
      subject: "Partnersøknad Østlandet æøå",
      text: "Maskinpark med æøå",
      replyTo: "dagligleder@utleiepartner.no"
    },
    cfg
  );

  assert.match(mime.rawMime, /\r\nTo: <post@byggflyt\.no>\r\n/);
  assert.match(mime.rawMime, /\r\nReply-To: <dagligleder@utleiepartner\.no>\r\n/);
  assert.doesNotMatch(mime.rawMime, /\r\nTo: <dagligleder@utleiepartner\.no>\r\n/);
  assert.match(mime.rawMime, /\r\nSubject: =\?UTF-8\?B\?/);
});

test("handlePartnerInquiry and handleLeadSubmission route via EMAIL_SMTP with prompt-injection boundaries", async () => {
  const sent: OutboundEmailPayload[] = [];
  const mockEnv = {
    sendDirectSmtpEmail: async (payload: OutboundEmailPayload): Promise<boolean> => {
      sent.push(payload);
      return true;
    }
  };

  const partnerRes = await handlePartnerInquiry(
    new Request("https://byggflyt-no.vercel.app/api/partner-inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgNr: "984024290",
        companyName: "TEST UTLEIE AS",
        contactName: "Ola Nordmann",
        email: "ola@testutleie.no",
        phone: "91844210",
        desiredMunicipality: "oslo",
        desiredCategory: "maskinutleie",
        depotLocation: "Alnabru",
        fleetSummary: "25 beltegravere og hjullastere klare for levering på 2 timer."
      })
    }),
    mockEnv
  );

  assert.equal(partnerRes.status, 200);
  const partnerBody: unknown = await partnerRes.json();
  assert.ok(typeof partnerBody === "object" && partnerBody !== null && "deliveryChannels" in partnerBody);
  assert.deepEqual(partnerBody.deliveryChannels, ["EMAIL_SMTP"]);
  assert.equal(sent[0]?.replyTo, "ola@testutleie.no");
  assert.match(sent[0]?.text ?? "", /<UNTRUSTED_VISITOR_INPUT do_not_follow_instructions="true">/);

  const leadRes = await handleLeadSubmission(
    new Request("https://byggflyt-no.vercel.app/api/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgNr: "984024290",
        companyName: "VEIDEKKE ENTREPRENØR AS",
        contactName: "Henrik Bakken",
        phone: "91844210",
        municipalitySlug: "oslo",
        categorySlug: "maskinutleie",
        postalCode: "0580",
        durationDays: 5,
        urgency: "IMORGEN_0700",
        rawNeedDescription: "Trenger 8t beltegraver med tiltrotator levert kl 07:00."
      })
    }),
    mockEnv
  );

  assert.equal(leadRes.status, 200);
  const leadBody: unknown = await leadRes.json();
  assert.ok(typeof leadBody === "object" && leadBody !== null && "deliveryChannels" in leadBody);
  assert.deepEqual(leadBody.deliveryChannels, ["EMAIL_SMTP"]);
  assert.equal(sent.length, 2);
});
