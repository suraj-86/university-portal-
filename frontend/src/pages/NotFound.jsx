import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Grab the user's brain to see if they are logged in

    const handleGoHome = () => {
        // Intelligent Routing: Send them to their specific dashboard, or login if logged out
        if (user?.role === 'admin') navigate('/admin-dashboard');
        else if (user?.role === 'teacher') navigate('/teacher-dashboard');
        else if (user?.role === 'student') navigate('/student-dashboard');
        else navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans p-6 text-center">
            {/* Playful Illustration */}
            <div className="text-8xl md:text-9xl mb-6 drop-shadow-sm">🛸</div>
            
            <h1 className="text-7xl md:text-9xl font-black text-slate-900 tracking-tight mb-2">404</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-700 mb-4">Lost in the campus maze?</h2>
            
            <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium leading-relaxed">
                Oops! It looks like you've wandered off the official university map. The page you are looking for doesn't exist or has been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                    Go Back
                </button>
                <button 
                    onClick={handleGoHome} 
                    className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Return Home
                </button>
            </div>
        </div>
    );
};

export default NotFound;
