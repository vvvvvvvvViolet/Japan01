(() => {
  "use strict";

  // ---------- Constants ----------
  const LOGICAL_SIZE = 320; // logical px, matches canvas width/height attrs
  const SETTINGS_KEY = "hiragana_settings_v2";
  const STATS_KEY = "hiragana_stats_v2";
  const PASS_SCORE = 58;
  const INK_ALPHA_THRESHOLD = 24;
  const TOLERANCE_ALPHA_THRESHOLD = 10;

  // ---------- Language registry ----------
  const LANGUAGES = {
    hiragana: {
      label: "ひらがな",
      subtitle: "ฝึกเขียนฮิรางานะ",
      data: KANA_DATA,
      groups: [
        { key: "basic", label: "พื้นฐาน (あ〜ん) 46 ตัว" },
        { key: "dakuten", label: "เสียงกล้ำ (が ざ だ ば) 20 ตัว" },
        { key: "handakuten", label: "เสียงครึ่งกล้ำ (ぱ) 5 ตัว" },
        { key: "youon", label: "เสียงควบ (きゃ しゃ) 33 ตัว" },
      ],
      font: `"Hiragino Sans","Hiragino Kaku Gothic Pro","Yu Gothic","Noto Sans JP","Noto Sans CJK JP",sans-serif`,
      ttsLang: "ja-JP",
      promptLabel: "เขียนตัวอักษรที่อ่านว่า",
      answerVerb: "อ่านว่า",
    },
    chinese: {
      label: "汉字",
      subtitle: "ฝึกเขียนภาษาจีนพื้นฐาน",
      data: CHINESE_DATA,
      groups: [
        { key: "numbers", label: "ตัวเลข 1-10" },
        { key: "basic", label: "อักษรพื้นฐาน" },
        { key: "words", label: "คำศัพท์พื้นฐาน 2 ตัวอักษร" },
      ],
      font: `"PingFang SC","Noto Sans SC","Microsoft YaHei","Heiti SC","Noto Sans CJK JP",sans-serif`,
      ttsLang: "zh-CN",
      promptLabel: "เขียนตัวอักษรที่อ่านว่า (พินอิน)",
      answerVerb: "อ่านว่า",
    },
    english: {
      label: "Aa",
      subtitle: "ฝึกเขียนภาษาอังกฤษพื้นฐาน",
      data: ENGLISH_DATA,
      groups: [
        { key: "uppercase", label: "ตัวพิมพ์เล็ก → เขียนตัวพิมพ์ใหญ่" },
        { key: "lowercase", label: "ตัวพิมพ์ใหญ่ → เขียนตัวพิมพ์เล็ก" },
      ],
      font: `"Segoe UI","Arial","Helvetica",sans-serif`,
      ttsLang: "en-US",
      promptLabel: "เขียนตัวอักษรคู่กับ",
      answerVerb: "คู่กับ",
    },
  };

  function defaultGroupsByLang() {
    return {
      hiragana: { basic: true, dakuten: false, handakuten: false, youon: false },
      chinese: { numbers: true, basic: true, words: false },
      english: { uppercase: true, lowercase: true },
    };
  }

  function currentLang() {
    return LANGUAGES[settings.lang] || LANGUAGES.hiragana;
  }

  // ---------- DOM ----------
  const langGlyph = document.getElementById("langGlyph");
  const langSubtitle = document.getElementById("langSubtitle");
  const promptLabel = document.getElementById("promptLabel");
  const promptRomaji = document.getElementById("promptRomaji");
  const speakBtn = document.getElementById("speakBtn");
  const guideCanvas = document.getElementById("guideCanvas");
  const drawCanvas = document.getElementById("drawCanvas");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const undoBtn = document.getElementById("undoBtn");
  const clearBtn = document.getElementById("clearBtn");
  const checkBtn = document.getElementById("checkBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resultPanel = document.getElementById("resultPanel");
  const resultHeadline = document.getElementById("resultHeadline");
  const resultScore = document.getElementById("resultScore");
  const resultAnswer = document.getElementById("resultAnswer");
  const statAttempts = document.getElementById("statAttempts");
  const statAccuracy = document.getElementById("statAccuracy");
  const statStreak = document.getElementById("statStreak");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const langSelect = document.getElementById("langSelect");
  const groupCheckboxContainer = document.getElementById("groupCheckboxContainer");
  const penSizeInput = document.getElementById("penSize");
  const showGuideInput = document.getElementById("showGuide");
  const resetStatsBtn = document.getElementById("resetStatsBtn");
  const progressSummary = document.getElementById("progressSummary");

  // ---------- Persisted state ----------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }

  let settings = Object.assign(
    { lang: "hiragana", groupsByLang: defaultGroupsByLang(), penSize: 10, showGuide: true },
    loadJSON(SETTINGS_KEY, {})
  );
  if (!settings.groupsByLang) settings.groupsByLang = defaultGroupsByLang();
  let stats = loadJSON(STATS_KEY, { attempts: 0, correct: 0, streak: 0, perChar: {} });

  function persistSettings() { saveJSON(SETTINGS_KEY, settings); }
  function persistStats() { saveJSON(STATS_KEY, stats); }

  // ---------- Session state ----------
  let currentItem = null;
  let lastChar = null;
  let hasChecked = false;

  // ---------- Canvas setup (HiDPI) ----------
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL_SIZE * dpr;
    canvas.height = LOGICAL_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  const guideCtx = setupCanvas(guideCanvas);
  const drawCtx = setupCanvas(drawCanvas);
  const overlayCtx = setupCanvas(overlayCanvas);

  function drawGuide() {
    guideCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    if (!settings.showGuide) return;
    guideCtx.save();
    guideCtx.strokeStyle = "rgba(160,150,130,0.55)";
    guideCtx.setLineDash([6, 6]);
    guideCtx.lineWidth = 1;
    guideCtx.strokeRect(4, 4, LOGICAL_SIZE - 8, LOGICAL_SIZE - 8);
    guideCtx.beginPath();
    guideCtx.moveTo(LOGICAL_SIZE / 2, 4);
    guideCtx.lineTo(LOGICAL_SIZE / 2, LOGICAL_SIZE - 4);
    guideCtx.moveTo(4, LOGICAL_SIZE / 2);
    guideCtx.lineTo(LOGICAL_SIZE - 4, LOGICAL_SIZE / 2);
    guideCtx.stroke();
    guideCtx.beginPath();
    guideCtx.moveTo(4, 4);
    guideCtx.lineTo(LOGICAL_SIZE - 4, LOGICAL_SIZE - 4);
    guideCtx.moveTo(LOGICAL_SIZE - 4, 4);
    guideCtx.lineTo(4, LOGICAL_SIZE - 4);
    guideCtx.stroke();
    guideCtx.restore();
  }

  // ---------- Drawing engine (mouse / pen / touch via Pointer Events) ----------
  const strokes = []; // array of {points:[{x,y}], size}
  let activeStroke = null;

  function pointFromEvent(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const scaleX = LOGICAL_SIZE / rect.width;
    const scaleY = LOGICAL_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function redrawStrokes() {
    drawCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = "#1f2937";
    for (const stroke of strokes) {
      paintStroke(stroke);
    }
  }

  function paintStroke(stroke) {
    const pts = stroke.points;
    drawCtx.lineWidth = stroke.size;
    if (pts.length === 1) {
      drawCtx.beginPath();
      drawCtx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
      drawCtx.fillStyle = "#1f2937";
      drawCtx.fill();
      return;
    }
    drawCtx.beginPath();
    drawCtx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      drawCtx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    drawCtx.lineTo(last.x, last.y);
    drawCtx.stroke();
  }

  function onPointerDown(e) {
    if (hasChecked) return; // lock drawing after checking until "next"
    e.preventDefault();
    drawCanvas.setPointerCapture(e.pointerId);
    activeStroke = { points: [pointFromEvent(e)], size: Number(settings.penSize) };
    strokes.push(activeStroke);
    paintStroke(activeStroke);
  }
  function onPointerMove(e) {
    if (!activeStroke) return;
    e.preventDefault();
    activeStroke.points.push(pointFromEvent(e));
    redrawStrokes();
  }
  function endStroke(e) {
    if (!activeStroke) return;
    activeStroke = null;
    updateActionButtons();
  }

  drawCanvas.addEventListener("pointerdown", onPointerDown);
  drawCanvas.addEventListener("pointermove", onPointerMove);
  drawCanvas.addEventListener("pointerup", endStroke);
  drawCanvas.addEventListener("pointercancel", endStroke);
  drawCanvas.addEventListener("pointerleave", (e) => {
    if (e.buttons === 0) endStroke(e);
  });

  function clearDrawing() {
    strokes.length = 0;
    drawCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    updateActionButtons();
  }
  function undoStroke() {
    strokes.pop();
    redrawStrokes();
    updateActionButtons();
  }
  function updateActionButtons() {
    undoBtn.disabled = strokes.length === 0 || hasChecked;
    clearBtn.disabled = strokes.length === 0 || hasChecked;
    checkBtn.disabled = strokes.length === 0 || hasChecked;
  }

  clearBtn.addEventListener("click", clearDrawing);
  undoBtn.addEventListener("click", undoStroke);

  // ---------- Item pool & weighted picking ----------
  function activePool() {
    const lang = currentLang();
    const groupState = settings.groupsByLang[settings.lang] || {};
    const pool = lang.data.filter((item) => groupState[item.group]);
    if (pool.length) return pool;
    const fallbackGroup = lang.groups[0].key;
    return lang.data.filter((item) => item.group === fallbackGroup);
  }

  function weightFor(item) {
    const s = stats.perChar[item.char];
    if (!s || s.attempts === 0) return 3; // unseen items shown a bit more often
    const wrong = s.attempts - s.correct;
    const accuracy = s.correct / s.attempts;
    let w = 1 + wrong * 2.2;
    if (accuracy < 0.5) w += 3;
    return Math.max(w, 0.6);
  }

  function pickNextItem() {
    const pool = activePool();
    let candidates = pool;
    if (pool.length > 1) {
      candidates = pool.filter((item) => item.char !== lastChar);
    }
    const weights = candidates.map(weightFor);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  // ---------- Reference glyph rendering & scoring ----------
  function renderReferenceMask(text, w, h, font, blurPx, alphaThreshold) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d");
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = "#000";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    const fontScale = text.length > 1 ? 0.42 : 0.6;
    cx.font = `${Math.floor(h * fontScale)}px ${font}`;
    if (blurPx) cx.filter = `blur(${blurPx}px)`;
    cx.fillText(text, w / 2, h / 2 + h * 0.02, w * 0.86);
    const data = cx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    let count = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      if (data[i + 3] > alphaThreshold) {
        mask[p] = 1;
        count++;
      }
    }
    return { mask, count, canvas: c };
  }

  function maskFromCanvas(canvas, w, h, blurPx, alphaThreshold) {
    let sourceData;
    if (blurPx) {
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d");
      tctx.filter = `blur(${blurPx}px)`;
      tctx.drawImage(canvas, 0, 0, w, h);
      sourceData = tctx.getImageData(0, 0, w, h).data;
    } else {
      const ctx = canvas.getContext("2d");
      sourceData = ctx.getImageData(0, 0, w, h).data;
    }
    const mask = new Uint8Array(w * h);
    let count = 0;
    for (let i = 0, p = 0; i < sourceData.length; i += 4, p++) {
      if (sourceData[i + 3] > alphaThreshold) {
        mask[p] = 1;
        count++;
      }
    }
    return { mask, count };
  }

  function intersectionCount(maskA, maskB) {
    let n = 0;
    for (let i = 0; i < maskA.length; i++) {
      if (maskA[i] && maskB[i]) n++;
    }
    return n;
  }

  function scoreDrawing(text, font) {
    const w = drawCanvas.width;
    const h = drawCanvas.height;
    const toleranceBlur = Math.max(4, Math.round(w * 0.03));

    const exactRef = renderReferenceMask(text, w, h, font, 0, 90);
    const toleranceRef = renderReferenceMask(text, w, h, font, toleranceBlur, TOLERANCE_ALPHA_THRESHOLD);
    const user = maskFromCanvas(drawCanvas, w, h, 0, INK_ALPHA_THRESHOLD);
    const userDilated = maskFromCanvas(drawCanvas, w, h, toleranceBlur, TOLERANCE_ALPHA_THRESHOLD);

    if (user.count < w * h * 0.002) {
      return { score: 0, empty: true, refCanvas: exactRef.canvas };
    }

    const coverageHits = intersectionCount(exactRef.mask, userDilated.mask);
    const precisionHits = intersectionCount(toleranceRef.mask, user.mask);

    const coverage = exactRef.count ? coverageHits / exactRef.count : 0;
    const precision = user.count ? precisionHits / user.count : 0;

    const score = Math.round(100 * (0.55 * coverage + 0.45 * precision));
    return { score: Math.min(score, 100), empty: false, refCanvas: exactRef.canvas, coverage, precision };
  }

  function showOverlay(refCanvas) {
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.globalAlpha = 0.32;
    overlayCtx.drawImage(refCanvas, 0, 0);
    overlayCtx.restore();
  }
  function clearOverlay() {
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.restore();
  }

  // ---------- Check / Next flow ----------
  function checkAnswer() {
    if (!currentItem || strokes.length === 0) return;
    const result = scoreDrawing(currentItem.char, currentLang().font);
    hasChecked = true;

    const charKey = currentItem.char;
    if (!stats.perChar[charKey]) stats.perChar[charKey] = { attempts: 0, correct: 0 };
    stats.perChar[charKey].attempts++;
    stats.attempts++;

    const passed = !result.empty && result.score >= PASS_SCORE;
    if (passed) {
      stats.perChar[charKey].correct++;
      stats.correct++;
      stats.streak++;
    } else {
      stats.streak = 0;
    }
    persistStats();
    updateStatsBar();

    showOverlay(result.refCanvas);

    resultPanel.hidden = false;
    resultPanel.className = "result-panel " + (passed ? "correct" : "incorrect");
    resultHeadline.textContent = result.empty
      ? "ยังไม่ได้เขียนตัวอักษร"
      : passed
      ? "ถูกต้อง! 🎉"
      : "ยังไม่ตรงนัก ลองดูตัวอย่างด้านล่าง";
    resultScore.textContent = result.empty ? "" : `ความแม่นยำ ${result.score}%`;
    resultAnswer.innerHTML = `<span class="big">${currentItem.char}</span> ${currentLang().answerVerb} "${currentItem.reading}"`;

    checkBtn.disabled = true;
    undoBtn.disabled = true;
    clearBtn.disabled = true;
    nextBtn.disabled = false;
  }

  function nextRound() {
    currentItem = pickNextItem();
    lastChar = currentItem.char;
    hasChecked = false;
    promptLabel.textContent = currentLang().promptLabel;
    promptRomaji.textContent = currentItem.reading;
    clearDrawing();
    clearOverlay();
    resultPanel.hidden = true;
    nextBtn.disabled = true;
    updateActionButtons();
  }

  checkBtn.addEventListener("click", checkAnswer);
  nextBtn.addEventListener("click", nextRound);

  // ---------- Speak (TTS) ----------
  speakBtn.addEventListener("click", () => {
    if (!currentItem || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(currentItem.char);
    utter.lang = currentLang().ttsLang;
    utter.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });

  // ---------- Stats bar ----------
  function updateStatsBar() {
    statAttempts.textContent = stats.attempts;
    statAccuracy.textContent = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) + "%" : "0%";
    statStreak.textContent = stats.streak;
    renderProgressSummary();
  }

  function renderProgressSummary() {
    const seen = Object.keys(stats.perChar).length;
    progressSummary.textContent =
      `เขียนไปแล้ว ${stats.attempts} ครั้ง จาก ${seen} ตัวอักษร (ทุกภาษารวมกัน)\n` +
      `ตอบถูก ${stats.correct} ครั้ง (${stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0}%)`;
  }

  // ---------- Settings panel ----------
  function renderGroupCheckboxes() {
    const lang = currentLang();
    const groupState = settings.groupsByLang[settings.lang];
    groupCheckboxContainer.innerHTML = "";
    for (const g of lang.groups) {
      const label = document.createElement("label");
      label.className = "checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = g.key;
      input.checked = !!groupState[g.key];
      input.addEventListener("change", () => {
        groupState[g.key] = input.checked;
        const anyChecked = Object.values(groupState).some(Boolean);
        if (!anyChecked) {
          input.checked = true;
          groupState[g.key] = true;
        }
        persistSettings();
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + g.label));
      groupCheckboxContainer.appendChild(label);
    }
  }

  function applyLanguageChrome() {
    const lang = currentLang();
    langGlyph.textContent = lang.label;
    langSubtitle.textContent = lang.subtitle;
  }

  function syncSettingsUI() {
    langSelect.value = settings.lang;
    renderGroupCheckboxes();
    penSizeInput.value = settings.penSize;
    showGuideInput.checked = settings.showGuide;
  }

  settingsBtn.addEventListener("click", () => {
    syncSettingsUI();
    settingsOverlay.hidden = false;
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsOverlay.hidden = true;
  });
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) settingsOverlay.hidden = true;
  });

  langSelect.addEventListener("change", () => {
    settings.lang = langSelect.value;
    persistSettings();
    applyLanguageChrome();
    renderGroupCheckboxes();
    nextRound();
  });
  penSizeInput.addEventListener("input", () => {
    settings.penSize = Number(penSizeInput.value);
    persistSettings();
  });
  showGuideInput.addEventListener("change", () => {
    settings.showGuide = showGuideInput.checked;
    persistSettings();
    drawGuide();
  });
  resetStatsBtn.addEventListener("click", () => {
    if (!confirm("ล้างสถิติทั้งหมดใช่หรือไม่?")) return;
    stats = { attempts: 0, correct: 0, streak: 0, perChar: {} };
    persistStats();
    updateStatsBar();
  });

  // ---------- Init ----------
  drawGuide();
  applyLanguageChrome();
  updateStatsBar();
  nextRound();
})();
