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
})();
