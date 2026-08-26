import { Sprout } from 'lucide-react';
import { CreateBatchForm } from '@/components/CreateBatchForm';
import { PortalShell } from '@/components/portal-shell';

export default function FarmerPage() {
  return <PortalShell title="Farmer dashboard" description="Register your harvest and receive a permanent public QR trace link." icon={Sprout} contentClassName="max-w-2xl"><CreateBatchForm /></PortalShell>;
}
