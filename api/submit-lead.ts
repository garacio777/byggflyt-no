import { onRequest } from "../functions/api/submit-lead.js";

export const config = {
  runtime: "edge"
};

declare const process: { env: Record<string, string | undefined> };

export default async function handler(request: Request): Promise<Response> {
  return onRequest({
    request,
    env: {
      PARTNER_WEBHOOK_URL: process.env["PARTNER_WEBHOOK_URL"]
    }
  });
}
