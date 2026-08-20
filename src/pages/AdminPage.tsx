
import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import AdminMobile from '../modules/mobile/admin/AdminMobile';
import AdminDesktop from '../modules/desktop/admin/AdminDesktop';

const AdminPage: React.FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <AdminMobile /> : <AdminDesktop />;
};

export default AdminPage;
