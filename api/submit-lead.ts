import { onRequest } from "../functions/api/submit-lead.js";
import { createSmtpDispatcherFromEnv } from "../functions/lib/smtp-node.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const sendDirectSmtpEmail = createSmtpDispatcherFromEnv(process.env);
    return onRequest({
      request,
      env: {
        PARTNER_WEBHOOK_URL: process.env["PARTNER_WEBHOOK_URL"],
        SLACK_WEBHOOK_URL: process.env["SLACK_WEBHOOK_URL"],
        RESEND_API_KEY: process.env["RESEND_API_KEY"],
        LEAD_NOTIFY_EMAIL: process.env["BOOKING_NOTIFY_EMAIL"] ?? process.env["LEAD_NOTIFY_EMAIL"],
        LEAD_FROM_EMAIL: process.env["EMAIL_FROM"] ?? process.env["LEAD_FROM_EMAIL"],
        ...(sendDirectSmtpEmail ? { sendDirectSmtpEmail } : {})
      }
    });
  }
};
