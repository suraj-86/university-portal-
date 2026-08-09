import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api'; 

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

    const updateUser = (partialUpdate) => {
        setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, ...partialUpdate };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
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
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};