import {
  type LeadEngineEnv,
  SHARED_API_HEADERS,
  handleLeadSubmission
} from "../lib/lead-engine.js";

export const onRequestPost = async (context: {
  request: Request;
  env: LeadEngineEnv;
}): Promise<Response> => {
  return handleLeadSubmission(context.request, context.env);
};

export const onRequest = async (context: {
  request: Request;
  env: LeadEngineEnv;
}): Promise<Response> => {
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Kun POST er støttet." }), {
      status: 405,
      headers: { ...SHARED_API_HEADERS, Allow: "POST" }
    });
  }
  return handleLeadSubmission(context.request, context.env);
};
