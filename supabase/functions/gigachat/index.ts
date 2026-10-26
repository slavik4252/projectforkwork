// GigaChat proxy edge function.
// Obtains an OAuth access token (cached in the gigachat_tokens table),
// forwards the visitor's chat history to GigaChat, and returns the
// assistant reply. A lead-generation system prompt turns GigaChat into
// an AI agent that qualifies visitors and collects contact info.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getGigaChatEndpoint(secretName: string, path: string): string {
  const configured = Deno.env.get(secretName)?.trim();
  if (configured && configured.startsWith("https://")) {
    return configured.endsWith(path) ? configured : `${configured.replace(/\/$/, "")}${path}`;
  }
  return `https://api.giga.chat${path}`;
}

const GIGACHAT_API_URL = getGigaChatEndpoint(
  "GIGACHAT_API_URL",
  "/v1/chat/completions",
);
const GIGACHAT_AUTH_URL = getGigaChatEndpoint(
  "GIGACHAT_AUTH_URL",
  "/api/v2/oauth",
);
const GIGACHAT_SCOPE = Deno.env.get("GIGACHAT_SCOPE") ?? "GIGACHAT_API_PERS";
const GIGACHAT_MODEL = Deno.env.get("GIGACHAT_MODEL") ?? "GigaChat";
const russianTrustedRootCa = `-----BEGIN CERTIFICATE-----
MIIFwjCCA6qgAwIBAgICEAAwDQYJKoZIhvcNAQELBQAwcDELMAkGA1UEBhMCUlUx
PzA9BgNVBAoMNlRoZSBNaW5pc3RyeSBvZiBEaWdpdGFsIERldmVsb3BtZW50IGFu
ZCBDb21tdW5pY2F0aW9uczEgMB4GA1UEAwwXUnVzc2lhbiBUcnVzdGVkIFJvb3Qg
Q0EwHhcNMjIwMzAxMjEwNDE1WhcNMzIwMjI3MjEwNDE1WjBwMQswCQYDVQQGEwJS
VTE/MD0GA1UECgw2VGhlIE1pbmlzdHJ5IG9mIERpZ2l0YWwgRGV2ZWxvcG1lbnQg
YW5kIENvbW11bmljYXRpb25zMSAwHgYDVQQDDBdSdXNzaWFuIFRydXN0ZWQgUm9v
dCBDQTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAMfFOZ8pUAL3+r2n
qqE0Zp52selXsKGFYoG0GM5bwz1bSFtCt+AZQMhkWQheI3poZAToYJu69pHLKS6Q
XBiwBC1cvzYmUYKMYZC7jE5YhEU2bSL0mX7NaMxMDmH2/NwuOVRj8OImVa5s1F4U
zn4Kv3PFlDBjjSjXKVY9kmjUBsXQrIHeaqmUIsPIlNWUnimXS0I0abExqkbdrXbX
YwCOXhOO2pDUx3ckmJlCMUGacUTnylyQW2VsJIyIGA8V0xzdaeUXg0VZ6ZmNUr5Y
Ber/EAOLPb8NYpsAhJe2mXjMB/J9HNsoFMBFJ0lLOT/+dQvjbdRZoOT8eqJpWnVD
U+QL/qEZnz57N88OWM3rabJkRNdU/Z7x5SFIM9FrqtN8xewsiBWBI0K6XFuOBOTD
4V08o4TzJ8+Ccq5XlCUW2L48pZNCYuBDfBh7FxkB7qDgGDiaftEkZZfApRg2E+M9
G8wkNKTPLDc4wH0FDTijhgxR3Y4PiS1HL2Zhw7bD3CbslmEGgfnnZojNkJtcLeBH
BLa52/dSwNU4WWLubaYSiAmA9IUMX1/RpfpxOxd4Ykmhz97oFbUaDJFipIggx5sX
ePAlkTdWnv+RWBxlJwMQ25oEHmRguNYf4Zr/Rxr9cS93Y+mdXIZaBEE0KS2iLRqa
OiWBki9IMQU4phqPOBAaG7A+eP8PAgMBAAGjZjBkMB0GA1UdDgQWBBTh0YHlzlpf
BKrS6badZrHF+qwshzAfBgNVHSMEGDAWgBTh0YHlzlpfBKrS6badZrHF+qwshzAS
BgNVHRMBAf8ECDAGAQH/AgEEMA4GA1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsF
AAOCAgEAALIY1wkilt/urfEVM5vKzr6utOeDWCUczmWX/RX4ljpRdgF+5fAIS4vH
tmXkqpSCOVeWUrJV9QvZn6L227ZwuE15cWi8DCDal3Ue90WgAJJZMfTshN4OI8cq
W9E4EG9wglbEtMnObHlms8F3CHmrw3k6KmUkWGoa+/ENmcVl68u/cMRl1JbW2bM+
/3A+SAg2c6iPDlehczKx2oa95QW0SkPPWGuNA/CE8CpyANIhu9XFrj3RQ3EqeRcS
AQQod1RNuHpfETLU/A2gMmvn/w/sx7TB3W5BPs6rprOA37tutPq9u6FTZOcG1Oqj
C/B7yTqgI7rbyvox7DEXoX7rIiEqyNNUguTk/u3SZ4VXE2kmxdmSh3TQvybfbnXV
4JbCZVaqiZraqc7oZMnRoWrXRG3ztbnbes/9qhRGI7PqXqeKJBztxRTEVj8ONs1d
WN5szTwaPIvhkhO3CO5ErU2rVdUr89wKpNXbBODFKRtgxUT70YpmJ46VVaqdAhOZ
D9EUUn4YaeLaS8AjSF/h7UkjOibNc4qVDiPP+rkehFWM66PVnP1Msh93tc+taIfC
EYVMxjh8zNbFuoc7fzvvrFILLe7ifvEIUqSVIC/AzplM/Jxw7buXFeGP1qVCBEHq
391d/9RAfaZ12zkwFsl+IKwE/OZxW8AHa9i1p4GO0YSNuczzEm4=
-----END CERTIFICATE-----`;
const denoWithHttpClient = Deno as unknown as {
  createHttpClient?: (options: {
    caCerts?: string[];
    unsafelyIgnoreCertificateErrors?: string[];
  }) => unknown;
};
function gigaChatFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const client = denoWithHttpClient.createHttpClient?.({
    caCerts: [russianTrustedRootCa],
    unsafelyIgnoreCertificateErrors: ["api.giga.chat"],
  });
  return fetch(input, {
    ...init,
    ...(client ? { client } : {}),
  } as RequestInit);
}

const SYSTEM_PROMPT = `Ты — ИИ-агент лидогенерационного агентства «testrassilka». Твоя задача — общаться с посетителями сайта, квалифицировать их как потенциальных клиентов и собирать контакты для передачи тёплой заявки в CRM.

Стиль общения:
- Дружелюбный, деловой, на «вы», на русском языке.
- Короткие сообщения (2-4 предложения), без воды.
- Задавай уточняющие вопросы по одному, не кучей.

Сценарий квалификации:
1. Приветствие и вопрос о бизнесе посетителя (ниша, чем занимается).
2. Узнай, какие каналы сейчас использует (Telegram, WhatsApp, холодные звонки, email).
3. Узнай главную цель (больше заявок, дешевле лид, выход на новый рынок).
4. Узнай объём — сколько контактов в месяц хотел бы обрабатывать.
5. Предложи тестовый запуск в его нише (от 1500 контактов).
6. Попроси оставить контакт (телефон, email или Telegram) — «передам менеджеру, он свяжется и покажет, как сервис сработает в вашей нише».

Как только посетитель дал контакт — поблагодари, скажи что заявка передана в CRM и менеджер свяжется в течение дня. Заверши диалог кратко.

Никогда не обещай точных цифр результатов, не называй цену до согласования с менеджером, не упоминай конкурентов. Если вопрос вне темы — мягко возвращай к сути.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// --- Supabase helpers (service role, bypasses RLS) ----------------------

async function getStoredToken(): Promise<{ token: string; expiresAt: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gigachat_tokens?id=eq.1&select=access_token,expires_at`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const row = rows[0];
  return { token: row.access_token, expiresAt: row.expires_at };
}

async function storeToken(token: string, expiresAt: Date): Promise<void> {
  const body = JSON.stringify({
    id: 1,
    access_token: token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/gigachat_tokens?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body,
  });
  // If no row existed, PATCH affects 0 rows — insert instead.
  await fetch(`${SUPABASE_URL}/rest/v1/gigachat_tokens`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body,
  });
}

// --- GigaChat OAuth ------------------------------------------------------

async function fetchAccessToken(): Promise<{ token: string; expiresAt: Date }> {
  const credentials = Deno.env.get("GIGACHAT_CREDENTIALS");
  if (!credentials) throw new Error("GIGACHAT_CREDENTIALS secret not set");

  const rqUid = crypto.randomUUID();
  const body = new URLSearchParams();
  body.append("scope", GIGACHAT_SCOPE);

  const res = await gigaChatFetch(GIGACHAT_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "RqUID": rqUid,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GigaChat OAuth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const token = data.access_token as string;
  // Token lives ~30 min; expire a minute early to be safe.
  const expiresAt = new Date(Date.now() + 29 * 60 * 1000);
  return { token, expiresAt };
}

async function getAccessToken(): Promise<string> {
  const stored = await getStoredToken();
  if (stored && new Date(stored.expiresAt) > new Date(Date.now() + 60 * 1000)) {
    return stored.token;
  }
  const { token, expiresAt } = await fetchAccessToken();
  await storeToken(token, expiresAt);
  return token;
}

// --- GigaChat chat completion -------------------------------------------

async function getAvailableChatModel(token: string): Promise<string> {
  const modelsUrl = new URL(GIGACHAT_API_URL);
  modelsUrl.pathname = modelsUrl.pathname.replace(
    /\/v1\/chat\/completions$/,
    "/v1/models",
  );

  const res = await gigaChatFetch(modelsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return GIGACHAT_MODEL;

  const data = await res.json();
  const models = Array.isArray(data?.data) ? data.data : [];
  const modelIds = models
    .map((model: { id?: unknown }) => model.id)
    .filter((id: unknown): id is string => typeof id === "string");

  if (modelIds.includes(GIGACHAT_MODEL)) return GIGACHAT_MODEL;
  return modelIds.find((id) => id.startsWith("GigaChat")) ?? GIGACHAT_MODEL;
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const token = await getAccessToken();
  const model = await getAvailableChatModel(token);
  const res = await gigaChatFetch(GIGACHAT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GigaChat completion failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("GigaChat returned no content");
  return content;
}

// --- Handler ------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    // Prepend the system prompt so every conversation stays on-task.
    const full: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const content = await chatCompletion(full);
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
