/* ============================================================
   Конструктор листа A5 — собран из готовых блоков.

   Это НЕ приложение: один экран, один файл, всё на file://.

   Единственный источник разметки блока — BLOCKS[i].markup().
   Один и тот же вызов даёт:
     · предпросмотр — строка вставляется в .canvas через innerHTML,
       затем ЛОКАЛЬНЫЙ экспандер разворачивает data-атрибуты;
     · «Скачать HTML» — та же строка уходит в файл как есть,
       с каноническими data-атрибутами, и разворачивает их уже
       общий assets/grid.js (его в конструкторе нет).
   Поэтому grid.js не тронут: он общий для всех страниц проекта, а предпросмотр
   живёт в DOM и перерисовывается много раз — ему нужен свой экспандер,
   зеркалирующий разметку grid.js (те же классы: .dnum, td.d, th.sum,
   .axv, .srow/.sl/.sd, .cell > .d, .mc-head/.mc-body/.mh/.mc-c).

   Заполнение листа контролируется замером браузера по факту рендера
   (canvas.scrollHeight / clientHeight / getBoundingClientRect), а не
   заранее приписанными высотами блоков: см. «размеры листа» и
   «индикатор заполнения».
   ============================================================ */
(function () {
  'use strict';

  /* миниатюра в index.html: grid.js здесь не подключён, класс вешаем сами */
  if (window.self !== window.top) {
    document.documentElement.classList.add('thumb-root');
  }

  /* ================== размеры листа ==================
     .page = 148×210 мм, overflow:hidden → всё лишнее молча обрежется
     на печати, поэтому полагаться на заранее известные высоты нельзя.
     Здесь НЕТ хардкодных высот блоков и константы «доступно 197 мм»:
     занятость листа, доступную высоту и цену каждого блока снимает
     замер с уже отрендеренного DOM (см. measure()/checkFit() ниже).
     Поле mm в BLOCKS — только приблизительная подсказка «≈» в палитре,
     ни одна проверка «влезет/не влезет» на него не смотрит. */
  const PX_TO_MM = 25.4 / 96; /* CSS-px → мм (96 dpi) */
  const toMm = (px) => px * PX_TO_MM;

  const DAYS = 31;
  const ACCENTS = ['var(--c-green)', 'var(--c-blue)', 'var(--c-orange)'];
  const DEFAULT_TITLE = 'Мой лист';
  const META_DEFAULT = '<span class="blank" style="min-width:22mm"></span> · ' +
    '<span class="blank" style="min-width:12mm"></span> г.';

  function accentAt(i) {
    return ACCENTS[i % ACCENTS.length];
  }

  /* ================== генераторы разметки ================== */

  function sec(ac, title, body) {
    return '<section class="sec" style="--ac: ' + ac + '">\n' +
      '  <h2>' + title + '</h2>\n' +
      body + '\n' +
      '</section>';
  }

  /* график: ось Y + поле + линейка дней + подписи линий */
  function graphMarkup(o) {
    return function (ac) {
      let s = '  <div class="chart" style="--h: ' + o.h + 'mm; --n: ' + o.n + '">\n' +
        '    <div class="ax" data-axis="' + o.max + '" data-axis-from="' + o.min + '"' +
        (o.step ? ' data-axis-step="' + o.step + '"' : '') + '></div>\n' +
        '    <div class="plot"></div>\n' +
        '    <div class="strip" data-strip="' + DAYS + '" data-strip-letters></div>\n' +
        '  </div>\n' +
        '  <div class="crow">\n' +
        '    <span class="key"></span><span class="ln"></span>\n' +
        '    <span class="key dash"></span><span class="ln"></span>\n' +
        '  </div>';
      if (o.weather) {
        s += '\n  <div class="symrow">\n' +
          '    <span><span class="s">☀</span> <span class="blank" style="min-width:16mm"></span></span>\n' +
          '    <span><span class="s">☁</span> <span class="blank" style="min-width:16mm"></span></span>\n' +
          '    <span><span class="s">☂</span> <span class="blank" style="min-width:16mm"></span></span>\n' +
          '    <span><span class="s">❄</span> <span class="blank" style="min-width:16mm"></span></span>\n' +
          '  </div>';
      }
      return sec(ac, o.title, s);
    };
  }

  /* таблица-трекер: идёт без рамки .sec, как в month/habits.html */
  function habitsMarkup(rows) {
    return function () {
      let body = '';
      for (let i = 0; i < rows; i++) {
        body += '    <tr data-days="' + DAYS + '" data-sum><td class="lbl">&nbsp;</td></tr>\n';
      }
      return '<table class="tbl hab">\n' +
        '  <colgroup>\n    <col style="width:26mm"><col span="31"><col style="width:8mm">\n  </colgroup>\n' +
        '  <thead>\n    <tr data-days-head="' + DAYS + '" data-sum><th class="lbl">привычка / день</th></tr>\n  </thead>\n' +
        '  <tbody>\n' + body.trimEnd() + '\n  </tbody>\n' +
        '</table>';
    };
  }

  function cellsMarkup(ac) {
    return sec(ac, 'Клетки на месяц — закрась день целиком',
      '  <div class="leg">\n' +
      '    <div class="row"><span class="sw" style="background:var(--g)"></span><b>сделано</b></div>\n' +
      '    <div class="row"><span class="sw" style="background:var(--y)"></span><b>частично</b></div>\n' +
      '    <div class="row"><span class="sw" style="background:var(--r)"></span><b>не сделано</b></div>\n' +
      '  </div>\n' +
      '  <div class="cells" data-cells="' + DAYS + '"></div>');
  }

  function minisMarkup(ac, i) {
    const one = (a) =>
      '    <div class="mini" style="--ac: ' + a + '">\n' +
      '      <div class="ttl"><span class="sw"></span><span class="ln"></span></div>\n' +
      '      <div class="mc" data-mini-cal data-weeks="6"></div>\n' +
      '      <div class="foot">всего <span class="b"></span> из <span class="b"></span></div>\n' +
      '    </div>';
    return sec(ac, 'Мини-календари показателей',
      '  <div class="minis">\n' + one(accentAt(i)) + '\n' + one(accentAt(i + 1)) + '\n  </div>');
  }

  function notesMarkup(ac) {
    return sec(ac, 'Заметки и итоги',
      '  <div class="row"><span class="ln"></span></div>\n' +
      '  <div class="row"><span class="ln"></span></div>\n' +
      '  <div class="row"><span class="ln"></span></div>');
  }

  /* ================== библиотека блоков ==================
     mm — ПРИМЕРНАЯ высота блока, только для подсказки «≈» в палитре
     (для блоков, которые ещё ни разу не были на листе). Проверки
     заполнения и список «Что на листе» берут измеренную высоту. */
  const BLOCKS = [
    {
      id: 'graph-mood', group: 'graph', name: 'График настроения и погоды',
      tag: '1–5', hint: 'ось 1–5, поле 32 мм, значки погоды ☀ ☁ ☂ ❄',
      mm: 57.5, markup: graphMarkup({ title: 'Настроение и погода', max: 5, min: 1, h: 32, n: 4, weather: true }),
    },
    {
      id: 'graph-sleep', group: 'graph', name: 'График сна, часов',
      tag: '4–10', hint: 'ось 4–10, поле 32 мм, две подписи линий',
      mm: 53, markup: graphMarkup({ title: 'Сон, часов', max: 10, min: 4, h: 32, n: 6 }),
    },
    {
      id: 'graph-energy', group: 'graph', name: 'График энергии',
      tag: '2–10', hint: 'ось 2–10 с шагом 2, поле 28 мм',
      mm: 49, markup: graphMarkup({ title: 'Энергия', max: 10, min: 2, step: 2, h: 28, n: 4 }),
    },
    {
      id: 'habits-8', group: 'habits', name: 'Трекер привычек',
      tag: '8 строк', hint: '31 день + колонка «✓», подписи привычек слева',
      mm: 61.5, markup: habitsMarkup(8),
    },
    {
      id: 'habits-5', group: 'habits', name: 'Трекер привычек',
      tag: '5 строк', hint: 'крупные клетки, 31 день + «✓»',
      mm: 40, markup: habitsMarkup(5),
    },
    {
      id: 'habits-12', group: 'habits', name: 'Трекер привычек',
      tag: '12 строк', hint: 'максимум привычек на весь лист',
      mm: 90, markup: habitsMarkup(12),
    },
    {
      id: 'cells-grid', group: 'cells', name: 'Сетка клеток на месяц',
      tag: '31 клетка', hint: '31 клетка 13 мм + легенда из 3 цветов',
      mm: 93.5, markup: cellsMarkup,
    },
    {
      id: 'mini-cals', group: 'minis', name: 'Мини-календари (2)',
      tag: '6 недель', hint: 'два показателя «было / не было» в ряд',
      mm: 63, markup: minisMarkup,
    },
    {
      id: 'notes', group: 'notes', name: 'Заметки / итоги',
      tag: '3 строки', hint: 'пунктирные строки для надписей от руки',
      mm: 22.7, markup: notesMarkup,
    },
  ];
  const BY_ID = {};
  BLOCKS.forEach((b) => { BY_ID[b.id] = b; });
  const START = ['graph-mood', 'habits-8'];

  /* ================== состояние ================== */
  const state = { title: DEFAULT_TITLE, period: '', blocks: START.slice() };

  const $ = (id) => document.getElementById(id);
  const page = $('page');
  const canvas = $('canvas');
  const elTitle = $('sheet-title');
  const elMeta = $('sheet-meta');
  const elList = $('list');
  const elEmpty = $('empty');
  const elPalette = $('palette');
  const gauge = $('gauge');
  const gaugeNum = $('gauge-num');
  const gaugeFill = $('gauge-fill');
  const gaugeBrk = $('gauge-brk');
  const gaugeWarn = $('gauge-warn');
  const inTitle = $('f-title');
  const inPeriod = $('f-period');
  const paletteBtns = {}; /* id блока → его кнопка в палитре (для подсказки о высоте) */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  function mm(x) {
    return Math.round(x * 10) / 10;
  }

  function metaHtml() {
    const v = state.period.trim();
    return v ? esc(v) : META_DEFAULT;
  }

  function blocksHtml() {
    return state.blocks
      .map((id, i) => BY_ID[id].markup(accentAt(i), i))
      .join('\n\n');
  }

  /* ================== локальный экспандер ==================
     Копия логики assets/grid.js (то, что нужно блокам конструктора):
     те же классы и порядок вставки — грид разворачивает data-атрибуты
     в уже вставленный DOM, без пересоздания страницы. */
  function expand(root) {
    root.querySelectorAll('tr[data-days-head]').forEach((tr) => {
      const n = parseInt(tr.dataset.daysHead, 10) || DAYS;
      for (let i = 1; i <= n; i++) {
        const th = document.createElement('th');
        th.className = 'dnum';
        th.textContent = i;
        tr.appendChild(th);
      }
      if (tr.hasAttribute('data-sum')) {
        const th = document.createElement('th');
        th.className = 'sum';
        th.textContent = '✓';
        tr.appendChild(th);
      }
    });

    root.querySelectorAll('tr[data-days]').forEach((tr) => {
      const n = parseInt(tr.dataset.days, 10) || DAYS;
      for (let i = 1; i <= n; i++) {
        const td = document.createElement('td');
        td.className = 'd';
        tr.appendChild(td);
      }
      if (tr.hasAttribute('data-sum')) {
        const td = document.createElement('td');
        td.className = 'sum';
        tr.appendChild(td);
      }
    });

    root.querySelectorAll('[data-cells]').forEach((box) => {
      const n = parseInt(box.dataset.cells, 10) || DAYS;
      const kind = box.dataset.cell || '';
      for (let i = 1; i <= n; i++) {
        const c = document.createElement('div');
        c.className = 'cell' + (kind ? ' ' + kind : '');
        const s = document.createElement('span');
        s.className = 'd';
        s.textContent = i;
        c.appendChild(s);
        box.appendChild(c);
      }
    });

    root.querySelectorAll('[data-strip]').forEach((box) => {
      const n = parseInt(box.dataset.strip, 10) || DAYS;
      if (box.hasAttribute('data-strip-letters')) {
        const letRow = document.createElement('div');
        letRow.className = 'srow letters';
        for (let l = 0; l < n; l++) {
          const le = document.createElement('span');
          le.className = 'sl';
          letRow.appendChild(le);
        }
        box.appendChild(letRow);
      }
      const numRow = document.createElement('div');
      numRow.className = 'srow';
      for (let i = 1; i <= n; i++) {
        const s = document.createElement('span');
        s.className = 'sd';
        s.textContent = i;
        numRow.appendChild(s);
      }
      box.appendChild(numRow);
    });

    root.querySelectorAll('[data-axis]').forEach((box) => {
      const top = parseInt(box.dataset.axis, 10) || 10;
      const bottom = parseInt(box.dataset.axisFrom, 10) || 1;
      const step = parseInt(box.dataset.axisStep, 10) || 1;
      for (let v = top; v >= bottom; v -= step) {
        const s = document.createElement('span');
        s.className = 'axv';
        s.textContent = v;
        box.appendChild(s);
      }
    });

    root.querySelectorAll('[data-mini-cal]').forEach((box) => {
      const weeks = parseInt(box.dataset.weeks, 10) || 6;
      const head = document.createElement('div');
      head.className = 'mc-head';
      ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].forEach((nm) => {
        const h = document.createElement('span');
        h.className = 'mh' + (nm === 'сб' || nm === 'вс' ? ' wk' : '');
        h.textContent = nm;
        head.appendChild(h);
      });
      box.appendChild(head);

      const body = document.createElement('div');
      body.className = 'mc-body';
      for (let i = 0; i < weeks * 7; i++) {
        const c = document.createElement('span');
        c.className = 'mc-c' + (i % 7 >= 5 ? ' wk' : '');
        body.appendChild(c);
      }
      box.appendChild(body);
    });
  }

  /* ================== индикатор заполнения ==================
     Никакой арифметики по заранее известным высотам: берём замер с
     уже отрендеренного DOM.
       занято    = canvas.scrollHeight (в него входят шапка, блоки и gap
                   между ними — та высота, которую контент требует),
       доступно  = canvas.clientHeight,
       перелив   = scrollHeight > clientHeight → контент обрежется.
     Высоты отдельных блоков (для списка и подсказок) — тоже замер с их
     собственных узлов. */
  const measured = {}; /* id блока → измеренная высота, мм (после рендера) */
  let lastFit = { used: 0, avail: 0, over: false };

  function measureBlocks() {
    /* canvas.children[0] — шапка, дальше блоки по порядку state.blocks */
    const nodes = Array.prototype.slice.call(canvas.children, 1);
    nodes.forEach((el, i) => {
      const id = state.blocks[i];
      if (id) measured[id] = toMm(el.getBoundingClientRect().height);
    });
  }

  function checkFit() {
    const used = canvas.scrollHeight;
    const avail = canvas.clientHeight;
    lastFit = { used: toMm(used), avail: toMm(avail), over: used - avail > 1 };
    page.classList.toggle('is-over', lastFit.over);
    measureBlocks();
    drawGauge();
    drawHeights();
  }

  function drawGauge() {
    const f = lastFit;
    const rest = f.avail - f.used;
    gaugeNum.textContent = 'Занято ' + mm(f.used) + ' из ' + mm(f.avail) + ' мм';
    gaugeFill.style.width = (f.avail > 0 ? Math.min(100, f.used / f.avail * 100) : 0) + '%';
    gaugeBrk.textContent = f.over
      ? 'замер с листа: контент требует больше, чем влезает'
      : 'замер с листа: свободный остаток ' + mm(rest) + ' мм';
    gauge.classList.toggle('warn', f.over);
    gauge.classList.toggle('over', f.over);
    /* текст меняется в существующем узле #gauge-warn (aria-live его озвучит) */
    gaugeWarn.textContent = f.over
      ? '⚠ Не влезает: лишние ' + mm(-rest) + ' мм обрежутся на печати. Убери или уменьши блок.'
      : '';
  }

  /* подписи высот в списке и в подсказках кнопок палитры — по замеру */
  function heightLabel(id) {
    return (measured[id] !== undefined ? mm(measured[id]) : '≈' + mm(BY_ID[id].mm)) + ' мм';
  }

  function drawHeights() {
    Array.prototype.slice.call(elList.children).forEach((li, i) => {
      const id = state.blocks[i];
      const h = li.querySelector('.hgt');
      if (id && h) h.textContent = heightLabel(id);
    });
    Object.keys(paletteBtns).forEach((id) => {
      const btn = paletteBtns[id];
      const text = 'Добавить на лист: ' + BY_ID[id].name + ' (' + heightLabel(id) + ')';
      btn.title = text;
      btn.setAttribute('aria-label', text);
    });
  }

  /* ================== отрисовка ================== */
  function renderSheet() {
    elTitle.textContent = state.title.trim() || DEFAULT_TITLE;
    elMeta.innerHTML = metaHtml();

    /* всё, что после шапки — блоки; пересобираем их заново */
    Array.prototype.slice.call(canvas.children, 1).forEach((el) => el.remove());
    canvas.insertAdjacentHTML('beforeend', blocksHtml());
    expand(canvas);
  }

  function renderList() {
    elList.textContent = '';
    state.blocks.forEach((id, i) => {
      const b = BY_ID[id];
      const li = document.createElement('li');
      li.style.setProperty('--ac', accentAt(i));

      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.innerHTML = esc(b.name) + '<small>' + esc(b.tag) + '</small>';
      const hgt = document.createElement('span');
      hgt.className = 'hgt';
      hgt.textContent = heightLabel(id);

      li.append(nm, hgt);
      [['up', '↑', 'Переставить выше', i === 0],
        ['down', '↓', 'Переставить ниже', i === state.blocks.length - 1],
        ['del', '✕', 'Убрать с листа', false]].forEach(([act, txt, title, disabled]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = txt;
        btn.title = title;
        btn.setAttribute('aria-label', title + ': ' + b.name);
        if (act === 'del') btn.className = 'del';
        btn.disabled = disabled;
        btn.addEventListener('click', () => move(i, act));
        li.appendChild(btn);
      });

      elList.appendChild(li);
    });
    elEmpty.style.display = state.blocks.length ? 'none' : 'block';
  }

  function renderPalette() {
    const seen = [];
    BLOCKS.forEach((b) => {
      if (seen.indexOf(b.group) === -1) seen.push(b.group);
    });
    elPalette.textContent = '';
    seen.forEach((group) => {
      const variants = BLOCKS.filter((b) => b.group === group);
      const li = document.createElement('li');
      const info = document.createElement('span');
      info.className = 'pinfo';
      info.innerHTML = '<b>' + esc(variants[0].name) + '</b><small>' +
        esc(variants[0].hint) + '</small>';
      li.appendChild(info);
      variants.forEach((b) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = variants.length > 1 ? b.tag : 'Добавить';
        btn.addEventListener('click', () => {
          state.blocks.push(b.id);
          render();
        });
        li.appendChild(btn);
        paletteBtns[b.id] = btn; /* высоту в подсказку подставит drawHeights() */
      });
      elPalette.appendChild(li);
    });
    drawHeights();
  }

  function move(i, act) {
    if (act === 'del') {
      state.blocks.splice(i, 1);
    } else {
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= state.blocks.length) return;
      const row = state.blocks;
      [row[i], row[j]] = [row[j], row[i]];
    }
    render();
  }

  function render() {
    renderSheet();
    renderList();
    /* сначала синхронный замер (иначе мигнёт «0 из 0»), потом ещё раз
       после финальной раскладки кадра */
    checkFit();
    requestAnimationFrame(checkFit);
  }

  /* ================== экспорт: самодостаточный лист ========== */
  function padLines(str, n) {
    const sp = ' '.repeat(n);
    return str.split('\n').map((l) => (l ? sp + l : l)).join('\n');
  }

  function exportHtml() {
    const title = state.title.trim() || DEFAULT_TITLE;
    const style = document.getElementById('sheet-style').textContent.trim();
    const blocks = state.blocks.length
      ? padLines(state.blocks.map((id, i) => BY_ID[id].markup(accentAt(i), i)).join('\n\n'), 6) + '\n'
      : '';

    return [
      '<!doctype html>',
      '<html lang="ru">',
      '<head>',
      '<meta charset="utf-8">',
      '<title>' + esc(title) + ' — макет A5</title>',
      '<link rel="stylesheet" href="../assets/pages.css">',
      '<style>',
      style,
      '</style>',
      '</head>',
      '<body>',
      '<div class="bar no-print">',
      '  <a href="../index.html">← Оглавление</a>',
      '  <button onclick="print()">Печать A5</button>',
      '</div>',
      '',
      '<div class="sheet">',
      '  <section class="page">',
      '    <aside class="rail"><i></i><i></i><i></i></aside>',
      '    <div class="canvas" style="--ac: var(--c-green)">',
      '      <header class="ph">',
      '        <div>',
      '          <div class="kick">Месяц</div>',
      '          <h1>' + esc(title) + '</h1>',
      '        </div>',
      '        <div class="meta">' + metaHtml() + '</div>',
      '      </header>',
      '',
      blocks +
      '    </div>',
      '  </section>',
      '</div>',
      '<script src="../assets/grid.js"><\/script>',
      '</body>',
      '</html>',
      '',
    ].join('\n');
  }

  function download() {
    const blob = new Blob([exportHtml()], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ================== панель ================== */
  inTitle.value = state.title;
  inTitle.addEventListener('input', () => {
    state.title = inTitle.value;
    elTitle.textContent = state.title.trim() || DEFAULT_TITLE;
    requestAnimationFrame(checkFit);
  });
  inPeriod.addEventListener('input', () => {
    state.period = inPeriod.value;
    elMeta.innerHTML = metaHtml();
    requestAnimationFrame(checkFit);
  });
  $('b-print').addEventListener('click', () => window.print());
  $('b-save').addEventListener('click', download);
  $('b-reset').addEventListener('click', () => {
    state.title = DEFAULT_TITLE;
    state.period = '';
    state.blocks = START.slice();
    inTitle.value = DEFAULT_TITLE;
    inPeriod.value = '';
    render();
  });

  if (window.ResizeObserver) {
    new ResizeObserver(() => requestAnimationFrame(checkFit)).observe(canvas);
  }
  window.addEventListener('resize', () => requestAnimationFrame(checkFit));

  renderPalette();
  render();
})();
