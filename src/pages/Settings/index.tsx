
import React from 'react';
import { isMobile } from '../../utils/device';
import SettingsMobile from '../../modules/mobile/settings/SettingsMobile';
import SettingsDesktop from '../../modules/desktop/settings/SettingsDesktop';

const SettingsPage: React.FC = () => {
  return isMobile() ? <SettingsMobile /> : <SettingsDesktop />;
};

export default SettingsPage;
