import { Container } from "@cloudflare/containers";
export interface Env {
    LIVEQUEST_CONTAINER: DurableObjectNamespace;
    SUPABASE_SSR_MODULE_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    OPENAI_API_KEY?: string;
}
export declare class LivequestContainer extends Container {
    defaultPort: number;
    sleepAfter: string;
    envVars: Record<string, string>;
    onStart(): Promise<void>;
    onStop(): void;
    onError(error: unknown): void;
}
declare const _default: {
    fetch(request: Request, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map