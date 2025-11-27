import { FileText, LucideIcon } from 'lucide-react';

export type DocumentType = {
    id: string;
    name: string;
    description: string;
    formats: string[];
    icon: LucideIcon;
    accent: string;
    gradient: string;
};

export type StoredDocument = {
    typeId: string;
    name: string;
    path: string;
    booking: string | null;
    updatedAt: string | null;
    instructivoIndex: number | null;
};
