import TransportesTable from '@/components/transportes/TransportesTable';
import { createClient } from '@/lib/supabase-server';

export default async function TransportesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('transportes')
    .select('*')
    .order('created_at', { ascending: false });

  return <TransportesTable transportes={data ?? []} />;
}

