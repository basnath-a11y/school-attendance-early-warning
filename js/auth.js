const ROLE_HOME = {
  teacher: "teacher.html",
  admin: "admin.html",
  officer: "officer.html",
};

let lastProfileError = "";

async function getProfile() {
  lastProfileError = "";
  const { data: { session }, error: sessionError } = await sb.auth.getSession();
  if (sessionError) {
    lastProfileError = "Session error: " + sessionError.message;
    return null;
  }
  if (!session) {
    lastProfileError = "No session found after login (browser may be blocking storage).";
    return null;
  }
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    lastProfileError = "Profile lookup failed: " + error.message;
    return null;
  }
  if (!data) {
    lastProfileError = "No profile row for user id " + session.user.id;
    return null;
  }
  return data;
}

async function requireRole(role) {
  const profile = await getProfile();
  if (!profile) {
    window.location.href = "index.html";
    return null;
  }
  if (profile.role !== role) {
    window.location.href = ROLE_HOME[profile.role];
    return null;
  }
  return profile;
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = "index.html";
}