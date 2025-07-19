import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstall,
  onDismiss,
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as PWA (installed)
    if (window.navigator && (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after a delay to not be too aggressive
      setTimeout(() => {
        // Only show if user has been on the site for a bit
        if (!localStorage.getItem('touchpoints-install-dismissed')) {
          setShowPrompt(true);
        }
      }, 10000); // Wait 10 seconds
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
        onInstall?.();
      } else {
        console.log('User dismissed the install prompt');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during install:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('touchpoints-install-dismissed', 'true');
    onDismiss?.();
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Clear the dismissed flag so they can see it again later
    localStorage.removeItem('touchpoints-install-dismissed');
    onDismiss?.();
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || !deferredPrompt || !showPrompt) {
    return null;
  }

  return (
    <Card className={`p-6 border-blue-200 bg-blue-50 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Install TouchPoints
              </h3>
              <p className="text-sm text-blue-700">
                Get the app for the best experience
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Instant access from your home screen</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Works offline in hospitals with poor WiFi</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Push notifications for important updates</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInstalling ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-200 border-t-white mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>

            <button
              onClick={handleRemindLater}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Remind me later
            </button>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 text-blue-400 hover:text-blue-600"
          aria-label="Dismiss install prompt"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </Card>
  );
};

// Hook to check if PWA is installable
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      if (window.navigator && (window.navigator as any).standalone) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    if (checkInstalled()) return;

    // Listen for installability
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { isInstallable, isInstalled };
};