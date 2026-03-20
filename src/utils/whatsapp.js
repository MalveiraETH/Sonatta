/**
 * Opens WhatsApp in a mobile-friendly way.
 * Using anchor click instead of window.open to avoid popup blockers on mobile.
 */
export function openWhatsApp(phone, message = '') {
  const url = `https://wa.me/${phone}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}