import { useEffect, useRef } from "react";
import { loadTurnstile, TURNSTILE_SITE_KEY } from "@/lib/turnstile";

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

/**
 * Renders nothing until the site key is set. Each token is single use, so
 * remount the widget (change its `key`) after every submit to get a fresh one.
 */
const TurnstileWidget = ({ onToken }: TurnstileWidgetProps) => {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let widgetId: string | undefined;
    let unmounted = false;

    loadTurnstile()
      .then(() => {
        if (unmounted || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      unmounted = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={container} className="min-h-[65px]" />;
};

export default TurnstileWidget;
