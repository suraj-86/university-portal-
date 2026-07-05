import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const DashboardLayout = () => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Sidebar defaults to OPEN on desktop, CLOSED on mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

    // Handle screen resizing smoothly
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setIsSidebarOpen(true);
            else setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Ensure the user role exists (fallback to 'student' if undefined during load)
    const currentRole = user?.role || 'student';

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            
            {/* 1. TOP NAVBAR */}
            <Navbar 
                role={currentRole} 
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            />

            {/* 2. MOBILE BACKDROP (Click-away to close) */}
            <div 
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 transition-opacity duration-300 lg:hidden
                    ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

           {/* 3. SIDEBAR */}
            <Sidebar
                role={currentRole}
                isOpen={isSidebarOpen}
                onClose={() => {
                    // FIX: Only auto-close the sidebar on mobile/tablet screens when a link is clicked
                    if (window.innerWidth < 1024) {
                        setIsSidebarOpen(false);
                    }
                }}
            />

            {/* 4. MAIN PAGE CONTENT */}
            <main 
                className={`flex-1 overflow-y-auto pt-16 transition-all duration-300 ease-in-out bg-slate-50
                    ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}
            >
                <div className="h-full">
                    {/* The specific page (Dashboard, Profile, etc.) renders inside here */}
                    <Outlet /> 
                </div>
            </main>
            
        </div>
    );
};

export default DashboardLayout;