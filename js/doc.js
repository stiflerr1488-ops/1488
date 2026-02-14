(() => {
  const track = (window.NP && window.NP.track) ? window.NP.track : (() => {});
// v9 — Doc mode (internal pages): TL;DR + progressive disclosure
  // =========================
  (() => {
    // Run only on subpages (not the chat landing)
    if (document.getElementById("chatApp")) return;

    const file = (() => {
      const p = (location.pathname || "").split("/").filter(Boolean).pop();
      return p && p.includes(".") ? p : "index.html";
    })();

    const skip = new Set(["index.html", "404.html", "offline.html", "thanks.html", "privacy.html", "offer.html"]);
    if (skip.has(file)) return;

    document.body.classList.add("doc-page");

    const main = document.getElementById("main-content");
    if (!main) return;

    const hero = main.querySelector("section.hero");
    if (!hero) return;

    const esc = (s) => String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const heroMini = hero.querySelectorAll(".hero-mini li");
    let tldr = Array.from(heroMini)
      .slice(0, 3)
      .map(li => (li.textContent || "").trim())
      .filter(Boolean);

    // Fallback: meta description (not visible in hero, avoids duplicating lead)
    if (!tldr.length) {
      try {
        const meta = document.querySelector('meta[name="description"]');
        const d = meta ? (meta.getAttribute("content") || "").trim() : "";
        if (d) {
          const short = d.length <= 140 ? d : (d.slice(0, 137).replace(/\s+\S*$/, "") + "…");
          tldr = [short];
        }
      } catch (_) {}
    }


const pageLinks = hero.querySelector(".page-links");
    const isSelfHref = (href) => {
      try {
        const clean = String(href || "").trim();
        if (!clean) return false;
        if (clean.startsWith("#")) return false;
        const fileHref = clean.split("#")[0].replace(/^\.\//, "");
        return fileHref === file;
      } catch (_) { return false; }
    };

    const links = pageLinks
      ? Array.from(pageLinks.querySelectorAll("a"))
          .slice(0, 10)
          .map(a => ({
            href: a.getAttribute("href") || "",
            text: (a.textContent || "").trim(),
          }))
          .filter(it => it.href && it.text && !isSelfHref(it.href))
      : [];

    const moreLinks = (() => {
      const arr = [];
      if (file !== 'pricing.html') arr.push({ href: 'pricing.html', text: 'Форматы' });
      arr.push({ href: 'pricing.html#process', text: 'Как работаем' });
      arr.push({ href: 'pricing.html#amplifiers', text: 'Усиления' });
      return arr;
    })();

// Optional short hint from hero (will appear under TL;DR)
const hint = (() => {
  try {
    const hints = Array.from(hero.querySelectorAll('.hero-head p.muted'))
      .filter(p => !(p.classList && (p.classList.contains('hero-kicker') || p.classList.contains('kicker'))))
      .map(p => (p.textContent || '').trim())
      .filter(Boolean);
    if (!hints.length) return '';
    const h = hints[hints.length - 1];
    if (!h) return '';
    if (h.length <= 140) return h;
    // Trim to last full word and add ellipsis
    return (h.slice(0, 137).replace(/\s+\S*$/, '') + '…').trim();
  } catch (_) {
    return '';
  }
})();
    const secondary = (() => {
      if (file === "pricing.html") return { href: "result.html#report", text: "Пример отчёта", track: "doc_to_report" };
      if (file === "result.html")  return { href: "pricing.html", text: "Форматы", track: "doc_to_pricing" };
      return { href: "pricing.html", text: "Форматы", track: "doc_to_pricing" };
    })();
    const intro = document.createElement("section");
    intro.className = "section doc-intro";
    intro.id = "tldr";

    intro.innerHTML = `
      <div class="container">
        <div class="doc-intro-card">
          <div class="doc-intro-top">
            <div class="doc-intro-title">
              <p class="kicker">Коротко</p>
              <h2 class="doc-h2">Что важно на этой странице</h2>
            </div>
            <div class="doc-actions">
              <a class="btn btn-primary" data-track="cta_doc_top" href="#cta">Бесплатный разбор</a>
              <a class="btn btn-outline" data-track="${secondary.track}" href="${esc(secondary.href)}">${esc(secondary.text)}</a>
            </div>
          </div>
          ${tldr.length ? `<ul class="doc-tldr">${tldr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          ${hint ? `<p class="doc-hint muted">${esc(hint)}</p>` : ""}
          <div class="doc-row doc-controls">
            <button class="btn btn-ghost doc-toggle-all" type="button" aria-expanded="true">Показать подробности</button>
          </div>
        </div>
      </div>
    `;

    hero.insertAdjacentElement("afterend", intro);
    // Hide duplicate hero bits for calmer first screen

    // If hero has CTA to free audit, hide it (doc block already has CTA)
    try {
      const heroCtas = Array.from(hero.querySelectorAll(".hero-actions a"))
        .filter(a => {
          const href = (a.getAttribute("href") || "").trim();
          const txt = (a.textContent || "").toLowerCase();
          return href === "#cta" || txt.includes("бесплат") || txt.includes("разбор") || txt.includes("получить разбор");
        });
      heroCtas.forEach(a => a.classList.add("is-doc-hidden"));
    } catch (_) {}


    const hm = hero.querySelector(".hero-mini");
    if (hm) hm.classList.add("is-doc-hidden");
    if (pageLinks) pageLinks.classList.add("is-doc-hidden");

    // Hide long hero copy on doc pages (TL;DR block replaces it)
    hero.querySelectorAll(".hero-head .lead, .hero-head .hero-format, .hero-head .hero-note, .hero-head p.muted")
      .forEach(el => el.classList.add("is-doc-hidden"));


    // Progressive disclosure: wrap sections into <details>
    const skipSectionIds = new Set(["hero", "cta", "tldr"]);

    const sections = Array.from(main.querySelectorAll(":scope > section.section"))
      .filter(sec => !skipSectionIds.has(sec.id || "") && !sec.classList.contains("doc-intro"));

    let foldedCount = 0;

    sections.forEach(sec => {
      if (sec.querySelector("details.faq-item")) return; // FAQ already has its own accordions

      const container = sec.querySelector(":scope > .container");
      if (!container) return;

      // Find title + optional desc
      const head = sec.querySelector(":scope .section-head");
      const titleEl = head ? head.querySelector("h2") : sec.querySelector("h2");
      if (!titleEl) return;

      const title = (titleEl.textContent || "").trim();
      if (!title) return;

      const descEl = head ? head.querySelector("p") : null;
      const desc = descEl ? (descEl.textContent || "").trim() : "";

      // Remove heading block from the flow (we'll show it in summary)
      if (head) {
        head.remove();
      } else {
        try { titleEl.remove(); } catch (_) {}
      }

      const details = document.createElement("details");
      details.className = "doc-details";
      details.dataset.doc = "1";
      if (foldedCount === 0) details.open = true;

      const summary = document.createElement("summary");
      summary.innerHTML = `
        <span class="doc-summary__title">${esc(title)}</span>
        ${desc ? `<span class="doc-summary__desc">${esc(desc)}</span>` : ""}
      `;
      details.appendChild(summary);

      const body = document.createElement("div");
      body.className = "doc-details__body";

      // Move all existing nodes from container into body
      Array.from(container.childNodes).forEach(n => body.appendChild(n));

      details.appendChild(body);
      container.appendChild(details);

      foldedCount++;
    });

    const allDetails = Array.from(main.querySelectorAll("details.doc-details"));
    const toggleAllBtn = intro.querySelector(".doc-toggle-all");

    const syncToggleLabel = () => {
      if (!toggleAllBtn) return;
      const allOpen = allDetails.length ? allDetails.every(d => d.open) : false;
      toggleAllBtn.setAttribute("aria-expanded", allOpen ? "true" : "false");
      toggleAllBtn.textContent = allOpen ? "Свернуть подробности" : "Показать подробности";
    };

    const setAll = (open) => {
      allDetails.forEach(d => { d.open = open; });
      if (toggleAllBtn) {
        toggleAllBtn.setAttribute("aria-expanded", open ? "true" : "false");
        toggleAllBtn.textContent = open ? "Свернуть подробности" : "Показать подробности";
      }
    };

    // Initial label sync (first section may be open by default)
    syncToggleLabel();


    if (toggleAllBtn && allDetails.length) {
      toggleAllBtn.addEventListener("click", () => {
        const allOpen = allDetails.every(d => d.open);
        setAll(!allOpen);
        track("doc_toggle_all", { state: !allOpen ? "open" : "closed" });
      });
    } else if (toggleAllBtn) {
      toggleAllBtn.disabled = true;
      toggleAllBtn.textContent = "Подробностей нет";
    }

    const openByHash = () => {
      const id = (location.hash || "").replace("#", "").trim();
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const det = target.querySelector("details.doc-details");
      if (det) det.open = true;
    };

    // Open section when navigating by hash
    openByHash();
    window.addEventListener("hashchange", openByHash);

    // Open target when clicking internal anchors
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const id = href.replace("#", "").trim();
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const det = target.querySelector("details.doc-details");
      if (det) det.open = true;
    }, { passive: true });

  })();


  
})();
