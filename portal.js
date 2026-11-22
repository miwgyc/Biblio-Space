
// ==========================================
// BIBLIO-SPACE - PORTAL JAVASCRIPT
// ==========================================

// STORAGE KEYS
const BOOKING_KEY = "biblioSpaceBookings";
const USER_KEY = "biblioSpaceUser";
const ROOM_KEY = "biblioSpaceRooms";
const REGISTERED_USER_KEY = "biblioSpaceRegisteredUsers";

// DEFAULT ROOMS
const defaultRooms = [
    { id: 1, name: "Discussion Room 1", capacity: 6, type: "Discussion Room", status: "Available" },
    { id: 2, name: "Discussion Room 2", capacity: 8, type: "Discussion Room", status: "Available" },
    { id: 3, name: "Discussion Room 3", capacity: 4, type: "Study Room", status: "Available" },
    { id: 4, name: "Presentation Lab A", capacity: 20, type: "Presentation Lab", status: "Available" }
];

// ==========================================
// STORAGE FUNCTIONS
// ==========================================

function getBookings() {
    try {
        const bookings = JSON.parse(localStorage.getItem(BOOKING_KEY) || "[]");
        return Array.isArray(bookings) ? bookings : [];
    } catch (error) {
        return [];
    }
}

function saveBookings(bookings) {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
}

function getRooms() {
    try {
        let rooms = JSON.parse(localStorage.getItem(ROOM_KEY) || "null");

        if (!Array.isArray(rooms)) {
            rooms = defaultRooms;
            saveRooms(rooms);
        }

        return rooms;
    } catch (error) {
        saveRooms(defaultRooms);
        return defaultRooms;
    }
}

function saveRooms(rooms) {
    localStorage.setItem(ROOM_KEY, JSON.stringify(rooms));
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch (error) {
        return null;
    }
}

// GET BOOKINGS BELONGING TO CURRENT STUDENT
function getStudentBookings() {
    const user = getUser();

    if (!user || !user.email) return [];

    const email = String(user.email).trim().toLowerCase();

    return getBookings().filter(function (booking) {
        return String(booking.studentEmail || "").trim().toLowerCase() === email;
    });
}

// ==========================================
// GENERAL HELPERS
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char];
    });
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonday(date = new Date()) {
    const result = new Date(date);
    const day = result.getDay();

    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
    result.setHours(0, 0, 0, 0);

    return result;
}

// CALCULATE WEEKLY HOURS
function getWeeklyHours(bookings) {
    const monday = getMonday();

    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    return bookings.reduce(function (total, booking) {
        const bookingDate = new Date(booking.date + "T00:00:00");

        if (bookingDate >= monday && bookingDate < nextMonday) {
            return total + Number(booking.duration || 1);
        }

        return total;
    }, 0);
}

function formatDate(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// ==========================================
// LOGIN
// ==========================================

function loginHandler() {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const role = document.getElementById("role").value.trim().toLowerCase();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;
        const error = document.getElementById("loginError");

        let matchedUser = null;

        // DEMO STUDENT
        if (
            role === "student" &&
            email === "student@bibliospace.com" &&
            password === "student123"
        ) {
            matchedUser = {
                name: "Student",
                email: email,
                studentId: "",
                role: "student"
            };
        }

        // DEMO LIBRARIAN
        else if (
            role === "librarian" &&
            email === "librarian@bibliospace.com" &&
            password === "librarian123"
        ) {
            matchedUser = {
                name: "Librarian",
                email: email,
                studentId: "",
                role: "librarian"
            };
        }

        // REGISTERED STUDENT
        else if (role === "student") {
            try {
                const registeredUsers = JSON.parse(
                    localStorage.getItem(REGISTERED_USER_KEY) || "[]"
                );

                if (Array.isArray(registeredUsers)) {
                    matchedUser = registeredUsers.find(function (user) {
                        const savedEmail = String(user.email || "").trim().toLowerCase();
                        const savedPassword = String(user.password || "");
                        const savedRole = String(user.role || "").trim().toLowerCase();

                        return (
                            savedEmail === email &&
                            savedPassword === password &&
                            savedRole === "student"
                        );
                    }) || null;
                }
            } catch (exception) {
                console.error("Registration account reading error:", exception);
            }
        }

        if (!matchedUser) {
            if (error) {
                error.textContent = "Incorrect email, password or account role.";
            }
            return;
        }

        const userSession = {
            name: matchedUser.name || "Student",
            email: email,
            role: matchedUser.role,
            studentId: matchedUser.studentId || ""
        };

        try {
            localStorage.setItem(USER_KEY, JSON.stringify(userSession));

            const savedSession = JSON.parse(localStorage.getItem(USER_KEY));

            if (!savedSession || savedSession.email !== email) {
                throw new Error("Login session could not be saved.");
            }
        } catch (exception) {
            console.error("Login session error:", exception);

            if (error) {
                error.textContent = "Unable to save login session. Please try again.";
            }
            return;
        }

        if (error) error.textContent = "";

        if (matchedUser.role === "student") {
            window.location.href = "student-dashboard.html";
        } else {
            window.location.href = "librarian-dashboard.html";
        }
    });
}

// ==========================================
// PAGE ACCESS
// ==========================================

function checkPageAccess() {
    const page = document.body.dataset.page;
    const user = getUser();

    if (page === "login" || page === "register") {
        if (user && user.role === "student") {
            window.location.replace("student-dashboard.html");
            return;
        }

        if (user && user.role === "librarian") {
            window.location.replace("librarian-dashboard.html");
            return;
        }

        return;
    }

    if (!page) return;

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    const studentPages = [
        "student",
        "booking",
        "confirmation",
        "my-bookings"
    ];

    const librarianPages = [
        "librarian",
        "daily-schedule",
        "manage-rooms"
    ];

    if (librarianPages.includes(page) && user.role !== "librarian") {
        window.location.replace("student-dashboard.html");
        return;
    }

    if (studentPages.includes(page) && user.role !== "student") {
        window.location.replace("librarian-dashboard.html");
        return;
    }
}

// ==========================================
// LOGOUT
// ==========================================

function logoutHandler() {
    document.querySelectorAll("[data-logout]").forEach(function (button) {
        button.addEventListener("click", function () {
            const confirmLogout = confirm("Are you sure you want to log out?");

            if (!confirmLogout) return;

            localStorage.removeItem(USER_KEY);
            window.location.replace("login.html");
        });
    });
}

// ==========================================
// STUDENT DASHBOARD
// ==========================================

function renderStudentDashboard() {
    const name = document.getElementById("studentName");

    if (!name) return;

    const user = getUser();
    const bookings = getStudentBookings();
    const hours = getWeeklyHours(bookings);

    name.textContent = user ? user.name : "Student";

    const bookingCount = document.getElementById("studentBookingCount");
    const studentHours = document.getElementById("studentHours");
    const remainingHours = document.getElementById("remainingHours");

    if (bookingCount) bookingCount.textContent = bookings.length;
    if (studentHours) studentHours.textContent = hours;
    if (remainingHours) remainingHours.textContent = Math.max(0, 6 - hours);

    const roomList = document.getElementById("studentRoomList");
    const rooms = getRooms();

    if (!roomList) return;

    roomList.innerHTML = rooms.map(function (room) {
        const available = room.status === "Available";

        return `
            <article class="bs-room-card">
                <div class="bs-room-image">
                    <span>${escapeHTML(room.type)}</span>
                </div>

                <div class="bs-room-content">
                    <span class="bs-status ${available ? "available" : "maintenance"}">
                        ${escapeHTML(room.status)}
                    </span>

                    <h3>${escapeHTML(room.name)}</h3>
                    <p>Capacity: ${room.capacity} people</p>

                    ${
                        available
                        ? `<a href="booking.html" class="bs-text-link">Book this room →</a>`
                        : `<span class="bs-text-link">Currently unavailable</span>`
                    }
                </div>
            </article>
        `;
    }).join("");
}

// ==========================================
// MY BOOKINGS PAGE
// ==========================================

function renderMyBookings() {
    const container = document.getElementById("myBookingsList");

    if (!container) return;

    const bookings = getStudentBookings();

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="bs-empty">
                <h3>No bookings yet</h3>
                <p>You have not made any room reservations.</p>
                <a href="booking.html" class="bs-button">Book a Room</a>
            </div>
        `;
        return;
    }

    container.innerHTML = bookings.map(function (booking) {
        return `
            <article class="bs-booking-card">
                <div>
                    <span class="bs-eyebrow">BOOKING REFERENCE</span>
                    <h3>${escapeHTML(booking.id)}</h3>

                    <p><strong>Room:</strong> ${escapeHTML(booking.room)}</p>
                    <p><strong>Date:</strong> ${formatDate(booking.date)}</p>
                    <p><strong>Time:</strong> ${escapeHTML(booking.time)}</p>
                    <p><strong>Duration:</strong> ${Number(booking.duration || 1)} hour(s)</p>
                </div>

                <button class="bs-cancel-button" data-cancel="${escapeHTML(booking.id)}">
                    Cancel Booking
                </button>
            </article>
        `;
    }).join("");

    container.querySelectorAll("[data-cancel]").forEach(function (button) {
        button.addEventListener("click", function () {
            const id = button.dataset.cancel;
            const user = getUser();

            if (!user || !user.email) return;

            if (!confirm("Are you sure you want to cancel this booking?")) {
                return;
            }

            const email = String(user.email).trim().toLowerCase();

            const updated = getBookings().filter(function (booking) {
                const belongsToCurrentStudent =
                    String(booking.studentEmail || "").trim().toLowerCase() === email;

                const isSelectedBooking =
                    String(booking.id) === String(id);

                return !(belongsToCurrentStudent && isSelectedBooking);
            });

            saveBookings(updated);
            renderMyBookings();
        });
    });
}

// ==========================================
// LIBRARIAN DASHBOARD
// ==========================================

function renderLibrarianDashboard() {
    const name = document.getElementById("librarianName");

    if (!name) return;

    const user = getUser();
    const bookings = getBookings();
    const rooms = getRooms();

    name.textContent = user ? user.name : "Librarian";

    const available = rooms.filter(room => room.status === "Available").length;
    const maintenance = rooms.filter(room => room.status === "Maintenance").length;

    const bookingCount = document.getElementById("librarianBookingCount");
    const availableCount = document.getElementById("availableRoomCount");
    const maintenanceCount = document.getElementById("maintenanceRoomCount");

    if (bookingCount) bookingCount.textContent = bookings.length;
    if (availableCount) availableCount.textContent = available;
    if (maintenanceCount) maintenanceCount.textContent = maintenance;

    const container = document.getElementById("roomUtilisationList");

    if (!container) return;

    container.innerHTML = rooms.map(function (room) {
        const count = bookings.filter(function (booking) {
            return booking.room === room.name;
        }).length;

        const percentage = bookings.length
            ? Math.round((count / bookings.length) * 100)
            : 0;

        return `
            <div class="bs-utilisation-item">
                <div class="bs-utilisation-heading">
                    <strong>${escapeHTML(room.name)}</strong>
                    <span>${percentage}%</span>
                </div>

                <div class="bs-progress">
                    <div style="width:${percentage}%"></div>
                </div>

                <p>${count} recorded booking(s)</p>
            </div>
        `;
    }).join("");
}

// ==========================================
// DAILY SCHEDULE
// ==========================================

function renderDailySchedule() {
    const container = document.getElementById("dailyScheduleList");

    if (!container) return;

    const dateInput = document.getElementById("scheduleDate");

    if (!dateInput) return;

    if (!dateInput.value) {
        dateInput.value = localDateString();
    }

    function displaySchedule() {
        const selectedDate = dateInput.value;

        // LIBRARIAN CAN SEE ALL STUDENTS' BOOKINGS
        const bookings = getBookings().filter(function (booking) {
            return booking.date === selectedDate;
        });

        const countElement = document.getElementById("scheduleCount");

        if (countElement) {
            countElement.textContent = bookings.length + " booking(s)";
        }

        if (bookings.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="bs-empty">
                        No reservations found for this date.
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = bookings.map(function (booking) {
            return `
                <tr>
                    <td>${escapeHTML(booking.id || "-")}</td>
                    <td>${escapeHTML(booking.studentName || "-")}</td>
                    <td>${escapeHTML(booking.studentId || "-")}</td>
                    <td>${escapeHTML(booking.studentEmail || "-")}</td>
                    <td>${escapeHTML(booking.room || "-")}</td>
                    <td>${escapeHTML(booking.time || "-")}</td>
                    <td>${Number(booking.duration || 1)} hour(s)</td>
                    <td>
                        <span class="bs-status available">Booked</span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    dateInput.addEventListener("change", displaySchedule);

    displaySchedule();
}

// ==========================================
// MANAGE ROOMS
// ==========================================

function renderManageRooms() {
    const container = document.getElementById("manageRoomList");

    if (!container) return;

    function displayRooms() {
        const rooms = getRooms();

        container.innerHTML = rooms.map(function (room) {
            return `
                <div class="bs-manage-room">
                    <div>
                        <h3>${escapeHTML(room.name)}</h3>

                        <p>
                            ${escapeHTML(room.type)}
                            · Capacity: ${room.capacity}
                        </p>

                        <span class="bs-status ${
                            room.status === "Available" ? "available" : "maintenance"
                        }">
                            ${escapeHTML(room.status)}
                        </span>
                    </div>

                    <div class="bs-room-actions">
                        <label for="room-${room.id}">Update status</label>

                        <select id="room-${room.id}" data-room-id="${room.id}">
                            <option value="Available" ${room.status === "Available" ? "selected" : ""}>
                                Available
                            </option>

                            <option value="Maintenance" ${room.status === "Maintenance" ? "selected" : ""}>
                                Maintenance
                            </option>
                        </select>
                    </div>
                </div>
            `;
        }).join("");

        container.querySelectorAll("[data-room-id]").forEach(function (select) {
            select.addEventListener("change", function () {
                const id = Number(select.dataset.roomId);

                const updatedRooms = getRooms().map(function (room) {
                    if (room.id === id) {
                        return { ...room, status: select.value };
                    }

                    return room;
                });

                saveRooms(updatedRooms);
                displayRooms();
            });
        });
    }

    displayRooms();
}

// ==========================================
// INITIALISE
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    checkPageAccess();

    loginHandler();
    logoutHandler();

    renderStudentDashboard();
    renderMyBookings();

    renderLibrarianDashboard();
    renderDailySchedule();
    renderManageRooms();
});
