import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { to, name, contract_name, pdf_url, doc_id } = await request.json()

    if (!to || !pdf_url) {
      return NextResponse.json({ error: 'to and pdf_url are required' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set — email skipped')
      return NextResponse.json({ sent: false, reason: 'no_api_key' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: 'Nithrox <contratos@nithrox.com>',
      to,
      subject: `Tu contrato está listo — ${contract_name || 'Servicios Digitales'}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px;color:#18181b">
          <div style="text-align:center;margin-bottom:32px">
            <div style="display:inline-block;background:#18181b;border-radius:12px;padding:10px 20px">
              <span style="color:white;font-weight:900;font-size:14px;letter-spacing:2px">NITHROX</span>
            </div>
          </div>

          <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">¡Contrato firmado!</h1>
          <p style="color:#64748b;margin:0 0 24px">Hola ${name || ''}, tu firma ha sido registrada correctamente.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Contrato</p>
            <p style="margin:0;font-weight:700">${contract_name || 'Contrato de Servicios Digitales'}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b">Doc ID: NTX-${doc_id || '—'}</p>
          </div>

          <a href="${pdf_url}" target="_blank"
            style="display:block;text-align:center;background:#18181b;color:white;padding:14px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:24px">
            Descargar mi contrato PDF
          </a>

          <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
            El contrato también está disponible en tu panel cliente en
            <a href="https://panel.nithrox.com/portal/contratos" style="color:#18181b">panel.nithrox.com</a>
          </p>
        </div>
      `,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('email/contract error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
