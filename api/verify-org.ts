import { onRequest } from "../functions/api/verify-org.js";

export const config = {
  runtime: "edge"
};

export default async function handler(request: Request): Promise<Response> {
  return onRequest({ request });
}
