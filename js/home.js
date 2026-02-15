(() => {
  const track = (window.NP && window.NP.track) ? window.NP.track : (() => {});
// Index: highlight picked package from ?pick= (services → tariffs)
  // =========================
  (() => {
    const isIndex = (
      location.pathname === "/" ||
      (location.pathname || "").endsWith("/index.html") ||
      (location.pathname || "").endsWith("index.html")
    );
    if (!isIndex) return;

    let pick = null;
    try {
      pick = new URLSearchParams(location.search || "").get("pick");
    } catch (e) {}

    if (!pick) return;

    const el = document.querySelector(`.format-card[data-package="${pick}"]`);
    if (!el) return;

    el.classList.add("is-picked");
    track("pricing_pick", { pick });

    // если попали по ссылке из услуг — подсветим и оставим пользователя на тарифах
    try {
      const sec = document.getElementById("pricing");
      if (sec && location.hash === "#pricing") {
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (e) {}
  })();

  // =========================

  // =========================
  

// v28 — Chat landing (index)
  // =========================
  (() => {
    const app = document.getElementById("chatApp");
    if (!app) return;

    const thread = document.getElementById("chatThread");
    if (!thread) return;

    const cta = document.getElementById("ctaDock");
    const ctaInput = cta ? cta.querySelector('input[name="card"]') : null;
    const ctaForm = cta ? cta.querySelector("form") : null;
    const ctaHint = cta ? cta.querySelector(".chat-compose__hint") : null;

    // v43: when the composer is fixed to the bottom, keep enough space for content.
    const setHomeCtaHeight = (() => {
      let raf = 0;
      const run = () => {
        try {
          if (!cta) return;
          const h = Math.ceil(cta.getBoundingClientRect().height || 0);
          if (h > 0) document.body.style.setProperty("--dock-h", `${h}px`);
        } catch (_) {}
      };
      return () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(run);
      };
    })();

    setHomeCtaHeight();
    window.addEventListener("resize", setHomeCtaHeight, { passive: true });
    // Recalc after mini-quiz expands/collapses
    try {
      cta.querySelectorAll("details").forEach(d => {
        d.addEventListener("toggle", () => setTimeout(setHomeCtaHeight, 30));
      });
    } catch (_) {}
    window.addEventListener("load", setHomeCtaHeight);

    // Topic context (helps: "меньше думать" + понятнее, что человек хотел)
    let currentTopicKey = "";
    let currentTopicLabel = "";

    // Mini-quiz state (chat-driven)
    const quizState = {
      points: "",
      goal: "",
      city: ""
    };

    const ensureHidden = (name) => {
      if (!ctaForm) return null;
      let el = ctaForm.querySelector(`input[name="${name}"]`);
      if (el) return el;
      el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      ctaForm.appendChild(el);
      return el;
    };

    const topicBadge = (() => {
      if (!ctaHint) return null;
      let b = ctaHint.querySelector('[data-chat-topic-badge]');
      if (b) return b;
      b = document.createElement('span');
      b.className = 'badge badge-topic';
      b.dataset.chatTopicBadge = '1';
      b.hidden = true;
      ctaHint.appendChild(b);
      return b;
    })();

    const setTopic = (key, label) => {
      currentTopicKey = key || "";
      currentTopicLabel = label || "";
      try { window.__NP_TOPIC_KEY = currentTopicKey; } catch (_) {}
      try { window.__NP_TOPIC_LABEL = currentTopicLabel; } catch (_) {}

      const t = ensureHidden("topic");
      if (t) t.value = currentTopicLabel;
      const k = ensureHidden("topic_key");
      if (k) k.value = currentTopicKey;

      if (topicBadge) {
        if (currentTopicLabel) {
          topicBadge.textContent = `Тема: ${currentTopicLabel}`;
          topicBadge.hidden = false;
        } else {
          topicBadge.hidden = true;
          topicBadge.textContent = "";
        }
      }
    };

    // Preserve "from" context if user came from a subpage (doc mode)
    (() => {
      try {
        const sp = new URLSearchParams(location.search || "");
        const from = sp.get("from");
        if (!from) return;
        const f = ensureHidden("from");
        if (f) f.value = String(from);
      } catch (_) {}
    })();

    const esc = (s) => String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const scrollToEnd = () => {
      try {
        const last = thread.lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (e) {}
    };

    const msg = (role, html) => {
      const wrap = document.createElement("div");
      wrap.className = `chat-msg ${role}`;
      wrap.innerHTML = `<div class="chat-bubble">${html}</div>`;
      thread.appendChild(wrap);
      scrollToEnd();
      return wrap;
    };

    const quickHtml = (items) => {
      return `
        <div class="chat-quick" role="list">
          ${items.map(it => `<button class="chat-chip" type="button" data-chat-pick="${esc(it.key)}">${esc(it.label)}</button>`).join("")}
        </div>
      `;
    };

    const focusCta = () => {
      if (!cta) return;
      // If the composer is fixed to the viewport bottom, scrollIntoView is unnecessary
      // and may create odd jumps on some browsers.
      try {
        const pos = (window.getComputedStyle && window.getComputedStyle(cta).position) || "";
        if (pos !== "fixed") {
          cta.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch (_) {}
      if (ctaInput) {
        try { ctaInput.focus({ preventScroll: true }); }
        catch (e) { try { ctaInput.focus(); } catch (_) {} }
      }
    };

    const TOPICS = {
      quiz: {
        label: "Рассчитать формат за 1 минуту (ответ до 24 часов)",
        html: `
          <p><strong>Ок — 3 коротких вопроса.</strong> Потом открою Telegram с готовым сообщением.</p>
          <div class="chat-quiz" data-quiz-block>
            <p class="muted">1/3 Сколько точек?</p>
            <div class="chat-quick" role="list">
              <button class="chat-chip" type="button" data-quiz-points="1 точка">1 точка</button>
              <button class="chat-chip" type="button" data-quiz-points="2–5 точек">2–5</button>
              <button class="chat-chip" type="button" data-quiz-points="6–15 точек">6–15</button>
              <button class="chat-chip" type="button" data-quiz-points="Сеть 15+ точек">15+</button>
            </div>
          </div>
          <div class="chat-quiz" data-quiz-block>
            <p class="muted">2/3 Главная цель?</p>
            <div class="chat-quick" role="list">
              <button class="chat-chip" type="button" data-quiz-goal="Нужно больше обращений с карты">Больше обращений</button>
              <button class="chat-chip" type="button" data-quiz-goal="Поднять рейтинг и перекрыть негатив">Рейтинг/негатив</button>
              <button class="chat-chip" type="button" data-quiz-goal="Нужны обращения быстро (реклама)">Быстро (реклама)</button>
              <button class="chat-chip" type="button" data-quiz-goal="Комплекс: карточка + отзывы + реклама">Комплекс</button>
            </div>
          </div>
          <div class="chat-quiz" data-quiz-block>
            <p class="muted">3/3 Город/район (если есть)</p>
            <div class="chat-quiz__row">
              <input class="chat-quiz__input" type="text" placeholder="например: Москва, ЮАО" data-quiz-city />
              <button class="btn btn-outline btn-sm" type="button" data-quiz-apply>Готово</button>
            </div>
            <p class="muted">Можно оставить пустым — я уточню в Telegram.</p>
          </div>
        `
      },
      packaging: {
        label: "Открывают карточку, но не звонят",
        html: `
          <p><strong>Чаще всего не хватает трёх вещей:</strong> ясного предложения, доверия и понятного следующего шага.</p>
          <ul class="mini-list">
            <li><strong>Предложение:</strong> услуги/витрина + цены «от» (чтобы сравнивали по ценности)</li>
            <li><strong>Доверие:</strong> фото по структуре «вход → процесс → результат»</li>
            <li><strong>Действие:</strong> звонок/маршрут/запись без лишних кликов</li>
          </ul>
          <details class="chat-more">
            <summary>Показать примеры и ссылки</summary>
            <div class="chat-more__body">
              <div class="chat-cards">
                <article class="card"><h3>Сначала — упаковка</h3><p class="muted">Делаем карточку «понятно и безопасно» — это чаще всего даёт самый быстрый рост конверсии.</p></article>
                <article class="card"><h3>Потом — доверие</h3><p class="muted">Отзывы + ответы по регламенту → меньше страха → больше обращений.</p></article>
              </div>
              <p class="muted">См. также: <a href="losses.html">где теряются обращения</a> · <a href="pricing.html#included">что именно правим</a>.</p>
            </div>
          </details>
          <p><strong>Скиньте ссылку на карточку</strong> в поле ниже — верну 3–5 точек роста и первый шаг.</p>
        `
      },
      reputation: {
        label: "Падает рейтинг / негатив / мало отзывов",
        html: `
          <p><strong>Люди смотрят не «средний рейтинг», а последние 3–7 отзывов</strong> и как вы отвечаете.</p>
          <ul class="mini-list">
            <li><strong>Свежесть:</strong> система сбора отзывов у реальных клиентов (без накрутки)</li>
            <li><strong>Ответы:</strong> регламент «признание → решение → следующий шаг»</li>
            <li><strong>Фейки:</strong> оспаривание только там, где реально есть нарушение правил</li>
          </ul>
          <details class="chat-more">
            <summary>Показать примеры и ссылки</summary>
            <div class="chat-more__body">
              <div class="chat-cards">
                <article class="card"><h3>Быстро</h3><p class="muted">Даже без удаления негатива ответы снимают страх: видно, что вы решаете.</p></article>
                <article class="card"><h3>Устойчиво</h3><p class="muted">Свежие отзывы держат доверие без риска блокировок.</p></article>
              </div>
              <p class="muted">См. также: <a href="honesty.html">честно про удаление/оспаривание</a> · <a href="plan.html">план 30/60/90</a>.</p>
            </div>
          </details>
          <p><strong>Скиньте ссылку</strong> — скажу, что можно убрать, а что лучше перекрыть контентом и отзывами.</p>
        `
      },
      ads: {
        label: "Нужны обращения быстро (без слива)",
        html: `
          <p><strong>Реклама на картах работает, когда считаем действия, а не клики.</strong></p>
          <ul class="mini-list">
            <li><strong>География:</strong> районы/радиусы — где окупается, туда бюджет</li>
            <li><strong>Цели:</strong> звонки, маршруты, записи (Метрика/коллтрекинг)</li>
            <li><strong>Фундамент:</strong> не ведём трафик в «сырую» карточку</li>
          </ul>
          <details class="chat-more">
            <summary>Показать примеры и ссылки</summary>
            <div class="chat-more__body">
              <div class="chat-cards">
                <article class="card"><h3>Если нужно «сейчас»</h3><p class="muted">Тестируем гипотезы по районам и быстро режем то, что не даёт обращений.</p></article>
                <article class="card"><h3>Если «в долгую»</h3><p class="muted">Доводим карточку до «понятно и безопасно» — и реклама становится дешевле.</p></article>
              </div>
              <p class="muted">См. также: <a href="pricing.html#process">как идёт работа</a> · <a href="pricing.html">форматы и тарифы</a>.</p>
            </div>
          </details>
          <p><strong>Скиньте ссылку</strong> — оценю, включать рекламу сразу или сначала «починить» карточку.</p>
        `
      },
      scale: {
        label: "Хочу рост и запас по каналам",
        html: `
          <p><strong>Рост = фундамент → доверие → масштаб по географии.</strong></p>
          <ul class="mini-list">
            <li><strong>Фундамент:</strong> убираем причины потерь в карточке (конверсия «просмотр → действие»)</li>
            <li><strong>Доверие:</strong> отзывы, ответы, контент под страхи клиентов</li>
            <li><strong>Масштаб:</strong> геореклама по районам + при необходимости 2ГИС/Google</li>
          </ul>
          <details class="chat-more">
            <summary>Показать план по срокам</summary>
            <div class="chat-more__body">
              <div class="chat-cards">
                <article class="card"><h3>30 дней</h3><p class="muted">Карточка «понятно за 10 секунд» + базовые правки.</p></article>
                <article class="card"><h3>60–90 дней</h3><p class="muted">Система доверия → масштаб по районам.</p></article>
              </div>
              <p class="muted">См. также: <a href="plan.html">план 30/60/90</a> · <a href="pricing.html#amplifiers">услуги-усилители</a>.</p>
            </div>
          </details>
          <p><strong>Скиньте ссылку</strong> — предложу самый короткий путь под вашу цель.</p>
        `
      },
      pricing: {
        label: "Сколько стоит и что входит",
        html: `
          <p><strong>Сначала — бесплатный разбор.</strong> Потом выбираем самый короткий формат.</p>
          <ul class="mini-list">
            <li><strong>Старт</strong> — если карточка «сырая»: упаковка + порядок</li>
            <li><strong>Рост</strong> — если нужен регулярный контроль + отзывы + реклама</li>
            <li><strong>Допы</strong> — только когда они реально усиливают результат</li>
          </ul>
          <details class="chat-more">
            <summary>Показать детали</summary>
            <div class="chat-more__body">
              <div class="chat-cards">
                <article class="card"><h3>Разово</h3><p class="muted">Починить карточку и поставить регламент.</p></article>
                <article class="card"><h3>Под ключ</h3><p class="muted">Отзывы, контент, реклама, отчётность — регулярно.</p></article>
              </div>
              <p class="muted">Все детали: <a href="pricing.html">тарифы и формат работы</a> · <a href="result.html#report">пример отчёта</a>.</p>
            </div>
          </details>
          <p><strong>Скиньте ссылку</strong> — скажу честно, какой формат нужен (или что можно сделать без меня).</p>
        `
      },
      process: {
        label: "Как вы работаете",
        html: `
          <p><strong>Процесс без хаоса:</strong> правка → замер → вывод.</p>
          <ul class="mini-list">
            <li>стартуем с аудита вашей карточки и 2–5 конкурентов рядом</li>
            <li>согласуем приоритеты на 30 дней (что чинится быстро, что требует системы)</li>
            <li>каждые 7–14 дней: что сделали → что поменялось → что дальше</li>
          </ul>
          <p class="muted">См. также: <a href="pricing.html#process">процесс</a> · <a href="pricing.html">формат и тарифы</a> · <a href="result.html#report">пример отчёта</a>.</p>
          <p>Скиньте ссылку — начнём с бесплатного разбора.</p>
        `
      },
      plan: {
        label: "План 30/60/90",
        html: `
          <p><strong>30/60/90 — чтобы не «скакать» и не сливать бюджет.</strong></p>
          <ul class="mini-list">
            <li><strong>30 дней:</strong> упаковка карточки и базовый регламент</li>
            <li><strong>60 дней:</strong> система отзывов + контент под страхи и критерии выбора</li>
            <li><strong>90 дней:</strong> масштаб по районам (геоперформанс) и оптимизация</li>
          </ul>
          <p class="muted">См. также: <a href="plan.html">модель 30/60/90</a>.</p>
          <p>Скиньте ссылку — скажу, с какого шага начинать именно вам.</p>
        `
      },
      report: {
        label: "Как выглядит отчёт",
        html: `
          <p><strong>Показываю результат без воды:</strong> 1 экран + ссылки на детали (что сделали → что изменилось → что дальше).</p>
          <ul class="mini-list">
            <li><strong>Цель цикла</strong> (1–2 гипотезы) — чтобы не «дёргать всё сразу»</li>
            <li><strong>Что сделали</strong> — конкретные правки по карточке/отзывам/рекламе</li>
            <li><strong>Что изменилось</strong> — метрики карточки: открытия → действия (звонок/маршрут/запись)</li>
            <li><strong>Что дальше</strong> — следующий шаг и почему именно он</li>
          </ul>
          <div class="chat-cards">
            <article class="card"><h3>Пример отчёта</h3><p class="muted">Смотреть шаблон на 1 страницу (без выдуманных цифр).</p><p><a href="result.html#report">Открыть пример отчёта →</a></p></article>
            <article class="card"><h3>Результат</h3><p class="muted">Формат «было → сделали → что измеряем».</p><p><a href="result.html">Открыть результат →</a></p></article>
          </div>
          <p>Скиньте ссылку на карточку — сделаю такой же отчёт по вашей точке.</p>
        `
      },
      cases: {
        label: "Результат и примеры",
        html: `
          <p><strong>Результат — это не “обещания”.</strong> Это формат: что было → что сделали → какие метрики смотрим после.</p>
          <div class="chat-cards">
            <article class="card"><h3>Упаковка карточки</h3><p class="muted">Становится понятно за 10 секунд: услуги, цены «от», фото, CTA, актуальность.</p></article>
            <article class="card"><h3>Отзывы и ответы</h3><p class="muted">Система свежих отзывов у реальных клиентов + регламент ответов на негатив.</p></article>
            <article class="card"><h3>Геореклама</h3><p class="muted">Считаем действия (звонки/маршруты/записи), режем слив бюджета по районам.</p></article>
          </div>
          <p class="muted">Открыть: <a href="result.html">страница “Результат и примеры”</a> · <a href="https://t.me/np_maps" target="_blank" rel="noopener noreferrer">Telegram‑канал с кейсами</a>.</p>
          <p>Скиньте ссылку на карточку — скажу, какой формат кейса будет у вас после первых правок.</p>
        `
      },
      faq: {
        label: "FAQ",
        html: `
          <p><strong>Собрал ответы на частые вопросы:</strong> сроки, правила площадок, что можно/нельзя, и как выглядит результат.</p>
          <p class="muted"><a href="faq.html">Открыть FAQ →</a></p>
        `
      },
      help: {
        label: "Не понимаю, где теряются обращения",
        html: `
          <p><strong>Ок — разберём без угадываний.</strong> Я смотрю выдачу, вашу карточку и ближайших конкурентов — и показываю, где именно теряется конверсия.</p>
          <ul class="mini-list">
            <li>что отпугивает (контент/цены/негатив/неактуальность)</li>
            <li>что дать в карточке, чтобы стало «понятно и безопасно»</li>
            <li>что даст быстрый эффект, а что требует 30–60 дней</li>
          </ul>
          <p>Скиньте ссылку ниже — и я верну краткий план.</p>
        `
      }
    };

    const AFTER = [
      { key: "quiz", label: "Квиз 1 мин" },
      { key: "pricing", label: "Сколько стоит" },
      { key: "process", label: "Как работаем" },
      { key: "report", label: "Как выглядит отчёт" },
      { key: "plan", label: "План 30/60/90" },
      { key: "cases", label: "Результат/примеры" },
      { key: "faq", label: "FAQ" },
      { key: "cta", label: "Хочу бесплатный разбор" },
    ];

    const show = (key) => {
      if (key === "cta") {
        setTopic("", "");
        msg("user", `<p>${esc("Хочу бесплатный разбор")}</p>`);
        msg("assistant", `<p>Ок. Вставьте ссылку на карточку в поле ниже — я открою Telegram с готовым сообщением.</p>`);
        focusCta();
        return;
      }

      const t = TOPICS[key];
      if (!t) return;

      if (key === "quiz") {
        quizState.points = "";
        quizState.goal = "";
        quizState.city = "";
      }

      setTopic(key, t.label);

      msg("user", `<p>${esc(t.label)}</p>`);
      msg("assistant", t.html + quickHtml(AFTER));
    };

    // Initial assistant messages (split into 2 bubbles so the quick replies stay visible above the fixed dock)
    msg("assistant", `
      <p class="kicker">Ведение Яндекс.Карт • отзывы • гео‑реклама</p>
      <h1 class="chat-title">Ведение Яндекс.Карт: чтобы вас выбирали чаще без накруток</h1>
      <p class="chat-sub">За счёт <strong>упаковки карточки</strong>, <strong>системы отзывов</strong> и <strong>рекламы по обращениям</strong>.</p>
      <p class="chat-sub"><strong>Бесплатный разбор:</strong> 3–5 точек роста + первый шаг + чек‑лист «11 ошибок в карточке, из‑за которых вас не выбирают».</p>
      <ul class="mini-list">
        <li><strong>На руках:</strong> короткий план на 30 дней (что делать сначала)</li>
        <li><strong>Безопасно:</strong> без накруток и «серых» схем — по правилам площадок</li>
        <li><strong>Прозрачно:</strong> отчёт на 1 страницу (что сделали → что изменилось → что дальше)</li>
      </ul>
    `);

    msg("assistant", `
      <p><strong>Что болит сильнее всего?</strong></p>
      ${quickHtml([
        { key: "quiz", label: TOPICS.quiz.label },
        { key: "packaging", label: TOPICS.packaging.label },
        { key: "reputation", label: TOPICS.reputation.label },
        { key: "ads", label: TOPICS.ads.label },
        { key: "pricing", label: TOPICS.pricing.label },
        { key: "report", label: TOPICS.report.label },
        { key: "help", label: TOPICS.help.label }
      ])}
    `);

    // Auto-open chat topic from ?topic= (subpages link сюда)
    (() => {
      let auto = null;
      try { auto = new URLSearchParams(location.search || "").get("topic"); } catch (e) {}
      if (!auto) return;
      if (!TOPICS[auto]) return;
      track("chat_auto_topic", { key: auto });
      setTimeout(() => { show(auto); }, 40);
    })();

    // Click handler for quick replies
    thread.addEventListener("click", (e) => {
      // Mini-quiz picks
      const pts = e.target.closest("[data-quiz-points]");
      if (pts) {
        quizState.points = pts.getAttribute("data-quiz-points") || "";
        // visual select
        const group = pts.parentElement;
        if (group) group.querySelectorAll("button").forEach(b => b.classList.toggle("is-selected", b === pts));
        // also sync with form (so user can just send)
        try {
          const sel = ctaForm ? ctaForm.querySelector('select[name="points"]') : null;
          if (sel) sel.value = quizState.points;
        } catch (_) {}
        track("chat_quiz_points", { value: quizState.points });
        return;
      }

      const goal = e.target.closest("[data-quiz-goal]");
      if (goal) {
        quizState.goal = goal.getAttribute("data-quiz-goal") || "";
        const group = goal.parentElement;
        if (group) group.querySelectorAll("button").forEach(b => b.classList.toggle("is-selected", b === goal));
        try {
          const sel = ctaForm ? ctaForm.querySelector('select[name="goal"]') : null;
          if (sel) sel.value = quizState.goal;
        } catch (_) {}
        track("chat_quiz_goal", { value: quizState.goal });
        return;
      }

      const apply = e.target.closest("[data-quiz-apply]");
      if (apply) {
        // Read city from the same bubble
        const bubble = apply.closest(".chat-bubble");
        const cityInput = bubble ? bubble.querySelector("[data-quiz-city]") : null;
        quizState.city = cityInput ? String(cityInput.value || "").trim() : "";
        try {
          const inp = ctaForm ? ctaForm.querySelector('input[name="city"]') : null;
          if (inp) inp.value = quizState.city;
        } catch (_) {}

        // Open mini-quiz details under the form so user sees what got filled
        try {
          const det = cta ? cta.querySelector("details.chat-mini-quiz") : null;
          if (det) det.open = true;
        } catch (_) {}

        msg("assistant", `<p>Готово. Я подставил ответы в форму ниже. Осталось <strong>вставить ссылку</strong> (если ещё не вставили) и нажать «Получить план».</p>`);
        focusCta();
        track("chat_quiz_apply", { points: quizState.points, goal: quizState.goal, city: quizState.city });
        return;
      }

      const btn = e.target.closest("[data-chat-pick]");
      if (!btn) return;
      const key = btn.getAttribute("data-chat-pick") || "";
      if (!key) return;
      track("chat_pick", { key });
      show(key);
    });

    // If opened with hash #cta / #ctaDock — focus the composer
    if (["#cta", "#ctaDock"].includes(location.hash || "")) {
      setTimeout(focusCta, 50);
    }

    // Smart sticky CTA on the home page: show only when the compose area is off-screen
    (() => {
      const sticky = document.querySelector('.sticky-cta');
      if (!sticky || !cta) return;

      const setVisible = (v) => {
        document.body.classList.toggle('sticky-enabled', !!v);
      };

      // IntersectionObserver (preferred)
      try {
        const io = new IntersectionObserver((entries) => {
          const ent = entries && entries[0];
          if (!ent) return;
          // If composer is visible → hide sticky
          setVisible(!ent.isIntersecting);
        }, { root: null, threshold: 0.2 });
        io.observe(cta);
        return;
      } catch (_) {}

      // Fallback
      const onScroll = () => {
        const r = cta.getBoundingClientRect();
        const visible = r.top < window.innerHeight && r.bottom > 0;
        setVisible(!visible);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    })();
  })();

  
})();
