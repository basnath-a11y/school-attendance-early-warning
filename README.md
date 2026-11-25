# School Attendance & Early Warning System for Rural Primary Schools

A web platform that helps rural primary schools in Rwanda spot early signs of student drop-out. Teachers record daily attendance, the system counts consecutive absences, and at **3 consecutive absences** it alerts the guardian and the community education officer, so someone can follow up before the student disengages.

- **Live app:** https://school-attendance-early-warning.netlify.app
- **SRS document:** https://docs.google.com/document/d/1YPQ9qsXDgX6QV8S_uWSalYLP0MVyChngJCMbDK3lnb0
- **Demo video:** https://drive.google.com/file/d/1dCjVYwAKmQ4Aq0974gJn1m5oj2xh-qsj/view?usp=sharing

Course project: Introduction to Software Engineering, African Leadership University (ALU). Author: Asnath Irebe Butera.

## Demo accounts

All accounts use the password `Demo@12345`.

| Role | Email | Where you land |
|---|---|---|
| Teacher | teacher@example.com | Attendance roster for Primary 4A |
| Community Officer | officer@example.com | Flagged students dashboard |
| Administrator | admin@example.com | Administrator dashboard (placeholder, see Known limitations) |

## What works (mapped to the SRS)

| SRS requirement | Status |
|---|---|
| NFR1: role-based login, each role sees only its own pages | Working |
| FR1.1-1.3: teacher selects own class, marks Present / Absent / Late, submits | Working |
| FR2.1-2.2: consecutive-absence count, alert threshold of 3 | Working |
| FR3.1-3.2: alert to guardian and community officer | Working, SMS is **simulated** (see below) |
| FR4.1-4.2: officer views flagged students in own sector, updates status (Open / In Progress / Resolved) | Working |
| Business rules: count resets on Present or Late; no duplicate alert for the same streak; only the officer of the case's sector can update it; a teacher only sees their assigned class | Working |

## Try the early-warning flow

1. Log in as the teacher. Everyone defaults to **Present**.
2. Mark **Aline Mukamana** as **Absent** (she already has 2 absences in a row from the demo data) and click **Submit Attendance**.
3. The page confirms the save and shows the two simulated SMS messages (guardian and officer).
4. Log out and log in as the officer. Aline appears as a flagged case with status **Open**. Change the status with the dropdown, and tick **Show resolved cases** to see closed ones.

To run the flow again, reset today's data in the Supabase SQL Editor:

```sql
delete from alerts;
delete from cases;
delete from attendance where date = current_date;
```

## Known limitations

- **SMS is simulated.** Alerts are stored in the `alerts` table and shown on screen. No real SMS is sent. A real gateway (for example Africa's Talking) would replace this step.
- **Administrator page is a placeholder.** Managing student and guardian records (FR5.1, FR5.2) is not built yet.
- **Weekly attendance report (FR6.1) is not built.**
- **Audit log (NFR5) is not built.**
- Role rules are enforced in the app code. Database-level row security is a simple "logged-in users only" policy and should be tightened before real use.

## Tech stack

- Front end: plain HTML, CSS and JavaScript
- Back end: Supabase (PostgreSQL database and authentication)
- Hosting: Netlify (auto-deploys from the `main` branch)

## Run it locally

You need Git, a browser, and either VS Code with the **Live Server** extension or Python. The repo already contains the project's public Supabase URL and anon key in `js/supabaseClient.js`, so it works without extra setup.

1. Clone the repository:

```
git clone https://github.com/basnath-a11y/school-attendance-early-warning.git
cd school-attendance-early-warning
```

2. Start a local web server (the app must be served over http, not opened as a file):
   - **VS Code:** open the folder, right-click `index.html`, choose **Open with Live Server**.
   - **Or Python:** run `python -m http.server 5500` and open http://localhost:5500
3. Log in with one of the demo accounts above.

## Use your own Supabase project (optional)

1. Create a free project at https://supabase.com.
2. In **Authentication > Users**, create three auto-confirmed users: `teacher@example.com`, `admin@example.com`, `officer@example.com` (password `Demo@12345`).
3. In the **SQL Editor**, run `database/schema.sql`, then `database/seed.sql`.
4. In **Project Settings > API Keys**, copy your project URL and the legacy **anon** key into `js/supabaseClient.js`. Never use the `service_role` key.

## Project structure

```
index.html            Login page
teacher.html          Teacher attendance roster
officer.html          Officer flagged-students dashboard
admin.html            Administrator dashboard (placeholder)
css/styles.css        Styling
js/supabaseClient.js  Supabase connection
js/auth.js            Session and role checks
js/login.js           Login logic
js/teacher.js         Roster, absence counter, alert logic
js/officer.js         Case list and status updates
database/schema.sql   Database tables and permissions
database/seed.sql     Demo school, class, students and attendance
```

## Development workflow

Built with feature branches and pull requests merged into `main`: `feature/login`, `feature/attendance-recording`, `feature/officer-dashboard`, and `docs/readme`.
