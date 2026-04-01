function glowFromColor(hex) {
  if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.2)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.25)`;
}

export async function applyTheme() {
  const themeName = await window.goonAPI.getTheme();
  const full = await window.goonAPI.getFullTheme(themeName);
  const custom = await window.goonAPI.getUICustomization();
  const { colors, ui, crt } = full;
  const root = document.documentElement;

  // Color vars (--color-*)
  root.style.setProperty('--color-primary', (custom?.primary ?? colors.primary) || '#00ff41');
  root.style.setProperty('--color-background', (custom?.background ?? colors.background) || '#0a0e0a');
  root.style.setProperty('--color-surface', (custom?.surface ?? colors.surface) || '#0d120d');
  root.style.setProperty('--color-text', (custom?.text ?? colors.text) || '#00ff41');
  root.style.setProperty('--color-text-secondary', (custom?.textSecondary ?? colors.textSecondary) || '#b8d42a');
  root.style.setProperty('--color-border', (custom?.border ?? colors.border) || '#1a2f1a');
  root.style.setProperty('--color-success', custom?.success ?? colors.success ?? '#00ff41');
  root.style.setProperty('--color-warning', custom?.warning ?? colors.warning ?? '#ffb000');
  root.style.setProperty('--color-error', custom?.error ?? colors.error ?? '#ff4136');
  root.style.setProperty('--color-info', custom?.info ?? colors.info ?? '#00d4ff');
  root.style.setProperty('--color-highlight', (custom?.highlight ?? colors.highlight) || '#00ff41');

  const merged = { ...colors, ...custom };
  const accent = merged.primary || merged.highlight;

  // HUD vars (--hud-*) for surveillance.css
  root.style.setProperty('--hud-bg', merged.background || '#0a0e0a');
  root.style.setProperty('--hud-bg-elevated', merged.surface || '#0d120d');
  root.style.setProperty('--hud-surface', merged.surface || '#0d120d');
  root.style.setProperty('--hud-surface-hover', merged.surface || '#111411');
  root.style.setProperty('--hud-border', merged.border || '#1a2f1a');
  root.style.setProperty('--hud-border-strong', merged.border || '#243b24');
  root.style.setProperty('--hud-text', merged.text || '#00ff41');
  root.style.setProperty('--hud-text-dim', merged.textSecondary || '#b8d42a');
  root.style.setProperty('--hud-accent', accent || '#00ff41');
  root.style.setProperty('--hud-accent-amber', merged.warning || '#ffb000');
  root.style.setProperty('--hud-glow', glowFromColor(accent));

  // UI customization (merge theme ui + custom overrides)
  const uiMerge = { ...ui, ...(custom?.ui || {}) };
  root.style.setProperty('--ui-font-size', `${uiMerge.fontSize ?? 21}px`);
  root.style.setProperty('--ui-font-size-small', `${uiMerge.fontSizeSmall ?? 18}px`);
  root.style.setProperty('--ui-button-padding', uiMerge.buttonPadding ?? '12px 18px');
  root.style.setProperty('--ui-border-radius', uiMerge.borderRadius ?? '0px');
  root.style.setProperty('--hud-font-mono', uiMerge.fontMono ?? 'monospace');

  document.body.dataset.theme = themeName;
  document.body.dataset.crt = crt ? 'true' : 'false';
}
