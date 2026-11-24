const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];
const el = (id) => document.getElementById(id);

let profile;
let cases = [];

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
  profile = await requireRole("officer");
  if (!profile) return;
  el("who").textContent = profile.full_name + " (Community Officer)";
  el("logout").addEventListener("click", logout);
  el("sort").addEventListener("change", render);
  el("show-resolved").addEventListener("change", render);
  await loadCases();
}

async function loadCases() {
  try {
    // Only cases in this officer's own sector
    const { data: sector } = await sb
      .from("sectors")
      .select("name")
      .eq("id", profile.sector_id)
      .maybeSingle();
    el("sector-info").textContent = sector ? "Sector: " + sector.name : "";

    const { data, error } = await sb
      .from("cases")
      .select(
        "id, status, absence_count, flagged_on, sector_id, " +
        "student:students(full_name, school:schools(name), guardian:guardians(full_name, phone))"
      )
      .eq("sector_id", profile.sector_id);
    if (error) throw error;
    cases = data || [];
    render();
  } catch (err) {
    console.error(err);
    showError("Could not load flagged students: " + err.message);
  }
}

function render() {
  const showResolved = el("show-resolved").checked;
  const sortBy = el("sort").value;

  let rows = cases.filter((c) => showResolved || c.status !== "Resolved");
  rows.sort((a, b) => {
    if (sortBy === "school") {
      const sa = (a.student && a.student.school && a.student.school.name) || "";
      const sb2 = (b.student && b.student.school && b.student.school.name) || "";
      return sa.localeCompare(sb2) || b.flagged_on.localeCompare(a.flagged_on);
    }
    return b.flagged_on.localeCompare(a.flagged_on);
  });

  const body = el("cases-body");
  body.innerHTML = "";
  rows.forEach((c) => {
    const tr = document.createElement("tr");
    const student = c.student || {};
    const guardian = student.guardian || {};

    const cells = [
      student.full_name || "Unknown",
      (student.school && student.school.name) || "",
      guardian.phone || "No guardian on file",
      c.absence_count,
      c.flagged_on,
    ];
    cells.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement("td");
    const select = document.createElement("select");
    select.className = "status status-" + c.status.replace(" ", "-").toLowerCase();
    STATUS_OPTIONS.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (s === c.status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => updateStatus(c, select.value, select));
    tdStatus.appendChild(select);
    tr.appendChild(tdStatus);

    body.appendChild(tr);
  });

  el("cases").hidden = rows.length === 0;
  el("empty").hidden = rows.length !== 0;
}

async function updateStatus(c, newStatus, select) {
  const previous = c.status;
  try {
    // Only the officer of the case's own sector may change it (business rule)
    const { data, error } = await sb
      .from("cases")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", c.id)
      .eq("sector_id", profile.sector_id)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("You can only update cases in your own sector.");
    }
    c.status = newStatus;
    showSuccess(
      (c.student ? c.student.full_name : "Case") + " marked as " + newStatus + "."
    );
    render();
  } catch (err) {
    console.error(err);
    select.value = previous;
    showError("Status could not be updated: " + err.message);
  }
}

init();