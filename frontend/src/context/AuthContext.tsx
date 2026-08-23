import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";
import { User } from "@/src/lib/types";
import { registerForPush } from "@/src/lib/push";

type AuthResult = { access_token: string; user: User };

type AuthCtx = {
  user: User | null;
  token: string | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone: string }) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const applyAuth = useCallback(async (result: AuthResult) => {
    await storage.secureSet(TOKEN_KEY, result.access_token);
    setToken(result.access_token);
    setUserState(result.user);
    registerForPush(result.user.id).catch(() => {});
  }, []);

  const bootstrap = useCallback(async () => {
    const saved = await storage.secureGet<string>(TOKEN_KEY, "");
    if (saved) {
      setToken(saved);
      try {
        const me = await api<User>("/auth/me");
        setUserState(me);
        registerForPush(me.id).catch(() => {});
      } catch {
        await storage.secureRemove(TOKEN_KEY);
        setToken(null);
        setUserState(null);
      }
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<AuthResult>("/auth/login", { method: "POST", auth: false, body: { email, password } });
      await applyAuth(res);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string; phone: string }) => {
      const res = await api<AuthResult>("/auth/register", { method: "POST", auth: false, body: data });
      await applyAuth(res);
    },
    [applyAuth]
  );

  const requestOtp = useCallback(async (phone: string) => {
    await api("/auth/otp/request", { method: "POST", auth: false, body: { phone } });
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      const res = await api<AuthResult>("/auth/otp/verify", { method: "POST", auth: false, body: { phone, code } });
      await applyAuth(res);
    },
    [applyAuth]
  );

  const logout = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api<User>("/auth/me");
      setUserState(me);
    } catch {
      /* ignore */
    }
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  return (
    <Ctx.Provider
      value={{ user, token, initializing, login, register, requestOtp, verifyOtp, logout, refreshUser, setUser }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
