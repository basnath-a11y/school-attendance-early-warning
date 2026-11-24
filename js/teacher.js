const STATUSES = ["Present", "Absent", "Late"];
const ALERT_THRESHOLD = 3;

const el = (id) => document.getElementById(id);

let profile, myClass, school;
let students = [];
let marks = {};

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function showError(text) {
  el("message").textContent = text;
  el("message").hidden = false;
  el("success").hidden = true;
}

function showSuccess(text) {
  el("success").textContent = text;
  el("success").hidden = false;
  el("message").hidden = true;
}

async function init() {
  profile = await requireRole("teacher");
  if (!profile) return;
  el("who").textContent = profile.full_name + " (Teacher)";
  el("logout").addEventListener("click", logout);
  el("submit-btn").addEventListener("click", submitAttendance);

  try {
    // Only the class assigned to this teacher (business rule)
    const { data: classes, error: classErr } = await sb
      .from("classes")
      .select("id, name, school_id")
      .eq("teacher_id", profile.id)
      .order("name");
    if (classErr) throw classErr;
    if (!classes || classes.length === 0) {
      showError("You have no class assigned. Please contact the administrator.");
      return;
    }
    myClass = classes[0];

    const { data: schoolData, error: schoolErr } = await sb
      .from("schools")
      .select("id, name, sector_id")
      .eq("id", myClass.school_id)
      .single();
    if (schoolErr) throw schoolErr;
    school = schoolData;

    const { data: studentData, error: studentErr } = await sb
      .from("students")
      .select("id, full_name, guardian:guardians(full_name, phone)")
      .eq("class_id", myClass.id)
      .order("full_name");
    if (studentErr) throw studentErr;
    students = studentData || [];

    // Pre-fill if attendance was already submitted today
    const { data: today, error: todayErr } = await sb
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", myClass.id)
      .eq("date", todayStr());
    if (todayErr) throw todayErr;

    students.forEach((s) => (marks[s.id] = "Present"));
    (today || []).forEach((r) => (marks[r.student_id] = r.status));

    el("class-title").textContent = myClass.name + " - Daily Attendance";
    el("class-info").textContent = school.name + " | " + todayStr();

    if (students.length === 0) {
      showError("There are no students in this class yet.");
      return;
    }
    renderRoster();
    el("roster").hidden = false;
    el("submit-btn").hidden = false;
  } catch (err) {
    console.error(err);
    showError("Could not load the class roster: " + err.message);
  }
}

function renderRoster() {
  const body = el("roster-body");
  body.innerHTML = "";
  students.forEach((s, i) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.textContent = i + 1;
    const tdName = document.createElement("td");
    tdName.textContent = s.full_name;

    const tdStatus = document.createElement("td");
    const group = document.createElement("div");
    group.className = "seg";
    STATUSES.forEach((status) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = status;
      b.className = status.toLowerCase() + (marks[s.id] === status ? " active" : "");
      b.addEventListener("click", () => {
        marks[s.id] = status;
        renderRoster();
      });
      group.appendChild(b);
    });
    tdStatus.appendChild(group);

    tr.append(tdNum, tdName, tdStatus);
    body.appendChild(tr);
  });
}

async function submitAttendance() {
  const btn = el("submit-btn");
  btn.disabled = true;
  el("alert-log").hidden = true;
  try {
    const date = todayStr();
    const rows = students.map((s) => ({
      student_id: s.id,
      class_id: myClass.id,
      date,
      status: marks[s.id],
      marked_by: profile.id,
    }));
    const { error } = await sb
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });
    if (error) throw error;

    const triggered = await checkAlerts();

    if (triggered.length === 0) {
      showSuccess("Attendance saved for " + students.length + " students. No new alerts.");
    } else {
      showSuccess(
        "Attendance saved for " + students.length + " students. " +
        triggered.length + " early-warning alert(s) triggered."
      );
      showAlertLog(triggered);
    }
  } catch (err) {
    console.error(err);
    showError("Attendance could not be saved: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// Count consecutive absences per student; alert at the threshold, once per streak
async function checkAlerts() {
  const ids = students.map((s) => s.id);
  const { data: history, error } = await sb
    .from("attendance")
    .select("student_id, date, status")
    .in("student_id", ids)
    .order("date", { ascending: false });
  if (error) throw error;

  const { data: officers, error: offErr } = await sb
    .from("profiles")
    .select("full_name, phone")
    .eq("role", "officer")
    .eq("sector_id", school.sector_id)
    .limit(1);
  if (offErr) throw offErr;
  const officer = officers && officers[0];

  const triggered = [];
  for (const s of students) {
    // Walk back from the latest day until the first non-Absent mark
    const records = history.filter((r) => r.student_id === s.id);
    let count = 0;
    let streakStart = null;
    for (const r of records) {
      if (r.status !== "Absent") break;
      count++;
      streakStart = r.date;
    }
    if (count < ALERT_THRESHOLD) continue;

    // No duplicate alert for the same streak
    const { data: existing, error: exErr } = await sb
      .from("cases")
      .select("id")
      .eq("student_id", s.id)
      .gte("flagged_on", streakStart)
      .limit(1);
    if (exErr) throw exErr;
    if (existing.length > 0) continue;

    const alertRows = [];
    if (s.guardian) {
      alertRows.push({
        student_id: s.id,
        recipient_type: "guardian",
        recipient_phone: s.guardian.phone,
        message: `Dear ${s.guardian.full_name}, ${s.full_name} has been absent from ${school.name} for ${count} school days in a row. Please contact the school.`,
        absence_count: count,
      });
    }
    if (officer) {
      alertRows.push({
        student_id: s.id,
        recipient_type: "officer",
        recipient_phone: officer.phone,
        message: `Follow-up needed: ${s.full_name} (${school.name}) has been absent for ${count} school days in a row.`,
        absence_count: count,
      });
    }

    const { error: caseErr } = await sb
      .from("cases")
      .insert({ student_id: s.id, sector_id: school.sector_id, absence_count: count });
    if (caseErr) throw caseErr;

    if (alertRows.length > 0) {
      const { error: alertErr } = await sb.from("alerts").insert(alertRows);
      if (alertErr) throw alertErr;
    }
    triggered.push({ student: s.full_name, count, alerts: alertRows });
  }
  return triggered;
}

function showAlertLog(triggered) {
  const list = el("alert-list");
  list.innerHTML = "";
  triggered.forEach((t) => {
    t.alerts.forEach((a) => {
      const li = document.createElement("li");
      li.textContent =
        "SMS (simulated) to " + a.recipient_type + " " + a.recipient_phone + ": " + a.message;
      list.appendChild(li);
    });
  });
  el("alert-log").hidden = false;
}

init();