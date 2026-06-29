import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import { UserProfile, type UserProfileData } from "@/entities/UserProfile";

function buildProfileHeader(profile: UserProfileData, title: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "background:#1e293b",
    "color:white",
    "padding:20px 28px",
    "display:flex",
    "justify-content:space-between",
    "align-items:flex-start",
    "font-family:system-ui,-apple-system,sans-serif",
    "width:100%",
    "box-sizing:border-box",
    "margin-bottom:0",
  ].join(";");

  const lines: string[] = [];
  if (profile.name)    lines.push(`<strong style="color:white;font-size:14px;">${profile.name}</strong>`);
  if (profile.company) lines.push(`<span>${profile.company}</span>`);
  if (profile.email)   lines.push(`<span>${profile.email}</span>`);
  if (profile.phone)   lines.push(`<span>${profile.phone}</span>`);
  lines.push(`<span style="color:#94a3b8;font-size:11px;">Erstellt: ${new Date().toLocaleDateString("de-DE")}</span>`);

  el.innerHTML = `
    <div>
      <div style="font-size:20px;font-weight:700;margin-bottom:4px;">RentenCheck</div>
      <div style="font-size:13px;color:#94a3b8;">${title}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#cbd5e1;line-height:1.8;">
      ${lines.join("<br>")}
    </div>
  `;
  return el;
}

function buildDisclaimer(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "background:#f1f5f9",
    "border-top:1px solid #cbd5e1",
    "padding:14px 28px",
    "font-family:system-ui,-apple-system,sans-serif",
    "font-size:10px",
    "color:#64748b",
    "line-height:1.6",
    "width:100%",
    "box-sizing:border-box",
  ].join(";");

  el.innerHTML = `
    <div style="font-weight:600;color:#475569;margin-bottom:4px;">Rechtlicher Hinweis / Disclaimer</div>
    <div>
      Alle Berechnungen, Szenarien und Darstellungen in diesem Dokument sind rein informativ und unverbindlich.
      Sie basieren auf den eingegebenen Annahmen sowie vereinfachten Modellen und stellen keine Anlageberatung,
      Vermögensberatung oder rechtliche bzw. steuerliche Beratung dar.
      Vergangene und simulierte Wertentwicklungen sind kein verlässlicher Indikator für künftige Ergebnisse.
      Tatsächliche Renditen, Kosten und steuerliche Auswirkungen können erheblich von den dargestellten Werten abweichen.
      Für eine individuelle Beratung wenden Sie sich bitte an einen zugelassenen Finanz- oder Steuerberater.
    </div>
  `;
  return el;
}

type SavedStyle = {
  el: HTMLElement;
  overflow: string;
  overflowY: string;
  height: string;
  maxHeight: string;
};

/**
 * Exportiert nur die gewählten Sektionen (data-pdf-section="id") als PDF.
 * Elemente mit data-pdf-hide werden während des Captures ausgeblendet.
 */
export async function exportSections(
  contentId: string,
  selectedSectionIds: string[],
  filename: string,
  title: string
): Promise<void> {
  const source = document.getElementById(contentId);
  if (!source) {
    alert(`Element #${contentId} nicht gefunden`);
    return;
  }

  const profile    = await UserProfile.load();
  const header     = buildProfileHeader(profile, title);
  const disclaimer = buildDisclaimer();

  // Alle Sektionen: ausgewählte zeigen, nicht-ausgewählte verstecken
  const allSections = Array.from(
    source.querySelectorAll<HTMLElement>("[data-pdf-section]")
  );
  // Originalzustand merken (manche Sektionen sind standardmäßig display:none)
  const savedSectionDisplays = allSections.map((el) => el.style.display);
  const hiddenSections = allSections.filter(
    (el) => !selectedSectionIds.includes(el.dataset.pdfSection!)
  );
  const shownSections = allSections.filter(
    (el) => selectedSectionIds.includes(el.dataset.pdfSection!)
  );
  shownSections.forEach((el) => (el.style.display = ""));
  hiddenSections.forEach((el) => (el.style.display = "none"));

  // Buttons/Navigation ausblenden
  const hiddenEls = Array.from(
    source.querySelectorAll<HTMLElement>("[data-pdf-hide]")
  );
  hiddenEls.forEach((el) => (el.style.display = "none"));

  // Grid-Layout des Elterncontainers korrigieren, wenn data-pdf-hide-Elemente ausgeblendet werden.
  // Ohne Fix: results-Div landet in Spalte 1 (z.B. 360px) statt in der vollen Breite.
  type GridFix = { el: HTMLElement; gridTemplateColumns: string };
  const fixedGridLayouts: GridFix[] = [];
  const processedGridParents = new Set<HTMLElement>();
  hiddenEls.forEach((el) => {
    const parent = el.parentElement;
    if (parent && !processedGridParents.has(parent)) {
      processedGridParents.add(parent);
      const cs = window.getComputedStyle(parent);
      if (cs.display === "grid" || cs.display === "inline-grid") {
        fixedGridLayouts.push({ el: parent, gridTemplateColumns: parent.style.gridTemplateColumns });
        parent.style.gridTemplateColumns = "1fr";
      }
    }
  });

  // Innere max-height-Constraints entfernen (z.B. Tabelle mit max-h-96)
  // Nur maxHeight anfassen – overflow-y nicht ändern, da sonst overflow-x freigesetzt wird
  type ScrollFix = { el: HTMLElement; maxHeight: string };
  const fixedScrollEls: ScrollFix[] = [];
  Array.from(source.querySelectorAll<HTMLElement>("*")).forEach((el) => {
    const cs = window.getComputedStyle(el);
    const mh = parseFloat(cs.maxHeight);
    if (!isNaN(mh) && isFinite(mh)) {
      fixedScrollEls.push({ el, maxHeight: el.style.maxHeight });
      el.style.maxHeight = "none";
    }
  });

  // Grids mit data-pdf-single-col einspaltig machen (z.B. Chart+Tabelle stapeln)
  // → Tabelle bekommt volle Breite, kein horizontaler Überlauf
  type SingleColFix = { el: HTMLElement; gridTemplateColumns: string };
  const fixedSingleColLayouts: SingleColFix[] = [];
  Array.from(source.querySelectorAll<HTMLElement>("[data-pdf-single-col]")).forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (cs.display === "grid" || cs.display === "inline-grid") {
      fixedSingleColLayouts.push({ el, gridTemplateColumns: el.style.gridTemplateColumns });
      el.style.gridTemplateColumns = "1fr";
    }
  });

  // Overflow-Constraints der Eltern temporär entfernen
  const saved: SavedStyle[] = [];
  let node: HTMLElement | null = source.parentElement;
  while (node && node !== document.documentElement) {
    const cs = window.getComputedStyle(node);
    if (
      cs.overflow  !== "visible" ||
      cs.overflowY !== "visible" ||
      cs.height    !== "auto"    ||
      cs.maxHeight !== "none"
    ) {
      saved.push({
        el:        node,
        overflow:  node.style.overflow,
        overflowY: node.style.overflowY,
        height:    node.style.height,
        maxHeight: node.style.maxHeight,
      });
      node.style.overflow  = "visible";
      node.style.overflowY = "visible";
      node.style.height    = "auto";
      node.style.maxHeight = "none";
    }
    node = node.parentElement;
  }

  // Profil-Header oben, Disclaimer unten einfügen
  source.insertBefore(header, source.firstChild);
  source.appendChild(disclaimer);

  // Warten bis Browser neu layoutet und Recharts ResizeObserver gefeuert hat
  await new Promise<void>((r) => setTimeout(r, 150));

  const captureW = Math.max(source.offsetWidth, source.scrollWidth);
  const captureH = source.scrollHeight;

  try {
    const captureTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Zeitüberschreitung beim Erfassen des Inhalts (15s)")), 15000)
    );

    const dataUrl = await Promise.race([
      toJpeg(source, {
        quality:         0.93,
        pixelRatio:      1.5,
        backgroundColor: "#f8fafc",
        width:           captureW,
        height:          captureH,
        // Schriften sind im Live-DOM bereits geladen; das erneute Nachladen
        // per fetch() schlägt in vielen Firmennetzwerken (Proxy/Security-Software)
        // mit ERR_BLOCKED_BY_CLIENT fehl und lässt den Export sonst lautlos hängen.
        skipFonts:       true,
      }),
      captureTimeout,
    ]);

    // Bild-Abmessungen für PDF berechnen
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload  = () => res();
      img.onerror = rej;
      img.src = dataUrl;
    });

    // Einzelne Seite in Inhalts-Höhe → kein Seitenumbruch
    const pdfW      = 210; // A4 Breite in mm
    const ratio     = pdfW / img.width;
    const imgTotalH = img.height * ratio;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit:        "mm",
      format:      [pdfW, imgTotalH],
    });

    pdf.addImage(dataUrl, "JPEG", 0, 0, pdfW, imgTotalH);
    pdf.save(`${filename}.pdf`);
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[exportPDF]", err);
    alert(`PDF-Export fehlgeschlagen:\n\n${msg}`);
  } finally {
    // Alles wiederherstellen
    source.removeChild(header);
    source.removeChild(disclaimer);
    allSections.forEach((el, i) => (el.style.display = savedSectionDisplays[i]));
    hiddenEls.forEach((el) => (el.style.display = ""));
    for (const s of fixedGridLayouts) {
      s.el.style.gridTemplateColumns = s.gridTemplateColumns;
    }
    for (const s of fixedScrollEls) {
      s.el.style.maxHeight = s.maxHeight;
    }
    for (const s of fixedSingleColLayouts) {
      s.el.style.gridTemplateColumns = s.gridTemplateColumns;
    }
    for (const s of saved) {
      s.el.style.overflow  = s.overflow;
      s.el.style.overflowY = s.overflowY;
      s.el.style.height    = s.height;
      s.el.style.maxHeight = s.maxHeight;
    }
  }
}
