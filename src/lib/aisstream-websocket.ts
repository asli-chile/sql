/**
 * Servicio WebSocket para aisstream.io (gratuito)
 * 
 * Este servicio mantiene una conexión WebSocket abierta con aisstream.io
 * y procesa mensajes AIS en tiempo real para actualizar posiciones de buques.
 */

import { WebSocket } from 'ws';
import { createClient } from '@/lib/supabase-server';

type AisstreamMessage = {
  MessageType: string;
  MetaData: {
    MMSI: string;
    IMO?: string;
    ShipName?: string;
    Latitude?: number;
    Longitude?: number;
    NavigationalStatus?: string;
    RateOfTurn?: number;
    SpeedOverGround?: number;
    CourseOverGround?: number;
    Heading?: number;
    PositionAccuracy?: number;
    TimeStamp?: number;
  };
  Message: {
    PositionReport?: {
      MessageID: number;
      RepeatIndicator: number;
      UserID: string; // MMSI
      NavigationalStatus: number;
      RateOfTurn: number;
      SpeedOverGround: number;
      PositionAccuracy: number;
      Longitude: number;
      Latitude: number;
      CourseOverGround: number;
      TrueHeading: number;
      TimeStamp: number;
      ReservedForRegional: number;
      RAIM: number;
    };
    StaticData?: {
      MessageID: number;
      RepeatIndicator: number;
      UserID: string; // MMSI
      IMO: number;
      CallSign: string;
      Name: string;
      TypeAndCargo: number;
      Length: number;
      Beam: number;
      PositionOfReferenceForLengthAndBeam: number;
      TypeOfElectronicPositionFixingDevice: number;
      Draught: number;
      Destination: string;
      DTE: number;
      Spare: number;
    };
  };
};

type SubscriptionMessage = {
  Apikey: string;
  BoundingBoxes?: [[[number, number], [number, number]]];
  FiltersShipMMSI?: string[];
  FilterMessageTypes?: string[];
};

class AisstreamWebSocketService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private reconnectInterval: number = 5000; // 5 segundos
  private maxReconnectAttempts: number = 10;
  private reconnectAttempts: number = 0;
  private isConnecting: boolean = false;
  private activeMMSIs: Set<string> = new Set();
  private supabase: any = null;
  private connectionKeepAliveInterval: NodeJS.Timeout | null = null;
  private messageCount: number = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Inicializa la conexión WebSocket
   */
  async connect(activeMMSIs: string[] = []): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('[AISStream] Ya hay una conexión activa o en proceso');
      return;
    }

    this.isConnecting = true;
    this.activeMMSIs = new Set(activeMMSIs);

    try {
      const wsUrl = 'wss://stream.aisstream.io/v0/stream';
      console.log('[AISStream] Conectando a', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[AISStream] ✅ Conexión WebSocket establecida con aisstream.io');
        console.log('[AISStream] Estado de la conexión:', {
          readyState: this.ws?.readyState,
          url: wsUrl,
          activeMMSIs: this.activeMMSIs.size,
        });
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.messageCount = 0;
        this.subscribe();
        
        // Log periódico para verificar que la conexión sigue activa
        if (this.connectionKeepAliveInterval) {
          clearInterval(this.connectionKeepAliveInterval);
        }
        this.connectionKeepAliveInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[AISStream] 💓 Conexión activa, mensajes recibidos:', this.messageCount);
          }
        }, 30000); // Cada 30 segundos
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          this.messageCount++;
          const rawMessage = data.toString();
          
          // Log los primeros 10 mensajes y luego cada 100
          if (this.messageCount <= 10 || this.messageCount % 100 === 0) {
            console.log('[AISStream] 📨 Mensaje recibido #' + this.messageCount + ':', {
              length: rawMessage.length,
              preview: rawMessage.substring(0, 200),
            });
          }
          
          const message = JSON.parse(rawMessage) as any;
          
          // Verificar si es un mensaje de error o confirmación del servidor
          if (message.error) {
            console.error('[AISStream] ❌ Error del servidor:', message.error);
            if (message.error.message) {
              console.error('[AISStream] Detalles del error:', message.error.message);
            }
            return;
          }
          
          if (message.status) {
            console.log('[AISStream] 📋 Estado del servidor:', message.status);
            if (message.status === 'subscribed') {
              console.log('[AISStream] ✅ Suscripción confirmada por el servidor');
            }
            return;
          }
          
          // Verificar estructura del mensaje
          if (!message.MessageType && !message.MetaData) {
            console.log('[AISStream] ⚠️ Formato de mensaje desconocido:', Object.keys(message));
            return;
          }
          
          const aisMessage = message as AisstreamMessage;
          
          // Log los primeros 10 mensajes procesados y luego cada 50
          if (this.messageCount <= 10 || this.messageCount % 50 === 0) {
            console.log('[AISStream] Mensaje parseado #' + this.messageCount + ':', {
              messageType: aisMessage.MessageType,
              mmsi: aisMessage.MetaData?.MMSI,
              hasPositionReport: !!aisMessage.Message?.PositionReport,
              hasStaticData: !!aisMessage.Message?.StaticData,
            });
          }
          
          await this.processMessage(aisMessage);
        } catch (error) {
          console.error('[AISStream] Error procesando mensaje #' + this.messageCount + ':', error);
          console.error('[AISStream] Datos del mensaje:', data.toString().substring(0, 500));
        }
      });

      this.ws.on('error', (error) => {
        console.error('[AISStream] ❌ Error en WebSocket:', error);
        this.isConnecting = false;
      });

      this.ws.on('close', (code, reason) => {
        console.log('[AISStream] Conexión WebSocket cerrada:', {
          code,
          reason: reason.toString(),
          wasClean: code === 1000,
          messagesReceived: this.messageCount,
        });
        
        // Limpiar intervalo de keep-alive
        if (this.connectionKeepAliveInterval) {
          clearInterval(this.connectionKeepAliveInterval);
          this.connectionKeepAliveInterval = null;
        }
        
        this.isConnecting = false;
        this.ws = null;
        this.messageCount = 0;
        this.reconnect();
      });
    } catch (error) {
      console.error('[AISStream] ❌ Error al conectar:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  /**
   * Envía mensaje de suscripción a aisstream.io
   */
  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[AISStream] WebSocket no está abierto para suscribirse');
      return;
    }

    const subscriptionMessage: SubscriptionMessage = {
      Apikey: this.apiKey,
      BoundingBoxes: [[[-90, -180], [90, 180]]], // Todo el mundo
      FilterMessageTypes: ['PositionReport'], // aisstream.io solo soporta PositionReport, no StaticData
    };

    // Si hay MMSIs específicos, filtrar por ellos en el servidor
    // Esto reduce el tráfico de red y procesamiento innecesario
    // NOTA: aisstream.io puede requerir los MMSIs como números en lugar de strings
    // TEMPORAL: Deshabilitar el filtro para recibir todos los mensajes y verificar que funciona
    const DISABLE_FILTER_FOR_TESTING = false; // Cambiar a true para recibir todos los mensajes
    
    if (this.activeMMSIs.size > 0 && !DISABLE_FILTER_FOR_TESTING) {
      // Convertir strings a números para el filtro (aisstream.io puede requerir números)
      const mmsiNumbers = Array.from(this.activeMMSIs).map(m => parseInt(m, 10)).filter(n => !isNaN(n));
      subscriptionMessage.FiltersShipMMSI = mmsiNumbers.map(n => String(n)); // Mantener como strings por ahora
      console.log('[AISStream] ✅ Filtrando por', this.activeMMSIs.size, 'MMSIs específicos en el servidor');
      console.log('[AISStream] 🔍 MMSIs como números:', mmsiNumbers);
    } else {
      if (DISABLE_FILTER_FOR_TESTING) {
        console.log('[AISStream] ⚠️ MODO PRUEBA: Filtro deshabilitado, recibiendo TODOS los mensajes para verificar que el WebSocket funciona');
      } else {
        console.log('[AISStream] ⚠️ No hay MMSIs activos configurados, recibiendo todos los mensajes (se filtrarán en el procesamiento)');
      }
    }

    console.log('[AISStream] Suscribiéndose con', {
      mmsiCount: this.activeMMSIs.size,
      messageTypes: subscriptionMessage.FilterMessageTypes,
      sampleMMSIs: Array.from(this.activeMMSIs).slice(0, 5),
      allMMSIs: Array.from(this.activeMMSIs), // Mostrar todos los MMSIs para debugging
    });

    const subscriptionJson = JSON.stringify(subscriptionMessage);
    console.log('[AISStream] Enviando suscripción:', subscriptionJson.substring(0, 500));
    
    this.ws.send(subscriptionJson);
  }

  /**
   * Procesa un mensaje AIS recibido
   */
  private async processMessage(message: AisstreamMessage): Promise<void> {
    try {
      const mmsiRaw = message.MetaData?.MMSI;
      if (!mmsiRaw) {
        console.log('[AISStream] ⚠️ Mensaje sin MMSI, ignorando. MessageType:', message.MessageType);
        return;
      }
      
      // Convertir MMSI a string para comparación consistente
      const mmsi = String(mmsiRaw);

      // IMPORTANTE: Solo procesar mensajes de naves que ya existen en vessel_position con MMSI
      // Esto evita crear miles de naves nuevas que no necesitamos
      if (this.activeMMSIs.size > 0 && !this.activeMMSIs.has(mmsi)) {
        // Ignorar mensajes de naves que no están en nuestra lista de activas
        // Log solo cada 1000 mensajes ignorados para no saturar
        if (this.messageCount % 1000 === 0) {
          console.log('[AISStream] ⏭️ Ignorando mensaje de MMSI', mmsi, '(no está en lista de naves activas)');
          console.log('[AISStream] 📋 MMSIs activos configurados:', Array.from(this.activeMMSIs).join(', '));
        }
        return;
      }
      
      // Log cuando recibimos un mensaje de un MMSI que SÍ está en nuestra lista
      if (this.activeMMSIs.size > 0 && this.activeMMSIs.has(mmsi)) {
        console.log('[AISStream] 🎯 Mensaje recibido de MMSI activo:', mmsi, {
          messageType: message.MessageType,
          activeMMSIsCount: this.activeMMSIs.size,
        });
      }

      // Si no hay MMSIs activos configurados, verificar en la base de datos antes de procesar
      if (this.activeMMSIs.size === 0) {
        if (!this.supabase) {
          this.supabase = await createClient();
        }
        
        // Verificar si el MMSI existe en vessel_position
        // Convertir a número para la comparación en la BD (MMSI se guarda como int8)
        const mmsiNumber = parseInt(mmsi, 10);
        if (isNaN(mmsiNumber)) {
          return; // MMSI inválido
        }
        
        const { data: existingCheck } = await this.supabase
          .from('vessel_position')
          .select('mmsi')
          .eq('mmsi', mmsiNumber)
          .limit(1);
        
        if (!existingCheck || existingCheck.length === 0) {
          // No existe en la base de datos, ignorar
          if (this.messageCount % 1000 === 0) {
            console.log('[AISStream] ⏭️ Ignorando mensaje de MMSI', mmsi, '(no existe en vessel_position)');
          }
          return;
        }
      }
      
      // Log solo cada 100 mensajes procesados para no saturar los logs
      if (this.messageCount % 100 === 0) {
        console.log('[AISStream] ✅ Procesando mensaje para MMSI', mmsi, {
          messageType: message.MessageType,
          activeMMSIsCount: this.activeMMSIs.size,
        });
      }

      const positionReport = message.Message?.PositionReport;
      const staticData = message.Message?.StaticData;

      if (positionReport) {
        await this.updatePosition(mmsi, {
          lat: positionReport.Latitude,
          lon: positionReport.Longitude,
          speed: positionReport.SpeedOverGround / 10, // Convertir a nudos
          course: positionReport.CourseOverGround / 10, // Convertir a grados
          heading: positionReport.TrueHeading,
          timestamp: positionReport.TimeStamp,
          navigationalStatus: this.getNavigationalStatus(positionReport.NavigationalStatus),
        });
      }

      if (staticData) {
        await this.updateStaticData(mmsi, {
          imo: staticData.IMO ? String(staticData.IMO) : null,
          name: staticData.Name || null,
          callsign: staticData.CallSign || null,
          shipType: this.getShipType(staticData.TypeAndCargo),
          length: staticData.Length / 10, // Convertir a metros
          beam: staticData.Beam / 10, // Convertir a metros
          draught: staticData.Draught / 10, // Convertir a metros
          destination: staticData.Destination || null,
        });
      }
    } catch (error) {
      console.error('[AISStream] Error procesando mensaje AIS:', error);
    }
  }

  /**
   * Actualiza la posición de un buque en la base de datos
   */
  private async updatePosition(
    mmsi: string,
    data: {
      lat: number;
      lon: number;
      speed?: number;
      course?: number;
      heading?: number;
      timestamp?: number;
      navigationalStatus?: string;
    },
  ): Promise<void> {
    if (!this.supabase) {
      this.supabase = await createClient();
    }

    try {
      // Buscar buque por MMSI (puede haber múltiples registros con el mismo MMSI)
      // Convertir a número para la comparación en la BD (MMSI se guarda como int8)
      const mmsiNumber = parseInt(mmsi, 10);
      if (isNaN(mmsiNumber)) {
        console.error('[AISStream] MMSI inválido:', mmsi);
        return;
      }
      
      const { data: existingRecords, error: findError } = await this.supabase
        .from('vessel_position')
        .select('id, vessel_name, mmsi, imo, last_lat, last_lon')
        .eq('mmsi', mmsiNumber)
        .limit(10); // Limitar a 10 para evitar problemas

      if (findError && findError.code !== 'PGRST116') {
        console.error('[AISStream] Error buscando buque por MMSI', mmsi, ':', findError);
        return;
      }

      // Si hay múltiples registros, preferir el que tenga un nombre real (no placeholder)
      // Si todos son placeholders, usar el primero
      const existing = existingRecords && existingRecords.length > 0 
        ? existingRecords.find(r => r.vessel_name && !r.vessel_name.startsWith('MMSI-')) 
          || existingRecords.find(r => r.last_lat && r.last_lon) 
          || existingRecords[0]
        : null;

      const positionTimestamp = data.timestamp
        ? new Date(data.timestamp * 1000).toISOString()
        : new Date().toISOString();

      const updateData: any = {
        mmsi: mmsiNumber, // Guardar como número para coincidir con el tipo int8 de la BD
        last_lat: data.lat,
        last_lon: data.lon,
        last_position_at: positionTimestamp,
        last_api_call_at: new Date().toISOString(),
        speed: data.speed ?? null,
        course: data.course ?? null,
        navigational_status: data.navigationalStatus ?? null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Actualizar registro existente con las coordenadas reales
        // IMPORTANTE: NO cambiar vessel_name, solo actualizar coordenadas y datos de posición
        const { error: updateError } = await this.supabase
          .from('vessel_position')
          .update(updateData)
          .eq('id', existing.id);

        if (updateError) {
          console.error('[AISStream] Error actualizando posición para MMSI', mmsi, ':', updateError);
        } else {
          // Log solo cada 100 actualizaciones para no saturar
          if (this.messageCount % 100 === 0) {
            console.log(`[AISStream] ✅ Posición actualizada para MMSI ${mmsi} (${existing.vessel_name || 'sin nombre'})`, {
              lat: data.lat,
              lon: data.lon,
              hadPreviousPosition: !!(existing.last_lat && existing.last_lon),
            });
          }
        }
      } else {
        // No existe registro con este MMSI
        // IMPORTANTE: NO crear nuevos registros automáticamente
        // Solo actualizar los que ya existen en vessel_positions
        if (this.messageCount % 1000 === 0) {
          console.log(`[AISStream] ⚠️ MMSI ${mmsi} no existe en vessel_position, ignorando actualización (no se crean naves nuevas automáticamente)`);
        }
        return;
      }

      // Guardar en historial (solo cada 10 posiciones para no saturar la base de datos)
      // Solo si existe el registro
      if (existing && this.messageCount % 10 === 0) {
        try {
          await this.supabase.from('vessel_position_history').insert({
            vessel_name: existing.vessel_name,
            lat: data.lat,
            lon: data.lon,
            position_at: positionTimestamp,
            source: 'AISStream',
          });
        } catch (historyError) {
          // Ignorar errores de historial para no bloquear las actualizaciones principales
          if (this.messageCount % 1000 === 0) {
            console.warn('[AISStream] Error guardando historial (ignorado):', historyError);
          }
        }
      }
    } catch (error) {
      console.error('[AISStream] Error en updatePosition:', error);
    }
  }

  /**
   * Actualiza datos estáticos de un buque
   */
  private async updateStaticData(
    mmsi: string,
    data: {
      imo?: string | null;
      name?: string | null;
      callsign?: string | null;
      shipType?: string | null;
      length?: number;
      beam?: number;
      draught?: number;
      destination?: string | null;
    },
  ): Promise<void> {
    if (!this.supabase) {
      this.supabase = await createClient();
    }

    try {
      // Buscar por MMSI, preferir registros con nombres reales (no placeholders)
      // Convertir a número para la comparación en la BD
      const mmsiNumber = parseInt(mmsi, 10);
      if (isNaN(mmsiNumber)) {
        console.error('[AISStream] MMSI inválido en updateStaticData:', mmsi);
        return;
      }
      
      const { data: existingRecords } = await this.supabase
        .from('vessel_position')
        .select('id, vessel_name, mmsi, imo')
        .eq('mmsi', mmsiNumber)
        .limit(10);

      const existing = existingRecords && existingRecords.length > 0
        ? existingRecords.find(r => r.vessel_name && !r.vessel_name.startsWith('MMSI-'))
          || existingRecords[0]
        : null;

      if (existing) {
        const updateData: any = {
          imo: data.imo ?? null,
          name: data.name ?? null,
          callsign: data.callsign ?? null,
          ship_type: data.shipType ?? null,
          length: data.length ? String(data.length) : null,
          beam: data.beam ? String(data.beam) : null,
          current_draught: data.draught ? String(data.draught) : null,
          destination: data.destination ?? null,
          updated_at: new Date().toISOString(),
        };

        // IMPORTANTE: Solo actualizar vessel_name si es un placeholder (MMSI-XXXXX)
        // NUNCA cambiar un nombre real existente
        if (data.name && existing.vessel_name && existing.vessel_name.startsWith('MMSI-')) {
          updateData.vessel_name = data.name;
          console.log(`[AISStream] 📝 Actualizando nombre de placeholder a nombre real para MMSI ${mmsi}: ${data.name}`);
        }

        await this.supabase
          .from('vessel_position')
          .update(updateData)
          .eq('id', existing.id);

        if (this.messageCount % 100 === 0) {
          console.log(`[AISStream] ✅ Datos estáticos actualizados para MMSI ${mmsi} (${existing.vessel_name || 'sin nombre'})`);
        }
      }
    } catch (error) {
      console.error('[AISStream] Error en updateStaticData:', error);
    }
  }

  /**
   * Convierte código de estado de navegación a texto
   */
  private getNavigationalStatus(code: number): string {
    const statusMap: Record<number, string> = {
      0: 'Under way using engine',
      1: 'At anchor',
      2: 'Not under command',
      3: 'Restricted manoeuvrability',
      4: 'Constrained by her draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in fishing',
      8: 'Under way sailing',
    };
    return statusMap[code] || 'Unknown';
  }

  /**
   * Convierte código de tipo de buque a texto
   */
  private getShipType(code: number): string {
    // Los primeros 3 bits representan el tipo de buque
    const type = code & 0x1f;
    const typeMap: Record<number, string> = {
      0: 'Not available',
      30: 'Fishing',
      31: 'Towing',
      32: 'Towing (long)',
      33: 'Dredging',
      34: 'Diving',
      35: 'Military',
      36: 'Sailing',
      37: 'Pleasure craft',
    };
    return typeMap[type] || 'Cargo';
  }

  /**
   * Intenta reconectar
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AISStream] ❌ Máximo de intentos de reconexión alcanzado');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[AISStream] Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts}) en ${this.reconnectInterval}ms`,
    );

    setTimeout(() => {
      this.connect(Array.from(this.activeMMSIs));
    }, this.reconnectInterval);
  }

  /**
   * Cierra la conexión WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
  }

  /**
   * Actualiza la lista de MMSIs activos y reenvía la suscripción
   */
  updateActiveMMSIs(mmsis: string[]): void {
    this.activeMMSIs = new Set(mmsis);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribe();
    }
  }
}

// Instancia singleton
let aisstreamService: AisstreamWebSocketService | null = null;

/**
 * Obtiene o crea la instancia del servicio WebSocket
 */
export function getAisstreamService(): AisstreamWebSocketService | null {
  const apiKey = process.env.AISSTREAM_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!aisstreamService) {
    aisstreamService = new AisstreamWebSocketService(apiKey);
  }

  return aisstreamService;
}

/**
 * Inicia el servicio WebSocket con los MMSIs activos
 */
export async function startAisstreamService(activeMMSIs: string[] = []): Promise<void> {
  const service = getAisstreamService();
  if (service) {
    await service.connect(activeMMSIs);
  }
}

/**
 * Detiene el servicio WebSocket
 */
export function stopAisstreamService(): void {
  if (aisstreamService) {
    aisstreamService.disconnect();
    aisstreamService = null;
  }
}
