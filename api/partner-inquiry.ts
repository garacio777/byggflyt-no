import { onRequest } from "../functions/api/partner-inquiry.js";

export const config = {
  runtime: "edge"
};

declare const process: { env: Record<string, string | undefined> };

export default async function handler(request: Request): Promise<Response> {
  return onRequest({
    request,
    env: {
      PARTNER_WEBHOOK_URL: process.env["PARTNER_WEBHOOK_URL"],
      SLACK_WEBHOOK_URL: process.env["SLACK_WEBHOOK_URL"],
      RESEND_API_KEY: process.env["RESEND_API_KEY"],
      LEAD_NOTIFY_EMAIL: process.env["LEAD_NOTIFY_EMAIL"],
      LEAD_FROM_EMAIL: process.env["LEAD_FROM_EMAIL"]
    }
  });
}
