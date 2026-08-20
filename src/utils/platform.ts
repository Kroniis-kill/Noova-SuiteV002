
export const detectPlatform = () => {
  if (typeof window === 'undefined') return { isMobileApp: false, isDesktop: true };

  const ua = navigator.userAgent.toLowerCase();
  
  // Detect Mobile Devices based on User Agent
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMobileDevice = isAndroid || isIOS || /webos|blackberry|iemobile|opera mini/i.test(ua);

  // Detect Screen Width (Increased to 1024 to support tablets better and match LayoutSelector)
  const isSmallScreen = window.innerWidth < 1024;

  // Detect PWA Standalone Mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  // Capacitor check (if using Capacitor later)
  const isCapacitor = (window as any).Capacitor !== undefined;

  const isMobileApp = isMobileDevice || isSmallScreen || isStandalone || isCapacitor;

  return {
    isMobileApp,
    isDesktop: !isMobileApp
  };
};
