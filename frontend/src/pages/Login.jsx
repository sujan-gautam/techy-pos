import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Logo from '../components/Logo';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        try {
            await login(data.email, data.password);
            toast.success('Login Successful');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login Failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md animate-in">
                <div className="flex flex-col items-center mb-10">
                    <Logo size="large" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-4">Secure Admin Login</p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            placeholder="admin@example.com"
                            {...register('email', { required: 'Email is required' })}
                            className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            {...register('password', { required: 'Password is required' })}
                            className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-[0.98] mt-4"
                    >
                        Sign In
                    </button>
                    <div className="text-center text-xs text-gray-400 mt-6 pt-6 border-t border-gray-100">
                        Demo Account: <span className="text-gray-600 font-mono">admin@example.com / password123</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
