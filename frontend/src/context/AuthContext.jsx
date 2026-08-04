import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api'; // <-- Make sure to import your api instance

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = () => {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
            setLoading(false);
        };
        initializeAuth();
    }, []);

    const login = (userObj) => {
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser(userObj);
    };

    const logout = async () => {
        try {
            await api.post('/logout'); 
        } catch (error) {
            console.error("Failed to clear cookie on backend", error);
        } finally {
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
