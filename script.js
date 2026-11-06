
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
// 2. LOCAL STORAGE
// ======================================

function loadTasks() {
    try {
        const saved = JSON.parse(
            localStorage.getItem("myStudyTasks")
        );

        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Could not load tasks:", error);
        return [];
    }
}

let tasks = loadTasks();
let editingId = null;

function saveTasks() {
    localStorage.setItem(
        "myStudyTasks",
        JSON.stringify(tasks)
    );
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

taskForm.addEventListener("submit", function(event) {
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

    if (editingId !== null) {
        tasks = tasks.map(function(task) {
            if (task.id === editingId) {
                return {
                    ...task,
                    title: title,
                    subject: taskSubject,
                    dueDate: date,
                    priority: taskPriority
                };
            }

            return task;
        });
    } else {
        const newTask = {
            id: Date.now().toString(),
            title: title,
            subject: taskSubject,
            dueDate: date,
            priority: taskPriority,
            completed: false
        };

        tasks.push(newTask);
    }

    saveTasks();
    resetForm();
    renderTasks();
    renderCalendar();
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
    const task = tasks.find(task => task.id === id);

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

function toggleTask(id) {
    tasks = tasks.map(function(task) {
        if (task.id === id) {
            return {
                ...task,
                completed: !task.completed
            };
        }

        return task;
    });

    saveTasks();
    renderTasks();
    renderCalendar();
}

// ======================================
// 8. DELETE TASK
// ======================================

function deleteTask(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    tasks = tasks.filter(task => task.id !== id);

    if (editingId === id) {
        resetForm();
    }

    saveTasks();
    renderTasks();
    renderCalendar();
}

// ======================================
// 9. SEARCH AND SUBJECT FILTER
// ======================================

function updateSubjectOptions() {
    const currentValue = subjectFilter.value;

    const subjects = [...new Set(
        tasks.map(task => task.subject)
    )].sort();

    subjectFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Subjects";
    subjectFilter.appendChild(allOption);

    subjects.forEach(function(name) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        subjectFilter.appendChild(option);
    });

    if (subjects.includes(currentValue)) {
        subjectFilter.value = currentValue;
    } else {
        subjectFilter.value = "all";
    }
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

        const statusBadge = document.createElement("span");
        statusBadge.className = "badge";
        statusBadge.textContent = task.completed
            ? "Completed"
            : "Pending";

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

    stopTimer();

    selectedMinutes = timerSettings[activeKind];
    remainingSeconds = selectedMinutes * 60;

    loadTimerSettings();
    updateTimerDisplay();

    timerMessage.textContent = "✅ Your timer settings have been saved!";
});

// ======================================
// 15. INITIAL PAGE LOAD
// ======================================

renderTasks();
renderCalendar();
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
