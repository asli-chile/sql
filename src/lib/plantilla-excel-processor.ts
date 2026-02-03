// Procesador de plantillas Excel con marcadores
import ExcelJS from 'exceljs';
import { DatosPlantilla, ProductoPlantilla } from '@/types/plantillas-proforma';

export class PlantillaExcelProcessor {
  private workbook: ExcelJS.Workbook;
  private datos: DatosPlantilla;

  constructor(datos: DatosPlantilla) {
    this.workbook = new ExcelJS.Workbook();
    this.datos = datos;
  }

  /**
   * Carga una plantilla Excel desde una URL
   */
  async cargarPlantilla(url: string): Promise<void> {
    try {
      console.log('🔄 Cargando plantilla desde:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error cargando plantilla: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('📦 ArrayBuffer size:', arrayBuffer.byteLength);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('El archivo está vacío');
      }
      
      await this.workbook.xlsx.load(arrayBuffer);
      
      const sheetsCount = this.workbook.worksheets.length;
      console.log('📊 Hojas cargadas:', sheetsCount);
      
      if (sheetsCount === 0) {
        throw new Error('El archivo Excel no contiene hojas de trabajo');
      }
      
      // Verificar que el workbook realmente tiene contenido
      let totalCellsLoaded = 0;
      this.workbook.eachSheet((worksheet) => {
        const rowCount = worksheet.rowCount;
        const columnCount = worksheet.columnCount;
        let cellCount = 0;
        worksheet.eachRow((row) => {
          row.eachCell({ includeEmpty: false }, () => {
            cellCount++;
          });
        });
        totalCellsLoaded += cellCount;
        console.log(`  - Hoja "${worksheet.name}": ${rowCount} filas, ${columnCount} columnas, ${cellCount} celdas con contenido`);
      });
      
      if (totalCellsLoaded === 0) {
        throw new Error('El archivo Excel se cargó pero está vacío (no tiene celdas con contenido)');
      }
      
      console.log(`✅ Plantilla cargada correctamente: ${totalCellsLoaded} celdas con contenido en total`);
    } catch (error: any) {
      console.error('❌ Error en cargarPlantilla:', error);
      throw new Error(`No se pudo cargar la plantilla: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Procesa la plantilla reemplazando todos los marcadores
   */
  async procesar(): Promise<ExcelJS.Workbook> {
    console.log('🔧 Iniciando procesamiento de plantilla...');
    console.log('📋 Datos disponibles:', {
      productos: this.datos.productos.length,
      exportador: this.datos.exportador_nombre,
      consignee: this.datos.consignee_company
    });
    
    // Verificar que el workbook tiene contenido antes de procesar
    let totalCellsBefore = 0;
    this.workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell({ includeEmpty: false }, () => {
          totalCellsBefore++;
        });
      });
    });
    console.log(`📊 Celdas con contenido antes de procesar: ${totalCellsBefore}`);
    
    if (totalCellsBefore === 0) {
      throw new Error('El workbook está vacío antes del procesamiento. La plantilla no se cargó correctamente.');
    }
    
    // Procesar cada hoja del libro
    this.workbook.eachSheet((worksheet, sheetId) => {
      const rowCountBefore = worksheet.rowCount;
      const cellCountBefore = worksheet.actualColumnCount;
      console.log(`📄 Procesando hoja ${sheetId}: "${worksheet.name}" (${rowCountBefore} filas, ${cellCountBefore} columnas)`);
      
      this.procesarHoja(worksheet);
      
      const rowCountAfter = worksheet.rowCount;
      const cellCountAfter = worksheet.actualColumnCount;
      console.log(`✅ Hoja "${worksheet.name}" procesada (${rowCountAfter} filas, ${cellCountAfter} columnas)`);
    });

    // Verificar que el workbook todavía tiene contenido después de procesar
    let totalCellsAfter = 0;
    this.workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell({ includeEmpty: false }, () => {
          totalCellsAfter++;
        });
      });
    });
    console.log(`📊 Celdas con contenido después de procesar: ${totalCellsAfter}`);
    
    if (totalCellsAfter === 0) {
      throw new Error('El workbook quedó vacío después del procesamiento. Los cambios no se aplicaron correctamente.');
    }
    
    if (totalCellsAfter < totalCellsBefore) {
      console.warn(`⚠️ ADVERTENCIA: Se perdieron ${totalCellsBefore - totalCellsAfter} celdas durante el procesamiento`);
    }

    console.log('✅ Procesamiento completado');
    return this.workbook;
  }

  /**
   * Procesa una hoja individual - SOLO reemplaza marcadores sin modificar estructura
   */
  private procesarHoja(worksheet: ExcelJS.Worksheet): void {
    console.log(`📄 Procesando hoja "${worksheet.name}"...`);
    
    // Buscar fila de productos
    const filaProductos = this.encontrarFilaProductos(worksheet);
    
    // IMPORTANTE: Guardar valores ORIGINALES de la fila de productos ANTES de procesar
    let valoresOriginalesFilaProductos: Map<number, any> = new Map();
    let estilosFilaProductos: Map<number, any> = new Map();
    
    if (filaProductos) {
      console.log(`✅ Fila de productos encontrada en fila ${filaProductos}`);
      const filaPlantilla = worksheet.getRow(filaProductos);
      
      // Guardar valores y estilos ORIGINALES (con marcadores sin procesar)
      filaPlantilla.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (colNumber === 0) return;
        
        // Guardar valor original (con marcadores)
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object') {
            valoresOriginalesFilaProductos.set(colNumber, JSON.parse(JSON.stringify(cell.value)));
          } else {
            valoresOriginalesFilaProductos.set(colNumber, cell.value);
          }
        }
        
        // Guardar estilos
        estilosFilaProductos.set(colNumber, {
          font: cell.font ? JSON.parse(JSON.stringify(cell.font)) : undefined,
          alignment: cell.alignment ? JSON.parse(JSON.stringify(cell.alignment)) : undefined,
          fill: cell.fill ? JSON.parse(JSON.stringify(cell.fill)) : undefined,
          border: cell.border ? JSON.parse(JSON.stringify(cell.border)) : undefined,
          numFmt: cell.numFmt,
        });
      });
      
      console.log(`  📊 Valores originales guardados: ${valoresOriginalesFilaProductos.size} celdas`);
    } else {
      console.log(`ℹ️ No se encontró fila de productos en esta hoja`);
    }

    // ESTRATEGIA SIMPLIFICADA: Solo buscar y reemplazar marcadores {{}} en todas las celdas
    // NO modificar la estructura del Excel (no insertar/eliminar filas)
    
    const cambios: Array<{ row: number; col: number; value: any }> = [];
    let celdasProcesadas = 0;
    let marcadoresEncontrados = 0;
    
    // Recopilar TODOS los cambios primero (sin modificar nada aún)
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        const value = cell.value;
        celdasProcesadas++;
        
        if (value === null || value === undefined) {
          return;
        }
        
        const colNumber = typeof cell.col === 'number' ? cell.col : Number(cell.col);
        let nuevoValor: any = null;
        let necesitaCambio = false;
        
        if (typeof value === 'string') {
          // Buscar marcadores {{}} o "MARCADOR" o cualquier marcador de producto
          const tieneMarcadores = value.includes('{{') || value.includes('"') || 
                                  value.includes('PRODUCTO_ESPECIE') || 
                                  value.includes('PRODUCTO_CANTIDAD') ||
                                  value.includes('PRODUCTO_TIPO_ENVASE') ||
                                  value.includes('PRODUCTO_VARIEDAD') ||
                                  value.includes('PRODUCTO_TOTAL');
          
          if (tieneMarcadores) {
            // Si es fila de productos, procesar con datos del producto
            if (filaProductos && rowNumber === filaProductos && this.datos.productos.length > 0) {
              // Procesar con el primer producto
              nuevoValor = this.reemplazarMarcadoresProducto(value, this.datos.productos[0]);
              // También reemplazar marcadores generales
              nuevoValor = this.reemplazarMarcadores(nuevoValor);
            } else {
              // Marcadores generales
              nuevoValor = this.reemplazarMarcadores(value);
            }
            
            if (nuevoValor !== value) {
              necesitaCambio = true;
              marcadoresEncontrados++;
            }
          }
        } else if (typeof value === 'object' && 'richText' in value) {
          // Rich text - procesar cada parte
          const richText = (value as any).richText;
          if (Array.isArray(richText)) {
            let needsUpdate = false;
            const processedRichText = richText.map((rt: any) => {
              if (rt.text && typeof rt.text === 'string') {
                const tieneMarcadores = rt.text.includes('{{') || rt.text.includes('"') ||
                                       rt.text.includes('PRODUCTO_ESPECIE') ||
                                       rt.text.includes('PRODUCTO_CANTIDAD') ||
                                       rt.text.includes('PRODUCTO_TIPO_ENVASE') ||
                                       rt.text.includes('PRODUCTO_VARIEDAD') ||
                                       rt.text.includes('PRODUCTO_TOTAL');
                
                if (tieneMarcadores) {
                  let processedText = rt.text;
                  
                  // Si es fila de productos, procesar con datos del producto
                  if (filaProductos && rowNumber === filaProductos && this.datos.productos.length > 0) {
                    processedText = this.reemplazarMarcadoresProducto(processedText, this.datos.productos[0]);
                    processedText = this.reemplazarMarcadores(processedText);
                  } else {
                    processedText = this.reemplazarMarcadores(processedText);
                  }
                  
                  if (processedText !== rt.text) {
                    needsUpdate = true;
                    return { ...rt, text: processedText };
                  }
                }
              }
              return rt;
            });
            
            if (needsUpdate) {
              nuevoValor = { richText: processedRichText };
              necesitaCambio = true;
              marcadoresEncontrados++;
            }
          }
        } else if (typeof value === 'object' && 'formula' in value) {
          // Fórmulas - reemplazar marcadores en la fórmula
          const formula = (value as any).formula;
          const tieneMarcadores = typeof formula === 'string' && (
            formula.includes('{{') || 
            formula.includes('"') ||
            formula.includes('PRODUCTO_ESPECIE') ||
            formula.includes('PRODUCTO_CANTIDAD') ||
            formula.includes('PRODUCTO_TIPO_ENVASE') ||
            formula.includes('PRODUCTO_VARIEDAD') ||
            formula.includes('PRODUCTO_TOTAL')
          );
          
          if (tieneMarcadores) {
            let processedFormula = formula;
            
            // Si es fila de productos, procesar con datos del producto
            if (filaProductos && rowNumber === filaProductos && this.datos.productos.length > 0) {
              processedFormula = this.reemplazarMarcadoresProducto(processedFormula, this.datos.productos[0]);
              processedFormula = this.reemplazarMarcadores(processedFormula);
            } else {
              processedFormula = this.reemplazarMarcadores(processedFormula);
            }
            
            if (processedFormula !== formula) {
              nuevoValor = { ...value, formula: processedFormula };
              necesitaCambio = true;
              marcadoresEncontrados++;
            }
          }
        }
        
        if (necesitaCambio && nuevoValor !== null) {
          cambios.push({ row: rowNumber, col: colNumber, value: nuevoValor });
        }
      });
    });
    
    console.log(`  📊 Celdas procesadas: ${celdasProcesadas}, Marcadores encontrados: ${marcadoresEncontrados}, Cambios a aplicar: ${cambios.length}`);
    
    // Aplicar todos los cambios
    cambios.forEach((cambio) => {
      try {
        const row = worksheet.getRow(cambio.row);
        const cell = row.getCell(cambio.col);
        cell.value = cambio.value;
      } catch (error) {
        console.error(`  ⚠️ Error aplicando cambio en fila ${cambio.row}, col ${cambio.col}:`, error);
      }
    });
    
    // Hacer commit de todas las filas modificadas
    const filasModificadas = new Set(cambios.map(c => c.row));
    filasModificadas.forEach((rowNum) => {
      try {
        const row = worksheet.getRow(rowNum);
        row.commit();
      } catch (error) {
        console.warn(`  ⚠️ Error haciendo commit de fila ${rowNum}:`, error);
      }
    });
    
    // Si hay fila de productos y hay más de un producto, duplicar la fila
    if (filaProductos && this.datos.productos.length > 1) {
      console.log(`  🔄 Duplicando fila de productos para ${this.datos.productos.length - 1} productos adicionales...`);
      this.duplicarFilaProductos(worksheet, filaProductos, valoresOriginalesFilaProductos, estilosFilaProductos);
    }
  }
  
  /**
   * Duplica la fila de productos de forma segura
   * Inserta las filas adicionales justo después de la fila base, antes de los totales
   */
  private duplicarFilaProductos(
    worksheet: ExcelJS.Worksheet, 
    filaBase: number,
    valoresOriginales: Map<number, any>,
    estilos: Map<number, any>
  ): void {
    console.log(`📋 Duplicando fila de productos en fila ${filaBase}...`);
    
    // Buscar la fila de totales (si existe) para insertar antes de ella
    const filaTotales = this.encontrarFilaTotales(worksheet, filaBase);
    const filaInsercion = filaTotales || worksheet.rowCount + 1;
    
    console.log(`  📍 Fila de totales encontrada: ${filaTotales || 'no encontrada'}`);
    console.log(`  📍 Insertando ${this.datos.productos.length - 1} filas después de la fila ${filaBase}, antes de la fila ${filaInsercion}`);
    
    // Hacer commit de TODAS las filas antes de agregar (CRÍTICO)
    console.log(`  💾 Haciendo commit de todas las filas antes de duplicar...`);
    worksheet.eachRow((row) => {
      row.commit();
    });
    
    // Insertar las filas adicionales justo después de la fila base
    // Usamos insertRows que inserta antes de la fila especificada
    for (let i = 1; i < this.datos.productos.length; i++) {
      console.log(`  ➕ Insertando fila para producto ${i + 1} en posición ${filaBase + i}...`);
      
      // Insertar fila vacía justo después de la fila base + (i-1) filas ya insertadas
      const filaInsertar = filaBase + i;
      worksheet.spliceRows(filaInsertar, 0, []);
      
      // Obtener la fila recién insertada
      const nuevaFila = worksheet.getRow(filaInsertar);
      
      // Aplicar valores ORIGINALES procesados con el producto actual
      valoresOriginales.forEach((valorOriginal, colNumber) => {
        if (colNumber === 0) return;
        
        const cell = nuevaFila.getCell(colNumber);
        
        // Procesar el valor ORIGINAL con el producto actual
        if (valorOriginal !== null && valorOriginal !== undefined) {
          if (typeof valorOriginal === 'string') {
            // Procesar marcadores de producto y generales
            let valorProcesado = this.reemplazarMarcadoresProducto(valorOriginal, this.datos.productos[i]);
            valorProcesado = this.reemplazarMarcadores(valorProcesado);
            cell.value = valorProcesado;
          } else if (typeof valorOriginal === 'object' && 'richText' in valorOriginal) {
            const richText = (valorOriginal as any).richText;
            if (Array.isArray(richText)) {
              const textoCompleto = richText.map((rt: any) => rt.text || '').join('');
              const textoReemplazado = this.reemplazarMarcadoresProducto(textoCompleto, this.datos.productos[i]);
              const textoFinal = this.reemplazarMarcadores(textoReemplazado);
              cell.value = { richText: [{ text: textoFinal }] };
            } else {
              cell.value = valorOriginal;
            }
          } else if (typeof valorOriginal === 'object' && 'formula' in valorOriginal) {
            const formula = (valorOriginal as any).formula || '';
            if (typeof formula === 'string') {
              const formulaReemplazada = this.reemplazarMarcadoresProducto(formula, this.datos.productos[i]);
              const formulaFinal = this.reemplazarMarcadores(formulaReemplazada);
              cell.value = { formula: formulaFinal };
            } else {
              cell.value = valorOriginal;
            }
          } else {
            // Otros tipos - copiar directamente
            cell.value = valorOriginal;
          }
        }
        
        // Aplicar estilos
        const estilo = estilos.get(colNumber);
        if (estilo) {
          try {
            this.aplicarEstilos(cell, estilo);
          } catch (err) {
            console.warn(`  ⚠️ Error aplicando estilos a col ${colNumber}:`, err);
          }
        }
      });
      
      // Commit inmediato de la fila
      nuevaFila.commit();
    }
    
    console.log(`  ✅ ${this.datos.productos.length - 1} filas insertadas correctamente después de la fila ${filaBase}`);
  }

  /**
   * Encuentra la fila que contiene marcadores de totales
   * Busca después de la fila de productos
   */
  private encontrarFilaTotales(worksheet: ExcelJS.Worksheet, filaProductos: number): number | null {
    let filaEncontrada: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      // Solo buscar después de la fila de productos
      if (rowNumber <= filaProductos) return;
      
      if (filaEncontrada) return; // Ya encontramos

      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === 'string') {
          const valor = cell.value.toUpperCase();
          // Buscar marcadores de totales o la palabra "TOTALES"
          if (valor.includes('{{CANTIDAD_TOTAL}}') || 
              valor.includes('{{VALOR_TOTAL}}') ||
              valor.includes('{{PESO_NETO_TOTAL}}') ||
              valor.includes('{{PESO_BRUTO_TOTAL}}') ||
              valor.includes('"CANTIDAD_TOTAL"') ||
              valor.includes('"VALOR_TOTAL"') ||
              valor.includes('TOTALES') ||
              valor.includes('TOTAL')) {
            filaEncontrada = rowNumber;
          }
        }
      });
    });

    return filaEncontrada;
  }

  /**
   * Encuentra la fila que contiene marcadores de productos
   * Soporta ambos formatos: {{PRODUCTO_*}} y "PRODUCTO_*"
   */
  private encontrarFilaProductos(worksheet: ExcelJS.Worksheet): number | null {
    let filaEncontrada: number | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (filaEncontrada) return; // Ya encontramos

      row.eachCell((cell) => {
        if (cell.value && typeof cell.value === 'string') {
          if (cell.value.includes('{{PRODUCTO_CANTIDAD}}') || 
              cell.value.includes('{{PRODUCTO_VARIEDAD}}') ||
              cell.value.includes('"PRODUCTO_CANTIDAD"') || 
              cell.value.includes('"PRODUCTO_VARIEDAD"')) {
            filaEncontrada = rowNumber;
          }
        }
      });
    });

    return filaEncontrada;
  }


  /**
   * Copia los estilos de una fila
   */
  private copiarEstilosDeRow(row: ExcelJS.Row): any[] {
    const estilos: any[] = [];
    
    row.eachCell((cell, colNumber) => {
      estilos[colNumber] = {
        font: cell.font ? { ...cell.font } : undefined,
        alignment: cell.alignment ? { ...cell.alignment } : undefined,
        fill: cell.fill ? { ...cell.fill } : undefined,
        border: cell.border ? { ...cell.border } : undefined,
        numFmt: cell.numFmt,
      };
    });
    
    return estilos;
  }

  /**
   * Aplica estilos a una celda
   */
  private aplicarEstilos(cell: ExcelJS.Cell, estilos: any): void {
    if (estilos.font) cell.font = estilos.font;
    if (estilos.alignment) cell.alignment = estilos.alignment;
    if (estilos.fill) cell.fill = estilos.fill;
    if (estilos.border) cell.border = estilos.border;
    if (estilos.numFmt) cell.numFmt = estilos.numFmt;
  }

  /**
   * Reemplaza todos los marcadores en un texto
   * Soporta dos formatos: {{MARCADOR}} y "MARCADOR"
   */
  private reemplazarMarcadores(texto: string): string {
    let resultado = texto;
    
    // Log si contiene marcadores
    const tieneMarcadores = /\{\{[A-Z_]+\}\}|"[A-Z_]+"/.test(texto);
    if (tieneMarcadores) {
      console.log(`🔄 Reemplazando marcadores generales en: "${texto.substring(0, 100)}${texto.length > 100 ? '...' : ''}"`);
    }

    // Exportador
    resultado = resultado.replace(/\{\{EXPORTADOR_NOMBRE\}\}|"EXPORTADOR_NOMBRE"/g, this.datos.exportador_nombre);
    resultado = resultado.replace(/\{\{EXPORTADOR_RUT\}\}|"EXPORTADOR_RUT"/g, this.datos.exportador_rut);
    resultado = resultado.replace(/\{\{EXPORTADOR_GIRO\}\}|"EXPORTADOR_GIRO"/g, this.datos.exportador_giro);
    resultado = resultado.replace(/\{\{EXPORTADOR_DIRECCION\}\}|"EXPORTADOR_DIRECCION"/g, this.datos.exportador_direccion);
    resultado = resultado.replace(/\{\{EXPORTADOR_EMAIL\}\}|"EXPORTADOR_EMAIL"/g, this.datos.exportador_email);

    // Consignee
    resultado = resultado.replace(/\{\{CONSIGNEE_COMPANY\}\}|"CONSIGNEE_COMPANY"/g, this.datos.consignee_company);
    resultado = resultado.replace(/\{\{CONSIGNEE_ADDRESS\}\}|"CONSIGNEE_ADDRESS"/g, this.datos.consignee_address);
    resultado = resultado.replace(/\{\{CONSIGNEE_ATTN\}\}|"CONSIGNEE_ATTN"/g, this.datos.consignee_attn);
    resultado = resultado.replace(/\{\{CONSIGNEE_USCC\}\}|"CONSIGNEE_USCC"/g, this.datos.consignee_uscc);
    resultado = resultado.replace(/\{\{CONSIGNEE_MOBILE\}\}|"CONSIGNEE_MOBILE"/g, this.datos.consignee_mobile);
    resultado = resultado.replace(/\{\{CONSIGNEE_EMAIL\}\}|"CONSIGNEE_EMAIL"/g, this.datos.consignee_email);
    resultado = resultado.replace(/\{\{CONSIGNEE_ZIP\}\}|"CONSIGNEE_ZIP"/g, this.datos.consignee_zip);
    resultado = resultado.replace(/\{\{CONSIGNEE_PAIS\}\}|"CONSIGNEE_PAIS"/g, this.datos.consignee_pais);

    // Notify Party
    resultado = resultado.replace(/\{\{NOTIFY_COMPANY\}\}|"NOTIFY_COMPANY"/g, this.datos.notify_company || '');
    resultado = resultado.replace(/\{\{NOTIFY_ADDRESS\}\}|"NOTIFY_ADDRESS"/g, this.datos.notify_address || '');
    resultado = resultado.replace(/\{\{NOTIFY_ATTN\}\}|"NOTIFY_ATTN"/g, this.datos.notify_attn || '');
    resultado = resultado.replace(/\{\{NOTIFY_USCC\}\}|"NOTIFY_USCC"/g, this.datos.notify_uscc || '');
    resultado = resultado.replace(/\{\{NOTIFY_MOBILE\}\}|"NOTIFY_MOBILE"/g, this.datos.notify_mobile || '');
    resultado = resultado.replace(/\{\{NOTIFY_EMAIL\}\}|"NOTIFY_EMAIL"/g, this.datos.notify_email || '');
    resultado = resultado.replace(/\{\{NOTIFY_ZIP\}\}|"NOTIFY_ZIP"/g, this.datos.notify_zip || '');

    // Embarque
    resultado = resultado.replace(/\{\{FECHA_FACTURA\}\}|"FECHA_FACTURA"/g, this.datos.fecha_factura);
    resultado = resultado.replace(/\{\{INVOICE_NUMBER\}\}|"INVOICE_NUMBER"/g, this.datos.invoice_number);
    resultado = resultado.replace(/\{\{EMBARQUE_NUMBER\}\}|"EMBARQUE_NUMBER"/g, this.datos.embarque_number);
    resultado = resultado.replace(/\{\{CSP\}\}|"CSP"/g, this.datos.csp || '');
    resultado = resultado.replace(/\{\{CSG\}\}|"CSG"/g, this.datos.csg || '');
    resultado = resultado.replace(/\{\{FECHA_EMBARQUE\}\}|"FECHA_EMBARQUE"/g, this.datos.fecha_embarque);
    resultado = resultado.replace(/\{\{MOTONAVE\}\}|"MOTONAVE"/g, this.datos.motonave);
    resultado = resultado.replace(/\{\{VIAJE\}\}|"VIAJE"/g, this.datos.viaje);
    resultado = resultado.replace(/\{\{MODALIDAD_VENTA\}\}|"MODALIDAD_VENTA"/g, this.datos.modalidad_venta || '');
    resultado = resultado.replace(/\{\{CLAUSULA_VENTA\}\}|"CLAUSULA_VENTA"/g, this.datos.clausula_venta);
    resultado = resultado.replace(/\{\{PAIS_ORIGEN\}\}|"PAIS_ORIGEN"/g, this.datos.pais_origen);
    resultado = resultado.replace(/\{\{PUERTO_EMBARQUE\}\}|"PUERTO_EMBARQUE"/g, this.datos.puerto_embarque);
    resultado = resultado.replace(/\{\{PUERTO_DESTINO\}\}|"PUERTO_DESTINO"/g, this.datos.puerto_destino);
    resultado = resultado.replace(/\{\{PAIS_DESTINO\}\}|"PAIS_DESTINO"/g, this.datos.pais_destino);
    resultado = resultado.replace(/\{\{FORMA_PAGO\}\}|"FORMA_PAGO"/g, this.datos.forma_pago);
    resultado = resultado.replace(/\{\{CONTENEDOR\}\}|"CONTENEDOR"/g, this.datos.contenedor || '');

    // Referencias
    resultado = resultado.replace(/\{\{REF_ASLI\}\}|"REF_ASLI"/g, this.datos.ref_asli);
    resultado = resultado.replace(/\{\{BOOKING\}\}|"BOOKING"/g, this.datos.booking);
    resultado = resultado.replace(/\{\{REF_CLIENTE\}\}|"REF_CLIENTE"/g, this.datos.ref_cliente || '');

    // Totales
    resultado = resultado.replace(/\{\{CANTIDAD_TOTAL\}\}|"CANTIDAD_TOTAL"/g, this.datos.cantidad_total.toString());
    resultado = resultado.replace(/\{\{PESO_NETO_TOTAL\}\}|"PESO_NETO_TOTAL"/g, this.datos.peso_neto_total.toString());
    resultado = resultado.replace(/\{\{PESO_BRUTO_TOTAL\}\}|"PESO_BRUTO_TOTAL"/g, this.datos.peso_bruto_total.toString());
    resultado = resultado.replace(/\{\{VALOR_TOTAL\}\}|"VALOR_TOTAL"/g, this.datos.valor_total.toFixed(2));
    resultado = resultado.replace(/\{\{VALOR_TOTAL_TEXTO\}\}|"VALOR_TOTAL_TEXTO"/g, this.datos.valor_total_texto);
    
    // Totales de productos (suma de todos los totales de productos individuales)
    const totalProductosFinal = this.datos.productos.reduce((sum, p) => sum + (p.total || 0), 0);
    resultado = resultado.replace(/\{\{TOTAL_PRODUCTOS_FINAL\}\}|"TOTAL_PRODUCTOS_FINAL"/g, totalProductosFinal.toFixed(2));
    resultado = resultado.replace(/\{\{TOTAL_FOB\}\}|"TOTAL_FOB"/g, totalProductosFinal.toFixed(2));

    // Fecha/Hora
    resultado = resultado.replace(/\{\{FECHA_HOY\}\}|"FECHA_HOY"/g, this.datos.fecha_hoy);
    resultado = resultado.replace(/\{\{FECHA_HOY_LARGO\}\}|"FECHA_HOY_LARGO"/g, this.datos.fecha_hoy_largo);
    resultado = resultado.replace(/\{\{HORA_ACTUAL\}\}|"HORA_ACTUAL"/g, this.datos.hora_actual);

    return resultado;
  }

  /**
   * Reemplaza marcadores específicos de un producto
   * Soporta ambos formatos: {{PRODUCTO_*}} y "PRODUCTO_*"
   */
  private reemplazarMarcadoresProducto(texto: string, producto: ProductoPlantilla): string {
    let resultado = texto;
    
    // Log si el texto contiene marcadores de especie o total
    if (texto.includes('PRODUCTO_ESPECIE') || texto.includes('PRODUCTO_TOTAL') || texto.includes('TOTAL_VALUE') || texto.includes('VALOR_TOTAL')) {
      console.log('🔄 Reemplazando marcadores en:', texto);
      console.log('   Producto completo:', JSON.stringify(producto, null, 2));
      console.log('   Especie del producto:', {
        valor: producto.especie,
        tipo: typeof producto.especie,
        esVacia: !producto.especie || (typeof producto.especie === 'string' && producto.especie.trim() === ''),
        longitud: producto.especie ? String(producto.especie).length : 0
      });
    }

    resultado = resultado.replace(/\{\{PRODUCTO_CANTIDAD\}\}|"PRODUCTO_CANTIDAD"/g, producto.cantidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_TIPO_ENVASE\}\}|"PRODUCTO_TIPO_ENVASE"/g, producto.tipo_envase);
    
    // Asegurar que la especie sea un string válido
    let especieValor = '';
    if (producto.especie) {
      if (typeof producto.especie === 'string') {
        especieValor = producto.especie.trim();
      } else {
        especieValor = String(producto.especie).trim();
      }
    }
    
    // Log si estamos reemplazando PRODUCTO_ESPECIE
    if (texto.includes('PRODUCTO_ESPECIE')) {
      console.log(`🔄 Reemplazando PRODUCTO_ESPECIE en texto:`, {
        textoOriginal: texto.substring(0, 200),
        especieValor: especieValor || '(vacía)',
        especieTipo: typeof producto.especie,
        especieOriginal: producto.especie,
        productoCompleto: {
          cantidad: producto.cantidad,
          variedad: producto.variedad,
          especie: producto.especie
        }
      });
    }
    
    // Reemplazar el marcador
    const textoAntes = resultado;
    resultado = resultado.replace(/\{\{PRODUCTO_ESPECIE\}\}/g, especieValor);
    resultado = resultado.replace(/"PRODUCTO_ESPECIE"/g, especieValor);
    
    // Verificar si se reemplazó
    if (texto.includes('PRODUCTO_ESPECIE') && textoAntes !== resultado) {
      console.log(`✅ PRODUCTO_ESPECIE reemplazado correctamente: "${especieValor}"`);
    } else if (texto.includes('PRODUCTO_ESPECIE') && textoAntes === resultado) {
      console.warn(`⚠️ PRODUCTO_ESPECIE NO se reemplazó. Texto: "${texto.substring(0, 100)}"`);
    }
    resultado = resultado.replace(/\{\{PRODUCTO_VARIEDAD\}\}|"PRODUCTO_VARIEDAD"/g, producto.variedad);
    resultado = resultado.replace(/\{\{PRODUCTO_CATEGORIA\}\}|"PRODUCTO_CATEGORIA"/g, producto.categoria);
    resultado = resultado.replace(/\{\{PRODUCTO_ETIQUETA\}\}|"PRODUCTO_ETIQUETA"/g, producto.etiqueta);
    resultado = resultado.replace(/\{\{PRODUCTO_CALIBRE\}\}|"PRODUCTO_CALIBRE"/g, producto.calibre);
    resultado = resultado.replace(/\{\{PRODUCTO_KG_NETO_UNIDAD\}\}|"PRODUCTO_KG_NETO_UNIDAD"/g, producto.kg_neto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_KG_BRUTO_UNIDAD\}\}|"PRODUCTO_KG_BRUTO_UNIDAD"/g, producto.kg_bruto_unidad.toString());
    resultado = resultado.replace(/\{\{PRODUCTO_PRECIO_CAJA\}\}|"PRODUCTO_PRECIO_CAJA"/g, producto.precio_caja.toFixed(2));
    resultado = resultado.replace(/\{\{PRODUCTO_TOTAL\}\}|"PRODUCTO_TOTAL"/g, producto.total.toFixed(2));
    
    // También soportar VALOR_TOTAL y TOTAL_VALUE en productos (por compatibilidad con plantillas antiguas)
    // Estos se reemplazan con el total del producto individual
    resultado = resultado.replace(/\{\{VALOR_TOTAL\}\}|"VALOR_TOTAL"/g, producto.total.toFixed(2));
    resultado = resultado.replace(/\{\{TOTAL_VALUE\}\}|"TOTAL_VALUE"/g, producto.total.toFixed(2));
    
    // Log del resultado si hubo cambios
    if (resultado !== texto && (texto.includes('PRODUCTO_ESPECIE') || texto.includes('PRODUCTO_TOTAL') || texto.includes('TOTAL_VALUE') || texto.includes('VALOR_TOTAL'))) {
      console.log('✅ Resultado:', resultado);
    }

    return resultado;
  }

  /**
   * Genera el archivo Excel procesado como buffer
   */
  async generarBuffer(): Promise<ArrayBuffer> {
    try {
      console.log('💾 Generando buffer del workbook...');
      console.log(`  📊 Hojas en workbook: ${this.workbook.worksheets.length}`);
      
      // Verificar contenido antes de generar
      let totalCells = 0;
      this.workbook.eachSheet((worksheet) => {
        const rowCount = worksheet.rowCount;
        let cellCount = 0;
        let sampleValues: string[] = [];
        worksheet.eachRow((row, rowNum) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            cellCount++;
            if (sampleValues.length < 5 && cell.value !== null && cell.value !== undefined) {
              const val = String(cell.value).substring(0, 50);
              sampleValues.push(`F${rowNum}C${cell.col}: "${val}"`);
            }
          });
        });
        totalCells += cellCount;
        console.log(`  📄 Hoja "${worksheet.name}": ${rowCount} filas, ${cellCount} celdas con contenido`);
        if (sampleValues.length > 0) {
          console.log(`    📝 Muestra de valores:`, sampleValues);
        } else {
          console.warn(`    ⚠️ ADVERTENCIA: La hoja "${worksheet.name}" no tiene celdas con contenido!`);
        }
      });
      
      if (totalCells === 0) {
        console.error('❌ ERROR CRÍTICO: El workbook no tiene ninguna celda con contenido!');
        throw new Error('El workbook está vacío después del procesamiento');
      }
      
      // Asegurarse de que todas las filas estén commiteadas antes de generar el buffer
      this.workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          if (row.hasValues) {
            row.commit();
          }
        });
      });
      
      console.log('✅ Todas las filas commiteadas, generando buffer...');
      
      const buffer = await this.workbook.xlsx.writeBuffer();
      console.log(`✅ Buffer generado: ${buffer.byteLength} bytes`);
      
      if (buffer.byteLength < 1000) {
        console.error(`❌ ERROR CRÍTICO: El buffer es muy pequeño (${buffer.byteLength} bytes), el archivo está vacío o corrupto`);
        console.error('  Esto indica que el workbook perdió su contenido durante el procesamiento');
        
        // Intentar regenerar el buffer una vez más
        console.log('🔄 Intentando regenerar buffer...');
        const buffer2 = await this.workbook.xlsx.writeBuffer();
        console.log(`  Segundo intento: ${buffer2.byteLength} bytes`);
        
        if (buffer2.byteLength < 1000) {
          throw new Error(`El workbook está vacío. Buffer generado: ${buffer2.byteLength} bytes. Esto indica que la plantilla se perdió durante el procesamiento.`);
        }
        
        return buffer2 as ArrayBuffer;
      }
      
      return buffer as ArrayBuffer;
    } catch (error: any) {
      console.error('❌ Error generando buffer:', error);
      console.error('  Stack:', error?.stack);
      throw new Error(`Error al generar el archivo Excel: ${error?.message || 'Error desconocido'}`);
    }
  }

  /**
   * Genera el archivo Excel procesado como Blob
   */
  async generarBlob(): Promise<Blob> {
    console.log('💾 Generando blob...');
    const buffer = await this.generarBuffer();
    console.log('📦 Buffer size:', buffer.byteLength);
    
    if (buffer.byteLength < 1000) {
      console.error('❌ ERROR: El buffer es demasiado pequeño para generar un Excel válido');
      throw new Error(`El buffer generado es demasiado pequeño (${buffer.byteLength} bytes). El Excel estaría vacío.`);
    }
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    console.log('✅ Blob generado:', blob.size, 'bytes');
    
    if (blob.size !== buffer.byteLength) {
      console.warn(`⚠️ ADVERTENCIA: El tamaño del blob (${blob.size}) no coincide con el buffer (${buffer.byteLength})`);
    }
    
    if (blob.size < 1000) {
      throw new Error(`El blob generado es demasiado pequeño (${blob.size} bytes). El Excel estaría vacío.`);
    }
    
    return blob;
  }

  /**
   * Genera una representación HTML de la primera hoja del workbook
   * para mostrar como vista previa
   */
  generarHTMLPreview(): string {
    const worksheet = this.workbook.worksheets[0];
    if (!worksheet) {
      return '<div class="p-4 text-gray-500">No hay datos para mostrar</div>';
    }

    // Timestamp único para forzar regeneración
    const timestamp = Date.now();
    let html = `<div class="excel-preview" data-timestamp="${timestamp}" style="font-family: 'Calibri', Arial, sans-serif; font-size: 10pt; overflow-x: auto; padding: 20px; background: #ffffff; min-height: 100vh;">`;
    html += '<table style="border-collapse: collapse; width: 100%; max-width: 1400px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
    
    // Obtener el número máximo de columnas
    let maxColumns = 0;
    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, () => {
        maxColumns = Math.max(maxColumns, row.cellCount);
      });
    });
    
    // Si no hay columnas, usar un valor por defecto
    if (maxColumns === 0) maxColumns = 10;
    
    // Calcular ancho uniforme por columna
    const uniformWidth = (100 / maxColumns).toFixed(2);
    
    // Mapa para rastrear celdas fusionadas ya procesadas
    const processedCells = new Set<string>();
    
    worksheet.eachRow((row, rowNumber) => {
      const height = row.height ? Math.max(row.height * 1.3, 20) : 28;
      html += `<tr style="height: ${height}px; min-height: 20px;">`;
      
      // Procesar todas las columnas hasta el máximo
      for (let colNumber = 1; colNumber <= maxColumns; colNumber++) {
        const cellKey = `${rowNumber}-${colNumber}`;
        
        // Si esta celda ya fue procesada como parte de una fusión, saltarla
        if (processedCells.has(cellKey)) {
          continue;
        }
        
        const cell = worksheet.getCell(rowNumber, colNumber);
        const value = cell.value;
        let displayValue = '';
        
        // Convertir diferentes tipos de valores
        if (value === null || value === undefined) {
          displayValue = '&nbsp;';
        } else if (typeof value === 'object' && 'richText' in value) {
          displayValue = (value as any).richText.map((rt: any) => rt.text).join('');
        } else if (typeof value === 'object' && 'formula' in value) {
          displayValue = (value as any).result?.toString() || '';
        } else if (value instanceof Date) {
          displayValue = value.toLocaleDateString('es-CL');
        } else {
          displayValue = String(value).replace(/\n/g, '<br>');
        }

        // Construir estilos inline
        const stylesParts: string[] = [
          'padding: 8px 10px',
          'box-sizing: border-box',
          'min-height: 20px',
          'line-height: 1.4',
          `width: ${uniformWidth}%`,
          'vertical-align: middle',
          'font-size: 10pt',
          'white-space: pre-wrap',
          'word-wrap: break-word',
          'border: 1px solid #d0d0d0',
          'background-color: #ffffff', // Fondo blanco por defecto
        ];
        
        // Alineación
        if (cell.alignment) {
          if (cell.alignment.horizontal) {
            stylesParts.push(`text-align: ${cell.alignment.horizontal}`);
          } else {
            stylesParts.push('text-align: left'); // Por defecto izquierda
          }
          if (cell.alignment.wrapText) {
            stylesParts.push('white-space: normal');
            stylesParts.push('word-wrap: break-word');
          }
        } else {
          stylesParts.push('text-align: left');
        }
        
        // Fuente
        if (cell.font) {
          if (cell.font.bold) stylesParts.push('font-weight: bold');
          if (cell.font.italic) stylesParts.push('font-style: italic');
          if (cell.font.size) {
            const fontSize = Math.max(8, Math.min(cell.font.size, 14));
            stylesParts.push(`font-size: ${fontSize}pt`);
          }
          if (cell.font.color && (cell.font.color as any).argb) {
            const color = (cell.font.color as any).argb;
            if (color && color !== 'FF000000' && color.length === 8) {
              stylesParts.push(`color: #${color.substring(2)}`);
            }
          }
        }
        
        // Color de fondo
        if (cell.fill && 'fgColor' in cell.fill && cell.fill.fgColor) {
          const color = (cell.fill.fgColor as any).argb;
          if (color && color !== 'FFFFFFFF' && color !== '00000000' && color.length === 8) {
            stylesParts.push(`background-color: #${color.substring(2)}`);
          }
        }
        
        const cellStyle = stylesParts.join('; ');
        
        // Manejar celdas fusionadas
        let colspan = 1;
        let rowspan = 1;
        
        if (cell.isMerged) {
          // Buscar el rango de fusión
          const master = (cell as any).master;
          if (master) {
            const masterAddress = master.address;
            const masterRow = master.row;
            const masterCol = master.col;
            
            // Si esta es la celda maestra
            if (rowNumber === masterRow && colNumber === masterCol) {
              // Intentar obtener el rango de fusión
              worksheet.model.merges?.forEach((merge: any) => {
                if (merge.top === masterRow && merge.left === masterCol) {
                  colspan = merge.right - merge.left + 1;
                  rowspan = merge.bottom - merge.top + 1;
                  
                  // Marcar todas las celdas fusionadas como procesadas
                  for (let r = merge.top; r <= merge.bottom; r++) {
                    for (let c = merge.left; c <= merge.right; c++) {
                      if (r !== masterRow || c !== masterCol) {
                        processedCells.add(`${r}-${c}`);
                      }
                    }
                  }
                }
              });
            } else {
              // Esta celda es parte de una fusión pero no es la maestra, saltarla
              continue;
            }
          }
        }
        
        const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : '';
        const rowspanAttr = rowspan > 1 ? ` rowspan="${rowspan}"` : '';
        
        html += `<td style="${cellStyle}"${colspanAttr}${rowspanAttr}>${displayValue}</td>`;
      }
      
      html += '</tr>';
    });
    
    html += '</table></div>';
    return html;
  }
}

/**
 * Helper para convertir Factura a DatosPlantilla
 */
export async function facturaADatosPlantilla(factura: any): Promise<DatosPlantilla> {
  const now = new Date();
  const formatoFecha = (fecha: string) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CL');
  };

  // Obtener especie del registro si está disponible (para usar como fallback en productos)
  let especieRegistro = '';
  
  // La clave para buscar el registro es factura.registroId (que viene de registro_id en la BD)
  console.log('🔍 Buscando especie del registro:', {
    registroId: factura.registroId,
    tieneRegistroId: !!factura.registroId,
    tipoRegistroId: typeof factura.registroId,
    facturaCompleta: factura
  });
  
  if (factura.registroId) {
    try {
      const { createClient } = await import('@/lib/supabase-browser');
      const supabase = createClient();
      
      console.log(`📡 Consultando registro con ID: ${factura.registroId}`);
      
      const { data: registroData, error: registroError } = await supabase
        .from('registros')
        .select('id, especie')
        .eq('id', factura.registroId)
        .maybeSingle();
      
      console.log('📥 Resultado de consulta registro:', {
        registroData,
        registroError,
        tieneEspecie: !!registroData?.especie,
        especieValor: registroData?.especie
      });
      
      if (registroError) {
        console.error('❌ Error en consulta de registro:', registroError);
      }
      
      if (registroData && registroData.especie) {
        // Usar el valor exacto de la especie del registro, sin modificaciones
        // Esto asegura que se muestre tal cual está en la base de datos
        especieRegistro = String(registroData.especie).trim();
        if (especieRegistro) {
          console.log(`✅ Especie del registro obtenida (valor exacto): "${especieRegistro}"`);
          console.log(`📋 Esta especie se usará en el campo MERCANCÍA/COMMODITY de la proforma`);
        } else {
          console.warn(`⚠️ Especie del registro está vacía después de trim`);
        }
      } else {
        console.warn(`⚠️ No se encontró registro o no tiene especie:`, {
          registroEncontrado: !!registroData,
          especieEnRegistro: registroData?.especie,
          registroIdBuscado: factura.registroId
        });
      }
    } catch (err) {
      console.error('❌ Error obteniendo especie del registro:', err);
    }
  } else {
    console.warn('⚠️ La factura no tiene registroId, no se puede buscar especie del registro');
  }
  
  console.log('📊 Especie del registro final:', especieRegistro || '(vacía)');

  return {
    // Exportador
    exportador_nombre: factura.exportador.nombre,
    exportador_rut: factura.exportador.rut,
    exportador_giro: factura.exportador.giro,
    exportador_direccion: factura.exportador.direccion,
    exportador_email: factura.exportador.email || '',

    // Consignee
    consignee_company: factura.consignatario.nombre,
    consignee_address: factura.consignatario.direccion,
    consignee_attn: factura.consignatario.contacto || '',
    consignee_uscc: factura.consignatario.usci || '',
    consignee_mobile: factura.consignatario.telefono || '',
    consignee_email: factura.consignatario.email || '',
    consignee_zip: factura.consignatario.codigoPostal || '',
    consignee_pais: factura.consignatario.pais,

    // Notify Party
    notify_company: factura.notifyParty?.nombre || '',
    notify_address: factura.notifyParty?.direccion || '',
    notify_attn: factura.notifyParty?.contacto || '',
    notify_uscc: factura.notifyParty?.usci || '',
    notify_mobile: factura.notifyParty?.telefono || '',
    notify_email: factura.notifyParty?.email || '',
    notify_zip: factura.notifyParty?.codigoPostal || '',

    // Embarque
    fecha_factura: formatoFecha(factura.embarque.fechaFactura),
    invoice_number: factura.embarque.numeroInvoice,
    embarque_number: factura.embarque.numeroEmbarque,
    csp: factura.embarque.csp || '',
    csg: factura.embarque.csg || '',
    fecha_embarque: formatoFecha(factura.embarque.fechaEmbarque),
    motonave: factura.embarque.motonave,
    viaje: factura.embarque.numeroViaje,
    modalidad_venta: factura.embarque.modalidadVenta || '',
    clausula_venta: factura.embarque.clausulaVenta,
    pais_origen: factura.embarque.paisOrigen,
    puerto_embarque: factura.embarque.puertoEmbarque,
    puerto_destino: factura.embarque.puertoDestino,
    pais_destino: factura.embarque.paisDestinoFinal,
    forma_pago: factura.embarque.formaPago,
    contenedor: factura.embarque.contenedor || '',

    // Referencias
    ref_asli: factura.refAsli,
    booking: factura.embarque.numeroEmbarque, // O usar otro campo si existe
    ref_cliente: '', // Agregar si existe en el modelo

    // Productos
    productos: factura.productos.map((p: any, index: number) => {
      // Calcular total correctamente: cantidad × precio por caja
      const totalCorrecto = (p.cantidad || 0) * (p.precioPorCaja || 0);
      
      // SIEMPRE usar la especie del registro (no la del producto)
      // Si hay especieRegistro, usarla SIEMPRE, sin importar si el producto tiene especie
      const especieFinal = especieRegistro 
        ? especieRegistro  // SIEMPRE priorizar especie del registro
        : (p.especie && typeof p.especie === 'string' ? p.especie.trim() : (p.especie ? String(p.especie).trim() : ''));
      
      // Log detallado para cada producto
      console.log(`📦 Producto ${index + 1} - Procesando especie:`, {
        especieRegistro: especieRegistro || '(vacía)',
        especieProducto: p.especie || '(vacía)',
        especieFinal: especieFinal || '(vacía)',
        seUsaRegistro: !!especieRegistro,
        tieneEspecieRegistro: !!especieRegistro && especieRegistro.trim() !== '',
        tieneEspecieProducto: !!p.especie,
        cantidad: p.cantidad,
        precioPorCaja: p.precioPorCaja,
        totalCalculado: totalCorrecto
      });
      
      if (especieRegistro && especieRegistro.trim() !== '') {
        console.log(`✅ FORZANDO especie del registro para producto ${index + 1}: "${especieRegistro}" (ignorando especie del producto: "${p.especie || '(vacía)'}")`);
      } else if (!especieFinal || especieFinal.trim() === '') {
        console.warn(`⚠️ Producto ${index + 1} sin especie (ni registro ni producto):`, { 
          cantidad: p.cantidad, 
          variedad: p.variedad, 
          especieOriginal: p.especie,
          especieRegistro: especieRegistro || '(vacía)',
          registroId: factura.registroId || '(no disponible)'
        });
      }
      
      if (isNaN(totalCorrecto) || totalCorrecto === 0) {
        console.warn(`⚠️ Producto ${index + 1} con total incorrecto:`, { 
          cantidad: p.cantidad, 
          precioPorCaja: p.precioPorCaja, 
          totalOriginal: p.total,
          totalCalculado: totalCorrecto,
          producto: p
        });
      }
      
      return {
        cantidad: p.cantidad || 0,
        tipo_envase: p.tipoEnvase || '',
        especie: especieFinal, // SIEMPRE usar especie del registro (valor exacto de la BD) para MERCANCÍA/COMMODITY
        variedad: p.variedad || '',
        categoria: p.categoria || '',
        etiqueta: p.etiqueta || '',
        calibre: p.calibre || '',
        kg_neto_unidad: p.kgNetoUnidad || 0,
        kg_bruto_unidad: p.kgBrutoUnidad || 0,
        precio_caja: p.precioPorCaja || 0,
        total: totalCorrecto, // Usar el cálculo correcto: cantidad × precio por caja
      };
    }),

    // Totales
    cantidad_total: factura.totales.cantidadTotal,
    peso_neto_total: factura.embarque.pesoNetoTotal || 0,
    peso_bruto_total: factura.embarque.pesoBrutoTotal || 0,
    valor_total: factura.totales.valorTotal,
    valor_total_texto: factura.totales.valorTotalTexto,

    // Fecha/Hora
    fecha_hoy: now.toLocaleDateString('es-CL'),
    fecha_hoy_largo: now.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    hora_actual: now.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
  };
}
