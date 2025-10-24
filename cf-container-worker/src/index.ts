/// <reference types="@cloudflare/workers-types" />

import { Container, getRandom } from "@cloudflare/containers";
import type { DurableObjectNamespace } from "@cloudflare/workers-types";

export interface Env {
  LIVEQUEST_CONTAINER: DurableObjectNamespace;
  SUPABASE_SSR_MODULE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY?: string;
}

export class LivequestContainer extends Container<Env> {
  constructor(state: any, env: Env) {
    super(state, env);
    this.defaultPort = 3000;
    this.sleepAfter = "5m";
    this.envVars = {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      ...(env.OPENAI_API_KEY ? { OPENAI_API_KEY: env.OPENAI_API_KEY } : {}),
      ...(env.SUPABASE_SSR_MODULE_URL
        ? { SUPABASE_SSR_MODULE_URL: env.SUPABASE_SSR_MODULE_URL }
        : {}),
    };
  }

  override async onStart() {
    console.log("Livequest container started");
  }

  override onStop() {
    console.log("Livequest container stopped");
  }

  override onError(error: unknown) {
    console.error("Livequest container error:", error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/container/")) {
      const id = env.LIVEQUEST_CONTAINER.idFromName(url.pathname);
      const container = env.LIVEQUEST_CONTAINER.get(id);
      return container.fetch(request);
    }

    if (url.pathname.startsWith("/lb")) {
      const container = await getRandom(env.LIVEQUEST_CONTAINER as any, 3);
      return container.fetch(request);
    }

    const id = env.LIVEQUEST_CONTAINER.idFromName("livequest-singleton");
    const container = env.LIVEQUEST_CONTAINER.get(id);
    return container.fetch(request);
  },
};
