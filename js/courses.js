/** Estudia+ · Gestión de cursos */
(function () {
  "use strict";

  const Storage = () => window.EstudiaPlusStorage;
  const U = () => window.EstudiaPlusUtils;

  function getCourse(courseId, data = Storage().getData()) {
    return data.courses.find((course) => course.id === courseId) || null;
  }

  function getCourseStats(courseId, data = Storage().getData()) {
    const tasks = data.tasks.filter((task) => task.courseId === courseId);
    const completed = tasks.filter((task) => task.status === "completed").length;
    const pending = tasks.length - completed;
    return { total: tasks.length, completed, pending, progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
  }

  function initials(name) {
    const words = String(name || "Curso").trim().split(/\s+/).filter((word) => word.length > 2);
    return (words.slice(0, 2).map((word) => word[0]).join("") || "CU").toUpperCase();
  }

  function populateSelects(data = Storage().getData()) {
    const configs = [
      { id: "task-course", first: "Sin curso" },
      { id: "activity-course", first: "Sin curso" },
      { id: "task-course-filter", first: "Todos los cursos" }
    ];
    configs.forEach(({ id, first }) => {
      const select = document.getElementById(id);
      if (!select) return;
      const current = select.value;
      select.innerHTML = `<option value="">${first}</option>${data.courses.map((course) => `<option value="${U().escapeHTML(course.id)}">${U().escapeHTML(course.name)}</option>`).join("")}`;
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    });
  }

  function render() {
    const data = Storage().getData();
    const grid = document.getElementById("courses-grid");
    const overview = document.getElementById("course-overview");
    if (!grid || !overview) return;

    const allTasks = data.tasks.length;
    const pending = data.tasks.filter((task) => task.status !== "completed").length;
    const completed = allTasks - pending;
    overview.innerHTML = `<span><strong>${data.courses.length}</strong> cursos</span><i class="overview-divider"></i><span><strong>${allTasks}</strong> tareas</span><i class="overview-divider"></i><span><strong>${completed}</strong> completadas</span>`;

    if (!data.courses.length) {
      grid.innerHTML = `<div class="panel empty-state"><div class="empty-icon">📚</div><strong>Aún no tienes cursos</strong><p>Agrega tu primera asignatura para comenzar.</p></div>`;
      populateSelects(data);
      return;
    }

    grid.innerHTML = data.courses.map((course) => {
      const stats = getCourseStats(course.id, data);
      return `<article class="course-card" style="--course-color:${U().escapeHTML(course.color || "#4b8dff")}">
        <div class="course-card-top"><div class="course-code">${initials(course.name)}</div><div class="card-actions"><button class="action-btn" data-course-edit="${U().escapeHTML(course.id)}" title="Editar curso" aria-label="Editar ${U().escapeHTML(course.name)}"><svg><use href="#i-edit"></use></svg></button><button class="action-btn danger" data-course-delete="${U().escapeHTML(course.id)}" title="Eliminar curso" aria-label="Eliminar ${U().escapeHTML(course.name)}"><svg><use href="#i-trash"></use></svg></button></div></div>
        <h3>${U().escapeHTML(course.name)}</h3>
        <div class="course-meta"><span><svg><use href="#i-book"></use></svg>${U().escapeHTML(course.teacher || "Docente por definir")}</span><span><svg><use href="#i-clock"></use></svg>${U().escapeHTML(course.schedule || "Horario por definir")}</span></div>
        <div class="course-progress-label"><span>Progreso</span><strong>${stats.progress}%</strong></div>
        <div class="progress-track"><i style="width:${stats.progress}%"></i></div>
        <div class="course-stats"><span>${stats.pending} pendientes · ${stats.completed} completadas</span><button data-course-tasks="${U().escapeHTML(course.id)}">Ver tareas →</button></div>
      </article>`;
    }).join("");
    populateSelects(data);
  }

  function openEditor(courseId = "") {
    const data = Storage().getData();
    const course = courseId ? getCourse(courseId, data) : null;
    document.getElementById("course-modal-title").textContent = course ? "Editar curso" : "Agregar curso";
    document.getElementById("course-id").value = course ? course.id : "";
    document.getElementById("course-name").value = course ? course.name : "";
    document.getElementById("course-teacher").value = course ? course.teacher || "" : "";
    document.getElementById("course-schedule").value = course ? course.schedule || "" : "";
    document.getElementById("course-color").value = course ? course.color || "#2ee6a6" : "#2ee6a6";
    document.getElementById("course-color-code").textContent = document.getElementById("course-color").value.toUpperCase();
    document.getElementById("course-weekly-hours").value = course ? course.weeklyGoal || 3 : 3;
    document.getElementById("course-description").value = course ? course.description || "" : "";
    window.EstudiaPlusApp.openModal("course-modal");
    setTimeout(() => document.getElementById("course-name").focus(), 80);
  }

  function saveCourse(event) {
    event.preventDefault();
    const id = document.getElementById("course-id").value;
    const course = {
      id: id || U().uid("course"),
      name: document.getElementById("course-name").value.trim(),
      teacher: document.getElementById("course-teacher").value.trim(),
      schedule: document.getElementById("course-schedule").value.trim(),
      color: document.getElementById("course-color").value,
      weeklyGoal: Number(document.getElementById("course-weekly-hours").value) || 3,
      description: document.getElementById("course-description").value.trim(),
      createdAt: Date.now()
    };
    if (!course.name) return;
    Storage().updateData((data) => {
      const index = data.courses.findIndex((item) => item.id === course.id);
      if (index >= 0) course.createdAt = data.courses[index].createdAt || Date.now();
      if (index >= 0) data.courses[index] = course; else data.courses.push(course);
      return data;
    });
    window.EstudiaPlusApp.closeModal("course-modal");
    window.EstudiaPlusApp.toast(id ? "Curso actualizado correctamente." : "Curso agregado correctamente.", "success");
  }

  function deleteCourse(courseId) {
    const course = getCourse(courseId);
    if (!course) return;
    window.EstudiaPlusApp.confirm({
      title: "Eliminar curso",
      message: `¿Deseas eliminar “${course.name}”? Sus tareas y actividades se conservarán sin curso asignado.`,
      confirmText: "Eliminar curso"
    }, () => {
      Storage().updateData((data) => {
        data.courses = data.courses.filter((item) => item.id !== courseId);
        data.tasks.forEach((task) => { if (task.courseId === courseId) task.courseId = ""; });
        data.activities.forEach((activity) => { if (activity.courseId === courseId) activity.courseId = ""; });
        return data;
      });
      window.EstudiaPlusApp.toast("Curso eliminado. Las actividades relacionadas se conservaron.", "success");
    });
  }

  function init() {
    document.getElementById("add-course").addEventListener("click", () => openEditor());
    document.getElementById("course-form").addEventListener("submit", saveCourse);
    document.getElementById("course-color").addEventListener("input", (event) => { document.getElementById("course-color-code").textContent = event.target.value.toUpperCase(); });
    document.getElementById("courses-grid").addEventListener("click", (event) => {
      const edit = event.target.closest("[data-course-edit]");
      const remove = event.target.closest("[data-course-delete]");
      const tasks = event.target.closest("[data-course-tasks]");
      if (edit) openEditor(edit.dataset.courseEdit);
      if (remove) deleteCourse(remove.dataset.courseDelete);
      if (tasks) {
        document.getElementById("task-course-filter").value = tasks.dataset.courseTasks;
        window.EstudiaPlusApp.goTo("tasks");
        window.EstudiaPlusTasks.render();
      }
    });
    render();
  }

  window.EstudiaPlusCourses = { init, render, populateSelects, getCourse, getCourseStats, openEditor };
})();
