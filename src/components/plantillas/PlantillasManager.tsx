'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { PlantillaProforma, PlantillaFormData, LISTA_MARCADORES } from '@/types/plantillas-proforma';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Edit,
  Eye,
  Download,
  Plus,
  X,
  Check,
  AlertCircle,
  Star,
  Copy,
  Info,
} from 'lucide-react';
import { previsualizarPlantilla } from '@/lib/plantilla-helpers';

interface PlantillasManagerProps {
  currentUser: any;
}

export function PlantillasManager({ currentUser }: PlantillasManagerProps) {
  const { theme } = useTheme();
  const supabase = createClient();
  
  const [plantillas, setPlantillas] = useState<PlantillaProforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMarcadoresInfo, setShowMarcadoresInfo] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaProforma | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<PlantillaFormData>({
    nombre: '',
    cliente: '',
    descripcion: '',
    tipo_factura: 'proforma',
    archivo: null,
    configuracion: {
      idioma: 'es',
      formato_fecha: 'DD/MM/YYYY',
      moneda: 'USD',
      separador_decimal: '.',
      incluir_logo: true,
    },
    activa: true,
    es_default: false,
  });

  // Cargar plantillas
  useEffect(() => {
    loadPlantillas();
  }, []);

  const loadPlantillas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plantillas_proforma')
        .select('*')
        .order('cliente', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlantillas(data || []);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea un archivo Excel
      const validExtensions = ['.xlsx', '.xls'];
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(extension)) {
        alert('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
      }
      
      setFormData({ ...formData, archivo: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.archivo && !editingPlantilla) {
      alert('Por favor selecciona un archivo Excel');
      return;
    }

    try {
      setUploading(true);

      let archivoUrl = editingPlantilla?.archivo_url || '';
      let archivoNombre = editingPlantilla?.archivo_nombre || '';
      let archivoSize = editingPlantilla?.archivo_size || 0;

      // Si hay un archivo nuevo, subirlo
      if (formData.archivo) {
        const fileName = `${Date.now()}-${formData.archivo.name}`;
        const filePath = `plantillas-proforma/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, formData.archivo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);

        archivoUrl = publicUrl;
        archivoNombre = formData.archivo.name;
        archivoSize = formData.archivo.size;
      }

      // Preparar datos para insertar/actualizar
      const plantillaData = {
        nombre: formData.nombre,
        cliente: formData.cliente || null,
        descripcion: formData.descripcion || null,
        tipo_factura: formData.tipo_factura,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre,
        archivo_size: archivoSize,
        configuracion: formData.configuracion,
        activa: formData.activa,
        es_default: formData.es_default,
        created_by: currentUser?.id,
      };

      if (editingPlantilla) {
        // Actualizar
        const { error } = await supabase
          .from('plantillas_proforma')
          .update(plantillaData)
          .eq('id', editingPlantilla.id);

        if (error) throw error;
      } else {
        // Insertar
        const { error } = await supabase
          .from('plantillas_proforma')
          .insert([plantillaData]);

        if (error) throw error;
      }

      alert(editingPlantilla ? '✅ Plantilla actualizada' : '✅ Plantilla creada');
      handleCloseModal();
      loadPlantillas();
    } catch (error: any) {
      console.error('Error guardando plantilla:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (plantilla: PlantillaProforma) => {
    if (!confirm(`¿Eliminar plantilla "${plantilla.nombre}"?`)) return;

    try {
      // Eliminar archivo de storage
      if (plantilla.archivo_url) {
        const path = plantilla.archivo_url.split('/plantillas-proforma/')[1];
        if (path) {
          await supabase.storage
            .from('documentos')
            .remove([`plantillas-proforma/${path}`]);
        }
      }

      // Eliminar registro
      const { error } = await supabase
        .from('plantillas_proforma')
        .delete()
        .eq('id', plantilla.id);

      if (error) throw error;

      alert('✅ Plantilla eliminada');
      loadPlantillas();
    } catch (error: any) {
      console.error('Error eliminando plantilla:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleEdit = (plantilla: PlantillaProforma) => {
    setEditingPlantilla(plantilla);
    setFormData({
      nombre: plantilla.nombre,
      cliente: plantilla.cliente || '',
      descripcion: plantilla.descripcion || '',
      tipo_factura: plantilla.tipo_factura,
      archivo: null,
      configuracion: plantilla.configuracion,
      activa: plantilla.activa,
      es_default: plantilla.es_default,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlantilla(null);
    setFormData({
      nombre: '',
      cliente: '',
      descripcion: '',
      tipo_factura: 'proforma',
      archivo: null,
      configuracion: {
        idioma: 'es',
        formato_fecha: 'DD/MM/YYYY',
        moneda: 'USD',
        separador_decimal: '.',
        incluir_logo: true,
      },
      activa: true,
      es_default: false,
    });
  };

  const handleDownload = async (plantilla: PlantillaProforma) => {
    try {
      const response = await fetch(plantilla.archivo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = plantilla.archivo_nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      alert('❌ Error al descargar la plantilla');
    }
  };

  const handlePreview = async (plantilla: PlantillaProforma) => {
    try {
      alert('⏳ Generando vista previa con datos de ejemplo...');
      const { blob, fileName } = await previsualizarPlantilla(plantilla.id);
      
      // Descargar el archivo de preview
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ Vista previa generada y descargada');
    } catch (error) {
      console.error('Error generando preview:', error);
      alert('❌ Error al generar vista previa');
    }
  };

  const toggleDefault = async (plantilla: PlantillaProforma) => {
    try {
      const { error } = await supabase
        .from('plantillas_proforma')
        .update({ es_default: !plantilla.es_default })
        .eq('id', plantilla.id);

      if (error) throw error;
      loadPlantillas();
    } catch (error: any) {
      console.error('Error actualizando plantilla:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
            theme === 'dark' ? 'border-sky-400' : 'border-blue-600'
          }`}></div>
          <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Cargando plantillas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Plantillas de Proforma
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Gestiona plantillas Excel personalizadas por cliente
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMarcadoresInfo(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Marcadores</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-sky-600 text-white hover:bg-sky-500'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Lista de Plantillas */}
      {plantillas.length === 0 ? (
        <div className={`text-center py-12 border rounded-lg ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <FileSpreadsheet className={`h-16 w-16 mx-auto mb-4 ${
            theme === 'dark' ? 'text-slate-600' : 'text-gray-300'
          }`} />
          <p className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
            No hay plantillas creadas
          </p>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            Crea tu primera plantilla personalizada
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.id}
              className={`border rounded-lg p-4 transition-shadow hover:shadow-lg ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className={`h-5 w-5 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <div>
                    <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {plantilla.nombre}
                    </h4>
                    {plantilla.cliente && (
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        {plantilla.cliente}
                      </p>
                    )}
                  </div>
                </div>
                {plantilla.es_default && (
                  <Star className={`h-4 w-4 fill-current ${
                    theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
                  }`} />
                )}
              </div>

              {plantilla.descripcion && (
                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {plantilla.descripcion}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {plantilla.tipo_factura}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  plantilla.activa
                    ? theme === 'dark'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-green-50 text-green-700'
                    : theme === 'dark'
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {plantilla.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(plantilla)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-violet-900/30 text-violet-400 hover:bg-violet-900/40'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                  title="Vista previa con datos de ejemplo"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(plantilla)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Descargar plantilla original"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleDefault(plantilla)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                    plantilla.es_default
                      ? theme === 'dark'
                        ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/40'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title={plantilla.es_default ? 'Quitar como default' : 'Marcar como default'}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleEdit(plantilla)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-sky-900/30 text-sky-400 hover:bg-sky-900/40'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                  title="Editar"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(plantilla)}
                  className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs rounded transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/40'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className={`sticky top-0 p-4 border-b ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className={`p-2 rounded hover:bg-opacity-10 ${
                    theme === 'dark' ? 'hover:bg-white' : 'hover:bg-black'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Nombre */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Ej: Proforma Estándar Almafruit"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Cliente (opcional)
                </label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Ej: ALMAFRUIT (dejar vacío para plantilla genérica)"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Describe para qué sirve esta plantilla..."
                />
              </div>

              {/* Tipo de Factura */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Tipo de Documento
                </label>
                <select
                  value={formData.tipo_factura}
                  onChange={(e) => setFormData({ ...formData, tipo_factura: e.target.value as any })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="proforma">Proforma Invoice</option>
                  <option value="commercial_invoice">Commercial Invoice</option>
                  <option value="packing_list">Packing List</option>
                </select>
              </div>

              {/* Archivo Excel */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Archivo Excel {!editingPlantilla && '*'}
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-700'
                    : 'border-gray-300 bg-gray-50'
                }`}>
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-block px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-600 text-white hover:bg-slate-500'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Seleccionar archivo
                  </label>
                  {formData.archivo && (
                    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      📄 {formData.archivo.name}
                    </p>
                  )}
                  {editingPlantilla && !formData.archivo && (
                    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      Archivo actual: {editingPlantilla.archivo_nombre}
                    </p>
                  )}
                </div>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  Acepta archivos .xlsx o .xls con marcadores (ver guía de marcadores)
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                    className="rounded"
                  />
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Plantilla activa
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_default}
                    onChange={(e) => setFormData({ ...formData, es_default: e.target.checked })}
                    className="rounded"
                  />
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Plantilla por defecto para este cliente
                  </span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700 bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-sky-600 text-white hover:bg-sky-500'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {editingPlantilla ? 'Actualizar' : 'Crear Plantilla'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Información de Marcadores */}
      {showMarcadoresInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className={`sticky top-0 p-4 border-b ${
              theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Marcadores Disponibles
                </h3>
                <button
                  onClick={() => setShowMarcadoresInfo(false)}
                  className={`p-2 rounded hover:bg-opacity-10 ${
                    theme === 'dark' ? 'hover:bg-white' : 'hover:bg-black'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-sky-900/20 border-sky-700' : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-sky-300' : 'text-blue-800'}`}>
                  💡 <strong>Tip:</strong> Copia estos marcadores y pégalos en tu plantilla Excel. El sistema los reemplazará automáticamente con los datos reales.
                </p>
              </div>

              <div className={`border rounded-lg overflow-hidden ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div className={`grid grid-cols-2 gap-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  {LISTA_MARCADORES.map((marcador) => (
                    <div
                      key={marcador}
                      className={`p-3 flex items-center justify-between group ${
                        theme === 'dark' ? 'bg-slate-800' : 'bg-white'
                      }`}
                    >
                      <code className={`text-sm font-mono ${
                        theme === 'dark' ? 'text-sky-400' : 'text-blue-600'
                      }`}>
                        {marcador}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(marcador);
                          alert(`✅ Copiado: ${marcador}`);
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity ${
                          theme === 'dark'
                            ? 'hover:bg-slate-700'
                            : 'hover:bg-gray-100'
                        }`}
                        title="Copiar"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  📖 <strong>Documentación completa:</strong> Consulta el archivo <code>docs/MARCADORES-PLANTILLAS-PROFORMA.md</code> para ejemplos detallados y mejores prácticas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
