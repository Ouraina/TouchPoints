import React from 'react';
import { RefreshCw, Download, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useServiceWorker } from '../../utils/serviceWorker';

interface UpdateNotificationProps {
  className?: string;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  className = ''
}) => {
  const { updateAvailable, isOfflineReady, applyUpdate } = useServiceWorker();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if dismissed or no update available
  if (dismissed || (!updateAvailable && !isOfflineReady)) {
    return null;
  }

  const handleApplyUpdate = () => {
    applyUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (updateAvailable) {
    return (
      <div className={`fixed bottom-4 right-4 max-w-sm bg-blue-600 text-white rounded-lg shadow-lg p-4 z-50 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5" />
              <h4 className="font-semibold">Update Available</h4>
            </div>
            <p className="text-sm text-blue-100 mb-3">
              A new version of TouchPoints is ready. Restart to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApplyUpdate}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Restart App
              </Button>
              <button
                onClick={handleDismiss}
                className="text-sm text-blue-200 hover:text-white px-2"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-blue-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isOfflineReady) {
    return (
      <div className={`fixed bottom-4 right-4 max-w-sm bg-green-600 text-white rounded-lg shadow-lg p-4 z-50 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5" />
              <h4 className="font-semibold">Offline Ready</h4>
            </div>
            <p className="text-sm text-green-100 mb-2">
              TouchPoints is now available offline! You can use the app even without internet connection.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-green-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};