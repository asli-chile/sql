'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { User } from '@supabase/supabase-js';
import { useUser } from '@/hooks/useUser';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSection } from '@/types/layout';
import { LayoutDashboard, PlusCircle, FileText, Globe, LogOut, Activity } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { UserProfileModal } from '@/components/users/UserProfileModal';

// Contexto para compartir setShowProfileModal
const ClientLayoutContext = createContext<{
    setShowProfileModal: (show: boolean) => void;
}>({
    setShowProfileModal: () => {},
});

export const useClientLayout = () => useContext(ClientLayoutContext);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { theme } = useTheme();
    const { currentUser, setCurrentUser } = useUser();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                router.push('/auth');
                return;
            }

            setUser(authUser);

            // Cargar datos del usuario desde la tabla usuarios
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .single();

            if (userError || !userData) {
                console.error('Error loading user data:', userError);
                router.push('/auth');
                return;
            }

            // Verificar si el usuario es un cliente
            if (userData.rol !== 'cliente' && userData.rol !== 'admin') {
                // Si no es cliente ni admin, redirigir al dashboard normal
                router.push('/dashboard');
                return;
            }

            setCurrentUser(userData);
            setLoading(false);
        };

        checkUser();
    }, [router, setCurrentUser]);

    const sidebarSections: SidebarSection[] = [
        {
            title: 'Mi Cuenta',
            items: [
                { label: 'Resumen', id: '/client/dashboard', icon: LayoutDashboard },
                { label: 'Nueva Reserva', id: '/client/reservas', icon: PlusCircle },
            ],
        },
        {
            title: 'Operaciones',
            items: [
                { label: 'Mis Documentos', id: '/client/documentos', icon: FileText },
                { label: 'Seguimiento', id: '/client/seguimiento', icon: Globe },
                { label: 'Tracking Movs', id: '/client/tracking', icon: Activity },
            ],
        },
    ];

    if (loading) {
        return <LoadingScreen message="Cargando portal de clientes..." />;
    }

    return (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
            <Sidebar
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                sections={sidebarSections}
                currentUser={currentUser}
                user={user}
                setShowProfileModal={setShowProfileModal}
            />

            <ClientLayoutContext.Provider value={{ setShowProfileModal }}>
                <div className="flex flex-1 flex-col min-w-0 overflow-hidden h-full">
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </ClientLayoutContext.Provider>

            {/* Modal de Perfil */}
            {showProfileModal && currentUser && (
                <UserProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    userInfo={currentUser}
                    onUserUpdate={(updatedUser) => {
                        setCurrentUser(updatedUser);
                    }}
                />
            )}
        </div>
    );
}
