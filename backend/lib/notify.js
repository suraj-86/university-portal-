const CHUNK = 500;
const MAX_RECIPIENTS = 20000;
const RETENTION_DAYS = 90;

const clip = (value, max) => {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
const unique = (ids) => [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
const ACTIVE_USER = 'COALESCE(u.is_active, 1) <> 0';

module.exports = (queryAsync) => {
    const ids = async (sql, params = []) => unique((await queryAsync(sql, params)).map((r) => r.user_id));

    const studentUsers = ({ courseId = null, semester = null } = {}) => ids(
        `SELECT st.user_id FROM students st JOIN users u ON u.id = st.user_id
          WHERE st.status = 'Active' AND ${ACTIVE_USER}
            ${courseId ? 'AND st.course_id = ?' : ''} ${semester ? 'AND st.semester = ?' : ''}`,
        [courseId, semester].filter(Boolean));

    const allParentUsers = () => ids(
        `SELECT p.user_id FROM parents p JOIN users u ON u.id = p.user_id WHERE ${ACTIVE_USER}`);

    const parentUsersOfCohort = ({ courseId = null, semester = null } = {}) => ids(
        `SELECT DISTINCT p.user_id FROM students st
           JOIN parent_student_map psm ON psm.student_id = st.student_id
           JOIN parents p ON p.parent_id = psm.parent_id
           JOIN users u ON u.id = p.user_id
          WHERE st.status = 'Active' AND ${ACTIVE_USER}
            ${courseId ? 'AND st.course_id = ?' : ''} ${semester ? 'AND st.semester = ?' : ''}`,
        [courseId, semester].filter(Boolean));

    const teacherUsers = () => ids(
        `SELECT t.user_id FROM teachers t JOIN users u ON u.id = t.user_id WHERE ${ACTIVE_USER}`);

    const studentUsersByIds = (studentIds) => {
        const list = unique(studentIds);
        if (!list.length) return Promise.resolve([]);
        return ids(`SELECT st.user_id FROM students st JOIN users u ON u.id = st.user_id WHERE st.student_id IN (?) AND ${ACTIVE_USER}`, [list]);
    };
    const parentUsersByStudentIds = (studentIds) => {
        const list = unique(studentIds);
        if (!list.length) return Promise.resolve([]);
        return ids(
            `SELECT DISTINCT p.user_id FROM parent_student_map psm
               JOIN parents p ON p.parent_id = psm.parent_id JOIN users u ON u.id = p.user_id
              WHERE psm.student_id IN (?) AND ${ACTIVE_USER}`, [list]);
    };
    const familyOfStudents = async (studentIds) =>
        unique([...(await studentUsersByIds(studentIds)), ...(await parentUsersByStudentIds(studentIds))]);

    const noticeAudience = async (targetRole, subjectId) => {
        let cohort = {};
        if (subjectId) {
            const sub = await queryAsync('SELECT course_id, semester FROM subjects WHERE id = ?', [subjectId]);
            if (sub.length) cohort = { courseId: sub[0].course_id, semester: sub[0].semester };
        }
        const out = [];
        if (targetRole === 'all' || targetRole === 'student') out.push(...await studentUsers(cohort));
        if (targetRole === 'all' || targetRole === 'teacher') out.push(...await teacherUsers());
        if (targetRole === 'all' || targetRole === 'parent') out.push(...await allParentUsers());
        else if (targetRole === 'student') out.push(...(subjectId ? await parentUsersOfCohort(cohort) : await allParentUsers()));
        return unique(out);
    };

    const announcementAudience = async (audience, courseId, semester) => {
        const cohort = { courseId, semester };
        const out = [];
        if (audience === 'all' || audience === 'student') out.push(...await studentUsers(cohort));
        if (audience === 'all' || audience === 'parent') out.push(...(courseId ? await parentUsersOfCohort(cohort) : await allParentUsers()));
        if (audience === 'all' || audience === 'teacher') out.push(...await teacherUsers());
        return unique(out);
    };

    /**
     * items: [{ userId, type, title, body, section, refId }]
     * mode: 'insert' (default) always adds a row; 'refresh' rewrites an unread row of the same
     * type+ref instead of stacking another; 'skip' leaves an existing unread one untouched.
     */
    const sendMany = async (items, { mode = 'insert' } = {}) => {
        try {
            const list = (items || []).filter((it) => Number.isInteger(Number(it.userId)) && Number(it.userId) > 0).slice(0, MAX_RECIPIENTS);
            if (!list.length) return { created: 0, updated: 0, skipped: 0 };
            let fresh = list;
            let updated = 0;
            let skipped = 0;

            if (mode !== 'insert') {
                const types = [...new Set(list.map((it) => it.type))];
                const existing = new Map();
                const userIds = unique(list.map((it) => it.userId));
                for (let i = 0; i < userIds.length; i += CHUNK) {
                    const rows = await queryAsync(
                        'SELECT id, user_id, type, ref_id FROM notifications WHERE read_at IS NULL AND type IN (?) AND user_id IN (?)',
                        [types, userIds.slice(i, i + CHUNK)]);
                    rows.forEach((r) => existing.set(`${r.user_id}|${r.type}|${r.ref_id == null ? '' : r.ref_id}`, r.id));
                }
                fresh = [];
                for (const it of list) {
                    const key = `${it.userId}|${it.type}|${it.refId == null ? '' : it.refId}`;
                    const found = existing.get(key);
                    if (!found) { fresh.push(it); continue; }
                    if (mode === 'skip') { skipped += 1; continue; }
                    await queryAsync(
                        'UPDATE notifications SET title = ?, body = ?, section = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [clip(it.title, 200), it.body ? clip(it.body, 500) : null, it.section || null, found]);
                    updated += 1;
                }
            }

            for (let i = 0; i < fresh.length; i += CHUNK) {
                const rows = fresh.slice(i, i + CHUNK).map((it) => [
                    Number(it.userId), clip(it.type, 30), clip(it.title, 200), it.body ? clip(it.body, 500) : null,
                    it.section || null, it.refId == null ? null : Number(it.refId)]);
                await queryAsync('INSERT INTO notifications (user_id, type, title, body, section, ref_id) VALUES ?', [rows]);
            }
            return { created: fresh.length, updated, skipped };
        } catch (e) {
            console.error('Notification error:', e.code || e.message);
            return { created: 0, updated: 0, skipped: 0, failed: true };
        }
    };

    const send = (userIds, payload, options = {}) => {
        const skip = new Set(unique(options.exclude));
        const to = unique(userIds).filter((id) => !skip.has(id));
        return sendMany(to.map((userId) => ({ userId, ...payload })), options);
    };

    const markRead = async (userId, type, refIds) => {
        try {
            const list = unique(refIds);
            if (!list.length) return;
            await queryAsync(
                'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND type = ? AND ref_id IN (?) AND read_at IS NULL',
                [userId, type, list]);
        } catch (e) {
            console.error('Notification read error:', e.code || e.message);
        }
    };

    let lastPurge = 0;
    const purgeOld = async () => {
        if (Date.now() - lastPurge < 6 * 3600 * 1000) return;
        lastPurge = Date.now();
        try {
            await queryAsync('DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) LIMIT 2000', [RETENTION_DAYS]);
        } catch (e) {
            console.error('Notification purge error:', e.code || e.message);
        }
    };

    const run = (job) => { Promise.resolve().then(job).catch((e) => console.error('Notification error:', e.code || e.message)); };

    const familyByStudent = async (studentIds) => {
        const list = unique(studentIds);
        const map = new Map(list.map((id) => [id, []]));
        if (!list.length) return map;
        const own = await queryAsync(
            `SELECT st.student_id, st.user_id FROM students st JOIN users u ON u.id = st.user_id WHERE st.student_id IN (?) AND ${ACTIVE_USER}`, [list]);
        own.forEach((r) => map.get(r.student_id).push(r.user_id));
        const kin = await queryAsync(
            `SELECT psm.student_id, p.user_id FROM parent_student_map psm
               JOIN parents p ON p.parent_id = psm.parent_id JOIN users u ON u.id = p.user_id
              WHERE psm.student_id IN (?) AND ${ACTIVE_USER}`, [list]);
        kin.forEach((r) => { if (map.has(r.student_id)) map.get(r.student_id).push(r.user_id); });
        return map;
    };

    const dropFor = async (type, refId) => {
        try { await queryAsync('DELETE FROM notifications WHERE type = ? AND ref_id = ?', [type, Number(refId)]); }
        catch (e) { console.error('Notification cleanup error:', e.code || e.message); }
    };

    const timetableChanged = async (subjectIds) => {
        for (const id of unique(subjectIds)) {
            const sub = await queryAsync('SELECT subject_code, subject_name, course_id, semester FROM subjects WHERE id = ?', [id]);
            if (!sub.length) continue;
            const cohort = { courseId: sub[0].course_id, semester: sub[0].semester };
            const teachers = await ids(
                `SELECT t.user_id FROM teacher_assignments ta JOIN teachers t ON t.teacher_id = ta.teacher_id
                   JOIN users u ON u.id = t.user_id WHERE ta.subject_id = ? AND ${ACTIVE_USER}`, [id]);
            const people = unique([...await studentUsers(cohort), ...await parentUsersOfCohort(cohort), ...teachers]);
            await send(people, {
                type: 'timetable', title: 'Timetable updated', section: 'timetable', refId: id,
                body: `${sub[0].subject_code} ${sub[0].subject_name}: the schedule changed. Open the timetable to see the latest.`
            }, { mode: 'refresh' });
        }
    };

    return {
        run, familyByStudent, dropFor, timetableChanged,
        send, sendMany, markRead, purgeOld, unique,
        studentUsers, parentUsersOfCohort, teacherUsers, allParentUsers,
        studentUsersByIds, parentUsersByStudentIds, familyOfStudents,
        noticeAudience, announcementAudience
    };
};
module.exports.RETENTION_DAYS = RETENTION_DAYS;
