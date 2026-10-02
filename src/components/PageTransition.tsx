import { ReactNode } from "react";

/**
 * Light enter animation for route changes. Transform only (no opacity), so the
 * page is painted immediately and Largest Contentful Paint is not delayed.
 */
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <div className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out">
    {children}
  </div>
);
