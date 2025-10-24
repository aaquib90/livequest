"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LivequestContainer = void 0;
const containers_1 = require("@cloudflare/containers");
class LivequestContainer extends containers_1.Container {
    defaultPort = 3000;
    sleepAfter = "5m";
    envVars = {
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
    };
    async onStart() {
        console.log("Livequest container started");
    }
    onStop() {
        console.log("Livequest container stopped");
    }
    onError(error) {
        console.error("Livequest container error:", error);
    }
}
exports.LivequestContainer = LivequestContainer;
function populateEnv(container, env) {
    container.envVars.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
    container.envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    container.envVars.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    if (env.OPENAI_API_KEY) {
        container.envVars.OPENAI_API_KEY = env.OPENAI_API_KEY;
    }
    if (env.SUPABASE_SSR_MODULE_URL) {
        container.envVars.SUPABASE_SSR_MODULE_URL = env.SUPABASE_SSR_MODULE_URL;
    }
}
exports.default = {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/container/")) {
            const container = env.LIVEQUEST_CONTAINER.getByName(url.pathname).stub();
            populateEnv(container, env);
            return container.fetch(request);
        }
        if (url.pathname.startsWith("/lb")) {
            const container = await (0, containers_1.getRandom)(env.LIVEQUEST_CONTAINER, 3, (instance) => populateEnv(instance, env));
            return container.fetch(request);
        }
        const id = env.LIVEQUEST_CONTAINER.idFromName("livequest-singleton");
        const container = env.LIVEQUEST_CONTAINER.get(id).stub();
        populateEnv(container, env);
        return container.fetch(request);
    },
};
//# sourceMappingURL=index.js.map