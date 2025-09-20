export interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
    isAdmin: boolean;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AuthContextType extends AuthState {
    login: () => void;
    logout: () => void;
}
