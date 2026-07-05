import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuth from "../../hooks/useAuth"; 

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const navigate = useNavigate();
    const { login } = useAuth(); 

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        try {
            // 1. Send the login request to our real Node.js backend
            const response = await axios.post('http://localhost:5000/api/login', { 
                username, 
                password 
            });

            // 2. If successful, get the user data
            const { user } = response.data;
            
            // 3. Update the Global Auth State (Context)
            // We pass a dummy token for now, or you can use the user ID
            login('session-token-active', user);

            // 4. Redirect based on the role stored in MySQL
            if (user.role === 'admin') {
                navigate('/admin-dashboard');
            } else if (user.role === 'teacher') {
                navigate('/teacher-dashboard');
            } else if (user.role === 'student') {
                navigate('/student-dashboard');
            }

        } catch (error) {
            // 5. Handle "Invalid Credentials" or "Server Down"
            if (error.response && error.response.status === 401) {
                setErrorMessage('Invalid Username or Password. Please try again.');
            } else {
                setErrorMessage('Server connection failed. Is the backend running?');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">University Portal</h2>
                    <p className="text-slate-500 mt-2">Login with your MySQL credentials.</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    {errorMessage && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center border border-red-100">
                            {errorMessage}
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Username / Enrollment ID</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            placeholder="e.g. EN99999 or FAC201"
                            className="p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-slate-700">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="••••••••"
                            className="p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg active:scale-95"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;