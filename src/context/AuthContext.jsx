import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("mm_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("mm_token"); setToken(null);
    }).finally(() => setLoading(false));
  }, [token]);

  const login = async (username, password, phone = null) => {
    const r = await api.post("/auth/login", phone ? { phone, password } : { username, password });
    localStorage.setItem("mm_token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const otpRequest = async (phone) => {
    const r = await api.post("/auth/otp/request", { phone });
    return r.data; // {ok, expires_in, debug_otp?}
  };

  const otpVerify = async (phone, otp, name = "") => {
    const r = await api.post("/auth/otp/verify", { phone, otp, name });
    localStorage.setItem("mm_token", r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("mm_token");
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, otpRequest, otpVerify }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Register service worker for PWA installability
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
