import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Copies of this site deployed elsewhere (e.g. a user's own Cloudflare account via GitHub)
// don't have the private backend keys. In that case, forward server calls to the main site.
const MAIN_SITE = "https://pulse-map-website-hub.lovable.app";

function hasBackendKeys(env: unknown): boolean {
  const e = (env ?? {}) as Record<string, unknown>;
  let fromProcess: string | undefined;
  try {
    fromProcess = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  } catch {
    fromProcess = undefined;
  }
  return Boolean(fromProcess || e["SUPABASE_SERVICE_ROLE_KEY"]);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      const isServerCall = url.pathname.startsWith("/_serverFn/") || url.pathname.startsWith("/api/");
      if (isServerCall && !hasBackendKeys(env) && !url.origin.startsWith(MAIN_SITE)) {
        const target = MAIN_SITE + url.pathname + url.search;
        const headers = new Headers(request.headers);
        headers.delete("host");
        return await fetch(target, {
          method: request.method,
          headers,
          body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
          redirect: "manual",
        });
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
