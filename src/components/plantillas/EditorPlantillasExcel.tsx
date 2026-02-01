'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase-browser';
import ExcelJS from 'exceljs';
import { 
  Plus, 
  Minus, 
  Save, 
  Eye, 
  Download,
  Upload,
  Trash2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Combine,
  X
} from 'lucide-react';

// Tipos para las celdas
interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderColor?: string;
  borderWidth?: number;
}

interface Cell {
  value: string;
  style?: CellStyle;
  colSpan?: number;
  rowSpan?: number;
  isMarker?: boolean;
  isMerged?: boolean; // Si es parte de una celda fusionada
  mergeStart?: { row: number; col: number }; // Referencia a la celda principal
}

interface Column {
  width: number;
  id: string;
}

interface RowHeight {
  height: number;
}

// Marcadores disponibles
const MARCADORES_DISPONIBLES = [
  { id: 'SHIPPER_NAME', label: 'Nombre Exportador', grupo: 'Exportador' },
  { id: 'SHIPPER_ADDRESS', label: 'Dirección Exportador', grupo: 'Exportador' },
  { id: 'SHIPPER_COUNTRY', label: 'País Exportador', grupo: 'Exportador' },
  
  { id: 'CONSIGNEE_NAME', label: 'Nombre Consignatario', grupo: 'Consignatario' },
  { id: 'CONSIGNEE_ADDRESS', label: 'Dirección Consignatario', grupo: 'Consignatario' },
  { id: 'CONSIGNEE_COUNTRY', label: 'País Consignatario', grupo: 'Consignatario' },
  
  { id: 'INVOICE_NUMBER', label: 'Número Invoice', grupo: 'Embarque' },
  { id: 'REF_ASLI', label: 'Referencia ASLI', grupo: 'Embarque' },
  { id: 'BOOKING_NUMBER', label: 'Booking Number', grupo: 'Embarque' },
  { id: 'VESSEL_NAME', label: 'Nombre Nave', grupo: 'Embarque' },
  { id: 'VOYAGE_NUMBER', label: 'Número Viaje', grupo: 'Embarque' },
  { id: 'PORT_OF_LOADING', label: 'Puerto Carga', grupo: 'Embarque' },
  { id: 'PORT_OF_DISCHARGE', label: 'Puerto Descarga', grupo: 'Embarque' },
  { id: 'CONTAINER', label: 'Contenedor', grupo: 'Embarque' },
  { id: 'ETD', label: 'ETD', grupo: 'Embarque' },
  { id: 'ETA', label: 'ETA', grupo: 'Embarque' },
  
  { id: 'TABLA_PRODUCTOS', label: '🔄 Tabla de Productos (Loop)', grupo: 'Productos' },
  { id: 'CANTIDAD', label: 'Cantidad', grupo: 'Productos' },
  { id: 'TIPO_ENVASE', label: 'Tipo Envase', grupo: 'Productos' },
  { id: 'VARIEDAD', label: 'Variedad', grupo: 'Productos' },
  { id: 'CATEGORIA', label: 'Categoría', grupo: 'Productos' },
  { id: 'ETIQUETA', label: 'Etiqueta', grupo: 'Productos' },
  { id: 'CALIBRE', label: 'Calibre', grupo: 'Productos' },
  { id: 'KG_NETO', label: 'KG Neto/Unidad', grupo: 'Productos' },
  { id: 'PRECIO_CAJA', label: 'Precio por Caja', grupo: 'Productos' },
  { id: 'TOTAL', label: 'Total', grupo: 'Productos' },
  
  { id: 'TOTAL_CANTIDAD', label: 'Total Cantidad', grupo: 'Totales' },
  { id: 'TOTAL_VALOR', label: 'Total Valor', grupo: 'Totales' },
  { id: 'TOTAL_EN_PALABRAS', label: 'Total en Palabras', grupo: 'Totales' },
];

export function EditorPlantillasExcel() {
  const { theme } = useTheme();
  
  // Estado del grid
  const [rows, setRows] = useState<Cell[][]>([
    Array(10).fill(null).map(() => ({ value: '' })),
    Array(10).fill(null).map(() => ({ value: '' })),
    Array(10).fill(null).map(() => ({ value: '' })),
    Array(10).fill(null).map(() => ({ value: '' })),
    Array(10).fill(null).map(() => ({ value: '' })),
  ]);
  
  const [columns, setColumns] = useState<Column[]>(
    Array(10).fill(null).map((_, i) => ({ id: `col-${i}`, width: 100 }))
  );
  
  const [rowHeights, setRowHeights] = useState<number[]>(
    Array(5).fill(30) // Altura por defecto 30px
  );
  
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{  
    start: { row: number; col: number };
    end: { row: number; col: number };
  } | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [clientePlantilla, setClientePlantilla] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [showBorderSelector, setShowBorderSelector] = useState(false);
  
  const supabase = createClient();
  
  // Agregar fila
  const agregarFila = useCallback(() => {
    setRows(prev => [...prev, Array(columns.length).fill(null).map(() => ({ value: '' }))]);
    setRowHeights(prev => [...prev, 30]); // Nueva fila con altura por defecto
  }, [columns.length]);
  
  // Eliminar fila
  const eliminarFila = useCallback(() => {
    if (rows.length > 1) {
      setRows(prev => prev.slice(0, -1));
      setRowHeights(prev => prev.slice(0, -1));
    }
  }, [rows.length]);
  
  // Agregar columna
  const agregarColumna = useCallback(() => {
    setColumns(prev => [...prev, { id: `col-${prev.length}`, width: 100 }]);
    setRows(prev => prev.map(row => [...row, { value: '' }]));
  }, []);
  
  // Eliminar columna
  const eliminarColumna = useCallback(() => {
    if (columns.length > 1) {
      setColumns(prev => prev.slice(0, -1));
      setRows(prev => prev.map(row => row.slice(0, -1)));
    }
  }, [columns.length]);
  
  // Actualizar valor de celda
  const actualizarCelda = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = [...newRows[rowIdx]];
      newRows[rowIdx][colIdx] = { ...newRows[rowIdx][colIdx], value };
      return newRows;
    });
  }, []);
  
  // Actualizar estilo de celda
  const actualizarEstiloCelda = useCallback((rowIdx: number, colIdx: number, style: Partial<CellStyle>) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = [...newRows[rowIdx]];
      const cell = newRows[rowIdx][colIdx];
      newRows[rowIdx][colIdx] = {
        ...cell,
        style: { ...cell.style, ...style }
      };
      return newRows;
    });
  }, []);
  
  // Actualizar ancho de columna
  const actualizarAnchoColumna = useCallback((colIdx: number, width: number) => {
    setColumns(prev => {
      const newCols = [...prev];
      newCols[colIdx] = { ...newCols[colIdx], width };
      return newCols;
    });
  }, []);
  
  // Insertar marcador en celda seleccionada
  const insertarMarcador = useCallback((marcadorId: string) => {
    if (selectedCell) {
      const marcador = `"${marcadorId}"`;
      actualizarCelda(selectedCell.row, selectedCell.col, marcador);
      // Marcar como celda con marcador
      setRows(prev => {
        const newRows = [...prev];
        newRows[selectedCell.row] = [...newRows[selectedCell.row]];
        newRows[selectedCell.row][selectedCell.col] = {
          ...newRows[selectedCell.row][selectedCell.col],
          isMarker: true
        };
        return newRows;
      });
    }
  }, [selectedCell, actualizarCelda]);
  
  // Actualizar altura de fila
  const actualizarAlturaFila = useCallback((rowIdx: number, height: number) => {
    setRowHeights(prev => {
      const newHeights = [...prev];
      newHeights[rowIdx] = height;
      return newHeights;
    });
  }, []);
  
  // Fusionar celdas seleccionadas
  const fusionarCeldas = useCallback(() => {
    if (!selectedRange) {
      alert('Selecciona un rango de celdas para fusionar');
      return;
    }
    
    const { start, end } = selectedRange;
    const rowSpan = end.row - start.row + 1;
    const colSpan = end.col - start.col + 1;
    
    if (rowSpan === 1 && colSpan === 1) {
      alert('Selecciona más de una celda para fusionar');
      return;
    }
    
    setRows(prev => {
      const newRows = [...prev];
      // Marcar la celda principal
      newRows[start.row] = [...newRows[start.row]];
      newRows[start.row][start.col] = {
        ...newRows[start.row][start.col],
        rowSpan,
        colSpan
      };
      
      // Marcar las demás celdas como fusionadas
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          if (r !== start.row || c !== start.col) {
            newRows[r] = [...newRows[r]];
            newRows[r][c] = {
              ...newRows[r][c],
              isMerged: true,
              mergeStart: { row: start.row, col: start.col }
            };
          }
        }
      }
      
      return newRows;
    });
    
    setSelectedRange(null);
  }, [selectedRange]);
  
  // Separar celdas fusionadas
  const separarCeldas = useCallback(() => {
    if (!selectedCell) return;
    
    const cell = rows[selectedCell.row]?.[selectedCell.col];
    if (!cell?.rowSpan && !cell?.colSpan) {
      alert('Esta celda no está fusionada');
      return;
    }
    
    const rowSpan = cell.rowSpan || 1;
    const colSpan = cell.colSpan || 1;
    
    setRows(prev => {
      const newRows = [...prev];
      
      // Limpiar la celda principal
      newRows[selectedCell.row] = [...newRows[selectedCell.row]];
      const { rowSpan: _, colSpan: __, ...cellWithoutMerge } = newRows[selectedCell.row][selectedCell.col];
      newRows[selectedCell.row][selectedCell.col] = cellWithoutMerge;
      
      // Limpiar las celdas secundarias
      for (let r = selectedCell.row; r < selectedCell.row + rowSpan; r++) {
        for (let c = selectedCell.col; c < selectedCell.col + colSpan; c++) {
          if (r !== selectedCell.row || c !== selectedCell.col) {
            newRows[r] = [...newRows[r]];
            const { isMerged: _, mergeStart: __, ...cleanCell } = newRows[r][c];
            newRows[r][c] = cleanCell;
          }
        }
      }
      
      return newRows;
    });
  }, [selectedCell, rows]);
  
  // Aplicar bordes personalizados
  const aplicarBordes = useCallback((borderStyle: string) => {
    if (!selectedCell) return;
    
    const borderConfig = {
      'all': { top: 1, right: 1, bottom: 1, left: 1 },
      'outer': { top: 1, right: 1, bottom: 1, left: 1 },
      'inner': { top: 0, right: 0, bottom: 0, left: 0 },
      'none': { top: 0, right: 0, bottom: 0, left: 0 },
      'top': { top: 2, right: 0, bottom: 0, left: 0 },
      'bottom': { top: 0, right: 0, bottom: 2, left: 0 },
      'left': { top: 0, right: 0, bottom: 0, left: 2 },
      'right': { top: 0, right: 2, bottom: 0, left: 0 },
    }[borderStyle] || { top: 1, right: 1, bottom: 1, left: 1 };
    
    actualizarEstiloCelda(selectedCell.row, selectedCell.col, {
      borderWidth: borderConfig.top // Simplificado para el ejemplo
    });
    
    setShowBorderSelector(false);
  }, [selectedCell, actualizarEstiloCelda]);
  
  // Aplicar estilo rápido a celda seleccionada
  const aplicarEstilo = useCallback((estilo: Partial<CellStyle>) => {
    if (selectedCell) {
      actualizarEstiloCelda(selectedCell.row, selectedCell.col, estilo);
    }
  }, [selectedCell, actualizarEstiloCelda]);
  
  // Generar vista previa
  const generarVistaPrevia = useCallback(async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Proforma');
      
      // Configurar columnas
      worksheet.columns = columns.map(col => ({ width: col.width / 7 }));
      
      // Agregar filas y celdas
      rows.forEach((row, rowIdx) => {
        const excelRow = worksheet.getRow(rowIdx + 1);
        row.forEach((cell, colIdx) => {
          const excelCell = excelRow.getCell(colIdx + 1);
          excelCell.value = cell.value || '';
          
          // Aplicar estilos
          if (cell.style) {
            excelCell.font = {
              bold: cell.style.bold,
              italic: cell.style.italic,
              size: cell.style.fontSize || 11,
              color: cell.style.color ? { argb: cell.style.color.replace('#', 'FF') } : undefined
            };
            
            if (cell.style.backgroundColor) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: cell.style.backgroundColor.replace('#', 'FF') }
              };
            }
            
            excelCell.alignment = {
              horizontal: cell.style.textAlign || 'left',
              vertical: 'middle'
            };
            
            excelCell.border = {
              top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
            };
          }
        });
        excelRow.commit();
      });
      
      // Generar HTML preview
      let html = '<div style="padding: 20px; background: #f5f5f5;"><table style="border-collapse: collapse; width: 100%; max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
      
      rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, colIdx) => {
          const style = [
            `width: ${columns[colIdx].width}px`,
            'padding: 8px 10px',
            'border: 1px solid #d0d0d0',
            'text-align: ' + (cell.style?.textAlign || 'left'),
            cell.style?.bold ? 'font-weight: bold' : '',
            cell.style?.italic ? 'font-style: italic' : '',
            cell.style?.color ? `color: ${cell.style.color}` : '',
            cell.style?.backgroundColor ? `background-color: ${cell.style.backgroundColor}` : '',
            cell.style?.fontSize ? `font-size: ${cell.style.fontSize}pt` : 'font-size: 11pt'
          ].filter(Boolean).join('; ');
          
          const displayValue = cell.isMarker 
            ? `<span style="color: #2563eb; font-family: monospace;">${cell.value}</span>`
            : cell.value || '&nbsp;';
          
          html += `<td style="${style}">${displayValue}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</table></div>';
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generando preview:', error);
      alert('Error al generar vista previa');
    }
  }, [rows, columns]);
  
  // Guardar plantilla
  const guardarPlantilla = useCallback(async () => {
    if (!nombrePlantilla.trim()) {
      alert('Por favor ingresa un nombre para la plantilla');
      return;
    }
    
    setGuardando(true);
    try {
      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Proforma');
      
      // Configurar columnas
      worksheet.columns = columns.map(col => ({ width: col.width / 7 }));
      
      // Agregar filas y celdas
      rows.forEach((row, rowIdx) => {
        const excelRow = worksheet.getRow(rowIdx + 1);
        row.forEach((cell, colIdx) => {
          const excelCell = excelRow.getCell(colIdx + 1);
          excelCell.value = cell.value || '';
          
          // Aplicar estilos
          if (cell.style) {
            excelCell.font = {
              bold: cell.style.bold,
              italic: cell.style.italic,
              size: cell.style.fontSize || 11,
              color: cell.style.color ? { argb: cell.style.color.replace('#', 'FF') } : undefined
            };
            
            if (cell.style.backgroundColor) {
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: cell.style.backgroundColor.replace('#', 'FF') }
              };
            }
            
            excelCell.alignment = {
              horizontal: cell.style.textAlign || 'left',
              vertical: 'middle'
            };
            
            excelCell.border = {
              top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
              right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
            };
          }
        });
        excelRow.commit();
      });
      
      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Generar nombre de archivo único
      const timestamp = Date.now();
      const fileName = `plantillas/${timestamp}-${nombrePlantilla.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
      
      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Guardar registro en base de datos
      const { error: dbError } = await supabase
        .from('plantillas_proforma')
        .insert({
          nombre: nombrePlantilla,
          cliente: clientePlantilla || null,
          archivo_url: fileName,
          activa: true,
          es_default: false,
          created_by: (await supabase.auth.getUser()).data.user?.email || 'unknown'
        });
      
      if (dbError) throw dbError;
      
      alert('✅ Plantilla guardada exitosamente');
      setNombrePlantilla('');
      setClientePlantilla('');
    } catch (error: any) {
      console.error('Error guardando plantilla:', error);
      alert('Error al guardar plantilla: ' + error.message);
    } finally {
      setGuardando(false);
    }
  }, [nombrePlantilla, clientePlantilla, rows, columns, supabase]);

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className="text-xl font-bold">✨ Editor Visual de Plantillas Excel</h2>
        <div className="flex gap-2">
          <button
            onClick={generarVistaPrevia}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition-colors`}
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </button>
          <button
            onClick={guardarPlantilla}
            disabled={guardando}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              guardando
                ? 'bg-gray-400 cursor-not-allowed'
                : theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-500 hover:bg-green-600'
            } text-white transition-colors`}
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo: Marcadores */}
        <div className={`w-64 border-r overflow-y-auto ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="p-4">
            <h3 className="font-semibold mb-2">📋 Campos Disponibles</h3>
            <p className="text-xs mb-4 opacity-70">
              Haz clic en una celda y luego en un campo para insertarlo
            </p>
            
            {Object.entries(
              MARCADORES_DISPONIBLES.reduce((acc, m) => {
                if (!acc[m.grupo]) acc[m.grupo] = [];
                acc[m.grupo].push(m);
                return acc;
              }, {} as Record<string, typeof MARCADORES_DISPONIBLES>)
            ).map(([grupo, marcadores]) => (
              <div key={grupo} className="mb-4">
                <h4 className="text-sm font-semibold mb-2 opacity-80">{grupo}</h4>
                <div className="space-y-1">
                  {marcadores.map(marcador => (
                    <button
                      key={marcador.id}
                      onClick={() => insertarMarcador(marcador.id)}
                      disabled={!selectedCell}
                      className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                        selectedCell
                          ? theme === 'dark'
                            ? 'hover:bg-gray-700 cursor-pointer'
                            : 'hover:bg-gray-200 cursor-pointer'
                          : 'opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {marcador.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel central: Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de herramientas */}
          <div className={`flex items-center gap-2 p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-1 border-r pr-2">
              <button
                onClick={agregarFila}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Agregar fila"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={eliminarFila}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Eliminar fila"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-1 border-r pr-2">
              <button
                onClick={agregarColumna}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Agregar columna"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={eliminarColumna}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Eliminar columna"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            
            {selectedCell && (
              <>
                <div className="flex items-center gap-1 border-r pr-2">
                  <button
                    onClick={() => aplicarEstilo({ bold: true })}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Negrita"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => aplicarEstilo({ italic: true })}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Cursiva"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1 border-r pr-2">
                  <button
                    onClick={() => aplicarEstilo({ textAlign: 'left' })}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Alinear izquierda"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => aplicarEstilo({ textAlign: 'center' })}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Alinear centro"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => aplicarEstilo({ textAlign: 'right' })}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Alinear derecha"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    onChange={(e) => aplicarEstilo({ color: e.target.value })}
                    className="w-8 h-6 cursor-pointer"
                    title="Color texto"
                  />
                  <input
                    type="color"
                    onChange={(e) => aplicarEstilo({ backgroundColor: e.target.value })}
                    className="w-8 h-6 cursor-pointer"
                    title="Color fondo"
                  />
                </div>
                
                <div className="flex items-center gap-1 border-l pl-2">
                  <button
                    onClick={fusionarCeldas}
                    disabled={!selectedRange}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Fusionar celdas seleccionadas"
                  >
                    <Combine className="w-4 h-4" />
                  </button>
                  <button
                    onClick={separarCeldas}
                    disabled={!selectedCell || !rows[selectedCell.row]?.[selectedCell.col]?.rowSpan && !rows[selectedCell.row]?.[selectedCell.col]?.colSpan}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Separar celdas fusionadas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="relative border-l pl-2">
                  <button
                    onClick={() => setShowBorderSelector(!showBorderSelector)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Bordes"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="16" height="16" strokeWidth="2"/>
                      <line x1="4" y1="12" x2="20" y2="12" strokeWidth="2"/>
                      <line x1="12" y1="4" x2="12" y2="20" strokeWidth="2"/>
                    </svg>
                  </button>
                  
                  {showBorderSelector && (
                    <div className={`absolute top-full left-0 mt-1 p-2 rounded shadow-lg z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`}>
                      <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => aplicarBordes('all')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Todos</button>
                        <button onClick={() => aplicarBordes('outer')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Exterior</button>
                        <button onClick={() => aplicarBordes('none')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Ninguno</button>
                        <button onClick={() => aplicarBordes('top')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Superior</button>
                        <button onClick={() => aplicarBordes('bottom')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Inferior</button>
                        <button onClick={() => aplicarBordes('left')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Izquierda</button>
                        <button onClick={() => aplicarBordes('right')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs">Derecha</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Grid de celdas */}
          <div className="flex-1 overflow-auto p-4">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-8 h-8"></th>
                  {columns.map((col, colIdx) => (
                    <th
                      key={col.id}
                      className={`border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}
                      style={{ width: col.width }}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs">{String.fromCharCode(65 + colIdx)}</span>
                        <input
                          type="number"
                          value={col.width}
                          onChange={(e) => actualizarAnchoColumna(colIdx, parseInt(e.target.value) || 100)}
                          className="w-12 text-xs px-1 bg-transparent"
                          min="50"
                          max="500"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className={`w-8 text-center text-xs border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span>{rowIdx + 1}</span>
                        <input
                          type="number"
                          value={rowHeights[rowIdx] || 30}
                          onChange={(e) => actualizarAlturaFila(rowIdx, parseInt(e.target.value) || 30)}
                          className="w-10 text-xs px-1 bg-transparent"
                          min="20"
                          max="200"
                          title="Altura de fila"
                        />
                      </div>
                    </td>
                    {row.map((cell, colIdx) => {
                      // Si la celda está fusionada (es secundaria), no renderizarla
                      if (cell.isMerged) return null;
                      
                      return (
                      <td
                        key={`${rowIdx}-${colIdx}`}
                        rowSpan={cell.rowSpan || 1}
                        colSpan={cell.colSpan || 1}
                        className={`border ${
                          selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                            ? 'ring-2 ring-blue-500'
                            : theme === 'dark'
                            ? 'border-gray-700'
                            : 'border-gray-300'
                        } ${cell.isMarker ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        style={{
                          width: columns[colIdx].width,
                          height: rowHeights[rowIdx],
                          fontWeight: cell.style?.bold ? 'bold' : 'normal',
                          fontStyle: cell.style?.italic ? 'italic' : 'normal',
                          textAlign: cell.style?.textAlign || 'left',
                          color: cell.style?.color,
                          backgroundColor: cell.style?.backgroundColor,
                        }}
                        onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                      >
                        <input
                          type="text"
                          value={cell.value}
                          onChange={(e) => actualizarCelda(rowIdx, colIdx, e.target.value)}
                          className={`w-full h-full px-2 py-1 bg-transparent outline-none text-sm ${
                            cell.isMarker ? 'font-mono text-blue-600 dark:text-blue-400' : ''
                          }`}
                          placeholder={selectedCell?.row === rowIdx && selectedCell?.col === colIdx ? 'Escribe o selecciona campo...' : ''}
                        />
                      </td>
                    );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel derecho: Propiedades */}
        <div className={`w-64 border-l overflow-y-auto ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-3">⚙️ Configuración</h3>
              
              <label className="block mb-2">
                <span className="text-sm font-medium">Nombre de la Plantilla</span>
                <input
                  type="text"
                  value={nombrePlantilla}
                  onChange={(e) => setNombrePlantilla(e.target.value)}
                  placeholder="Ej: Proforma Estándar"
                  className={`w-full mt-1 px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </label>
              
              <label className="block mb-2">
                <span className="text-sm font-medium">Cliente (opcional)</span>
                <input
                  type="text"
                  value={clientePlantilla}
                  onChange={(e) => setClientePlantilla(e.target.value)}
                  placeholder="Deja vacío para genérica"
                  className={`w-full mt-1 px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </label>
            </div>
            
            {selectedCell && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2 text-sm">📍 Celda Seleccionada</h4>
                <p className="text-xs mb-2">
                  {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
                </p>
                
                <div className="space-y-2 text-xs">
                  <label className="block">
                    <span>Tamaño fuente:</span>
                    <input
                      type="number"
                      min="8"
                      max="24"
                      value={rows[selectedCell.row]?.[selectedCell.col]?.style?.fontSize || 11}
                      onChange={(e) => aplicarEstilo({ fontSize: parseInt(e.target.value) })}
                      className={`w-full mt-1 px-2 py-1 rounded border ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-700'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </label>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 text-sm">💡 Ayuda</h4>
              <ul className="text-xs space-y-1 opacity-70">
                <li>• Haz clic en una celda para seleccionarla</li>
                <li>• Usa los botones de arriba para estilos</li>
                <li>• Los campos con "" son marcadores</li>
                <li>• TABLA_PRODUCTOS crea un loop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de vista previa */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-[90%] h-[90%] rounded-lg shadow-xl flex flex-col ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-semibold">Vista Previa de la Plantilla</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
