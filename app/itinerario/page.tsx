'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';
import { Plus } from 'lucide-react';
import { ItinerarioFilters } from '@/components/itinerario/ItinerarioFilters';
import { ItinerarioTable } from '@/components/itinerario/ItinerarioTable';
import { ItinerarioCard } from '@/components/itinerario/ItinerarioCard';
import { VoyageDrawer } from '@/components/itinerario/VoyageDrawer';
import { NewVoyageModal } from '@/components/itinerario/NewVoyageModal';
import { fetchItinerarios } from '@/lib/itinerarios-service';
import type { ItinerarioWithEscalas, ItinerarioFilters as FiltersType } from '@/types/itinerarios';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { AppFooter } from '@/components/AppFooter';

export default function ItinerarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [itinerarios, setItinerarios] = useState<ItinerarioWithEscalas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersType>({});
  const [selectedItinerario, setSelectedItinerario] = useState<ItinerarioWithEscalas | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error || !currentUser) {
          router.push('/auth');
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };

    void checkUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const loadItinerarios = async () => {
      try {
        setIsLoading(true);
        const data = await fetchItinerarios();
        setItinerarios(data);
      } catch (error) {
        console.error('Error loading itinerarios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadItinerarios();
  }, [user]);

  // Obtener valores únicos para los filtros
  const servicios = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.servicio))).sort(),
    [itinerarios]
  );

  const consorcios = useMemo(
    () =>
      Array.from(
        new Set(itinerarios.map((it) => it.consorcio).filter((c): c is string => !!c))
      ).sort(),
    [itinerarios]
  );

  const naves = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.nave))).sort(),
    [itinerarios]
  );

  const pols = useMemo(
    () => Array.from(new Set(itinerarios.map((it) => it.pol))).sort(),
    [itinerarios]
  );

  // Filtrar itinerarios
  const filteredItinerarios = useMemo(() => {
    return itinerarios.filter((it) => {
      if (filters.servicio && it.servicio !== filters.servicio) return false;
      if (filters.consorcio && it.consorcio !== filters.consorcio) return false;
      if (filters.nave && it.nave !== filters.nave) return false;
      if (filters.semana && it.semana !== filters.semana) return false;
      if (filters.pol && it.pol !== filters.pol) return false;
      return true;
    });
  }, [itinerarios, filters]);

  const handleViewDetail = (itinerario: ItinerarioWithEscalas) => {
    setSelectedItinerario(itinerario);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItinerario(null);
  };

  const handleSave = async () => {
    // Recargar itinerarios
    try {
      const data = await fetchItinerarios();
      setItinerarios(data);
    } catch (error) {
      console.error('Error reloading itinerarios:', error);
    }
  };

  const handleDelete = async () => {
    // Recargar itinerarios
    try {
      const data = await fetchItinerarios();
      setItinerarios(data);
    } catch (error) {
      console.error('Error reloading itinerarios:', error);
    }
  };

  if (loadingUser) {
    return <LoadingScreen message="Cargando itinerarios..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col w-full min-w-0">
        {/* Header */}
        <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-sm sticky top-0 z-30">
          <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-50">Itinerarios</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Seguimiento semanal de servicios y naves
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#00AEEF] hover:bg-[#4FC3F7] rounded-lg transition-all duration-150 shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Nuevo Viaje
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div className="mx-auto w-full max-w-[1600px] px-3 pb-10 pt-4 space-y-4 sm:px-6 sm:pt-6 sm:space-y-6 lg:px-8 lg:space-y-6 xl:px-10 xl:space-y-8">
            {/* Filtros */}
            <ItinerarioFilters
              servicios={servicios}
              consorcios={consorcios}
              naves={naves}
              pols={pols}
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters({})}
            />

            {/* Contenido */}
            {isLoading ? (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-12 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00AEEF] border-t-transparent" />
                  <span className="text-sm text-slate-400">Cargando itinerarios...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Vista Desktop (Tabla) */}
                <div className="hidden lg:block">
                  <ItinerarioTable
                    itinerarios={filteredItinerarios}
                    onViewDetail={handleViewDetail}
                  />
                </div>

                {/* Vista Mobile (Cards) */}
                <div className="lg:hidden space-y-4">
                  {filteredItinerarios.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-12 text-center">
                      <p className="text-slate-400">No hay itinerarios disponibles</p>
                    </div>
                  ) : (
                    filteredItinerarios.map((itinerario) => (
                      <ItinerarioCard
                        key={itinerario.id}
                        itinerario={itinerario}
                        onViewDetail={handleViewDetail}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            <AppFooter className="mt-6" />
          </div>
        </main>

        {/* Drawer de edición */}
        <VoyageDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          itinerario={selectedItinerario}
          onSave={handleSave}
          onDelete={handleDelete}
        />

        {/* Modal nuevo viaje */}
        <NewVoyageModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={handleSave}
        />
      </div>
    </div>
  );
}

