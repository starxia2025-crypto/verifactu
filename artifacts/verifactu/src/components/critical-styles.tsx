const css = `
html, body, #root {
  min-height: 100%;
  width: 100%;
  margin: 0;
}

body {
  background: #f4f7fb;
  color: #0f172a;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
  text-decoration: none;
}

.vf-auth {
  position: relative;
  display: grid;
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f4f7fb;
  color: #0f172a;
}

.vf-auth-language {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 20;
  width: 11rem;
}

.vf-auth-hero {
  display: none;
  min-height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 3rem;
  color: white;
  background:
    radial-gradient(circle at 18% 14%, rgba(125, 211, 252, 0.36), transparent 28%),
    radial-gradient(circle at 84% 78%, rgba(14, 165, 233, 0.3), transparent 30%),
    linear-gradient(135deg, #002b74 0%, #0057c8 52%, #00a3ff 100%);
}

.vf-auth-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}

.vf-auth-logo {
  display: flex;
  width: 3rem;
  height: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(255,255,255,0.18);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.24);
}

.vf-auth-copy {
  position: relative;
  max-width: 42rem;
}

.vf-auth-copy h1 {
  margin: 0;
  font-size: clamp(2.5rem, 4vw, 4.7rem);
  line-height: 1.03;
  letter-spacing: -0.04em;
}

.vf-auth-copy p {
  color: rgba(240, 249, 255, 0.86);
  font-size: 1.1rem;
  line-height: 1.8;
}

.vf-auth-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.vf-auth-kpis > div {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 1.25rem;
  background: rgba(255,255,255,0.12);
  padding: 1rem;
  backdrop-filter: blur(16px);
}

.vf-auth-panel {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
}

.vf-auth-card {
  width: 100%;
  max-width: 28rem;
  border: 1px solid rgba(255,255,255,0.82);
  border-radius: 1.5rem;
  background: rgba(255,255,255,0.92);
  padding: 2.25rem;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.14);
}

.vf-main-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f4f7fb;
}

.vf-main-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.vf-app-header {
  display: flex;
  height: 4rem;
  flex-shrink: 0;
  align-items: center;
  border-bottom: 1px solid #dbe4ef;
  background: rgba(255,255,255,0.9);
  padding: 0 2rem;
  backdrop-filter: blur(16px);
}

.vf-app-main {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
  padding: clamp(1.25rem, 3vw, 3rem);
}

[data-sidebar="sidebar"] {
  background:
    radial-gradient(circle at 18% 12%, rgba(125, 211, 252, 0.35), transparent 28%),
    radial-gradient(circle at 90% 82%, rgba(14, 165, 233, 0.28), transparent 30%),
    linear-gradient(155deg, #082966 0%, #004aa8 48%, #0077dc 100%) !important;
  color: white;
}

[data-sidebar="menu-button"] {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.9rem;
  padding: 0.72rem 0.82rem;
  color: rgba(255,255,255,0.84);
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

[data-sidebar="menu-button"]:hover {
  background: rgba(255,255,255,0.12);
  color: white;
}

[data-sidebar="menu-button"][data-active="true"] {
  background: white;
  color: #0f172a;
  font-weight: 700;
  box-shadow: 0 16px 30px rgba(2, 8, 23, 0.18);
}

[data-slot="card"] {
  width: 100%;
  border: 1px solid #dbe4ef;
  border-radius: 1.25rem;
  background: white;
  color: #0f172a;
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.06);
}

[data-slot="card-header"] {
  padding: 1.5rem;
}

[data-slot="card-content"] {
  padding: 1.5rem;
}

[data-slot="button"], button {
  border: 1px solid transparent;
  border-radius: 0.65rem;
  padding: 0.58rem 1rem;
  background: #004a98;
  color: white;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}

input, [role="combobox"] {
  min-height: 2.4rem;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.65rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: #0f172a;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

th {
  color: #64748b;
  font-weight: 650;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.9rem;
}

td {
  border-bottom: 1px solid #edf2f7;
  padding: 0.9rem;
}

@media (min-width: 1024px) {
  .vf-auth {
    grid-template-columns: 1.1fr 0.9fr;
  }

  .vf-auth-hero {
    display: flex;
  }
}
`;

export function CriticalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
