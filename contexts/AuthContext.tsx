import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AuthContextType, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Checks if the app is running in a frontend-only environment (like AI Studio)
 * where backend authentication is not available.
 * @returns {boolean} True if it's a frontend-only environment.
 */
const isStudioEnv = (): boolean => {
    // For local development with a server, use the real backend.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return false;
    }
    // For production deployments (like AI Studio), check if inside an iframe.
    try {
        return window.self !== window.top;
    } catch (e) {
        // Accessing window.top can throw a cross-origin error, which implies an iframe.
        return true;
    }
};


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // SERVER-SIDE ADMIN CHECK - Secure
    const checkAdminStatus = async (authToken: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/check-admin', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Server admin check:', data.isSuperAdmin, 'for email:', data.email);
                return data.isSuperAdmin;
            }
            console.error('Admin check failed:', response.status, response.statusText);
            return false;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    };

    useEffect(() => {
        // Check for token and user data in localStorage or URL params
        const checkAuth = async () => {
            try {
                // Check URL params first (from OAuth redirect)
                const urlParams = new URLSearchParams(window.location.search);
                const urlToken = urlParams.get('token');
                const urlUser = urlParams.get('user');
                const error = urlParams.get('error');

                if (error) {
                    console.error('Authentication error:', error);
                    setIsLoading(false);
                    return;
                }

                if (urlToken && urlUser) {
                    // Store in localStorage and set state
                    const userData = JSON.parse(decodeURIComponent(urlUser));

                    // SERVER-SIDE ADMIN CHECK
                    const isSuperAdmin = await checkAdminStatus(urlToken);
                    const userWithAdminFlag = {
                        ...userData,
                        isSuperAdmin
                    };

                    localStorage.setItem('authToken', urlToken);
                    localStorage.setItem('userData', JSON.stringify(userWithAdminFlag));
                    setToken(urlToken);
                    setUser(userWithAdminFlag);
                    setIsAuthenticated(true);

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    // Check localStorage
                    const storedToken = localStorage.getItem('authToken');
                    const storedUser = localStorage.getItem('userData');

                    if (storedToken && storedUser) {
                        const userData = JSON.parse(storedUser);

                        // Always recheck admin status from server
                        const isSuperAdmin = await checkAdminStatus(storedToken);
                        const userWithAdminFlag = {
                            ...userData,
                            isSuperAdmin
                        };
                        setToken(storedToken);
                        setUser(userWithAdminFlag);
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('Error checking auth:', error);
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = () => {
        if (isStudioEnv()) {
            console.log("Auth: Bypassing real authentication for Studio environment.");
            const mockUser: User = {
                id: 'mock-user-123',
                email: 'studio.user@example.com',
                name: 'משתמש סטודיו',
                isAdmin: true,
            };
            const mockToken = 'mock-auth-token-for-studio';

            localStorage.setItem('authToken', mockToken);
            localStorage.setItem('userData', JSON.stringify(mockUser));

            setToken(mockToken);
            setUser(mockUser);
            setIsAuthenticated(true);
        } else {
            // In a real environment with a backend, redirect for Google OAuth.
            // The request will be proxied by Vite in development.
            const apiBaseUrl = '/api';
            window.location.href = `${apiBaseUrl}/auth/google`;
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAdminStatus,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
