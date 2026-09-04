import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiClient } from "./apiClient";
import { setAccessTokenForClient } from "./apiClient";

interface AuthUser {
    id: string;
    email: string;
    storeId: string;
    role: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    accessToken: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (storeName: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On app load, try to silently refresh using the HTTP-only cookie.
    useEffect(() => {
        apiClient
            .post<{ accessToken: string; user: AuthUser }>("/api/auth/refresh")
            .then((data) => {
                setAccessTokenForClient(data.accessToken);
                setAccessToken(data.accessToken);
                setUser(data.user);
            })
            .catch(() => {
                // No valid session — that's fine, user just isn't logged in.
                setAccessTokenForClient(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        setAccessTokenForClient(accessToken);
    }, [accessToken]);

    async function login(email: string, password: string) {
        const data = await apiClient.post<{ accessToken: string; user: AuthUser }>(
            "/api/auth/login",
            { email, password },
        );
        setAccessTokenForClient(data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
    }

    async function register(storeName: string, email: string, password: string) {
        await apiClient.post("/api/auth/register", { storeName, email, password });
        await login(email, password);
    }

    async function logout() {
        try {
            await apiClient.post("/api/auth/logout");
        } finally {
            setAccessTokenForClient(null);
            setAccessToken(null);
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}