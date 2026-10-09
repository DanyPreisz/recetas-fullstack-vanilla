import { api, setSession, clearSession, getToken } from "./api.js";
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");
const listEl = document.querySelector("#list");
const form = document.querySelector("#recipe-form");
const formError = document.querySelector("#form-error");
const cancelBtn = document.querySelector("#cancel");
let mode = "login";
let query = "";
let timer;
let recipes = [];
const showError = (el, message) => { el.hidden = !message; el.textContent = message || ""; };

function setMode(next) {
  mode = next;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  authSubmit.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
}
function clearForm() {
  form.reset();
  document.querySelector("#recipe-id").value = "";
  cancelBtn.classList.add("hidden");
}
async function refresh() {
  const data = await api(`/api/recipes?q=${encodeURIComponent(query)}`);
  recipes = data.recipes;
  listEl.innerHTML = "";
  if (!recipes.length) {
    const empty = document.createElement("li");
    empty.textContent = "No hay recetas.";
    listEl.append(empty);
    return;
  }
  recipes.forEach((recipe) => {
    const li = document.createElement("li");
    li.className = "item";
    const title = document.createElement("strong");
    title.textContent = `${recipe.title} \u00b7 ${recipe.minutes} min`;
    const body = document.createElement("pre");
    body.textContent = `${recipe.ingredients}\n\n${recipe.steps}`.trim();
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => {
      document.querySelector("#recipe-id").value = recipe.id;
      document.querySelector("#title").value = recipe.title;
      document.querySelector("#minutes").value = recipe.minutes;
      document.querySelector("#ingredients").value = recipe.ingredients;
      document.querySelector("#steps").value = recipe.steps;
      cancelBtn.classList.remove("hidden");
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost";
    del.textContent = "Borrar";
    del.addEventListener("click", async () => { await api(`/api/recipes/${recipe.id}`, { method: "DELETE" }); await refresh(); });
    li.append(title, edit, del, body);
    listEl.append(li);
  });
}
async function boot() {
  if (!getToken()) return;
  try {
    const { user } = await api("/api/auth/me");
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.querySelector("#user-name").textContent = user.username;
    await refresh();
  } catch { clearSession(); }
}
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError, "");
  const fd = new FormData(authForm);
  try {
    const data = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    setSession(data.token);
    authForm.reset();
    await boot();
  } catch (err) { showError(authError, err.message); }
});
document.querySelector("#logout").addEventListener("click", () => { clearSession(); appView.classList.add("hidden"); authView.classList.remove("hidden"); });
document.querySelector("#search").addEventListener("input", (event) => { clearTimeout(timer); timer = setTimeout(async () => { query = event.target.value.trim(); await refresh(); }, 200); });
cancelBtn.addEventListener("click", clearForm);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(formError, "");
  const id = document.querySelector("#recipe-id").value;
  const payload = { title: document.querySelector("#title").value.trim(), minutes: document.querySelector("#minutes").value, ingredients: document.querySelector("#ingredients").value.trim(), steps: document.querySelector("#steps").value.trim() };
  try {
    await api(id ? `/api/recipes/${id}` : "/api/recipes", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    clearForm();
    await refresh();
  } catch (err) { showError(formError, err.message); }
});
boot();
