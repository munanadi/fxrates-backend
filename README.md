# FX Rates fetcher

Edge function to fetch fx rates every hour and write to a DB in Supabase

---

## Tech used

1. [Deno edge functions](https://supabase.com/docs/guides/functions) from Supabase
2. [Supabase](https://supabase.com/) tables to store data in Postgres
3. [PG_NET](https://supabase.com/docs/guides/database/extensions/pg_net) plugin from Supabase to make edge function calls to add data table
4. [PG_CRON](https://supabase.com/docs/guides/database/extensions/pg_cron) plugin to call a corn job to add data periodically.
5. [Oak](https://github.com/oakserver/oak) server. Think express for Deno runtime.
6. Deno runtime because supabase supports it. (Almost has Node.js parity for APIs, making porting over easy)

---

## Dev setup

1. Sign up for some service that provides FX rates.
2. Sign up for [supabase](https://supabase.com/)
3. Create a table called 'fx-rates' that is of the schema described below

```sql
  create table
  public.fx - rates (
    id uuid not null default gen_random_uuid (),
    timestamp timestamp with time zone null default now(),
    base character varying null,
    quote character varying null,
    price real null,
    constraint fx - rates_pkey primary key (id)
  ) tablespace pg_default;
```

4. Setup RLS policies to allow access to our DB
5. Enable extension `PG_CRON` and `PG_NET` to allow for cron jobs and requests over https
6. [Install](https://supabase.com/docs/guides/cli) the supabase CLI locally and link your project.
7. `supabase functions new [FUNCTION_NAME]` will create a edge function
8. `supabase function deploy [FUNCTION_NAME]` will deploy them to the edge.
9. `supabase secrets set KEY VALUE` to set the secret obtained from step 1.
10. Run the below query in SQL_EDITOR to enable the cron job.

```sql
select
  cron.schedule(
    'fetch-fxrates-every-hr', -- name of cron
    '1 * * * *', -- every hour
    $$
    select
      net.http_post(
          url:='PROJECT_URL/functions/v1/fetch-fxrates',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_TOKEN"}'::jsonb
        ) as request_id;
    $$
  );
```

11. Get the `SERVICE_ANON_TOKEN` from your project to make the requests.

---

## Edge functions

#### 1. `fetch-fxrates`

This will fetch the fxrates from [here](https://openexchangerates.org/) and store them in our PG table in supabase

To hit the only endpoint of this function

```bash
curl -i --location --request POST 'PROJECT_URL/functions/v1/fetch-fxrates' \
  --header 'Authorization: Bearer SERVICE_ROLE_TOKEN' \
  --header 'Content-Type: application/json'
```

---

#### 2. `fx-server`

This exposes a endpoint to read and set data to our table with the endpoint `PROJECT_URL/functions/v1/fx-server/`

> `ENDPOINT` = `PROJECT_URL/functions/v1/fx-server/`

For health check of this server hit `/`

```bash
curl -i --location --request GET ENDPOINT \
  --header 'Authorization: Bearer SERVICE_ROLE_TOKEN
```

---

To get all fx rates entries of a `base` and `quote` currency. Both are 3 letter uppercase country codes like `INR`, `USD` etc.

```bash
curl -i --location --request GET ENDPOINT/[base_currency]/[quote_currency] \
  --header 'Authorization: Bearer SERVICE_ROLE_TOKEN'
```

---

To set a price for a `base` and `quote` currency.

Make sure `base`, `quote` are 3 letter currency code. `price` needs to be a float

```bash
curl -i --location --request PSOT ENDPOINT \
  --header 'Authorization: Bearer SERVICE_ROLE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"base":"USD", "quote":"INR", "price": 81.01}'
```

---

## Project env variables

`PROJECT_URL` is `https://qodaqyywtayabxzvhjoc.supabase.co`

`SERVICE_ANON_TOKEN` is `...`
