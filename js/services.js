(() => {
  const track = (window.NP && window.NP.track) ? window.NP.track : (() => {});
// Services: quick selector (services.html)
  // =========================
  (() => {
    const rootSel = document.querySelector('[data-selector="services"]');
    if (!rootSel) return;

    const result = document.getElementById("selectorResult");
    const title = document.getElementById("selectorTitle");
    const text = document.getElementById("selectorText");
    const bullets = document.getElementById("selectorBullets");
    const toPricing = result ? result.querySelector('a[data-track="selector_to_pricing"]') : null;
    const scrollBtn = result ? result.querySelector('[data-selector-scroll]') : null;

    const svcCards = Array.from(document.querySelectorAll('.service-card[data-svc]'));
    const options = Array.from(rootSel.querySelectorAll('[data-selector-pick]'));

    const MAP = {
      packaging: {
        pkg: "start",
        title: "Чаще всего нужен пакет «Старт» + контент‑упаковка",
        text: "Сначала делаем карточку «понятно за 10 секунд»: услуги/цены/витрина/фото. Потом уже имеет смысл усиливать рекламой.",
        svcs: ["content"],
        bullets: [
          "Формат: «Старт» — быстро доводим карточку до «понятно и безопасно»",
          "Услуги: контент‑упаковка (фото/видео/витрина/описание)",
          "Следующий шаг: бесплатный разбор → дам 3–5 точек роста"
        ]
      },
      reputation: {
        pkg: "growth",
        title: "Чаще всего нужен «Рост» — чтобы закрыть доверие и не терять на негативе",
        text: "Когда рядом конкуренты выглядят надёжнее, выигрывает не «лучший», а «понятный и безопасный». Тут важны отзывы + ответы по регламенту.",
        svcs: ["reviews", "replies", "dispute"],
        bullets: [
          "Формат: «Рост» — регулярный контроль + регламент + отчётность",
          "Услуги: система отзывов + ответы 24–48ч + оспаривание фейков (если есть)",
          "Следующий шаг: бесплатный разбор → покажу, где именно вы теряете выбор"
        ]
      },
      ads: {
        pkg: "growth",
        title: "Чаще всего нужен «Рост» — реклама по районам с контролем обращений",
        text: "Если нужен быстрый поток, важно резать географию и считать не клики, а обращения (звонки/сообщения/маршруты).",
        svcs: ["ads"],
        bullets: [
          "Формат: «Рост» — реклама + контроль метрик, чтобы не сливать бюджет",
          "Услуги: геореклама по районам/радиусам (по спросу)",
          "Следующий шаг: бесплатный разбор → предложу самый короткий путь без лишних «допов»"
        ]
      },
      scale: {
        pkg: "growth",
        title: "Чаще всего нужен «Рост» + второй канал (2ГИС/Google) и контент",
        text: "Чтобы расти стабильно, делаем запас по каналам и усиливаем упаковку: тогда реклама окупается лучше.",
        svcs: ["ads", "platforms", "content"],
        bullets: [
          "Формат: «Рост» — регулярная работа + реклама + отчётность",
          "Услуги: второй канал (2ГИС/Google) + контент‑упаковка",
          "Следующий шаг: бесплатный разбор → скажу, что подключать первым"
        ]
      }
    };

    function clearHighlights() {
      svcCards.forEach(c => c.classList.remove("is-recommended"));
    }

    function render(key) {
      const cfg = MAP[key];
      if (!cfg || !result) return;

      options.forEach(b => b.classList.toggle("is-active", (b.getAttribute("data-selector-pick") || "") === key));

      clearHighlights();
      svcCards.forEach(c => {
        const tag = c.getAttribute("data-svc") || "";
        if (cfg.svcs.includes(tag)) c.classList.add("is-recommended");
      });

      if (title) title.textContent = cfg.title;
      if (text) text.textContent = cfg.text;

      if (bullets) {
        bullets.innerHTML = "";
        cfg.bullets.forEach(t => {
          const li = document.createElement("li");
          li.textContent = t;
          bullets.appendChild(li);
        });
      }

      if (toPricing) {
        toPricing.href = `index.html?pick=${encodeURIComponent(cfg.pkg)}#pricing`;
      }

      result.hidden = false;

      track("selector_pick", { pick: key, pkg: cfg.pkg });

      // мягко подводим к результату (не обязательно прыгать к услугам)
      try { result.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
    }

    options.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-selector-pick");
        if (key) render(key);
      });
    });

    if (scrollBtn) {
      scrollBtn.addEventListener("click", () => {
        const services = document.getElementById("servicesList") || document.getElementById("services");
        if (services) {
          track("selector_scroll_services", {});
          try { services.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
        }
      });
    }
  })();

  // =========================
  
})();
