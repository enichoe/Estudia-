/**
 * Estudia+ · Control principal de interfaz
 * Conecta navegación, dashboard, actividades, ajustes y mensajes.
 */
(function () {
  "use strict";

  const Storage = () => window.EstudiaPlusStorage;
  const U = () => window.EstudiaPlusUtils;
  const validViews = ["dashboard", "my-day", "courses", "tasks", "calendar", "statistics", "settings"];
  let activeView = "dashboard";
  let confirmAction = null;

  const emptyState = (icon, title, message) => `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${message}</p></div>`;
  const statusLabels = { pending: "Pendiente", progress: "En progreso", completed: "Completado" };
  const priorityLabels = { high: "Alta", medium: "Media", low: "Baja" };

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open");
  }

  function toast(message, type = "info") {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.innerHTML = `<i></i><span>${U().escapeHTML(message)}</span>`;
    region.appendChild(item);
    setTimeout(() => { item.style.opacity = "0"; item.style.transform = "translateY(8px)"; }, 3400);
    setTimeout(() => item.remove(), 3750);
  }

  function confirm(options, callback) {
    document.getElementById("confirm-title").textContent = options.title || "¿Estás seguro?";
    document.getElementById("confirm-message").textContent = options.message || "Confirma esta acción.";
    document.getElementById("confirm-accept").textContent = options.confirmText || "Confirmar";
    confirmAction = callback;
    openModal("confirm-modal");
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("visible");
    document.body.style.overflow = "";
  }

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const open = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", open);
    document.getElementById("sidebar-overlay").classList.toggle("visible", open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  function goTo(view, updateHash = true) {
    if (!validViews.includes(view)) view = "dashboard";
    activeView = view;
    document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
    document.querySelectorAll(".nav-item[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    const section = document.getElementById(`view-${view}`);
    document.getElementById("page-title").textContent = section.dataset.title;
    document.getElementById("page-eyebrow").textContent = section.dataset.eyebrow;
    if (updateHash && location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
    closeSidebar();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "courses") window.EstudiaPlusCourses.render();
    if (view === "tasks") window.EstudiaPlusTasks.render();
    if (view === "calendar") window.EstudiaPlusCalendar.render();
    if (view === "statistics") window.EstudiaPlusStatistics.render();
    if (view === "my-day") renderMyDay();
    if (view === "settings") renderSettings();
  }

  function applyTheme(theme, persist = false) {
    const selected = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = selected;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", selected === "dark" ? "#07111f" : "#edf3fa");
    document.querySelectorAll("[data-theme-choice]").forEach((button) => button.classList.toggle("active", button.dataset.themeChoice === selected));
    if (persist) Storage().updateData((data) => { data.settings.theme = selected; return data; });
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 19) return "Buenas tardes";
    return "Buenas noches";
  }

  function getTodayActivities(data) {
    return data.activities.filter((activity) => activity.date === U().todayISO()).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }

  function weeklyTaskStats(data) {
    const relevant = data.tasks.filter((task) => U().isThisWeek(task.dueDate));
    const completed = relevant.filter((task) => task.status === "completed").length;
    return { total: relevant.length, completed, progress: relevant.length ? Math.round((completed / relevant.length) * 100) : 0 };
  }

  function hoursStudied(data) {
    return data.activities.filter((activity) => activity.status === "completed").reduce((sum, activity) => sum + (Number(activity.duration) || 0), 0);
  }

  function generateReminders(data = Storage().getData()) {
    const reminders = [];
    const activeTasks = data.tasks.filter((task) => task.status !== "completed");
    activeTasks.forEach((task) => {
      const days = U().daysUntil(task.dueDate, task.dueTime);
      if (days < 0) reminders.push({ urgent: true, title: "Tarea vencida", text: `${task.title} venció ${Math.abs(days) === 1 ? "ayer" : `hace ${Math.abs(days)} días`}`, score: -100 + days });
      else if (days === 0) reminders.push({ urgent: true, title: "Entrega para hoy", text: `${task.title} · ${task.dueTime || "23:59"}`, score: 0 });
      else if (days === 1) reminders.push({ urgent: false, title: "Entrega para mañana", text: task.title, score: 10 });
      else if (task.type === "exam" && days <= 7) reminders.push({ urgent: false, title: "Examen próximo", text: `${task.title} · en ${days} días`, score: 20 + days });
    });
    const todayActivities = getTodayActivities(data).filter((activity) => activity.status !== "completed");
    if (todayActivities.length) reminders.push({ urgent: false, title: "Actividades programadas", text: `Tienes ${todayActivities.length} ${todayActivities.length === 1 ? "actividad" : "actividades"} para hoy`, score: 5 });
    return reminders.sort((a, b) => a.score - b.score).slice(0, 7);
  }

  function renderReminderHTML(reminders) {
    return reminders.map((reminder) => `<div class="reminder ${reminder.urgent ? "urgent" : ""}"><i class="reminder-dot"></i><div><strong>${U().escapeHTML(reminder.title)}</strong><p>${U().escapeHTML(reminder.text)}</p></div></div>`).join("");
  }

  function renderDashboard() {
    const data = Storage().getData();
    const today = getTodayActivities(data);
    const completed = data.tasks.filter((task) => task.status === "completed").length;
    const pending = data.tasks.length - completed;
    const weekly = weeklyTaskStats(data);
    const hours = hoursStudied(data);
    const todayCompleted = today.filter((activity) => activity.status === "completed").length;
    const dailyProgress = today.length ? Math.round((todayCompleted / today.length) * 100) : 0;
    const userName = data.settings.userName || "Estudiante";
    document.getElementById("current-date").textContent = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    document.getElementById("welcome-title").textContent = `${greeting()}, ${userName} 👋`;
    document.getElementById("welcome-message").textContent = pending ? `Tienes ${pending} ${pending === 1 ? "tarea pendiente" : "tareas pendientes"}. Hoy puede ser un gran día para avanzar.` : "¡Excelente! No tienes tareas pendientes.";
    document.getElementById("daily-score").textContent = `${dailyProgress}%`;
    document.getElementById("daily-score-bar").style.width = `${dailyProgress}%`;

    document.getElementById("dashboard-metrics").innerHTML = [
      { icon: "i-check", label: "Tareas pendientes", value: pending, note: pending ? "Por completar" : "Todo al día" },
      { icon: "i-target", label: "Tareas completadas", value: completed, note: `${data.tasks.length} tareas en total` },
      { icon: "i-chart", label: "Progreso semanal", value: `${weekly.progress}%`, note: `${weekly.completed} de ${weekly.total} completadas` },
      { icon: "i-clock", label: "Horas estudiadas", value: `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`, note: "Actividades completadas" }
    ].map((metric) => `<article class="metric-card"><div class="metric-icon"><svg><use href="#${metric.icon}"></use></svg></div><div><small>${metric.label}</small><strong>${metric.value}</strong><em>${metric.note}</em></div></article>`).join("");

    const upcoming = window.EstudiaPlusTasks.getUpcoming(5);
    document.getElementById("upcoming-list").innerHTML = upcoming.length ? upcoming.map((task) => {
      const course = data.courses.find((item) => item.id === task.courseId);
      const date = U().parseLocalDate(task.dueDate);
      return `<div class="upcoming-item"><div class="date-tile"><b>${date.getDate()}</b><small>${new Intl.DateTimeFormat("es-PE", { month: "short" }).format(date).replace(".", "")}</small></div><div class="upcoming-copy"><strong>${U().escapeHTML(task.title)}</strong><span><i class="course-dot" style="--course-color:${course ? U().escapeHTML(course.color) : "var(--muted)"}"></i>${U().escapeHTML(course ? course.name : "Sin curso")} · ${U().escapeHTML(task.dueTime || "23:59")}</span></div><span class="priority-badge ${task.priority}">${priorityLabels[task.priority]}</span></div>`;
    }).join("") : emptyState("🎉", "Sin tareas próximas", "Disfruta tu avance o planifica una nueva meta.");

    document.getElementById("weekly-progress-value").textContent = `${weekly.progress}%`;
    document.getElementById("weekly-orbit").style.setProperty("--value", `${weekly.progress}%`);
    const todayCourses = new Set(today.map((activity) => activity.courseId).filter(Boolean)).size;
    document.getElementById("weekly-progress-details").innerHTML = `<div><strong>${weekly.completed}/${weekly.total}</strong><span>Tareas semanales</span></div><div><strong>${todayCourses}</strong><span>Cursos para hoy</span></div>`;

    document.getElementById("today-mini-timeline").innerHTML = today.length ? today.slice(0, 4).map((activity) => {
      const course = data.courses.find((item) => item.id === activity.courseId);
      return `<div class="mini-timeline-item" style="--item-color:${course ? U().escapeHTML(course.color) : "var(--primary)"}"><time>${U().escapeHTML(activity.time)}</time><i></i><div><strong>${U().escapeHTML(activity.title)}</strong><span>${U().escapeHTML(course ? course.name : "Actividad personal")}</span></div></div>`;
    }).join("") : emptyState("☀️", "Día sin actividades", "Agrega un bloque de estudio para hoy.");

    const reminders = generateReminders(data);
    document.getElementById("reminders-count").textContent = reminders.length;
    document.getElementById("reminders-list").innerHTML = reminders.length ? renderReminderHTML(reminders.slice(0, 4)) : emptyState("✨", "Todo bajo control", "No tienes alertas importantes.");
  }

  function renderMyDay() {
    const data = Storage().getData();
    const today = getTodayActivities(data);
    const completed = today.filter((activity) => activity.status === "completed").length;
    const todayHours = today.reduce((sum, activity) => sum + (Number(activity.duration) || 0), 0);
    const courses = new Set(today.map((activity) => activity.courseId).filter(Boolean)).size;
    document.getElementById("my-day-date").textContent = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    document.getElementById("day-summary").innerHTML = `<article class="day-summary-card"><span>Actividades<strong>${today.length}</strong></span></article><article class="day-summary-card"><span>Completadas<strong>${completed} de ${today.length}</strong></span></article><article class="day-summary-card"><span>Tiempo planificado<strong>${Number.isInteger(todayHours) ? todayHours : todayHours.toFixed(1)} h · ${courses} cursos</strong></span></article>`;
    const timeline = document.getElementById("day-timeline");
    if (!today.length) {
      timeline.innerHTML = emptyState("🕘", "Tu día está libre", "Agrega actividades y ordénalas por horario.");
      return;
    }
    timeline.innerHTML = today.map((activity) => {
      const course = data.courses.find((item) => item.id === activity.courseId);
      return `<article class="timeline-row ${activity.status === "completed" ? "is-completed" : ""}" style="--item-color:${course ? U().escapeHTML(course.color) : "var(--primary)"}"><time class="timeline-time">${U().escapeHTML(activity.time)}</time><div class="timeline-line"></div><div class="timeline-copy"><h3>${U().escapeHTML(activity.title)}</h3><p>${U().escapeHTML(activity.description || "Sin descripción")}</p><div class="timeline-tags"><span class="course-label">${U().escapeHTML(course ? course.name : "Sin curso")}</span><span class="status-badge ${activity.status}">${statusLabels[activity.status]}</span><span class="priority-badge ${activity.priority}">${priorityLabels[activity.priority]}</span></div></div><div class="timeline-actions"><button class="action-btn complete ${activity.status === "completed" ? "is-complete" : ""}" data-activity-toggle="${U().escapeHTML(activity.id)}" title="${activity.status === "completed" ? "Marcar pendiente" : "Completar"}"><svg><use href="#i-check"></use></svg></button><button class="action-btn" data-activity-edit="${U().escapeHTML(activity.id)}" title="Editar"><svg><use href="#i-edit"></use></svg></button><button class="action-btn danger" data-activity-delete="${U().escapeHTML(activity.id)}" title="Eliminar"><svg><use href="#i-trash"></use></svg></button></div></article>`;
    }).join("");
  }

  function openActivityEditor(activityId = "", preset = {}) {
    const data = Storage().getData();
    const activity = activityId ? data.activities.find((item) => item.id === activityId) : null;
    window.EstudiaPlusCourses.populateSelects(data);
    document.getElementById("activity-modal-title").textContent = activity ? "Editar actividad" : "Nueva actividad";
    document.getElementById("activity-id").value = activity ? activity.id : "";
    document.getElementById("activity-title").value = activity ? activity.title : "";
    document.getElementById("activity-date").value = activity ? activity.date : preset.date || U().todayISO();
    document.getElementById("activity-time").value = activity ? activity.time : preset.time || "18:00";
    document.getElementById("activity-course").value = activity ? activity.courseId || "" : preset.courseId || "";
    document.getElementById("activity-duration").value = String(activity ? activity.duration || 1 : 1);
    document.getElementById("activity-priority").value = activity ? activity.priority : "medium";
    document.getElementById("activity-status").value = activity ? activity.status : "pending";
    document.getElementById("activity-description").value = activity ? activity.description || "" : "";
    openModal("activity-modal");
    setTimeout(() => document.getElementById("activity-title").focus(), 80);
  }

  function saveActivity(event) {
    event.preventDefault();
    const id = document.getElementById("activity-id").value;
    const status = document.getElementById("activity-status").value;
    const activity = {
      id: id || U().uid("activity"),
      title: document.getElementById("activity-title").value.trim(),
      date: document.getElementById("activity-date").value,
      time: document.getElementById("activity-time").value,
      courseId: document.getElementById("activity-course").value,
      duration: Number(document.getElementById("activity-duration").value) || 1,
      priority: document.getElementById("activity-priority").value,
      status,
      description: document.getElementById("activity-description").value.trim(),
      createdAt: Date.now(),
      completedAt: status === "completed" ? U().todayISO() : null
    };
    if (!activity.title || !activity.date || !activity.time) return;
    Storage().updateData((data) => {
      const index = data.activities.findIndex((item) => item.id === activity.id);
      if (index >= 0) {
        activity.createdAt = data.activities[index].createdAt || Date.now();
        if (data.activities[index].status === "completed" && activity.status === "completed") activity.completedAt = data.activities[index].completedAt || U().todayISO();
        data.activities[index] = activity;
      } else data.activities.push(activity);
      return data;
    });
    closeModal("activity-modal");
    toast(id ? "Actividad actualizada." : "Actividad agregada a tu agenda.", "success");
  }

  function toggleActivity(activityId) {
    let completed = false;
    Storage().updateData((data) => {
      const activity = data.activities.find((item) => item.id === activityId);
      if (!activity) return data;
      completed = activity.status !== "completed";
      activity.status = completed ? "completed" : "pending";
      activity.completedAt = completed ? U().todayISO() : null;
      return data;
    });
    toast(completed ? "Actividad completada. ¡Sigue avanzando!" : "Actividad marcada como pendiente.", "success");
  }

  function deleteActivity(activityId) {
    const activity = Storage().getData().activities.find((item) => item.id === activityId);
    if (!activity) return;
    confirm({ title: "Eliminar actividad", message: `¿Deseas eliminar “${activity.title}” de tu agenda?`, confirmText: "Eliminar actividad" }, () => {
      Storage().updateData((data) => { data.activities = data.activities.filter((item) => item.id !== activityId); return data; });
      toast("Actividad eliminada.", "success");
    });
  }

  function renderNavigation() {
    const data = Storage().getData();
    const pending = data.tasks.filter((task) => task.status !== "completed").length;
    const today = getTodayActivities(data).filter((activity) => activity.status !== "completed").length;
    const weekly = weeklyTaskStats(data);
    document.getElementById("pending-badge").textContent = pending;
    document.getElementById("today-badge").textContent = today;
    document.getElementById("sidebar-progress").textContent = `${weekly.progress}%`;
    document.querySelector(".focus-ring").style.setProperty("--value", `${weekly.progress}%`);
    document.getElementById("sidebar-goal").textContent = `${weekly.completed} de ${weekly.total} tareas`;
    const reminders = generateReminders(data);
    document.getElementById("notification-dot").classList.toggle("visible", reminders.length > 0);
  }

  function renderSettings() {
    const settings = Storage().getData().settings;
    document.getElementById("settings-name").value = settings.userName || "";
    document.querySelectorAll("[data-theme-choice]").forEach((button) => button.classList.toggle("active", button.dataset.themeChoice === settings.theme));
    document.getElementById("support-yape-number").textContent = settings.yapeNumber || "Número por configurar";
  }

  function refresh() {
    renderNavigation();
    renderDashboard();
    renderMyDay();
    renderSettings();
    window.EstudiaPlusCourses.render();
    window.EstudiaPlusTasks.render();
    window.EstudiaPlusCalendar.render();
    window.EstudiaPlusStatistics.render();
  }

  function openNotifications() {
    let drawer = document.getElementById("notification-drawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "notification-drawer";
      drawer.className = "notification-drawer";
      drawer.setAttribute("aria-label", "Recordatorios");
      document.body.appendChild(drawer);
    }
    const reminders = generateReminders();
    drawer.innerHTML = `<div class="drawer-header"><div><p class="eyebrow">No pierdas de vista</p><h2>Recordatorios</h2></div><button class="modal-close" id="drawer-close" aria-label="Cerrar">×</button></div>${reminders.length ? renderReminderHTML(reminders) : emptyState("✨", "Todo bajo control", "No tienes alertas importantes.")}`;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.getElementById("drawer-close").addEventListener("click", () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); });
  }

  function exportData() {
    const blob = new Blob([Storage().exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estudia-plus-respaldo-${U().todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Copia de seguridad exportada.", "success");
  }

  async function importData(file) {
    if (!file) return;
    document.body.classList.add("app-loading");
    try {
      const payload = JSON.parse(await file.text());
      Storage().importData(payload);
      applyTheme(Storage().getData().settings.theme);
      toast("Datos importados correctamente.", "success");
    } catch (error) {
      toast(error.message || "No se pudo importar el archivo.", "error");
    } finally {
      document.body.classList.remove("app-loading");
      document.getElementById("import-file").value = "";
    }
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.addEventListener("click", () => goTo(button.dataset.view)));
    document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => goTo(button.dataset.go)));
    document.querySelectorAll("[data-support]").forEach((button) => button.addEventListener("click", () => { renderSettings(); openModal("support-modal"); }));
    document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); closeModal(button.closest("dialog").id); }));
    document.querySelectorAll("dialog.modal").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeModal(dialog.id); }));
    document.getElementById("menu-toggle").addEventListener("click", toggleSidebar);
    document.getElementById("sidebar-overlay").addEventListener("click", closeSidebar);
    document.getElementById("quick-theme").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true));
    document.getElementById("notifications-btn").addEventListener("click", openNotifications);
    document.getElementById("dashboard-add-activity").addEventListener("click", () => openActivityEditor());
    document.getElementById("add-activity").addEventListener("click", () => openActivityEditor());
    document.getElementById("activity-form").addEventListener("submit", saveActivity);
    document.getElementById("day-timeline").addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-activity-toggle]");
      const edit = event.target.closest("[data-activity-edit]");
      const remove = event.target.closest("[data-activity-delete]");
      if (toggle) toggleActivity(toggle.dataset.activityToggle);
      if (edit) openActivityEditor(edit.dataset.activityEdit);
      if (remove) deleteActivity(remove.dataset.activityDelete);
    });
    document.getElementById("confirm-cancel").addEventListener("click", () => { confirmAction = null; closeModal("confirm-modal"); });
    document.getElementById("confirm-accept").addEventListener("click", () => { const action = confirmAction; confirmAction = null; closeModal("confirm-modal"); if (typeof action === "function") action(); });
    document.getElementById("profile-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("settings-name").value.trim();
      Storage().updateData((data) => { data.settings.userName = name || "Estudiante"; return data; });
      toast("Tu nombre se guardó correctamente.", "success");
    });
    document.querySelectorAll("[data-theme-choice]").forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice, true)));
    document.getElementById("export-data").addEventListener("click", exportData);
    document.getElementById("import-data").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", (event) => importData(event.target.files[0]));
    document.getElementById("clear-data").addEventListener("click", () => confirm({ title: "Eliminar todos los datos", message: "Se eliminarán cursos, tareas y actividades guardadas en este navegador. Esta acción no se puede deshacer.", confirmText: "Eliminar todo" }, () => {
      const settings = Storage().getData().settings;
      Storage().saveData({ version: Storage().VERSION, settings, courses: [], tasks: [], activities: [] });
      toast("Todos los datos académicos fueron eliminados.", "success");
    }));
    window.addEventListener("estudia:data-changed", refresh);
    window.addEventListener("hashchange", () => goTo(location.hash.slice(1), false));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeSidebar();
      const drawer = document.getElementById("notification-drawer");
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
    });
  }

  function init() {
    const data = Storage().getData();
    applyTheme(data.settings.theme || "dark");
    bindEvents();
    window.EstudiaPlusCourses.init();
    window.EstudiaPlusTasks.init();
    window.EstudiaPlusCalendar.init();
    renderDashboard();
    renderMyDay();
    renderNavigation();
    renderSettings();
    window.EstudiaPlusStatistics.render();
    const initialView = validViews.includes(location.hash.slice(1)) ? location.hash.slice(1) : "dashboard";
    goTo(initialView, false);
  }

  window.EstudiaPlusApp = { init, refresh, goTo, openModal, closeModal, openActivityEditor, deleteActivity, toast, confirm, generateReminders };
  document.addEventListener("DOMContentLoaded", init);
})();
