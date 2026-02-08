import { useState } from 'react';
import type { User } from '../types';

const USER_STORAGE_KEY = 'chatbot_user';

export const useUser = () => {
    const [user, setUser] = useState<User | null>(() => {
        // Try to load user from localStorage on mount
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored) as User;
            } catch {
                return null;
            }
        }
        return null;
    });

    const login = (id: string, name: string, email: string) => {
        const userData: User = { id, name, email };
        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
    };

    return {
        user,
        login,
        logout
    };
};
