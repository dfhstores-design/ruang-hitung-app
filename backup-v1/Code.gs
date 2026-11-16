/**
 * Ruang Hitung
 * Latihan matematika kelas 9 dengan monitoring orang tua/guru.
 *
 * Data disimpan di Google Sheets yang dibuat otomatis pada pemakaian pertama.
 * Web app dijalankan sebagai pemilik deployment dan diakses dengan kode akses.
 */

const APP = {
  NAME: 'Ruang Hitung',
  DATA_TITLE: 'Ruang Hitung - Data',
  TIMEZONE: 'Asia/Jakarta',
  SESSION_SECONDS: 21600,
  DEFAULT_CODES: {
    student: 'SISWA-2049',
    parent: 'ORTU-2049',
    teacher: 'GURU-2049'
  },
  DEFAULT_NAMES: {
    student: 'Siswa',
    parent: 'Orang tua',
    teacher: 'Guru'
  },
  PACKAGES: {
    full: { title: 'Simulasi Ujian Akhir', durationMin: 90 },
    quick: { title: 'Latihan Cepat', durationMin: 30 }
  }
};

const SHEETS = {
  questions: 'Questions',
  attempts: 'Attempts',
  answers: 'Answers',
  activity: 'Activity'
};

const QUESTION_HEADERS = [
  'id', 'topicId', 'topic', 'difficulty', 'question',
  'optionA', 'optionB', 'optionC', 'optionD',
  'answerIndex', 'solution', 'active'
];

const ATTEMPT_HEADERS = [
  'id', 'packageId', 'packageTitle', 'startedAt', 'submittedAt', 'status',
  'score', 'correctCount', 'totalQuestions', 'durationSec', 'questionIds',
  'reviewUnlocked', 'reviewRequested', 'unlockedAt', 'unlockedBy', 'requestAt'
];

const ANSWER_HEADERS = [
  'attemptId', 'questionId', 'selectedIndex', 'isCorrect', 'answeredAt'
];

const ACTIVITY_HEADERS = ['timestamp', 'role', 'action', 'detail'];

function doGet() {
  try {
    ensureSetup_();
  } catch (error) {
    console.error('Setup gagal: ' + error.message);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Ruang Hitung - Latihan Matematika Kelas 9')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function ensureSetup_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SPREADSHEET_ID')) {
    ensureDefaults_(props);
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (props.getProperty('SPREADSHEET_ID')) {
      ensureDefaults_(props);
      return;
    }

    const ss = SpreadsheetApp.create(APP.DATA_TITLE);
    props.setProperty('SPREADSHEET_ID', ss.getId());
    ss.setSpreadsheetTimeZone(APP.TIMEZONE);

    const first = ss.getSheets()[0];
    first.setName(SHEETS.questions);
    const questions = first;
    const attempts = ss.insertSheet(SHEETS.attempts);
    const answers = ss.insertSheet(SHEETS.answers);
    const activity = ss.insertSheet(SHEETS.activity);

    formatHeader_(questions, QUESTION_HEADERS);
    formatHeader_(attempts, ATTEMPT_HEADERS);
    formatHeader_(answers, ANSWER_HEADERS);
    formatHeader_(activity, ACTIVITY_HEADERS);

    const bank = getQuestionBank();
    const rows = bank.questions.map(function (q) {
      return [
        q.id,
        q.topicId,
        topicName_(q.topicId),
        q.difficulty,
        q.question,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        q.answer,
        q.solution,
        true
      ];
    });

    questions.getRange(2, 1, rows.length, QUESTION_HEADERS.length).setValues(rows);
    questions.setColumnWidth(1, 70);
    questions.setColumnWidth(2, 120);
    questions.setColumnWidth(3, 210);
    questions.setColumnWidth(4, 90);
    questions.setColumnWidth(5, 420);
    questions.setColumnWidth(10, 95);
    questions.setColumnWidth(11, 520);
    questions.setColumnWidth(12, 70);
    questions.setFrozenRows(1);
    questions.getRange(2, 1, rows.length, QUESTION_HEADERS.length).setWrap(true).setVerticalAlignment('top');

    attempts.setFrozenRows(1);
    attempts.setColumnWidth(1, 190);
    attempts.setColumnWidth(2, 150);
    attempts.setColumnWidth(3, 210);
    attempts.setColumnWidth(4, 220);
    attempts.setColumnWidth(5, 220);
    attempts.setColumnWidth(11, 420);

    answers.setFrozenRows(1);
    answers.setColumnWidth(1, 190);
    answers.setColumnWidth(2, 90);

    activity.setFrozenRows(1);

    ensureDefaults_(props);
    props.setProperty('SETUP_VERSION', '1');
    logActivity_('system', 'setup', 'Spreadsheet data dibuat.');
  } finally {
    lock.releaseLock();
  }
}

function ensureDefaults_(props) {
  props.setProperty('CODE_STUDENT', props.getProperty('CODE_STUDENT') || APP.DEFAULT_CODES.student);
  props.setProperty('CODE_PARENT', props.getProperty('CODE_PARENT') || APP.DEFAULT_CODES.parent);
  props.setProperty('CODE_TEACHER', props.getProperty('CODE_TEACHER') || APP.DEFAULT_CODES.teacher);
  props.setProperty('NAME_STUDENT', props.getProperty('NAME_STUDENT') || APP.DEFAULT_NAMES.student);
}

function formatHeader_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#20304A')
    .setFontColor('#FFF9EE')
    .setVerticalAlignment('middle');
  sheet.getRange(1, 1, 1, headers.length).setFontFamily('Arial');
  sheet.setFrozenRows(1);
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('Data ruang belajar belum siap. Muat ulang halaman lalu coba lagi.');
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error('Lembar data ' + name + ' tidak ditemukan.');
  }
  return sheet;
}

function getQuestionBankMap_() {
  const map = {};
  getQuestionBank().questions.forEach(function (q) {
    map[q.id] = q;
  });
  return map;
}

function getTopics_() {
  return getQuestionBank().topics.map(function (topic) {
    return { id: topic.id, name: topic.name, short: topic.short };
  });
}

function topicName_(topicId) {
  const topic = getQuestionBank().topics.filter(function (t) { return t.id === topicId; })[0];
  return topic ? topic.name : topicId;
}

function getQuestions_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('questions_v1');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      cache.remove('questions_v1');
    }
  }

  const sheet = getSheet_(SHEETS.questions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, QUESTION_HEADERS.length).getValues();
  const questions = values.filter(function (row) {
    return row[0] && row[11] !== false && String(row[11]).toUpperCase() !== 'FALSE';
  }).map(function (row) {
    return {
      id: String(row[0]),
      topicId: String(row[1]),
      topic: String(row[2]),
      difficulty: String(row[3]),
      question: String(row[4]),
      options: [String(row[5]), String(row[6]), String(row[7]), String(row[8])],
      answer: Number(row[9]),
      solution: String(row[10])
    };
  });

  cache.put('questions_v1', JSON.stringify(questions), 300);
  return questions;
}

function getQuestionMap_() {
  const map = {};
  getQuestions_().forEach(function (q) { map[q.id] = q; });
  return map;
}

function getCodes_() {
  const props = PropertiesService.getScriptProperties();
  ensureDefaults_(props);
  return {
    student: props.getProperty('CODE_STUDENT'),
    parent: props.getProperty('CODE_PARENT'),
    teacher: props.getProperty('CODE_TEACHER')
  };
}

function studentName_() {
  return PropertiesService.getScriptProperties().getProperty('NAME_STUDENT') || APP.DEFAULT_NAMES.student;
}

function roleLabel_(role) {
  if (role === 'student') return 'Siswa';
  if (role === 'parent') return 'Orang tua';
  if (role === 'teacher') return 'Guru';
  return 'Pengguna';
}

function normalizeCode_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function login(code) {
  ensureSetup_();
  const cache = CacheService.getScriptCache();
  if (cache.get('login_blocked')) {
    throw new Error('Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.');
  }

  const normalized = normalizeCode_(code);
  if (!normalized) {
    throw new Error('Masukkan kode akses terlebih dahulu.');
  }

  const codes = getCodes_();
  let role = null;
  if (normalized === normalizeCode_(codes.student)) role = 'student';
  else if (normalized === normalizeCode_(codes.parent)) role = 'parent';
  else if (normalized === normalizeCode_(codes.teacher)) role = 'teacher';

  if (!role) {
    const raw = Number(cache.get('login_failures') || 0) + 1;
    cache.put('login_failures', String(raw), 120);
    if (raw >= 8) {
      cache.put('login_blocked', '1', 60);
      cache.remove('login_failures');
      throw new Error('Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.');
    }
    throw new Error('Kode akses tidak dikenali. Periksa kembali kode dari guru atau orang tua.');
  }

  cache.remove('login_failures');
  const token = createSession_(role);
  logActivity_(role, 'login', 'Masuk ke ruang belajar.');

  return {
    token: token,
    role: role,
    name: roleLabel_(role),
    studentName: studentName_()
  };
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove('session:' + token);
  }
  return { ok: true };
}

function createSession_(role) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const payload = { role: role, createdAt: new Date().toISOString() };
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(payload), APP.SESSION_SECONDS);
  return token;
}

function getSession_(token) {
  if (!token) {
    throw new Error('Sesi tidak ditemukan. Silakan masuk kembali.');
  }
  const raw = CacheService.getScriptCache().get('session:' + token);
  if (!raw) {
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error('Sesi tidak valid. Silakan masuk kembali.');
  }
  if (!payload.role) {
    throw new Error('Sesi tidak valid. Silakan masuk kembali.');
  }
  return { token: token, role: payload.role };
}

function requireRole_(token, roles) {
  const session = getSession_(token);
  if (roles.indexOf(session.role) === -1) {
    throw new Error('Akun ini tidak memiliki akses untuk tindakan tersebut.');
  }
  return session;
}

function getDashboard(token) {
  const session = getSession_(token);
  expireStaleAttempts_();

  const questions = getQuestions_();
  const topics = getTopics_().map(function (topic) {
    return {
      id: topic.id,
      name: topic.name,
      short: topic.short,
      count: questions.filter(function (q) { return q.topicId === topic.id; }).length
    };
  }).filter(function (topic) { return topic.count > 0; });

  const attempts = readAttempts_();
  const activeRow = attempts.filter(function (a) { return a.status === 'in_progress'; })[0] || null;
  const submitted = attempts
    .filter(function (a) { return a.status === 'submitted'; })
    .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });

  let active = null;
  if (activeRow) {
    active = attemptSummary_(activeRow);
    active.answeredCount = countAnswers_(activeRow.id);
  }

  const summaries = submitted.map(attemptSummary_);
  let summary = null;
  if (summaries.length) {
    const total = summaries.reduce(function (sum, item) { return sum + Number(item.score || 0); }, 0);
    summary = {
      completedCount: summaries.length,
      averageScore: Math.round(total / summaries.length),
      bestScore: Math.max.apply(null, summaries.map(function (item) { return Number(item.score || 0); })),
      lastScore: summaries[0].score,
      lastSubmittedAt: summaries[0].submittedAt
    };
  }

  const packages = [{
    id: 'full',
    kind: 'simulasi',
    title: APP.PACKAGES.full.title,
    subtitle: 'Seluruh topik dalam satu sesi',
    questionCount: questions.length,
    durationMin: APP.PACKAGES.full.durationMin,
    topicCount: topics.length
  }, {
    id: 'quick',
    kind: 'cepat',
    title: APP.PACKAGES.quick.title,
    subtitle: 'Campuran soal dari semua topik',
    questionCount: Math.min(20, questions.length),
    durationMin: APP.PACKAGES.quick.durationMin,
    topicCount: topics.length
  }].concat(topics.map(function (topic) {
    return {
      id: 'topic:' + topic.id,
      kind: 'topik',
      title: topic.name,
      subtitle: 'Latihan terarah untuk topik ini',
      questionCount: topic.count,
      durationMin: 15,
      topicId: topic.id,
      short: topic.short
    };
  }));

  return {
    role: session.role,
    roleLabel: roleLabel_(session.role),
    name: roleLabel_(session.role),
    studentName: studentName_(),
    dateISO: new Date().toISOString(),
    topics: topics,
    packages: packages,
    activeAttempt: active,
    attempts: summaries,
    summary: summary,
    codes: session.role === 'teacher' ? getCodes_() : null
  };
}

function startAttempt(token, packageId) {
  const session = requireRole_(token, ['student']);
  ensureSetup_();
  expireStaleAttempts_();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const existing = readAttempts_().filter(function (a) { return a.status === 'in_progress'; })[0];
    if (existing) {
      throw new Error('Masih ada latihan yang sedang berjalan. Lanjutkan atau kumpulkan latihan itu terlebih dahulu.');
    }

    const all = getQuestions_();
    if (!all.length) {
      throw new Error('Bank soal belum tersedia.');
    }

    let selected = [];
    let durationMin = 15;
    let title = '';
    const requested = String(packageId || '');

    if (requested === 'full') {
      selected = shuffle_(all.slice());
      durationMin = APP.PACKAGES.full.durationMin;
      title = APP.PACKAGES.full.title;
    } else if (requested === 'quick') {
      selected = pickQuickQuestions_(all);
      durationMin = APP.PACKAGES.quick.durationMin;
      title = APP.PACKAGES.quick.title;
    } else if (requested.indexOf('topic:') === 0) {
      const topicId = requested.slice(6);
      selected = shuffle_(all.filter(function (q) { return q.topicId === topicId; }));
      durationMin = 15;
      const topic = getTopics_().filter(function (t) { return t.id === topicId; })[0];
      title = topic ? topic.name : 'Latihan Topik';
    } else {
      throw new Error('Paket latihan tidak dikenali.');
    }

    if (!selected.length) {
      throw new Error('Soal untuk paket ini belum tersedia.');
    }

    const now = new Date();
    const attempt = {
      id: makeAttemptId_(),
      packageId: requested,
      packageTitle: title,
      startedAt: now.toISOString(),
      submittedAt: '',
      status: 'in_progress',
      score: null,
      correctCount: null,
      totalQuestions: selected.length,
      durationSec: null,
      questionIds: selected.map(function (q) { return q.id; }),
      reviewUnlocked: false,
      reviewRequested: false,
      unlockedAt: '',
      unlockedBy: '',
      requestAt: ''
    };

    const sheet = getSheet_(SHEETS.attempts);
    sheet.appendRow(attemptToRow_(attempt));
    logActivity_(session.role, 'start', title + ' (' + selected.length + ' soal)');

    attempt._row = sheet.getLastRow();
    return buildAttemptPayload_(attempt, selected, {});
  } finally {
    lock.releaseLock();
  }
}

function saveAnswer(token, attemptId, questionId, selectedIndex) {
  const session = requireRole_(token, ['student']);
  const answer = Number(selectedIndex);
  if (!isFinite(answer) || answer < 0 || answer > 3) {
    throw new Error('Pilihan jawaban tidak valid.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const attempts = readAttempts_();
    const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
    if (!attempt) {
      throw new Error('Latihan tidak ditemukan.');
    }
    if (attempt.status !== 'in_progress') {
      throw new Error('Latihan ini sudah dikumpulkan.');
    }
    if (new Date().getTime() > attemptEndMs_(attempt)) {
      finalizeAttempt_(attempt, 'timeout');
      return { expired: true, attemptId: attempt.id };
    }
    if (attempt.questionIds.indexOf(questionId) === -1) {
      throw new Error('Soal tidak termasuk dalam latihan ini.');
    }

    const question = getQuestionMap_()[questionId];
    if (!question) {
      throw new Error('Soal tidak ditemukan.');
    }

    const sheet = getSheet_(SHEETS.answers);
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(attemptId) && String(values[i][1]) === String(questionId)) {
        row = i + 1;
        break;
      }
    }

    const isCorrect = answer === question.answer;
    const answeredAt = new Date().toISOString();
    if (row > 0) {
      sheet.getRange(row, 3, 1, 3).setValues([[answer, isCorrect, answeredAt]]);
    } else {
      sheet.appendRow([attemptId, questionId, answer, isCorrect, answeredAt]);
    }

    return { savedAt: answeredAt, questionId: questionId };
  } finally {
    lock.releaseLock();
  }
}

function submitAttempt(token, attemptId, reason) {
  const session = requireRole_(token, ['student']);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const attempts = readAttempts_();
    const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
    if (!attempt) {
      throw new Error('Latihan tidak ditemukan.');
    }
    if (attempt.status === 'in_progress') {
      finalizeAttempt_(attempt, reason === 'timeout' ? 'timeout' : 'manual');
    }
    return getResultData_(session, attemptId);
  } finally {
    lock.releaseLock();
  }
}

function getResult(token, attemptId) {
  const session = getSession_(token);
  return getResultData_(session, attemptId);
}

function getResultData_(session, attemptId) {
  const attempts = readAttempts_();
  const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
  if (!attempt) {
    throw new Error('Latihan tidak ditemukan.');
  }
  if (session.role === 'student' && attempt.status !== 'submitted') {
    throw new Error('Latihan belum selesai.');
  }

  const questions = getQuestionMap_();
  const answers = readAnswers_(attemptId);
  const answerMap = {};
  answers.forEach(function (a) { answerMap[a.questionId] = a; });

  const topicStats = {};
  let correct = 0;

  attempt.questionIds.forEach(function (qid) {
    const question = questions[qid];
    if (!question) return;
    if (!topicStats[question.topicId]) {
      topicStats[question.topicId] = {
        topicId: question.topicId,
        topicName: question.topic,
        correct: 0,
        total: 0,
        percent: 0
      };
    }
    topicStats[question.topicId].total += 1;
    const ans = answerMap[qid];
    if (ans && Number(ans.selectedIndex) === Number(question.answer)) {
      topicStats[question.topicId].correct += 1;
      correct += 1;
    }
  });

  const stats = Object.keys(topicStats).map(function (key) {
    const item = topicStats[key];
    item.percent = item.total ? Math.round((item.correct / item.total) * 100) : 0;
    return item;
  });

  const canReview = session.role !== 'student' || attempt.reviewUnlocked === true;
  const review = canReview ? attempt.questionIds.map(function (qid, index) {
    const question = questions[qid];
    if (!question) return null;
    const ans = answerMap[qid];
    return {
      number: index + 1,
      id: question.id,
      topicId: question.topicId,
      topicName: question.topic,
      difficulty: question.difficulty,
      question: question.question,
      options: question.options,
      selectedIndex: ans ? Number(ans.selectedIndex) : null,
      correctIndex: Number(question.answer),
      isCorrect: ans ? Number(ans.selectedIndex) === Number(question.answer) : false,
      solution: question.solution
    };
  }).filter(Boolean) : null;

  return {
    attempt: attemptSummary_(attempt),
    score: attempt.score,
    correctCount: correct,
    totalQuestions: attempt.totalQuestions,
    durationSec: attempt.durationSec,
    submittedAt: attempt.submittedAt,
    topicStats: stats,
    canReview: canReview,
    reviewUnlocked: attempt.reviewUnlocked === true,
    reviewRequested: attempt.reviewRequested === true,
    unlockedAt: attempt.unlockedAt || '',
    unlockedBy: attempt.unlockedBy || '',
    review: review
  };
}

function requestReview(token, attemptId) {
  const session = requireRole_(token, ['student']);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const attempts = readAttempts_();
    const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
    if (!attempt) {
      throw new Error('Latihan tidak ditemukan.');
    }
    if (attempt.status !== 'submitted') {
      throw new Error('Kumpulkan latihan terlebih dahulu.');
    }
    if (!attempt.reviewUnlocked && !attempt.reviewRequested) {
      attempt.reviewRequested = true;
      attempt.requestAt = new Date().toISOString();
      updateAttemptRow_(attempt);
      logActivity_(session.role, 'review_request', 'Meminta pembahasan untuk ' + attempt.packageTitle + '.');
    }
    return { reviewRequested: true };
  } finally {
    lock.releaseLock();
  }
}

function setReviewUnlocked(token, attemptId, unlocked) {
  const session = requireRole_(token, ['parent', 'teacher']);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const attempts = readAttempts_();
    const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
    if (!attempt) {
      throw new Error('Latihan tidak ditemukan.');
    }
    if (attempt.status !== 'submitted') {
      throw new Error('Latihan belum dikumpulkan.');
    }

    const shouldUnlock = Boolean(unlocked);
    attempt.reviewUnlocked = shouldUnlock;
    attempt.unlockedAt = shouldUnlock ? new Date().toISOString() : '';
    attempt.unlockedBy = shouldUnlock ? roleLabel_(session.role) : '';
    updateAttemptRow_(attempt);
    logActivity_(
      session.role,
      shouldUnlock ? 'unlock_review' : 'lock_review',
      attempt.packageTitle + ' untuk ' + studentName_() + '.'
    );

    return {
      reviewUnlocked: shouldUnlock,
      unlockedAt: attempt.unlockedAt,
      unlockedBy: attempt.unlockedBy
    };
  } finally {
    lock.releaseLock();
  }
}

function updateStudentName(token, name) {
  const session = requireRole_(token, ['teacher']);
  const clean = String(name || '').replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length < 2 || clean.length > 40) {
    throw new Error('Nama siswa harus terdiri dari 2 sampai 40 karakter.');
  }
  PropertiesService.getScriptProperties().setProperty('NAME_STUDENT', clean);
  logActivity_(session.role, 'update_student_name', 'Nama siswa diperbarui.');
  return { studentName: clean };
}

function updateAccessCode(token, role, newCode) {
  const session = requireRole_(token, ['teacher']);
  if (['student', 'parent', 'teacher'].indexOf(role) === -1) {
    throw new Error('Peran tidak dikenali.');
  }
  const clean = normalizeCode_(newCode);
  if (!/^[A-Z0-9-]{6,24}$/.test(clean)) {
    throw new Error('Kode harus 6 sampai 24 karakter, hanya huruf, angka, atau tanda hubung.');
  }

  const codes = getCodes_();
  const otherKeys = Object.keys(codes).filter(function (key) { return key !== role; });
  for (let i = 0; i < otherKeys.length; i++) {
    if (normalizeCode_(codes[otherKeys[i]]) === clean) {
      throw new Error('Kode itu sudah dipakai peran lain.');
    }
  }

  const propKey = role === 'student' ? 'CODE_STUDENT' : role === 'parent' ? 'CODE_PARENT' : 'CODE_TEACHER';
  PropertiesService.getScriptProperties().setProperty(propKey, clean);
  logActivity_(session.role, 'update_access_code', 'Kode akses ' + roleLabel_(role) + ' diperbarui.');
  return { codes: getCodes_() };
}

function buildAttemptPayload_(attempt, questions, savedAnswers) {
  return {
    attempt: attemptSummary_(attempt),
    questions: questions.map(function (q) {
      return {
        id: q.id,
        topicId: q.topicId,
        topicName: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options
      };
    }),
    answers: savedAnswers,
    remainingSec: remainingSeconds_(attempt),
    serverNow: new Date().toISOString()
  };
}

function resumeAttempt(token, attemptId) {
  const session = requireRole_(token, ['student']);
  const attempts = readAttempts_();
  const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
  if (!attempt) {
    throw new Error('Latihan tidak ditemukan.');
  }
  if (attempt.status !== 'in_progress') {
    return { finished: true, result: getResultData_(session, attemptId) };
  }
  if (new Date().getTime() > attemptEndMs_(attempt)) {
    finalizeAttempt_(attempt, 'timeout');
    return { finished: true, result: getResultData_(session, attemptId) };
  }

  const questionsMap = getQuestionMap_();
  const questions = attempt.questionIds.map(function (id) { return questionsMap[id]; }).filter(Boolean);
  const answers = {};
  readAnswers_(attemptId).forEach(function (a) {
    answers[a.questionId] = Number(a.selectedIndex);
  });

  return {
    finished: false,
    attempt: attemptSummary_(attempt),
    questions: questions.map(function (q) {
      return {
        id: q.id,
        topicId: q.topicId,
        topicName: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options
      };
    }),
    answers: answers,
    remainingSec: remainingSeconds_(attempt),
    serverNow: new Date().toISOString()
  };
}

function finalizeAttempt_(attempt, reason) {
  const questionMap = getQuestionMap_();
  const answers = readAnswers_(attempt.id);
  const answerMap = {};
  answers.forEach(function (a) { answerMap[a.questionId] = a; });

  let correct = 0;
  attempt.questionIds.forEach(function (qid) {
    const question = questionMap[qid];
    const answer = answerMap[qid];
    if (question && answer && Number(answer.selectedIndex) === Number(question.answer)) {
      correct += 1;
    }
  });

  const now = new Date();
  const startMs = new Date(attempt.startedAt).getTime();
  const elapsed = isFinite(startMs) ? Math.max(0, Math.floor((now.getTime() - startMs) / 1000)) : 0;
  const maxSeconds = packageDurationMin_(attempt.packageId) * 60;

  attempt.submittedAt = now.toISOString();
  attempt.status = 'submitted';
  attempt.correctCount = correct;
  attempt.score = attempt.totalQuestions ? Math.round((correct / attempt.totalQuestions) * 100) : 0;
  attempt.durationSec = Math.min(maxSeconds, elapsed);
  updateAttemptRow_(attempt);

  logActivity_('student', 'submit', attempt.packageTitle + ', skor ' + attempt.score + ' (' + reason + ').');
}

function expireStaleAttempts_() {
  const attempts = readAttempts_();
  attempts.forEach(function (attempt) {
    if (attempt.status === 'in_progress' && new Date().getTime() > attemptEndMs_(attempt)) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const fresh = readAttempts_().filter(function (a) { return a.id === attempt.id; })[0];
        if (fresh && fresh.status === 'in_progress' && new Date().getTime() > attemptEndMs_(fresh)) {
          finalizeAttempt_(fresh, 'timeout');
        }
      } finally {
        lock.releaseLock();
      }
    }
  });
}

function readAttempts_() {
  const sheet = getSheet_(SHEETS.attempts);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, ATTEMPT_HEADERS.length).getValues();
  const attempts = [];

  values.forEach(function (row, index) {
    if (!row[0]) return;
    let questionIds = [];
    try {
      questionIds = JSON.parse(String(row[10] || '[]'));
    } catch (error) {
      questionIds = String(row[10] || '').split(',').filter(Boolean);
    }
    attempts.push({
      _row: index + 2,
      id: String(row[0]),
      packageId: String(row[1]),
      packageTitle: String(row[2]),
      startedAt: toIso_(row[3]),
      submittedAt: row[4] ? toIso_(row[4]) : '',
      status: String(row[5]),
      score: row[6] === '' || row[6] === null ? null : Number(row[6]),
      correctCount: row[7] === '' || row[7] === null ? null : Number(row[7]),
      totalQuestions: Number(row[8]),
      durationSec: row[9] === '' || row[9] === null ? null : Number(row[9]),
      questionIds: questionIds,
      reviewUnlocked: toBool_(row[11]),
      reviewRequested: toBool_(row[12]),
      unlockedAt: row[13] ? toIso_(row[13]) : '',
      unlockedBy: row[14] ? String(row[14]) : '',
      requestAt: row[15] ? toIso_(row[15]) : ''
    });
  });

  return attempts;
}

function readAnswers_(attemptId) {
  const sheet = getSheet_(SHEETS.answers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, ANSWER_HEADERS.length).getValues();
  return values.filter(function (row) {
    return String(row[0]) === String(attemptId);
  }).map(function (row) {
    return {
      attemptId: String(row[0]),
      questionId: String(row[1]),
      selectedIndex: Number(row[2]),
      isCorrect: toBool_(row[3]),
      answeredAt: row[4] ? toIso_(row[4]) : ''
    };
  });
}

function countAnswers_(attemptId) {
  return readAnswers_(attemptId).length;
}

function attemptSummary_(attempt) {
  return {
    id: attempt.id,
    packageId: attempt.packageId,
    packageTitle: attempt.packageTitle,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    durationSec: attempt.durationSec,
    reviewUnlocked: attempt.reviewUnlocked === true,
    reviewRequested: attempt.reviewRequested === true,
    unlockedAt: attempt.unlockedAt || '',
    unlockedBy: attempt.unlockedBy || ''
  };
}

function updateAttemptRow_(attempt) {
  const sheet = getSheet_(SHEETS.attempts);
  sheet.getRange(attempt._row, 1, 1, ATTEMPT_HEADERS.length).setValues([attemptToRow_(attempt)]);
}

function attemptToRow_(attempt) {
  return [
    attempt.id,
    attempt.packageId,
    attempt.packageTitle,
    attempt.startedAt,
    attempt.submittedAt || '',
    attempt.status,
    attempt.score === null || typeof attempt.score === 'undefined' ? '' : attempt.score,
    attempt.correctCount === null || typeof attempt.correctCount === 'undefined' ? '' : attempt.correctCount,
    attempt.totalQuestions,
    attempt.durationSec === null || typeof attempt.durationSec === 'undefined' ? '' : attempt.durationSec,
    JSON.stringify(attempt.questionIds || []),
    attempt.reviewUnlocked === true,
    attempt.reviewRequested === true,
    attempt.unlockedAt || '',
    attempt.unlockedBy || '',
    attempt.requestAt || ''
  ];
}

function attemptEndMs_(attempt) {
  const start = new Date(attempt.startedAt).getTime();
  if (!isFinite(start)) return 0;
  return start + packageDurationMin_(attempt.packageId) * 60 * 1000;
}

function remainingSeconds_(attempt) {
  const end = attemptEndMs_(attempt);
  return Math.max(0, Math.floor((end - new Date().getTime()) / 1000));
}

function packageDurationMin_(packageId) {
  if (packageId === 'full') return APP.PACKAGES.full.durationMin;
  if (packageId === 'quick') return APP.PACKAGES.quick.durationMin;
  return 15;
}

function pickQuickQuestions_(all) {
  const byTopic = {};
  all.forEach(function (q) {
    if (!byTopic[q.topicId]) byTopic[q.topicId] = [];
    byTopic[q.topicId].push(q);
  });

  const picked = [];
  const used = {};
  Object.keys(byTopic).forEach(function (topicId) {
    shuffle_(byTopic[topicId].slice()).slice(0, 3).forEach(function (q) {
      picked.push(q);
      used[q.id] = true;
    });
  });

  const rest = shuffle_(all.filter(function (q) { return !used[q.id]; }));
  while (picked.length < Math.min(20, all.length) && rest.length) {
    picked.push(rest.shift());
  }
  return shuffle_(picked);
}

function shuffle_(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }
  return items;
}

function makeAttemptId_() {
  const now = new Date();
  const stamp = Utilities.formatDate(now, APP.TIMEZONE, 'yyyyMMddHHmmss');
  return 'A-' + stamp + '-' + Math.floor(Math.random() * 9000 + 1000);
}

function toIso_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.toISOString();
  }
  const text = String(value);
  const date = new Date(text);
  return isFinite(date.getTime()) ? date.toISOString() : text;
}

function toBool_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function logActivity_(role, action, detail) {
  try {
    const sheet = getSheet_(SHEETS.activity);
    sheet.appendRow([
      new Date().toISOString(),
      role || 'system',
      action || '',
      String(detail || '').slice(0, 500)
    ]);
  } catch (error) {
    console.error('Log aktivitas gagal: ' + error.message);
  }
}
