import { $ } from '../utils/dom.js';
import { state } from '../state.js';
import { QR_PREFIX } from '../config.js';

/** The value encoded in a guest's QR code. */
export const qrText = () => state.token ? 'EC-' + state.token : QR_PREFIX + (state.guest.name || 'invite');

export function drawQR() {
  const box = $('qr');
  box.innerHTML = '';
  if (window.QRCode) new window.QRCode(box, { text: qrText(), width: 170, height: 170, colorDark: '#4a2f7a', colorLight: '#ffffff' });
}
