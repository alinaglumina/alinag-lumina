"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { client, setToken, clearToken } from "@/lib/client";

interface User { id: string; name: string; email: string; role: string; }
interface AuthCtx { user: User | null; loading: boolean; login: (e: string, p: string) => Promise<void>; register: (n: string, e: string, p: string) => Promise<void>; logout: () => Promise<void>; }
const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { try { const u = localStorage.getItem("lumina_user"); if (u) setUser(JSON.parse(u)); } catch {} setLoading(false); }, []);
  const persist = (u: User | null) => { setUser(u); if (u) localStorage.setItem("lumina_user", JSON.stringify(u)); else localStorage.removeItem("lumina_user"); };

  const login = async (email: string, password: string) => {
    const r = await client.post<{ user: User; accessToken: string }>("/auth/login", { email, password });
    setToken(r.accessToken); persist(r.user);
  };
  const register = async (name: string, email: string, password: string) => {
    const r = await client.post<{ user: User; accessToken: string }>("/auth/register", { name, email, password });
    setToken(r.accessToken); persist(r.user);
  };
  const logout = async () => { try { await client.post("/auth/logout"); } catch {} clearToken(); persist(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
