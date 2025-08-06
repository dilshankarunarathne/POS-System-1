import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addNotification = (type: 'success' | 'error' | 'info', message: string, duration = 2000) => {
    const id = generateId();
    const notification: Notification = { id, type, message, duration };
    
    setNotifications(prev => [...prev, notification]);

    // Auto remove after duration
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const showSuccess = (message: string, duration?: number) => {
    addNotification('success', message, duration);
  };

  const showError = (message: string, duration?: number) => {
    addNotification('error', message, duration);
  };

  const showInfo = (message: string, duration?: number) => {
    addNotification('info', message, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      showSuccess,
      showError,
      showInfo,
      removeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
