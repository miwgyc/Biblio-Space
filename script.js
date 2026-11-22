
(() => {
    "use strict";

    const STORAGE_KEY = "biblioSpaceBookings";
    const USER_KEY = "biblioSpaceUser";
    const LATEST_KEY = "biblioSpaceLatestBooking";
    const WEEKLY_LIMIT = 6;

    const TIMES = [
        "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00",
        "15:00", "16:00", "17:00"
    ];

    // GET CURRENT LOGGED-IN STUDENT
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    // GET CURRENT STUDENT'S EMAIL
    function getStudentEmail() {
        const user = getCurrentUser();

        return String(user?.email || "").trim().toLowerCase();
    }

    // GET CURRENT STUDENT'S BOOKINGS ONLY
    function getMyBookings(bookings) {
        const email = getStudentEmail();

        if (!email) return [];

        return bookings.filter(item =>
            String(item.studentEmail || "").trim().toLowerCase() === email
        );
    }

    // SEPARATE LATEST BOOKING KEY FOR EACH STUDENT
    function getLatestKey() {
        return LATEST_KEY + "_" + encodeURIComponent(getStudentEmail());
    }

    // LOCAL DATE
    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // MONDAY START OF WEEK
    function getWeekStart(dateString) {
        const date = new Date(dateString + "T00:00:00");
        const day = date.getDay();

        const difference = day === 0 ? -6 : 1 - day;

        date.setDate(date.getDate() + difference);

        return getLocalDateString(date);
    }

    // LOAD ALL BOOKINGS
    function loadBookings() {
        try {
            const parsed = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Could not read saved bookings:", error);
            return [];
        }
    }

    // SAVE ALL BOOKINGS
    function saveBookings(bookings) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(bookings)
            );

            return true;
        } catch (error) {
            console.error("Could not save bookings:", error);

            alert(
                "Your browser could not save this booking. Please check browser storage."
            );

            return false;
        }
    }

    // FORMAT DATE
    function formatDate(dateString) {
        return new Date(dateString + "T00:00:00")
            .toLocaleDateString("en-MY", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
    }

    // FORMAT TIME
    function formatTime(time) {
        const [hours, minutes] = time.split(":").map(Number);

        return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
    }

    // CALCULATE CURRENT STUDENT'S WEEKLY HOURS
    function usedHours(bookings, dateString) {
        const start = getWeekStart(dateString);

        const endDate = new Date(start + "T00:00:00");
        endDate.setDate(endDate.getDate() + 7);

        const end = getLocalDateString(endDate);

        return getMyBookings(bookings)
            .filter(item => item.date >= start && item.date < end)
            .reduce((sum, item) => {
                return sum + Number(item.duration || 1);
            }, 0);
    }

    // CHECK PAST TIME
    function isPastSlot(date, time) {
        return new Date(`${date}T${time}:00`) <= new Date();
    }

    // DISPLAY MESSAGE
    function showNotice(message, type = "success") {
        const notice = document.getElementById("message");

        if (!notice) return;

        notice.textContent = message;
        notice.className = `notice ${type}`;

        notice.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    // ==========================================
    // BOOKING PAGE
    // ==========================================

    function initBookingPage() {
        const dateInput = document.getElementById("bookingDate");

        if (!dateInput) return;

        const user = getCurrentUser();

        if (!user || user.role !== "student") {
            window.location.replace("login.html");
            return;
        }

        const studentEmail = getStudentEmail();

        if (!studentEmail) {
            showNotice("Unable to identify your student account. Please log in again.", "error");
            return;
        }

        let bookings = loadBookings();
        let selectedRoom = "Room 1";
        let selectedTime = null;

        const slotsElement = document.getElementById("timeSlots");
        const confirmButton = document.getElementById("confirmButton");

        if (!slotsElement || !confirmButton) return;

        dateInput.min = getLocalDateString();
        dateInput.value = getLocalDateString();

        // CHECK ROOM AVAILABILITY ACROSS ALL STUDENTS
        function slotAlreadyTaken(room, date, time) {
            return bookings.some(item =>
                item.room === room &&
                item.date === date &&
                item.time === time
            );
        }

        // UPDATE SUMMARY USING CURRENT STUDENT'S QUOTA
        function updateSummary() {
            const date = dateInput.value;
            const hours = usedHours(bookings, date);
            const remaining = Math.max(0, WEEKLY_LIMIT - hours);

            document.getElementById("summaryDate").textContent =
                date ? formatDate(date) : "Choose a date";

            document.getElementById("summaryRoom").textContent =
                selectedRoom;

            document.getElementById("summaryTime").textContent =
                selectedTime ? formatTime(selectedTime) : "Choose a time";

            document.getElementById("usedHours").textContent = hours;

            document.getElementById("quotaProgress").style.width =
                `${Math.min(100, hours / WEEKLY_LIMIT * 100)}%`;

            document.getElementById("quotaMessage").textContent =
                remaining
                    ? `${remaining} hour(s) available this week.`
                    : "Weekly booking limit reached.";

            confirmButton.disabled =
                !selectedTime || hours >= WEEKLY_LIMIT;
        }

        // DISPLAY AVAILABLE TIME SLOTS
        function renderSlots() {
            slotsElement.innerHTML = "";

            const date = dateInput.value;

            TIMES.forEach(time => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "time-slot";
                button.textContent = formatTime(time);

                const taken = slotAlreadyTaken(
                    selectedRoom,
                    date,
                    time
                );

                const past = isPastSlot(date, time);

                if (taken || past) {
                    button.disabled = true;
                    button.classList.add("slot-unavailable");

                    button.title = taken
                        ? "Already booked"
                        : "This time has passed";

                } else {
                    button.classList.add("slot-available");

                    if (selectedTime === time) {
                        button.classList.add("slot-selected");
                    }

                    button.addEventListener("click", () => {
                        selectedTime = time;

                        renderSlots();
                        updateSummary();
                    });
                }

                slotsElement.appendChild(button);
            });

            updateSummary();
        }

        // SELECT ROOM
        document.querySelectorAll(".room-option").forEach(button => {
            button.addEventListener("click", () => {
                selectedRoom = button.dataset.room;
                selectedTime = null;

                document.querySelectorAll(".room-option")
                    .forEach(option => {
                        option.classList.remove("selected");
                    });

                button.classList.add("selected");

                renderSlots();
            });
        });

        // CHANGE DATE
        dateInput.addEventListener("change", () => {
            if (dateInput.value < getLocalDateString()) {
                dateInput.value = getLocalDateString();
            }

            selectedTime = null;
            renderSlots();
        });

        // CONFIRM BOOKING
        confirmButton.addEventListener("click", () => {
            const date = dateInput.value;

            if (!date || !selectedTime) {
                showNotice(
                    "Please choose a date and time before confirming.",
                    "error"
                );
                return;
            }

            if (
                date < getLocalDateString() ||
                isPastSlot(date, selectedTime)
            ) {
                selectedTime = null;
                renderSlots();

                showNotice(
                    "That date or time has already passed. Please choose another slot.",
                    "error"
                );
                return;
            }

            // REFRESH BOOKINGS BEFORE CHECKING AVAILABILITY
            bookings = loadBookings();

            if (slotAlreadyTaken(selectedRoom, date, selectedTime)) {
                selectedTime = null;
                renderSlots();

                showNotice(
                    "That slot has just been booked. Please choose another time.",
                    "error"
                );
                return;
            }

            if (usedHours(bookings, date) >= WEEKLY_LIMIT) {
                showNotice(
                    "You have reached the six-hour weekly booking limit.",
                    "error"
                );
                return;
            }

            const currentUser = getCurrentUser();

            if (
                !currentUser ||
                String(currentUser.email || "").trim().toLowerCase() !== studentEmail
            ) {
                showNotice(
                    "Your login session has changed. Please log in again.",
                    "error"
                );
                return;
            }

            // SAVE BOOKING WITH STUDENT OWNERSHIP
            const booking = {
                id: `BS-${Date.now().toString().slice(-8)}`,
                room: selectedRoom,
                date: date,
                time: selectedTime,
                duration: 1,

                studentName: currentUser.name || "Student",
                studentEmail: studentEmail,
                studentId: currentUser.studentId || "",

                createdAt: new Date().toISOString()
            };

            bookings.push(booking);

            if (!saveBookings(bookings)) {
                bookings.pop();
                return;
            }

            // SAVE LATEST BOOKING FOR THIS STUDENT ONLY
            localStorage.setItem(getLatestKey(), booking.id);

            window.location.href = "confirmation.html";
        });

        // DISPLAY ONLY THIS STUDENT'S BOOKINGS
        function renderMyBookings() {
            const list = document.getElementById("myBookings");
            const count = document.getElementById("bookingCount");

            if (!list || !count) return;

            const myBookings = getMyBookings(bookings);

            const sorted = [...myBookings].sort((a, b) => {
                return (a.date + a.time).localeCompare(b.date + b.time);
            });

            count.textContent =
                `${sorted.length} booking${sorted.length === 1 ? "" : "s"}`;

            list.innerHTML = "";

            if (!sorted.length) {
                list.innerHTML = `
                    <div class="empty-bookings">
                        <span>✳</span>
                        <strong>No reservations just yet.</strong>
                        <p>Your confirmed bookings will appear here.</p>
                    </div>
                `;
                return;
            }

            sorted.forEach(booking => {
                const item = document.createElement("article");
                item.className = "booking-list-item";

                const info = document.createElement("div");
                info.className = "booking-list-info";

                const title = document.createElement("strong");
                title.textContent = booking.room;

                const date = document.createElement("span");
                date.textContent = formatDate(booking.date);

                const time = document.createElement("span");
                time.textContent =
                    `${formatTime(booking.time)} · 1 hour · Ref ${booking.id}`;

                info.append(title, date, time);

                const cancel = document.createElement("button");

                cancel.type = "button";
                cancel.className = "cancel-booking";
                cancel.textContent = "Cancel booking";

                cancel.addEventListener("click", () => {
                    const confirmed = window.confirm(
                        `Cancel your booking for ${booking.room} on ${formatDate(booking.date)}?`
                    );

                    if (!confirmed) return;

                    // CHECK OWNERSHIP AGAIN BEFORE CANCELLING
                    const latestBookings = loadBookings();

                    const target = latestBookings.find(entry =>
                        String(entry.id) === String(booking.id) &&
                        String(entry.studentEmail || "").trim().toLowerCase() === studentEmail
                    );

                    if (!target) {
                        showNotice("This booking does not belong to your account.", "error");
                        return;
                    }

                    const updated = latestBookings.filter(entry =>
                        String(entry.id) !== String(booking.id)
                    );

                    if (!saveBookings(updated)) return;

                    bookings = updated;

                    renderMyBookings();
                    renderSlots();

                    showNotice("Your booking has been cancelled.");
                });

                item.append(info, cancel);
                list.appendChild(item);
            });
        }

        renderSlots();
        renderMyBookings();
    }

    // ==========================================
    // CONFIRMATION PAGE
    // ==========================================

    function initConfirmationPage() {
        const reference = document.getElementById("bookingReference");

        if (!reference) return;

        const user = getCurrentUser();

        if (!user || user.role !== "student") {
            window.location.replace("login.html");
            return;
        }

        const studentEmail = getStudentEmail();
        const bookings = loadBookings();
        const latestId = localStorage.getItem(getLatestKey());

        // FIND ONLY A BOOKING BELONGING TO THIS STUDENT
        const booking = bookings.find(item =>
            String(item.id) === String(latestId) &&
            String(item.studentEmail || "").trim().toLowerCase() === studentEmail
        );

        if (!booking) {
            document.querySelector(".confirmation-top h1").innerHTML =
                "No booking <em>found.</em>";

            document.querySelector(
                ".confirmation-top > p:not(.eyebrow)"
            ).textContent =
                "We couldn't find a recent reservation for your account. You can return to the booking page to make a reservation.";

            document.getElementById("confirmationDetails").innerHTML = `
                <div class="empty-bookings">
                    <strong>No reservation details available.</strong>
                    <p>Please create a booking first.</p>
                    <a class="button button-burgundy" href="booking.html">
                        Go to booking
                    </a>
                </div>
            `;
            return;
        }

        reference.textContent = booking.id;

        document.getElementById("confirmedRoom").textContent =
            booking.room;

        document.getElementById("confirmedDate").textContent =
            formatDate(booking.date);

        const endHour = Number(booking.time.slice(0, 2)) + 1;
        const endTime = `${String(endHour).padStart(2, "0")}:00`;

        document.getElementById("confirmedTime").textContent =
            `${formatTime(booking.time)} – ${formatTime(endTime)}`;

        document.getElementById("confirmedDuration").textContent =
            `${booking.duration || 1} hour`;
    }

    // INITIALISE
    initBookingPage();
    initConfirmationPage();

})();
