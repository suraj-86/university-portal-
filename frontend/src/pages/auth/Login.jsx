import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Connecting to University Portal...');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        if (!isLoggingIn) {
            setElapsedSeconds(0);
            return;
        }

        const timer = setInterval(() => {
            setElapsedSeconds((seconds) => seconds + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isLoggingIn]);

    useEffect(() => {
        if (!isLoggingIn) return;

        if (elapsedSeconds < 3) {
            setLoadingMessage('Connecting to BBAU University Portal...');
        } else if (elapsedSeconds < 10) {
            setLoadingMessage('Waking up the server...');
        } else if (elapsedSeconds < 20) {
            setLoadingMessage('Server is starting. Please wait...');
        } else if (elapsedSeconds < 35) {
            setLoadingMessage('Almost there. Finalizing your login...');
        } else {
            setLoadingMessage('Still connecting. Please keep this window open...');
        }
    }, [elapsedSeconds, isLoggingIn]);

    const handleLogin = async (e) => {
        e.preventDefault();

        if (isLoggingIn) return;

        setErrorMessage('');
        setIsLoggingIn(true);
        setLoadingMessage('Connecting to University Portal...');

        try {
            const response = await api.post('/login', {
                username: username.trim(),
                password
            });

            const { user } = response.data;

            console.info('Login successful', {
                role: user?.role,
                userId: user?.id
            });

            setLoadingMessage('Login successful. Opening your dashboard...');
            login(user);

            if (user.role === 'admin') {
                navigate('/admin-dashboard');
            } else if (user.role === 'teacher') {
                navigate('/teacher-dashboard');
            } else if (user.role === 'student') {
                navigate('/student-dashboard');
            } else if (user.role === 'parent') {
                navigate('/parent-dashboard');
            }
        } catch (error) {
            console.error('Login request failed', {
                status: error.response?.status,
                message: error.response?.data?.message || error.message
            });

            if (error.response && error.response.status === 401) {
                setErrorMessage('Invalid Username or Password. Please try again.');
            } else if (error.response && error.response.status === 403) {
                setErrorMessage(
                    error.response.data?.message ||
                    'This account has been deactivated. Contact the administrator.'
                );
            } else if (error.response && error.response.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage(
                    'CONNECTION ERROR: Unable to connect to the server. Please check your internet connection and try again.'
                );
            }

            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950 font-sans flex items-center justify-center p-4">

            <div className="absolute inset-0 opacity-30">
                <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600 blur-3xl" />
            </div>

            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                    backgroundSize: '42px 42px'
                }}
            />

            <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">

                <div className="hidden lg:flex relative p-12 flex-col justify-between min-h-[620px] border-r border-white/10">
                    <div>
                        <div className="inline-flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <span className="text-white font-black text-lg">U</span>
                            </div>
                            <div>
                                <p className="text-white font-black tracking-tight text-lg">Babasaheb Bhimrao Ambedkar University</p>
                                <p className="text-blue-400 text-[10px] font-bold tracking-[0.3em]">A central portal for all university services.</p>
                            </div>
                        </div>

                        <div className="mt-24">
                            <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] mb-4">
                                UNIVERSITY PORTAL
                            </p>
                            <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
                                Everything
                                <span className="block text-blue-400">You Need.</span>
                            </h1>
                            <p className="mt-6 max-w-md text-slate-400 leading-7">
                                One secure workspace for administrators, teachers, students and parents.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                        Secure institutional access
                    </div>
                </div>

                <div className="relative bg-white dark:bg-slate-900 p-7 sm:p-10 lg:p-12">
                    <div className="mb-8">
                        <div className="lg:hidden flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-black">U</span>
                            </div>
                            <div>
                                <p className="font-black text-slate-900 dark:text-white">Babasaheb Bhimrao Ambedkar University</p>
                                <p className="text-[9px] font-bold tracking-[0.25em] text-blue-600">PORTAL</p>
                            </div>
                        </div>

                        <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] mb-2">
                            Welcome back
                        </p>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            Sign in to continue
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            Use the credentials provided by your university.
                        </p>
                    </div>

                    {errorMessage && (
                        <div className="mb-5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoggingIn}
                                autoComplete="username"
                                placeholder="e.g. AC999/99 or FAC999"
                                className="p-3.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoggingIn}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="p-3.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:cursor-wait disabled:active:scale-100"
                        >
                            {isLoggingIn ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="mt-7 text-center text-[11px] text-slate-400 dark:text-slate-500">
                        Authorized university users only
                    </p>
                </div>
            </div>

            {isLoggingIn && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-5">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl text-center">
                        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full border-[3px] border-blue-400/20 border-t-blue-400 animate-spin" />
                        </div>

                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.25em]">
                            Authentication
                        </p>

                        <h3 className="mt-2 text-xl font-black text-white">
                            {loadingMessage}
                        </h3>

                        <p className="mt-3 text-sm text-slate-400">
                            {elapsedSeconds >= 10
                                ? 'The server may be waking from sleep. Your credentials are being processed.'
                                : 'Please wait while we securely authenticate your account.'}
                        </p>

                        <div className="mt-6 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full w-1/3 rounded-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite]" />
                        </div>

                        <p className="mt-4 text-[11px] text-slate-500">
                            {elapsedSeconds}s
                        </p>

                        <style>{`
                            @keyframes loading {
                                0% { transform: translateX(-130%); }
                                100% { transform: translateX(330%); }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
