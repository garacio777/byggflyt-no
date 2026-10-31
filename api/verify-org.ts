import { onRequest } from "../functions/api/verify-org.js";

export default {
  async fetch(request: Request): Promise<Response> {
    return onRequest({ request });
  }
};
