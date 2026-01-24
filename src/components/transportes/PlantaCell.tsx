'use client';

import { TransporteRecord } from '@/lib/transportes-service';
import { InlineEditCell } from './InlineEditCell';
import { useState, useEffect } from 'react';

interface PlantaCellProps {
  item: TransporteRecord;
  onUpdate: (updatedRecord: TransporteRecord) => void;
}

export function PlantaCell({ item, onUpdate }: PlantaCellProps) {
  const [plantas, setPlantas] = useState<string[]>([]);
  const [isLoadingPlantas, setIsLoadingPlantas] = useState(false);

  // Cargar catálogo de plantas
  useEffect(() => {
    const loadPlantas = async () => {
      setIsLoadingPlantas(true);
      try {
        console.log('🔄 Cargando catálogo de plantas para tabla...');
        const response = await fetch('/api/catalogos/plantas');
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Plantas cargadas para tabla:', data.plantas);
          setPlantas(data.plantas || []);
        } else {
          console.error('❌ Error cargando plantas para tabla:', response.statusText);
        }
      } catch (error) {
        console.error('💥 Error cargando plantas para tabla:', error);
      } finally {
        setIsLoadingPlantas(false);
      }
    };

    loadPlantas();
  }, []);

  return (
    <InlineEditCell
      value={item.planta || ''}
      field="planta"
      record={item}
      onSave={onUpdate}
      type="select"
      options={plantas}
      className="w-full"
    />
  );
}
