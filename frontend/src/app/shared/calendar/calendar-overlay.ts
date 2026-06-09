export function positionCalendarPanel(trigger: HTMLElement, panel: HTMLElement): void {
  const gap = 6;
  const margin = 8;
  const panelWidth = panel.offsetWidth || 300;
  const panelHeight = panel.offsetHeight || 340;
  const rect = trigger.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + panelWidth > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - panelWidth - margin);
  }
  if (left < margin) left = margin;

  if (top + panelHeight > window.innerHeight - margin) {
    top = rect.top - panelHeight - gap;
  }
  if (top < margin) top = margin;

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}
