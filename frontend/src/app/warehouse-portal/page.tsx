'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const WarehousePortalPageInner: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to dashboard with warehouse parameter
    const assignedWarehouse = user?.warehouse?.assignedWarehouse;
    const targetWarehouse = warehouseId || assignedWarehouse || '';
    const dashboardUrl = targetWarehouse
      ? `/warehouse-portal/dashboard?warehouse=${targetWarehouse}`
      : '/warehouse-portal/dashboard';
    router.replace(dashboardUrl);
  }, [router, warehouseId, user?.warehouse?.assignedWarehouse]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default function WarehousePortalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <WarehousePortalPageInner />
    </Suspense>
  );
}