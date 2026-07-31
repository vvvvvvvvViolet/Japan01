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
        { key: "hsk5", label: "คำศัพท์ระดับ HSK5 (~90 คำ)", advanced: true },
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
        { key: "uppercase", label: "ตัวพิมพ์เล็ก → เขียนตัวพิมพ์ใหญ่", promptLabel: "เขียนตัวอักษรคู่กับ", answerVerb: "คู่กับ" },
        { key: "lowercase", label: "ตัวพิมพ์ใหญ่ → เขียนตัวพิมพ์เล็ก", promptLabel: "เขียนตัวอักษรคู่กับ", answerVerb: "คู่กับ" },
        {
          key: "toeic600",
          label: "คำศัพท์ TOEIC ~600 (~80 คำ)",
          promptLabel: "เขียนคำศัพท์ภาษาอังกฤษที่แปลว่า",
          answerVerb: "แปลว่า",
          advanced: true,
        },
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
      chinese: { numbers: true, basic: true, words: false, hsk5: false },
      english: { uppercase: true, lowercase: true, toeic600: false },
    };
  }

  function groupConfigFor(lang, groupKey) {
    return lang.groups.find((g) => g.key === groupKey) || {};
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
  const strokeAnimCanvas = document.getElementById("strokeAnimCanvas");
  const watchBtn = document.getElementById("watchBtn");
  const undoBtn = document.getElementById("undoBtn");
  const clearBtn = document.getElementById("clearBtn");
  const checkBtn = document.getElementById("checkBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resultPanel = document.getElementById("resultPanel");
  const resultHeadline = document.getElementById("resultHeadline");
  const resultStars = document.getElementById("resultStars");
  const resultScore = document.getElementById("resultScore");
  const resultAnswer = document.getElementById("resultAnswer");
  const statAttempts = document.getElementById("statAttempts");
  const statStars = document.getElementById("statStars");
  const statStreak = document.getElementById("statStreak");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const kidsModeInput = document.getElementById("kidsMode");
  const langSelect = document.getElementById("langSelect");
  const groupCheckboxContainer = document.getElementById("groupCheckboxContainer");
  const penSizeInput = document.getElementById("penSize");
  const showGuideInput = document.getElementById("showGuide");
  const traceModeInput = document.getElementById("traceMode");
  const soundOnInput = document.getElementById("soundOn");
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
    {
      lang: "hiragana",
      groupsByLang: defaultGroupsByLang(),
      penSize: 10,
      showGuide: true,
      kidsMode: true,
      traceMode: true,
      soundOn: true,
    },
    loadJSON(SETTINGS_KEY, {})
  );
  if (!settings.groupsByLang) settings.groupsByLang = defaultGroupsByLang();
  let stats = loadJSON(STATS_KEY, { attempts: 0, correct: 0, streak: 0, totalStars: 0, perChar: {} });
  if (typeof stats.totalStars !== "number") stats.totalStars = 0;

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
  const strokeAnimCtx = setupCanvas(strokeAnimCanvas);

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
  // ตัวอักษรเดี่ยว (kana/hanzi/letter) ใช้ตัวใหญ่เต็มกรอบ ส่วนคำยาว (2 ตัวอักษรขึ้นไป
  // หรือคำศัพท์ภาษาอังกฤษ) ลดขนาดลงตามความยาว แล้วปล่อยให้ maxWidth ของ fillText
  // บีบแนวนอนเป็นตัวกันสุดท้ายถ้ายังยาวเกินกรอบ
  function fontScaleFor(textLength) {
    if (textLength <= 1) return 0.6;
    return Math.max(0.16, Math.min(0.42, 1.1 / textLength));
  }

  function renderReferenceMask(text, w, h, font, blurPx, alphaThreshold) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d");
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = "#000";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    const fontScale = fontScaleFor(text.length);
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
    // คำยาวมักมีระยะห่างระหว่างตัวอักษรที่เขียนด้วยมือคลาดเคลื่อนจากฟอนต์อ้างอิงมากกว่า
    // จึงเพิ่มระยะยอมรับ (blur) ขึ้นตามความยาวคำ สูงสุด 2 เท่า
    const toleranceBlur = Math.max(4, Math.round(w * 0.03 * Math.min(2, Math.sqrt(text.length))));

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

  function showOverlay(refCanvas, alpha = 0.32) {
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.globalAlpha = alpha;
    overlayCtx.drawImage(refCanvas, 0, 0);
    overlayCtx.restore();
  }
  function clearOverlay() {
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.restore();
  }

  function showTraceGhost() {
    clearOverlay();
    if (!settings.traceMode || !currentItem) return;
    const { canvas } = renderReferenceMask(currentItem.char, drawCanvas.width, drawCanvas.height, currentLang().font, 0, 90);
    showOverlay(canvas, 0.2);
  }

  // ---------- Sound effects (Web Audio API, no external assets) ----------
  let audioCtx = null;
  function getAudioCtx() {
    if (!settings.soundOn) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, startTime, duration, gainPeak = 0.18) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function playStarsSound(stars) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notesByStars = {
      3: [523.25, 659.25, 783.99, 1046.5], // C5 E5 G5 C6 - cheerful arpeggio
      2: [523.25, 659.25, 783.99],
      1: [523.25, 659.25],
    };
    const notes = notesByStars[stars] || [392, 349.23]; // gentle descending "try again" cue
    notes.forEach((freq, i) => playTone(freq, now + i * 0.12, 0.28));
  }

  // ---------- Encouragement copy & star rating ----------
  function scoreToStars(score) {
    if (score >= 85) return 3;
    if (score >= 70) return 2;
    if (score >= PASS_SCORE) return 1;
    return 0;
  }
  function starsHtml(stars) {
    return "★★★".slice(0, stars) + "☆☆☆".slice(0, 3 - stars);
  }
  const TRY_AGAIN_MESSAGES = [
    "เกือบแล้ว! ลองดูตัวอย่างแล้วลองใหม่นะ 💪",
    "ดีขึ้นแน่นอน! ลองอีกครั้งนะ 🌟",
    "ไม่เป็นไร ลองดูเงาตัวอย่างแล้วเขียนตามนะ 😊",
  ];

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
    const stars = result.empty ? 0 : scoreToStars(result.score);
    if (passed) {
      stats.perChar[charKey].correct++;
      stats.correct++;
      stats.streak++;
      stats.totalStars += stars;
    } else {
      stats.streak = 0;
    }
    persistStats();
    updateStatsBar();

    showOverlay(result.refCanvas, 0.32);
    playStarsSound(stars);

    resultPanel.hidden = false;
    resultPanel.className = "result-panel " + (passed ? "correct" : "incorrect");
    resultHeadline.textContent = result.empty
      ? "ยังไม่ได้เขียนตัวอักษรเลยนะ ลองเขียนดูก่อน"
      : passed
      ? "เก่งมาก! ถูกต้อง 🎉"
      : TRY_AGAIN_MESSAGES[Math.floor(Math.random() * TRY_AGAIN_MESSAGES.length)];
    resultStars.textContent = result.empty ? "" : starsHtml(stars);
    resultScore.textContent = result.empty ? "" : settings.kidsMode ? "" : `ความแม่นยำ ${result.score}%`;
    const answerVerb = groupConfigFor(currentLang(), currentItem.group).answerVerb || currentLang().answerVerb;
    resultAnswer.innerHTML = `<span class="big">${currentItem.char}</span> ${answerVerb} "${currentItem.reading}"`;

    checkBtn.disabled = true;
    undoBtn.disabled = true;
    clearBtn.disabled = true;
    nextBtn.disabled = false;
  }

  function nextRound() {
    stopStrokeAnimation();
    currentItem = pickNextItem();
    lastChar = currentItem.char;
    hasChecked = false;
    promptLabel.textContent = groupConfigFor(currentLang(), currentItem.group).promptLabel || currentLang().promptLabel;
    promptRomaji.textContent = currentItem.reading;
    promptRomaji.classList.toggle("long-text", currentItem.reading.length > 6);
    clearDrawing();
    showTraceGhost();
    resultPanel.hidden = true;
    nextBtn.disabled = true;
    updateActionButtons();
    watchBtn.hidden = !STROKE_ORDER[currentItem.char];
    if (settings.kidsMode) speakCurrent();
  }

  checkBtn.addEventListener("click", checkAnswer);
  nextBtn.addEventListener("click", nextRound);

  // ---------- Speak (TTS) ----------
  function speakCurrent() {
    if (!currentItem || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(currentItem.char);
    utter.lang = currentLang().ttsLang;
    utter.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
  speakBtn.addEventListener("click", speakCurrent);

  // ---------- Stroke-order animation ("ดูวิธีเขียน") ----------
  let strokeAnimToken = 0;
  function stopStrokeAnimation() {
    strokeAnimToken++; // invalidates any in-flight animation loop
    strokeAnimCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    watchBtn.disabled = false;
  }
  function wait(ms, token) {
    return new Promise((resolve, reject) => {
      setTimeout(() => (token === strokeAnimToken ? resolve() : reject(new Error("cancelled"))), ms);
    });
  }
  async function animateStroke(points, index, token) {
    const scaled = points.map(([x, y]) => ({ x: (x / 100) * LOGICAL_SIZE, y: (y / 100) * LOGICAL_SIZE }));
    const durationMs = 700;
    const steps = 40;
    strokeAnimCtx.lineCap = "round";
    strokeAnimCtx.lineJoin = "round";
    strokeAnimCtx.strokeStyle = "#2563eb";
    strokeAnimCtx.lineWidth = 6;
    // numbered start badge
    strokeAnimCtx.beginPath();
    strokeAnimCtx.fillStyle = "#2563eb";
    strokeAnimCtx.arc(scaled[0].x, scaled[0].y, 11, 0, Math.PI * 2);
    strokeAnimCtx.fill();
    strokeAnimCtx.fillStyle = "#fff";
    strokeAnimCtx.font = "bold 13px sans-serif";
    strokeAnimCtx.textAlign = "center";
    strokeAnimCtx.textBaseline = "middle";
    strokeAnimCtx.fillText(String(index + 1), scaled[0].x, scaled[0].y + 1);

    for (let s = 1; s <= steps; s++) {
      if (token !== strokeAnimToken) return;
      const t = s / steps;
      const segCount = scaled.length - 1;
      const segPos = t * segCount;
      const segIndex = Math.min(Math.floor(segPos), segCount - 1);
      const segT = segPos - segIndex;
      const a = scaled[segIndex];
      const b = scaled[segIndex + 1];
      const cx = a.x + (b.x - a.x) * segT;
      const cy = a.y + (b.y - a.y) * segT;

      strokeAnimCtx.beginPath();
      strokeAnimCtx.moveTo(a.x, a.y);
      for (let i = 0; i <= segIndex; i++) {
        strokeAnimCtx.lineTo(scaled[i].x, scaled[i].y);
      }
      strokeAnimCtx.lineTo(cx, cy);
      strokeAnimCtx.stroke();

      await wait(durationMs / steps, token);
    }
  }
  async function playStrokeAnimation() {
    if (!currentItem) return;
    const charStrokes = STROKE_ORDER[currentItem.char];
    if (!charStrokes) return;
    stopStrokeAnimation();
    const token = strokeAnimToken;
    watchBtn.disabled = true;
    try {
      for (let i = 0; i < charStrokes.length; i++) {
        await animateStroke(charStrokes[i], i, token);
        await wait(300, token);
      }
      await wait(500, token);
    } catch (e) {
      // cancelled mid-flight (user clicked Next / Watch again) — nothing to clean up
    }
    if (token === strokeAnimToken) {
      strokeAnimCtx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
      watchBtn.disabled = false;
    }
  }
  watchBtn.addEventListener("click", playStrokeAnimation);

  // ---------- Stats bar ----------
  function updateStatsBar() {
    statAttempts.textContent = stats.attempts;
    statStars.textContent = `${stats.totalStars} ⭐`;
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
    const visibleGroups = settings.kidsMode ? lang.groups.filter((g) => !g.advanced) : lang.groups;
    for (const g of visibleGroups) {
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

  function applyKidsModeChrome() {
    document.body.classList.toggle("kids-mode", settings.kidsMode);
  }

  function syncSettingsUI() {
    kidsModeInput.checked = settings.kidsMode;
    langSelect.value = settings.lang;
    renderGroupCheckboxes();
    penSizeInput.value = settings.penSize;
    showGuideInput.checked = settings.showGuide;
    traceModeInput.checked = settings.traceMode;
    soundOnInput.checked = settings.soundOn;
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

  kidsModeInput.addEventListener("change", () => {
    settings.kidsMode = kidsModeInput.checked;
    persistSettings();
    applyKidsModeChrome();
    renderGroupCheckboxes();
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
  traceModeInput.addEventListener("change", () => {
    settings.traceMode = traceModeInput.checked;
    persistSettings();
    if (!hasChecked) showTraceGhost();
  });
  soundOnInput.addEventListener("change", () => {
    settings.soundOn = soundOnInput.checked;
    persistSettings();
  });
  resetStatsBtn.addEventListener("click", () => {
    if (!confirm("ล้างสถิติทั้งหมดใช่หรือไม่?")) return;
    stats = { attempts: 0, correct: 0, streak: 0, totalStars: 0, perChar: {} };
    persistStats();
    updateStatsBar();
  });

  // ---------- Init ----------
  drawGuide();
  applyLanguageChrome();
  applyKidsModeChrome();
  updateStatsBar();
  nextRound();
})();
