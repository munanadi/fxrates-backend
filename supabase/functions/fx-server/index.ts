// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  Application,
  Router,
} from "https://deno.land/x/oak/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Oak Server!");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  {
    auth: {
      persistSession: false,
    },
  }
);

const router = new Router();
router
  // Note: path should be prefixed with function name
  .get("/fx-server", (context) => {
    context.response.body =
      "Health check! Server is up and running!";
  })
  .get(
    "/fx-server/:baseCurr/:quoteCurr",
    async (context) => {
      // TODO: handle with proper error if country code is not a 3 letter match.
      const baseCurrency =
        context.params.baseCurr.toUpperCase();
      const quoteCurrecny =
        context.params.quoteCurr.toUpperCase();

      const { data, error, count } = await supabase
        .from("fx-rates")
        .select()
        .eq("base", baseCurrency)
        .eq("quote", quoteCurrecny);

      console.log(data, error, count);

      context.response.body = { data, error, count };
    }
  )
  .post("/fx-server/set-price", async (context) => {
    // Note: request body will be streamed to the function as chunks, set limit to 0 to fully read it.
    const result = context.request.body({
      type: "json",
      limit: 0,
    });
    const body = await result.value;
    // TODO: Throw error if params are not matched.
    const baseCurr = body.base.toUpperCase() || "USD";
    const quoteCurr = body.quote.toUpperCase() || "INR";
    const price = parseFloat(body.price) || 0.0;

    const { data, error } = await supabase
      .from("fx-rates")
      .insert({
        base: baseCurr,
        quote: quoteCurr,
        price,
      })
      .select();

    context.response.body = { data, error };
  });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });

// To invoke:
// curl -i --location --request POST 'https://qodaqyywtayabxzvhjoc.supabase.co/functions/v1/oak-server' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZGFxeXl3dGF5YWJ4enZoam9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk4MDE3NDEsImV4cCI6MjAwNTM3Nzc0MX0.6jNrPBcjDuxDKkGgmeehiq03tvYxMsgGWh-ZZUpY4vM' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
