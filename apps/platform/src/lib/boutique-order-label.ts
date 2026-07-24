import type { BoutiqueOrderView } from '@/lib/boutique-order-view'

export function canPrintShippingLabel(order: BoutiqueOrderView): boolean {
  return order.productType !== 'digital' && order.paymentStatus === 'paid'
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildLabelBlock(order: BoutiqueOrderView, senderName: string): string {
  const items = order.items.map((item) => `${item.name} × ${item.qty}`).join('<br />')
  return `
    <section class="label">
      <header class="label__head">
        <p class="label__sender">${escapeHtml(senderName)}</p>
        <p class="label__ref">${escapeHtml(order.ref)}</p>
      </header>
      <div class="label__dest">
        <p class="label__dest-title">Destinataire</p>
        <p class="label__name">${escapeHtml(order.customer)}</p>
        ${order.email ? `<p class="label__muted">${escapeHtml(order.email)}</p>` : ''}
        <p class="label__address">${escapeHtml(order.shippingAddress?.trim() || 'Adresse non renseignée')}</p>
      </div>
      <div class="label__items">
        <p class="label__dest-title">Contenu</p>
        <p>${items}</p>
      </div>
      <footer class="label__foot">
        <span>${order.itemCount} article${order.itemCount > 1 ? 's' : ''}</span>
        <span>${escapeHtml(order.ref)}</span>
      </footer>
    </section>
  `
}

function buildLabelsDocument(orders: BoutiqueOrderView[], senderName: string): string {
  const labels = orders.map((order) => buildLabelBlock(order, senderName)).join('')
  const orderIdsJson = JSON.stringify(orders.map((order) => order.id))
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Étiquettes commandes</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; color: #111; padding-bottom: 88px; }
    .label {
      width: 100mm;
      min-height: 150mm;
      padding: 10mm;
      margin: 0 auto 8mm;
      border: 1px solid #ccc;
      display: flex;
      flex-direction: column;
      gap: 8mm;
      page-break-after: always;
    }
    .label:last-child { page-break-after: auto; }
    .label__head { display: flex; justify-content: space-between; gap: 8px; border-bottom: 2px solid #111; padding-bottom: 4mm; }
    .label__sender { margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .label__ref { margin: 0; font-size: 14px; font-weight: 700; }
    .label__dest-title { margin: 0 0 2mm; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
    .label__name { margin: 0; font-size: 18px; font-weight: 700; line-height: 1.25; }
    .label__muted { margin: 2mm 0 0; font-size: 12px; color: #444; }
    .label__address { margin: 4mm 0 0; font-size: 14px; line-height: 1.45; }
    .label__items { font-size: 13px; line-height: 1.4; }
    .label__foot { margin-top: auto; display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; border-top: 1px dashed #bbb; padding-top: 4mm; }
    .confirm-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      background: #111;
      color: #fff;
      text-align: center;
    }
    .confirm-bar p { margin: 0; font-size: 14px; line-height: 1.4; }
    .confirm-bar__actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .confirm-bar button {
      min-height: 40px;
      padding: 0 18px;
      border: none;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .confirm-bar__cancel {
      background: transparent;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }
    .confirm-bar__done {
      background: #fff;
      color: #111;
    }
    @media print {
      body { margin: 0; padding-bottom: 0; }
      .label { border: none; margin: 0; }
      .confirm-bar { display: none !important; }
    }
  </style>
</head>
<body>${labels}
  <div id="confirm-bar" class="confirm-bar" hidden>
    <p>Après l&apos;impression, confirmez pour passer les commandes en «&nbsp;Prêt&nbsp;».</p>
    <div class="confirm-bar__actions">
      <button type="button" id="cancel-btn" class="confirm-bar__cancel">Annuler</button>
      <button type="button" id="confirm-btn" class="confirm-bar__done">Impression terminée</button>
    </div>
  </div>
  <script>
    var orderIds = ${orderIdsJson};
    function notifyParent(type) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: type, orderIds: orderIds }, '*');
      }
    }
    window.addEventListener('load', function () {
      window.print();
    });
    window.addEventListener('afterprint', function () {
      var bar = document.getElementById('confirm-bar');
      if (bar) bar.hidden = false;
    });
    document.getElementById('confirm-btn').addEventListener('click', function () {
      notifyParent('ibee-labels-print-confirmed');
    });
    document.getElementById('cancel-btn').addEventListener('click', function () {
      notifyParent('ibee-labels-print-cancel');
    });
  </script>
</body>
</html>`
}

export type PrintLabelsResult = { ok: true; orderIds: string[] } | { ok: false; error: string }

export const PRINT_CANCELLED_ERROR = 'Impression annulée.'

function writeLabelsDocument(targetWindow: Window, html: string) {
  targetWindow.document.open()
  targetWindow.document.write(html)
  targetWindow.document.close()
}

export function printShippingLabels(
  orders: BoutiqueOrderView[],
  senderName: string,
): Promise<PrintLabelsResult> {
  const printable = orders.filter(canPrintShippingLabel)
  if (printable.length === 0) {
    return Promise.resolve({
      ok: false,
      error: 'Aucune commande physique payée à imprimer.',
    })
  }

  const html = buildLabelsDocument(printable, senderName.trim() || 'IBEE')

  return new Promise((resolve) => {
    let settled = false

    const overlay = document.createElement('div')
    overlay.className = 'boutique-print-overlay'

    const toolbar = document.createElement('div')
    toolbar.className = 'boutique-print-overlay__toolbar'

    const title = document.createElement('p')
    title.className = 'boutique-print-overlay__title'
    title.textContent = 'Impression des étiquettes'

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'boutique-print-overlay__close'
    closeBtn.textContent = 'Fermer'

    const iframe = document.createElement('iframe')
    iframe.className = 'boutique-print-overlay__frame'
    iframe.setAttribute('title', 'Aperçu des étiquettes')

    toolbar.append(title, closeBtn)
    overlay.append(toolbar, iframe)
    document.body.appendChild(overlay)
    document.body.classList.add('boutique-print-overlay-open')

    const iframeWindow = iframe.contentWindow
    if (!iframeWindow) {
      overlay.remove()
      document.body.classList.remove('boutique-print-overlay-open')
      resolve({ ok: false, error: 'Impossible d’ouvrir l’aperçu d’impression.' })
      return
    }

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKeyDown)
      overlay.remove()
      document.body.classList.remove('boutique-print-overlay-open')
    }

    const settle = (result: PrintLabelsResult) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    const cancel = () => settle({ ok: false, error: PRINT_CANCELLED_ERROR })

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeWindow) return
      const data = event.data as { type?: string; orderIds?: string[] } | null
      if (!data) return

      if (data.type === 'ibee-labels-print-confirmed' && Array.isArray(data.orderIds)) {
        settle({ ok: true, orderIds: data.orderIds })
        return
      }

      if (data.type === 'ibee-labels-print-cancel') {
        cancel()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel()
    }

    closeBtn.addEventListener('click', cancel)
    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKeyDown)

    writeLabelsDocument(iframeWindow, html)
  })
}
