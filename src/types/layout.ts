export type SidebarTone = 'sky' | 'violet' | 'emerald' | 'rose' | 'lime';

export interface SidebarNavItem {
    label: string;
    id?: string;
    counter?: number;
    tone?: SidebarTone;
    isActive?: boolean;
    onClick?: () => void;
    icon?: any; // Lucide icon component
}

export interface SidebarSection {
    title: string;
    items: SidebarNavItem[];
}
