'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Mail, Plus, Trash2, Shield, AlertCircle, CheckCircle } from 'lucide-react';

type UserEmail = {
    id: string;
    email: string;
    is_primary: boolean;
    created_at: string;
};

export default function ManageEmailsPage() {
    const supabase = createClient();
    const [emails, setEmails] = useState<UserEmail[]>([]);
    const [primaryEmail, setPrimaryEmail] = useState<string>('');
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadEmails();
    }, []);

    const loadEmails = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/emails');
            const data = await response.json();

            if (response.ok) {
                setEmails(data.emails || []);
                setPrimaryEmail(data.primary_email || '');
            } else {
                setError(data.error || 'Error cargando emails');
            }
        } catch (err) {
            setError('Error cargando emails');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newEmail) {
            setError('Ingresa un email');
            return;
        }

        setAdding(true);

        try {
            const response = await fetch('/api/user/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Email agregado exitosamente');
                setNewEmail('');
                await loadEmails();
            } else {
                setError(data.error || 'Error agregando email');
            }
        } catch (err) {
            setError('Error agregando email');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteEmail = async (emailId: string) => {
        setError('');
        setSuccess('');
        setDeleting(emailId);

        try {
            const response = await fetch(`/api/user/emails?id=${emailId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Email eliminado exitosamente');
                await loadEmails();
            } else {
                setError(data.error || 'Error eliminando email');
            }
        } catch (err) {
            setError('Error eliminando email');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-3xl mx-auto">
                    <p className="text-white">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestionar Emails</h1>
                    <p className="text-slate-400">
                        Agrega múltiples emails para iniciar sesión con la misma contraseña
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="flex items-start gap-3 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                        <CheckCircle className="h-5 w-5 flex-shrink-0" />
                        <span>{success}</span>
                    </div>
                )}

                {/* Add Email Form */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <h2 className="text-xl font-semibold text-white mb-4">Agregar Email Secundario</h2>
                    <form onSubmit={handleAddEmail} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="nuevo@email.com"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-12 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                                disabled={adding}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="h-4 w-4" />
                            {adding ? 'Agregando...' : 'Agregar'}
                        </button>
                    </form>
                </div>

                {/* Email List */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <h2 className="text-xl font-semibold text-white mb-4">Tus Emails</h2>
                    <div className="space-y-3">
                        {emails.map((email) => (
                            <div
                                key={email.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-slate-800 border border-slate-700"
                            >
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-white font-medium">{email.email}</p>
                                        {email.is_primary && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Shield className="h-3 w-3 text-sky-400" />
                                                <span className="text-xs text-sky-400">Email Principal</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!email.is_primary && (
                                    <button
                                        onClick={() => handleDeleteEmail(email.id)}
                                        disabled={deleting === email.id}
                                        className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {deleting === email.id ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                    <h3 className="text-blue-300 font-semibold mb-2">ℹ️ Información Importante</h3>
                    <ul className="text-sm text-blue-200 space-y-2">
                        <li>• Todos los emails secundarios comparten la misma contraseña del email principal</li>
                        <li>• Puedes iniciar sesión con cualquiera de tus emails</li>
                        <li>• El email principal no se puede eliminar</li>
                        <li>• Para cambiar tu contraseña, usa el email principal</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
