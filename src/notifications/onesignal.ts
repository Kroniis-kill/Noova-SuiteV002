
export const initOneSignal = () => {
  if (typeof window !== "undefined") {
    // Check for allowed domains to prevent "Can only be used on..." errors
    const allowedDomains = ['noova-suite.vercel.app'];
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // FIX: Skip initialization entirely if we are on the Client Portal
    // This prevents errors like "Cannot read properties of undefined (reading 'on')"
    // because OneSignal context might conflict or fail to load in the isolated portal environment.
    if (window.location.pathname.startsWith('/portal') || window.location.pathname.startsWith('/portal-cliente')) {
        return;
    }

    if (!isLocalhost && !allowedDomains.includes(window.location.hostname)) {
      console.warn("OneSignal: Domain not allowed for this App ID.");
      return;
    }

    if (isLocalhost) {
        // Option 1: Skip OneSignal on localhost if it errors out
        console.log("OneSignal skipped on localhost to prevent domain errors.");
        return; 
    }

    // Ensure OneSignal array exists
    (window as any).OneSignal = (window as any).OneSignal || [];
    
    // Push initialization logic
    (window as any).OneSignal.push(() => {
      const OneSignal = (window as any).OneSignal;
      
      OneSignal.init({
        appId: "aaa272f3-b269-45b2-bd60d16f41-8d05-498c-be22-ccac6e32e13bd1-a9f4964c56a0",
        safari_web_id: "",
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
      });
    });
  }
};
