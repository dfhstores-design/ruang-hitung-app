/**
 * Ruang Hitung v2
 * Latihan matematika kelas 9, multi-siswa, dengan monitoring guru dan orang tua.
 *
 * Data disimpan di Google Sheets yang dibuat otomatis pada pemakaian pertama.
 */

const APP = {
  NAME: 'Ruang Hitung',
  DATA_TITLE: 'Ruang Hitung - Data',
  TIMEZONE: 'Asia/Jakarta',
  SESSION_SECONDS: 21600,
  MAX_STUDENTS: 40,
  SETUP_VERSION: '5',
  DEFAULT_TEACHER_CODE: 'GURU-2049',
  DEFAULT_STUDENT_PIN: '123456',
  DEFAULT_PARENT_PIN: '654321',
  PACKAGES: {
    'exam:full': { mode: 'exam', title: 'Simulasi Ujian Akhir', durationMin: 90 },
    'exam:quick': { mode: 'exam', title: 'Ujian Kilat', durationMin: 30 },
    'practice:mixed': { mode: 'practice', title: 'Latihan Campuran', durationMin: null }
  }
};

const SHEETS = {
  questions: 'Questions',
  students: 'Students',
  packages: 'Packages',
  attempts: 'Attempts',
  answers: 'Answers',
  activity: 'Activity',
  audit: 'Audit',
  liveSessions: 'LiveSessions',
  liveParticipants: 'LiveParticipants',
  liveAnswers: 'LiveAnswers'
};

const QUESTION_HEADERS = [
  'id', 'topicId', 'topic', 'difficulty', 'question',
  'optionA', 'optionB', 'optionC', 'optionD',
  'answerIndex', 'solution', 'active',
  'familyId', 'variantId', 'level', 'skill'
];

const STUDENT_HEADERS = [
  'id', 'name', 'nameKey', 'studentPinHash', 'studentSalt',
  'parentPinHash', 'parentSalt', 'active', 'createdAt', 'updatedAt'
];

const ATTEMPT_HEADERS = [
  'id', 'studentId', 'mode', 'packageId', 'packageTitle',
  'startedAt', 'submittedAt', 'status', 'score', 'correctCount',
  'totalQuestions', 'durationSec', 'questionIds',
  'reviewUnlocked', 'reviewRequested', 'unlockedAt', 'unlockedBy', 'requestAt',
  'optionOrder', 'adaptiveLevel'
];

const ANSWER_HEADERS = [
  'attemptId', 'questionId', 'selectedIndex', 'isCorrect', 'answeredAt',
  'needsReview', 'flagNote', 'flaggedBy', 'flaggedAt'
];

const ACTIVITY_HEADERS = ['timestamp', 'role', 'action', 'detail'];

const PACKAGE_HEADERS = [
  'id', 'name', 'mode', 'questionCount', 'durationMin', 'topicIds',
  'levelStrategy', 'liveSecondsPerQuestion', 'availableFrom', 'availableUntil',
  'active', 'createdAt', 'updatedAt'
];

const AUDIT_HEADERS = [
  'timestamp', 'actorRole', 'actorStudentId', 'actorName',
  'action', 'entityType', 'entityId', 'detail', 'metadata'
];

const LIVE_SESSION_HEADERS = [
  'id', 'code', 'packageId', 'title', 'hostName', 'status', 'currentIndex',
  'questionIds', 'optionOrder', 'secondsPerQuestion', 'startedAt',
  'questionStartedAt', 'endedAt', 'createdAt'
];

const LIVE_PARTICIPANT_HEADERS = [
  'sessionId', 'studentId', 'studentName', 'joinedAt', 'score', 'correctCount', 'lastSeenAt'
];

const LIVE_ANSWER_HEADERS = [
  'sessionId', 'questionId', 'studentId', 'selectedIndex', 'isCorrect', 'answeredAt', 'responseMs'
];

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

function doPost(e) {
  const respond = function (payload) {
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  };
  const handlers = {
    login: login,
    logout: logout,
    getDashboard: getDashboard,
    getStudentDetail: getStudentDetail,
    startAttempt: startAttempt,
    resumeAttempt: resumeAttempt,
    saveAnswer: saveAnswer,
    submitAttempt: submitAttempt,
    getResult: getResult,
    requestReview: requestReview,
    setReviewUnlocked: setReviewUnlocked,
    saveStudent: saveStudent,
    updateTeacherCode: updateTeacherCode,
    importQuestions: importQuestions,
    getPackages: getPackages,
    savePackage: savePackage,
    getTeacherQuestions: getTeacherQuestions,
    saveQuestion: saveQuestion,
    setGeminiKey: setGeminiKey,
    hasGeminiKey: hasGeminiKey_,
    generateQuestions: generateQuestions,
    generateOfflineQuestions: generateOfflineQuestions,
    setQuestionActive: setQuestionActive,
    generateReport: generateReport,
    setAnswerFlag: setAnswerFlag,
    getDifficultQuestions: getDifficultQuestions,
    getAuditLogs: getAuditLogs,
    createLiveSession: createLiveSession,
    joinLiveSession: joinLiveSession,
    getLiveState: getLiveState,
    startLiveSession: startLiveSession,
    submitLiveAnswer: submitLiveAnswer,
    revealLiveAnswer: revealLiveAnswer,
    nextLiveQuestion: nextLiveQuestion,
    endLiveSession: endLiveSession
  };
  try {
    let body = {};
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : '{}');
    } catch (parseError) {
      body = {};
    }
    const action = String(body.action || '');
    const args = Array.isArray(body.args) ? body.args : [];
    const fn = handlers[action];
    if (!fn) return respond({ error: 'Aksi tidak dikenali.' });
    const result = fn.apply(null, args);
    return respond(result === undefined || result === null ? null : result);
  } catch (error) {
    return respond({ error: (error && error.message) ? error.message : 'Terjadi kendala.' });
  }
}

function ensureSetup_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('SPREADSHEET_ID');

  if (!existingId) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (props.getProperty('SPREADSHEET_ID')) {
        ensureSetup_();
        return;
      }

      const ss = SpreadsheetApp.create(APP.DATA_TITLE);
      props.setProperty('SPREADSHEET_ID', ss.getId());
      ss.setSpreadsheetTimeZone(APP.TIMEZONE);

      const first = ss.getSheets()[0];
      first.setName(SHEETS.questions);
      const questions = first;
      const students = ss.insertSheet(SHEETS.students);
      const packages = ss.insertSheet(SHEETS.packages);
      const attempts = ss.insertSheet(SHEETS.attempts);
      const answers = ss.insertSheet(SHEETS.answers);
      const activity = ss.insertSheet(SHEETS.activity);
      const audit = ss.insertSheet(SHEETS.audit);
      const liveSessions = ss.insertSheet(SHEETS.liveSessions);
      const liveParticipants = ss.insertSheet(SHEETS.liveParticipants);
      const liveAnswers = ss.insertSheet(SHEETS.liveAnswers);

      formatHeader_(questions, QUESTION_HEADERS);
      formatHeader_(students, STUDENT_HEADERS);
      formatHeader_(packages, PACKAGE_HEADERS);
      formatHeader_(attempts, ATTEMPT_HEADERS);
      formatHeader_(answers, ANSWER_HEADERS);
      formatHeader_(activity, ACTIVITY_HEADERS);
      formatHeader_(audit, AUDIT_HEADERS);
      formatHeader_(liveSessions, LIVE_SESSION_HEADERS);
      formatHeader_(liveParticipants, LIVE_PARTICIPANT_HEADERS);
      formatHeader_(liveAnswers, LIVE_ANSWER_HEADERS);

      seedQuestions_(questions);
      seedDefaultStudent_(students);
      seedDefaultPackages_(packages);

      ensureDefaults_(props);
      props.setProperty('SETUP_VERSION', APP.SETUP_VERSION);
      logActivity_('system', 'setup', 'Spreadsheet data v2 dibuat.');
      return;
    } finally {
      lock.releaseLock();
    }
  }

  const ss = getSpreadsheet_();
  const students = ensureStudentsSheet_(ss);

  if (PropertiesService.getScriptProperties().getProperty('SETUP_VERSION') !== APP.SETUP_VERSION) {
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('V3_BACKUP_ID')) {
      try {
        const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMdd-HHmmss');
        const backup = ss.copy('Ruang Hitung - Backup before v3 migration - ' + stamp);
        props.setProperty('V3_BACKUP_ID', backup.getId());
        props.setProperty('V3_BACKUP_URL', backup.getUrl());
        logActivity_('system', 'backup_v3', backup.getUrl());
      } catch (backupError) {
        console.error('Backup v3 gagal: ' + backupError.message);
      }
    }
    migrateV3_(ss);
    props.setProperty('SETUP_VERSION', APP.SETUP_VERSION);
  }

  ensureDefaults_(PropertiesService.getScriptProperties());
}

function ensureDefaults_(props) {
  props.setProperty('CODE_TEACHER', props.getProperty('CODE_TEACHER') || APP.DEFAULT_TEACHER_CODE);
}

function ensureStudentsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.students);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.students);
    formatHeader_(sheet, STUDENT_HEADERS);
  }
  if (sheet.getLastRow() < 2) {
    seedDefaultStudent_(sheet);
  }
  return sheet;
}

function seedDefaultStudent_(sheet) {
  if (sheet.getLastRow() >= 2) return;
  const props = PropertiesService.getScriptProperties();
  const name = sanitizeName_(props.getProperty('NAME_STUDENT') || 'Siswa') || 'Siswa';
  const now = new Date().toISOString();
  const studentSalt = makeSalt_();
  const parentSalt = makeSalt_();
  sheet.appendRow([
    makeStudentId_(),
    name,
    normalizeNameKey_(name),
    hashPin_(APP.DEFAULT_STUDENT_PIN, studentSalt),
    studentSalt,
    hashPin_(APP.DEFAULT_PARENT_PIN, parentSalt),
    parentSalt,
    true,
    now,
    now
  ]);
}

function migrateV3_(ss) {
  const questions = ss.getSheetByName(SHEETS.questions);
  if (!questions) throw new Error('Sheet Questions tidak ditemukan saat migrasi v3.');

  const qHeader = questions.getRange(1, 1, 1, 16).getValues()[0];
  if (String(qHeader[12]) !== 'familyId') {
    questions.insertColumnsAfter(12, 4);
    questions.getRange(1, 13, 1, 4).setValues([['familyId', 'variantId', 'level', 'skill']]);

    const lastQ = questions.getLastRow();
    if (lastQ > 1) {
      const rows = questions.getRange(2, 1, lastQ - 1, 12).getValues();
      const meta = rows.map(function (row) {
        const difficulty = String(row[3] || 'Sedang');
        const level = difficulty === 'Mudah' ? 1 : difficulty === 'Tantangan' ? 3 : 2;
        return [String(row[0]), 1, level, String(row[1])];
      });
      questions.getRange(2, 13, lastQ - 1, 4).setValues(meta);
    }
  }

  questions.getRange(1, 1, 1, QUESTION_HEADERS.length).setValues([QUESTION_HEADERS]);
  formatHeader_(questions, QUESTION_HEADERS);
  seedV3AdditionalQuestions_(questions);

  const attempts = ss.getSheetByName(SHEETS.attempts);
  if (!attempts) throw new Error('Sheet Attempts tidak ditemukan saat migrasi v3.');
  const aHeader = attempts.getRange(1, 1, 1, 20).getValues()[0];
  if (String(aHeader[18]) !== 'optionOrder') {
    attempts.insertColumnsAfter(18, 2);
    attempts.getRange(1, 19, 1, 2).setValues([['optionOrder', 'adaptiveLevel']]);
    const lastA = attempts.getLastRow();
    if (lastA > 1) {
      const blankOrders = [];
      const blankLevels = [];
      for (let i = 0; i < lastA - 1; i++) {
        blankOrders.push(['{}']);
        blankLevels.push([0]);
      }
      attempts.getRange(2, 19, lastA - 1, 1).setValues(blankOrders);
      attempts.getRange(2, 20, lastA - 1, 1).setValues(blankLevels);
    }
  }
  attempts.getRange(1, 1, 1, ATTEMPT_HEADERS.length).setValues([ATTEMPT_HEADERS]);
  formatHeader_(attempts, ATTEMPT_HEADERS);

  const answers = ss.getSheetByName(SHEETS.answers);
  if (!answers) throw new Error('Sheet Answers tidak ditemukan saat migrasi v3.');
  const answerHeader = answers.getRange(1, 1, 1, 9).getValues()[0];
  if (String(answerHeader[5]) !== 'needsReview') {
    answers.insertColumnsAfter(5, 4);
    answers.getRange(1, 6, 1, 4).setValues([['needsReview', 'flagNote', 'flaggedBy', 'flaggedAt']]);
    const lastAnswer = answers.getLastRow();
    if (lastAnswer > 1) {
      const flags = [];
      for (let i = 0; i < lastAnswer - 1; i++) flags.push([false, '', '', '']);
      answers.getRange(2, 6, lastAnswer - 1, 4).setValues(flags);
    }
  }
  answers.getRange(1, 1, 1, ANSWER_HEADERS.length).setValues([ANSWER_HEADERS]);
  formatHeader_(answers, ANSWER_HEADERS);

  let packages = ss.getSheetByName(SHEETS.packages);
  if (!packages) {
    packages = ss.insertSheet(SHEETS.packages);
    formatHeader_(packages, PACKAGE_HEADERS);
  }
  if (packages.getLastRow() < 2) seedDefaultPackages_(packages);
  ensureQuick5Package_(packages);

  let audit = ss.getSheetByName(SHEETS.audit);
  if (!audit) {
    audit = ss.insertSheet(SHEETS.audit);
    formatHeader_(audit, AUDIT_HEADERS);
  }
  const liveSessions = ss.getSheetByName(SHEETS.liveSessions) || ss.insertSheet(SHEETS.liveSessions);
  const liveParticipants = ss.getSheetByName(SHEETS.liveParticipants) || ss.insertSheet(SHEETS.liveParticipants);
  const liveAnswers = ss.getSheetByName(SHEETS.liveAnswers) || ss.insertSheet(SHEETS.liveAnswers);
  formatHeader_(liveSessions, LIVE_SESSION_HEADERS);
  formatHeader_(liveParticipants, LIVE_PARTICIPANT_HEADERS);
  formatHeader_(liveAnswers, LIVE_ANSWER_HEADERS);

  invalidateQuestionsCache_();
  logActivity_('system', 'migrate_v3', 'Data ditingkatkan ke skema v3.');
}

function questionToRow_(q) {
  const difficulty = q.difficulty || 'Sedang';
  const level = q.level || (difficulty === 'Mudah' ? 1 : difficulty === 'Tantangan' ? 3 : 2);
  return [
    q.id,
    q.topicId,
    topicName_(q.topicId),
    difficulty,
    q.question,
    q.options[0],
    q.options[1],
    q.options[2],
    q.options[3],
    q.answer,
    q.solution,
    true,
    q.familyId || q.id,
    q.variantId || 1,
    level,
    q.skill || q.topicId
  ];
}

function seedV3AdditionalQuestions_(sheet) {
  const last = sheet.getLastRow();
  const existing = {};
  if (last > 1) {
    const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    ids.forEach(function (row) { if (row[0]) existing[String(row[0])] = true; });
  }

  const rows = getQuestionBank().questions.filter(function (q) {
    return !existing[String(q.id)];
  }).map(questionToRow_);

  if (!rows.length) return;
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, QUESTION_HEADERS.length).setValues(rows);
  logActivity_('system', 'seed_v3_questions', rows.length + ' soal v3 ditambahkan.');
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Data ruang belajar belum siap.');
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Lembar data ' + name + ' tidak ditemukan.');
  return sheet;
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

function seedQuestions_(sheet) {
  const rows = getQuestionBank().questions.map(questionToRow_);
  sheet.getRange(2, 1, rows.length, QUESTION_HEADERS.length).setValues(rows);
  sheet.setColumnWidth(1, 70);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 210);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 420);
  sheet.setColumnWidth(10, 95);
  sheet.setColumnWidth(11, 520);
  sheet.setColumnWidth(12, 70);
  sheet.setColumnWidth(13, 150);
  sheet.setColumnWidth(14, 80);
  sheet.setColumnWidth(15, 70);
  sheet.setColumnWidth(16, 140);
  sheet.getRange(2, 1, rows.length, QUESTION_HEADERS.length).setWrap(true).setVerticalAlignment('top');
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
  const sheet = getSheet_(SHEETS.questions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, QUESTION_HEADERS.length).getValues();
  const questions = values.filter(function (row) {
    return row[0] && String(row[11]).toUpperCase() !== 'FALSE' && row[11] !== false;
  }).map(function (row) {
    const difficulty = String(row[3] || 'Sedang');
    const level = Number(row[14]) || (difficulty === 'Mudah' ? 1 : difficulty === 'Tantangan' ? 3 : 2);
    return {
      id: String(row[0]),
      topicId: String(row[1]),
      topic: String(row[2]),
      difficulty: difficulty,
      question: String(row[4]),
      options: [String(row[5]), String(row[6]), String(row[7]), String(row[8])],
      answer: Number(row[9]),
      solution: String(row[10]),
      familyId: String(row[12] || row[0]),
      variantId: Number(row[13] || 1),
      level: level,
      skill: String(row[15] || row[1])
    };
  });

  return questions;
}

function getQuestionMap_() {
  const map = {};
  getQuestions_().forEach(function (q) { map[q.id] = q; });
  return map;
}

function invalidateQuestionsCache_() {
  CacheService.getScriptCache().remove('questions_v3');
}

function normalizeCode_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeNameKey_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function sanitizeName_(value) {
  return String(value || '').replace(/[<>&]/g, '').replace(/\s+/g, ' ').trim();
}

function validatePin_(pin) {
  return /^\d{4,8}$/.test(String(pin || '').trim());
}

function makeSalt_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

function hashPin_(pin, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + ':' + String(pin),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    const value = b < 0 ? b + 256 : b;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function verifyPin_(pin, salt, hash) {
  return hashPin_(pin, salt) === hash;
}

function makeStudentId_() {
  return 'S-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function getTeacherCode_() {
  const props = PropertiesService.getScriptProperties();
  ensureDefaults_(props);
  return props.getProperty('CODE_TEACHER');
}

function roleLabel_(role) {
  if (role === 'student') return 'Siswa';
  if (role === 'parent') return 'Orang tua';
  if (role === 'teacher') return 'Guru';
  return 'Pengguna';
}

function readStudents_() {
  const sheet = getSheet_(SHEETS.students);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, STUDENT_HEADERS.length).getValues();
  return values.map(function (row, index) {
    return {
      _row: index + 2,
      id: String(row[0]),
      name: String(row[1]),
      nameKey: String(row[2]),
      studentPinHash: String(row[3]),
      studentSalt: String(row[4]),
      parentPinHash: String(row[5]),
      parentSalt: String(row[6]),
      active: toBool_(row[7]),
      createdAt: toIso_(row[8]),
      updatedAt: toIso_(row[9])
    };
  }).filter(function (s) { return s.id; });
}

function studentPublic_(student) {
  return {
    id: student.id,
    name: student.name,
    active: student.active === true,
    createdAt: student.createdAt || '',
    updatedAt: student.updatedAt || ''
  };
}

function findStudentById_(id) {
  return readStudents_().filter(function (s) { return s.id === String(id); })[0] || null;
}

function findStudentByName_(name) {
  const key = normalizeNameKey_(name);
  if (!key) return null;
  return readStudents_().filter(function (s) { return s.nameKey === key; })[0] || null;
}

function validateStudentName_(name, exceptId) {
  const clean = sanitizeName_(name);
  if (clean.length < 2 || clean.length > 40) {
    throw new Error('Nama siswa harus terdiri dari 2 sampai 40 karakter.');
  }
  const key = normalizeNameKey_(clean);
  const duplicate = readStudents_().filter(function (s) {
    return s.nameKey === key && s.id !== exceptId;
  })[0];
  if (duplicate) throw new Error('Nama siswa sudah dipakai. Gunakan nama yang berbeda.');
  return { name: clean, nameKey: key };
}

function saveStudent(token, payload) {
  const session = requireRole_(token, ['teacher']);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = payload || {};
    const id = String(data.id || '').trim();
    let student;

    if (id) {
      student = findStudentById_(id);
      if (!student) throw new Error('Siswa tidak ditemukan.');
      const name = validateStudentName_(data.name, student.id);
      const active = data.active !== false;
      let studentPinHash = student.studentPinHash;
      let studentSalt = student.studentSalt;
      let parentPinHash = student.parentPinHash;
      let parentSalt = student.parentSalt;

      if (String(data.studentPin || '').trim()) {
        if (!validatePin_(data.studentPin)) throw new Error('PIN siswa harus 4 sampai 8 angka.');
        studentSalt = makeSalt_();
        studentPinHash = hashPin_(String(data.studentPin).trim(), studentSalt);
      }
      if (String(data.parentPin || '').trim()) {
        if (!validatePin_(data.parentPin)) throw new Error('PIN orang tua harus 4 sampai 8 angka.');
        parentSalt = makeSalt_();
        parentPinHash = hashPin_(String(data.parentPin).trim(), parentSalt);
      }

      const now = new Date().toISOString();
      getSheet_(SHEETS.students).getRange(student._row, 1, 1, STUDENT_HEADERS.length).setValues([[
        student.id, name.name, name.nameKey, studentPinHash, studentSalt,
        parentPinHash, parentSalt, active, student.createdAt || now, now
      ]]);
      logActivity_(session.role, 'update_student', name.name);
      audit_(session, 'update_student', 'student', student.id, name.name);
      return studentPublic_({
        id: student.id,
        name: name.name,
        active: active,
        createdAt: student.createdAt,
        updatedAt: now
      });
    }

    const students = readStudents_();
    if (students.length >= APP.MAX_STUDENTS) {
      throw new Error('Batas ' + APP.MAX_STUDENTS + ' siswa sudah tercapai.');
    }
    const name = validateStudentName_(data.name, '');
    if (!validatePin_(data.studentPin)) throw new Error('PIN siswa harus 4 sampai 8 angka.');
    if (!validatePin_(data.parentPin)) throw new Error('PIN orang tua harus 4 sampai 8 angka.');

    const studentSalt = makeSalt_();
    const parentSalt = makeSalt_();
    const now = new Date().toISOString();
    const newStudent = {
      id: makeStudentId_(),
      name: name.name,
      nameKey: name.nameKey,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    getSheet_(SHEETS.students).appendRow([
      newStudent.id, newStudent.name, newStudent.nameKey,
      hashPin_(String(data.studentPin).trim(), studentSalt), studentSalt,
      hashPin_(String(data.parentPin).trim(), parentSalt), parentSalt,
      true, now, now
    ]);
    logActivity_(session.role, 'add_student', newStudent.name);
    audit_(session, 'add_student', 'student', newStudent.id, newStudent.name);
    return studentPublic_(newStudent);
  } finally {
    lock.releaseLock();
  }
}

function login(role, name, secret) {
  ensureSetup_();
  const normalizedRole = String(role || '').toLowerCase();
  if (['student', 'parent', 'teacher'].indexOf(normalizedRole) === -1) {
    throw new Error('Peran login tidak dikenali.');
  }

  const failKey = normalizedRole + ':' + (normalizedRole === 'teacher' ? 'teacher' : normalizeNameKey_(name));
  const cache = CacheService.getScriptCache();
  if (cache.get('login_block:' + failKey)) {
    throw new Error('Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.');
  }

  let student = null;
  if (normalizedRole === 'teacher') {
    if (normalizeCode_(secret) !== normalizeCode_(getTeacherCode_())) {
      registerLoginFailure_(failKey);
      throw new Error('Kode guru tidak dikenali.');
    }
  } else {
    student = findStudentByName_(name);
    if (!student || !student.active) {
      registerLoginFailure_(failKey);
      throw new Error('Nama atau PIN tidak cocok. Periksa kembali.');
    }
    const pin = String(secret || '').trim();
    const hash = normalizedRole === 'student' ? student.studentPinHash : student.parentPinHash;
    const salt = normalizedRole === 'student' ? student.studentSalt : student.parentSalt;
    if (!validatePin_(pin) || !verifyPin_(pin, salt, hash)) {
      registerLoginFailure_(failKey);
      throw new Error('Nama atau PIN tidak cocok. Periksa kembali.');
    }
  }

  cache.remove('login_fail:' + failKey);
  cache.remove('login_block:' + failKey);

  const payload = {
    role: normalizedRole,
    name: normalizedRole === 'teacher'
      ? 'Guru'
      : normalizedRole === 'parent'
        ? 'Orang tua ' + student.name
        : student.name,
    studentId: student ? student.id : '',
    studentName: student ? student.name : ''
  };
  const token = createSession_(payload);
  logActivity_(normalizedRole, 'login', payload.studentName || 'Guru');
  audit_({ role: normalizedRole, studentId: student ? student.id : '', name: payload.name }, 'login', 'session', '', 'Login berhasil.');

  return {
    token: token,
    role: normalizedRole,
    name: payload.name,
    studentName: payload.studentName,
    studentId: payload.studentId
  };
}

function registerLoginFailure_(failKey) {
  const cache = CacheService.getScriptCache();
  const key = 'login_fail:' + failKey;
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 120);
  if (count >= 8) {
    cache.put('login_block:' + failKey, '1', 60);
    cache.remove(key);
  }
}

function createSession_(payload) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const data = {
    role: payload.role,
    name: payload.name,
    studentId: payload.studentId || '',
    studentName: payload.studentName || '',
    createdAt: new Date().toISOString()
  };
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(data), APP.SESSION_SECONDS);
  return token;
}

function getSession_(token) {
  if (!token) throw new Error('Sesi tidak ditemukan. Silakan masuk kembali.');
  const raw = CacheService.getScriptCache().get('session:' + token);
  if (!raw) throw new Error('Sesi berakhir. Silakan masuk kembali.');
  let data;
  try { data = JSON.parse(raw); } catch (error) { throw new Error('Sesi tidak valid. Silakan masuk kembali.'); }
  if (!data.role) throw new Error('Sesi tidak valid. Silakan masuk kembali.');
  data.token = token;
  return data;
}

function requireRole_(token, roles) {
  const session = getSession_(token);
  if (roles.indexOf(session.role) === -1) {
    throw new Error('Akun ini tidak memiliki akses untuk tindakan tersebut.');
  }
  return session;
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('session:' + token);
  return { ok: true };
}

function seedDefaultPackages_(sheet) {
  if (sheet.getLastRow() >= 2) return;
  const now = new Date().toISOString();
  const rows = [];
  rows.push(['practice:mixed', 'Latihan Campuran', 'practice', 20, 0, 'all', 'adaptive', 0, '', '', true, now, now]);
  rows.push(['practice:quick5', 'Latihan Singkat', 'practice', 5, 0, 'all', 'mixed', 0, '', '', true, now, now]);
  getTopics_().forEach(function (topic) {
    rows.push(['practice:topic:' + topic.id, topic.name, 'practice', 10, 0, topic.id, 'adaptive', 0, '', '', true, now, now]);
  });
  rows.push(['exam:full', 'Simulasi Ujian Akhir', 'exam', 60, 90, 'all', 'stratified', 0, '', '', true, now, now]);
  rows.push(['exam:quick', 'Ujian Kilat', 'exam', 20, 30, 'all', 'stratified', 0, '', '', true, now, now]);
  rows.push(['quiz:live', 'Kuis Langsung', 'quiz', 10, 0, 'all', 'mixed', 20, '', '', true, now, now]);
  sheet.getRange(2, 1, rows.length, PACKAGE_HEADERS.length).setValues(rows);
}

function ensureQuick5Package_(sheet) {
  try {
    const last = sheet.getLastRow();
    if (last < 2) return;
    const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === 'practice:quick5') return;
    }
    const now = new Date().toISOString();
    sheet.appendRow(['practice:quick5', 'Latihan Singkat', 'practice', 5, 0, 'all', 'mixed', 0, '', '', true, now, now]);
    logActivity_('system', 'seed_quick5', 'Paket Latihan Singkat 5 soal ditambahkan.');
  } catch (error) {
    console.error('ensureQuick5Package_ gagal: ' + error.message);
  }
}

function readPackages_() {
  const sheet = getSheet_(SHEETS.packages);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, PACKAGE_HEADERS.length).getValues();
  return values.filter(function (row) { return row[0]; }).map(function (row, index) {
    return {
      _row: index + 2,
      id: String(row[0]),
      name: String(row[1]),
      mode: String(row[2]),
      questionCount: Number(row[3]) || 0,
      durationMin: Number(row[4]) || 0,
      topicIds: String(row[5] || 'all'),
      levelStrategy: String(row[6] || 'mixed'),
      liveSecondsPerQuestion: Number(row[7]) || 0,
      availableFrom: row[8] ? toIso_(row[8]) : '',
      availableUntil: row[9] ? toIso_(row[9]) : '',
      active: toBool_(row[10]),
      createdAt: row[11] ? toIso_(row[11]) : '',
      updatedAt: row[12] ? toIso_(row[12]) : ''
    };
  });
}

function getPackageById_(packageId) {
  return readPackages_().filter(function (p) { return p.id === String(packageId); })[0] || null;
}

function isPackageAvailable_(pkg, date) {
  if (!pkg || !pkg.active) return false;
  const now = date ? date.getTime() : Date.now();
  if (pkg.availableFrom) {
    const from = new Date(pkg.availableFrom).getTime();
    if (isFinite(from) && now < from) return false;
  }
  if (pkg.availableUntil) {
    const until = new Date(pkg.availableUntil).getTime();
    if (isFinite(until) && now > until) return false;
  }
  return true;
}

function packageSummary_(pkg) {
  const topics = pkg.topicIds === 'all' ? getTopics_() : pkg.topicIds.split(',').filter(Boolean);
  return {
    id: pkg.id,
    name: pkg.name,
    title: pkg.name,
    mode: pkg.mode,
    kind: pkg.mode === 'quiz' ? 'kuis' : pkg.mode === 'exam' ? 'ujian' : (pkg.topicIds === 'all' ? 'campuran' : 'topik'),
    subtitle: pkg.mode === 'practice'
      ? 'Latihan adaptif sesuai kemampuanmu'
      : pkg.mode === 'exam'
        ? 'Ujian dengan waktu dan jadwal'
        : 'Kuis langsung bersama kelas',
    questionCount: pkg.questionCount,
    durationMin: pkg.durationMin || null,
    topicIds: pkg.topicIds,
    topicCount: topics.length,
    levelStrategy: pkg.levelStrategy,
    liveSecondsPerQuestion: pkg.liveSecondsPerQuestion,
    availableFrom: pkg.availableFrom,
    availableUntil: pkg.availableUntil,
    active: pkg.active
  };
}

function packagesForRole_(role) {
  const now = new Date();
  return readPackages_().filter(function (pkg) {
    if (!pkg.active) return false;
    if (role === 'teacher') return true;
    return isPackageAvailable_(pkg, now);
  }).map(packageSummary_);
}

function getPackages(token) {
  requireRole_(token, ['teacher']);
  return readPackages_().map(packageSummary_);
}

function savePackage(token, payload) {
  const session = requireRole_(token, ['teacher']);
  const data = payload || {};
  const name = String(data.name || '').trim();
  if (name.length < 2 || name.length > 60) throw new Error('Nama paket harus 2 sampai 60 karakter.');
  const mode = String(data.mode || 'practice');
  if (['practice', 'exam', 'quiz'].indexOf(mode) === -1) throw new Error('Mode paket tidak dikenal.');
  const questionCount = Number(data.questionCount);
  if (!isFinite(questionCount) || questionCount < 1 || questionCount > 100) throw new Error('Jumlah soal harus 1 sampai 100.');
  const durationMin = Number(data.durationMin) || 0;
  if (mode === 'exam' && (durationMin < 1 || durationMin > 180)) throw new Error('Durasi ujian harus 1 sampai 180 menit.');
  if (mode !== 'exam' && durationMin !== 0) throw new Error('Durasi hanya diisi untuk mode ujian.');

  const validTopics = getTopics_().map(function (t) { return t.id; });
  let topicIds = data.topicIds;
  if (Array.isArray(topicIds)) topicIds = topicIds.join(',');
  topicIds = String(topicIds || 'all').trim();
  if (topicIds !== 'all') {
    const parts = topicIds.split(',').filter(Boolean);
    if (!parts.length || parts.some(function (id) { return validTopics.indexOf(id) === -1; })) {
      throw new Error('Topik paket tidak valid.');
    }
  }

  const levelStrategy = String(data.levelStrategy || 'mixed');
  if (['adaptive', 'mixed', 'easy', 'medium', 'hard', 'stratified'].indexOf(levelStrategy) === -1) {
    throw new Error('Strategi level tidak dikenal.');
  }
  const liveSeconds = Number(data.liveSecondsPerQuestion) || 0;
  if (mode === 'quiz' && (liveSeconds < 10 || liveSeconds > 120)) throw new Error('Waktu per soal kuis harus 10 sampai 120 detik.');

  const availableFrom = String(data.availableFrom || '').trim();
  const availableUntil = String(data.availableUntil || '').trim();
  if (availableFrom && !isFinite(new Date(availableFrom).getTime())) throw new Error('Jadwal mulai tidak valid.');
  if (availableUntil && !isFinite(new Date(availableUntil).getTime())) throw new Error('Jadwal selesai tidak valid.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(SHEETS.packages);
    const id = String(data.id || '').trim() || ('PKG-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase());
    const existing = getPackageById_(id);
    const now = new Date().toISOString();
    const row = [
      id, name, mode, questionCount, durationMin, topicIds, levelStrategy,
      liveSeconds, availableFrom, availableUntil, data.active !== false,
      existing ? existing.createdAt : now, now
    ];
    if (existing) {
      sheet.getRange(existing._row, 1, 1, PACKAGE_HEADERS.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    audit_(session, existing ? 'update_package' : 'create_package', 'package', id, name, { mode: mode });
    return packageSummary_(getPackageById_(id));
  } finally {
    lock.releaseLock();
  }
}

function getTeacherQuestions(token) {
  requireRole_(token, ['teacher']);
  const sheet = getSheet_(SHEETS.questions);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, QUESTION_HEADERS.length).getValues();
  return values.filter(function (row) { return row[0]; }).map(function (row) {
    const difficulty = String(row[3] || 'Sedang');
    return {
      id: String(row[0]),
      topicId: String(row[1]),
      topic: String(row[2]),
      difficulty: difficulty,
      question: String(row[4]),
      options: [String(row[5]), String(row[6]), String(row[7]), String(row[8])],
      answer: Number(row[9]),
      solution: String(row[10]),
      active: String(row[11]).toUpperCase() !== 'FALSE' && row[11] !== false,
      familyId: String(row[12] || row[0]),
      variantId: Number(row[13] || 1),
      level: Number(row[14]) || (difficulty === 'Mudah' ? 1 : difficulty === 'Tantangan' ? 3 : 2),
      skill: String(row[15] || row[1])
    };
  });
}

function saveQuestion(token, payload) {
  const session = requireRole_(token, ['teacher']);
  const data = payload || {};
  const topics = getTopics_();
  const topicMap = {};
  topics.forEach(function (t) { topicMap[t.id] = t; });
  const topicId = String(data.topicId || '').trim().toLowerCase();
  if (!topicMap[topicId]) throw new Error('Topik soal tidak dikenal.');
  const question = String(data.question || '').trim();
  if (question.length < 5) throw new Error('Pertanyaan terlalu pendek.');
  const options = ['optionA', 'optionB', 'optionC', 'optionD'].map(function (key) {
    return String(data[key] || '').trim();
  });
  if (options.some(function (o) { return !o; })) throw new Error('Semua pilihan A sampai D wajib diisi.');
  if (new Set(options).size !== 4) throw new Error('Pilihan jawaban tidak boleh sama.');
  const answer = parseAnswerIndex_(data.answer);
  if (answer === null) throw new Error('Jawaban harus A, B, C, D, atau 0 sampai 3.');
  const solution = String(data.solution || '').trim();
  if (solution.length < 10) throw new Error('Pembahasan terlalu pendek.');
  const level = normalizeLevel_(data.level, normalizeDifficulty_(data.difficulty));
  const difficulty = data.difficulty ? normalizeDifficulty_(data.difficulty) : (level === 1 ? 'Mudah' : level === 3 ? 'Tantangan' : 'Sedang');
  const id = String(data.id || '').trim() || ('Q-' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100));
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new Error('ID soal tidak valid.');
  let familyId = String(data.familyId || id).trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(familyId)) throw new Error('familyId tidak valid.');
  const skill = String(data.skill || topicId).trim().slice(0, 60);
  const active = data.active !== false;
  const row = [
    id, topicId, topicMap[topicId].name, difficulty, question,
    options[0], options[1], options[2], options[3], answer, solution, active,
    familyId, Number(data.variantId) || 1, level, skill
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(SHEETS.questions);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === id) { rowIndex = i + 1; break; }
    }
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, QUESTION_HEADERS.length).setValues([row]);
      audit_(session, 'update_question', 'question', id, question.slice(0, 80));
    } else {
      sheet.appendRow(row);
      audit_(session, 'create_question', 'question', id, question.slice(0, 80));
    }
    invalidateQuestionsCache_();
    return {
      id: id,
      topicId: topicId,
      topic: topicMap[topicId].name,
      difficulty: difficulty,
      question: question,
      options: options,
      answer: answer,
      solution: solution,
      active: active,
      familyId: familyId,
      variantId: Number(data.variantId) || 1,
      level: level,
      skill: skill
    };
  } finally {
    lock.releaseLock();
  }
}

function setGeminiKey(token, apiKey) {
  requireRole_(token, ['teacher']);
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('API key tidak boleh kosong.');
  if (!/^[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error('Format API key tidak valid.');
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  audit_(getSession_(token), 'set_gemini_key', 'settings', '', 'Kunci Gemini disimpan.');
  return { ok: true, hasKey: true };
}

function hasGeminiKey_(token) {
  requireRole_(token, ['teacher']);
  return { hasKey: !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') };
}

function generateQuestions(token, payload) {
  const session = requireRole_(token, ['teacher']);
  const data = payload || {};
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Kunci Gemini belum diatur. Masukkan API key terlebih dahulu.');

  const topics = getTopics_();
  const topicMap = {};
  topics.forEach(function (t) { topicMap[t.id] = t; });

  const topicId = String(data.topicId || '').trim().toLowerCase();
  if (!topicMap[topicId]) throw new Error('Topik tidak dikenal.');
  const level = Number(data.level) || 2;
  if ([1, 2, 3].indexOf(level) === -1) throw new Error('Level harus 1 (Mudah), 2 (Sedang), atau 3 (Tantangan).');
  const count = Math.min(Math.max(Number(data.count) || 3, 1), 10);

  const levelName = level === 1 ? 'Mudah' : level === 3 ? 'Tantangan' : 'Sedang';
  const topicName = topicMap[topicId].name;
  const prompt = [
    'Buat ' + count + ' soal pilihan ganda matematika SMP kelas 9 untuk persiapan ujian akhir berikut ini.',
    'Topik: ' + topicName + '.',
    'Tingkat kesulitan: ' + levelName + '.',
    'Wajib berbentuk soal cerita atau penalaran/logika (bukan hanya hitungan langsung), memakai konteks kehidupan sehari-hari.',
    'Setiap soal memiliki: pertanyaan, 4 pilihan jawaban (A sampai D, tidak boleh sama), indeks jawaban benar (0-3), dan pembahasan langkah demi langkah.',
    'Gunakan bahasa Indonesia yang jelas. Angka dan matematika harus benar dan konsisten.',
    'Keluarannya HARUS berupa JSON valid dengan struktur berikut, tanpa teks lain sebelum/sesudahnya:',
    '{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"solution":"..."}]}'
  ].join('\n');

  const generated = callGemini_(apiKey, prompt);
  let parsed;
  try {
    parsed = JSON.parse(generated);
  } catch (parseError) {
    const m = generated.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Respon Gemini tidak berupa JSON yang bisa dibaca.');
    try {
      parsed = JSON.parse(m[0]);
    } catch (parseError2) {
      throw new Error('Respone Gemini gagal diuraikan sebagai JSON.');
    }
  }

  const list = parsed.questions || parsed;
  if (!Array.isArray(list) || !list.length) throw new Error('Gemini tidak mengembalikan soal yang valid.');

  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMddHHmmss');
  const rows = [];
  const created = [];
  const existingIds = {};
  getQuestions_().forEach(function (q) { existingIds[q.id] = true; });
  let seq = 0;

  list.forEach(function (item) {
    seq += 1;
    const questionText = String(item.question || '').trim();
    const options = (Array.isArray(item.options) ? item.options : []).map(function (o) { return String(o || '').trim(); });
    const answer = Number(item.answer);
    const solution = String(item.solution || '').trim();
    if (questionText.length < 5) throw new Error('Soal hasil generate terlalu pendek.');
    if (options.length !== 4 || new Set(options).size !== 4) throw new Error('Soal hasil generate tidak punya tepat 4 pilihan yang berbeda.');
    if (!isFinite(answer) || answer < 0 || answer > 3) throw new Error('Indeks jawaban hasil generate tidak valid.');
    if (solution.length < 10) throw new Error('Pembahasan hasil generate terlalu pendek.');

    let id = 'G-' + stamp + '-' + seq;
    while (existingIds[id]) {
      seq += 1;
      id = 'G-' + stamp + '-' + seq;
    }
    existingIds[id] = true;
    const familyId = 'GEN-' + topicId.toUpperCase() + '-' + stamp + '-' + seq;
    const diff = level === 1 ? 'Mudah' : level === 3 ? 'Tantangan' : 'Sedang';
    rows.push([
      id, topicId, topicMap[topicId].name, diff, questionText,
      options[0], options[1], options[2], options[3], answer, solution, false,
      familyId, 1, level, 'logika'
    ]);
    created.push({
      id: id, topicId: topicId, topic: topicMap[topicId].name, difficulty: diff,
      question: questionText, options: options, answer: answer, solution: solution,
      active: false, familyId: familyId, variantId: 1, level: level, skill: 'logika'
    });
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEETS.questions);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, QUESTION_HEADERS.length).setValues(rows);
    invalidateQuestionsCache_();
    audit_(session, 'generate_questions', 'question_bank', '', rows.length + ' soal ' + topicName, { level: level });
    return { ok: true, generated: rows.length, questions: created };
  } finally {
    lock.releaseLock();
  }
}

function callGemini_(apiKey, prompt) {
  const models = ['gemini-3.8-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'];
  let lastMessage = '';
  for (let i = 0; i < models.length; i++) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent?key=' + encodeURIComponent(apiKey);
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    };
    let response;
    try {
      response = UrlFetchApp.fetch(url, options);
    } catch (fetchError) {
      lastMessage = 'Gagal memanggil Gemini: ' + fetchError.message;
      continue;
    }
    const code = response.getResponseCode();
    const text = response.getContentText();
    if (code !== 200) {
      let msg = 'Gemini mengembalikan kesalahan (kode ' + code + ').';
      try {
        const err = JSON.parse(text);
        if (err && err.error && err.error.message) msg = err.error.message;
      } catch (e) {}
      if (/high demand|overloaded|unavailable|no longer available/i.test(msg)) {
        lastMessage = msg;
        continue;
      }
      throw new Error(msg);
    }
    try {
      const parsed = JSON.parse(text);
      const cand = parsed && parsed.candidates && Array.isArray(parsed.candidates) && parsed.candidates[0];
      if (cand && cand.content && cand.content.parts && cand.content.parts.length) {
        return cand.content.parts.map(function (p) { return p.text || ''; }).join('');
      }
    } catch (e) {}
    lastMessage = 'Gemini tidak mengembalikan teks jawaban.';
  }
  throw new Error(lastMessage || 'Gemini tidak dapat memproses permintaan. Coba lagi.');
}

function ri_(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildOptions_(correct, distractors) {
  const opts = [correct].concat(distractors);
  const shuffled = shuffle_(opts);
  return { options: shuffled, answer: shuffled.indexOf(correct) };
}

function offlineTemplate_(topicId, level) {
  const L = level;
  switch (topicId) {
    case 'bilangan': {
      const a = [2, 3][ri_(0, 1)];
      const b = ri_(2, 4);
      const c = ri_(1, 3);
      const d = ri_(1, 3);
      const exp = b + c - d;
      const ans = Math.pow(a, exp);
      const opts = buildOptions_(String(ans), [String(Math.pow(a, exp + 1)), String(Math.pow(a, exp - 1)), String(ans + a)]);
      return {
        question: 'Hasil dari ' + a + '^' + b + ' \u00d7 ' + a + '^' + c + ' \u00f7 ' + a + '^' + d + ' adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: 'Gunakan sifat pangkat: a^m \u00d7 a^n = a^(m+n) dan a^m \u00f7 a^n = a^(m-n).\nEksponen = ' + b + ' + ' + c + ' \u2212 ' + d + ' = ' + exp + '.\nMaka hasilnya ' + a + '^' + exp + ' = ' + ans + '.'
      };
    }
    case 'aljabar': {
      const x = ri_(4, 15);
      const a = [2, 3, 4][ri_(0, 2)];
      const b = ri_(1, 10);
      const c = a * x + b;
      const opts = buildOptions_(String(x), [String(x + 1), String(x - 1), String(x + 2)]);
      return {
        question: 'Nilai x dari persamaan ' + a + 'x + ' + b + ' = ' + c + ' adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: a + 'x + ' + b + ' = ' + c + '\n' + a + 'x = ' + (c - b) + '\nx = ' + (c - b) + ' \u00f7 ' + a + ' = ' + x + '.'
      };
    }
    case 'geometri': {
      if (L >= 3) {
        const p = ri_(6, 15);
        const l = ri_(4, 10);
        const K = 2 * (p + l);
        const opts = buildOptions_(K + ' cm', [String(p * l) + ' cm', String(K - 2) + ' cm', String(K + 4) + ' cm']);
        return {
          question: 'Sebuah persegi panjang memiliki panjang ' + p + ' cm dan lebar ' + l + ' cm. Kelilingnya adalah ...',
          options: opts.options,
          answer: opts.answer,
          solution: 'Keliling = 2 \u00d7 (p + l) = 2 \u00d7 (' + p + ' + ' + l + ') = 2 \u00d7 ' + (p + l) + ' = ' + K + ' cm.'
        };
      }
      const a = ri_(6, 14) * 2;
      const t = ri_(4, 12);
      const Luas = a * t / 2;
      const opts = buildOptions_(Luas + ' cm\u00b2', [String(a * t) + ' cm\u00b2', String(Luas - 2) + ' cm\u00b2', String(Luas + 6) + ' cm\u00b2']);
      return {
        question: 'Sebuah segitiga memiliki alas ' + a + ' cm dan tinggi ' + t + ' cm. Luasnya adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: 'Luas = 1/2 \u00d7 alas \u00d7 tinggi = 1/2 \u00d7 ' + a + ' \u00d7 ' + t + ' = ' + Luas + ' cm\u00b2.'
      };
    }
    case 'statistika': {
      const base = ri_(6, 9);
      const data = [base - 2, base - 1, base, base + 1, base + 2];
      const mean = base;
      const opts = buildOptions_(String(mean), [String(mean + 1), String(mean - 1), String(mean + 2)]);
      return {
        question: 'Rata-rata dari data ' + data.join(', ') + ' adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: 'Jumlah data = ' + data.reduce(function (s, v) { return s + v; }, 0) + '.\nBanyak data = 5.\nRata-rata = jumlah \u00f7 5 = ' + mean + '.'
      };
    }
    case 'perbandingan': {
      const H = ri_(4, 20) * 10000;
      const d = [10, 15, 20, 25][ri_(0, 3)];
      const bayar = H * (100 - d) / 100;
      const opts = buildOptions_('Rp' + bayar.toLocaleString('id-ID'), ['Rp' + (bayar + 10000).toLocaleString('id-ID'), 'Rp' + (bayar - 5000).toLocaleString('id-ID'), 'Rp' + Math.round(H * d / 100).toLocaleString('id-ID')]);
      return {
        question: 'Sebuah barang seharga Rp' + H.toLocaleString('id-ID') + ' mendapat diskon ' + d + '%. Harga yang dibayar adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: 'Diskon = ' + d + '% \u00d7 ' + H.toLocaleString('id-ID') + ' = Rp' + Math.round(H * d / 100).toLocaleString('id-ID') + '.\nHarga bayar = Rp' + H.toLocaleString('id-ID') + ' \u2212 Rp' + Math.round(H * d / 100).toLocaleString('id-ID') + ' = Rp' + bayar.toLocaleString('id-ID') + '.'
      };
    }
    case 'fungsi': {
      const a = ri_(2, 5);
      const b = ri_(1, 10);
      const x = ri_(3, 10);
      const val = a * x + b;
      const opts = buildOptions_(String(val), [String(val + a), String(val - b), String(val + b)]);
      return {
        question: 'Diketahui f(x) = ' + a + 'x + ' + b + '. Nilai f(' + x + ') adalah ...',
        options: opts.options,
        answer: opts.answer,
        solution: 'f(' + x + ') = ' + a + ' \u00d7 ' + x + ' + ' + b + ' = ' + (a * x) + ' + ' + b + ' = ' + val + '.'
      };
    }
    default:
      return null;
  }
}

function generateOfflineQuestions(token, payload) {
  const session = requireRole_(token, ['teacher']);
  const data = payload || {};
  const topics = getTopics_();
  const topicMap = {};
  topics.forEach(function (t) { topicMap[t.id] = t; });
  const topicId = String(data.topicId || '').trim().toLowerCase();
  if (!topicMap[topicId]) throw new Error('Topik tidak dikenal.');
  const level = Number(data.level) || 2;
  if ([1, 2, 3].indexOf(level) === -1) throw new Error('Level tidak valid.');
  const count = Math.min(Math.max(Number(data.count) || 5, 1), 20);

  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMddHHmmss');
  const existingIds = {};
  getQuestions_().forEach(function (q) { existingIds[q.id] = true; });
  const rows = [];
  const created = [];
  let seq = 0;

  for (let i = 0; i < count; i++) {
    const tpl = offlineTemplate_(topicId, level);
    if (!tpl) throw new Error('Generator offline belum mendukung topik ini.');
    seq += 1;
    let id = 'OFF-' + stamp + '-' + seq;
    while (existingIds[id]) { seq += 1; id = 'OFF-' + stamp + '-' + seq; }
    existingIds[id] = true;
    const diff = level === 1 ? 'Mudah' : level === 3 ? 'Tantangan' : 'Sedang';
    const familyId = 'OFF-' + topicId.toUpperCase() + '-' + stamp + '-' + seq;
    rows.push([id, topicId, topicMap[topicId].name, diff, tpl.question, tpl.options[0], tpl.options[1], tpl.options[2], tpl.options[3], tpl.answer, tpl.solution, false, familyId, 1, level, 'logika']);
    created.push({ id: id, topicId: topicId, topic: topicMap[topicId].name, difficulty: diff, question: tpl.question, options: tpl.options, answer: tpl.answer, solution: tpl.solution, active: false, familyId: familyId, variantId: 1, level: level, skill: 'logika' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEETS.questions);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, QUESTION_HEADERS.length).setValues(rows);
    invalidateQuestionsCache_();
    audit_(session, 'generate_offline_questions', 'question_bank', '', rows.length + ' soal ' + topicMap[topicId].name, { level: level });
    return { ok: true, generated: rows.length, questions: created };
  } finally {
    lock.releaseLock();
  }
}


function setQuestionActive(token, id, active) {
  const session = requireRole_(token, ['teacher']);
  const sheet = getSheet_(SHEETS.questions);
  const values = sheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { row = i + 1; break; }
  }
  if (row < 0) throw new Error('Soal tidak ditemukan.');
  sheet.getRange(row, 12).setValue(active === true);
  invalidateQuestionsCache_();
  audit_(session, active ? 'activate_question' : 'deactivate_question', 'question', String(id), '');
  return { id: String(id), active: active === true };
}

function reportDate_(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!isFinite(date.getTime())) return '';
  return Utilities.formatDate(date, APP.TIMEZONE, 'dd/MM/yyyy HH:mm');
}

function paddingRows_(rows) {
  const width = rows.reduce(function (max, row) { return Math.max(max, row.length); }, 1);
  return { width: width, rows: rows.map(function (row) {
    const copy = row.slice();
    while (copy.length < width) copy.push('');
    return copy;
  })};
}

function reportRowsForStudent_(studentId) {
  const students = readStudents_();
  const student = students.filter(function (s) { return s.id === studentId; })[0];
  if (!student) throw new Error('Siswa tidak ditemukan.');
  const attempts = readAttempts_().filter(function (a) {
    return a.studentId === studentId && a.status === 'submitted';
  }).sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  const questionMap = getQuestionMap_();
  const topicStats = {};
  const flagged = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  attempts.forEach(function (attempt) {
    const answers = readAnswers_(attempt.id);
    const answerMap = {};
    answers.forEach(function (a) { answerMap[a.questionId] = a; });
    attempt.questionIds.forEach(function (qid) {
      const q = questionMap[qid];
      if (!q) return;
      if (!topicStats[q.topicId]) topicStats[q.topicId] = { name: q.topic, correct: 0, total: 0 };
      topicStats[q.topicId].total += 1;
      totalQuestions += 1;
      const ans = answerMap[qid];
      const order = optionOrderFor_(attempt, qid);
      const servedCorrect = order.indexOf(Number(q.answer));
      if (ans && Number(ans.selectedIndex) === servedCorrect) {
        topicStats[q.topicId].correct += 1;
        totalCorrect += 1;
      }
      if (ans && ans.needsReview) {
        flagged.push([q.question, q.topic, ans.flagNote || '', ans.flaggedBy || '']);
      }
    });
  });

  const avg = attempts.length ? Math.round(attempts.reduce(function (sum, a) { return sum + Number(a.score || 0); }, 0) / attempts.length) : 0;
  const rows = [];
  rows.push(['Ruang Hitung - Rapor Siswa']);
  rows.push(['Nama siswa', student.name]);
  rows.push(['Dibuat', reportDate_(new Date().toISOString())]);
  rows.push([]);
  rows.push(['Ringkasan']);
  rows.push(['Jumlah sesi', attempts.length]);
  rows.push(['Rata-rata skor', avg]);
  rows.push(['Total jawaban benar', totalCorrect]);
  rows.push(['Total soal dikerjakan', totalQuestions]);
  rows.push([]);
  rows.push(['Riwayat sesi']);
  rows.push(['Tanggal', 'Paket', 'Mode', 'Skor', 'Benar', 'Total', 'Durasi (detik)', 'Status pembahasan']);
  attempts.forEach(function (a) {
    rows.push([
      reportDate_(a.submittedAt), a.packageTitle, a.mode, a.score,
      a.correctCount, a.totalQuestions, a.durationSec,
      a.mode === 'practice' ? 'Terbuka otomatis' : a.reviewUnlocked ? 'Terbuka' : 'Terkunci'
    ]);
  });
  rows.push([]);
  rows.push(['Ketepatan per topik']);
  rows.push(['Topik', 'Benar', 'Total', 'Persen']);
  Object.keys(topicStats).forEach(function (id) {
    const t = topicStats[id];
    rows.push([t.name, t.correct, t.total, t.total ? Math.round(t.correct / t.total * 100) + '%' : '0%']);
  });
  rows.push([]);
  rows.push(['Soal yang ditandai perlu dibahas']);
  if (!flagged.length) {
    rows.push(['Belum ada soal yang ditandai.']);
  } else {
    rows.push(['Soal', 'Topik', 'Catatan', 'Ditandai oleh']);
    flagged.forEach(function (row) { rows.push(row); });
  }
  return paddingRows_(rows);
}

function reportRowsForClass_() {
  const students = readStudents_();
  const attempts = readAttempts_().filter(function (a) { return a.status === 'submitted'; });
  const rows = [];
  rows.push(['Ruang Hitung - Rekap Kelas']);
  rows.push(['Dibuat', reportDate_(new Date().toISOString())]);
  rows.push(['Jumlah siswa', students.length]);
  rows.push(['Jumlah sesi', attempts.length]);
  rows.push([]);
  rows.push(['Ringkasan per siswa']);
  rows.push(['Nama', 'Status', 'Jumlah sesi', 'Rata-rata', 'Terakhir', 'Terbaik']);
  students.forEach(function (student) {
    const own = attempts.filter(function (a) { return a.studentId === student.id; }).sort(function (a, b) {
      return String(b.submittedAt).localeCompare(String(a.submittedAt));
    });
    const scores = own.map(function (a) { return Number(a.score || 0); });
    rows.push([
      student.name,
      student.active ? 'Aktif' : 'Nonaktif',
      own.length,
      scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0,
      scores.length ? scores[0] : 0,
      scores.length ? Math.max.apply(null, scores) : 0
    ]);
  });
  rows.push([]);
  rows.push(['Sesi terbaru']);
  rows.push(['Tanggal', 'Siswa', 'Paket', 'Mode', 'Skor', 'Benar', 'Total']);
  attempts.slice().sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); }).slice(0, 40).forEach(function (a) {
    const student = students.filter(function (s) { return s.id === a.studentId; })[0];
    rows.push([reportDate_(a.submittedAt), student ? student.name : 'Siswa', a.packageTitle, a.mode, a.score, a.correctCount, a.totalQuestions]);
  });
  return paddingRows_(rows);
}

function writeReportSheet_(sheet, padded, title) {
  sheet.setName('Rapor');
  if (padded.rows.length) {
    sheet.getRange(1, 1, padded.rows.length, padded.width).setValues(padded.rows);
  }
  sheet.getRange(1, 1, 1, padded.width).setFontWeight('bold').setFontSize(14);
  for (let i = 0; i < padded.rows.length; i++) {
    const first = String(padded.rows[i][0] || '');
    if (['Ringkasan', 'Riwayat sesi', 'Ketepatan per topik', 'Soal yang ditandai perlu dibahas', 'Ringkasan per siswa', 'Sesi terbaru'].indexOf(first) !== -1) {
      sheet.getRange(i + 1, 1, 1, padded.width).setFontWeight('bold').setBackground('#F1E7D6');
    }
  }
  sheet.setColumnWidth(1, 240);
  for (let c = 2; c <= Math.min(padded.width, 8); c++) sheet.setColumnWidth(c, 145);
  sheet.setFrozenRows(1);
}

function generateReport(token, type, studentId) {
  const session = requireRole_(token, ['teacher']);
  const reportType = type === 'class' ? 'class' : 'student';
  if (reportType === 'class' && session.role !== 'teacher') throw new Error('Rekap kelas hanya untuk guru.');
  const targetId = String(studentId || '');
  if (reportType === 'student' && !targetId) throw new Error('Pilih siswa terlebih dahulu.');

  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMdd-HHmmss');
  const title = (reportType === 'student' ? 'Rapor Siswa' : 'Rekap Kelas') + ' - ' + stamp;
  const ss = SpreadsheetApp.create(title);
  const sheet = ss.getSheets()[0];
  const padded = reportType === 'student' ? reportRowsForStudent_(targetId) : reportRowsForClass_();
  writeReportSheet_(sheet, padded, reportType);
  SpreadsheetApp.flush();

  const id = ss.getId();
  const exportBase = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=';
  audit_(session, 'generate_report', reportType, targetId || 'class', title);
  return {
    sheetUrl: ss.getUrl(),
    pdfUrl: exportBase + 'pdf',
    xlsxUrl: exportBase + 'xlsx',
    type: reportType
  };
}

function makeLiveCode_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function readLiveSessions_() {
  const sheet = getSheet_(SHEETS.liveSessions);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, LIVE_SESSION_HEADERS.length).getValues();
  return values.filter(function (row) { return row[0]; }).map(function (row, index) {
    let questionIds = [];
    let optionOrder = {};
    try { questionIds = JSON.parse(String(row[7] || '[]')); } catch (error) { questionIds = []; }
    try { optionOrder = JSON.parse(String(row[8] || '{}')); } catch (error) { optionOrder = {}; }
    return {
      _row: index + 2,
      id: String(row[0]),
      code: String(row[1]),
      packageId: String(row[2]),
      title: String(row[3]),
      hostName: String(row[4]),
      status: String(row[5]),
      currentIndex: Number(row[6]) || 0,
      questionIds: questionIds,
      optionOrder: optionOrder,
      secondsPerQuestion: Number(row[9]) || 20,
      startedAt: row[10] ? toIso_(row[10]) : '',
      questionStartedAt: row[11] ? toIso_(row[11]) : '',
      endedAt: row[12] ? toIso_(row[12]) : '',
      createdAt: row[13] ? toIso_(row[13]) : ''
    };
  });
}

function getLiveSessionById_(id) {
  return readLiveSessions_().filter(function (s) { return s.id === String(id); })[0] || null;
}

function getLiveSessionByCode_(code) {
  const clean = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  return readLiveSessions_().filter(function (s) { return s.code === clean; })[0] || null;
}

function readLiveParticipants_(sessionId) {
  const sheet = getSheet_(SHEETS.liveParticipants);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, LIVE_PARTICIPANT_HEADERS.length).getValues();
  return values.filter(function (row) { return String(row[0]) === String(sessionId); }).map(function (row) {
    return {
      sessionId: String(row[0]),
      studentId: String(row[1]),
      studentName: String(row[2]),
      joinedAt: row[3] ? toIso_(row[3]) : '',
      score: Number(row[4]) || 0,
      correctCount: Number(row[5]) || 0,
      lastSeenAt: row[6] ? toIso_(row[6]) : ''
    };
  });
}

function readLiveAnswers_(sessionId) {
  const sheet = getSheet_(SHEETS.liveAnswers);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, LIVE_ANSWER_HEADERS.length).getValues();
  return values.filter(function (row) { return String(row[0]) === String(sessionId); }).map(function (row) {
    return {
      sessionId: String(row[0]),
      questionId: String(row[1]),
      studentId: String(row[2]),
      selectedIndex: Number(row[3]),
      isCorrect: toBool_(row[4]),
      answeredAt: row[5] ? toIso_(row[5]) : '',
      responseMs: Number(row[6]) || 0
    };
  });
}

function updateLiveScores_(session) {
  const participants = readLiveParticipants_(session.id);
  const answers = readLiveAnswers_(session.id);
  const questionMap = getQuestionMap_();
  const sheet = getSheet_(SHEETS.liveParticipants);
  const rows = sheet.getDataRange().getValues();
  participants.forEach(function (participant) {
    let correct = 0;
    session.questionIds.forEach(function (qid) {
      const q = questionMap[qid];
      if (!q) return;
      const ans = answers.filter(function (a) { return a.studentId === participant.studentId && a.questionId === qid; })[0];
      if (!ans) return;
      const order = session.optionOrder[qid] || [0, 1, 2, 3];
      if (Number(ans.selectedIndex) === order.indexOf(Number(q.answer))) correct += 1;
    });
    const score = session.questionIds.length ? Math.round(correct / session.questionIds.length * 100) : 0;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === session.id && String(rows[i][1]) === participant.studentId) {
        sheet.getRange(i + 1, 5, 1, 2).setValues([[score, correct]]);
        break;
      }
    }
  });
}

function liveState_(session, role, studentId) {
  const participants = readLiveParticipants_(session.id);
  const answers = readLiveAnswers_(session.id);
  const questionMap = getQuestionMap_();
  const currentQid = session.questionIds[session.currentIndex] || '';
  const currentQuestion = questionMap[currentQid] || null;
  const order = currentQuestion ? (session.optionOrder[currentQid] || [0, 1, 2, 3]) : [0, 1, 2, 3];
  const showAnswer = session.status === 'reveal' || session.status === 'ended';
  const currentAnswers = answers.filter(function (a) { return a.questionId === currentQid; });
  const counts = [0, 0, 0, 0];
  currentAnswers.forEach(function (a) { if (a.selectedIndex >= 0 && a.selectedIndex < 4) counts[a.selectedIndex] += 1; });
  const own = role === 'student' ? currentAnswers.filter(function (a) { return a.studentId === studentId; })[0] || null : null;
  const elapsed = session.questionStartedAt ? Math.floor((Date.now() - new Date(session.questionStartedAt).getTime()) / 1000) : 0;
  const timeLeft = session.status === 'question' ? Math.max(0, session.secondsPerQuestion - elapsed) : 0;
  const leaderboard = participants.slice().sort(function (a, b) { return (b.score - a.score) || (b.correctCount - a.correctCount); }).map(function (p, index) {
    return { rank: index + 1, studentId: p.studentId, name: p.studentName, score: p.score, correctCount: p.correctCount };
  });

  return {
    id: session.id,
    code: session.code,
    title: session.title,
    status: session.status,
    currentIndex: session.currentIndex,
    totalQuestions: session.questionIds.length,
    secondsPerQuestion: session.secondsPerQuestion,
    questionStartedAt: session.questionStartedAt,
    timeLeft: timeLeft,
    participantCount: participants.length,
    participants: participants.map(function (p) { return { name: p.studentName, score: p.score, correctCount: p.correctCount }; }),
    leaderboard: leaderboard,
    answeredCount: currentAnswers.length,
    answerCounts: counts,
    question: currentQuestion ? {
      id: currentQuestion.id,
      question: currentQuestion.question,
      topicName: currentQuestion.topic,
      difficulty: currentQuestion.difficulty,
      options: order.map(function (i) { return currentQuestion.options[i]; }),
      correctIndex: showAnswer ? order.indexOf(Number(currentQuestion.answer)) : null,
      solution: showAnswer ? currentQuestion.solution : ''
    } : null,
    ownAnswer: own ? { selectedIndex: Number(own.selectedIndex), isCorrect: showAnswer ? own.isCorrect : null } : null
  };
}

function createLiveSession(token, packageId) {
  const session = requireRole_(token, ['teacher']);
  const pkg = getPackageById_(packageId) || getPackageById_('quiz:live');
  if (!pkg || pkg.mode !== 'quiz') throw new Error('Paket kuis tidak ditemukan.');
  if (!isPackageAvailable_(pkg, new Date())) throw new Error('Paket kuis belum masuk jadwal atau sudah berakhir.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const all = getQuestions_();
    const topicIds = pkg.topicIds === 'all' ? null : pkg.topicIds.split(',').filter(Boolean);
    const pool = topicIds ? all.filter(function (q) { return topicIds.indexOf(q.topicId) !== -1; }) : all;
    const questions = pickExam_(pool, Math.min(pkg.questionCount || 10, pool.length), topicIds, pkg.levelStrategy);
    if (!questions.length) throw new Error('Tidak ada soal untuk kuis.');
    const optionOrder = {};
    questions.forEach(function (q) { optionOrder[q.id] = shuffle_([0, 1, 2, 3]); });
    let code = makeLiveCode_();
    while (getLiveSessionByCode_(code)) code = makeLiveCode_();
    const id = 'L-' + Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    const now = new Date().toISOString();
    const sheet = getSheet_(SHEETS.liveSessions);
    sheet.appendRow([
      id, code, pkg.id, pkg.name, 'Guru', 'lobby', 0,
      JSON.stringify(questions.map(function (q) { return q.id; })),
      JSON.stringify(optionOrder), pkg.liveSecondsPerQuestion || 20,
      '', '', '', now
    ]);
    const live = getLiveSessionById_(id);
    audit_(session, 'create_live_session', 'live_session', id, pkg.name, { code: code });
    return liveState_(live, 'teacher', '');
  } finally {
    lock.releaseLock();
  }
}

function joinLiveSession(token, code) {
  const session = requireRole_(token, ['student']);
  const live = getLiveSessionByCode_(code);
  if (!live) throw new Error('Kode kuis tidak ditemukan.');
  if (live.status === 'ended') throw new Error('Kuis ini sudah berakhir.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(SHEETS.liveParticipants);
    const rows = sheet.getDataRange().getValues();
    let exists = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === live.id && String(rows[i][1]) === session.studentId) { exists = true; break; }
    }
    if (!exists) {
      sheet.appendRow([live.id, session.studentId, session.studentName, new Date().toISOString(), 0, 0, new Date().toISOString()]);
      audit_(session, 'join_live_session', 'live_session', live.id, live.title);
    }
    return liveState_(live, 'student', session.studentId);
  } finally {
    lock.releaseLock();
  }
}

function getLiveState(token, sessionId) {
  const session = getSession_(token);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  if (session.role === 'teacher') return liveState_(live, 'teacher', '');
  if (session.role !== 'student') throw new Error('Akun ini tidak memiliki akses ke kuis tersebut.');
  const participant = readLiveParticipants_(live.id).filter(function (p) { return p.studentId === session.studentId; })[0];
  if (!participant) throw new Error('Kamu belum bergabung ke kuis ini.');
  return liveState_(live, 'student', session.studentId);
}

function startLiveSession(token, sessionId) {
  const session = requireRole_(token, ['teacher']);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  if (live.status !== 'lobby') throw new Error('Kuis sudah dimulai.');
  const sheet = getSheet_(SHEETS.liveSessions);
  const now = new Date().toISOString();
  sheet.getRange(live._row, 6).setValue('question');
  sheet.getRange(live._row, 7).setValue(0);
  sheet.getRange(live._row, 11).setValue(now);
  sheet.getRange(live._row, 12).setValue(now);
  audit_(session, 'start_live_session', 'live_session', live.id, live.title);
  return liveState_(getLiveSessionById_(live.id), 'teacher', '');
}

function submitLiveAnswer(token, sessionId, questionId, selectedIndex) {
  const session = requireRole_(token, ['student']);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  if (live.status !== 'question') throw new Error('Soal ini tidak sedang aktif.');
  const currentQid = live.questionIds[live.currentIndex];
  if (currentQid !== questionId) throw new Error('Soal tidak sesuai dengan soal aktif.');
  const question = getQuestionMap_()[questionId];
  if (!question) throw new Error('Soal tidak ditemukan.');
  const elapsed = (Date.now() - new Date(live.questionStartedAt).getTime()) / 1000;
  if (elapsed > live.secondsPerQuestion + 2) throw new Error('Waktu menjawab sudah habis.');
  const answer = Number(selectedIndex);
  if (!isFinite(answer) || answer < 0 || answer > 3) throw new Error('Pilihan jawaban tidak valid.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(SHEETS.liveAnswers);
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === live.id && String(values[i][1]) === questionId && String(values[i][2]) === session.studentId) {
        row = i + 1; break;
      }
    }
    const order = live.optionOrder[questionId] || [0, 1, 2, 3];
    const isCorrect = order[answer] === Number(question.answer);
    const now = new Date().toISOString();
    const responseMs = Math.round(elapsed * 1000);
    if (row > 0) {
      sheet.getRange(row, 4, 1, 4).setValues([[answer, isCorrect, now, responseMs]]);
    } else {
      sheet.appendRow([live.id, questionId, session.studentId, answer, isCorrect, now, responseMs]);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function revealLiveAnswer(token, sessionId) {
  const session = requireRole_(token, ['teacher']);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  if (live.status !== 'question') throw new Error('Belum ada soal aktif.');
  const sheet = getSheet_(SHEETS.liveSessions);
  sheet.getRange(live._row, 6).setValue('reveal');
  updateLiveScores_(live);
  audit_(session, 'reveal_live_answer', 'live_session', live.id, live.title);
  return liveState_(getLiveSessionById_(live.id), 'teacher', '');
}

function nextLiveQuestion(token, sessionId) {
  const session = requireRole_(token, ['teacher']);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  if (live.status === 'ended') throw new Error('Kuis sudah berakhir.');
  if (live.currentIndex + 1 >= live.questionIds.length) {
    return endLiveSession(token, sessionId);
  }
  const now = new Date().toISOString();
  const sheet = getSheet_(SHEETS.liveSessions);
  sheet.getRange(live._row, 6).setValue('question');
  sheet.getRange(live._row, 7).setValue(live.currentIndex + 1);
  sheet.getRange(live._row, 12).setValue(now);
  return liveState_(getLiveSessionById_(live.id), 'teacher', '');
}

function endLiveSession(token, sessionId) {
  const session = requireRole_(token, ['teacher']);
  const live = getLiveSessionById_(sessionId);
  if (!live) throw new Error('Sesi kuis tidak ditemukan.');
  const sheet = getSheet_(SHEETS.liveSessions);
  sheet.getRange(live._row, 6).setValue('ended');
  sheet.getRange(live._row, 13).setValue(new Date().toISOString());
  updateLiveScores_(live);
  audit_(session, 'end_live_session', 'live_session', live.id, live.title);
  return liveState_(getLiveSessionById_(live.id), 'teacher', '');
}

function getDashboard(token) {
  const session = getSession_(token);
  expireStaleAttempts_();
  return session.role === 'teacher' ? teacherDashboard_(session) : studentDashboard_(session);
}

function teacherDashboard_(session) {
  const students = readStudents_();
  const attempts = readAttempts_();
  const questions = getQuestions_();
  const topics = topicSummaries_(questions);
  const submitted = attempts.filter(function (a) { return a.status === 'submitted'; });

  const studentRows = students.map(function (student) {
    const own = attempts.filter(function (a) { return a.studentId === student.id; });
    const ownSubmitted = own.filter(function (a) { return a.status === 'submitted'; })
      .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
    const active = own.filter(function (a) { return a.status === 'in_progress'; })[0] || null;
    const pending = ownSubmitted.filter(function (a) {
      return a.mode === 'exam' && a.reviewRequested && !a.reviewUnlocked;
    }).length;
    return {
      id: student.id,
      name: student.name,
      active: student.active === true,
      attemptCount: ownSubmitted.length,
      lastScore: ownSubmitted.length ? ownSubmitted[0].score : null,
      lastSubmittedAt: ownSubmitted.length ? ownSubmitted[0].submittedAt : '',
      pendingReviews: pending,
      activeAttempt: active ? attemptSummary_(active) : null
    };
  });

  const recent = submitted.slice()
    .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); })
    .slice(0, 8)
    .map(function (a) {
      const summary = attemptSummary_(a);
      const student = students.filter(function (s) { return s.id === a.studentId; })[0];
      summary.studentName = student ? student.name : 'Siswa';
      return summary;
    });

  return {
    role: 'teacher',
    roleLabel: 'Guru',
    name: 'Guru',
    teacherCode: getTeacherCode_(),
    students: studentRows,
    summary: {
      totalStudents: students.length,
      activeStudents: students.filter(function (s) { return s.active; }).length,
      totalAttempts: submitted.length,
      pendingReviews: studentRows.reduce(function (sum, s) { return sum + s.pendingReviews; }, 0),
      totalQuestions: questions.length,
      totalTopics: topics.length
    },
    recentAttempts: recent,
    topics: topics,
    questionSummary: topics,
    sheetUrl: getSpreadsheet_().getUrl(),
    hasGeminiKey: !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
    dateISO: new Date().toISOString()
  };
}

function studentDashboard_(session) {
  const student = findStudentById_(session.studentId);
  if (!student) throw new Error('Data siswa tidak ditemukan.');
  const attempts = readAttempts_().filter(function (a) { return a.studentId === student.id; });
  const submitted = attempts.filter(function (a) { return a.status === 'submitted'; })
    .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  const active = attempts.filter(function (a) { return a.status === 'in_progress'; })[0] || null;
  const questions = getQuestions_();
  const topics = topicSummaries_(questions);
  const packages = packagesForRole_(session.role);

  let summary = null;
  if (submitted.length) {
    const total = submitted.reduce(function (sum, a) { return sum + Number(a.score || 0); }, 0);
    summary = {
      completedCount: submitted.length,
      averageScore: Math.round(total / submitted.length),
      bestScore: Math.max.apply(null, submitted.map(function (a) { return Number(a.score || 0); })),
      lastScore: submitted[0].score,
      lastSubmittedAt: submitted[0].submittedAt
    };
  }

  return {
    role: session.role,
    roleLabel: roleLabel_(session.role),
    name: session.name,
    studentId: student.id,
    studentName: student.name,
    activeAttempt: active ? attemptSummary_(active) : null,
    attempts: submitted.map(attemptSummary_),
    summary: summary,
    packages: packages,
    topics: topics,
    dateISO: new Date().toISOString()
  };
}

function topicSummaries_(questions) {
  return getTopics_().map(function (topic) {
    return {
      id: topic.id,
      name: topic.name,
      short: topic.short,
      count: questions.filter(function (q) { return q.topicId === topic.id; }).length
    };
  }).filter(function (topic) { return topic.count > 0; });
}

function buildPackages_(questions, topics) {
  const practiceTopics = topics.map(function (topic) {
    return {
      id: 'practice:topic:' + topic.id,
      mode: 'practice',
      kind: 'topik',
      title: topic.name,
      subtitle: 'Latihan pemahaman untuk topik ini',
      questionCount: topic.count,
      durationMin: null,
      topicId: topic.id
    };
  });
  return [{
    id: 'practice:mixed',
    mode: 'practice',
    kind: 'campuran',
    title: 'Latihan Campuran',
    subtitle: 'Latihan pemahaman dari semua topik',
    questionCount: Math.min(20, questions.length),
    durationMin: null,
    topicCount: topics.length
  }].concat(practiceTopics).concat([{
    id: 'exam:full',
    mode: 'exam',
    kind: 'ujian',
    title: 'Simulasi Ujian Akhir',
    subtitle: 'Seluruh topik, waktu ketat seperti ujian',
    questionCount: questions.length,
    durationMin: 90,
    topicCount: topics.length
  }, {
    id: 'exam:quick',
    mode: 'exam',
    kind: 'ujian-kilat',
    title: 'Ujian Kilat',
    subtitle: 'Latihan kecepatan dalam waktu singkat',
    questionCount: Math.min(20, questions.length),
    durationMin: 30,
    topicCount: topics.length
  }]);
}

function getStudentDetail(token, studentId) {
  const session = getSession_(token);
  let targetId = String(studentId || '');
  if (session.role !== 'teacher') targetId = session.studentId;
  if (!targetId) throw new Error('Siswa tidak ditemukan.');

  const student = findStudentById_(targetId);
  if (!student) throw new Error('Siswa tidak ditemukan.');
  if (session.role === 'parent' && student.id !== session.studentId) {
    throw new Error('Akun ini tidak memiliki akses ke siswa tersebut.');
  }
  if (session.role === 'student' && student.id !== session.studentId) {
    throw new Error('Akun ini tidak memiliki akses ke siswa tersebut.');
  }

  const attempts = readAttempts_().filter(function (a) { return a.studentId === student.id; });
  const submitted = attempts.filter(function (a) { return a.status === 'submitted'; })
    .sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  const active = attempts.filter(function (a) { return a.status === 'in_progress'; })[0] || null;

  let summary = null;
  if (submitted.length) {
    const total = submitted.reduce(function (sum, a) { return sum + Number(a.score || 0); }, 0);
    summary = {
      completedCount: submitted.length,
      averageScore: Math.round(total / submitted.length),
      bestScore: Math.max.apply(null, submitted.map(function (a) { return Number(a.score || 0); })),
      lastScore: submitted[0].score
    };
  }

  return {
    role: session.role,
    student: studentPublic_(student),
    attempts: submitted.map(attemptSummary_),
    activeAttempt: active ? attemptSummary_(active) : null,
    summary: summary
  };
}

function startAttempt(token, packageId) {
  const session = requireRole_(token, ['student']);
  ensureSetup_();
  expireStaleAttempts_();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const existing = readAttempts_().filter(function (a) {
      return a.studentId === session.studentId && a.status === 'in_progress';
    })[0];
    if (existing) {
      throw new Error('Masih ada latihan atau ujian yang sedang berjalan. Lanjutkan atau kumpulkan dulu.');
    }

    const selection = selectQuestionsForPackage_(String(packageId || ''), session.studentId);
    const selected = selection.questions;
    if (!selected.length) throw new Error('Soal untuk paket ini belum tersedia.');

    const optionOrder = {};
    selected.forEach(function (q) {
      optionOrder[q.id] = shuffle_([0, 1, 2, 3]);
    });

    const now = new Date();
    const attempt = {
      id: makeAttemptId_(),
      studentId: session.studentId,
      mode: selection.mode,
      packageId: selection.packageId,
      packageTitle: selection.title,
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
      requestAt: '',
      optionOrder: optionOrder,
      adaptiveLevel: selection.adaptiveLevel || 0
    };

    const sheet = getSheet_(SHEETS.attempts);
    sheet.appendRow(attemptToRow_(attempt));
    attempt._row = sheet.getLastRow();
    logActivity_(session.role, 'start', selection.title + ' (' + selected.length + ' soal, ' + selection.mode + ')');
    audit_(session, 'start_attempt', 'attempt', attempt.id, selection.title, { mode: selection.mode, count: selected.length });
    return buildAttemptPayload_(attempt, selected, {});
  } finally {
    lock.releaseLock();
  }
}

function selectQuestionsForPackage_(packageId, studentId) {
  const pkg = getPackageById_(packageId);
  if (!pkg || !pkg.active) throw new Error('Paket tidak aktif atau tidak ditemukan.');
  if (!isPackageAvailable_(pkg, new Date())) throw new Error('Paket ini belum masuk jadwal atau sudah berakhir.');
  if (pkg.mode === 'quiz') throw new Error('Kuis langsung dimulai dari menu Kuis Langsung.');

  const all = getQuestions_();
  if (!all.length) throw new Error('Bank soal belum tersedia.');
  const topicIds = pkg.topicIds === 'all' ? null : pkg.topicIds.split(',').filter(Boolean);
  const pool = topicIds ? all.filter(function (q) { return topicIds.indexOf(q.topicId) !== -1; }) : all;
  if (!pool.length) throw new Error('Tidak ada soal untuk topik paket ini.');
  const count = Math.min(pkg.questionCount, pool.length);

  if (pkg.mode === 'practice') {
    const adaptive = pickAdaptive_(pool, count, studentId, topicIds && topicIds.length === 1 ? topicIds[0] : null, pkg.levelStrategy);
    return {
      mode: 'practice',
      packageId: pkg.id,
      title: pkg.name,
      questions: adaptive.questions,
      adaptiveLevel: adaptive.level
    };
  }

  return {
    mode: 'exam',
    packageId: pkg.id,
    title: pkg.name,
    questions: pickExam_(pool, count, topicIds, pkg.levelStrategy),
    adaptiveLevel: 0
  };
}

function getStudentMastery_(studentId) {
  const attempts = readAttempts_().filter(function (a) {
    return a.studentId === studentId && a.status === 'submitted';
  }).sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); }).slice(0, 10);
  const questions = getQuestionMap_();
  const byTopic = {};
  let correct = 0;
  let total = 0;

  attempts.forEach(function (attempt) {
    const answers = readAnswers_(attempt.id);
    answers.forEach(function (answer) {
      const question = questions[answer.questionId];
      if (!question) return;
      const originalIndex = originalAnswerIndex_(attempt, answer.questionId, Number(answer.selectedIndex));
      if (!byTopic[question.topicId]) byTopic[question.topicId] = { correct: 0, total: 0 };
      byTopic[question.topicId].total += 1;
      total += 1;
      if (originalIndex === Number(question.answer)) {
        byTopic[question.topicId].correct += 1;
        correct += 1;
      }
    });
  });

  return {
    total: total,
    overall: total ? correct / total : 0,
    byTopic: byTopic
  };
}

function pickAdaptive_(pool, count, studentId, topicId, strategy) {
  const mastery = getStudentMastery_(studentId);
  const topicMastery = topicId && mastery.byTopic[topicId] ? mastery.byTopic[topicId] : null;
  const accuracy = topicMastery ? topicMastery.correct / topicMastery.total : mastery.overall;
  const hasData = topicMastery ? topicMastery.total >= 3 : mastery.total >= 5;
  let target = hasData ? (accuracy >= 0.75 ? 3 : accuracy >= 0.5 ? 2 : 1) : 2;
  if (strategy === 'easy') target = 1;
  else if (strategy === 'medium') target = 2;
  else if (strategy === 'hard') target = 3;

  const filtered = topicId ? pool.filter(function (q) { return q.topicId === topicId; }) : pool.slice();
  const usedFamilies = {};
  const picked = [];

  const quotas = [];
  quotas.push({ level: target, n: Math.ceil(count * 0.6) });
  if (target > 1) quotas.push({ level: target - 1, n: Math.floor(count * 0.25) });
  if (target < 3) quotas.push({ level: target + 1, n: Math.floor(count * 0.15) });

  quotas.forEach(function (quota) {
    const levelPool = filtered.filter(function (q) { return Number(q.level) === quota.level; });
    pickUniqueFamilies_(levelPool, quota.n, usedFamilies).forEach(function (q) {
      picked.push(q);
      usedFamilies[q.familyId] = true;
    });
  });

  pickUniqueFamilies_(filtered, count - picked.length, usedFamilies).forEach(function (q) {
    picked.push(q);
    usedFamilies[q.familyId] = true;
  });

  if (picked.length < count) {
    shuffle_(filtered.slice()).forEach(function (q) {
      if (picked.length >= count) return;
      if (picked.some(function (x) { return x.id === q.id; })) return;
      picked.push(q);
    });
  }

  return { questions: shuffle_(picked.slice(0, count)), level: target };
}

function pickExam_(pool, count, allowedTopics, strategy) {
  const topicIds = allowedTopics && allowedTopics.length ? allowedTopics : getTopics_().map(function (t) { return t.id; });
  const perTopic = Math.max(1, Math.floor(count / topicIds.length));
  const usedFamilies = {};
  const picked = [];

  topicIds.forEach(function (topicId) {
    const topicPool = pool.filter(function (q) { return q.topicId === topicId; });
    const target = Math.min(perTopic, topicPool.length);
    pickByLevelQuota_(topicPool, target, usedFamilies, strategy).forEach(function (q) {
      picked.push(q);
      usedFamilies[q.familyId] = true;
    });
  });

  pickByLevelQuota_(pool, count - picked.length, usedFamilies, strategy).forEach(function (q) {
    picked.push(q);
    usedFamilies[q.familyId] = true;
  });

  if (picked.length < count) {
    shuffle_(pool.slice()).forEach(function (q) {
      if (picked.length >= count) return;
      if (picked.some(function (x) { return x.id === q.id; })) return;
      picked.push(q);
    });
  }
  return shuffle_(picked.slice(0, count));
}

function pickByLevelQuota_(pool, count, usedFamilies, strategy) {
  if (count <= 0) return [];
  let easyRatio = 0.3;
  let hardRatio = 0.2;
  if (strategy === 'easy') { easyRatio = 0.7; hardRatio = 0; }
  else if (strategy === 'medium') { easyRatio = 0.2; hardRatio = 0.1; }
  else if (strategy === 'hard') { easyRatio = 0.1; hardRatio = 0.6; }
  const easy = Math.ceil(count * easyRatio);
  const hard = Math.floor(count * hardRatio);
  const medium = Math.max(0, count - easy - hard);
  const picked = [];
  [
    { level: 1, n: easy },
    { level: 2, n: medium },
    { level: 3, n: hard }
  ].forEach(function (quota) {
    const levelPool = pool.filter(function (q) { return Number(q.level) === quota.level; });
    pickUniqueFamilies_(levelPool, quota.n, usedFamilies).forEach(function (q) {
      picked.push(q);
      usedFamilies[q.familyId] = true;
    });
  });
  if (picked.length < count) {
    pickUniqueFamilies_(pool, count - picked.length, usedFamilies).forEach(function (q) {
      picked.push(q);
      usedFamilies[q.familyId] = true;
    });
  }
  return picked;
}

function pickUniqueFamilies_(pool, count, usedFamilies) {
  if (count <= 0) return [];
  const shuffled = shuffle_(pool.slice());
  const picked = [];
  const localUsed = {};
  for (let i = 0; i < shuffled.length && picked.length < count; i++) {
    const q = shuffled[i];
    const family = q.familyId || q.id;
    if (usedFamilies[family] || localUsed[family]) continue;
    localUsed[family] = true;
    picked.push(q);
  }
  return picked;
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
        options: orderedOptions_(q, optionOrderFor_(attempt, q.id))
      };
    }),
    answers: savedAnswers,
    mode: attempt.mode,
    remainingSec: remainingSeconds_(attempt),
    serverNow: new Date().toISOString()
  };
}

function optionOrderFor_(attempt, questionId) {
  if (attempt && attempt.optionOrder && Array.isArray(attempt.optionOrder[questionId]) && attempt.optionOrder[questionId].length === 4) {
    return attempt.optionOrder[questionId].map(Number);
  }
  return [0, 1, 2, 3];
}

function orderedOptions_(question, order) {
  return order.map(function (index) { return question.options[index]; });
}

function originalAnswerIndex_(attempt, questionId, servedIndex) {
  const order = optionOrderFor_(attempt, questionId);
  return order[Number(servedIndex)];
}

function resumeAttempt(token, attemptId) {
  const session = requireRole_(token, ['student']);
  const attempts = readAttempts_();
  const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
  if (!attempt) throw new Error('Latihan tidak ditemukan.');
  if (attempt.studentId !== session.studentId) throw new Error('Latihan ini bukan milik siswa tersebut.');

  if (attempt.status !== 'in_progress') {
    return { finished: true, result: getResultData_(session, attemptId) };
  }
  if (attempt.mode === 'exam' && new Date().getTime() > attemptEndMs_(attempt)) {
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
        options: orderedOptions_(q, optionOrderFor_(attempt, q.id))
      };
    }),
    answers: answers,
    mode: attempt.mode,
    remainingSec: remainingSeconds_(attempt),
    serverNow: new Date().toISOString()
  };
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
    if (!attempt) throw new Error('Latihan tidak ditemukan.');
    if (attempt.studentId !== session.studentId) throw new Error('Latihan ini bukan milik siswa tersebut.');
    if (attempt.status !== 'in_progress') throw new Error('Latihan ini sudah dikumpulkan.');

    if (attempt.mode === 'exam' && new Date().getTime() > attemptEndMs_(attempt)) {
      finalizeAttempt_(attempt, 'timeout');
      return { expired: true, attemptId: attempt.id };
    }
    if (attempt.questionIds.indexOf(questionId) === -1) {
      throw new Error('Soal tidak termasuk dalam latihan ini.');
    }

    const question = getQuestionMap_()[questionId];
    if (!question) throw new Error('Soal tidak ditemukan.');

    const sheet = getSheet_(SHEETS.answers);
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(attemptId) && String(values[i][1]) === String(questionId)) {
        row = i + 1;
        break;
      }
    }

    const isCorrect = originalAnswerIndex_(attempt, questionId, answer) === Number(question.answer);
    const answeredAt = new Date().toISOString();
    if (row > 0) {
      sheet.getRange(row, 3, 1, 3).setValues([[answer, isCorrect, answeredAt]]);
    } else {
      sheet.appendRow([attemptId, questionId, answer, isCorrect, answeredAt, false, '', '', '']);
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
    if (!attempt) throw new Error('Latihan tidak ditemukan.');
    if (attempt.studentId !== session.studentId) throw new Error('Latihan ini bukan milik siswa tersebut.');
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
  if (!attempt) throw new Error('Latihan tidak ditemukan.');

  if (session.role !== 'teacher' && attempt.studentId !== session.studentId) {
    throw new Error('Akun ini tidak memiliki akses ke latihan tersebut.');
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
    const order = optionOrderFor_(attempt, qid);
    const servedCorrect = order.indexOf(Number(question.answer));
    if (ans && Number(ans.selectedIndex) === servedCorrect) {
      topicStats[question.topicId].correct += 1;
      correct += 1;
    }
  });

  const stats = Object.keys(topicStats).map(function (key) {
    const item = topicStats[key];
    item.percent = item.total ? Math.round((item.correct / item.total) * 100) : 0;
    return item;
  });

  const canReview = session.role !== 'student' || attempt.reviewUnlocked === true || attempt.mode === 'practice';
  const review = canReview ? attempt.questionIds.map(function (qid, index) {
    const question = questions[qid];
    if (!question) return null;
    const ans = answerMap[qid];
    const order = optionOrderFor_(attempt, qid);
    const correctIndex = order.indexOf(Number(question.answer));
    return {
      number: index + 1,
      id: question.id,
      topicId: question.topicId,
      topicName: question.topic,
      difficulty: question.difficulty,
      level: question.level,
      familyId: question.familyId,
      question: question.question,
      options: orderedOptions_(question, order),
      selectedIndex: ans ? Number(ans.selectedIndex) : null,
      correctIndex: correctIndex,
      isCorrect: ans ? Number(ans.selectedIndex) === correctIndex : false,
      needsReview: ans ? ans.needsReview === true : false,
      flagNote: ans ? ans.flagNote : '',
      flaggedBy: ans ? ans.flaggedBy : '',
      flaggedAt: ans ? ans.flaggedAt : '',
      solution: question.solution
    };
  }).filter(Boolean) : null;

  return {
    attempt: attemptSummary_(attempt),
    mode: attempt.mode,
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
    if (!attempt) throw new Error('Latihan tidak ditemukan.');
    if (attempt.studentId !== session.studentId) throw new Error('Latihan ini bukan milik siswa tersebut.');
    if (attempt.status !== 'submitted') throw new Error('Kumpulkan latihan terlebih dahulu.');
    if (attempt.mode === 'practice' || attempt.reviewUnlocked) {
      return { reviewRequested: true, reviewUnlocked: true };
    }
    if (!attempt.reviewRequested) {
      attempt.reviewRequested = true;
      attempt.requestAt = new Date().toISOString();
      updateAttemptRow_(attempt);
      logActivity_(session.role, 'review_request', attempt.packageTitle + ' untuk ' + session.studentName + '.');
      audit_(session, 'request_review', 'attempt', attempt.id, attempt.packageTitle);
    }
    return { reviewRequested: true, reviewUnlocked: false };
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
    if (!attempt) throw new Error('Latihan tidak ditemukan.');
    if (session.role === 'parent' && attempt.studentId !== session.studentId) {
      throw new Error('Akun ini tidak memiliki akses ke latihan tersebut.');
    }
    if (attempt.status !== 'submitted') throw new Error('Latihan belum dikumpulkan.');

    if (attempt.mode === 'practice') {
      return {
        reviewUnlocked: true,
        unlockedAt: attempt.unlockedAt || '',
        unlockedBy: attempt.unlockedBy || 'Otomatis (latihan)'
      };
    }

    const shouldUnlock = Boolean(unlocked);
    attempt.reviewUnlocked = shouldUnlock;
    attempt.unlockedAt = shouldUnlock ? new Date().toISOString() : '';
    attempt.unlockedBy = shouldUnlock ? roleLabel_(session.role) : '';
    updateAttemptRow_(attempt);
    logActivity_(session.role, shouldUnlock ? 'unlock_review' : 'lock_review', attempt.packageTitle + ' untuk ' + attempt.studentName + '.');
    audit_(session, shouldUnlock ? 'unlock_review' : 'lock_review', 'attempt', attempt.id, attempt.packageTitle);

    return {
      reviewUnlocked: shouldUnlock,
      unlockedAt: attempt.unlockedAt,
      unlockedBy: attempt.unlockedBy
    };
  } finally {
    lock.releaseLock();
  }
}

function updateTeacherCode(token, code) {
  const session = requireRole_(token, ['teacher']);
  const clean = normalizeCode_(code);
  if (!/^[A-Z0-9-]{6,24}$/.test(clean)) {
    throw new Error('Kode guru harus 6 sampai 24 karakter, hanya huruf, angka, atau tanda hubung.');
  }
  PropertiesService.getScriptProperties().setProperty('CODE_TEACHER', clean);
  logActivity_(session.role, 'update_teacher_code', 'Kode guru diperbarui.');
  audit_(session, 'update_teacher_code', 'settings', '', 'Kode guru diperbarui.');
  return { teacherCode: clean };
}

function importQuestions(token, rows, replace) {
  const session = requireRole_(token, ['teacher']);
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('Tidak ada baris soal yang bisa diimpor.');
  }
  if (rows.length > 500) {
    throw new Error('Maksimal 500 soal per impor.');
  }

  const topics = getTopics_();
  const topicMap = {};
  topics.forEach(function (t) { topicMap[t.id] = t; });

  const existing = getQuestions_();
  const existingIds = {};
  existing.forEach(function (q) { existingIds[q.id] = true; });

  const errors = [];
  const parsed = [];
  const batchIds = {};
  const stamp = Utilities.formatDate(new Date(), APP.TIMEZONE, 'yyyyMMddHHmmss');

  rows.forEach(function (row, index) {
    const line = index + 2;
    const topicId = String(row.topicId || '').trim().toLowerCase();
    if (!topicMap[topicId]) {
      errors.push('Baris ' + line + ': topicId tidak dikenal.');
      return;
    }
    const question = String(row.question || '').trim();
    if (question.length < 5) {
      errors.push('Baris ' + line + ': pertanyaan terlalu pendek.');
      return;
    }
    const options = ['optionA', 'optionB', 'optionC', 'optionD'].map(function (key) {
      return String(row[key] || '').trim();
    });
    if (options.some(function (o) { return !o; })) {
      errors.push('Baris ' + line + ': semua pilihan A sampai D wajib diisi.');
      return;
    }
    if (new Set(options).size !== 4) {
      errors.push('Baris ' + line + ': pilihan jawaban tidak boleh sama.');
      return;
    }
    const answer = parseAnswerIndex_(row.answer);
    if (answer === null) {
      errors.push('Baris ' + line + ': jawaban harus A, B, C, D, atau 0 sampai 3.');
      return;
    }
    const solution = String(row.solution || '').trim();
    if (solution.length < 10) {
      errors.push('Baris ' + line + ': pembahasan terlalu pendek.');
      return;
    }
    let id = String(row.id || '').trim();
    if (id) {
      if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) {
        errors.push('Baris ' + line + ': id hanya boleh huruf, angka, garis bawah, atau tanda hubung.');
        return;
      }
      if (existingIds[id] && !replace) {
        errors.push('Baris ' + line + ': id ' + id + ' sudah ada di bank soal.');
        return;
      }
    } else {
      id = 'Q-' + stamp + '-' + (index + 1);
    }
    if (batchIds[id]) {
      errors.push('Baris ' + line + ': id ' + id + ' duplikat dalam file.');
      return;
    }
    batchIds[id] = true;
    const difficulty = normalizeDifficulty_(row.difficulty);
    const level = normalizeLevel_(row.level, difficulty);
    let familyId = String(row.familyId || row.familyid || id).trim();
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(familyId)) {
      errors.push('Baris ' + line + ': familyId hanya boleh huruf, angka, garis bawah, atau tanda hubung.');
      return;
    }
    const skill = String(row.skill || topicId).trim().slice(0, 60);
    parsed.push([
      id, topicId, topicMap[topicId].name, difficulty, question,
      options[0], options[1], options[2], options[3], answer, solution, true,
      familyId, 1, level, skill
    ]);
  });

  if (errors.length) {
    return { ok: false, imported: 0, errors: errors.slice(0, 20) };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_(SHEETS.questions);
    if (replace) {
      const last = sheet.getLastRow();
      if (last > 1) sheet.deleteRows(2, last - 1);
    }
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, parsed.length, QUESTION_HEADERS.length).setValues(parsed);
    invalidateQuestionsCache_();
    logActivity_(session.role, 'import_questions', parsed.length + ' soal, replace=' + (replace === true));
    audit_(session, 'import_questions', 'question_bank', '', parsed.length + ' soal', { replace: replace === true });
    return { ok: true, imported: parsed.length, replaced: replace === true, total: getQuestions_().length };
  } finally {
    lock.releaseLock();
  }
}

function parseAnswerIndex_(value) {
  if (typeof value === 'number' && value >= 0 && value <= 3) return value;
  const text = String(value == null ? '' : value).trim().toUpperCase();
  if (text === 'A' || text === '0') return 0;
  if (text === 'B' || text === '1') return 1;
  if (text === 'C' || text === '2') return 2;
  if (text === 'D' || text === '3') return 3;
  return null;
}

function normalizeDifficulty_(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'mudah') return 'Mudah';
  if (text === 'tantangan' || text === 'sulit') return 'Tantangan';
  return 'Sedang';
}

function normalizeLevel_(value, difficulty) {
  const number = Number(value);
  if (number === 1 || number === 2 || number === 3) return number;
  if (difficulty === 'Mudah') return 1;
  if (difficulty === 'Tantangan') return 3;
  return 2;
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
    if (question && answer) {
      const order = optionOrderFor_(attempt, qid);
      if (Number(answer.selectedIndex) === order.indexOf(Number(question.answer))) {
        correct += 1;
      }
    }
  });

  const now = new Date();
  const startMs = new Date(attempt.startedAt).getTime();
  const elapsed = isFinite(startMs) ? Math.max(0, Math.floor((now.getTime() - startMs) / 1000)) : 0;
  const maxSeconds = packageDurationMin_(attempt.packageId);

  attempt.submittedAt = now.toISOString();
  attempt.status = 'submitted';
  attempt.correctCount = correct;
  attempt.score = attempt.totalQuestions ? Math.round((correct / attempt.totalQuestions) * 100) : 0;
  attempt.durationSec = maxSeconds ? Math.min(maxSeconds, elapsed) : elapsed;

  if (attempt.mode === 'practice') {
    attempt.reviewUnlocked = true;
    attempt.unlockedAt = now.toISOString();
    attempt.unlockedBy = 'Otomatis (latihan)';
  }

  updateAttemptRow_(attempt);
  logActivity_('student', 'submit', attempt.packageTitle + ', skor ' + attempt.score + ' (' + reason + ').');
  audit_({ role: 'student', studentId: attempt.studentId, name: '' }, 'submit_attempt', 'attempt', attempt.id, attempt.packageTitle, { score: attempt.score, reason: reason });
}

function expireStaleAttempts_() {
  const attempts = readAttempts_();
  attempts.forEach(function (attempt) {
    if (attempt.status === 'in_progress' && attempt.mode === 'exam' && new Date().getTime() > attemptEndMs_(attempt)) {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const fresh = readAttempts_().filter(function (a) { return a.id === attempt.id; })[0];
        if (fresh && fresh.status === 'in_progress' && fresh.mode === 'exam' && new Date().getTime() > attemptEndMs_(fresh)) {
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
      questionIds = JSON.parse(String(row[12] || '[]'));
    } catch (error) {
      questionIds = String(row[12] || '').split(',').filter(Boolean);
    }
    let optionOrder = {};
    try {
      optionOrder = JSON.parse(String(row[18] || '{}')) || {};
    } catch (error) {
      optionOrder = {};
    }
    attempts.push({
      _row: index + 2,
      id: String(row[0]),
      studentId: String(row[1]),
      mode: String(row[2]),
      packageId: String(row[3]),
      packageTitle: String(row[4]),
      startedAt: toIso_(row[5]),
      submittedAt: row[6] ? toIso_(row[6]) : '',
      status: String(row[7]),
      score: row[8] === '' || row[8] === null ? null : Number(row[8]),
      correctCount: row[9] === '' || row[9] === null ? null : Number(row[9]),
      totalQuestions: Number(row[10]),
      durationSec: row[11] === '' || row[11] === null ? null : Number(row[11]),
      questionIds: questionIds,
      reviewUnlocked: toBool_(row[13]),
      reviewRequested: toBool_(row[14]),
      unlockedAt: row[15] ? toIso_(row[15]) : '',
      unlockedBy: row[16] ? String(row[16]) : '',
      requestAt: row[17] ? toIso_(row[17]) : '',
      optionOrder: optionOrder,
      adaptiveLevel: Number(row[19] || 0)
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
      answeredAt: row[4] ? toIso_(row[4]) : '',
      needsReview: toBool_(row[5]),
      flagNote: row[6] ? String(row[6]) : '',
      flaggedBy: row[7] ? String(row[7]) : '',
      flaggedAt: row[8] ? toIso_(row[8]) : ''
    };
  });
}

function attemptSummary_(attempt) {
  return {
    id: attempt.id,
    studentId: attempt.studentId,
    mode: attempt.mode,
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
    attempt.studentId,
    attempt.mode,
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
    attempt.requestAt || '',
    JSON.stringify(attempt.optionOrder || {}),
    attempt.adaptiveLevel || 0
  ];
}

function attemptEndMs_(attempt) {
  if (attempt.mode !== 'exam') return Infinity;
  const duration = packageDurationMin_(attempt.packageId);
  if (!duration) return Infinity;
  const start = new Date(attempt.startedAt).getTime();
  if (!isFinite(start)) return 0;
  return start + duration * 60 * 1000;
}

function remainingSeconds_(attempt) {
  if (attempt.mode !== 'exam') return null;
  const end = attemptEndMs_(attempt);
  if (!isFinite(end)) return null;
  return Math.max(0, Math.floor((end - new Date().getTime()) / 1000));
}

function packageDurationMin_(packageId) {
  const pkg = getPackageById_(packageId);
  if (pkg) return pkg.durationMin || null;
  if (packageId === 'exam:full') return 90;
  if (packageId === 'exam:quick') return 30;
  return null;
}

function pickMixedQuestions_(all, target) {
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
  while (picked.length < Math.min(target, all.length) && rest.length) {
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
  if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString();
  const text = String(value);
  const date = new Date(text);
  return isFinite(date.getTime()) ? date.toISOString() : text;
}

function toBool_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

function audit_(session, action, entityType, entityId, detail, metadata) {
  try {
    const sheet = getSheet_(SHEETS.audit);
    const role = session && session.role ? session.role : 'system';
    const studentId = session && session.studentId ? session.studentId : '';
    const name = session && (session.name || session.studentName) ? (session.name || session.studentName) : roleLabel_(role);
    sheet.appendRow([
      new Date().toISOString(),
      role,
      studentId,
      name,
      action || '',
      entityType || '',
      entityId || '',
      String(detail || '').slice(0, 500),
      metadata ? JSON.stringify(metadata).slice(0, 1000) : ''
    ]);
  } catch (error) {
    console.error('Audit gagal: ' + error.message);
  }
}

function setAnswerFlag(token, attemptId, questionId, flagged, note) {
  const session = requireRole_(token, ['student', 'parent', 'teacher']);
  const attempts = readAttempts_();
  const attempt = attempts.filter(function (a) { return a.id === attemptId; })[0];
  if (!attempt) throw new Error('Latihan tidak ditemukan.');
  if (session.role !== 'teacher' && attempt.studentId !== session.studentId) {
    throw new Error('Akun ini tidak memiliki akses ke latihan tersebut.');
  }
  if (attempt.status !== 'submitted') throw new Error('Kumpulkan latihan terlebih dahulu.');

  const sheet = getSheet_(SHEETS.answers);
  const values = sheet.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(attemptId) && String(values[i][1]) === String(questionId)) {
      row = i + 1;
      break;
    }
  }
  if (row < 0) throw new Error('Jawab soal ini terlebih dahulu sebelum menandainya.');

  const needs = flagged !== false;
  const cleanNote = String(note || '').trim().slice(0, 300);
  const flaggedBy = needs ? roleLabel_(session.role) + (session.studentName ? ' (' + session.studentName + ')' : '') : '';
  const flaggedAt = needs ? new Date().toISOString() : '';
  sheet.getRange(row, 6, 1, 4).setValues([[needs, cleanNote, flaggedBy, flaggedAt]]);

  audit_(session, needs ? 'flag_question' : 'unflag_question', 'answer', attemptId + '/' + questionId, attempt.packageTitle, { note: cleanNote });
  return { needsReview: needs, flagNote: cleanNote, flaggedBy: flaggedBy, flaggedAt: flaggedAt };
}

function getDifficultQuestions(token) {
  const session = requireRole_(token, ['teacher', 'parent']);
  const attempts = readAttempts_().filter(function (a) {
    if (a.status !== 'submitted') return false;
    if (session.role === 'parent') return a.studentId === session.studentId;
    return true;
  });
  const questions = getQuestionMap_();
  const students = {};
  readStudents_().forEach(function (s) { students[s.id] = s.name; });
  const grouped = {};

  attempts.forEach(function (attempt) {
    const answers = readAnswers_(attempt.id);
    const answerMap = {};
    answers.forEach(function (a) { answerMap[a.questionId] = a; });
    attempt.questionIds.forEach(function (qid) {
      const question = questions[qid];
      if (!question) return;
      if (!grouped[qid]) {
        grouped[qid] = {
          questionId: qid,
          question: question.question,
          topic: question.topic,
          level: question.level,
          familyId: question.familyId,
          total: 0,
          wrong: 0,
          flagged: 0,
          students: {},
          notes: []
        };
      }
      const item = grouped[qid];
      item.total += 1;
      const answer = answerMap[qid];
      const order = optionOrderFor_(attempt, qid);
      const servedCorrect = order.indexOf(Number(question.answer));
      if (!answer || Number(answer.selectedIndex) !== servedCorrect) item.wrong += 1;
      if (answer && answer.needsReview) {
        item.flagged += 1;
        const name = students[attempt.studentId] || 'Siswa';
        item.students[name] = true;
        if (answer.flagNote) item.notes.push(name + ': ' + answer.flagNote);
      }
    });
  });

  return Object.keys(grouped).map(function (key) {
    const item = grouped[key];
    return {
      questionId: item.questionId,
      question: item.question,
      topic: item.topic,
      level: item.level,
      familyId: item.familyId,
      total: item.total,
      wrong: item.wrong,
      wrongRate: item.total ? Math.round(item.wrong / item.total * 100) : 0,
      flagged: item.flagged,
      students: Object.keys(item.students).slice(0, 8),
      notes: item.notes.slice(0, 5)
    };
  }).sort(function (a, b) {
    return (b.flagged - a.flagged) || (b.wrongRate - a.wrongRate) || (b.wrong - a.wrong);
  }).slice(0, 50);
}

function getAuditLogs(token, limit) {
  requireRole_(token, ['teacher']);
  const sheet = getSheet_(SHEETS.audit);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const count = Math.min(Number(limit) || 100, 200, last - 1);
  const start = last - count + 1;
  const values = sheet.getRange(start, 1, count, AUDIT_HEADERS.length).getValues();
  return values.map(function (row) {
    return {
      timestamp: toIso_(row[0]),
      role: String(row[1]),
      studentId: String(row[2]),
      name: String(row[3]),
      action: String(row[4]),
      entityType: String(row[5]),
      entityId: String(row[6]),
      detail: String(row[7]),
      metadata: String(row[8])
    };
  }).reverse();
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

