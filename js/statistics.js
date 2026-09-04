/** Estudia+ · Cálculo y visualización de estadísticas */
(function () {
  "use strict";

  const Storage = () => window.EstudiaPlusStorage;
  const U = () => window.EstudiaPlusUtils;

  function calculate(data = Storage().getData()) {
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter((task) => task.status === "completed").length;
    const pendingTasks = totalTasks - completedTasks;
    const productivity = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const hoursByCourse = {};
    data.activities.filter((activity) => activity.status === "completed").forEach((activity) => {
      const key = activity.courseId || "uncategorized";
      hoursByCourse[key] = (hoursByCourse[key] || 0) + (Number(activity.duration) || 0);
    });
    const totalHours = Object.values(hoursByCourse).reduce((sum, value) => sum + value, 0);
    const daily = {};
    const addCompletion = (iso, amount = 1) => { if (iso) daily[iso] = (daily[iso] || 0) + amount; };
    data.tasks.filter((task) => task.status === "completed").forEach((task) => addCompletion(task.completedAt || task.dueDate));
    data.activities.filter((activity) => activity.status === "completed").forEach((activity) => addCompletion(activity.completedAt || activity.date));
    return { totalTasks, completedTasks, pendingTasks, productivity, hoursByCourse, totalHours, daily };
  }

  function render() {
    const data = Storage().getData();
    const stats = calculate(data);
    const hoursText = Number.isInteger(stats.totalHours) ? stats.totalHours : stats.totalHours.toFixed(1);
    document.getElementById("stats-metrics").innerHTML = [
      ["Total de tareas", stats.totalTasks, "Registradas en Estudia+"],
      ["Completadas", stats.completedTasks, `${stats.productivity}% del total`],
      ["Pendientes", stats.pendingTasks, stats.pendingTasks ? "Mantén el ritmo" : "Todo al día"],
      ["Horas estudiadas", `${hoursText} h`, "Actividades completadas"]
    ].map(([label, value, note]) => `<article class="stats-tile"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");

    const lastSeven = Array.from({ length: 7 }, (_, reverseIndex) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - reverseIndex));
      const iso = U().toISODate(date);
      const taskCount = data.tasks.filter((task) => task.status === "completed" && (task.completedAt || task.dueDate) === iso).length;
      return { iso, date, count: taskCount };
    });
    const max = Math.max(1, ...lastSeven.map((item) => item.count));
    document.getElementById("weekly-chart").innerHTML = lastSeven.map((item) => `<div class="chart-column"><div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(item.count ? 12 : 3, (item.count / max) * 100)}%"><b>${item.count}</b></div></div><span>${new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(item.date).replace(".", "")}</span></div>`).join("");

    document.getElementById("productivity-chart").innerHTML = `<div class="productivity-wrap"><div class="productivity-donut" style="--value:${stats.productivity}%"><strong>${stats.productivity}%</strong></div><div class="legend"><span><i style="background:var(--primary)"></i>${stats.completedTasks} completadas</span><span><i style="background:var(--surface-3)"></i>${stats.pendingTasks} pendientes</span></div></div>`;

    const courseHours = data.courses.map((course) => ({ course, hours: stats.hoursByCourse[course.id] || 0 })).filter((item) => item.hours > 0).sort((a, b) => b.hours - a.hours);
    const maxHours = Math.max(1, ...courseHours.map((item) => item.hours));
    document.getElementById("course-hours").innerHTML = courseHours.length ? courseHours.slice(0, 8).map(({ course, hours }) => `<div class="hours-row"><strong><i class="course-dot" style="--course-color:${U().escapeHTML(course.color)}"></i>${U().escapeHTML(course.name)}</strong><div class="progress-track"><i style="width:${(hours / maxHours) * 100}%;background:${U().escapeHTML(course.color)}"></i></div><span>${Number.isInteger(hours) ? hours : hours.toFixed(1)} h</span></div>`).join("") : `<div class="empty-state"><div class="empty-icon">⏱️</div><strong>Aún no hay horas registradas</strong><p>Completa actividades de estudio para ver la distribución.</p></div>`;

    const productiveDays = Object.entries(stats.daily).map(([iso, count]) => ({ iso, count })).sort((a, b) => b.count - a.count || b.iso.localeCompare(a.iso)).slice(0, 5);
    document.getElementById("productive-days").innerHTML = productiveDays.length ? `<div class="productive-list">${productiveDays.map((item, index) => `<div class="productive-row"><span>${index === 0 ? "🏆 " : ""}${U().formatDate(item.iso, { weekday: "long", day: "numeric", month: "short" })}</span><strong>${item.count} logros</strong></div>`).join("")}</div>` : `<div class="empty-state"><strong>Completa tu primera actividad</strong></div>`;
  }

  window.EstudiaPlusStatistics = { render, calculate };
})();
