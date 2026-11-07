// ======================================
// 1. GET HTML ELEMENTS
// ======================================

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const subject = document.getElementById("subject");
const dueDate = document.getElementById("dueDate");
const priority = document.getElementById("priority");

const taskList = document.getElementById("taskList");
const filterTasks = document.getElementById("filterTasks");
const searchTasks = document.getElementById("searchTasks");
const subjectFilter = document.getElementById("subjectFilter");

const totalTasks = document.getElementById("totalTasks");
const pendingTasks = document.getElementById("pendingTasks");
const completedTasks = document.getElementById("completedTasks");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");

const formHeading = document.getElementById("formHeading");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");

// ======================================
// 2. TASK STATE + BACKEND API
// ======================================

const API_URL = "https://my-study-planner-beige.vercel.app/api";

let tasks = [];
let editingId = null;

function getToken() {
    return localStorage.getItem("myStudyToken");
}

async function apiRequest(path, options = {}) {
    const token = getToken();

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        localStorage.removeItem("myStudyToken");
        localStorage.removeItem("myStudyUser");
        showAuthScreen();
        throw new Error(data.message || "Session expired. Please login again.");
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Something went wrong. Please try again.");
    }

    return data;
}

// ======================================
// LOAD TASKS FROM BACKEND
// ======================================

async function loadTasksFromBackend() {
    const data = await apiRequest("/tasks");

    const serverTasks = Array.isArray(data)
        ? data
        : (data.tasks || data.data || []);

    tasks = serverTasks.map(task => ({
        ...task,
        id: Number(task.id),
        dueDate: String(task.dueDate || task.due_date || "").slice(0, 10),
        completed: Boolean(task.completed)
    }));

    renderTasks();
    renderCalendar();
}

// ======================================
// 3. DATE SETUP
// ======================================

const today = new Date();

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

const localToday = formatLocalDate(today);

document.getElementById("currentDate").textContent =
    today.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

dueDate.min = localToday;

// ======================================
// 4. ADD AND EDIT TASK
// ======================================

taskForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const taskSubject = subject.value.trim();
    const date = dueDate.value;
    const taskPriority = priority.value;

    if (!title || !taskSubject || !date) {
        alert("Please fill in all fields!");
        return;
    }

    if (date < localToday && editingId === null) {
        alert("Please select today or a future date.");
        return;
    }

    const payload = {
        title,
        subject: taskSubject,
        dueDate: date,
        priority: taskPriority
    };

    submitBtn.disabled = true;

    try {
        if (editingId !== null) {
            await apiRequest(`/tasks/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await apiRequest("/tasks", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        await loadTasksFromBackend();
        await loadUserProfile();
        resetForm();

    } catch (error) {
        alert(error.message);

    } finally {
        submitBtn.disabled = false;
    }
});

// ======================================
// 5. RESET FORM
// ======================================

function resetForm() {
    taskForm.reset();
    editingId = null;

    formHeading.textContent = "➕ Add New Task";
    submitBtn.textContent = "+ Add Task";

    cancelEdit.classList.add("hidden");
    dueDate.min = localToday;
}

cancelEdit.addEventListener("click", resetForm);

// ======================================
// 6. EDIT TASK
// ======================================

function editTask(id) {
    const task = tasks.find(task => Number(task.id) === Number(id));

    if (!task) return;

    editingId = id;

    taskTitle.value = task.title;
    subject.value = task.subject;
    dueDate.value = task.dueDate;
    priority.value = task.priority;

    dueDate.min = task.dueDate;

    formHeading.textContent = "✏️ Edit Task";
    submitBtn.textContent = "Update Task";

    cancelEdit.classList.remove("hidden");
    taskTitle.focus();

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// ======================================
// 7. COMPLETE / UNCOMPLETE TASK
// ======================================

async function toggleTask(id) {
    try {
        await apiRequest(`/tasks/${id}/toggle`, {
            method: "PATCH"
        });

        await loadTasksFromBackend();

    } catch (error) {
        alert(error.message);
    }
}

// ======================================
// 8. DELETE TASK
// ======================================

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        await apiRequest(`/tasks/${id}`, {
            method: "DELETE"
        });

        if (Number(editingId) === Number(id)) {
            resetForm();
        }

        await loadTasksFromBackend();

    } catch (error) {
        alert(error.message);
    }
}

// ======================================
// 9. SEARCH AND SUBJECT FILTER
// ======================================

function updateSubjectOptions() {
    const currentValue = subjectFilter.value;

    const subjects = [...new Set(
        tasks.map(task => task.subject)
    )].sort();

    subjectFilter.innerHTML = `
        <option value="all">All Subjects</option>
    `;

    subjects.forEach(function(name) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        subjectFilter.appendChild(option);
    });

    subjectFilter.value = subjects.includes(currentValue)
        ? currentValue
        : "all";
}

// ======================================
// 10. DISPLAY TASKS
// ======================================

function renderTasks() {
    taskList.innerHTML = "";

    const filter = filterTasks.value;
    const search = searchTasks.value.toLowerCase().trim();
    const selectedSubject = subjectFilter.value;

    let filteredTasks = tasks.filter(function(task) {
        const matchesStatus =
            filter === "all" ||
            (filter === "pending" && !task.completed) ||
            (filter === "completed" && task.completed);

        const matchesSearch =
            task.title.toLowerCase().includes(search) ||
            task.subject.toLowerCase().includes(search);

        const matchesSubject =
            selectedSubject === "all" ||
            task.subject === selectedSubject;

        return matchesStatus && matchesSearch && matchesSubject;
    });

    filteredTasks.sort(function(a, b) {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        return a.dueDate.localeCompare(b.dueDate);
    });

    if (filteredTasks.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No matching tasks found.";
        taskList.appendChild(message);
    }

    filteredTasks.forEach(function(task) {
        const item = document.createElement("div");
        item.className = "task-item";

        if (task.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", "Complete task");

        checkbox.addEventListener("change", function() {
            toggleTask(task.id);
        });

        const info = document.createElement("div");
        info.className = "task-info";

        const title = document.createElement("h4");
        title.textContent = task.title;

        const details = document.createElement("p");
        details.textContent =
            `${task.subject} • Due: ${task.dueDate}`;

        const badges = document.createElement("div");
        badges.className = "task-badges";

        const priorityBadge = document.createElement("span");
        priorityBadge.className = `badge ${task.priority}`;
        priorityBadge.textContent = `${task.priority} Priority`;

const isOverdue =
    !task.completed &&
    task.dueDate < localToday;

const statusBadge = document.createElement("span");
statusBadge.className = "badge";

const todayDate = new Date(localToday + "T00:00:00");
const taskDate = new Date(task.dueDate + "T00:00:00");

const daysLeft = Math.round(
    (taskDate - todayDate) / (1000 * 60 * 60 * 24)
);

if (task.completed) {
    statusBadge.textContent = "Completed";
}
else if (daysLeft < 0) {
    statusBadge.textContent = "⚠️ OVERDUE";
    statusBadge.classList.add("overdue");
}
else if (daysLeft === 0) {
    statusBadge.textContent = "🔔 DUE TODAY";
    statusBadge.classList.add("due-today");
}
else if (daysLeft <= 2) {
    statusBadge.textContent = "⏰ DUE SOON";
    statusBadge.classList.add("due-soon");
}
else {
    statusBadge.textContent = "Pending";
}

        badges.appendChild(priorityBadge);
        badges.appendChild(statusBadge);

        info.appendChild(title);
        info.appendChild(details);
        info.appendChild(badges);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function() {
            editTask(task.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function() {
            deleteTask(task.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        item.appendChild(checkbox);
        item.appendChild(info);
        item.appendChild(actions);

        taskList.appendChild(item);
    });

    updateSubjectOptions();
    updateDashboard();
    renderUpcomingTasks();
}

filterTasks.addEventListener("change", renderTasks);
searchTasks.addEventListener("input", renderTasks);
subjectFilter.addEventListener("change", renderTasks);

// ======================================
// 11. DASHBOARD STATISTICS
// ======================================

function updateDashboard() {
    const total = tasks.length;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = pending;

    progressText.textContent = percentage + "%";
    progressFill.style.width = percentage + "%";
}

// ======================================
// 12. CALENDAR
// ======================================

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");

let calendarDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
);

let selectedDate = localToday;

function renderCalendar() {
    calendarGrid.innerHTML = "";

    calendarTitle.textContent =
        calendarDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    weekdays.forEach(function(day) {
        const cell = document.createElement("div");
        cell.className = "calendar-day weekday";
        cell.textContent = day;
        calendarGrid.appendChild(cell);
    });

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        let dayNumber;
        let cellDate;
        let otherMonth = false;

        if (i < firstDay) {
            dayNumber = previousMonthDays - firstDay + i + 1;
            cellDate = new Date(year, month - 1, dayNumber);
            otherMonth = true;
        } else if (i >= firstDay + daysInMonth) {
            dayNumber = i - firstDay - daysInMonth + 1;
            cellDate = new Date(year, month + 1, dayNumber);
            otherMonth = true;
        } else {
            dayNumber = i - firstDay + 1;
            cellDate = new Date(year, month, dayNumber);
        }

        const dateString = formatLocalDate(cellDate);

        const dayTasks = tasks.filter(
            task => task.dueDate === dateString
        );

        const cell = document.createElement("div");
        cell.className = "calendar-day";

        if (dateString === localToday) cell.classList.add("today");
        if (dateString === selectedDate) cell.classList.add("selected");
        if (otherMonth) cell.classList.add("other-month");

        const number = document.createElement("div");
        number.className = "day-number";
        number.textContent = dayNumber;

        cell.appendChild(number);

        if (dayTasks.length > 0) {
            const count = document.createElement("span");
            count.className = "day-task-count";
            count.textContent = `${dayTasks.length} task`;
            cell.appendChild(count);
        }

        cell.addEventListener("click", function() {
            selectedDate = dateString;

            if (otherMonth) {
                calendarDate = new Date(
                    cellDate.getFullYear(),
                    cellDate.getMonth(),
                    1
                );
            }

            renderCalendar();
            showCalendarDetails(dateString);
        });

        calendarGrid.appendChild(cell);
    }

    showCalendarDetails(selectedDate);
}

function showCalendarDetails(dateString) {
    let details = document.getElementById("calendarDetails");

    if (!details) {
        details = document.createElement("div");
        details.id = "calendarDetails";
        details.className = "calendar-details";
        calendarGrid.after(details);
    }

    const dayTasks = tasks.filter(
        task => task.dueDate === dateString
    );

    details.innerHTML = "";

    const heading = document.createElement("strong");
    heading.textContent = `Tasks for ${dateString}`;
    details.appendChild(heading);

    if (dayTasks.length === 0) {
        const message = document.createElement("p");
        message.textContent = "No tasks scheduled for this date.";
        message.style.marginTop = "8px";
        details.appendChild(message);
        return;
    }

    dayTasks.forEach(function(task) {
        const line = document.createElement("p");
        line.style.marginTop = "8px";
        line.textContent =
            `${task.completed ? "✓" : "○"} ${task.title} (${task.subject})`;
        details.appendChild(line);
    });
}

document.getElementById("prevMonth").addEventListener("click", function() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", function() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
});

// ======================================
// 13. DARK MODE
// ======================================

const themeBtn = document.getElementById("themeBtn");

function applyTheme() {
    const dark = localStorage.getItem("myStudyTheme") === "dark";

    document.body.classList.toggle("dark", dark);
    themeBtn.textContent = dark ? "☀️" : "🌙";
}

themeBtn.addEventListener("click", function() {
    const isDark = document.body.classList.toggle("dark");

    localStorage.setItem(
        "myStudyTheme",
        isDark ? "dark" : "light"
    );

    applyTheme();
});

applyTheme();
// ======================================
// 14. NEON POMODORO TIMER
// ======================================

const timerDisplay = document.getElementById("timerDisplay");
const timerMode = document.getElementById("timerMode");
const timerMessage = document.getElementById("timerMessage");
const timerSection = document.querySelector(".timer-section");
const clockRing = document.getElementById("clockRing");

const startTimer = document.getElementById("startTimer");
const pauseTimer = document.getElementById("pauseTimer");
const resetTimer = document.getElementById("resetTimer");

const modeButtons = document.querySelectorAll(".mode-btn");

const studyInput = document.getElementById("studyMinutes");
const shortInput = document.getElementById("shortMinutes");
const longInput = document.getElementById("longMinutes");
const saveSettingsBtn = document.getElementById("saveTimerSettings");

const defaultSettings = {
    study: 25,
    shortBreak: 5,
    longBreak: 15
};

function loadTimerSettingsFromStorage() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("myStudyTimerSettings")
        );

        if (!saved || typeof saved !== "object") {
            return { ...defaultSettings };
        }

        const result = { ...defaultSettings };

        for (const key of Object.keys(defaultSettings)) {
            const value = Number(saved[key]);
            const max = key === "study" ? 180 : 60;

            if (Number.isInteger(value) && value >= 1 && value <= max) {
                result[key] = value;
            }
        }

        return result;
    } catch (error) {
        console.error("Could not load timer settings:", error);
        return { ...defaultSettings };
    }
}

let timerSettings = loadTimerSettingsFromStorage();

let selectedMinutes = timerSettings.study;
let remainingSeconds = selectedMinutes * 60;
let timerInterval = null;
let endTime = null;
let activeMode = "Study";
let activeKind = "study";

function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timerDisplay.textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    timerMode.textContent =
        activeMode === "Study" ? "Study Session" : "Break Time";

    const totalSeconds = selectedMinutes * 60;
    const progress = totalSeconds > 0
        ? (remainingSeconds / totalSeconds) * 100
        : 0;

    clockRing.style.setProperty("--progress", progress + "%");
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    endTime = null;
    timerSection.classList.remove("running");
}

function tickTimer() {
    if (!endTime) return;

    remainingSeconds = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
    );

    updateTimerDisplay();

    if (remainingSeconds <= 0) {
        stopTimer();

        timerMessage.textContent =
            activeMode === "Study"
                ? "🎉 Study session complete! Take a break!"
                : "📚 Break finished! Ready to study?";

        alert(
            activeMode === "Study"
                ? "Great job! Your study session is complete."
                : "Your break is over. Let's study!"
        );
    }
}

function startCountdown() {
    if (timerInterval) return;

    if (remainingSeconds <= 0) {
        remainingSeconds = selectedMinutes * 60;
    }

    endTime = Date.now() + remainingSeconds * 1000;

    timerMessage.textContent = "✨ Stay focused. You can do it!";

    timerSection.classList.add("running");

    timerInterval = setInterval(tickTimer, 250);
    tickTimer();
}

function pauseCountdown() {
    if (!timerInterval) return;

    tickTimer();

    if (timerInterval) {
        stopTimer();
        timerMessage.textContent = "⏸ Timer paused.";
    }
}

function resetCountdown() {
    stopTimer();

    remainingSeconds = selectedMinutes * 60;

    updateTimerDisplay();

    timerMessage.textContent = "✨ Timer reset. Ready when you are!";
}

function selectTimerMode(button) {
    stopTimer();

    modeButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    activeKind = button.dataset.kind;
    activeMode = button.dataset.mode;

    selectedMinutes = timerSettings[activeKind];
    remainingSeconds = selectedMinutes * 60;

    updateTimerDisplay();

    timerMessage.textContent = "✨ Ready when you are!";
}

modeButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        selectTimerMode(button);
    });
});

startTimer.addEventListener("click", startCountdown);
pauseTimer.addEventListener("click", pauseCountdown);
resetTimer.addEventListener("click", resetCountdown);

// Load saved settings into inputs and mode buttons
function loadTimerSettings() {
    studyInput.value = timerSettings.study;
    shortInput.value = timerSettings.shortBreak;
    longInput.value = timerSettings.longBreak;

    document.querySelector('[data-kind="study"]').textContent =
        `🎓 Study ${timerSettings.study}m`;

    document.querySelector('[data-kind="shortBreak"]').textContent =
        `☕ Short Break ${timerSettings.shortBreak}m`;

    document.querySelector('[data-kind="longBreak"]').textContent =
        `🌿 Long Break ${timerSettings.longBreak}m`;
}

// Save custom timer settings
saveSettingsBtn.addEventListener("click", function() {
    const study = Number(studyInput.value);
    const shortBreak = Number(shortInput.value);
    const longBreak = Number(longInput.value);

    if (
        !Number.isInteger(study) || study < 1 || study > 180 ||
        !Number.isInteger(shortBreak) || shortBreak < 1 || shortBreak > 60 ||
        !Number.isInteger(longBreak) || longBreak < 1 || longBreak > 60
    ) {
        alert("Enter valid whole minutes. Study: 1–180, Breaks: 1–60.");
        return;
    }

    timerSettings = {
        study,
        shortBreak,
        longBreak
    };

    localStorage.setItem(
        "myStudyTimerSettings",
        JSON.stringify(timerSettings)
    );

    if (!timerInterval) {
        selectedMinutes = timerSettings[activeKind];
        remainingSeconds = selectedMinutes * 60;
        updateTimerDisplay();
    }

    loadTimerSettings();

    timerMessage.textContent = "✅ Timer settings saved!";
});

// ======================================
// 15. INITIAL PAGE LOAD
// ======================================

loadTimerSettings();
updateTimerDisplay();

// ======================================
// 16. SCROLL REVEAL ANIMATION
// ======================================

const revealElements = document.querySelectorAll(
    ".welcome, .stat-card, .progress-section, .panel"
);

revealElements.forEach(function(element) {
    element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
        function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    revealElements.forEach(function(element) {
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach(function(element) {
        element.classList.add("visible");
    });
}

// ======================================
// 17. RIPPLE BUTTON EFFECT
// ======================================

document.addEventListener("click", function(event) {
    const button = event.target.closest("button");

    if (!button || button.disabled) return;

    const rect = button.getBoundingClientRect();

    const ripple = document.createElement("span");

    const size = Math.max(rect.width, rect.height);

    ripple.className = "ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";

    ripple.style.left =
        (event.clientX - rect.left - size / 2) + "px";

    ripple.style.top =
        (event.clientY - rect.top - size / 2) + "px";

    const oldPosition = getComputedStyle(button).position;

    if (oldPosition === "static") {
        button.style.position = "relative";
    }

    button.style.overflow = "hidden";
    button.appendChild(ripple);

    ripple.addEventListener("animationend", function() {
        ripple.remove();
    });
});

// ======================================
// 18. LOGIN & REGISTRATION
// ======================================

const authSection = document.getElementById("authSection");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("authMessage");
const authSwitch = document.getElementById("authSwitch");
const showRegister = document.getElementById("showRegister");

function showLogin() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    authTitle.textContent = "Welcome Back!";
    authSubtitle.textContent = "Login to continue your study journey.";

    authSwitch.innerHTML =
        `Don't have an account? <button type="button" id="showRegister">Register</button>`;

    document.getElementById("showRegister")
        .addEventListener("click", showRegisterForm);

    authMessage.textContent = "";
}

function showRegisterForm() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    authTitle.textContent = "Create Account";
    authSubtitle.textContent = "Join MyStudy Planner today.";

    authSwitch.innerHTML =
        `Already have an account? <button type="button" id="showLogin">Login</button>`;

    document.getElementById("showLogin")
        .addEventListener("click", showLogin);

    authMessage.textContent = "";
}

showRegister.addEventListener("click", showRegisterForm);

// REGISTER
registerForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const full_name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    authMessage.textContent = "Creating your account...";

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ full_name, email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Registration failed");
        }

        registerForm.reset();
        showLogin();
        authMessage.textContent = "Account created successfully! Please login.";
        authMessage.style.color = "green";

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = "#d64545";
    }
});

// LOGIN
loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    authMessage.textContent = "Logging in...";

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.token) {
            throw new Error(data.message || "Login failed");
        }

        localStorage.setItem("myStudyToken", data.token);
        localStorage.setItem("myStudyUser", JSON.stringify(data.user));

        await loadTasksFromBackend();
await loadUserProfile();
        authSection.classList.add("hidden");
        document.querySelector(".container").classList.remove("dashboard-locked");
        logoutBtn.classList.remove("hidden");

        alert("Login successful! Welcome to MyStudy Planner.");

    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = "#d64545";
    }
});

// ======================================
// 19. LOGOUT FUNCTIONALITY
// ======================================

const logoutBtn = document.getElementById("logoutBtn");

function showAuthScreen() {
    document.querySelector(".container").classList.add("dashboard-locked");
    authSection.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    tasks = [];

    renderTasks();
    renderCalendar();
    showLogin();
}

logoutBtn.addEventListener("click", function() {
    if (!confirm("Are you sure you want to logout?")) return;

    localStorage.removeItem("myStudyToken");
    localStorage.removeItem("myStudyUser");

    showAuthScreen();

    alert("You have logged out successfully.");
});

// Restore the login session after a page refresh.
(async function initializeAuth() {
    if (!getToken()) {
        showAuthScreen();
        return;
    }

    try {
        await loadTasksFromBackend();
        await loadUserProfile();

        authSection.classList.add("hidden");
        document.querySelector(".container").classList.remove("dashboard-locked");
        logoutBtn.classList.remove("hidden");

    } catch (error) {
        console.error("Could not restore login session:", error);
        showAuthScreen();
    }
})();
// ======================================
// UPCOMING TASKS DASHBOARD
// ======================================

function renderUpcomingTasks() {
    const overdueList = document.getElementById("overdueTasksList");
    const todayList = document.getElementById("todayTasksList");
    const nextList = document.getElementById("nextTasksList");

    if (!overdueList || !todayList || !nextList) return;

    overdueList.innerHTML = "";
    todayList.innerHTML = "";
    nextList.innerHTML = "";

    const todayDate = new Date(localToday + "T00:00:00");

    const overdueTasks = tasks.filter(task =>
        !task.completed && task.dueDate < localToday
    );

    const todayTasks = tasks.filter(task =>
        !task.completed && task.dueDate === localToday
    );

    const nextTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate + "T00:00:00");
        const daysLeft = Math.round(
            (taskDate - todayDate) / (1000 * 60 * 60 * 24)
        );

        return !task.completed && daysLeft > 0 && daysLeft <= 7;
    });

    function addTaskItem(container, task) {
        const item = document.createElement("div");
        item.className = "upcoming-task-item";

        const title = document.createElement("strong");
        title.textContent = task.title;

        const subjectText = document.createElement("small");
        subjectText.textContent = task.subject;

        const dateText = document.createElement("small");
        dateText.textContent = "Due: " + task.dueDate;

        item.appendChild(title);
        item.appendChild(subjectText);
        item.appendChild(dateText);

        container.appendChild(item);
    }

    function showEmpty(container, message) {
        const text = document.createElement("p");
        text.className = "upcoming-empty";
        text.textContent = message;
        container.appendChild(text);
    }

    if (overdueTasks.length) {
        overdueTasks.forEach(task => addTaskItem(overdueList, task));
    } else {
        showEmpty(overdueList, "No overdue tasks 🎉");
    }

    if (todayTasks.length) {
        todayTasks.forEach(task => addTaskItem(todayList, task));
    } else {
        showEmpty(todayList, "No tasks for today.");
    }

    if (nextTasks.length) {
        nextTasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        nextTasks.forEach(task => addTaskItem(nextList, task));
    } else {
        showEmpty(nextList, "No upcoming tasks.");
    }
}
// ======================================
// LOAD USER PROFILE FROM BACKEND
// ======================================

async function loadUserProfile() {
    try {
        const response = await apiRequest("/auth/profile");

        const user =
            response.user ||
            response.data?.user ||
            response.data ||
            response;

        const nameElement = document.getElementById("profileName");
        const emailElement = document.getElementById("profileEmail");

        if (!nameElement || !emailElement) {
            console.error("Profile HTML elements not found!");
            return;
        }

        nameElement.textContent =
            user.full_name || user.name || "Student";

        emailElement.textContent =
            user.email || "Email not available";

    } catch (error) {
        console.error("Profile loading failed:", error);
    }
}