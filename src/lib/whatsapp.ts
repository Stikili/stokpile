// Generate share URLs for WhatsApp.
// On mobile this opens the native app; on desktop it opens web.whatsapp.com.

export function whatsappShareUrl(text: string, phone?: string): string {
  const encoded = encodeURIComponent(text);
  if (phone) {
    const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function shareToWhatsApp(text: string, phone?: string): void {
  window.open(whatsappShareUrl(text, phone), '_blank', 'noopener,noreferrer');
}

// Try Web Share API first, fall back to WhatsApp deep link
export async function shareContent(opts: {
  title?: string;
  text: string;
  url?: string;
}): Promise<void> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return;
    } catch {
      // User cancelled or share failed — fall through
    }
  }
  const message = opts.url ? `${opts.text}\n\n${opts.url}` : opts.text;
  shareToWhatsApp(message);
}
