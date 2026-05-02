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

function isHuntUrl() {
  const raw = [
    window.location.pathname || "",
    window.location.search || "",
    window.location.hash || "",
  ].join(" ");

  return (
    /(^|[/?#&=])hunt($|[/?#&=:/.-])/i.test(raw) ||
    /scavenger/i.test(raw) ||
    /[?&#]stop=/i.test(raw) ||
    /mayday-hunt-stop/i.test(raw)
  );
}

function redirectAwayFromHunt() {
  if (!HUNT_PUBLICLY_HIDDEN) return;

  if (isHuntUrl()) {
    try {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      window.location.href = "/";
    }
  }
}

function hide(el) {
  if (!el || el === document.body || el === document.documentElement) return;
  el.setAttribute("data-mayday-hunt-hidden", "true");
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("pointer-events", "none", "important");
}

function smallestSafeBlock(el) {
  let cur = el;

  while (cur && cur !== document.body && cur !== document.documentElement) {
    const txt = textOf(cur);

    if (
      cur.matches?.("a,button,[role='button'],[role='tab'],li") ||
      cur.matches?.("article,section,.card,.panel,.route-card,.hunt-card,[class*='card'],[class*='panel']")
    ) {
      return cur;
    }

    if (txt.length > 0 && txt.length < 600) {
      return cur;
    }

    cur = cur.parentElement;
  }

  return el;
}

function shouldHideElement(el) {
  const txt = textOf(el);
  const href = [
    attrOf(el, "href"),
    attrOf(el, "to"),
    attrOf(el, "data-route"),
    attrOf(el, "data-tab"),
    attrOf(el, "aria-label"),
    attrOf(el, "title"),
  ].join(" ");

  if (/\bhunt\b/i.test(href)) return true;
  if (/scavenger/i.test(href)) return true;
  if (/mayday-hunt-stop/i.test(href)) return true;

  if (/^scavenger hunt$/i.test(txt)) return true;
  if (/scavenger hunt/i.test(txt) && txt.length < 220) return true;

  if (/start at the welcome center/i.test(txt)) return true;
  if (/progress and tickets/i.test(txt)) return true;
  if (/completed\s+\d+\s+of\s+50\s+stops/i.test(txt)) return true;
  if (/player code:/i.test(txt)) return true;
  if (/check the map/i.test(txt) && /progress/i.test(txt)) return true;

  return false;
}

function scanAndHideHuntUi(root = document) {
  if (!HUNT_PUBLICLY_HIDDEN) return;

  redirectAwayFromHunt();

  const nodes = root.querySelectorAll
    ? root.querySelectorAll("a,button,[role='button'],[role='tab'],li,article,section,div")
    : [];

  for (const el of nodes) {
    if (el?.getAttribute?.("data-mayday-hunt-hidden") === "true") continue;

    if (shouldHideElement(el)) {
      hide(smallestSafeBlock(el));
    }
  }
}

export function installMaydayHuntKillSwitch() {
  if (!HUNT_PUBLICLY_HIDDEN) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  redirectAwayFromHunt();

  const style = document.createElement("style");
  style.setAttribute("data-mayday-hunt-kill-switch", "true");
  style.textContent = `
    [href*="hunt"],
    [href*="scavenger"],
    [data-route*="hunt"],
    [data-tab*="hunt"],
    [aria-label*="Scavenger Hunt"],
    [aria-label*="scavenger hunt"],
    [data-mayday-hunt-hidden="true"] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  const run = () => scanAndHideHuntUi(document);

  run();
  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);

  const observer = new MutationObserver(() => run());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(run, 750);
}
