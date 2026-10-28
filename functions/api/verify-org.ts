import { SHARED_API_HEADERS, handleOrgVerification } from "../lib/lead-engine.js";

export const onRequestGet = async (context: { request: Request }): Promise<Response> => {
  return handleOrgVerification(context.request.url);
};

export const onRequest = async (context: { request: Request }): Promise<Response> => {
  if (context.request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Kun GET er støttet." }), {
      status: 405,
      headers: { ...SHARED_API_HEADERS, Allow: "GET" }
    });
  }
  return handleOrgVerification(context.request.url);
};
