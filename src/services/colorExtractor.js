// Fast client-side dominant color extraction from image
export function getAverageRGB(imgEl) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '16, 185, 129'; // emerald default

    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(imgEl, 0, 0, 32, 32);

    const data = ctx.getImageData(0, 0, 32, 32).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      // Ignore very dark and very light pixels for richer tone
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const brightness = (pr * 299 + pg * 587 + pb * 114) / 1000;
      if (brightness > 25 && brightness < 225) {
        r += pr;
        g += pg;
        b += pb;
        count++;
      }
    }

    if (count === 0) return '16, 185, 129';
    return `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
  } catch (e) {
    return '16, 185, 129';
  }
}
