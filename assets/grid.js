/* Генерация повторяющихся ячеек (дни 1..31, клетки трекеров),
   чтобы HTML страниц оставался коротким и наглядным. */
(function () {
  // страница открыта как миниатюра в index.html
  if (window.self !== window.top) {
    document.documentElement.classList.add('thumb-root');
  }

  // строка шапки с номерами дней: <tr data-days-head> [<th class="lbl">..</th>]
  document.querySelectorAll('tr[data-days-head]').forEach(function (tr) {
    var n = parseInt(tr.dataset.daysHead, 10) || 31;
    for (var i = 1; i <= n; i++) {
      var th = document.createElement('th');
      th.className = 'dnum';
      th.textContent = i;
      tr.appendChild(th);
    }
    if (tr.hasAttribute('data-sum')) {
      var ths = document.createElement('th');
      ths.className = 'sum';
      ths.textContent = '✓';
      tr.appendChild(ths);
    }
  });

  // строка привычки: <tr data-days><td class="lbl">..</td></tr> -> 31 пустых td (+ sum)
  document.querySelectorAll('tr[data-days]').forEach(function (tr) {
    var n = parseInt(tr.dataset.days, 10) || 31;
    for (var i = 1; i <= n; i++) {
      var td = document.createElement('td');
      td.className = 'd';
      tr.appendChild(td);
    }
    if (tr.hasAttribute('data-sum')) {
      var sum = document.createElement('td');
      sum.className = 'sum';
      tr.appendChild(sum);
    }
  });

  // таблица из пустых ячеек: <table data-tgrid="22x6"> -> tbody с 22 рядами по 6 <td>
  document.querySelectorAll('[data-tgrid]').forEach(function (tbl) {
    var dims = tbl.dataset.tgrid.split('x');
    var rows = parseInt(dims[0], 10) || 1;
    var cols = parseInt(dims[1], 10) || 1;
    var body = document.createElement('tbody');
    for (var r = 0; r < rows; r++) {
      var tr = document.createElement('tr');
      for (var c = 0; c < cols; c++) {
        tr.appendChild(document.createElement('td'));
      }
      body.appendChild(tr);
    }
    tbl.appendChild(body);
  });

  // сетка клеток: <div data-cells="31" data-cell="pages"> -> div.cell
  document.querySelectorAll('[data-cells]').forEach(function (box) {
    var n = parseInt(box.dataset.cells, 10) || 31;
    var kind = box.dataset.cell || '';
    for (var i = 1; i <= n; i++) {
      var c = document.createElement('div');
      c.className = 'cell' + (kind ? ' ' + kind : '');
      var s = document.createElement('span');
      s.className = 'd';
      s.textContent = i;
      c.appendChild(s);
      box.appendChild(c);
    }
  });

  // повторяющиеся строки: <div data-rows="22" data-row="check"> -> div.row x N
  // kind: check (чекбокс + линия) | line (одна линия)
  document.querySelectorAll('[data-rows]').forEach(function (box) {
    var n = parseInt(box.dataset.rows, 10) || 1;
    var kind = box.dataset.row || 'line';
    for (var i = 0; i < n; i++) {
      var r = document.createElement('div');
      r.className = 'row';
      if (kind === 'check') {
        var b = document.createElement('span');
        b.className = 'box';
        r.appendChild(b);
      }
      var ln = document.createElement('span');
      ln.className = 'ln';
      r.appendChild(ln);
      box.appendChild(r);
    }
  });

  // сетка обложек: <div data-covers="16" data-stars="5"> -> div.cov (рамка .img + звёзды)
  document.querySelectorAll('[data-covers]').forEach(function (box) {
    var n = parseInt(box.dataset.covers, 10) || 16;
    var stars = parseInt(box.dataset.stars, 10) || 5;
    for (var i = 1; i <= n; i++) {
      var c = document.createElement('div');
      c.className = 'cov';
      var img = document.createElement('div');
      img.className = 'img';
      var st = document.createElement('div');
      st.className = 'stars';
      st.textContent = Array(stars + 1).join('☆');
      c.appendChild(img);
      c.appendChild(st);
      box.appendChild(c);
    }
  });

  // полоска-линейка дней: <div data-strip="31" data-strip-letters> -> строка букв
  // дней (пустая, подписываешь сам) + строка чисел 1..31
  document.querySelectorAll('[data-strip]').forEach(function (box) {
    var n = parseInt(box.dataset.strip, 10) || 31;
    if (box.hasAttribute('data-strip-letters')) {
      var letRow = document.createElement('div');
      letRow.className = 'srow letters';
      for (var l = 0; l < n; l++) {
        var le = document.createElement('span');
        le.className = 'sl';
        letRow.appendChild(le);
      }
      box.appendChild(letRow);
    }
    var numRow = document.createElement('div');
    numRow.className = 'srow';
    for (var i = 1; i <= n; i++) {
      var s = document.createElement('span');
      s.className = 'sd';
      s.textContent = i;
      numRow.appendChild(s);
    }
    box.appendChild(numRow);
  });

  // ось Y графика: <div data-axis="10" data-axis-from="4" data-axis-step="2">
  // подписи сверху вниз (старшая сверху), step по умолчанию 1
  document.querySelectorAll('[data-axis]').forEach(function (box) {
    var top = parseInt(box.dataset.axis, 10) || 10;
    var bottom = parseInt(box.dataset.axisFrom, 10) || 1;
    var step = parseInt(box.dataset.axisStep, 10) || 1;
    for (var v = top; v >= bottom; v -= step) {
      var s = document.createElement('span');
      s.className = 'axv';
      s.textContent = v;
      box.appendChild(s);
    }
  });

  // мини-календарь: <div data-mini-cal data-weeks="6">
  // -> шапка пн..вс + клетки
  // чисел в клетках нет — месяц каждый раз новый, числа вписываются от руки
  document.querySelectorAll('[data-mini-cal]').forEach(function (box) {
    var weeks = parseInt(box.dataset.weeks, 10) || 6;
    var head = document.createElement('div');
    head.className = 'mc-head';
    ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].forEach(function (nm) {
      var h = document.createElement('span');
      h.className = 'mh' + (nm === 'сб' || nm === 'вс' ? ' wk' : '');
      h.textContent = nm;
      head.appendChild(h);
    });
    box.appendChild(head);

    var body = document.createElement('div');
    body.className = 'mc-body';
    for (var i = 0; i < weeks * 7; i++) {
      var c = document.createElement('span');
      c.className = 'mc-c' + (i % 7 >= 5 ? ' wk' : '');
      body.appendChild(c);
    }
    box.appendChild(body);
  });
})();
