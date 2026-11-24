const form = document.getElementById("login-form");
const message = document.getElementById("message");

function showError(text) {
  message.textContent = text;
  message.hidden = false;
}

// If already logged in, go straight to the right dashboard
(async () => {
  try {
    const profile = await getProfile();
    if (profile) window.location.href = ROLE_HOME[profile.role];
  } catch (err) {
    console.error(err);
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.hidden = true;

  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(error);
      showError("Login failed: " + error.message);
      return;
    }

    const profile = await getProfile();
    if (!profile) {
      showError("Your account has no role assigned. " + lastProfileError);
      return;
    }
    window.location.href = ROLE_HOME[profile.role];
  } catch (err) {
    console.error(err);
    showError("Something went wrong: " + err.message);
  }
});