'use client';

import React, { createContext, useContext, useState } from 'react';

interface EditingCellState {
  recordId: string | null;
  field: string | null;
}

interface EditingCellContextType {
  editingCell: EditingCellState;
  setEditingCell: (recordId: string | null, field: string | null) => void;
  isEditing: (recordId: string, field: string) => boolean;
  clearEditing: () => void;
}

const EditingCellContext = createContext<EditingCellContextType | undefined>(undefined);

export function EditingCellProvider({ children }: { children: React.ReactNode }) {
  const [editingCell, setEditingCellState] = useState<EditingCellState>({
    recordId: null,
    field: null,
  });

  const setEditingCell = (recordId: string | null, field: string | null) => {
    setEditingCellState({ recordId, field });
  };

  const isEditing = (recordId: string, field: string) => {
    return editingCell.recordId === recordId && editingCell.field === field;
  };

  const clearEditing = () => {
    setEditingCellState({ recordId: null, field: null });
  };

  return (
    <EditingCellContext.Provider value={{ editingCell, setEditingCell, isEditing, clearEditing }}>
      {children}
    </EditingCellContext.Provider>
  );
}

export function useEditingCell() {
  const context = useContext(EditingCellContext);
  if (context === undefined) {
    throw new Error('useEditingCell must be used within an EditingCellProvider');
  }
  return context;
}

