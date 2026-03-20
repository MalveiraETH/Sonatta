/**
 * Opens WhatsApp in a mobile-friendly way.
 * Uses window.location.href (same method that works on iOS/Android).
 */
export function openWhatsApp(phone, message = '') {
  const url = `https://wa.me/${phone}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  window.location.href = url;
}