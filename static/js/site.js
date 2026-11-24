// data.js의 값으로 수치 카드, 단계, 지연 막대, 측정 조건을 그리고, 영상 자리를 채운다.
(function () {
  var D = window.DEMO || {};
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SEG = ['#134f5c', '#1a6e80', '#4f93a3', '#86b6c2', '#b9d4db'];   // 단계 순서대로 진한 틸 → 옅은 틸

  if (D.status) $('status').textContent = D.status;
  if (D.refsUrl) $('refs-link').href = D.refsUrl;
  if (D.heroCaption) $('hero-cap').innerHTML = D.heroCaption;

  // 핵심 수치
  $('stats').innerHTML = (D.stats || []).map(function (s) {
    var v = s.value == null ? '—' : esc(s.value) + '<small>' + esc(s.unit || '') + '</small>';
    return '<div class="stat"><div class="stat-value">' + v + '</div>' +
           '<div class="stat-name">' + esc(s.label) + '</div>' +
           '<div class="stat-desc">' + esc(s.desc || '') + '</div></div>';
  }).join('');

  // 단계
  var stages = D.stages || [];
  $('steps').innerHTML = stages.map(function (s, i) {
    var ms = s.ms == null ? '<span class="step-ms na">— ms</span>' : '<span class="step-ms">' + esc(s.ms) + ' ms</span>';
    return '<li class="step"><div class="step-num">' + (i + 1) + '</div><div>' +
           '<div class="step-where">' + esc(s.where) + '</div>' +
           '<div class="step-name">' + esc(s.name) + '</div>' +
           '<div class="step-desc">' + esc(s.desc || '') + '</div></div>' + ms + '</li>';
  }).join('');

  // 지연 막대: 모든 단계가 측정된 경우에만 그린다
  var bar = $('latency-bar');
  var measured = stages.length && stages.every(function (s) { return typeof s.ms === 'number'; });
  if (!measured) {
    bar.classList.add('empty');
  } else {
    var total = stages.reduce(function (a, s) { return a + s.ms; }, 0);
    var scale = Math.max(total, D.budgetMs || 1000);
    bar.innerHTML = stages.map(function (s, i) {
      return '<div class="seg" style="width:' + (100 * s.ms / scale) + '%;background:' + SEG[i % SEG.length] +
             '" title="' + esc(s.name) + ' ' + s.ms + ' ms"></div>';
    }).join('') + '<div class="budget" style="left:' + (100 * (D.budgetMs || 1000) / scale) + '%"></div>';
    $('latency-legend').innerHTML = stages.map(function (s, i) {
      return '<span style="--c:' + SEG[i % SEG.length] + '">' + esc(s.name) + ' ' + s.ms + ' ms</span>';
    }).join('');
    $('latency-total').textContent = '합계 ' + (total / 1000).toFixed(2) + '초';
  }

  // 측정 조건
  $('conds').innerHTML = (D.conditions || []).map(function (c) {
    return '<div><dt>' + esc(c.k) + '</dt><dd' + (c.v == null ? ' class="na">작성 예정' : '>' + esc(c.v)) + '</dd></div>';
  }).join('');

  // 영상 자리: data-src의 후보를 차례로 시도하고, 모두 없으면 자리 표시만 남긴다
  Array.prototype.forEach.call(document.querySelectorAll('.media'), function (el) {
    var cands = (el.getAttribute('data-src') || '').split('|').filter(Boolean);
    (function tryNext() {
      var src = cands.shift();
      if (!src) { el.classList.add('empty'); return; }
      var video = /\.(mp4|webm)$/i.test(src);
      var m = document.createElement(video ? 'video' : 'img');
      if (video) { m.muted = true; m.loop = true; m.autoplay = true; m.playsInline = true; m.setAttribute('playsinline', ''); }
      m.addEventListener('error', function () { m.remove(); tryNext(); });
      m.src = src;
      m.alt = el.getAttribute('data-label') || '';
      el.appendChild(m);
    })();
  });
})();
