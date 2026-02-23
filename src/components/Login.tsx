import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authenticate } from '../services/api';

const Login: React.FC = () => {
    const { login } = useAuth();
    const serverUrl = import.meta.env.VITE_DEFAULT_SERVER_URL || 'http://192.168.1.13:8069';
    const [database, setDatabase] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const uid = await authenticate(serverUrl, database, username, password);
            if (uid) {
                login({ serverUrl, database, username, password, uid });
            } else {
                setError('Falló la autenticación. Por favor revisa tus credenciales.');
            }
        } catch (err) {
            setError('Ocurrió un error durante la autenticación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md p-8 bg-secondary/30 backdrop-blur-md rounded-2xl border border-border shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold">Conectar a Odoo</h2>
                    <p className="text-muted-foreground text-sm mt-2">Ingresa tus credenciales para acceder al editor</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Base de Datos</label>
                        <input
                            type="text"
                            value={database}
                            onChange={(e) => setDatabase(e.target.value)}
                            className="w-full px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Usuario / Correo</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed mt-6 cursor-pointer"
                    >
                        {isLoading ? 'Conectando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
