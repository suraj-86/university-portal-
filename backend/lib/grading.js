
const OFFICIAL = false;

const PASS_PERCENT = 40;

const BANDS = [
    { min: 90, grade: 'A+' },
    { min: 80, grade: 'A' },
    { min: 70, grade: 'B' },
    { min: 60, grade: 'C' },
    { min: PASS_PERCENT, grade: 'D' }
];
const FAIL_GRADE = 'F';

const POINT_DIVISOR = 9.5;
const MAX_GRADE_POINT = 10;

const round = (n, places) => {
    const f = 10 ** places;
    return Math.round((Number(n) + Number.EPSILON) * f) / f;
};

const gradeFor = (percentage) => {
    for (const band of BANDS) {
        if (percentage >= band.min) return band.grade;
    }
    return FAIL_GRADE;
};

const gradePointFor = (percentage) =>
    round(Math.min(MAX_GRADE_POINT, Math.max(0, percentage / POINT_DIVISOR)), 2);

const isPass = (percentage) => percentage >= PASS_PERCENT;

const weightedGradePoint = (items) => {
    const credits = items.reduce((sum, i) => sum + i.credits, 0);
    if (credits <= 0) return null;
    const points = items.reduce((sum, i) => sum + i.gradePoint * i.credits, 0);
    return round(points / credits, 2);
};

const describe = () => {
    const legend = BANDS.map((band, i) => ({
        grade: band.grade,
        range: i === 0 ? `${band.min}% and above` : `${band.min}% to below ${BANDS[i - 1].min}%`
    }));
    legend.push({ grade: FAIL_GRADE, range: `below ${PASS_PERCENT}%` });
    return {
        official: OFFICIAL,
        passPercent: PASS_PERCENT,
        legend,
        gradePointRule: `Grade point = percentage / ${POINT_DIVISOR} (maximum ${MAX_GRADE_POINT}). SGPA and CGPA are credit-weighted averages of grade points.`
    };
};

module.exports = {
    OFFICIAL,
    PASS_PERCENT,
    FAIL_GRADE,
    round,
    gradeFor,
    gradePointFor,
    isPass,
    weightedGradePoint,
    describe
};
