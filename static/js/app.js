/* 테니스 타점 복원 데모: 숫자 채우기, 대표 영상 제어, 넘겨 보기, 결과 경향 그림·표, 타구별 장면.
   숫자는 모두 static/js/data.js(window.DEMO)에서 온다. 외부 스크립트를 쓰지 않는다. */
(function () {
  "use strict";
  var D = window.DEMO;
  if (!D) { console.warn("data.js 를 읽지 못했습니다"); return; }

  // ---------- 공통 ----------
  var MINUS = "−";
  function cm(v) {                      // cm 값: 소수 첫째 자리, 10 이상은 정수
    if (v == null || isNaN(v)) return "–";
    var r = Math.round(v * 10) / 10;
    return r >= 10 ? String(Math.round(v)) : r.toFixed(1);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- 문장 속 값 ----------
  var H = D.H || {}, T = H.trend || null, t10 = H.t10 || null;
  var hidden = D.hidden_labels || [];
  function m1(v) { return (Math.round(v / 10) / 10).toFixed(1); }   // cm → m, 소수 첫째 자리
  var fm = H.failed_unknown_meds_cm;                                  // 검출 실패 타구들의 타구별 중앙값 범위(cm)
  var hero = H.hero;
  var V = {
    n_strokes: String(D.n_strokes),
    b0_med: cm(H.b0_med),
    m_med: cm(H.m_med),
    known_med: cm(H.known_med),
    n_within10_strokes: String(H.n_within10_strokes),
    n_det_ok: String(H.n_det_ok),
    n_det_failed: String(H.n_det_failed),
    phases_min: String(H.phases_min),
    phases_max: String(H.phases_max),
    n_candidates: String(H.n_candidates),
    n_videos: String(H.n_videos),
    failed_med_m: fm ? (m1(fm[0]) === m1(fm[1]) ? m1(fm[0]) : m1(fm[0]) + "–" + m1(fm[1])) : "–",
    hero_label: hero ? hero.label : "",
    hero_rank: hero ? (hero.rank === 1 ? "(" + D.n_strokes + "개 중 오차가 가장 작은 타구)" : "(오차 " + hero.rank + "번째로 작은 타구)") : "",
    trend_b0_peak: T ? String(Math.round(T.b0_peak)) : "–",
    trend_ai_range: T ? Math.round(T.ai_min) + "–" + Math.round(T.ai_max) : "–",
    // "타구 11·12": 둘째부터는 앞의 "타구 "를 뺀다
    hidden_labels: hidden.map(function (s, i) { return i ? s.replace(/^타구\s*/, "") : s; }).join("·"),
    built: D.built
  };
  // 자료로 확인한 주장만 싣는다(build_data.py 가 경고를 찍는다)
  var byLabel = {};
  D.strokes.forEach(function (s) { byLabel[s.label] = s; });
  var IF = {
    hero: !!hero,
    hidden: hidden.length > 0,
    hidden_failed: hidden.length > 0 && hidden.every(function (l) { return byLabel[l] && byLabel[l].det_failed; }),
    known_all10: H.ok_known_over10 === 0,
    t10: !!(t10 && t10.post_missed)
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-if]"), function (e) {
    if (!IF[e.getAttribute("data-if")]) e.parentNode.removeChild(e);
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-k]"), function (e) {
    var k = e.getAttribute("data-k");
    if (V[k] != null) e.textContent = V[k];
  });

  // ---------- 대표 영상 ----------
  (function () {
    var v = document.getElementById("hero-video");
    var box = document.getElementById("hero-video-box");
    var btn = document.getElementById("hero-play");
    if (!v || !box || !btn) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function sync() {
      var paused = v.paused;
      box.classList.toggle("is-paused", paused);
      box.classList.toggle("is-playing", !paused);
      btn.setAttribute("aria-label", paused ? "영상 재생" : "영상 일시 정지");
    }
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); }
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    // 영상을 읽지 못하면 영상과 단추를 치우고 배경의 대표 그림만 남긴다(이 줄보다 먼저 난 오류도 본다)
    function fail() { box.classList.add("is-failed"); }
    if (v.error) fail();
    v.addEventListener("error", fail);
    btn.addEventListener("click", function () {
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    });
    v.addEventListener("click", function () { btn.click(); });
    // 저전력 모드 등으로 자동 재생이 막히면 재생 단추를 보인다
    if (!reduce) {
      var p = v.play();
      if (p && p.catch) p.catch(function () { sync(); });
    }
    sync();
  })();

  // ---------- 넘겨 보기 ----------
  (function () {
    var list = D.scrub || [];
    var section = document.getElementById("scrub");
    if (!list.length) { if (section) section.hidden = true; return; }
    var chips = document.getElementById("scrub-chips");
    var canvas = document.getElementById("scrub-canvas");
    var ctx = canvas.getContext("2d");
    var range = document.getElementById("scrub-range");
    var ticks = document.getElementById("scrub-ticks");
    var tEl = document.getElementById("scrub-time");
    var badge = document.getElementById("scrub-badge");
    var togAI = document.getElementById("tog-ai");
    var togTruth = document.getElementById("tog-truth");
    var step30 = document.getElementById("step30");

    var cur = null, idx = 0, started = false, drawn = null;
    var show = { ai: true, truth: false };
    var cache = {};                    // id -> [Image]

    function images(S) {
      if (!cache[S.id]) cache[S.id] = new Array(S.frames.length);
      return cache[S.id];
    }
    function load(S, i, cb) {
      var arr = images(S);
      if (arr[i]) { if (cb) { if (arr[i]._ok) cb(); else arr[i]._cbs.push(cb); } return; }
      var im = new Image();
      im._ok = false; im._cbs = cb ? [cb] : [];
      im.onload = function () { im._ok = true; im._cbs.forEach(function (f) { f(); }); im._cbs = []; };
      im.onerror = function () { im._bad = true; };
      im.decoding = "async";
      im.src = S.dir + S.frames[i][0];
      arr[i] = im;
    }
    function preloadAll(S) {
      // 시작 프레임과 30 fps 프레임 먼저, 나머지는 가까운 순서로
      var order = S.frames.map(function (f, i) { return i; });
      order.sort(function (a, b) {
        var pa = S.frames[a][2] != null ? 0 : 1, pb = S.frames[b][2] != null ? 0 : 1;
        return pa - pb || Math.abs(a - S.start) - Math.abs(b - S.start);
      });
      order.forEach(function (i) { load(S, i); });
    }

    function fitCanvas() {
      var w = canvas.clientWidth || 640;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(w * dpr), H = Math.round(W * 3 / 4);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; if (drawn != null) draw(); }
    }

    function shadowStroke(fn, color, lw, u) {
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = lw + 2.5 * u; fn(); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = lw; fn(); ctx.stroke();
      ctx.restore();
    }

    function draw() {
      var S = cur; if (!S || !started) return;
      var arr = images(S);
      var im = arr[idx];
      var useIdx = idx;
      if (!im || !im._ok) {               // 아직 없으면 그려 둔 그림을 유지하고, 오면 다시 그린다
        load(S, idx, function () { if (cur === S && useIdx === idx) draw(); });
        if (drawn && drawn.id === S.id) return;
        im = null;
        for (var d = 1; d < S.frames.length && !im; d++) {
          [idx - d, idx + d].forEach(function (j) { if (!im && arr[j] && arr[j]._ok) im = arr[j]; });
        }
        if (!im) return;
      }
      var W = canvas.width, H = canvas.height;
      var iw = S.size[0];
      var k = W / iw;                                  // 캔버스 px / 그림 px
      var u = W / (canvas.clientWidth || W);           // 캔버스 px / CSS px
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(im, 0, 0, W, H);
      var rb = (S.ball_px || 40) / 2;
      var f = S.frames[idx];
      function P(p) { return [p[0] * k, p[1] * k]; }

      if (show.ai) {
        if (f[2] != null && S.dets[String(f[2])]) {    // 30 fps 프레임: 검출된 공
          var c = P(S.dets[String(f[2])]);
          shadowStroke(function () { ctx.beginPath(); ctx.arc(c[0], c[1], 1.3 * rb * k, 0, 2 * Math.PI); }, "#d4e34a", 2.5 * u, u);
        }
        if (S.est) {                                    // 추정 타점: 십자(95% 타원은 그리지 않는다)
          var e = P(S.est);
          // 가운데 비우는 폭은 요약 그림처럼 타원 크기로 정한다
          var gap = 0.3 * rb * k, arm = rb * k + 12 * u;
          shadowStroke(function () {
            ctx.beginPath();
            ctx.moveTo(e[0] - arm, e[1]); ctx.lineTo(e[0] - gap, e[1]);
            ctx.moveTo(e[0] + gap, e[1]); ctx.lineTo(e[0] + arm, e[1]);
            ctx.moveTo(e[0], e[1] - arm); ctx.lineTo(e[0], e[1] - gap);
            ctx.moveTo(e[0], e[1] + gap); ctx.lineTo(e[0], e[1] + arm);
          }, "#d4e34a", 2 * u, u);
        }
      }
      if (show.truth && S.actual) {                     // 실제 타점: 흰 고리와 오차
        var a = P(S.actual);
        shadowStroke(function () { ctx.beginPath(); ctx.arc(a[0], a[1], rb * k + 5 * u, 0, 2 * Math.PI); }, "#ffffff", 2.5 * u, u);
        if (S.err_cm != null) {
          var txt = "오차 " + cm(S.err_cm) + " cm";
          ctx.save();
          ctx.font = "700 " + Math.round(15 * u) + "px " + getComputedStyle(document.body).fontFamily;
          var tw = ctx.measureText(txt).width, ph = 28 * u, pw = tw + 20 * u, x = W - pw - 10 * u, y = H - ph - 10 * u;
          ctx.fillStyle = "rgba(7,18,22,0.78)";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, pw, ph, 7 * u); else ctx.rect(x, y, pw, ph);
          ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.textBaseline = "middle";
          ctx.fillText(txt, x + 10 * u, y + ph / 2 + 0.5 * u);
          ctx.restore();
        }
      }
      drawn = { id: S.id, idx: idx };
    }

    function readout() {
      var f = cur.frames[idx];
      var ms = Math.round(f[1]);
      var s = ms > 0 ? "+" + ms : ms < 0 ? MINUS + Math.abs(ms) : "0";
      tEl.textContent = "임팩트 " + s + " ms";
      badge.hidden = f[2] == null;
      range.setAttribute("aria-valuetext", "임팩트 " + s + " ms" + (f[2] != null ? ", 30 fps 프레임" : ""));
    }

    function setIdx(i) {
      idx = Math.max(0, Math.min(cur.frames.length - 1, i));
      range.value = String(idx);
      readout();
      draw();
    }

    function buildTicks(S) {
      ticks.innerHTML = "";
      ticks.appendChild(el("div", "base"));
      var n = S.frames.length;
      function pos(i) { return (n > 1 ? i / (n - 1) : 0) * 100 + "%"; }
      S.frames.forEach(function (f, i) {
        if (f[2] == null) return;
        var t = el("div", "t30"); t.style.left = pos(i); ticks.appendChild(t);
      });
      // 시간 눈금: 프레임 번호 사이를 보간해 25 ms 간격으로
      var t0 = S.frames[0][1], t1 = S.frames[n - 1][1];
      function idxOf(t) {
        for (var i = 0; i < n - 1; i++) {
          var a = S.frames[i][1], b = S.frames[i + 1][1];
          if (t >= a && t <= b) return i + (b > a ? (t - a) / (b - a) : 0);
        }
        return null;
      }
      for (var t = Math.ceil(t0 / 25) * 25; t <= t1; t += 25) {
        var fi = idxOf(t); if (fi == null) continue;
        var m = el("div", "tm"); m.style.left = pos(fi); ticks.appendChild(m);
        var lab = el("div", "tl", t === 0 ? "0 ms" : (t > 0 ? "+" + t : MINUS + Math.abs(t)));
        lab.style.left = pos(fi); ticks.appendChild(lab);
      }
    }

    function select(S) {
      cur = S;
      Array.prototype.forEach.call(chips.children, function (c) {
        c.setAttribute("aria-checked", String(c.getAttribute("data-id") === S.id));
        c.tabIndex = c.getAttribute("data-id") === S.id ? 0 : -1;
      });
      range.max = String(S.frames.length - 1);
      buildTicks(S);
      drawn = null;
      setIdx(S.start);
      if (started) preloadAll(S);
    }

    list.forEach(function (S) {
      var c = el("button", "chip", S.label);
      c.type = "button"; c.setAttribute("role", "radio"); c.setAttribute("data-id", S.id);
      c.addEventListener("click", function () { if (cur !== S) select(S); });
      c.addEventListener("keydown", function (ev) {
        var d = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var j = (list.indexOf(cur) + d + list.length) % list.length;
        select(list[j]); chips.children[j].focus();
      });
      chips.appendChild(c);
    });

    range.addEventListener("input", function () { setIdx(parseInt(range.value, 10)); });
    // 막대의 어디를 누르거나 끌어도 그 위치의 프레임으로 간다. iOS Safari 의 range 는 손잡이를 정확히
    // 잡아야만 움직이므로 누른 위치로 직접 계산한다. 키보드와 화면 낭독기는 range 가 그대로 받는다.
    if (window.PointerEvent) {
      var track = range.parentNode, drag = null;        // drag: { id, x, y, on }
      track.classList.add("is-seek");
      var seek = function (ev) {
        var r = track.getBoundingClientRect(), pad = 14;  // 손잡이 반지름. 눈금(.ticks)과 같은 구간을 쓴다
        setIdx(Math.round((ev.clientX - r.left - pad) / Math.max(1, r.width - 2 * pad) * (cur.frames.length - 1)));
      };
      var capture = function (ev) { try { track.setPointerCapture(ev.pointerId); } catch (e) {} };
      track.addEventListener("pointerdown", function (ev) {
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, on: ev.pointerType === "mouse" };
        if (drag.on) { ev.preventDefault(); range.focus(); capture(ev); seek(ev); }
      });
      // 터치는 가로로 움직이거나 그대로 뗄 때 반응한다(세로로 미는 것은 페이지 스크롤)
      track.addEventListener("pointermove", function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        if (!drag.on) {
          var dx = Math.abs(ev.clientX - drag.x), dy = Math.abs(ev.clientY - drag.y);
          if (dx < 4 && dy < 4) return;
          if (dy > dx) { drag = null; return; }
          drag.on = true; capture(ev);
        }
        seek(ev);
      });
      track.addEventListener("pointerup", function (ev) {
        if (!drag || ev.pointerId !== drag.id) return;
        if (!drag.on) seek(ev);
        drag = null;
      });
      track.addEventListener("pointercancel", function () { drag = null; });
    }
    function toggle(btn, key) {
      btn.addEventListener("click", function () {
        show[key] = !show[key];
        btn.setAttribute("aria-pressed", String(show[key]));
        draw();
      });
    }
    toggle(togAI, "ai");
    toggle(togTruth, "truth");
    step30.addEventListener("click", function () {
      var n = cur.frames.length;
      for (var d = 1; d <= n; d++) {
        var j = (idx + d) % n;
        if (cur.frames[j][2] != null) { setIdx(j); return; }
      }
    });

    function start() {
      if (started) return;
      started = true;
      fitCanvas();
      load(cur, cur.start, function () { draw(); });
      preloadAll(cur);
    }
    select(list[0]);
    // 시작 프레임 한 장만 미리 받고, 나머지는 이 절이 화면에 가까워지면 받는다(첫 화면의 영상이 먼저 오게)
    load(cur, cur.start);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { start(); io.disconnect(); }
      }, { rootMargin: "300px 0px" });
      io.observe(section);
    } else start();
    window.addEventListener("resize", function () { if (started) fitCanvas(); });
  })();

  // ---------- 결과: 임팩트 위치에 따른 오차 경향(SVG) ----------
  (function () {
    var host = document.getElementById("trend");
    if (!host || !T) return;
    var NS = "http://www.w3.org/2000/svg";
    var bins = T.bins, NB = bins.length;
    var SER = [{ key: "b0", name: "복원 없음" }, { key: "ai", name: "AI 복원" }];
    function pct(v) { return Math.round(v * 100); }
    function binName(b) { return "임팩트 위치 " + pct(b.lo) + "–" + pct(b.hi) + "%"; }

    // 화면 낭독용 표
    var tb = document.querySelector("#trend-table tbody");
    if (tb) bins.forEach(function (b) {
      var tr = el("tr");
      tr.appendChild(el("th", null, pct(b.lo) + "–" + pct(b.hi) + "%")).setAttribute("scope", "row");
      SER.forEach(function (s) { tr.appendChild(el("td", null, cm(b[s.key].med) + " cm")); });
      tb.appendChild(tr);
    });

    var tip = el("div", "tip"); tip.hidden = true; host.appendChild(tip);
    var lastW = 0, G = null, active = -1;

    function S(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    function txt(parent, cls, x, y, s, anchor) {
      var t = S("text", { "class": cls, x: x, y: y, "text-anchor": anchor || "start" }, parent);
      t.textContent = s;
      return t;
    }

    function render() {
      var W = host.clientWidth;
      if (!W || W === lastW) return;
      lastW = W;
      var old = host.querySelector("svg"); if (old) host.removeChild(old);
      var narrow = W < 520, Hh = narrow ? 240 : 290;
      var svg = S("svg", { role: "img", "aria-label": "임팩트 시점에 따른 오차. 복원 없음은 임팩트가 두 프레임의 중간에 가까울수록 커지고, AI 복원은 어디서나 낮다. 같은 값이 표로 있다." });
      host.insertBefore(svg, tip);
      var gBack = S("g", {}, svg), gBand = S("g", {}, svg), gMid = S("g", {}, svg), gLine = S("g", {}, svg),
          gDot = S("g", {}, svg), gFront = S("g", {}, svg);

      // 1) 글자 너비를 먼저 재서 여백을 정한다
      var ymax = 10;
      bins.forEach(function (b) { SER.forEach(function (s) { if (b[s.key].q3 != null) ymax = Math.max(ymax, b[s.key].q3); }); });
      ymax = Math.ceil(ymax / 10) * 10;
      var yt = []; for (var v = 0; v <= ymax; v += 10) yt.push(v);
      var tickW = 0;
      var tickNodes = yt.map(function (v) { var t = txt(gBack, "tick", 0, 0, String(v), "end"); tickW = Math.max(tickW, t.getComputedTextLength()); return t; });
      var x0 = Math.ceil(tickW) + 8, x1 = W - 6;
      // 가로축 이름이 한 줄에 들어가지 않으면 괄호 앞에서 두 줄로 나눈다
      var xTitle = ["임팩트 시점", "(연속한 두 30 fps 프레임 사이, 33 ms)"];
      var probe = txt(gBack, "axis-title", 0, 0, xTitle.join(" "));
      var xmid = (x0 + x1) / 2;
      var lines = probe.getComputedTextLength() > 2 * (W - xmid) - 4 ? xTitle : [xTitle.join(" ")];
      gBack.removeChild(probe);
      var plotTop = 30, plotBot = Hh - 25 - 17 * lines.length;
      function X(a) { return x0 + (x1 - x0) * a; }
      function Y(v) { return plotBot - (plotBot - plotTop) * v / ymax; }
      lines.forEach(function (s, i) { txt(gBack, "axis-title", xmid, plotBot + 36 + 17 * i, s, "middle"); });
      svg.setAttribute("viewBox", "0 0 " + W + " " + Hh); svg.setAttribute("width", W); svg.setAttribute("height", Hh);

      // 2) 축과 격자: 가로선(10 cm 는 포스터 목표 점선), 세로선(두 프레임과 그 중간)
      txt(gBack, "axis-title", 0, 13, "오차 (cm)");
      yt.forEach(function (v, i) {
        tickNodes[i].setAttribute("x", x0 - 7); tickNodes[i].setAttribute("y", Y(v) + 4);
        if (v !== D.target_cm) S("line", { "class": v === 0 ? "axis" : "grid", x1: x0, x2: x1, y1: Y(v), y2: Y(v) }, gBack);
      });
      [0, 0.5, 1].forEach(function (a) { S("line", { "class": a === 0 ? "axis" : "grid", x1: X(a), x2: X(a), y1: plotTop, y2: plotBot }, gBack); });
      txt(gBack, "tick", X(0), plotBot + 17, "직전 프레임", "start");
      txt(gBack, "tick", X(0.5), plotBot + 17, "두 프레임의 중간", "middle");
      txt(gBack, "tick", X(1), plotBot + 17, "다음 프레임", "end");
      var hl = S("rect", { "class": "hl", x: 0, y: plotTop, width: 0, height: plotBot - plotTop }, gBack);
      hl.style.display = "none";

      // 3) 계열마다 사분위 띠, 중앙값 선, 구간 가운데의 점
      var cx = bins.map(function (b) { return X((b.lo + b.hi) / 2); });
      var dots = [];
      SER.forEach(function (s) {
        var up = [], dn = [], md = [];
        bins.forEach(function (b, i) {
          var q = b[s.key];
          if (q.med == null) return;
          up.push(cx[i] + "," + Y(q.q3)); dn.unshift(cx[i] + "," + Y(q.q1)); md.push(cx[i] + "," + Y(q.med));
        });
        S("polygon", { "class": "band band-" + s.key, points: up.concat(dn).join(" ") }, gBand);
        S("polyline", { "class": "line line-" + s.key, points: md.join(" ") }, gLine);
        dots.push(bins.map(function (b, i) {
          return b[s.key].med == null ? null : S("circle", { "class": "dot dot-" + s.key, cx: cx[i], cy: Y(b[s.key].med), r: 3.5 }, gDot);
        }));
      });
      // 포스터 목표: 띠 위에 점선, 글자는 왼쪽(두 계열이 모두 낮은 쪽)
      S("line", { "class": "target", x1: x0, x2: x1, y1: Y(D.target_cm), y2: Y(D.target_cm) }, gMid);
      txt(gFront, "target-label", x0 + 5, Y(D.target_cm) - 6, "포스터 목표 " + cm(D.target_cm) + " cm");

      // 4) 계열 이름을 선 옆에 직접 적는다(짧은 색 선 + 글자색 글자)
      var binW = (x1 - x0) / NB;
      function label(s, xc, yBase) {
        var g = S("g", {}, gFront);
        var t = txt(g, "s-label", 0, yBase, s.name);
        var w = t.getComputedTextLength(), sw = 14, total = sw + 5 + w;
        var left = Math.max(x0 + 2, Math.min(x1 - total, xc - total / 2));
        S("line", { "class": "key key-" + s.key, x1: left, x2: left + sw, y1: yBase - 4.5, y2: yBase - 4.5 }, g);
        t.setAttribute("x", left + sw + 5);
        return { left: left, right: left + total, w: total };
      }
      function span(xc, w) {                       // 글자 폭이 덮는 구간 번호들
        var r = [];
        for (var i = 0; i < NB; i++) if (Math.abs(cx[i] - xc) <= w / 2 + binW / 2) r.push(i);
        return r;
      }
      function qmax(key, f, ids) { return Math.max.apply(null, ids.map(function (i) { var v = bins[i][key][f]; return v == null ? -1 : v; })); }
      function qmin(key, f, ids) { return Math.min.apply(null, ids.map(function (i) { var v = bins[i][key][f]; return v == null ? 1e9 : v; })); }
      // 복원 없음: 중앙값이 가장 큰 구간의 띠 위
      var kPeak = 0;
      bins.forEach(function (b, i) { if (b.b0.med != null && b.b0.med > bins[kPeak].b0.med) kPeak = i; });
      var lw = 84;
      var yB0 = Math.max(plotTop + 12, Y(qmax("b0", "q3", span(cx[kPeak], lw))) - 7);
      label(SER[0], cx[kPeak], yB0);
      // AI 복원: AI 띠 위와 복원 없음 띠 아래 사이가 가장 넓은 구간
      var best = null;
      for (var i = 1; i < NB - 1; i++) {
        var ids = span(cx[i], lw);
        var yTop = Y(qmax("ai", "q3", ids)) - 5, yLim = Y(qmin("b0", "q1", ids));
        var room = yTop - yLim;
        if (!best || room > best.room) best = { i: i, room: room, y: yTop };
      }
      label(SER[1], cx[best.i], best.y);

      G = { x0: x0, x1: x1, plotTop: plotTop, plotBot: plotBot, cx: cx, dots: dots, hl: hl, binW: binW };
      active = -1;
      var hit = S("rect", { "class": "hit", x: x0, y: plotTop, width: x1 - x0, height: plotBot - plotTop }, svg);
      hit.addEventListener("pointermove", onMove);
      hit.addEventListener("pointerdown", onMove);
      hit.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse") hide(); });
    }

    function setActive(i) {
      if (active === i) return;
      G.dots.forEach(function (row) {                // 고른 구간의 점을 키운다
        if (row[active]) row[active].setAttribute("r", 3.5);
        if (i >= 0 && row[i]) row[i].setAttribute("r", 5.5);
      });
      active = i;
      if (i < 0) { G.hl.style.display = "none"; return; }
      G.hl.style.display = "";
      G.hl.setAttribute("x", G.x0 + i * G.binW); G.hl.setAttribute("width", G.binW);
    }
    function hide() { tip.hidden = true; if (G) setActive(-1); }
    function onMove(ev) {
      var r = ev.currentTarget.ownerSVGElement.getBoundingClientRect();
      var mx = ev.clientX - r.left;
      var i = Math.max(0, Math.min(NB - 1, Math.floor((mx - G.x0) / G.binW)));
      setActive(i);
      var b = bins[i];
      tip.innerHTML = "";
      tip.appendChild(el("div", "tip-head", binName(b)));
      SER.forEach(function (s) {
        var row = el("div", "tip-row");
        row.appendChild(el("i", "tip-key key-" + s.key));
        row.appendChild(document.createTextNode(s.name + " " + cm(b[s.key].med) + " cm"));
        tip.appendChild(row);
      });
      tip.hidden = false;
      // 말풍선은 고른 구간을 가리지 않게 옆에 둔다
      var tw = tip.offsetWidth, W = host.clientWidth, x = G.cx[i];
      var lx = i < NB / 2 ? x + G.binW / 2 + 6 : x - G.binW / 2 - 6 - tw;
      lx = Math.max(0, Math.min(W - tw, lx));
      tip.style.left = lx + "px"; tip.style.top = (G.plotTop - 4) + "px";
    }
    document.addEventListener("pointerdown", function (ev) { if (!host.contains(ev.target)) hide(); });

    render();
    // 글꼴이 바뀌면 글자 너비를 다시 잰다(글꼴 CSS 는 늦게 적용되므로 받을 때마다)
    function refit() { lastW = 0; render(); }
    if (document.fonts) {
      if (document.fonts.ready) document.fonts.ready.then(refit);
      if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refit);
    }
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(render, 120); });
  })();

  // ---------- 타구별 수치 표(타구별 중앙값만) ----------
  (function () {
    var tb = document.querySelector("#stroke-table tbody");
    if (!tb) return;
    D.strokes.forEach(function (s) {
      var tr = el("tr");
      var td = el("td");
      td.appendChild(el("span", "nw", s.label));
      if (s.det_failed) td.appendChild(el("small", "flag", "공 검출 실패"));
      tr.appendChild(td);
      ["B0", "model_unknown", "model_known"].forEach(function (k) {
        var q = s.stats[k];
        tr.appendChild(el("td", null, q && q.n ? cm(q.med) + (q.n < q.n_cases ? "*" : "") : "–"));
      });
      tb.appendChild(tr);
    });
  })();

  // ---------- 타구별 장면 ----------
  (function () {
    var g = document.getElementById("gallery");
    if (!g) return;
    var items = D.gallery || [];
    items.forEach(function (it) {
      var f = el("figure");
      var img = el("img");
      img.loading = "lazy"; img.decoding = "async"; img.width = 1200; img.height = 900; img.src = it.img;
      img.alt = it.label + ": 30 fps 프레임의 공 검출, 추정 타점, 실제 타점";
      img.addEventListener("error", function () { f.remove(); if (!g.children.length) g.appendChild(el("p", "gallery-empty", "그림을 준비하고 있습니다.")); });
      f.appendChild(img);
      var cap = el("figcaption");
      cap.appendChild(el("b", null, it.label));
      cap.appendChild(el("span", "g-src", it.channel || ""));
      if (IF.t10 && t10.id === it.id) {
        var note = el("span", "g-note", "임팩트 직후 공 미검출 → 임팩트 시각을 알면 오차 ");
        note.appendChild(el("span", "nw", cm(t10.unknown) + " → " + cm(t10.known) + " cm"));
        cap.appendChild(note);
      }
      f.appendChild(cap);
      g.appendChild(f);
    });
    if (!items.length) g.appendChild(el("p", "gallery-empty", "그림을 준비하고 있습니다."));
  })();

  // ---------- 영상 출처 ----------
  (function () {
    var ul = document.getElementById("sources");
    if (!ul) return;
    (D.sources || []).forEach(function (s) {
      var li = el("li");
      li.appendChild(document.createTextNode((s.channel || "") + ", 「"));
      if (s.url) {
        var a = el("a", null, s.title || s.url); a.href = s.url; a.target = "_blank"; a.rel = "noopener";
        li.appendChild(a);
      } else li.appendChild(document.createTextNode(s.title || ""));
      li.appendChild(document.createTextNode("」, " + s.fps + " fps"));
      ul.appendChild(li);
    });
  })();
})();
