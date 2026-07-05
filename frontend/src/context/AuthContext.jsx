import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = () => {
            // Check if user data exists in local storage
            const savedUser = localStorage.getItem('user');

            if (savedUser) {
                // Parse the string back into a JavaScript object
                setUser(JSON.parse(savedUser));
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    // Global Login Function
    const login = (token, userObj) => {
    // userObj should contain the 'id' from the SELECT query in server.js[cite: 2]
    const userData = { ...userObj, token }; 
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
};

    // Global Logout Function
    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
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