(() => {
  "use strict";

  const ASSET_VER = "111";
  const ASSET_Q = "?v=" + ASSET_VER;

  // =========================
  // Anti-flicker: show the page only after:
  // 1) DOM is parsed (so doc.js can enhance content), and
  // 2) fonts are ready (to avoid "bold → normal" swaps),
  // with a short hard fallback so we never "blank-screen" too long.
  // =========================
  (() => {
    const root = document.documentElement;
    const done = () => {
      root.classList.remove("is-loading");
      const loader = document.getElementById("appLoader");
      if (loader) {
        const kill = () => loader.remove();
        loader.addEventListener("transitionend", kill, { once: true });
        setTimeout(kill, 500);
      }
    };

    const domReady = new Promise((res) => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => res(), { once: true });
      } else {
        res();
      }
    });

    const fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready.catch(() => {})
      : new Promise((res) => window.addEventListener("load", () => res(), { once: true }));

    const fallback = setTimeout(done, 650);

    Promise.all([domReady, fontsReady]).then(() => {
      clearTimeout(fallback);
      requestAnimationFrame(done);
    });
  })();

  // Namespace
  window.NP = window.NP || {};

  // =========================
  // Performance: disable heavy "glass" effects during scroll to avoid jank
  // (keeps the look at rest)
  // =========================
  (() => {
    let t = 0;
    const root = document.documentElement;
    const onScroll = () => {
      root.classList.add("is-scrolling");
      clearTimeout(t);
      t = setTimeout(() => root.classList.remove("is-scrolling"), 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  // =========================
  // Analytics wrapper (Yandex Metrika)
  // =========================
  const YM_ID = () => (window.YM_ID || 106357495);
  const track = (name, params={}) => {
    try {
      if (typeof window.ym === "function") {
        window.ym(YM_ID(), "reachGoal", name, params);
      }
    } catch (_) {}
  };
  window.NP.track = track;

  // =========================
  // Hero CTA A/B (copy test)
  // =========================
  (() => {
    const page = (location.pathname || "").split("/").filter(Boolean).pop() || "index.html";
    if (page !== "index.html") return;

    const btn = document.querySelector('#hero .hero-form button[type="submit"][data-cta-a][data-cta-b]');
    if (!btn) return;

    const key = "np_hero_cta_variant";
    let variant = "A";
    let source = "default";
    try {
      const sp = new URLSearchParams(location.search || "");
      const forced = (sp.get("ab_hero") || "").trim().toLowerCase();
      if (forced === "a" || forced === "b") {
        variant = forced.toUpperCase();
        source = "query";
        localStorage.setItem(key, variant);
      } else {
        const saved = localStorage.getItem(key);
        if (saved === "A" || saved === "B") {
          variant = saved;
          source = "storage";
        } else {
          variant = Math.random() < 0.5 ? "A" : "B";
          source = "random";
          localStorage.setItem(key, variant);
        }
      }
    } catch (_) {}

    const label = (variant === "B" ? (btn.getAttribute("data-cta-b") || "") : (btn.getAttribute("data-cta-a") || "")).trim();
    if (label) btn.textContent = label;

    const baseTrack = (btn.dataset && btn.dataset.track) ? String(btn.dataset.track) : "tg_submit_hero";
    btn.dataset.track = `${baseTrack}_${variant.toLowerCase()}`;

    window.NP.heroCtaVariant = variant;
    track("hero_cta_variant", { variant, source });
  })();

  // =========================
  // Helpers
  // =========================
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const getUTM = () => {
    const out = {};
    try {
      const sp = new URLSearchParams(location.search || "");
      ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach((k) => {
        const v = sp.get(k);
        if (v) out[k] = v;
      });
    } catch (_) {}
    return out;
  };

  const pageLabel = () => {
    try {
      return (document.body && document.body.getAttribute("data-page"))
        || (document.title ? String(document.title).trim() : "")
        || (location.pathname ? String(location.pathname).replace(/^\//, "") : "");
    } catch (_) {
      return "";
    }
  };

  const formPlacement = (form) => {
    try {
      return (form && form.dataset && form.dataset.placement)
        || (form && form.getAttribute && form.getAttribute("data-placement"))
        || (form && form.getAttribute && form.getAttribute("data-form"))
        || (form && form.id === "tgForm" ? "cta" : "")
        || (form && form.classList && form.classList.contains("hero-form") ? "hero" : "")
        || (form && form.classList && form.classList.contains("chat-form") ? "chat" : "")
        || "site";
    } catch (_) {
      return "site";
    }
  };

  const showStatus = (form, msg, ok=true) => {
    const el = qs(".form-status", form) || qs(".form-status", form.parentElement || document);
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-ok", !!ok);
    el.classList.toggle("is-bad", !ok);
  };

  const serializeLead = (form, extra={}) => {
    const fd = new FormData(form);
    const data = {};
    for (const [k,v] of fd.entries()) {
      // checkbox -> "on" / value
      data[k] = typeof v === "string" ? v.trim() : v;
    }
    // normalize checkbox
    try {
      if (qs('input[name="allow_tg"]', form)) {
        data.allow_tg = qs('input[name="allow_tg"]', form).checked ? "1" : "0";
      }
    } catch (_) {}

    // placement (button wins)
    let placement = "";
    try {
      const active = document.activeElement;
      if (active && active.dataset && active.dataset.placement) placement = active.dataset.placement;
    } catch (_) {}
    if (!placement) {
      try {
        placement = form.getAttribute("data-placement") || form.dataset.placement || form.getAttribute("data-form") || "";
      } catch (_) {}
    }

    data.placement = placement || "site";
    data.page = (location.pathname || "").split("/").pop() || "index.html";
    data.from = pageLabel();
    data.ts = new Date().toISOString();
    data.utm = getUTM();
    try {
      const v = (window.NP && window.NP.heroCtaVariant) ? String(window.NP.heroCtaVariant).toUpperCase() : "";
      if (v === "A" || v === "B") data.ab_hero = v;
    } catch (_) {}

    // apply extras (e.g., mode)
    Object.assign(data, extra || {});
    return data;
  };

  const leadToText = (lead) => {
    const lines = [];
    lines.push("Заявка NP.Maps");
    if (lead.page) lines.push("Страница: " + lead.page);
    if (lead.card) lines.push("Карточка: " + lead.card);
    if (lead.pain) lines.push("Задача: " + lead.pain);
    if (lead.recommendation) lines.push("Рекомендация: " + lead.recommendation);
    if (lead.city) lines.push("Город: " + lead.city);
    if (lead.points) lines.push("Точек: " + lead.points);
    if (lead.comment) lines.push("Комментарий: " + lead.comment);
    if (lead.name) lines.push("Имя: " + lead.name);
    if (lead.contact) lines.push("Контакт: " + lead.contact);
    if (lead.ab_hero) lines.push("Вариант hero CTA: " + lead.ab_hero);
    return lines.join("\n");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return !!ok;
      } catch (_) {
        return false;
      }
    }
  };

  const leadEndpoint = () => {
    const meta = qs('meta[name="np-lead-endpoint"]');
    return meta ? meta.getAttribute("content") : "api/lead.php";
  };

  const postLead = async (lead) => {
    const res = await fetch(leadEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      keepalive: true
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok && data && data.ok, status: res.status, data };
  };

  const ensureTgFallback = (form, lead) => {
    if (!form || !lead) return null;
    let link = qs('[data-fallback-tg]', form);
    if (!link) {
      link = document.createElement('a');
      link.className = 'btn btn-outline btn-block form-fallback-link';
      link.setAttribute('data-fallback-tg', '1');
      link.setAttribute('data-track', 'lead_fallback_tg');
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.textContent = 'Открыть Telegram с заявкой';
      const status = qs('.form-status', form);
      if (status && status.parentElement) status.insertAdjacentElement('afterend', link);
      else form.appendChild(link);
      link.addEventListener('click', () => {
        track('lead_fallback_click', { placement: formPlacement(form), page: location.pathname || '' });
      });
    }
    try {
      link.href = 'https://t.me/np_maps?text=' + encodeURIComponent(leadToText(lead));
      link.hidden = false;
    } catch (_) {}
    return link;
  };

  const hideTgFallback = (form) => {
    const link = qs('[data-fallback-tg]', form);
    if (!link) return;
    try { link.hidden = true; } catch (_) {}
  };

  // =========================
  // Theme toggle (if button exists)
  // =========================
  (() => {
    const KEY = "npmaps_theme";
    const btn = qs("[data-theme-toggle], #themeToggle");
    if (!btn) return;

    const apply = (t) => {
      try {
        document.documentElement.dataset.theme = t;
        localStorage.setItem(KEY, t);
      } catch (_) {}
    };

    btn.addEventListener("click", () => {
      const cur = (document.documentElement.dataset.theme || "dark");
      const next = cur === "dark" ? "light" : "dark";
      apply(next);
      track("theme_toggle", { theme: next });
    });
  })();


  // =========================
  // Conditional contact field (conversion friction reducer)
  // 
  // Pattern supported:
  // - input[name="contact"]
  // - input[name="allow_tg"] (checkbox)
  // 
  // Behavior:
  // - allow_tg checked  -> contact is optional + hidden (less noise)
  // - allow_tg unchecked -> contact is required + visible
  // =========================
  const wireConditionalContact = (form) => {
    const allow = qs('input[name="allow_tg"]', form);
    const contact = qs('input[name="contact"]', form);
    if (!allow || !contact) return;

    // Wrapper: ONLY hide a dedicated wrapper (label/field). Never hide a whole form section.
    const wrap = contact.closest('label') || contact.closest('.field') || contact.closest('[data-contact-wrap]');
    if (!wrap) return;

    const apply = () => {
      const tgOk = !!allow.checked;
      // If Telegram is ok -> hide contact block
      try { wrap.hidden = tgOk; } catch (_) {}
      try { contact.required = !tgOk; } catch (_) {}

      // Helpful microcopy (optional)
      const hint = qs('[data-contact-hint]', form);
      if (hint) {
        hint.textContent = tgOk
          ? "По умолчанию отвечаю в Telegram."
          : "Telegram отключён — укажите телефон или email для ответа.";
      }

      // Update label text if it exists
      const labelText = wrap.querySelector('span');
      if (labelText) {
        labelText.textContent = tgOk ? "Телефон или email (если без Telegram)" : "Телефон или email (обязательно без Telegram)";
      }
    };

    allow.addEventListener('change', () => {
      apply();
      if (!allow.checked) {
        try { contact.focus(); } catch (_) {}
      }
    });

    apply();
  };


  // =========================
  // Nav toggle (mobile)
  // =========================
  (() => {
    const btn = qs("#navToggle");
    const nav = qs("#siteNav");
    const backdrop = qs("#navBackdrop");

    if (!btn || !nav || !backdrop) return;

    const isOpen = () => document.body.classList.contains("nav-open");

    const open = () => {
      document.body.classList.add("nav-open");
      btn.setAttribute("aria-expanded", "true");
      backdrop.hidden = false;
      track("nav_open", { page: (location.pathname || "").split("/").pop() || "" });
    };

    const close = () => {
      document.body.classList.remove("nav-open");
      btn.setAttribute("aria-expanded", "false");
      backdrop.hidden = true;
    };

    btn.addEventListener("click", () => (isOpen() ? close() : open()));
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
    });

    // Close on navigation click (mobile)
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (isOpen()) close();
    });

    // Highlight current page
    try {
      const file = (() => {
        const p = (location.pathname || "").split("/").filter(Boolean).pop();
        return p && p.includes(".") ? p : "index.html";
      })();
      qsa("#siteNav a").forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (href === file || (file === "index.html" && href === "index.html")) {
          a.setAttribute("aria-current", "page");
        }
      });
    } catch (_) {}
  })();

  // =========================
  // Copy any [data-copy]
  // =========================
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-copy]");
    if (!el) return;
    const txt = (el.getAttribute("data-copy") || "").trim();
    if (!txt) return;
    e.preventDefault();
    const ok = await copyText(txt);
    track("copy", { ok: ok ? 1 : 0 });
  });

  // =========================
  // Dock behavior
  // =========================
  (() => {
    const dock = qs("#ctaDock");
    if (!dock) return;

    const form = qs("form", dock);
    const modes = qsa(".dock-mode", dock);
    const btnSend = qs('[data-dock-action="tg"]', dock);
    const btnCall = qs('[data-dock-action="call"]', dock);
    const btnCopy = qs('[data-dock-action="copy"]', dock);
    const input = qs('input[name="card"]', dock);
    const hasModeSwitch = modes.length > 0 && (btnCall || btnCopy);
    let currentMode = "";

    const setMode = (mode) => {
      modes.forEach(b => b.classList.toggle("is-active", b.dataset.dockMode === mode));
      if (btnSend) btnSend.hidden = mode !== "tg";
      if (btnCall) btnCall.hidden = mode !== "call";
      if (btnCopy) btnCopy.hidden = mode !== "copy";
      try { dock.setAttribute("data-mode", mode); } catch (_) {}
      if (hasModeSwitch && currentMode !== mode) {
        currentMode = mode;
        track("dock_mode", { mode });
      }
    };

    modes.forEach((b) => {
      b.addEventListener("click", () => setMode(b.dataset.dockMode || "tg"));
    });

    // Accordion behaviour for details inside dock
    dock.addEventListener("toggle", (e) => {
      const d = e.target;
      if (!d || d.tagName !== "DETAILS") return;
      if (!d.open) return;
      try {
        qsa("details", dock).forEach(o => { if (o !== d) o.open = false; });
      } catch (_) {}
    }, true);

    // Copy lead from dock
    if (btnCopy && form) {
      btnCopy.addEventListener("click", async () => {
        const lead = serializeLead(form, { mode: "copy" });
        const ok = await copyText(leadToText(lead));
        showStatus(form, ok ? "Заявка скопирована. Вставьте в Telegram/чат." : "Не удалось скопировать. Скопируйте вручную.", ok);
        track("dock_copy", { ok: ok ? 1 : 0 });
      });
    }

    // Expose focus helper
    window.NP.focusDock = () => {
      try {
        if (input) input.focus({ preventScroll: true });
        dock.classList.add("is-ping");
        setTimeout(() => dock.classList.remove("is-ping"), 900);
      } catch (_) {}
    };

    if (hasModeSwitch) setMode("tg");
    else {
      if (btnSend) btnSend.hidden = false;
      try { dock.setAttribute("data-mode", "tg"); } catch (_) {}
    }
  })();

  // =========================
  // Pain chips: set pain + recommendation in nearest form
  // =========================
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".pain-chip");
    if (!chip) return;

    const isDesktop = window.matchMedia && window.matchMedia("(min-width: 981px)").matches;
    const isAnchor = chip.tagName === "A";
    const href = isAnchor ? (chip.getAttribute("href") || "") : "";
    const isHashLink = isAnchor && href.startsWith("#");

    // On mobile allow anchor navigation (scroll), on desktop keep focus/overlay behavior
    if (!(isHashLink && !isDesktop)) e.preventDefault();

    const scope = chip.closest("form") || document;
    const pain = qs('[name="pain"]', scope);
    const rec  = qs('[name="recommendation"]', scope);

    const painVal = (chip.getAttribute("data-pain") || "").trim();
    const recVal  = (chip.getAttribute("data-rec") || "").trim();

    if (pain) pain.value = painVal;
    if (rec)  rec.value  = recVal;

    try {
      const wrap = chip.closest(".dock-quiz") || scope;
      qsa(".pain-chip", wrap).forEach(btn => btn.classList.toggle("is-active", btn === chip));
    } catch (_) {}

    track("pain_pick", { pain: painVal, rec: recVal });
  });

  // =========================
  // Intercept "#cta" links on desktop: behave like "chat focus"
  // =========================
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#cta"]');
    if (!a) return;

    const isDesktop = window.matchMedia && window.matchMedia("(min-width: 981px)").matches;
    const dock = qs("#ctaDock");
    if (!dock || !isDesktop) return;

    e.preventDefault();
    try {
      if (window.NP.focusDock) window.NP.focusDock();
    } catch (_) {}
    track("cta_focus_dock", { from: a.dataset.track || "" });
  });

  // =========================
  // Minimal dock on legal/error pages (less noise)
  // =========================
  (() => {
    const file = (() => {
      const p = (location.pathname || "").split("/").filter(Boolean).pop();
      return p && p.includes(".") ? p : "index.html";
    })();
    const minimal = new Set(["privacy.html","offer.html","thanks.html","404.html","offline.html"]);
    if (!minimal.has(file)) return;
    const dock = qs("#ctaDock");
    if (!dock) return;
    qsa(".chat-mini-quiz, .dock-more", dock).forEach(el => { try { el.remove(); } catch (_) {} });
  })();


  // =========================
  // Forms: submit to api/lead.php
  // - supports both #tgForm and dock form
  // - buttons with [data-copy-lead] copy message instead of send
  // =========================
  (() => {
    const forms = qsa("form").filter(f => f.id === "tgForm" || f.classList.contains("chat-form") || f.classList.contains("cta-form") || f.classList.contains("hero-form"));
    if (!forms.length) return;
    // Honeypot field: bots tend to fill it, humans won't.
    // Server checks `_hp` and silently drops if it's not empty.
    forms.forEach((form) => {
      try {
        if (qs('input[name="_hp"]', form)) return;
        const hp = document.createElement("input");
        hp.type = "text";
        hp.name = "_hp";
        hp.className = "hp-field";
        hp.tabIndex = -1;
        hp.autocomplete = "off";
        hp.setAttribute("aria-hidden", "true");
        form.appendChild(hp);
      } catch (_) {}
    });



    // Copy lead buttons
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy-lead]");
      if (!btn) return;
      const form = btn.closest("form");
      if (!form) return;
      const lead = serializeLead(form, { mode: "copy" });
      const ok = await copyText(leadToText(lead));
      showStatus(form, ok ? "Скопировано. Вставьте в Telegram/чат." : "Не удалось скопировать. Скопируйте вручную.", ok);
      track(btn.dataset.track || "lead_copy", { ok: ok ? 1 : 0 });
    });

    const formStarted = new WeakSet();
    const formStartAt = new WeakMap();

    document.addEventListener("click", (e) => {
      const btn = e.target.closest('button[type="submit"], input[type="submit"]');
      if (!btn) return;
      const form = btn.form || btn.closest("form");
      if (!form) return;
      if (!forms.includes(form)) return;
      track("lead_submit_click", {
        placement: formPlacement(form),
        page: location.pathname || "",
        track: (btn.dataset && btn.dataset.track) || ""
      });
    });

    forms.forEach((form) => {
      // Reduce visible fields: hide contact unless Telegram is NOT ok
      try { wireConditionalContact(form); } catch (_) {}

      form.addEventListener("focusin", () => {
        if (formStarted.has(form)) return;
        formStarted.add(form);
        const ts = Date.now();
        formStartAt.set(form, ts);
        track("lead_form_start", { placement: formPlacement(form), page: location.pathname || "" });
      }, { once: true });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Basic validation
        const card = qs('input[name="card"]', form);
        if (card && !String(card.value || "").trim()) {
          showStatus(form, "Нужна ссылка на карточку или «название + адрес».", false);
          try { card.focus(); } catch (_) {}
          return;
        }

        // Let native constraint validation handle conditional required fields
        try {
          if (!form.checkValidity()) {
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid) {
              const key = firstInvalid.getAttribute('name') || firstInvalid.getAttribute('id') || firstInvalid.tagName.toLowerCase();
              track("lead_field_error", { placement: formPlacement(form), page: location.pathname || "", field: key });
            }
            form.reportValidity();
            showStatus(form, "Проверьте поля формы.", false);
            track("lead_invalid", { placement: formPlacement(form), page: location.pathname || "" });
            return;
          }
        } catch (_) {}

        showStatus(form, "Отправляю…", true);
        hideTgFallback(form);

        const lead = serializeLead(form, { mode: "send" });

        // mark source if button has data-track
        try {
          const active = document.activeElement;
          if (active && active.dataset && active.dataset.track) lead._track = active.dataset.track;
        } catch (_) {}

        try {
          const out = await postLead(lead);
          if (out.ok) {
            showStatus(form, "Готово. Открываю страницу подтверждения…", true);
            const startedAt = formStartAt.get(form) || 0;
            const duration = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
            track("lead_sent", { placement: lead.placement || "", page: lead.page || "", duration_ms: duration });
            setTimeout(() => {
              try { window.location.href = "thanks.html?sent=1"; } catch (_) {}
            }, 250);
          } else {
            const err = (out.data && out.data.error) ? String(out.data.error) : "send_failed";
            const copied = await copyText(leadToText(lead));
            ensureTgFallback(form, lead);
            showStatus(form, copied ? "Не отправилось. Заявка скопирована — откройте Telegram кнопкой ниже." : "Не отправилось. Откройте Telegram кнопкой ниже и отправьте заявку.", false);
            track("lead_error", { error: err, status: out.status || 0 });
            track("lead_fallback_ready", { placement: formPlacement(form), page: location.pathname || "", copied: copied ? 1 : 0 });
          }
        } catch (err) {
          const copied = await copyText(leadToText(lead));
          ensureTgFallback(form, lead);
          showStatus(form, copied ? "Не отправилось (сеть). Заявка скопирована — откройте Telegram кнопкой ниже." : "Не отправилось (сеть). Откройте Telegram кнопкой ниже и отправьте заявку.", false);
          track("lead_error", { error: "network" });
          track("lead_fallback_ready", { placement: formPlacement(form), page: location.pathname || "", copied: copied ? 1 : 0 });
        }
      });
    });
  })();

  
  // =========================
  // Home: Capabilities stepper (tabs)
  // =========================
  (() => {
    const steppers = document.querySelectorAll(".cap-stepper");
    if (!steppers.length) return;

    steppers.forEach((stepper) => {
      const steps = Array.from(stepper.querySelectorAll(".cap-step"));
      if (!steps.length) return;

      const getPanel = (btn) => {
        const id = btn.getAttribute("aria-controls");
        return id ? document.getElementById(id) : null;
      };

      const activate = (index, focus = false) => {
        steps.forEach((btn, i) => {
          const active = i === index;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-selected", active ? "true" : "false");
          const panel = getPanel(btn);
          if (panel) panel.classList.toggle("is-active", active);
          if (active && focus) btn.focus({ preventScroll: true });
        });
      };

      steps.forEach((btn, i) => {
        btn.addEventListener("click", () => activate(i));
      });

      // Keyboard: left/right/home/end
      stepper.addEventListener("keydown", (e) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(e.key)) return;

        const current = steps.findIndex((b) => b.classList.contains("is-active"));
        let next = current < 0 ? 0 : current;

        if (e.key === "ArrowLeft") next = Math.max(0, next - 1);
        if (e.key === "ArrowRight") next = Math.min(steps.length - 1, next + 1);
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = steps.length - 1;

        e.preventDefault();
        activate(next, true);
      });

      // Ensure first is active if none
      if (!steps.some((b) => b.classList.contains("is-active"))) activate(0);
    });
  })();
  // =========================
  // Performance: pre-decode images after load
  // Avoids the “stutter” when large images first appear during fast scroll.
  // Runs only when the browser is idle (requestIdleCallback), so it won't block input.
  // =========================
  (() => {
    const ric = window.requestIdleCallback || function(cb){ return setTimeout(() => cb({ timeRemaining: () => 0 }), 250); };
    const cancelRic = window.cancelIdleCallback || clearTimeout;

    window.addEventListener("load", () => {
      try {
        const imgs = Array.from(document.images || [])
          .filter(img => img && img.decode && (img.getAttribute("data-no-decode") !== "1"));

        if (!imgs.length) return;

        let i = 0;
        let id = 0;

        const step = () => {
          const start = performance.now();
          while (i < imgs.length && (performance.now() - start) < 8) {
            const img = imgs[i++];
            // Decode only if loaded; if not, wait for it
            if (!img.complete) continue;
            img.decode().catch(() => {});
          }
          if (i < imgs.length) id = ric(step, { timeout: 1500 });
        };

        id = ric(step, { timeout: 1500 });

        // Safety cleanup (page hide)
        window.addEventListener("pagehide", () => { try { cancelRic(id); } catch(_){} }, { once: true });
      } catch (_) {}
    }, { once: true });
  })();



  // =========================
  // Service Worker: register (network-first navigations already in sw.js)
  // =========================
  (() => {
    try {
      if (!("serviceWorker" in navigator)) return;
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js" + ASSET_Q).catch(() => {});
      }, { once: true });
    } catch (_) {}
  })();

})();
