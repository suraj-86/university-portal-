import React, { createContext, useContext } from 'react';
import { useAuth } from '../context/AuthContext'; // Hook to get current user role

const RoleThemeContext = createContext();

export const RoleProvider = ({ children }) => {
    const { user } = useAuth(); // Assuming your user object has a 'role' property
    const role = user?.role || 'student'; // Fallback to student theme

    // Centralized theme configuration based on your UI Kit
    const themes = {
        admin: {
            primary: "emerald-600",
            hover: "emerald-700",
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-100",
            ring: "focus:ring-emerald-500"
        },
        teacher: {
            primary: "indigo-600",
            hover: "indigo-700",
            bg: "bg-indigo-50",
            text: "text-indigo-700",
            border: "border-indigo-100",
            ring: "focus:ring-indigo-500"
        },
        student: {
            primary: "blue-600",
            hover: "blue-700",
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-100",
            ring: "focus:ring-blue-500"
        }
    };

    const currentTheme = themes[role];

    return (
        <RoleThemeContext.Provider value={{ role, theme: currentTheme }}>
            {children}
        </RoleThemeContext.Provider>
    );
};

// Custom hook to use the theme in any component
export const useRoleTheme = () => useContext(RoleThemeContext);