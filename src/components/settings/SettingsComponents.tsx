// Barrel: SettingsComponents.tsx was a 1,300-line monolith.
// It is now split into focused files under ./sections/.
// Public API (named exports) is preserved so existing imports keep working.

export { IntegrationsSection } from './sections/IntegrationsSection';
export { BusinessSettings } from './sections/BusinessSettings';
export { BusinessIdentitySection } from './sections/BusinessIdentitySection';
export { MessagesSection } from './sections/MessagesSection';
export { NotificationSettings } from './sections/NotificationSettings';
export { AccountSecuritySettings } from './sections/AccountSecuritySettings';
export { DataSection } from './sections/DataSection';
export { LegalSection, } from './sections/LegalSection';
export { ActivitySection } from './sections/MiscSections';
