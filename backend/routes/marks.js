const { isPositiveInt, str } = require('../lib/validate');

const EXAM_TYPES = ['Assignment', 'Sessional 1', 'Sessional 2', 'End Sem', 'Practical', 'Other'];
const MAX_ROWS = 500;
const STANDARD = ['Assignment', 'Sessional 1', 'Sessional 2', 'End Sem'];
const DEFAULT_LABELS = { Assignment: 'Assignment', 'Sessional 1': 'Sessional 1', 'Sessional 2': 'Sessional 2', 'End Sem': 'End Semester Exam' };

const readAssessment = (examType, rawName) => {
    const name = str(rawName).replace(/\s+/g, ' ');
    if (!EXAM_TYPES.includes(examType)) return { error: 'Invalid assessment type.' };
    if (examType === 'Other') {
        if (!name) return { error: 'Please give the assessment a name.' };
        if (name.length > 60) return { error: 'Assessment name is too long (max 60).' };
        return { examType, name };
    }
    return { examType, name: '' };
};

module.exports = (app, { queryAsync, transaction, verifyRole, audit }) => {
    const safe = (fn) => (req, res) =>
        Promise.resolve(fn(req, res)).catch((e) => {
            console.error('Marks route error:', e.code || e.message);
            res.status(500).json({ error: 'Something went wrong. Please try again.' });
        });

    const teacherIdOf = async (userId) => {
        const rows = await queryAsync('SELECT teacher_id FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
        return rows.length ? rows[0].teacher_id : null;
    };
    const owns = async (teacherId, subjectId) =>
        (await queryAsync('SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND subject_id = ? LIMIT 1', [teacherId, subjectId])).length > 0;

    const authorizeSubject = async (req, res, subjectId) => {
        if (req.user.role === 'admin') return true;
        const teacherId = await teacherIdOf(req.user.id);
        if (!teacherId || !(await owns(teacherId, subjectId))) {
            res.status(403).json({ error: 'You are not assigned to this subject.' });
            return false;
        }
        return true;
    };

    app.post('/api/marks', verifyRole(['teacher']), safe(async (req, res) => {
        const b = req.body || {};
        const maxScore = Number(b.max_score);
        const reason = str(b.reason);

        if (!isPositiveInt(b.subject_id) || !Array.isArray(b.marks)) return res.status(400).json({ error: 'Invalid marks data.' });
        const a = readAssessment(str(b.exam_type), b.assessment_name);
        if (a.error) return res.status(400).json({ error: a.error });
        if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 999) {
            return res.status(400).json({ error: 'Maximum score must be a whole number between 1 and 999.' });
        }
        if (b.marks.length > MAX_ROWS) return res.status(400).json({ error: 'Too many rows in one sheet.' });
        if (reason.length > 255) return res.status(400).json({ error: 'Reason is too long (max 255).' });

        const subjectId = Number(b.subject_id);
        const entries = [];
        const seen = new Set();
        for (const m of b.marks) {
            if (m === null || m === undefined || m.score === '' || m.score === null || m.score === undefined) continue;
            const id = Number(m.id);
            const score = Number(m.score);
            if (!isPositiveInt(id) || !Number.isFinite(score)) return res.status(400).json({ error: 'Every score must be a valid number.' });
            if (score < 0 || score > maxScore) return res.status(400).json({ error: `Scores must be between 0 and ${maxScore}.` });
            if (Math.round(score * 100) / 100 !== score) return res.status(400).json({ error: 'Scores can have at most 2 decimal places.' });
            if (seen.has(id)) return res.status(400).json({ error: 'A student appears more than once in the sheet.' });
            seen.add(id);
            entries.push({ id, score });
        }
        if (entries.length === 0) return res.json({ success: true, message: 'Nothing to save', saved: 0, edited: 0 });

        const teacherId = await teacherIdOf(req.user.id);
        if (!teacherId) return res.status(404).json({ error: 'No teacher record found for this account.' });
        if (!(await owns(teacherId, subjectId))) return res.status(403).json({ error: 'You are not assigned to this subject.' });

        const roster = new Set((await queryAsync(
            `SELECT st.student_id FROM students st JOIN subjects sub ON st.course_id = sub.course_id AND st.semester = sub.semester WHERE sub.id = ?`,
            [subjectId])).map((r) => r.student_id));
        if (entries.some((e) => !roster.has(e.id))) {
            return res.status(400).json({ error: "Some students are not enrolled in this subject's class." });
        }

        const existing = await queryAsync(
            'SELECT student_id, score, max_score FROM marks WHERE subject_id = ? AND exam_type = ? AND assessment_name = ?',
            [subjectId, a.examType, a.name]);
        const before = new Map(existing.map((r) => [r.student_id, { score: Number(r.score), max: Number(r.max_score) }]));

        const toWrite = [];
        let edited = 0;
        for (const e of entries) {
            const prev = before.get(e.id);
            if (!prev) toWrite.push({ ...e, prev: null });
            else if (prev.score !== e.score || prev.max !== maxScore) { toWrite.push({ ...e, prev }); edited++; }
        }
        if (toWrite.length === 0) return res.json({ success: true, message: 'No changes to save.', saved: 0, edited: 0 });

        if (edited > 0 && reason.length < 3) {
            return res.status(400).json({ error: 'A reason is required when changing marks that were already saved.', requires_reason: true });
        }

        await transaction(async (q) => {
            await q(
                `INSERT INTO marks (student_id, subject_id, exam_type, assessment_name, score, max_score, uploaded_by) VALUES ?
                 ON DUPLICATE KEY UPDATE score = VALUES(score), max_score = VALUES(max_score), uploaded_by = VALUES(uploaded_by)`,
                [toWrite.map((w) => [w.id, subjectId, a.examType, a.name, w.score, maxScore, teacherId])]);
            await q(
                `INSERT INTO marks_history (student_id, subject_id, exam_type, assessment_name, old_score, new_score, old_max, new_max, changed_by_user_id, reason) VALUES ?`,
                [toWrite.map((w) => [w.id, subjectId, a.examType, a.name, w.prev ? w.prev.score : null, w.score, w.prev ? w.prev.max : null, maxScore, req.user.id, reason || null])]);
        });

        audit(req, {
            action: edited ? 'MARKS_EDIT' : 'MARKS_SAVE',
            entity: 'marks',
            entityId: `${subjectId}:${a.examType}${a.name ? ':' + a.name : ''}`,
            newValue: { subject_id: subjectId, exam_type: a.examType, assessment_name: a.name, max_score: maxScore, written: toWrite.length, edited },
            reason: reason || null
        });
        res.json({ success: true, saved: toWrite.length, edited });
    }));

    app.get('/api/marks/history', verifyRole(['teacher', 'admin']), safe(async (req, res) => {
        if (!isPositiveInt(req.query.subject_id)) return res.status(400).json({ error: 'Subject is required.' });
        const a = readAssessment(str(req.query.exam_type), req.query.assessment_name);
        if (a.error) return res.status(400).json({ error: a.error });
        const subjectId = Number(req.query.subject_id);
        if (!(await authorizeSubject(req, res, subjectId))) return;
        const rows = await queryAsync(
            `SELECT mh.id, st.roll_number AS roll, st.full_name AS name, mh.exam_type, mh.assessment_name,
                    mh.old_score, mh.new_score, mh.old_max, mh.new_max,
                    COALESCE(t.full_name, u.username) AS changed_by, mh.reason, mh.changed_at
               FROM marks_history mh
               JOIN students st ON st.student_id = mh.student_id
               LEFT JOIN users u ON u.id = mh.changed_by_user_id
               LEFT JOIN teachers t ON t.user_id = mh.changed_by_user_id
              WHERE mh.subject_id = ? AND mh.exam_type = ? AND mh.assessment_name = ?
              ORDER BY mh.changed_at DESC, mh.id DESC LIMIT 300`,
            [subjectId, a.examType, a.name]);
        res.json(rows);
    }));

    app.get('/api/assessments', verifyRole(['teacher', 'admin']), safe(async (req, res) => {
        if (!isPositiveInt(req.query.subject_id)) return res.status(400).json({ error: 'Subject is required.' });
        const subjectId = Number(req.query.subject_id);
        if (!(await authorizeSubject(req, res, subjectId))) return;
        res.json(await queryAsync(
            `SELECT assessment_name AS name, MAX(max_score) AS max_score, COUNT(*) AS students
               FROM marks WHERE subject_id = ? AND exam_type = 'Other'
              GROUP BY assessment_name ORDER BY MIN(created_at), assessment_name`, [subjectId]));
    }));

    app.get('/api/assessment-settings', verifyRole(['teacher', 'admin']), safe(async (req, res) => {
        if (!isPositiveInt(req.query.subject_id)) return res.status(400).json({ error: 'Subject is required.' });
        const subjectId = Number(req.query.subject_id);
        if (!(await authorizeSubject(req, res, subjectId))) return;
        res.json(await queryAsync(
            'SELECT exam_type, display_name, max_score FROM assessment_settings WHERE subject_id = ?', [subjectId]));
    }));

    app.put('/api/assessments/edit', verifyRole(['teacher']), safe(async (req, res) => {
        const b = req.body || {};
        if (!isPositiveInt(b.subject_id)) return res.status(400).json({ error: 'Subject is required.' });
        const cur = readAssessment(str(b.exam_type), b.assessment_name);
        if (cur.error) return res.status(400).json({ error: cur.error });
        const isCustom = cur.examType === 'Other';
        if (!isCustom && !STANDARD.includes(cur.examType)) return res.status(400).json({ error: 'This assessment type cannot be edited.' });

        const newMax = Number(b.max_score);
        if (!Number.isInteger(newMax) || newMax < 1 || newMax > 999) {
            return res.status(400).json({ error: 'Full marks must be a whole number between 1 and 999.' });
        }
        const reason = str(b.reason);
        if (reason.length > 255) return res.status(400).json({ error: 'Reason is too long (max 255).' });
        const typedName = str(b.new_name).replace(/\s+/g, ' ');
        if (typedName.length > 60) return res.status(400).json({ error: 'Name is too long (max 60).' });
        if (isCustom && !typedName) return res.status(400).json({ error: 'Please give the assessment a name.' });

        const subjectId = Number(b.subject_id);
        if (!(await authorizeSubject(req, res, subjectId))) return;

        const settings = await queryAsync('SELECT exam_type, display_name FROM assessment_settings WHERE subject_id = ?', [subjectId]);
        const effective = {};
        STANDARD.forEach((t) => { effective[t] = DEFAULT_LABELS[t]; });
        settings.forEach((r) => { if (STANDARD.includes(r.exam_type) && r.display_name) effective[r.exam_type] = r.display_name; });
        const customNames = (await queryAsync("SELECT DISTINCT assessment_name FROM marks WHERE subject_id = ? AND exam_type = 'Other'", [subjectId])).map((r) => r.assessment_name);

        const finalName = isCustom ? typedName : (typedName || DEFAULT_LABELS[cur.examType]);
        const others = [
            ...STANDARD.filter((t) => t !== cur.examType).map((t) => effective[t]),
            ...customNames.filter((n) => !isCustom || n.toLowerCase() !== cur.name.toLowerCase())
        ].map((n) => n.toLowerCase());
        if (others.includes(finalName.toLowerCase())) {
            return res.status(409).json({ error: 'Another assessment in this subject already uses that name.' });
        }

        const rows = await queryAsync(
            'SELECT student_id, score, max_score FROM marks WHERE subject_id = ? AND exam_type = ? AND assessment_name = ?',
            [subjectId, cur.examType, cur.name]);
        if (isCustom && rows.length === 0) {
            return res.status(404).json({ error: 'Save marks for this assessment first, then it can be edited.' });
        }

        const maxChanging = rows.some((r) => Number(r.max_score) !== newMax);
        if (maxChanging) {
            if (reason.length < 3) {
                return res.status(400).json({ error: 'A reason is required when changing full marks of saved marks.', requires_reason: true });
            }
            const tooHigh = rows.filter((r) => Number(r.score) > newMax).length;
            if (tooHigh > 0) {
                return res.status(400).json({ error: `${tooHigh} student(s) already have a score above ${newMax}. Correct those marks first.` });
            }
        }

        await transaction(async (q) => {
            if (maxChanging) {
                await q('INSERT INTO marks_history (student_id, subject_id, exam_type, assessment_name, old_score, new_score, old_max, new_max, changed_by_user_id, reason) VALUES ?',
                    [rows.map((r) => [r.student_id, subjectId, cur.examType, cur.name, r.score, r.score, r.max_score, newMax, req.user.id, reason])]);
                await q('UPDATE marks SET max_score = ? WHERE subject_id = ? AND exam_type = ? AND assessment_name = ?', [newMax, subjectId, cur.examType, cur.name]);
            }
            if (isCustom) {
                if (typedName !== cur.name) {
                    await q("UPDATE marks SET assessment_name = ? WHERE subject_id = ? AND exam_type = 'Other' AND assessment_name = ?", [typedName, subjectId, cur.name]);
                    await q("UPDATE marks_history SET assessment_name = ? WHERE subject_id = ? AND exam_type = 'Other' AND assessment_name = ?", [typedName, subjectId, cur.name]);
                }
            } else {
                const display = finalName === DEFAULT_LABELS[cur.examType] ? null : finalName;
                await q(`INSERT INTO assessment_settings (subject_id, exam_type, display_name, max_score, updated_by) VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), max_score = VALUES(max_score), updated_by = VALUES(updated_by)`,
                    [subjectId, cur.examType, display, newMax, req.user.id]);
            }
        });

        audit(req, {
            action: 'ASSESSMENT_EDIT', entity: 'marks', entityId: `${subjectId}:${cur.examType}${cur.name ? ':' + cur.name : ''}`,
            oldValue: { name: isCustom ? cur.name : effective[cur.examType], max_score: rows.length ? Number(rows[0].max_score) : null },
            newValue: { name: finalName, max_score: newMax, marks_updated: maxChanging ? rows.length : 0 },
            reason: reason || null
        });
        res.json({ success: true, name: finalName, max_score: newMax, marks_updated: maxChanging ? rows.length : 0 });
    }));
};
