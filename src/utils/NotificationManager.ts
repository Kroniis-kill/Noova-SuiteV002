
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

export const hasPermission = (): boolean => {
  return isNotificationSupported() && Notification.permission === 'granted';
};

export const shouldPrompt = (): boolean => {
  if (!isNotificationSupported()) return false;
  
  // If already granted or explicitly denied by browser, don't prompt
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return false;
  }

  // If user previously dismissed our custom modal, respect that (until they clear cache)
  if (localStorage.getItem('notifications_prompt_dismissed')) {
    return false;
  }

  return true;
};

export const markAsDismissed = (): void => {
  localStorage.setItem('notifications_prompt_dismissed', 'true');
};

export const requestSystemPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('notifications_granted', 'true');
      // Clear the dismissed flag if they actually granted it now
      localStorage.removeItem('notifications_prompt_dismissed');
      return true;
    } else {
      // If denied at system level
      localStorage.setItem('notifications_denied', 'true');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  
  return false;
};
