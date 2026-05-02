const HUNT_PUBLICLY_HIDDEN = true;

function textOf(el) {
  return String(el?.innerText || el?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function attrOf(el, name) {
  try {
    return String(el?.getAttribute?.(name) || "");
  } catch {
    return "";
  }
}

function isHuntLocation() {
  const raw = [
    window.location.pathname || "",
    window.location.search || "",
    window.location.hash || "",
  ].join(" ");

  return (
    /(^|[/?#&=])hunt($|[/?#&=:/.-])/i.test(raw) ||
    /[?&#]stop=/i.test(raw) ||
    /mayday-hunt-stop/i.test(raw)
  );
}

function redirectAwayFromHunt() {
  if (!HUNT_PUBLICLY_HIDDEN) return;
  if (!isHuntLocation()) return;

  try {
    window.history.replaceState(null, "", "/");
  } catch {
    window.location.href = "/";
  }
}

function hideDirectHuntLinks() {
  if (!HUNT_PUBLICLY_HIDDEN) return;

  const nodes = document.querySelectorAll(
    "a, button, [role='button'], [role='tab'], [aria-label], [title]"
  );

  for (const el of nodes) {
    const txt = textOf(el);
    const attrs = [
      attrOf(el, "href"),
      attrOf(el, "to"),
      attrOf(el, "data-route"),
      attrOf(el, "data-tab"),
      attrOf(el, "aria-label"),
      attrOf(el, "title"),
    ].join(" ");

    const isDirectHuntControl =
      /\bhunt\b/i.test(attrs) ||
      /scavenger/i.test(attrs) ||
      /mayday-hunt-stop/i.test(attrs) ||
      /^scavenger hunt$/i.test(txt);

    if (!isDirectHuntControl) continue;

    el.setAttribute("data-mayday-hunt-hidden", "true");
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("pointer-events", "none", "important");
  }
}

export function installMaydayHuntKillSwitch() {
  if (!HUNT_PUBLICLY_HIDDEN) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  redirectAwayFromHunt();

  const style = document.createElement("style");
  style.setAttribute("data-mayday-hunt-kill-switch", "true");
  style.textContent = `
    a[href*="hunt"],
    a[href*="scavenger"],
    button[data-route*="hunt"],
    button[data-tab*="hunt"],
    [role="tab"][data-route*="hunt"],
    [role="tab"][data-tab*="hunt"],
    [data-mayday-hunt-hidden="true"] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  const run = () => {
    redirectAwayFromHunt();
    hideDirectHuntLinks();
  };

  requestAnimationFrame(run);
  setTimeout(run, 250);
  setTimeout(run, 1000);

  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
