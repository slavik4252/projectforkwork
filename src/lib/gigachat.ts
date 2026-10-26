const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gigachat`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export interface GigaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function sendToGigaChat(messages: GigaMessage[]): Promise<string> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`GigaChat request failed (${res.status})`);
  }
  const data = await res.json();
  if (typeof data.content !== "string") {
    throw new Error(data.error || "Пустой ответ от ИИ-агента");
  }
  return data.content as string;
}
