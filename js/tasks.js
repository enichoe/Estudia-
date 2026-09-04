/** Estudia+ · Gestión completa de tareas */
(function () {
  "use strict";

  const Storage = () => window.EstudiaPlusStorage;
  const U = () => window.EstudiaPlusUtils;
  const priorityLabels = { high: "Alta", medium: "Media", low: "Baja" };
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const statusLabels = { pending: "Pendiente", progress: "En progreso", completed: "Completado" };
  const typeLabels = { task: "Tarea", delivery: "Entrega", exam: "Examen", event: "Evento" };
  const typeIcons = { task: "✓", delivery: "↗", exam: "✦", event: "●" };

  function dueTimestamp(task) {
    const date = U().parseLocalDate(task.dueDate, task.dueTime || "23:59");
    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
  }

  function getFilteredTasks(data = Storage().getData()) {
    const query = (document.getElementById("task-search")?.value || "").trim().toLowerCase();
    const courseId = document.getElementById("task-course-filter")?.value || "";
    const priority = document.getElementById("task-priority-filter")?.value || "";
    const status = document.getElementById("task-status-filter")?.value || "";
    const sort = document.getElementById("task-sort")?.value || "due-asc";
    const filtered = data.tasks.filter((task) => {
      const searchable = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return (!query || searchable.includes(query)) && (!courseId || task.courseId === courseId) && (!priority || task.priority === priority) && (!status || task.status === status);
    });
    filtered.sort((a, b) => {
      if (sort === "due-desc") return dueTimestamp(b) - dueTimestamp(a);
      if (sort === "priority") return priorityWeight[b.priority] - priorityWeight[a.priority] || dueTimestamp(a) - dueTimestamp(b);
      if (sort === "created") return (b.createdAt || 0) - (a.createdAt || 0);
      return dueTimestamp(a) - dueTimestamp(b);
    });
    return filtered;
  }

  function render() {
    const data = Storage().getData();
    const list = document.getElementById("task-list");
    const meta = document.getElementById("task-results-meta");
    if (!list || !meta) return;
    const tasks = getFilteredTasks(data);
    meta.textContent = `${tasks.length} ${tasks.length === 1 ? "resultado" : "resultados"} · ${tasks.filter((task) => task.status !== "completed").length} pendientes`;
    if (!tasks.length) {
      list.innerHTML = `<div class="panel empty-state"><div class="empty-icon">✅</div><strong>No encontramos tareas</strong><p>Prueba otros filtros o agrega una nueva tarea.</p></div>`;
      return;
    }
    list.innerHTML = tasks.map((task) => {
      const course = data.courses.find((item) => item.id === task.courseId);
      const dayDistance = U().daysUntil(task.dueDate, task.dueTime);
      const isCompleted = task.status === "completed";
      const overdue = !isCompleted && dayDistance < 0;
      const soon = !isCompleted && dayDistance >= 0 && dayDistance <= 1;
      const dueText = overdue ? `Venció hace ${Math.abs(dayDistance)} ${Math.abs(dayDistance) === 1 ? "día" : "días"}` : dayDistance === 0 ? "Vence hoy" : dayDistance === 1 ? "Vence mañana" : U().formatDate(task.dueDate, { day: "numeric", month: "short" });
      const priorityColor = task.priority === "high" ? "var(--danger)" : task.priority === "medium" ? "var(--warning)" : "var(--success)";
      return `<article class="task-card ${isCompleted ? "completed" : ""} ${overdue ? "overdue" : ""} ${soon ? "due-soon" : ""}" data-task-id="${U().escapeHTML(task.id)}">
        <div class="task-priority-line" style="--priority-color:${priorityColor}"></div>
        <div class="task-main"><div class="task-copy"><div class="task-title-row"><h3>${U().escapeHTML(task.title)}</h3>${overdue ? `<span class="priority-badge high">Vencida</span>` : ""}</div><p class="task-description">${U().escapeHTML(task.description || "Sin descripción")}</p><div class="task-labels"><span class="course-label" style="color:${course ? U().escapeHTML(course.color) : "var(--text-soft)"}"><i class="course-dot" style="--course-color:${course ? U().escapeHTML(course.color) : "var(--muted)"}"></i>${U().escapeHTML(course ? course.name : "Sin curso")}</span><span class="priority-badge ${task.priority}">${priorityLabels[task.priority] || "Media"}</span><span class="status-badge ${task.status}">${statusLabels[task.status] || "Pendiente"}</span><span class="type-badge">${typeIcons[task.type] || "✓"} ${typeLabels[task.type] || "Tarea"}</span></div></div>
        <div class="task-due ${overdue ? "overdue" : soon ? "soon" : ""}"><span>Fecha límite</span><strong>${dueText} · ${U().escapeHTML(task.dueTime || "23:59")}</strong></div></div>
        <div class="task-card-actions"><button class="action-btn complete ${isCompleted ? "is-complete" : ""}" data-task-toggle="${U().escapeHTML(task.id)}" title="${isCompleted ? "Marcar como pendiente" : "Marcar como completada"}" aria-label="${isCompleted ? "Marcar como pendiente" : "Marcar como completada"}"><svg><use href="#i-check"></use></svg></button><button class="action-btn" data-task-edit="${U().escapeHTML(task.id)}" title="Editar tarea" aria-label="Editar tarea"><svg><use href="#i-edit"></use></svg></button><button class="action-btn danger" data-task-delete="${U().escapeHTML(task.id)}" title="Eliminar tarea" aria-label="Eliminar tarea"><svg><use href="#i-trash"></use></svg></button></div>
      </article>`;
    }).join("");
  }

  function openEditor(taskId = "", preset = {}) {
    const data = Storage().getData();
    const task = taskId ? data.tasks.find((item) => item.id === taskId) : null;
    window.EstudiaPlusCourses.populateSelects(data);
    document.getElementById("task-modal-title").textContent = task ? "Editar tarea" : "Nueva tarea";
    document.getElementById("task-id").value = task ? task.id : "";
    document.getElementById("task-title").value = task ? task.title : preset.title || "";
    document.getElementById("task-course").value = task ? task.courseId || "" : preset.courseId || "";
    document.getElementById("task-type").value = task ? task.type || "task" : preset.type || "task";
    document.getElementById("task-due-date").value = task ? task.dueDate : preset.date || U().relativeISO(1);
    document.getElementById("task-due-time").value = task ? task.dueTime || "23:59" : preset.time || "23:59";
    document.getElementById("task-priority").value = task ? task.priority : "medium";
    document.getElementById("task-status").value = task ? task.status : "pending";
    document.getElementById("task-description").value = task ? task.description || "" : "";
    window.EstudiaPlusApp.openModal("task-modal");
    setTimeout(() => document.getElementById("task-title").focus(), 80);
  }

  function saveTask(event) {
    event.preventDefault();
    const id = document.getElementById("task-id").value;
    const status = document.getElementById("task-status").value;
    const task = {
      id: id || U().uid("task"),
      title: document.getElementById("task-title").value.trim(),
      courseId: document.getElementById("task-course").value,
      type: document.getElementById("task-type").value,
      dueDate: document.getElementById("task-due-date").value,
      dueTime: document.getElementById("task-due-time").value || "23:59",
      priority: document.getElementById("task-priority").value,
      status,
      description: document.getElementById("task-description").value.trim(),
      createdAt: Date.now(),
      completedAt: status === "completed" ? U().todayISO() : null
    };
    if (!task.title || !task.dueDate) return;
    Storage().updateData((data) => {
      const index = data.tasks.findIndex((item) => item.id === task.id);
      if (index >= 0) {
        task.createdAt = data.tasks[index].createdAt || Date.now();
        if (data.tasks[index].status === "completed" && task.status === "completed") task.completedAt = data.tasks[index].completedAt || U().todayISO();
        data.tasks[index] = task;
      } else data.tasks.push(task);
      return data;
    });
    window.EstudiaPlusApp.closeModal("task-modal");
    window.EstudiaPlusApp.toast(id ? "Tarea actualizada correctamente." : "Tarea creada correctamente.", "success");
  }

  function toggleTask(taskId) {
    let completed = false;
    Storage().updateData((data) => {
      const task = data.tasks.find((item) => item.id === taskId);
      if (!task) return data;
      completed = task.status !== "completed";
      task.status = completed ? "completed" : "pending";
      task.completedAt = completed ? U().todayISO() : null;
      return data;
    });
    window.EstudiaPlusApp.toast(completed ? "¡Tarea completada! Buen trabajo." : "La tarea volvió a pendientes.", "success");
  }

  function deleteTask(taskId) {
    const task = Storage().getData().tasks.find((item) => item.id === taskId);
    if (!task) return;
    window.EstudiaPlusApp.confirm({ title: "Eliminar tarea", message: `¿Deseas eliminar “${task.title}”?`, confirmText: "Eliminar tarea" }, () => {
      Storage().updateData((data) => { data.tasks = data.tasks.filter((item) => item.id !== taskId); return data; });
      window.EstudiaPlusApp.toast("Tarea eliminada.", "success");
    });
  }

  function getUpcoming(limit = 5) {
    return Storage().getData().tasks.filter((task) => task.status !== "completed").sort((a, b) => dueTimestamp(a) - dueTimestamp(b)).slice(0, limit);
  }

  function init() {
    document.getElementById("add-task").addEventListener("click", () => openEditor());
    document.getElementById("quick-task").addEventListener("click", () => openEditor());
    document.getElementById("task-form").addEventListener("submit", saveTask);
    ["task-search", "task-course-filter", "task-priority-filter", "task-status-filter", "task-sort"].forEach((id) => {
      const element = document.getElementById(id);
      element.addEventListener(element.tagName === "INPUT" ? "input" : "change", render);
    });
    document.getElementById("task-list").addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-task-toggle]");
      const edit = event.target.closest("[data-task-edit]");
      const remove = event.target.closest("[data-task-delete]");
      if (toggle) toggleTask(toggle.dataset.taskToggle);
      if (edit) openEditor(edit.dataset.taskEdit);
      if (remove) deleteTask(remove.dataset.taskDelete);
    });
    render();
  }

  window.EstudiaPlusTasks = { init, render, openEditor, getUpcoming, dueTimestamp, priorityLabels, statusLabels, typeLabels };
})();
