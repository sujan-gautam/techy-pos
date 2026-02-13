import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

const Login = () => {
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        try {
            await login(data.email, data.password);
            toast.success('Authentication authorized');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Access Denied: Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[420px]">
                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <Logo size="large" className="mb-2" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Authorized Personnel Only</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 md:p-10">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In</h2>
                        <p className="text-xs text-slate-500 font-medium">Please enter your credentials to access the platform.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">User Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    {...register('email', {
                                        required: 'Email address is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "Invalid email address"
                                        }
                                    })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-all caret-slate-600"
                                />
                            </div>
                            {errors.email && <p className="text-[10px] text-red-600 font-bold mt-1.5 uppercase tracking-tighter">{errors.email.message}</p>}
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Password</label>
                                <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Forgot?</button>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...register('password', { required: 'Password is required' })}
                                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition-all caret-slate-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-red-600 font-bold mt-1.5 uppercase tracking-tighter">{errors.password.message}</p>}
                        </div>

                        {/* Remember & Security Info */}
                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center group cursor-pointer">
                                <input type="checkbox" className="w-3.5 h-3.5 border-slate-300 rounded-sm text-slate-800 focus:ring-slate-400" />
                                <span className="ml-2 text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Keep me signed in</span>
                            </label>
                            <div className="flex items-center text-emerald-600 font-bold text-[10px] uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">
                                <ShieldCheck size={10} className="mr-1" /> Secure Session
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-slate-900 text-white py-3 rounded-sm text-xs font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-[0.99] shadow-sm mt-4 flex items-center justify-center space-x-2"
                        >
                            <span>Authenticate</span>
                        </button>
                    </form>
                </div>

                {/* Footer Security Note */}
                <div className="mt-8 text-center space-y-4">
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                        This system is protected by high-level encryption. All login attempts are strictly monitored for security and compliance auditing.
                    </p>
                    <div className="flex items-center justify-center space-x-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
                        <span className="text-slate-200">|</span>
                        <a href="#" className="hover:text-slate-600 transition-colors">Safety Terms</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
