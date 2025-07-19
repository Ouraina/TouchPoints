// Service Worker Registration and Management for TouchPoints
// Handles PWA functionality with graceful fallbacks

import React from 'react';

interface ServiceWorkerUpdateEvent {
  type: 'update-available' | 'update-applied' | 'offline-ready';
  registration?: ServiceWorkerRegistration;
}

type ServiceWorkerEventHandler = (event: ServiceWorkerUpdateEvent) => void;

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private eventHandlers: ServiceWorkerEventHandler[] = [];

  /**
   * Register the service worker with proper error handling
   */
  async register(): Promise<boolean> {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service workers not supported');
      return false;
    }

    try {
      console.log('[SW] Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      console.log('[SW] Service worker registered successfully');

      // Set up event listeners
      this.setupEventListeners();

      return true;
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for service worker lifecycle
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for waiting service worker (update available)
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          this.notifyEventHandlers({
            type: 'update-available',
            registration: this.registration!
          });
        } else if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
          // First time installation
          this.notifyEventHandlers({
            type: 'offline-ready'
          });
        }
      });
    });

    // Listen for controlling service worker change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.notifyEventHandlers({
        type: 'update-applied'
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] Message from service worker:', event.data);
    });
  }

  /**
   * Add event handler for service worker events
   */
  addEventListener(handler: ServiceWorkerEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  removeEventListener(handler: ServiceWorkerEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Notify all event handlers
   */
  private notifyEventHandlers(event: ServiceWorkerUpdateEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  /**
   * Apply waiting service worker update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) return;

    // Tell the waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Get service worker version
   */
  async getVersion(): Promise<string | null> {
    if (!this.registration?.active) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || null);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_VERSION' }, 
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Clear all caches (useful for debugging)
   */
  async clearCaches(): Promise<boolean> {
    if (!this.registration?.active) return false;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      this.registration!.active!.postMessage(
        { type: 'CLEAR_CACHE' }, 
        [messageChannel.port2]
      );

      // Timeout after 10 seconds
      setTimeout(() => resolve(false), 10000);
    });
  }

  /**
   * Check if the app is running offline
   */
  static isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Check if the app is running as a PWA (installed)
   */
  static isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Get network status
   */
  static getNetworkStatus(): 'online' | 'offline' | 'slow' {
    if (!navigator.onLine) {
      return 'offline';
    }

    // Check for slow connection
    const connection = (navigator as any).connection;
    if (connection) {
      const slowConnections = ['slow-2g', '2g'];
      if (slowConnections.includes(connection.effectiveType)) {
        return 'slow';
      }
    }

    return 'online';
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Helper hooks for React components
export const useServiceWorker = () => {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [isOfflineReady, setIsOfflineReady] = React.useState(false);

  React.useEffect(() => {
    const handleSWEvent = (event: ServiceWorkerUpdateEvent) => {
      switch (event.type) {
        case 'update-available':
          setUpdateAvailable(true);
          break;
        case 'update-applied':
          setUpdateAvailable(false);
          // Reload the page to use new version
          window.location.reload();
          break;
        case 'offline-ready':
          setIsOfflineReady(true);
          break;
      }
    };

    serviceWorkerManager.addEventListener(handleSWEvent);

    return () => {
      serviceWorkerManager.removeEventListener(handleSWEvent);
    };
  }, []);

  const applyUpdate = () => {
    serviceWorkerManager.applyUpdate();
  };

  return {
    updateAvailable,
    isOfflineReady,
    applyUpdate,
    isOffline: ServiceWorkerManager.isOffline(),
    isPWA: ServiceWorkerManager.isPWA(),
    networkStatus: ServiceWorkerManager.getNetworkStatus()
  };
};

// Auto-register service worker when module loads
if (typeof window !== 'undefined') {
  // Wait for page load to avoid interfering with initial page rendering
  window.addEventListener('load', () => {
    serviceWorkerManager.register().then((success) => {
      if (success) {
        console.log('[SW] TouchPoints is now offline-ready!');
      }
    });
  });
}