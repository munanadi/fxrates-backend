// // Follow this setup guide to integrate the Deno language server with your editor:
// // https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// console.log("Hello from Functions!");

serve(async (req) => {
  const OPEN_FX_APP_ID = Deno.env.get("OPEN_FX_APP_ID");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const url = `https://openexchangerates.org/api/latest.json?app_id=${OPEN_FX_APP_ID}&base=usd&symbols=inr,eur,cny,jpy,cad,hkd,idr,aed&prettyprint=true`;
  const fxRequest = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  const fxRequestData: any = await fxRequest.json();

  const {
    timestamp,
    base,
    rates,
    description: errorMessage,
  } = fxRequestData;

  const returnData = {
    timestamp,
    base,
    rates,
    error: errorMessage,
  };

  if (errorMessage) {
    return new Response(JSON.stringify(returnData), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const priceMap = Object.keys(rates).map((country) => ({
    base,
    quote: country,
    price: rates[country],
  }));

  const { data, error } = await supabase
    .from("fx-rates")
    .insert(priceMap)
    .select();

  console.log({ error, rowsAdded: data.length });

  return new Response(JSON.stringify(returnData), {
    headers: { "Content-Type": "application/json" },
  });
});
