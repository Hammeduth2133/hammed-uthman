/* =========================================================================
   script.js
   Shared JavaScript for the Student Portfolio site.
   This one file is loaded on every page, so each section below checks
   whether the elements it needs actually exist before doing anything —
   that's what lets the same file safely run on index.html, planner.html,
   contact.html, etc.
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. MOBILE NAV TOGGLE
   Runs on every page. Demonstrates basic event handling + DOM class
   manipulation (classList.toggle).
   ---------------------------------------------------------------------- */
(function setupNavToggle() {
  const toggleBtn = document.getElementById("navToggle");
  const nav = document.getElementById("primaryNav");

  if (!toggleBtn || !nav) return; // element not on this page, skip safely

  toggleBtn.addEventListener("click", function () {
    // toggle() adds the class if missing, removes it if present,
    // and returns true/false so we can sync the aria-expanded attribute.
    const isOpen = nav.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", isOpen);
  });
})();


/* =========================================================================
   2. ACADEMIC PLANNER (planner.html)
   Demonstrates: arrays of objects, functions, DOM creation, event
   handling (submit/click), localStorage for persistence, and dynamic
   re-rendering of the UI whenever the underlying data changes.
   ========================================================================= */
(function setupPlanner() {
  const taskForm = document.getElementById("taskForm");
  const taskList = document.getElementById("taskList");

  if (!taskForm || !taskList) return; // not on planner.html, skip

  const titleInput = document.getElementById("taskTitle");
  const dueInput = document.getElementById("taskDue");
  const priorityInput = document.getElementById("taskPriority");
  const emptyState = document.getElementById("emptyState");

  const statTotal = document.getElementById("statTotal");
  const statCompleted = document.getElementById("statCompleted");
  const statRemaining = document.getElementById("statRemaining");

  const STORAGE_KEY = "cos106-planner-tasks";

  // ---- Data ----
  // `tasks` is our single source of truth: an array of task objects.
  // Every add/complete/delete just mutates this array, then calls
  // renderTasks() to redraw the list from scratch — a simple, predictable
  // pattern for small apps like this one.
  let tasks = loadTasks();
  let nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;

  // ---- Persistence helpers ----
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      // If localStorage is unavailable or the data is corrupted,
      // fail gracefully with an empty list instead of crashing the page.
      console.error("Could not load saved tasks:", err);
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ---- Core functions ----

  // Adds a new task object to the tasks array.
  function addTask(title, dueDate, priority) {
    const newTask = {
      id: nextId++,
      title: title.trim(),
      dueDate: dueDate || null,
      priority: priority,
      completed: false
    };
    tasks.push(newTask);
    saveTasks();
    renderTasks();
  }

  // Flips a single task's completed flag by id.
  function toggleComplete(id) {
    tasks = tasks.map(function (t) {
      if (t.id === id) {
        return Object.assign({}, t, { completed: !t.completed });
      }
      return t;
    });
    saveTasks();
    renderTasks();
  }

  // Removes a task from the array by id.
  function deleteTask(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    saveTasks();
    renderTasks();
  }

  // Formats an ISO date string (YYYY-MM-DD) into something more readable.
  function formatDate(isoDate) {
    if (!isoDate) return "No due date";
    const date = new Date(isoDate + "T00:00:00");
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // Rebuilds the <ul id="taskList"> and stats bar from the `tasks` array.
  // This is the one place that touches the DOM for the task list, which
  // keeps the rendering logic in a single, easy-to-follow spot.
  function renderTasks() {
    taskList.innerHTML = ""; // clear previous render

    // Sort: incomplete tasks first, then by due date (earliest first).
    const sorted = [...tasks].sort(function (a, b) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    sorted.forEach(function (task) {
      const li = document.createElement("li");
      li.className = "task-row priority-" + task.priority + (task.completed ? " completed" : "");
      li.dataset.id = task.id;

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", "Mark '" + task.title + "' as complete");
      checkbox.addEventListener("change", function () {
        toggleComplete(task.id);
      });

      // Text info (title + due date/priority)
      const info = document.createElement("div");
      info.className = "task-info";

      const titleEl = document.createElement("div");
      titleEl.className = "task-title";
      titleEl.textContent = task.title;

      const metaEl = document.createElement("div");
      metaEl.className = "task-meta";
      metaEl.textContent = formatDate(task.dueDate) + " · " + task.priority.toUpperCase() + " priority";

      info.appendChild(titleEl);
      info.appendChild(metaEl);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "task-delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        // Play the fade-out animation, then actually remove the task
        // once the CSS transition finishes.
        li.classList.add("removing");
        li.addEventListener("animationend", function () {
          deleteTask(task.id);
        }, { once: true });
      });

      li.appendChild(checkbox);
      li.appendChild(info);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });

    // Show/hide the "no tasks" message
    emptyState.style.display = tasks.length === 0 ? "block" : "none";

    // Update the stats bar
    const completedCount = tasks.filter(function (t) { return t.completed; }).length;
    statTotal.textContent = tasks.length;
    statCompleted.textContent = completedCount;
    statRemaining.textContent = tasks.length - completedCount;
  }

  // ---- Event handling: form submit adds a new task ----
  taskForm.addEventListener("submit", function (event) {
    event.preventDefault(); // stop the browser from reloading the page

    const title = titleInput.value.trim();
    if (title === "") {
      titleInput.focus();
      return;
    }

    addTask(title, dueInput.value, priorityInput.value);

    // Reset the form for the next entry
    taskForm.reset();
    priorityInput.value = "medium";
    titleInput.focus();
  });

  // Initial render on page load
  renderTasks();
})();


/* =========================================================================
   3. CONTACT FORM VALIDATION (contact.html)
   Demonstrates: form event handling, regular expressions, and dynamically
   updating error messages / feedback in the DOM without a page reload.
   ========================================================================= */
(function setupContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return; // not on contact.html, skip

  const feedback = document.getElementById("form-feedback");

  const fields = {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    message: document.getElementById("message")
  };

  // Simple, readable regex patterns — good enough for front-end validation.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_PATTERN = /^[0-9]{7,15}$/; // digits only, 7-15 digits long

  // Shows an error message under a field and flags the group as invalid.
  function showError(fieldName, message) {
    document.getElementById("error-" + fieldName).textContent = message;
    document.getElementById("group-" + fieldName).classList.add("invalid");
  }

  // Clears any previous error state for a field.
  function clearError(fieldName) {
    document.getElementById("error-" + fieldName).textContent = "";
    document.getElementById("group-" + fieldName).classList.remove("invalid");
  }

  // Runs all validation rules and returns true only if everything passes.
  function validateForm() {
    let isValid = true;

    // Clear all previous errors first
    Object.keys(fields).forEach(clearError);

    if (fields.name.value.trim() === "") {
      showError("name", "Please enter your name.");
      isValid = false;
    }

    const emailValue = fields.email.value.trim();
    if (emailValue === "") {
      showError("email", "Please enter your email address.");
      isValid = false;
    } else if (!EMAIL_PATTERN.test(emailValue)) {
      showError("email", "Please enter a valid email address (e.g. name@example.com).");
      isValid = false;
    }

    const phoneValue = fields.phone.value.trim();
    if (phoneValue === "") {
      showError("phone", "Please enter your phone number.");
      isValid = false;
    } else if (!PHONE_PATTERN.test(phoneValue)) {
      showError("phone", "Phone number must contain digits only (7-15 digits, no spaces or symbols).");
      isValid = false;
    }

    if (fields.message.value.trim() === "") {
      showError("message", "Please enter a message.");
      isValid = false;
    }

    return isValid;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // this is a front-end demo, so we don't actually submit anywhere

    const success = validateForm();

    if (success) {
      feedback.textContent = "Thanks, " + fields.name.value.trim() + "! Your message has been validated and is ready to send.";
      feedback.className = "success";
      form.reset();
    } else {
      feedback.textContent = "Please fix the highlighted fields before sending.";
      feedback.className = "error";
    }
  });

  // Bonus: validate a field as soon as the user leaves it (on "blur"),
  // so errors show up before they even hit submit.
  Object.keys(fields).forEach(function (fieldName) {
    fields[fieldName].addEventListener("blur", function () {
      validateForm();
    });
  });
})();
