const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function checkStates() {
    console.log('🧪 Checking Registry States...');

    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');

    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

    if (!urlMatch || !keyMatch) {
        console.error('❌ Could not find Supabase keys in .env.local');
        return;
    }

    const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
    const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('📡 Fetching from registros...');
        const { data: registros, error } = await supabase
            .from('registros')
            .select('*');

        if (error) {
            console.error('❌ Supabase Error:', error.message);
            console.error('Details:', error);
            return;
        }

        console.log(`Total registros encontrados: ${registros ? registros.length : 0}`);

        if (!registros || registros.length === 0) {
            console.log('⚠️ No se encontraron registros. ¿Posibles políticas RLS restringiendo el acceso anon?');
            // Intentar contar directamente
            const { count, error: countError } = await supabase.from('registros').select('*', { count: 'exact', head: true });
            console.log('Direct count attempt:', count, countError ? countError.message : 'No error');
        }

        // 1. Conteo de estados directos
        const counts = {};
        registros.forEach(r => {
            counts[r.estado] = (counts[r.estado] || 0) + 1;
        });
        console.log('\n📊 Conteo por estado (filas):', counts);

        // 2. Agrupación por ref_asli (como en el dashboard)
        const refAsliMap = new Map();
        registros.forEach((record) => {
            if (!record.ref_asli) return;
            const existing = refAsliMap.get(record.ref_asli);
            const recordDate = record.updated_at ? new Date(record.updated_at) : null;
            const existingDate = existing?.updated_at ? new Date(existing.updated_at) : null;

            if (!existing || (recordDate && (!existingDate || recordDate > existingDate))) {
                refAsliMap.set(record.ref_asli, {
                    estado: record.estado,
                    updated_at: record.updated_at
                });
            }
        });

        const dashboardCounts = {
            PENDIENTE: 0,
            CONFIRMADO: 0,
            CANCELADO: 0,
            OTROS: 0
        };

        refAsliMap.forEach(v => {
            const e = (v.estado || '').toUpperCase();
            if (e === 'PENDIENTE' || e === 'EN PROCESO') dashboardCounts.PENDIENTE++;
            else if (e === 'CONFIRMADO' || e === 'COMPLETADO') dashboardCounts.CONFIRMADO++;
            else if (e === 'CANCELADO' || e === 'RECHAZADO') dashboardCounts.CANCELADO++;
            else dashboardCounts.OTROS++;
        });

        const report = {
            totalFilas: registros.length,
            conteoPorEstado: counts,
            statsDashboard: dashboardCounts,
            totalRefAsli: refAsliMap.size
        };

        fs.writeFileSync(path.join(__dirname, 'diagnostic-report.json'), JSON.stringify(report, null, 2));
        console.log('✅ Diagnostic report saved to diagnostic-report.json');

    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

checkStates();
