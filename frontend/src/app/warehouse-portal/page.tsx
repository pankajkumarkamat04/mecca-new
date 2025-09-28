'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const WarehousePortalPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');

  useEffect(() => {
    // Redirect to dashboard with warehouse parameter
    const dashboardUrl = warehouseId 
      ? `/warehouse-portal/dashboard?warehouse=${warehouseId}`
      : '/warehouse-portal/dashboard';
    router.replace(dashboardUrl);
  }, [router, warehouseId]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default WarehousePortalPage;