# Аудит сайта NP.Maps (глубокий локальный прогон)

## 1) Контекст проекта
- **Стек (Assumption):** статический multi-page сайт на HTML/CSS/vanilla JS + PHP endpoint для лидов (`api/lead.php`).
- **Локальный запуск:**
  - `python3 -m http.server 4173` (корень репозитория)
  - проверка страниц через Playwright browser-container на `http://127.0.0.1:4173/*.html`.
- **Карта страниц (обнаружена по репозиторию):** `index, pricing, result, faq, honesty, plan, losses, why-yandex, about, privacy, offer, thanks, offline, 404` + redirect-страницы `cases, process, proof, report, services, system`.
- **Ключевые директории/файлы:** `css/styles.css`, `js/*.js`, `api/*.php`, `sitemap.xml`, `robots.txt`, `sw.js`, `manifest.webmanifest`, `img/*`.

## 2) Сводка
1. Проект рабочий и структурно цельный, но есть архитектурный перекос: часть страниц — это HTML-редиректы, которые ведут на production-домен и ломают локальное QA.
2. Найден **P0-риск по безопасности/антиабьюзу**: публичный lead endpoint не валидирует origin/referer и может быть заспамлен ботами извне.
3. SEO-контур неполный: canonical отсутствует на большинстве индексируемых страниц, а redirect-страницы содержат контентно-пустые документы с `noindex`/refresh.
4. Производительность средняя: `css/styles.css` ~143 KB + массивные HTML (до ~66 KB) + дублирование critical-loader в каждом документе.
5. Поддерживаемость снижена: один и тот же inline-блок loader/Critical CSS повторён во многих страницах.
6. Визуально структура аккуратная, но из-за принудительных редиректов невозможно полноценно отревьюить часть экранов в локальной среде.
7. Есть риск деградации аналитики/QA: protocol-relative `//mc.yandex.ru` и жёсткие absolute redirects на `https://np-maps.ru`.
8. API-конфиг хранится в `api/config.php` в репозитории (пусть и пустой), что повышает вероятность случайной публикации секретов.
9. Сборка как таковая отсутствует (статический сайт), но базовые проверки целостности ссылок/мета проведены.
10. Критичные исправления — 1 день: антиабьюз endpoint + исправление redirect-стратегии + canonical/SEO hygiene.

## 3) Issue list

| ID | Priority | Type | Где | Симптом | Причина | Как исправить | Критерий готовности |
|---|---|---|---|---|---|---|---|
| ISS-001 | P0 | Security | `api/lead.php` | Endpoint доступен для внешнего POST-спама | Нет проверки `Origin/Referer`, нет CAPTCHA/подписи запроса | Добавить allowlist origin + hCaptcha/Cloudflare Turnstile + server-side валидацию токена | Запросы с чужого origin получают 403, валидные формы проходят |
| ISS-002 | P1 | SEO/UX | `process.html`, `report.html`, `services.html`, `system.html`, `proof.html`, `cases.html` | Локальная навигация улетает на production | HTML meta refresh + `window.location.replace` на абсолютные URL | Заменить на относительные редиректы или серверный 301 по маршрутам; в dev не уводить на внешний домен | На localhost переходы остаются в localhost, в prod корректный 301 |
| ISS-003 | P1 | SEO | Большинство контентных страниц | Отсутствует `rel=canonical` на индексируемых страницах | Неполная SEO-разметка | Добавить canonical для каждой индексируемой страницы | В source всех целевых страниц есть корректный canonical |
| ISS-004 | P1 | Performance/Refactor | Все HTML | Большой inline повтор loader-блока | Копипаст critical CSS/loader-разметки | Вынести loader в общий include/JS-инъекцию или минимизировать inline блок | Размер HTML снижен, визуально loader без регрессий |
| ISS-005 | P1 | Security/DevOps | `api/config.php` | Риск утечки токена при ручном заполнении и коммите | Конфиг-файл в VCS | Убрать `api/config.php` из репо, оставить `config.sample.php`, добавить в `.gitignore` | В репо нет live-конфигов с секретами |
| ISS-006 | P2 | Perf | `css/styles.css` | Крупный CSS-файл (~143 KB) | Нет явного разбиения/очистки неиспользуемых правил | Прогнать purge/coverage, разбить критическое/некритическое, минифицировать | Размер CSS уменьшен без визуальной деградации |
| ISS-007 | P2 | QA/Analytics | все страницы с метрикой | Используется `//mc.yandex.ru` | Protocol-relative URL legacy-паттерн | Явно указывать `https://mc.yandex.ru/...` | Нет mixed/protocol ambiguities в source |
| ISS-008 | P2 | Backend robustness | `api/lead.php` (rate-limit) | Возможны гонки в file-based RL при нагрузке | read-modify-write JSON без транзакционного хранилища | Перейти на Redis/SQLite lock-safe storage или `flock` на отдельный журнал | Под параллельной нагрузкой RL отрабатывает детерминированно |

## 4) Визуальные правки (UI/UX)
1. Для мобильной сетки (360px): ограничить крупные блоки `max-width: 100%`, внутренние контейнеры `padding-inline: 16px`, вертикальный ритм `gap: 12-16px`.
2. Для планшета (768px): стабилизировать карточки в двухколоночной сетке (`grid-template-columns: repeat(2, minmax(0,1fr)); gap: 20px`).
3. Для десктопа 1366/1920: ограничить контент до `max-width: 1200-1280px`, не растягивать текстовые колонки шире ~72ch.
4. Типографика: базовый текст `font-size: 16px`, `line-height: 1.55-1.65`; вторичный текст не ниже 14px.
5. Фокус-состояния: для интерактивных элементов добавить заметный `outline: 2px solid var(--accent); outline-offset: 2px`.
6. Кнопки: унифицировать высоту (например `min-height: 44px`) для touch accessibility.
7. Формы: ошибки под полем (`margin-top: 6px`, цвет ошибки с контрастом WCAG AA), сохранить поле и контекст ошибки до исправления.

## 5) Perf / SEO / A11y
- **Perf:** сократить дубли inline-кода; оптимизировать CSS, проверить lazy-loading для неhero изображений, зафиксировать метрики Lighthouse (LCP/CLS/INP) после правок.
- **SEO:** canonical на все целевые страницы, единая стратегия redirect (предпочтительно HTTP 301 на сервере), убрать контентные дубли redirect-страниц из индекса.
- **A11y:** базово alt присутствуют; усилить keyboard/focus контроль и проверить контраст CTA/secondary text через WCAG-инструмент.

## 6) Quick Wins (до 1 часа)
1. Добавить origin allowlist в `api/lead.php`.
2. Перевести `//mc.yandex.ru` в `https://`.
3. Добавить canonical в недостающие страницы.
4. Вынести повторяющийся loader CSS в отдельный файл.
5. Сжать `styles.css` (minify) и включить `preload` критичных ресурсов.
6. Удалить `api/config.php` из VCS, оставить sample.
7. Добавить `X-Robots-Tag`/robots-логику для redirect-страниц.
8. Проверить и почистить устаревшие redirect-страницы (`cases/process/...`).
9. Добавить smoke-check скрипт на наличие title/description/h1/canonical.
10. Добавить базовый CI job (link check + HTML sanity).

## 7) План работ (3 этапа)
- **Этап 1 (P0, срочно):** ISS-001.
- **Этап 2 (P1, важно):** ISS-002/003/004/005.
- **Этап 3 (P2, улучшения):** ISS-006/007/008 + визуальная полировка.

## 8) Приложения: команды и логи
### Команды
- `python3 -m http.server 4173`
- Playwright smoke: проверка доступности всех `.html` (status/url/h1)
- `python3` regex-sanity: title/description/h1/canonical/img alt/forms по всем HTML
- `wc -c css/styles.css js/*.js *.html | sort -nr | head -n 20`

### Ключевой лог Playwright (факт)
- `cases.html -> final url http://127.0.0.1:4173/result.html`
- `process.html -> final url https://np-maps.ru/pricing.html#process`
- `proof.html -> final url http://127.0.0.1:4173/honesty.html#proof`
- `report.html -> final url https://np-maps.ru/result.html#report`
- `services.html -> final url https://np-maps.ru/pricing.html#amplifiers`
- `system.html -> final url https://np-maps.ru/pricing.html#included`

### Ключевой лог размерностей
- `css/styles.css` ≈ 143114 bytes
- Наиболее тяжёлые HTML: `faq.html` ≈ 66546 bytes, `pricing.html` ≈ 62639 bytes, `index.html` ≈ 60271 bytes.
