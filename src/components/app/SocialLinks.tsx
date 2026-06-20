import { Instagram, Mail, MessageCircle } from 'lucide-react'
import { clinic } from '../../data/clinic'

// lucide-react has no TikTok glyph — provide one.
export function TikTokIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.78.12V9.79a5.7 5.7 0 0 0-.78-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.34 7.34 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48Z" />
    </svg>
  )
}

const cls = 'grid h-10 w-10 place-items-center rounded-full transition hover:brightness-95'
const dotStyle = { background: 'var(--color-cream)', color: 'var(--color-gold-deep)' }

// Patient-facing social/contact icons. Instagram + TikTok always; WhatsApp +
// email when `showContact`. All open in a new tab.
export function SocialLinks({ showContact = false, size = 17 }: { showContact?: boolean; size?: number }) {
  return (
    <div className="flex gap-2">
      {showContact && (
        <a href={`https://wa.me/${clinic.whatsappRaw}`} target="_blank" rel="noopener noreferrer" className={cls} style={dotStyle} aria-label="WhatsApp Ameris" title="WhatsApp">
          <MessageCircle size={size} />
        </a>
      )}
      <a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer" className={cls} style={dotStyle} aria-label={`Instagram Ameris (${clinic.instagram})`} title="Instagram">
        <Instagram size={size} />
      </a>
      <a href={clinic.tiktokUrl} target="_blank" rel="noopener noreferrer" className={cls} style={dotStyle} aria-label={`TikTok Ameris (${clinic.tiktok})`} title="TikTok">
        <TikTokIcon size={size - 1} />
      </a>
      {showContact && (
        <a href={`mailto:${clinic.email}`} className={cls} style={dotStyle} aria-label="Email Ameris" title="Email">
          <Mail size={size} />
        </a>
      )}
    </div>
  )
}
