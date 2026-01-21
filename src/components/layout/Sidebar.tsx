'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ChevronLeft, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { SidebarSection, SidebarTone } from '@/types/layout';

interface SidebarProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    sections: SidebarSection[];
    currentUser: any;
    user: any;
    setShowProfileModal: (show: boolean) => void;
}

const toneBadgeClasses: Record<SidebarTone, string> = {
    sky: 'bg-sky-500/20 text-sky-300',
    violet: 'bg-violet-500/20 text-violet-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
    rose: 'bg-rose-500/20 text-rose-300',
    lime: 'bg-lime-500/20 text-lime-300',
};

export const Sidebar: React.FC<SidebarProps> = ({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    sections,
    currentUser,
    user,
    setShowProfileModal,
}) => {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    return (
        <>
            {/* Overlay para móvil */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed lg:sticky left-0 top-0 z-50 lg:z-auto flex h-full flex-col transition-all duration-300 self-start ${theme === 'dark' ? 'border-r border-slate-700 bg-slate-800' : 'border-r border-gray-200 bg-white shadow-lg'
                    } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isSidebarCollapsed && !isMobileMenuOpen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0' : 'w-64 lg:opacity-100'
                    }`}
            >
                <div
                    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 ${theme === 'dark' ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-gray-200 bg-white'
                        } sticky top-0 z-10 overflow-hidden`}
                >
                    {/* Botón cerrar móvil */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`lg:hidden absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        aria-label="Cerrar menú"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {(!isSidebarCollapsed || isMobileMenuOpen) && (
                        <>
                            <div
                                className={`h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
                                    } flex items-center justify-center`}
                            >
                                <img
                                    src="https://asli.cl/img/logo.png?v=1761679285274&t=1761679285274"
                                    alt="ASLI Gestión Logística"
                                    className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                                    onError={(event) => {
                                        event.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <p
                                    className={`text-xs sm:text-sm font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                                        }`}
                                >
                                    ASLI Gestión Logística
                                </p>
                                <p className={`text-[10px] sm:text-xs truncate ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                    Plataforma Operativa
                                </p>
                            </div>
                        </>
                    )}
                    {!isSidebarCollapsed && !isMobileMenuOpen && (
                        <button
                            onClick={toggleSidebar}
                            className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border flex-shrink-0 ${theme === 'dark'
                                ? 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200'
                                : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-400 hover:text-blue-700'
                                } transition`}
                            aria-label="Contraer menú lateral"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {(!isSidebarCollapsed || isMobileMenuOpen) && (
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
                        {sections.map((section) => (
                            <div key={section.title} className="space-y-2 sm:space-y-3">
                                <p
                                    className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                        }`}
                                >
                                    {section.title}
                                </p>
                                <div className="space-y-1 sm:space-y-1.5 overflow-y-visible">
                                    {section.items.map((item) => {
                                        const isActive = item.isActive ?? (item.id ? pathname === item.id : false);
                                        const Icon = item.icon;

                                        return (
                                            <button
                                                key={item.label}
                                                onClick={() => {
                                                    if (item.onClick) {
                                                        item.onClick();
                                                        setIsMobileMenuOpen(false);
                                                    } else if (item.id) {
                                                        router.push(item.id);
                                                        setIsMobileMenuOpen(false);
                                                    }
                                                }}
                                                className={`group w-full text-left flex items-center justify-between rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors min-w-0 ${isActive
                                                    ? `${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`
                                                    : `${theme === 'dark'
                                                        ? 'hover:bg-slate-700 text-slate-300'
                                                        : 'hover:bg-blue-50 text-blue-600 font-semibold'
                                                    }`
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                                    {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />}
                                                    <span
                                                        className={`text-xs sm:text-sm font-semibold truncate ${isActive ? '!text-white' : theme !== 'dark' ? '!text-blue-600' : ''
                                                            }`}
                                                    >
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {item.counter !== undefined && item.tone && (
                                                    <span
                                                        className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ml-1.5 ${toneBadgeClasses[item.tone]
                                                            }`}
                                                    >
                                                        {item.counter}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="space-y-2 sm:space-y-3">
                            <p
                                className={`text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                                    }`}
                            >
                                Preferencias
                            </p>
                            <ThemeToggle variant="switch" label="Tema" />
                        </div>

                        {/* Botón de usuario para móvil */}
                        <div
                            className={`lg:hidden space-y-2 sm:space-y-3 pt-2 ${theme === 'dark' ? 'border-t border-slate-700/60' : 'border-t border-gray-200'
                                }`}
                        >
                            <button
                                onClick={() => {
                                    setShowProfileModal(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full text-left flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-blue-50 text-blue-600 font-semibold'
                                    }`}
                            >
                                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-semibold truncate flex-1 min-w-0">
                                    {currentUser?.nombre || user?.user_metadata?.full_name || user?.email || 'Usuario'}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
};
