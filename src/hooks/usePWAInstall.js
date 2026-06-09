import { useEffect, useState, useCallback, useRef } from "react";

const DISMISS_KEY = "ox_pwa_install_dismissed";
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {}
}

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/crios|fxios/i.test(navigator.userAgent) // exclude Chrome/Firefox on iOS
  );
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/**
 * Hook that manages the PWA install prompt lifecycle.
 *
 * Returns:
 *   - isInstallable: boolean — true when prompt is available (Chrome/Edge) or iOS instructions should show
 *   - isIOS: boolean — true on iOS Safari (no beforeinstallprompt, show manual instructions)
 *   - isStandalone: boolean — already running as installed app
 *   - install(): trigger the native prompt (Chrome/Edge only)
 *   - dismiss(): hide the banner for DISMISS_DAYS days
 */
export function usePWAInstall() {
  const promptRef = useRef(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const isStandalone = isInStandaloneMode();
  const isIOSDevice = isIOS();

  useEffect(() => {
    // Already installed or dismissed — nothing to do
    if (isStandalone || isDismissed()) return;

    // iOS: show manual instructions after engagement delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setIsInstallable(true), 45_000);
      return () => clearTimeout(timer);
    }

    // Chrome/Edge: capture the deferred prompt
    function onBeforeInstall(e) {
      e.preventDefault();
      promptRef.current = e;
      setIsInstallable(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [isStandalone, isIOSDevice]);

  const install = useCallback(async () => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    promptRef.current = null;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    saveDismiss();
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    isIOS: isIOSDevice,
    isStandalone,
    install,
    dismiss,
  };
}
