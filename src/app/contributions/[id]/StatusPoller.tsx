"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 3_000;
const GIVE_UP_MS = 3 * 60_000;

/** Vérifie régulièrement l'état du paiement et rafraîchit la page quand il est final. */
export function StatusPoller({ id }: { id: string }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const started = Date.now();
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      if (Date.now() - started > GIVE_UP_MS) {
        stopped = true;
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      try {
        const res = await fetch(`/api/contributions/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { open: boolean };
        if (!body.open) {
          stopped = true;
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // réseau instable : on réessaie au prochain tour
      }
    }, INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [id, router]);

  return gaveUp ? (
    <p className="small muted">
      Toujours pas de confirmation. Si vous avez validé le paiement, il apparaîtra dans votre compte dès que
      l&apos;opérateur l&apos;aura confirmé. <button className="link-btn" onClick={() => router.refresh()}>Actualiser</button>
    </p>
  ) : (
    <p className="small muted" style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
      <span className="spinner" aria-hidden="true" /> En attente de la confirmation de l&apos;opérateur…
    </p>
  );
}
