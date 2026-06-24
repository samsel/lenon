export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `${method} ${path} failed`);
  return data as T;
}
