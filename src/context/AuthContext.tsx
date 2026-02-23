import React, { createContext, useContext, useState, useEffect } from 'react';

export interface OdooCredentials {
    serverUrl: string;
    database: string;
    username: string;
    password?: string;
    uid?: number;
}

interface AuthContextType {
    credentials: OdooCredentials | null;
    login: (credentials: OdooCredentials) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [credentials, setCredentials] = useState<OdooCredentials | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('odoo_auth');
        if (stored) {
            try {
                setCredentials(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse stored credentials", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const login = (newCredentials: OdooCredentials) => {
        setCredentials(newCredentials);
        localStorage.setItem('odoo_auth', JSON.stringify(newCredentials));
    };

    const logout = () => {
        setCredentials(null);
        localStorage.removeItem('odoo_auth');
    };

    if (!isLoaded) return null;

    return (
        <AuthContext.Provider value={{ credentials, login, logout, isAuthenticated: !!credentials?.uid }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
