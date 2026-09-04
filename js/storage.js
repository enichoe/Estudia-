/**
 * Estudia+ · Capa de persistencia
 * Centraliza LocalStorage, datos iniciales y utilidades compartidas.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "estudiaPlusData";
  const VERSION = 1;

  const pad = (value) => String(value).padStart(2, "0");
  const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const todayISO = () => toISODate(new Date());
  const relativeISO = (days) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return toISODate(date);
  };
  const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
  const parseLocalDate = (iso, time = "12:00") => {
    if (!iso) return null;
    const [year, month, day] = iso.split("-").map(Number);
    const [hour, minute] = String(time || "12:00").split(":").map(Number);
    return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  };
  const formatDate = (iso, options = {}) => {
    const date = parseLocalDate(iso);
    if (!date || Number.isNaN(date.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-PE", options).format(date);
  };
  const daysUntil = (iso, time = "23:59") => {
    const target = parseLocalDate(iso, time);
    if (!target) return Infinity;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((targetDay - today) / 86400000);
  };
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));
  const startOfWeek = (date = new Date()) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  };
  const isThisWeek = (iso) => {
    const value = parseLocalDate(iso);
    if (!value) return false;
    const start = startOfWeek();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return value >= start && value < end;
  };

  function createDefaultData() {
    const courses = [
      { id: "course-repair", name: "Reparación de Equipos de Cómputo", color: "#2ee6a6", teacher: "Lic. Diana Torres Cruz", schedule: "Lun y Jue", description: "Diagnóstico, seguridad y repación de equipos de cómputo.", weeklyGoal: 4, createdAt: Date.now() - 11000 },
      { id: "course-web", name: "Didáctica en el uso de Recurso Informáticos", color: "#4b8dff", teacher: "Lic. Diana Torres Cruz", schedule: "Jue", description: "", weeklyGoal: 5, createdAt: Date.now() - 10000 },
      { id: "course-networks", name: "Ofimática", color: "#b879ff", teacher: "Patricia Acuña", schedule: "Jue", description: "", weeklyGoal: 4, createdAt: Date.now() - 9000 },
      { id: "course-communication", name: "Instalación y con figuración de Redes de Comunicación", color: "#ff7c91", teacher: "Lic. Joaquin Rios", schedule: "Mie", description: "Comunicación oral, escrita y presentaciones efectivas.", weeklyGoal: 2, createdAt: Date.now() - 8000 },
      { id: "course-algorithms", name: "Cultura Artística", color: "#ffad4d", teacher: "Sanchez", schedule: "Lun", description: "", weeklyGoal: 4, createdAt: Date.now() - 7000 },
      { id: "course-database", name: "Interpretación y Producción de textos", color: "#2ec8e6", teacher: "Mauricio Varillas Guzmán", schedule: "Mié", description: "", weeklyGoal: 4, createdAt: Date.now() - 6000 },
      { id: "course-os", name: "Fundamentos de Investigación", color: "#6bd66b", teacher: "Layza", schedule: "Mar", description: "", weeklyGoal: 3, createdAt: Date.now() - 5000 },
      { id: "course-english", name: "Estadistica General", color: "#f283c5", teacher: "Cruz", schedule: "Mar", description: "", weeklyGoal: 2, createdAt: Date.now() - 4000 },
      { id: "course-office", name: "Administración de Redes", color: "#5fbcff", teacher: "Ninaja", schedule: "Mar", description: "", weeklyGoal: 2, createdAt: Date.now() - 3000 },
      { id: "course-math", name: "Herramientas de Gestión de redes de Comunicación", color: "#ff8c52", teacher: "Ing. Nori Bobadilla", schedule: "Vie", description: "", weeklyGoal: 3, createdAt: Date.now() - 2000 },
      { id: "course-project", name: "Software de Servidores de Red", color: "#a1e85a", teacher: "Ing. Nori Bobadilla", schedule: "Vie", description: "", weeklyGoal: 4, createdAt: Date.now() - 1000 }
    ];

    const tasks = [
      { id: "task-1", title: "Ficha práctica de uso del multímetro", courseId: "course-repair", description: "Completar mediciones de continuidad, voltaje y resistencia.", dueDate: relativeISO(1), dueTime: "20:00", priority: "high", status: "progress", type: "delivery", createdAt: Date.now() - 700000, completedAt: null },
      { id: "task-2", title: "Maquetar dashboard responsive", courseId: "course-web", description: "Crear la estructura principal y adaptar el menú a móvil.", dueDate: relativeISO(2), dueTime: "22:00", priority: "high", status: "pending", type: "task", createdAt: Date.now() - 650000, completedAt: null },
      { id: "task-3", title: "Práctica de direccionamiento IP", courseId: "course-networks", description: "Resolver los ejercicios de subredes indicados en clase.", dueDate: relativeISO(3), dueTime: "19:30", priority: "medium", status: "pending", type: "task", createdAt: Date.now() - 600000, completedAt: null },
      { id: "task-4", title: "Exposición: comunicación efectiva", courseId: "course-communication", description: "Ensayar una presentación breve con apertura, desarrollo y cierre.", dueDate: relativeISO(5), dueTime: "09:00", priority: "medium", status: "pending", type: "exam", createdAt: Date.now() - 550000, completedAt: null },
      { id: "task-5", title: "Modelo entidad-relación", courseId: "course-database", description: "Diseñar el modelo para un sistema de matrículas.", dueDate: relativeISO(7), dueTime: "21:00", priority: "medium", status: "pending", type: "delivery", createdAt: Date.now() - 500000, completedAt: null },
      { id: "task-6", title: "Ejercicios de proposiciones lógicas", courseId: "course-algorithms", description: "Resolver tablas de verdad y validar inferencias.", dueDate: relativeISO(-1), dueTime: "18:00", priority: "high", status: "pending", type: "task", createdAt: Date.now() - 450000, completedAt: null },
      { id: "task-7", title: "Glosario de inglés técnico", courseId: "course-english", description: "Organizar 25 términos con su definición y ejemplo.", dueDate: relativeISO(-2), dueTime: "20:00", priority: "low", status: "completed", type: "task", createdAt: Date.now() - 400000, completedAt: relativeISO(-2) },
      { id: "task-8", title: "Presentación del proyecto tecnológico", courseId: "course-project", description: "Preparar diapositivas del problema, solución y beneficios.", dueDate: relativeISO(-4), dueTime: "12:00", priority: "high", status: "completed", type: "delivery", createdAt: Date.now() - 350000, completedAt: relativeISO(-3) },
      { id: "task-9", title: "Instalación de sistema operativo", courseId: "course-os", description: "Documentar particionado, instalación y controladores.", dueDate: relativeISO(9), dueTime: "21:00", priority: "low", status: "pending", type: "task", createdAt: Date.now() - 300000, completedAt: null },
      { id: "task-10", title: "Evaluación de matemática", courseId: "course-math", description: "Repasar porcentajes, conversiones y lógica numérica.", dueDate: relativeISO(4), dueTime: "20:15", priority: "high", status: "pending", type: "exam", createdAt: Date.now() - 250000, completedAt: null }
    ];

    const activities = [
      { id: "activity-1", date: todayISO(), time: "08:00", title: "Repasar diagnóstico de hardware", courseId: "course-repair", description: "Revisar apuntes y checklist de seguridad.", priority: "high", status: "completed", duration: 1, createdAt: Date.now() - 230000, completedAt: todayISO() },
      { id: "activity-2", date: todayISO(), time: "10:00", title: "Realizar ejercicios de programación", courseId: "course-web", description: "Practicar eventos y manipulación del DOM.", priority: "high", status: "progress", duration: 1.5, createdAt: Date.now() - 220000, completedAt: null },
      { id: "activity-3", date: todayISO(), time: "14:00", title: "Avanzar proyecto de innovación", courseId: "course-project", description: "Definir los objetivos y organizar las evidencias.", priority: "medium", status: "pending", duration: 2, createdAt: Date.now() - 210000, completedAt: null },
      { id: "activity-4", date: todayISO(), time: "19:00", title: "Repaso general", courseId: "course-algorithms", description: "Practicar lógica durante una hora.", priority: "low", status: "pending", duration: 1, createdAt: Date.now() - 200000, completedAt: null },
      { id: "activity-5", date: relativeISO(1), time: "18:00", title: "Preparar entrega del multímetro", courseId: "course-repair", description: "Ordenar fotografías y conclusiones.", priority: "high", status: "pending", duration: 1.5, createdAt: Date.now() - 190000, completedAt: null },
      { id: "activity-6", date: relativeISO(-1), time: "20:00", title: "Lectura de base de datos", courseId: "course-database", description: "Revisar normalización y relaciones.", priority: "medium", status: "completed", duration: 1, createdAt: Date.now() - 180000, completedAt: relativeISO(-1) },
      { id: "activity-7", date: relativeISO(-3), time: "19:30", title: "Práctica de redes", courseId: "course-networks", description: "Armar una topología básica.", priority: "medium", status: "completed", duration: 2, createdAt: Date.now() - 170000, completedAt: relativeISO(-3) }
    ];

    return {
      version: VERSION,
      settings: { userName: "Ernesto", theme: "dark", yapeNumber: "" },
      courses,
      tasks,
      activities,
      updatedAt: Date.now()
    };
  }

  function normalizeData(data) {
    const defaults = createDefaultData();
    return {
      version: VERSION,
      settings: { ...defaults.settings, ...(data && data.settings ? data.settings : {}) },
      courses: Array.isArray(data && data.courses) ? data.courses : [],
      tasks: Array.isArray(data && data.tasks) ? data.tasks : [],
      activities: Array.isArray(data && data.activities) ? data.activities : [],
      updatedAt: Number(data && data.updatedAt) || Date.now()
    };
  }

  function saveData(data, silent = false) {
    const normalized = normalizeData({ ...data, updatedAt: Date.now() });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      if (!silent) window.dispatchEvent(new CustomEvent("estudia:data-changed", { detail: normalized }));
      return normalized;
    } catch (error) {
      console.error("No se pudo guardar la información de Estudia+.", error);
      throw new Error("El navegador no pudo guardar los cambios.");
    }
  }

  function getData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return saveData(createDefaultData(), true);
      return normalizeData(JSON.parse(stored));
    } catch (error) {
      console.warn("Los datos guardados no eran válidos; se restauraron los datos iniciales.", error);
      return saveData(createDefaultData(), true);
    }
  }

  function updateData(updater) {
    const current = getData();
    const cloned = typeof structuredClone === "function" ? structuredClone(current) : JSON.parse(JSON.stringify(current));
    const next = typeof updater === "function" ? updater(cloned) : { ...current, ...updater };
    return saveData(next);
  }

  function resetData() { return saveData(createDefaultData()); }

  function exportData() {
    return JSON.stringify({ app: "Estudia+", exportedAt: new Date().toISOString(), data: getData() }, null, 2);
  }

  function importData(payload) {
    const candidate = payload && payload.data ? payload.data : payload;
    if (!candidate || !Array.isArray(candidate.courses) || !Array.isArray(candidate.tasks) || !Array.isArray(candidate.activities)) {
      throw new Error("El archivo no contiene una copia válida de Estudia+.");
    }
    return saveData(normalizeData(candidate));
  }

  window.EstudiaPlusStorage = { STORAGE_KEY, VERSION, getData, saveData, updateData, resetData, exportData, importData, createDefaultData };
  window.EstudiaPlusUtils = { pad, toISODate, todayISO, relativeISO, uid, escapeHTML, parseLocalDate, formatDate, daysUntil, clamp, startOfWeek, isThisWeek };
})();
