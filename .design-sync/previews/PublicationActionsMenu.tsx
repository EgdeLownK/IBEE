import { useEffect, useRef } from 'react';
import { PublicationActionsMenu } from '@ibee/ui-react';

// PublicationActionsMenu pilote son ouverture via un useState interne (pas de
// prop `open`) — un menu contextuel n'a pas d'état "ouvert" observable en
// JSX pur. Le render check tourne dans un vrai Chromium (Playwright), donc on
// simule le clic réel sur le déclencheur pour capturer l'état déroulé.
function AutoOpen({ step }: { step: 'menu' | 'confirm' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled || !ref.current) return;
      const trigger = ref.current.querySelector<HTMLButtonElement>(
        'button[aria-label="Actions de la publication"]',
      );
      trigger?.click();

      if (step === 'confirm') {
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled || !ref.current) return;
        const deleteItem = Array.from(ref.current.querySelectorAll('button')).find(
          (b) => b.textContent?.includes('Supprimer') && b.className.includes('text-error'),
        );
        deleteItem?.click();
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [step]);

  return (
    <div ref={ref} style={{ position: 'relative', minHeight: 220, paddingTop: 8 }}>
      <PublicationActionsMenu publicationId="pub-42" editUrl="#" onDelete={async () => {}} />
    </div>
  );
}

export function Closed() {
  return (
    <div style={{ minHeight: 60, paddingTop: 8 }}>
      <PublicationActionsMenu publicationId="pub-42" editUrl="#" onDelete={async () => {}} />
    </div>
  );
}

export function Open() {
  return <AutoOpen step="menu" />;
}

export function DeleteConfirm() {
  return <AutoOpen step="confirm" />;
}
