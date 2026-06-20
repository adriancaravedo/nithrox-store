import { NextResponse } from 'next/server'

// Hardcoded promo codes — extend in DB later
const PROMOS = {
  NITHROX10: { discount: 10, message_es: '¡10% de descuento aplicado!',          message_en: '10% discount applied!'          },
  WELCOME20:  { discount: 20, message_es: '¡20% de descuento de bienvenida!',    message_en: '20% welcome discount applied!'  },
  LAUNCH50:   { discount: 50, message_es: '¡50% de descuento de lanzamiento!',   message_en: '50% launch discount applied!'   },
  PERU15:     { discount: 15, message_es: '¡15% de descuento especial Perú!',    message_en: '15% Peru special discount!'     },
  AGENCY30:   { discount: 30, message_es: '¡30% de descuento para agencias!',    message_en: '30% agency discount applied!'   },
}

export async function POST(request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({
        valid: false,
        discount: 0,
        message: 'Código inválido.',
      })
    }

    const normalised = code.trim().toUpperCase()
    const promo = PROMOS[normalised]

    if (!promo) {
      return NextResponse.json({
        valid: false,
        discount: 0,
        message: `El código "${normalised}" no es válido.`,
      })
    }

    return NextResponse.json({
      valid: true,
      discount: promo.discount,
      message: promo.message_es, // caller can switch to message_en if needed
    })
  } catch (err) {
    return NextResponse.json({ valid: false, discount: 0, message: err.message }, { status: 500 })
  }
}
