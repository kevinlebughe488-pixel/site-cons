"use client";

import { useEffect } from "react";

/**
 * Page restaurée telle quelle par le navigateur (bouton « retour » après une
 * connexion ou une déconnexion) : on la recharge, pour qu'elle corresponde au
 * compte connecté maintenant et pas à celui d'avant.
 */
export function FreshOnBack() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}
