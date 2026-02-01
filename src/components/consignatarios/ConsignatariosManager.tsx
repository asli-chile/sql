'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useTheme } from '@/contexts/ThemeContext';
import { Consignatario, ConsignatarioFormData } from '@/types/consignatarios';
import { Plus, Edit2, Trash2, X, Save, Search, Building2, MapPin } from 'lucide-react';

interface ConsignatariosManagerProps {
  currentUser: any;
}

export default function ConsignatariosManager({ currentUser }: ConsignatariosManagerProps) {
  const { theme } = useTheme();
  const [consignatarios, setConsignatarios] = useState<Consignatario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<ConsignatarioFormData>({
    nombre: '',
    cliente: '',
    destino: '',
    consignee_company: '',
    consignee_address: '',
    consignee_attn: '',
    consignee_uscc: '',
    consignee_mobile: '',
    consignee_email: '',
    consignee_zip: '',
    notify_company: '',
    notify_address: '',
    notify_attn: '',
    notify_uscc: '',
    notify_mobile: '',
    notify_email: '',
    notify_zip: '',
    notas: '',
  });
  const [copyConsigneeToNotify, setCopyConsigneeToNotify] = useState(false);

  useEffect(() => {
    loadConsignatarios();
  }, []);

  useEffect(() => {
    if (copyConsigneeToNotify) {
      setFormData(prev => ({
        ...prev,
        notify_company: prev.consignee_company,
        notify_address: prev.consignee_address,
        notify_attn: prev.consignee_attn,
        notify_uscc: prev.consignee_uscc,
        notify_mobile: prev.consignee_mobile,
        notify_email: prev.consignee_email,
        notify_zip: prev.consignee_zip,
      }));
    }
  }, [copyConsigneeToNotify, formData.consignee_company, formData.consignee_address, formData.consignee_attn, formData.consignee_uscc, formData.consignee_mobile, formData.consignee_email, formData.consignee_zip]);

  const loadConsignatarios = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('consignatarios')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setConsignatarios(data || []);
    } catch (error) {
      console.error('Error cargando consignatarios:', error);
      alert('Error al cargar consignatarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (consignatario?: Consignatario) => {
    if (consignatario) {
      setEditingId(consignatario.id);
      setFormData({
        nombre: consignatario.nombre,
        cliente: consignatario.cliente,
        destino: consignatario.destino,
        consignee_company: consignatario.consignee_company,
        consignee_address: consignatario.consignee_address || '',
        consignee_attn: consignatario.consignee_attn || '',
        consignee_uscc: consignatario.consignee_uscc || '',
        consignee_mobile: consignatario.consignee_mobile || '',
        consignee_email: consignatario.consignee_email || '',
        consignee_zip: consignatario.consignee_zip || '',
        notify_company: consignatario.notify_company,
        notify_address: consignatario.notify_address || '',
        notify_attn: consignatario.notify_attn || '',
        notify_uscc: consignatario.notify_uscc || '',
        notify_mobile: consignatario.notify_mobile || '',
        notify_email: consignatario.notify_email || '',
        notify_zip: consignatario.notify_zip || '',
        notas: consignatario.notas || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: '',
        cliente: '',
        destino: '',
        consignee_company: '',
        consignee_address: '',
        consignee_attn: '',
        consignee_uscc: '',
        consignee_mobile: '',
        consignee_email: '',
        consignee_zip: '',
        notify_company: '',
        notify_address: '',
        notify_attn: '',
        notify_uscc: '',
        notify_mobile: '',
        notify_email: '',
        notify_zip: '',
        notas: '',
      });
    }
    setCopyConsigneeToNotify(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCopyConsigneeToNotify(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.cliente || !formData.destino || !formData.consignee_company || !formData.notify_company) {
      alert('Por favor completa los campos obligatorios: Nombre, Cliente, Destino, Consignee Company y Notify Company');
      return;
    }

    try {
      const supabase = createClient();
      const dataToSave = {
        ...formData,
        created_by: currentUser?.id,
        activo: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from('consignatarios')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        alert('Consignatario actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('consignatarios')
          .insert([dataToSave]);

        if (error) throw error;
        alert('Consignatario creado correctamente');
      }

      handleCloseModal();
      loadConsignatarios();
    } catch (error: any) {
      console.error('Error guardando consignatario:', error);
      if (error.code === '23505') {
        alert('Ya existe un consignatario con ese nombre, cliente y destino');
      } else {
        alert('Error al guardar consignatario');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este consignatario?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('consignatarios')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      alert('Consignatario desactivado correctamente');
      loadConsignatarios();
    } catch (error) {
      console.error('Error eliminando consignatario:', error);
      alert('Error al eliminar consignatario');
    }
  };

  const filteredConsignatarios = consignatarios.filter(c => {
    if (!searchTerm) return c.activo;
    const search = searchTerm.toLowerCase();
    return c.activo && (
      c.nombre.toLowerCase().includes(search) ||
      c.cliente.toLowerCase().includes(search) ||
      c.destino.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Gestión de Consignatarios
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {filteredConsignatarios.length} consignatarios registrados
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-sky-600 text-white hover:bg-sky-500'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          <Plus className="h-4 w-4" />
          Nuevo Consignatario
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
        <input
          type="text"
          placeholder="Buscar por nombre, cliente o destino..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 border text-sm ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          }`}
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConsignatarios.map((consignatario) => (
          <div
            key={consignatario.id}
            className={`border p-4 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {consignatario.nombre}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    {consignatario.cliente}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`} />
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    {consignatario.destino}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenModal(consignatario)}
                  className={`p-1.5 border transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Editar"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(consignatario.id)}
                  className={`p-1.5 border transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700 text-red-400 hover:bg-red-900/20'
                      : 'border-gray-300 text-red-600 hover:bg-red-50'
                  }`}
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Consignee:
                </p>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {consignatario.consignee_company}
                </p>
              </div>
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Notify:
                </p>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {consignatario.notify_company}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredConsignatarios.length === 0 && (
        <div className="text-center py-12">
          <Building2 className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {searchTerm ? 'No se encontraron consignatarios' : 'No hay consignatarios registrados'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto border ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'
          }`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300'
            }`}>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Editar Consignatario' : 'Nuevo Consignatario'}
              </h3>
              <button
                onClick={handleCloseModal}
                className={`p-1 transition-colors ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-6">
              {/* Información General */}
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Información General
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="HappyFarm"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Cliente <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="FRUTAS DEL SUR"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Destino <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.destino}
                      onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Shanghai"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Consignee */}
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Consignee <span className="text-red-500">*</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.consignee_company}
                      onChange={(e) => setFormData({ ...formData, consignee_company: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Address
                    </label>
                    <textarea
                      value={formData.consignee_address}
                      onChange={(e) => setFormData({ ...formData, consignee_address: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Attn
                    </label>
                    <input
                      type="text"
                      value={formData.consignee_attn}
                      onChange={(e) => setFormData({ ...formData, consignee_attn: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      USCC
                    </label>
                    <input
                      type="text"
                      value={formData.consignee_uscc}
                      onChange={(e) => setFormData({ ...formData, consignee_uscc: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Mobile
                    </label>
                    <input
                      type="text"
                      value={formData.consignee_mobile}
                      onChange={(e) => setFormData({ ...formData, consignee_mobile: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.consignee_email}
                      onChange={(e) => setFormData({ ...formData, consignee_email: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={formData.consignee_zip}
                      onChange={(e) => setFormData({ ...formData, consignee_zip: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Copiar datos a Notify */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="copyToNotify"
                  checked={copyConsigneeToNotify}
                  onChange={(e) => setCopyConsigneeToNotify(e.target.checked)}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="copyToNotify"
                  className={`text-sm cursor-pointer ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}
                >
                  Copiar datos de Consignee a Notify
                </label>
              </div>

              {/* Notify */}
              <div>
                <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Notify/Notificante <span className="text-red-500">*</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Company <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.notify_company}
                      onChange={(e) => setFormData({ ...formData, notify_company: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Address
                    </label>
                    <textarea
                      value={formData.notify_address}
                      onChange={(e) => setFormData({ ...formData, notify_address: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Attn
                    </label>
                    <input
                      type="text"
                      value={formData.notify_attn}
                      onChange={(e) => setFormData({ ...formData, notify_attn: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      USCC
                    </label>
                    <input
                      type="text"
                      value={formData.notify_uscc}
                      onChange={(e) => setFormData({ ...formData, notify_uscc: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Mobile
                    </label>
                    <input
                      type="text"
                      value={formData.notify_mobile}
                      onChange={(e) => setFormData({ ...formData, notify_mobile: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.notify_email}
                      onChange={(e) => setFormData({ ...formData, notify_email: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={formData.notify_zip}
                      onChange={(e) => setFormData({ ...formData, notify_zip: e.target.value })}
                      className={`w-full px-3 py-2 border text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className={`w-full px-3 py-2 border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={3}
                  placeholder="Información adicional..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`px-4 py-2 text-sm font-medium border transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-sky-600 text-white hover:bg-sky-500'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
