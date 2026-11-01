export function segmentCenterAngle(index, poolSize) {
  const segmentWidth = 360 / poolSize;
  return (index + 0.5) * segmentWidth;
}

export function computeFinalRotation(targetIndex, poolSize) {
  const segmentWidth = 360 / poolSize;
  const center = segmentCenterAngle(targetIndex, poolSize);
  const jitter = (Math.random() - 0.5) * 0.8 * segmentWidth;
  const baseTurns = 6;
  return baseTurns * 360 + (360 - center) + jitter;
}

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#c589e8', '#ff8a3d'];
const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderWheel(svgEl, names) {
  svgEl.innerHTML = '';
  svgEl.setAttribute('viewBox', '-150 -150 300 300');

  const n = names.length;
  if (n === 0) return;
  const segmentWidth = 360 / n;

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'wheel-rotor');

  for (let i = 0; i < n; i++) {
    const startAngle = i * segmentWidth;
    const endAngle = (i + 1) * segmentWidth;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', arcPath(140, startAngle, endAngle));
    path.setAttribute('fill', COLORS[i % COLORS.length]);
    path.setAttribute('stroke', 'white');
    path.setAttribute('stroke-width', '1');
    g.appendChild(path);
  }

  // Radial text: each name reads along its segment's spoke, from near the hub
  // outward. This uses the full radial length (~95 units) instead of the much
  // smaller chord width, letting more characters fit per name.
  //
  // Font height is capped so neighboring labels don't overlap at mid-radius:
  //   chord(midRadius) ≈ 2 * midRadius * sin(π / n)
  const midRadius = 70;
  const chordAtMid = 2 * midRadius * Math.sin(Math.PI / n);
  const fontSize = clamp(5, 11, chordAtMid * 0.5);
  const textStartR = 42;              // just outside the hub
  const textLengthBudget = 140 - textStartR - 4;
  const maxChars = Math.max(6, Math.floor(textLengthBudget / (fontSize * 0.55)));

  for (let i = 0; i < n; i++) {
    const center = segmentCenterAngle(i, n);
    const text = document.createElementNS(SVG_NS, 'text');
    // rotate(center - 90) aligns +x of the text with the segment's outward
    // radial direction (our angle 0 = up, SVG rotate 0 = right).
    text.setAttribute('transform', `rotate(${center - 90})`);
    text.setAttribute('x', String(textStartR));
    text.setAttribute('y', '0');
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', fontSize);
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', '#1f2937');
    text.textContent = truncate(names[i], maxChars);
    g.appendChild(text);
  }

  const hub = document.createElementNS(SVG_NS, 'circle');
  hub.setAttribute('r', '36');
  hub.setAttribute('fill', 'white');
  hub.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  hub.setAttribute('stroke-width', '1');
  g.appendChild(hub);

  const hubIcon = document.createElementNS(SVG_NS, 'text');
  hubIcon.setAttribute('x', '0');
  hubIcon.setAttribute('y', '8');
  hubIcon.setAttribute('text-anchor', 'middle');
  hubIcon.setAttribute('font-size', '26');
  hubIcon.textContent = '🎁';
  g.appendChild(hubIcon);

  svgEl.appendChild(g);
}

export function spinTo(svgEl, targetIndex, poolSize) {
  const rotor = svgEl.querySelector('.wheel-rotor');
  if (!rotor) return Promise.resolve();
  const finalRotation = computeFinalRotation(targetIndex, poolSize);

  // Commit the starting state (0deg, no transition) before applying the
  // target rotation. Reading a layout property forces a reflow between the
  // two writes so the browser treats this as a real transition.
  rotor.style.transition = 'none';
  rotor.style.transform = 'rotate(0deg)';
  void rotor.getBoundingClientRect();

  rotor.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 1)';
  rotor.style.transform = `rotate(${finalRotation}deg)`;

  return new Promise((resolve) => {
    rotor.addEventListener('transitionend', resolve, { once: true });
  });
}

export function resetWheel(svgEl) {
  const rotor = svgEl.querySelector('.wheel-rotor');
  if (!rotor) return;
  rotor.style.transition = 'none';
  rotor.style.transform = 'rotate(0deg)';
}

function arcPath(r, startDeg, endDeg) {
  const start = polar(r, startDeg);
  const end = polar(r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M 0 0 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

function polar(r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function truncate(s, max) {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function clamp(lo, hi, v) {
  return Math.max(lo, Math.min(hi, v));
}
