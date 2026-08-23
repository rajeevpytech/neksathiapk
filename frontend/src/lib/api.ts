import { storage } from "@/src/utils/storage";

export const TOKEN_KEY = "neksathi_token";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function parseDetail(data: any, fallback: string): string {
  if (!data) return fallback;
  const d = data.detail ?? data.message ?? data.error;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) {
    const first = d[0];
    if (first?.msg) return first.msg;
  }
  return fallback;
}

type Opts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  auth?: boolean; // default true
  timeoutMs?: number;
};

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, auth = true, timeoutMs = 30000 } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") throw new ApiError("Request timed out. Please try again.", 0);
    throw new ApiError("Network error. Check your connection.", 0);
  }
  clearTimeout(timer);

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(parseDetail(data, `Request failed (${res.status})`), res.status);
  }
  return data as T;
}
