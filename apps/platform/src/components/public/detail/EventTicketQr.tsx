import QRCode from 'qrcode'

type Props = {
  value: string
  label?: string
}

export async function EventTicketQr({ value, label = 'QR code billet' }: Props) {
  const dataUrl = await QRCode.toDataURL(value, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: 'M',
  })

  return (
    <img
      src={dataUrl}
      alt={label}
      width={220}
      height={220}
      className="event-ticket-qr"
    />
  )
}
