'use client';

import { useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
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
  Combine
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
}

interface Column {
  width: number;
  id: string;
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
  
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [clientePlantilla, setClientePlantilla] = useState('');
  
  // Agregar fila
  const agregarFila = useCallback(() => {
    setRows(prev => [...prev, Array(columns.length).fill(null).map(() => ({ value: '' }))]);
  }, [columns.length]);
  
  // Eliminar fila
  const eliminarFila = useCallback(() => {
    if (rows.length > 1) {
      setRows(prev => prev.slice(0, -1));
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
  
  // Aplicar estilo rápido a celda seleccionada
  const aplicarEstilo = useCallback((estilo: Partial<CellStyle>) => {
    if (selectedCell) {
      actualizarEstiloCelda(selectedCell.row, selectedCell.col, estilo);
    }
  }, [selectedCell, actualizarEstiloCelda]);

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className="text-xl font-bold">✨ Editor Visual de Plantillas Excel</h2>
        <div className="flex gap-2">
          <button
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
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-500 hover:bg-green-600'
            } text-white transition-colors`}
          >
            <Save className="w-4 h-4" />
            Guardar
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
                    <td className={`w-8 h-8 text-center text-xs border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-100'}`}>
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={`${rowIdx}-${colIdx}`}
                        className={`border min-h-[32px] ${
                          selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                            ? 'ring-2 ring-blue-500'
                            : theme === 'dark'
                            ? 'border-gray-700'
                            : 'border-gray-300'
                        } ${cell.isMarker ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        style={{
                          width: columns[colIdx].width,
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
                    ))}
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
    </div>
  );
}
