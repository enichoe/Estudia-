/** Estudia+ · Calendario mensual y semanal */
(function () {
  "use strict";

  const Storage = () => window.EstudiaPlusStorage;
  const U = () => window.EstudiaPlusUtils;
  let calendarMode = "month";
  let cursorDate = new Date();
  let selectedDate = U().todayISO();

  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  function collectEvents(data = Storage().getData()) {
    const tasks = data.tasks.map((task) => {
      const course = data.courses.find((item) => item.id === task.courseId);
      return { id: task.id, source: "task", date: task.dueDate, time: task.dueTime || "23:59", title: task.title, status: task.status, type: task.type || "task", color: course ? course.color : "#4b8dff", courseName: course ? course.name : "Sin curso" };
    });
    const activities = data.activities.map((activity) => {
      const course = data.courses.find((item) => item.id === activity.courseId);
      return { id: activity.id, source: "activity", date: activity.date, time: activity.time || "", title: activity.title, status: activity.status, type: "activity", color: course ? course.color : "#2ee6a6", courseName: course ? course.name : "Sin curso" };
    });
    return [...tasks, ...activities].filter((event) => event.date).sort((a, b) => a.time.localeCompare(b.time));
  }

  function datesForMonth() {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function datesForWeek() {
    const start = U().startOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function renderAgenda(events) {
    const dateElement = document.getElementById("agenda-date");
    const list = document.getElementById("agenda-list");
    dateElement.textContent = U().formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" });
    const dayEvents = events.filter((event) => event.date === selectedDate);
    if (!dayEvents.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓️</div><strong>Fecha libre</strong><p>No hay actividades programadas.</p></div>`;
      return;
    }
    list.innerHTML = dayEvents.map((event) => `<div class="agenda-item" style="--event-color:${U().escapeHTML(event.color)}"><i class="agenda-color"></i><div style="min-width:0;flex:1"><strong>${U().escapeHTML(event.title)}</strong><span>${U().escapeHTML(event.time || "Todo el día")} · ${U().escapeHTML(event.courseName)} · ${event.source === "task" ? (window.EstudiaPlusTasks.typeLabels[event.type] || "Tarea") : "Actividad"}</span></div><div class="card-actions"><button class="action-btn" data-agenda-edit="${U().escapeHTML(event.id)}" data-source="${event.source}" title="Editar"><svg><use href="#i-edit"></use></svg></button>${event.source === "activity" ? `<button class="action-btn danger" data-agenda-delete="${U().escapeHTML(event.id)}" title="Eliminar"><svg><use href="#i-trash"></use></svg></button>` : ""}</div></div>`).join("");
  }

  function render() {
    const data = Storage().getData();
    const events = collectEvents(data);
    const grid = document.getElementById("calendar-grid");
    const headings = document.getElementById("calendar-weekdays");
    const period = document.getElementById("calendar-period");
    if (!grid || !headings || !period) return;
    const dates = calendarMode === "month" ? datesForMonth() : datesForWeek();
    headings.innerHTML = weekdays.map((day) => `<div>${day}</div>`).join("");
    grid.classList.toggle("week-view", calendarMode === "week");

    if (calendarMode === "month") {
      period.textContent = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(cursorDate);
    } else {
      const first = dates[0];
      const last = dates[6];
      period.textContent = first.getMonth() === last.getMonth()
        ? `${first.getDate()} – ${last.getDate()} de ${new Intl.DateTimeFormat("es-PE", { month: "long" }).format(last)}`
        : `${U().formatDate(U().toISODate(first), { day: "numeric", month: "short" })} – ${U().formatDate(U().toISODate(last), { day: "numeric", month: "short" })}`;
    }

    grid.innerHTML = dates.map((date) => {
      const iso = U().toISODate(date);
      const dayEvents = events.filter((event) => event.date === iso);
      const outside = calendarMode === "month" && date.getMonth() !== cursorDate.getMonth();
      return `<button class="calendar-day ${outside ? "outside" : ""} ${iso === U().todayISO() ? "today" : ""} ${iso === selectedDate ? "selected" : ""}" data-calendar-date="${iso}" aria-label="${U().formatDate(iso, { weekday: "long", day: "numeric", month: "long" })}, ${dayEvents.length} eventos"><span class="calendar-day-number">${date.getDate()}</span><span class="calendar-events">${dayEvents.slice(0, calendarMode === "week" ? 5 : 3).map((event) => `<span class="calendar-event" style="--event-color:${U().escapeHTML(event.color)}" title="${U().escapeHTML(event.title)}">${U().escapeHTML(event.time)} ${U().escapeHTML(event.title)}</span>`).join("")}${dayEvents.length > (calendarMode === "week" ? 5 : 3) ? `<span class="calendar-more">+${dayEvents.length - (calendarMode === "week" ? 5 : 3)} más</span>` : ""}</span></button>`;
    }).join("");
    renderAgenda(events);
  }

  function move(direction) {
    if (calendarMode === "month") cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + direction, 1);
    else {
      const next = new Date(cursorDate);
      next.setDate(next.getDate() + direction * 7);
      cursorDate = next;
    }
    render();
  }

  function addForSelectedDate() {
    window.EstudiaPlusApp.openActivityEditor("", { date: selectedDate });
  }

  function init() {
    document.querySelectorAll("[data-calendar-view]").forEach((button) => button.addEventListener("click", () => {
      calendarMode = button.dataset.calendarView;
      document.querySelectorAll("[data-calendar-view]").forEach((item) => item.classList.toggle("active", item === button));
      render();
    }));
    document.getElementById("calendar-prev").addEventListener("click", () => move(-1));
    document.getElementById("calendar-next").addEventListener("click", () => move(1));
    document.getElementById("calendar-today").addEventListener("click", () => { cursorDate = new Date(); selectedDate = U().todayISO(); render(); });
    document.getElementById("calendar-add").addEventListener("click", addForSelectedDate);
    document.getElementById("agenda-add").addEventListener("click", addForSelectedDate);
    document.getElementById("calendar-grid").addEventListener("click", (event) => {
      const day = event.target.closest("[data-calendar-date]");
      if (!day) return;
      selectedDate = day.dataset.calendarDate;
      render();
    });
    document.getElementById("agenda-list").addEventListener("click", (event) => {
      const edit = event.target.closest("[data-agenda-edit]");
      const remove = event.target.closest("[data-agenda-delete]");
      if (edit && edit.dataset.source === "task") window.EstudiaPlusTasks.openEditor(edit.dataset.agendaEdit);
      if (edit && edit.dataset.source === "activity") window.EstudiaPlusApp.openActivityEditor(edit.dataset.agendaEdit);
      if (remove) window.EstudiaPlusApp.deleteActivity(remove.dataset.agendaDelete);
    });
    render();
  }

  window.EstudiaPlusCalendar = { init, render, collectEvents };
})();
