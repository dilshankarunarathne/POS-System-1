import React from 'react';
import { Alert } from 'react-bootstrap';
import { CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import { useNotification } from '../contexts/NotificationContext';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <Alert
            variant={notification.type === 'success' ? 'success' : 'danger'}
            className="notification-alert d-flex align-items-center"
            onClose={() => removeNotification(notification.id)}
            dismissible
          >
            <div className="d-flex align-items-center">
              {notification.type === 'success' ? (
                <CheckCircleFill className="me-2" size={20} />
              ) : (
                <XCircleFill className="me-2" size={20} />
              )}
              <span className="notification-message">{notification.message}</span>
            </div>
          </Alert>
        </div>
      ))}

      <style>{`
        .notification-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          max-width: 400px;
          width: 90%;
        }

        .notification {
          margin-bottom: 10px;
          animation: notificationSlideIn 0.3s ease-out;
        }

        .notification-alert {
          margin: 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: none;
          border-radius: 12px;
          font-weight: 500;
          padding: 1rem 1.25rem;
        }

        .notification-success .notification-alert {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border-left: 4px solid #28a745;
          color: #155724;
        }

        .notification-error .notification-alert {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          border-left: 4px solid #dc3545;
          color: #721c24;
        }

        .notification-message {
          font-size: 0.95rem;
          line-height: 1.4;
        }

        @keyframes notificationSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 576px) {
          .notification-container {
            width: 95%;
            max-width: none;
            top: 40%;
          }
          
          .notification-alert {
            padding: 0.875rem 1rem;
          }
          
          .notification-message {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationContainer;
