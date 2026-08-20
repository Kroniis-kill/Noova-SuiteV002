
import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import MyPlanMobile from '../modules/mobile/my-plan/MyPlanMobile';
import MyPlanDesktop from '../modules/desktop/my-plan/MyPlanDesktop';

const MyPlanPage: React.FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MyPlanMobile /> : <MyPlanDesktop />;
};

export default MyPlanPage;
