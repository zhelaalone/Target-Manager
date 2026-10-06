// ================================
// FIREBASE SETUP & STATE MANAGEMENT
// ================================
const firebaseConfig = {
    apiKey: "AIzaSyDahgl-hfNXQAtzwoEqcuOnY_r1_ahrMkQ",
    authDomain: "laskdjfal.firebaseapp.com",
    projectId: "laskdjfal",
    storageBucket: "laskdjfal.firebasestorage.app",
    messagingSenderId: "554093192431",
    appId: "1:554093192431:web:03660e4de40fbff760271a"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Konstanta umum
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// State awal dikosongkan
let agendas = [];
let countdowns = [];
let currentAgendaId = null;
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let selectedFilterDate = null;

// Variabel memori filter untuk halaman rekap target
let specialSortOrder = 'asc';
let specialFilterDate = '';
let specialFilterStatus = 'all';
let specialFilterPriority = 'all';

// Tarik data dari Firestore saat web dimuat
db.collection("appData").doc("targetManager").get().then((doc) => {
    if (doc.exists) {
        const data = doc.data();
        agendas = data.agendas || [];
        countdowns = data.countdowns || [];
    }
    // Render dashboard HANYA setelah data berhasil dimuat
    renderDashboard();
}).catch(error => {
    console.error("Gagal mengambil data dari Firebase:", error);
    renderDashboard(); // Fallback render jika offline
});


// ================================
// SAVE DATA TO FIREBASE
// ================================
function saveData() {
    db.collection("appData").doc("targetManager").set({
        agendas: agendas,
        countdowns: countdowns
    }).then(() => {
        console.log("Data berhasil disinkronisasi ke Firebase.");
    }).catch((error) => {
        console.error("Error saat menyimpan data: ", error);
    });
}


// ================================
// HELPERS
// ================================
function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
    });
}

// Format Date -> "YYYY-MM-DD" (sesuai format input type="date")
function toDateString(year, monthIndex, day) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function getTodayDateString() {
    const today = new Date();
    return toDateString(today.getFullYear(), today.getMonth(), today.getDate());
}

function getCountdownText(dateString) {
    if (!dateString) return "-";
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((targetDate - today) / MS_PER_DAY);

    if (diffDays === 0) return "Hari Ini!";
    if (diffDays === 1) return "Besok";
    if (diffDays > 1) return `${diffDays} Hari Lagi`;
    if (diffDays < 0) return `Terlewat ${Math.abs(diffDays)} Hari`;
    return "-";
}

// Ubah teks & aksi tombol utama di header
function setHeaderAction(label, handler) {
    const actionBtn = document.querySelector(".header .btn-primary");
    actionBtn.innerText = label;
    actionBtn.onclick = handler;
}

// Ambil semua target (agenda aktif) sesuai tipe halaman + semua filter yang aktif.
// Dipakai bersama oleh tampilan rekap dan export Excel.
function getFilteredTargets(type) {
    let result = [];

    agendas.filter(a => !a.isArchived).forEach(agenda => {
        agenda.targets.forEach(target => {
            const include =
                (type === 'priority' && target.priority && !target.completed) ||
                (type === 'completed' && target.completed) ||
                (type === 'all-targets');

            if (include) {
                result.push({ ...target, agendaName: agenda.name, agendaId: agenda.id });
            }
        });
    });

    // Filter status & prioritas (khusus tab Semua Target)
    if (type === 'all-targets') {
        if (specialFilterStatus === 'completed') result = result.filter(t => t.completed);
        else if (specialFilterStatus === 'pending') result = result.filter(t => !t.completed);

        if (specialFilterPriority === 'priority') result = result.filter(t => t.priority);
        else if (specialFilterPriority === 'normal') result = result.filter(t => !t.priority);
    }

    // Filter tanggal
    if (specialFilterDate) {
        result = result.filter(t => t.deadline === specialFilterDate);
    }

    // Pengurutan
    result.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return specialSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
}


// ================================
// HELPER: UI TARGET HARI INI
// ================================
function generateTodayTargetsHTML(todayTargets) {
    // Jangan tampilkan kotak jika tidak ada target hari ini
    if (todayTargets.length === 0) return "";

    const itemsHTML = todayTargets.map(target => {
        const timeDisplay = target.time ? ` ⏰ ${target.time}` : "";
        return `
            <div class="target-item">
                <div class="target-left">
                    <input type="checkbox" onchange="toggleTarget('${target.agendaId}', '${target.id}', 'dashboard')">
                    <div>
                        <h3>${target.name}</h3>
                        <p>📁 ${target.agendaName}</p>
                    </div>
                </div>
                <div class="target-right">
                    <span class="priority-badge">Hari Ini${timeDisplay}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:16px; padding:1.2rem 1.5rem; margin-bottom:1.5rem;">
            <h3 style="color:#166534; margin-bottom:1rem;">🎯 Fokus Hari Ini: ${todayTargets.length} Target</h3>
            <div style="display:flex; flex-direction:column; gap:0.8rem;">${itemsHTML}</div>
        </div>
    `;
}


// ================================
// HALAMAN DASHBOARD
// ================================
function renderDashboard() {
    document.getElementById("pageTitle").innerText = "Dashboard";
    document.getElementById("pageSubtitle").innerText = "Ringkasan progress target dan agenda Anda.";

    const content = document.getElementById("content");
    content.style.display = "block";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = getTodayDateString();

    const overdueTargets = [];
    const todayTargets = [];
    let totalTargets = 0;
    let completedCount = 0;

    const activeAgendas = agendas.filter(a => !a.isArchived);

    activeAgendas.forEach(agenda => {
        agenda.targets.forEach(target => {
            totalTargets++;
            if (target.completed) completedCount++;

            if (!target.completed && target.deadline) {
                const deadlineDate = new Date(target.deadline);
                deadlineDate.setHours(0, 0, 0, 0);

                // Target terlewat (overdue)
                if (deadlineDate < today) {
                    overdueTargets.push({ ...target, agendaName: agenda.name, agendaId: agenda.id });
                }

                // Target hari ini
                if (target.deadline === todayString) {
                    todayTargets.push({ ...target, agendaName: agenda.name, agendaId: agenda.id });
                }
            }
        });
    });

    // Overdue diurutkan berdasarkan tanggal, target hari ini berdasarkan jam
    overdueTargets.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    todayTargets.sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"));

    let overdueHTML = "";
    if (overdueTargets.length > 0) {
        const overdueItemsHTML = overdueTargets.map(target => {
            const timeDisplay = target.time ? ` ⏰ ${target.time}` : "";
            return `
                <div class="target-item">
                    <div class="target-left">
                        <input type="checkbox" onchange="toggleTarget('${target.agendaId}', '${target.id}', 'dashboard')">
                        <div>
                            <h3>${target.name}</h3>
                            <p>📁 ${target.agendaName}</p>
                        </div>
                    </div>
                    <div class="target-right">
                        <span class="priority-badge" style="background:#FFF0F0; color:#FF4D4D;">Terlewat: ${formatDate(target.deadline)}${timeDisplay}</span>
                    </div>
                </div>
            `;
        }).join('');

        overdueHTML = `
            <div style="background:#FFF5F5; border:1px solid #FECACA; border-radius:16px; padding:1.2rem 1.5rem; margin-bottom:1.5rem;">
                <h3 style="color:#B91C1C; margin-bottom:1rem;">⚠️ Perhatian: ${overdueTargets.length} Target Melewati Deadline!</h3>
                <div style="display:flex; flex-direction:column; gap:0.8rem;">${overdueItemsHTML}</div>
            </div>
        `;
    }

    const todayHTML = generateTodayTargetsHTML(todayTargets);

    const progressPercent = totalTargets > 0 ? Math.round((completedCount / totalTargets) * 100) : 0;

    const statCard = (label, value) => `
        <div style="background:#fff; border-radius:16px; padding:1.5rem; box-shadow:0 4px 15px rgba(0,0,0,0.04);">
            <p style="font-size:0.85rem; color:#9094A6; font-weight:600; margin-bottom:0.5rem;">${label}</p>
            <h2 style="font-size:2rem; color:#2D3142;">${value}</h2>
        </div>
    `;

    const statsHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem;">
            ${statCard("Total Agenda Aktif", activeAgendas.length)}
            ${statCard("Total Target", totalTargets)}
            ${statCard("Target Selesai", completedCount)}
            ${statCard("Progress Keseluruhan", progressPercent + "%")}
        </div>
    `;

    // Urutan: Overdue (paling atas) -> Target Hari Ini -> Statistik
    content.innerHTML = overdueHTML + todayHTML + statsHTML;
}


// ================================
// RENDER DAFTAR AGENDA
// ================================
function renderAgendas() {
    document.getElementById("pageTitle").innerText = "Semua Agenda";
    document.getElementById("pageSubtitle").innerText = "Kelola agenda dan target pekerjaan Anda.";
    const content = document.getElementById("content");
    content.style.display = "grid";
    content.innerHTML = "";

    const activeAgendas = agendas.filter(a => !a.isArchived);

    if (activeAgendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada agenda aktif</h2><p>Tambahkan agenda pertama Anda.</p></div>`;
        return;
    }

    activeAgendas.forEach(agenda => {
        const total = agenda.targets.length;
        const completed = agenda.targets.filter(t => t.completed).length;
        const priority = agenda.targets.filter(t => t.priority).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        const agendaCountdown = getCountdownText(agenda.date);
        const isAgendaOverdue = agendaCountdown.includes("Terlewat");

        const pendingTargets = agenda.targets
            .filter(t => !t.completed && t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3);

        let miniTargetHTML = "";
        if (pendingTargets.length > 0) {
            miniTargetHTML = `
                <div class="mini-target-list">
                    <p style="font-size:0.75rem; color:#9094A6; margin-bottom:0.2rem; font-weight:600; text-transform:uppercase;">⏳ Target Terdekat:</p>
                    ${pendingTargets.map(t => {
                        const tCountdown = getCountdownText(t.deadline);
                        const isTOverdue = tCountdown.includes("Terlewat");
                        const timeDisplay = t.time ? ` (${t.time})` : "";

                        return `
                        <div class="mini-target-item">
                            <span class="mini-target-name" title="${t.name}">${t.priority ? '⭐ ' : ''}${t.name}${timeDisplay}</span>
                            <span class="mini-target-cd ${isTOverdue ? 'overdue' : ''}">${tCountdown}</span>
                        </div>
                        `;
                    }).join("")}
                </div>`;
        } else if (total > 0 && progress === 100) {
            miniTargetHTML = `<div class="mini-target-list" style="text-align:center; background: #f0fdf4; color: #166534; border-color: #bbf7d0;">🎉 Semua target selesai!</div>`;
        } else {
            miniTargetHTML = `<div class="mini-target-list" style="text-align:center; color: #9094A6; font-style: italic;">Belum ada target untuk dikerjakan.</div>`;
        }

        const card = document.createElement("div");
        card.className = "agenda-card";
        card.innerHTML = `
            <div class="agenda-card-header">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h2 style="margin-right:10px;">${agenda.name}</h2>

                        <div style="display: flex; gap: 0.5rem; align-items:flex-start; flex-shrink:0;">
                            <button class="edit-btn" onclick="openEditAgenda(event, '${agenda.id}')" style="background:#FFF0E5; color:#FF6B35; border:none; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Edit">✏️</button>
                            <button onclick="toggleArchive(event, '${agenda.id}')" style="background:#EBF5FF; color:#3B82F6; border:none; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Arsipkan">📦</button>
                            <button class="delete-btn" onclick="deleteAgenda(event, '${agenda.id}')" style="width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;" title="Hapus">🗑</button>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap: 10px; margin: 0.5rem 0;">
                        <span class="countdown-badge ${isAgendaOverdue ? 'overdue' : ''}">
                            ⏱️ ${agendaCountdown}
                        </span>
                        <span style="font-size:0.8rem; color:#9094A6;">(${formatDate(agenda.date)})</span>
                    </div>

                    <p>${agenda.description || "Tidak ada deskripsi"}</p>
                </div>
            </div>

            ${miniTargetHTML}

            <div class="agenda-info" style="margin-top:auto;">
                <span>${total} Target</span>
                <span>⭐ ${priority} Prioritas</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${progress}%"></div></div>
            <div class="agenda-footer">
                <span>${progress}% selesai</span>
                <button onclick="openAgenda('${agenda.id}')">Buka Agenda →</button>
            </div>
        `;
        content.appendChild(card);
    });
}


// ================================
// OPEN DETAIL AGENDA (CALENDAR WIDGET & CSS)
// ================================
function openAgenda(id) {
    currentAgendaId = id;
    const agenda = agendas.find(item => item.id === id);
    if (!agenda) return;

    currentCalMonth = new Date().getMonth();
    currentCalYear = new Date().getFullYear();
    selectedFilterDate = null;

    document.getElementById("pageTitle").innerText = agenda.name;
    document.getElementById("pageSubtitle").innerText = "Hari H: " + formatDate(agenda.date);

    const content = document.getElementById("content");
    content.style.display = "block";

    // CSS kalender disuntikkan langsung agar tampil sebagai kalender berkotak
    const calendarCSS = `
    <style>
        .agenda-detail-layout { display: flex; flex-wrap: wrap; gap: 2rem; align-items: flex-start; }
        .calendar-widget {
            flex: 1; min-width: 320px; max-width: 420px;
            background: #ffffff; border-radius: 12px; padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 2px solid #F1F5F9;
        }
        .cal-header {
            display: flex; justify-content: space-between; align-items: center;
            background: #0F766E; color: #ffffff; padding: 1rem 1.5rem;
            border-radius: 8px; margin-bottom: 1.2rem; font-weight: 700; font-size: 1.1rem;
            text-transform: uppercase; letter-spacing: 1px;
        }
        .cal-header button {
            background: rgba(255,255,255,0.2); border: none; color: white;
            border-radius: 6px; width: 32px; height: 32px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s;
        }
        .cal-header button:hover { background: rgba(255,255,255,0.4); }
        .cal-days {
            display: grid; grid-template-columns: repeat(7, 1fr); text-align: center;
            font-weight: 700; color: #475569; font-size: 0.85rem; margin-bottom: 0.5rem;
        }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .cal-date {
            aspect-ratio: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
            border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600;
            background: #F8FAFC; border: 1px solid #E2E8F0; color: #1E293B; transition: all 0.2s;
        }
        .cal-date:hover:not(.empty) { background: #FFF0E5; border-color: #FF6B35; color: #FF6B35; }
        .cal-date.empty { background: transparent; border-color: transparent; cursor: default; }
        .cal-date.has-target {
            background: #FF6B35; color: white; border-color: #FF6B35;
            box-shadow: 0 4px 10px rgba(255,107,53,0.3);
        }
        .cal-date.active {
            border: 2px solid #0F766E; background: #CCFBF1; color: #0F766E; transform: scale(1.05);
        }
        .cal-indicator {
            width: 6px; height: 6px; background: white; border-radius: 50%; margin-top: 4px;
        }
    </style>
    `;

    content.innerHTML = calendarCSS + `
        <div class="back-button">
            <button onclick="renderAgendas()">← Kembali ke Daftar Agenda</button>
        </div>
        <div class="detail-header">
            <div>
                <h1>${agenda.name}</h1>
                <p>${agenda.description || "Tidak ada deskripsi"}</p>
            </div>
            <button class="btn-primary" onclick="openTargetModal('${agenda.id}')">+ Tambah Target</button>
        </div>

        <div class="agenda-detail-layout">
            <div class="calendar-widget">
                <div class="cal-header">
                    <button onclick="changeCalMonth(-1)">❮</button>
                    <span id="calMonthYear">Bulan Tahun</span>
                    <button onclick="changeCalMonth(1)">❯</button>
                </div>
                <div class="cal-days">
                    <div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
                </div>
                <div class="cal-grid" id="calGrid"></div>

                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="clearDateFilter()" style="background: transparent; border: 1px dashed #E5E7EB; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; color: #9094A6; width: 100%; transition: 0.2s;">
                        Tampilkan Semua Target
                    </button>
                    <button onclick="exportCalendarToExcel()" style="background: #217346; color: white; border: none; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; width: 100%; transition: 0.2s; box-shadow: 0 4px 10px rgba(33, 115, 70, 0.2);">
                        📅 Cetak Kalender (Excel)
                    </button>
                </div>
            </div>

            <div style="flex: 2; min-width: 320px;">
                <h3 id="targetListTitle" style="margin-bottom: 1.2rem; color: #111; font-size: 1.2rem;">Semua Target</h3>
                <div id="targetList"></div>
            </div>
        </div>
    `;

    renderAgendaCalendar(agenda);
    renderTargets(agenda);
}


// ================================
// LOGIKA KALENDER DETAIL AGENDA
// ================================
function changeCalMonth(dir) {
    currentCalMonth += dir;
    if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
    } else if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
    }
    const agenda = agendas.find(a => a.id === currentAgendaId);
    renderAgendaCalendar(agenda);
}

function clearDateFilter() {
    selectedFilterDate = null;
    const agenda = agendas.find(a => a.id === currentAgendaId);
    renderAgendaCalendar(agenda);
    renderTargets(agenda);
}

function filterByDate(dateStr) {
    selectedFilterDate = dateStr;
    const agenda = agendas.find(a => a.id === currentAgendaId);
    renderAgendaCalendar(agenda);
    renderTargets(agenda);
}

function renderAgendaCalendar(agenda) {
    const calMonthYear = document.getElementById("calMonthYear");
    const calGrid = document.getElementById("calGrid");
    if (!calMonthYear || !calGrid) return;

    calMonthYear.innerText = `${MONTHS[currentCalMonth]} ${currentCalYear}`;
    calGrid.innerHTML = "";

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

    const targetDates = {};
    agenda.targets.forEach(t => {
        if (t.deadline) targetDates[t.deadline] = true;
    });

    for (let i = 0; i < firstDay; i++) {
        calGrid.innerHTML += `<div class="cal-date empty"></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = toDateString(currentCalYear, currentCalMonth, i);

        let classes = "cal-date";
        let innerHTML = `${i}`;

        if (targetDates[dateStr]) {
            classes += " has-target";
            // Titik kecil sebagai penanda jika ada target
            innerHTML += `<div class="cal-indicator"></div>`;
        }
        if (selectedFilterDate === dateStr) classes += " active";

        calGrid.innerHTML += `<div class="${classes}" onclick="filterByDate('${dateStr}')">${innerHTML}</div>`;
    }
}


// ================================
// EXCEL: STYLE BERSAMA
// ================================
function makeBorder(style, color) {
    return {
        top: { style, color },
        bottom: { style, color },
        left: { style, color },
        right: { style, color }
    };
}

const BORDER_MEDIUM = makeBorder("medium", { rgb: "000000" });
const BORDER_THIN = makeBorder("thin", { auto: 1 });


// ================================
// EXPORT EXCEL JADWAL (KALENDER AGENDA)
// ================================
function exportCalendarToExcel() {
    const agenda = agendas.find(a => a.id === currentAgendaId);
    if (!agenda) return;

    const monthName = MONTHS[currentCalMonth];
    const year = currentCalYear;

    const wsData = [
        [`AGENDA: ${agenda.name.toUpperCase()}`],
        [`${monthName.toUpperCase()} ${year}`], // Baris nama bulan
        DAY_NAMES
    ];

    const firstDay = new Date(year, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(year, currentCalMonth + 1, 0).getDate();

    let currentWeek = [];

    for (let i = 0; i < firstDay; i++) {
        currentWeek.push("");
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toDateString(year, currentCalMonth, day);
        const targetsToday = agenda.targets.filter(t => t.deadline === dateStr);

        let cellContent = `${day}`;
        targetsToday.forEach(t => {
            const timeStr = t.time ? ` (${t.time})` : "";
            cellContent += `\n• ${t.name}${timeStr}`;
        });

        currentWeek.push(cellContent);

        if (currentWeek.length === 7) {
            wsData.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push("");
        }
        wsData.push(currentWeek);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    ws['!cols'] = Array(7).fill({ wch: 18 });

    ws['!rows'] = [
        { hpt: 30 }, // Judul agenda
        { hpt: 35 }, // Bulan & tahun
        { hpt: 25 }  // Nama hari
    ];
    for (let i = 3; i < wsData.length; i++) {
        ws['!rows'].push({ hpt: 90 }); // Kotak tanggal
    }

    for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < 7; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

            if (R === 0) {
                // Judul agenda
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "2D3142" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === 1) {
                // Blok warna solid untuk nama bulan
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "0F766E" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: BORDER_MEDIUM
                };
            } else if (R === 2) {
                // Header hari
                ws[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2D3142" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: BORDER_MEDIUM
                };
            } else {
                // Kotak tanggal (angka di kiri atas)
                ws[cellAddress].s = {
                    alignment: { horizontal: "left", vertical: "top", wrapText: true },
                    border: BORDER_MEDIUM,
                    font: { sz: 10, color: { rgb: "2D3142" } }
                };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kalender Agenda");
    XLSX.writeFile(wb, `Kalender_${agenda.name.replace(/\s+/g, '_')}_${monthName}.xlsx`);
}


// ================================
// RENDER TARGET (MENDUKUNG FILTER KALENDER)
// ================================
function renderTargets(agenda) {
    const list = document.getElementById("targetList");
    const title = document.getElementById("targetListTitle");
    if (!list) return;
    list.innerHTML = "";

    let filteredTargets = agenda.targets;
    if (selectedFilterDate) {
        filteredTargets = agenda.targets.filter(t => t.deadline === selectedFilterDate);
        title.innerHTML = `Target untuk: <span style="color:#FF6B35;">${formatDate(selectedFilterDate)}</span>`;
    } else {
        title.innerText = "Semua Target";
        filteredTargets.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    if (filteredTargets.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>Kosong</h3><p>Tidak ada target di tanggal ini.</p></div>`;
        return;
    }

    filteredTargets.forEach(target => {
        const item = document.createElement("div");
        item.className = "target-item";
        item.innerHTML = `
            <div class="target-left">
                <input type="checkbox" ${target.completed ? "checked" : ""} onchange="toggleTarget('${agenda.id}', '${target.id}')">
                <div>
                    <h3 class="${target.completed ? "completed" : ""}">${target.name}</h3>
                    <p>Deadline: ${formatDate(target.deadline)} ${target.time ? '— ⏰ ' + target.time : ''}</p>
                </div>
            </div>
            <div class="target-right">
                ${target.priority
                    ? `<span class="priority-badge">⭐ Prioritas</span>`
                    : `<button class="priority-btn" onclick="togglePriority('${agenda.id}', '${target.id}')">☆ Prioritas</button>`}
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="openEditTarget('${agenda.id}', '${target.id}')" style="background:#FFF0E5; color:#FF6B35; border:none; width:36px; height:36px; border-radius:10px; cursor:pointer;">✏️</button>
                    <button onclick="deleteTarget('${agenda.id}', '${target.id}')" style="background:#FFF0F0; color:#FF4D4D; border:none; width:36px; height:36px; border-radius:10px; cursor:pointer;">🗑</button>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}


// ================================
// LOGIKA FILTER REKAP TARGET
// ================================
function applySpecialFilter(type) {
    const sortEl = document.getElementById("specialSortOrder");
    if (sortEl) specialSortOrder = sortEl.value;

    const dateEl = document.getElementById("specialFilterDate");
    if (dateEl) specialFilterDate = dateEl.value;

    const statusEl = document.getElementById("specialFilterStatus");
    if (statusEl) specialFilterStatus = statusEl.value;

    const priorityEl = document.getElementById("specialFilterPriority");
    if (priorityEl) specialFilterPriority = priorityEl.value;

    renderSpecialPage(type);
}

function resetSpecialFilter(type) {
    specialSortOrder = 'asc';
    specialFilterDate = '';
    specialFilterStatus = 'all';
    specialFilterPriority = 'all';
    renderSpecialPage(type);
}


// ================================
// HALAMAN REKAP TARGET (DENGAN FILTER LENGKAP)
// ================================
function renderSpecialPage(type) {
    let title = "";
    let subtitle = "";

    if (type === 'priority') {
        title = "Target Prioritas";
        subtitle = "Fokus pada target paling penting.";
    } else if (type === 'completed') {
        title = "Target Selesai";
        subtitle = "Pekerjaan yang telah Anda selesaikan.";
    } else if (type === 'all-targets') {
        title = "Semua Target";
        subtitle = "Rekap seluruh target dari semua agenda, diurutkan dari deadline terdekat.";
    }

    document.getElementById("pageTitle").innerText = title;
    document.getElementById("pageSubtitle").innerText = subtitle;

    const content = document.getElementById("content");
    content.style.display = "block";

    // 1. Filter tambahan (hanya muncul di tab 'Semua Target')
    let extraFilters = "";
    if (type === 'all-targets') {
        extraFilters = `
            <select id="specialFilterStatus" onchange="applySpecialFilter('${type}')" style="padding: 0.6rem; border-radius: 8px; border: 1px solid #E5E7EB; color: #2D3142; cursor: pointer;">
                <option value="all" ${specialFilterStatus === 'all' ? 'selected' : ''}>Semua Status</option>
                <option value="pending" ${specialFilterStatus === 'pending' ? 'selected' : ''}>⏳ Belum Selesai</option>
                <option value="completed" ${specialFilterStatus === 'completed' ? 'selected' : ''}>✅ Selesai</option>
            </select>

            <select id="specialFilterPriority" onchange="applySpecialFilter('${type}')" style="padding: 0.6rem; border-radius: 8px; border: 1px solid #E5E7EB; color: #2D3142; cursor: pointer;">
                <option value="all" ${specialFilterPriority === 'all' ? 'selected' : ''}>Semua Prioritas</option>
                <option value="priority" ${specialFilterPriority === 'priority' ? 'selected' : ''}>⭐ Prioritas</option>
                <option value="normal" ${specialFilterPriority === 'normal' ? 'selected' : ''}>Biasa</option>
            </select>
        `;
    }

    // 2. Tombol reset (hanya muncul jika ada filter aktif)
    const isFilterActive = (specialFilterDate !== '' || specialFilterStatus !== 'all' || specialFilterPriority !== 'all');
    const resetBtn = isFilterActive
        ? `<button onclick="resetSpecialFilter('${type}')" style="background: none; border: none; color: #FF4D4D; cursor: pointer; font-weight: 600; font-size: 0.9rem;">✖ Reset</button>`
        : '';

    // 3. Panel aksi & filter
    const actionPanel = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap;">
                <input type="date" id="specialFilterDate" value="${specialFilterDate}" onchange="applySpecialFilter('${type}')" style="padding: 0.6rem; border-radius: 8px; border: 1px solid #E5E7EB; color: #2D3142;">

                <select id="specialSortOrder" onchange="applySpecialFilter('${type}')" style="padding: 0.6rem; border-radius: 8px; border: 1px solid #E5E7EB; color: #2D3142; cursor: pointer;">
                    <option value="asc" ${specialSortOrder === 'asc' ? 'selected' : ''}>🔽 Terdekat</option>
                    <option value="desc" ${specialSortOrder === 'desc' ? 'selected' : ''}>🔼 Terlama</option>
                </select>

                ${extraFilters}
                ${resetBtn}
            </div>

            <button class="btn-primary" onclick="exportFilteredTargetsToExcel('${type}')" style="background-color: #217346; box-shadow: 0 6px 20px rgba(33, 115, 70, 0.3);">
                📊 Export Excel
            </button>
        </div>
    `;

    content.innerHTML = actionPanel + `<div class="target-list-page" style="display:flex; flex-direction:column; gap:1rem;"></div>`;
    const container = content.querySelector(".target-list-page");

    // 4. Ambil data (sudah terfilter & terurut)
    const filteredTargets = getFilteredTargets(type);

    if (filteredTargets.length === 0) {
        container.innerHTML = `<div class="empty-state"><h2>Belum ada target</h2><p>Tidak ada data untuk ditampilkan pada filter ini.</p></div>`;
        return;
    }

    filteredTargets.forEach(target => {
        const timeDisplay = target.time ? ` — ⏰ ${target.time}` : "";

        container.innerHTML += `
            <div class="target-item">
                <div class="target-left">
                    <input type="checkbox" ${target.completed ? "checked" : ""} onchange="toggleTarget('${target.agendaId}', '${target.id}', '${type}')">
                    <div>
                        <h3 class="${target.completed ? "completed" : ""}">${target.name}</h3>
                        <p>📁 ${target.agendaName} | Deadline: ${formatDate(target.deadline)}${timeDisplay}</p>
                    </div>
                </div>
                <div class="target-right">
                    ${target.priority ? `<span class="priority-badge">⭐ Prioritas</span>` : ''}
                </div>
            </div>
        `;
    });
}


// ================================
// EXPORT EXCEL SEMUA TARGET (SINKRON DENGAN SEMUA FILTER)
// ================================
function exportFilteredTargetsToExcel(type) {
    const filteredTargets = getFilteredTargets(type);

    if (filteredTargets.length === 0) {
        alert("Tidak ada data target untuk diekspor pada filter ini.");
        return;
    }

    let judulExcel = "";
    if (type === 'priority') judulExcel = "REKAP TARGET PRIORITAS";
    else if (type === 'completed') judulExcel = "REKAP TARGET SELESAI";
    else judulExcel = "REKAP SEMUA TARGET";

    if (specialFilterDate) judulExcel += ` (${formatDate(specialFilterDate)})`;

    const wsData = [
        [judulExcel],
        [],
        ["No", "Nama Agenda", "Target Pekerjaan", "Deadline", "Jam", "Prioritas", "Status"]
    ];

    filteredTargets.forEach((t, index) => {
        wsData.push([
            index + 1,
            t.agendaName,
            t.name,
            formatDate(t.deadline),
            t.time ? t.time : "-",
            t.priority ? "⭐ Ya" : "-",
            t.completed ? "Selesai" : "Proses"
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];
    ws['!rows'] = [{ hpt: 35 }, { hpt: 15 }];
    for (let i = 2; i < wsData.length; i++) ws['!rows'].push({ hpt: 25 });

    for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < 7; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

            if (R === 0) {
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "FF6B35" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === 2) {
                ws[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2D3142" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: BORDER_THIN
                };
            } else if (R > 2) {
                const isLeftAlign = (C === 1 || C === 2);
                ws[cellAddress].s = {
                    alignment: { horizontal: isLeftAlign ? "left" : "center", vertical: "center", wrapText: true },
                    border: BORDER_THIN
                };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `${judulExcel.replace(/\s+/g, '_')}.xlsx`);
}


// ================================
// FORM SUBMITS & MODAL LOGIC
// ================================
document.getElementById("agendaForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.getElementById("editAgendaId").value;
    const name = document.getElementById("agendaName").value;
    const date = document.getElementById("agendaDate").value;
    const description = document.getElementById("agendaDescription").value;

    if (id) {
        const agenda = agendas.find(a => a.id === id);
        agenda.name = name;
        agenda.date = date;
        agenda.description = description;
    } else {
        agendas.push({ id: Date.now().toString(), name, date, description, isArchived: false, targets: [] });
    }

    saveData();
    closeAgendaModal();
    renderAgendas();

    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector('[data-page="agenda"]').classList.add("active");
});

document.getElementById("targetForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const agendaId = document.getElementById("targetAgendaId").value;
    const targetId = document.getElementById("editTargetId").value;
    const agenda = agendas.find(a => a.id === agendaId);

    if (!agenda) return;

    const name = document.getElementById("targetName").value;
    const deadline = document.getElementById("targetDeadline").value;
    const time = document.getElementById("targetTime").value;
    const priority = document.getElementById("targetPriority").checked;

    if (targetId) {
        const target = agenda.targets.find(t => t.id === targetId);
        target.name = name;
        target.deadline = deadline;
        target.time = time;
        target.priority = priority;
    } else {
        agenda.targets.push({ id: Date.now().toString(), name, deadline, time, priority, completed: false });
    }

    saveData();
    closeTargetModal();
    openAgenda(agendaId);
});

function openEditAgenda(event, id) {
    event.stopPropagation();
    const a = agendas.find(a => a.id === id);

    document.getElementById("editAgendaId").value = a.id;
    document.getElementById("agendaName").value = a.name;
    document.getElementById("agendaDate").value = a.date || "";
    document.getElementById("agendaDescription").value = a.description || "";

    document.getElementById("agendaModalTitle").innerText = "Edit Agenda";
    document.getElementById("agendaModal").classList.remove("hidden");
}

function openEditTarget(agendaId, targetId) {
    const a = agendas.find(a => a.id === agendaId);
    const t = a.targets.find(t => t.id === targetId);

    document.getElementById("editTargetId").value = t.id;
    document.getElementById("targetAgendaId").value = a.id;

    document.getElementById("targetName").value = t.name;
    document.getElementById("targetDeadline").value = t.deadline || "";
    document.getElementById("targetTime").value = t.time || "";
    document.getElementById("targetPriority").checked = t.priority;

    document.getElementById("targetModalTitle").innerText = "Edit Target";
    document.getElementById("targetModal").classList.remove("hidden");
}

function openAgendaModal() {
    document.getElementById("agendaForm").reset();
    document.getElementById("editAgendaId").value = "";
    document.getElementById("agendaModalTitle").innerText = "Tambah Agenda";
    document.getElementById("agendaModal").classList.remove("hidden");
}

function closeAgendaModal() {
    document.getElementById("agendaModal").classList.add("hidden");
}

function openTargetModal(agendaId) {
    document.getElementById("targetForm").reset();
    document.getElementById("editTargetId").value = "";
    document.getElementById("targetAgendaId").value = agendaId || currentAgendaId;
    document.getElementById("targetTime").value = "";
    document.getElementById("targetModalTitle").innerText = "Tambah Target";
    document.getElementById("targetModal").classList.remove("hidden");
}

function closeTargetModal() {
    document.getElementById("targetModal").classList.add("hidden");
}

function toggleTarget(agendaId, targetId, currentView = 'agenda') {
    const agenda = agendas.find(a => a.id === agendaId);
    const target = agenda.targets.find(t => t.id === targetId);
    target.completed = !target.completed;
    saveData();

    if (currentView === 'dashboard') {
        renderDashboard();
    } else if (['priority', 'completed', 'all-targets'].includes(currentView)) {
        renderSpecialPage(currentView);
    } else {
        openAgenda(agendaId);
    }
}

function togglePriority(agendaId, targetId) {
    const agenda = agendas.find(a => a.id === agendaId);
    const target = agenda.targets.find(t => t.id === targetId);
    target.priority = !target.priority;
    saveData();
    openAgenda(agendaId);
}

function deleteTarget(agendaId, targetId) {
    if (!confirm("Hapus target ini?")) return;
    const agenda = agendas.find(a => a.id === agendaId);
    agenda.targets = agenda.targets.filter(t => t.id !== targetId);
    saveData();
    openAgenda(agendaId);
}

function deleteAgenda(event, agendaId) {
    event.stopPropagation();
    if (!confirm("Hapus agenda beserta seluruh target di dalamnya?")) return;
    agendas = agendas.filter(a => a.id !== agendaId);
    saveData();

    const page = document.querySelector(".nav-item.active").dataset.page;
    if (page === "archive") renderArchive();
    else renderAgendas();
}


// ================================
// TIMELINE AGENDA
// ================================
function renderTimeline() {
    document.getElementById("pageTitle").innerText = "Timeline Agenda";
    document.getElementById("pageSubtitle").innerText = "Visualisasi alur waktu agenda Anda. Klik lingkaran untuk menceklis agenda.";

    const content = document.getElementById("content");
    content.style.display = "block";

    // Menggunakan seluruh data agendas (termasuk yang diarsip)
    const sortedAgendas = [...agendas].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Infinity;
        const dateB = b.date ? new Date(b.date).getTime() : Infinity;
        return dateA - dateB;
    });

    if (sortedAgendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada agenda</h2><p>Tambahkan agenda terlebih dahulu.</p></div>`;
        return;
    }

    const timelineCSS = `
        <style>
            .timeline-container {
                display: flex;
                flex-wrap: wrap;
                row-gap: 40px;
                column-gap: 0;
                padding: 40px 20px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                margin-top: 20px;
                width: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            .timeline-item {
                flex: 1 1 220px;
                max-width: 300px;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                box-sizing: border-box;
            }
            .timeline-date {
                font-weight: 600;
                margin-bottom: 15px;
                color: #64748b;
                font-size: 14px;
            }
            .timeline-item.completed .timeline-date {
                color: #217346;
            }
            .timeline-node-wrapper {
                position: relative;
                width: 100%;
                display: flex;
                justify-content: center;
                margin-bottom: 15px;
            }
            .timeline-line {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 100%;
                height: 4px;
                background-color: #eef2f5;
                z-index: 1;
                transform: translateY(-50%);
                transition: background-color 0.3s;
            }
            .timeline-item.completed .timeline-line {
                background-color: #217346;
            }
            .timeline-node {
                position: relative;
                z-index: 2;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: white;
                border: 3px solid #eef2f5;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 0 0 6px white;
                transition: all 0.3s ease;
            }
            .timeline-item.completed .timeline-node {
                background-color: #217346;
                border-color: #217346;
            }
            .timeline-icon {
                color: transparent;
                font-size: 14px;
                font-weight: bold;
            }
            .timeline-item.completed .timeline-icon {
                color: white;
            }
            .timeline-content {
                text-align: center;
                padding: 0 10px;
            }
            .timeline-title {
                font-size: 14px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 5px;
            }
            .timeline-subtitle {
                font-size: 12px;
                color: #64748b;
            }
        </style>
    `;

    let timelineHTML = `<div class="timeline-container">`;

    sortedAgendas.forEach((agenda) => {
        const isCompleted = !!agenda.timelineCompleted;
        let dateStr = "Tanpa Tanggal";
        if (agenda.date) {
            dateStr = new Date(agenda.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        }

        timelineHTML += `
            <div class="timeline-item ${isCompleted ? 'completed' : ''}">
                <div class="timeline-date">${dateStr}</div>
                <div class="timeline-node-wrapper">
                    <div class="timeline-line"></div>
                    <div class="timeline-node" onclick="toggleTimelineStatus('${agenda.id}')">
                        <span class="timeline-icon">✓</span>
                    </div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${agenda.name}</div>
                    <div class="timeline-subtitle">${agenda.targets ? agenda.targets.length : 0} Target</div>
                </div>
            </div>
        `;
    });

    timelineHTML += `</div>`;
    content.innerHTML = timelineCSS + timelineHTML;

    setTimeout(fixTimelineLines, 10);
}

function toggleTimelineStatus(agendaId) {
    const agenda = agendas.find(a => a.id === agendaId);
    if (agenda) {
        agenda.timelineCompleted = !agenda.timelineCompleted;
        saveData();
        renderTimeline();
    }
}

function fixTimelineLines() {
    const items = document.querySelectorAll('.timeline-item');
    items.forEach((item, index) => {
        const line = item.querySelector('.timeline-line');
        if (line) line.style.display = 'block';

        if (index === items.length - 1) {
            if (line) line.style.display = 'none';
            return;
        }

        // Sembunyikan garis jika item terakhir di barisnya (item berikutnya turun baris)
        if (item.offsetTop < items[index + 1].offsetTop) {
            if (line) line.style.display = 'none';
        }
    });
}


// ================================
// FITUR ARSIP AGENDA
// ================================
function toggleArchive(event, agendaId) {
    event.stopPropagation();
    const agenda = agendas.find(a => a.id === agendaId);
    if (agenda) {
        agenda.isArchived = !agenda.isArchived;
        saveData();

        if (agenda.isArchived) renderAgendas();
        else renderArchive();
    }
}

function renderArchive() {
    document.getElementById("pageTitle").innerText = "Arsip Agenda";
    document.getElementById("pageSubtitle").innerText = "Agenda yang sudah selesai dan disimpan.";

    const content = document.getElementById("content");
    content.style.display = "grid";
    content.innerHTML = "";

    const archivedAgendas = agendas.filter(a => a.isArchived);

    if (archivedAgendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Arsip Kosong</h2><p>Belum ada agenda yang diarsipkan.</p></div>`;
        return;
    }

    archivedAgendas.forEach(agenda => {
        const total = agenda.targets.length;
        const completed = agenda.targets.filter(t => t.completed).length;
        const priority = agenda.targets.filter(t => t.priority).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        const card = document.createElement("div");
        card.className = "agenda-card";
        card.style.opacity = "0.8";
        card.innerHTML = `
            <div class="agenda-card-header">
                <div>
                    <h2>${agenda.name}</h2>
                    <p style="color: #64748b; font-size:0.85rem; font-weight:600; margin-bottom: 0.3rem;">Hari H: ${formatDate(agenda.date)}</p>
                    <p>${agenda.description || "Tidak ada deskripsi"}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items:flex-start;">
                    <button onclick="toggleArchive(event, '${agenda.id}')" style="background:#EBF5FF; color:#3B82F6; border:none; width:36px; height:36px; border-radius:10px; cursor:pointer;" title="Kembalikan ke Semua Agenda">🔙</button>
                    <button class="delete-btn" onclick="deleteAgenda(event, '${agenda.id}')" title="Hapus Permanen">🗑</button>
                </div>
            </div>
            <div class="agenda-info">
                <span>${total} Target</span>
                <span>⭐ ${priority} Prioritas</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${progress}%; background:#94a3b8;"></div></div>
            <div class="agenda-footer">
                <span style="color:#64748b;">${progress}% selesai</span>
                <button onclick="openAgenda('${agenda.id}')" style="color:#64748b;">Lihat Detail →</button>
            </div>
        `;
        content.appendChild(card);
    });
}


// ================================
// HALAMAN COUNTDOWN & HABIT
// ================================
function renderCountdowns() {
    document.getElementById("pageTitle").innerText = "Countdown & Target Habit";
    document.getElementById("pageSubtitle").innerText = "Hitung mundur ke acara penting atau bangun kebiasaan harian Anda.";

    const content = document.getElementById("content");
    content.style.display = "grid";
    content.innerHTML = "";

    setHeaderAction("+ Tambah Countdown", openCountdownModal);

    if (countdowns.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada Countdown</h2><p>Mulai target kebiasaan baru atau hitung mundur ke hari H!</p></div>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    countdowns.forEach(cd => {
        const targetDate = new Date(cd.date);
        targetDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((targetDate - today) / MS_PER_DAY);

        let displayStr = diffDays;
        let labelStr = "HARI LAGI";
        let colorStr = "#FF6B35";

        if (diffDays === 0) {
            displayStr = "HARI INI";
            labelStr = "ACARA TIBA";
            colorStr = "#217346";
        } else if (diffDays < 0) {
            displayStr = Math.abs(diffDays);
            labelStr = "HARI TERLEWAT";
            colorStr = "#9094A6";
        }

        const card = document.createElement("div");
        card.className = "countdown-card";
        card.innerHTML = `
            <div class="cd-actions">
                <button class="delete-btn" onclick="deleteCountdown('${cd.id}')" title="Hapus">🗑</button>
            </div>
            <h3 class="cd-title">${cd.name}</h3>
            <span class="cd-date">🎯 ${formatDate(cd.date)}</span>

            <div class="cd-number-box">
                <div class="cd-number" style="color: ${colorStr}; font-size: ${isNaN(displayStr) ? '2.5rem' : '4rem'};">${displayStr}</div>
                <span class="cd-label">${labelStr}</span>
            </div>

            <button class="btn-export-cd" onclick="exportCountdownExcel('${cd.id}')">
                📊 Cetak Tracker (Excel)
            </button>
        `;
        content.appendChild(card);
    });
}

function openCountdownModal() {
    document.getElementById("countdownForm").reset();
    document.getElementById("countdownModal").classList.remove("hidden");
}

function closeCountdownModal() {
    document.getElementById("countdownModal").classList.add("hidden");
}

function deleteCountdown(id) {
    if (!confirm("Hapus countdown ini?")) return;
    countdowns = countdowns.filter(c => c.id !== id);
    saveData();
    renderCountdowns();
}

document.getElementById("countdownForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("countdownName").value;
    const date = document.getElementById("countdownDate").value;

    countdowns.push({
        id: Date.now().toString(),
        name,
        date,
        createdAt: new Date().toISOString()
    });

    saveData();
    closeCountdownModal();
    renderCountdowns();
});


// ================================
// EXPORT EXCEL TRACKER COUNTDOWN (SEMUA BULAN DALAM 1 SHEET, VERTIKAL)
// ================================
function exportCountdownExcel(id) {
    const cd = countdowns.find(c => c.id === id);
    if (!cd) return;

    const startDate = new Date(cd.createdAt);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(cd.date);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
        alert("Tanggal target sudah terlewat saat countdown dibuat.");
        return;
    }

    // 1. Data utama untuk 1 sheet
    const wsData = [
        [`HABIT TRACKER: ${cd.name.toUpperCase()}`],
        [`Total Hari / Rentang: ${formatDate(cd.createdAt)} s/d ${formatDate(cd.date)}`],
        [] // Baris kosong sebagai spasi
    ];

    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Judul utama (kolom A-G)
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }  // Subtitle (kolom A-G)
    ];

    const rowHeights = [
        { hpt: 30 }, // Baris 0: Judul
        { hpt: 20 }, // Baris 1: Subtitle
        { hpt: 15 }  // Baris 2: Spasi
    ];

    let currentRow = 3; // Indeks baris saat ini

    const currIter = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const finalLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    // Loop tiap bulan, susun vertikal ke bawah
    while (currIter <= finalLimit) {
        const targetYear = currIter.getFullYear();
        const targetMonth = currIter.getMonth();
        const monthName = MONTHS[targetMonth];

        // Header nama bulan (mis. SEPTEMBER 2026)
        wsData.push([`${monthName.toUpperCase()} ${targetYear}`]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 6 } });
        rowHeights.push({ hpt: 30 });
        currentRow++;

        // Baris nama hari
        wsData.push(DAY_NAMES);
        rowHeights.push({ hpt: 25 });
        currentRow++;

        // Grid tanggal bulan ini
        const firstDay = new Date(targetYear, targetMonth, 1).getDay();
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

        let currentWeek = [];
        for (let i = 0; i < firstDay; i++) {
            currentWeek.push("");
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(targetYear, targetMonth, day);
            currentDate.setHours(0, 0, 0, 0);

            let cellContent = `${day}`;
            if (currentDate >= startDate && currentDate <= endDate) {
                cellContent += `\n[   ] Target`;
            }

            currentWeek.push(cellContent);

            if (currentWeek.length === 7) {
                wsData.push(currentWeek);
                rowHeights.push({ hpt: 90 }); // Tinggi kotak tanggal
                currentRow++;
                currentWeek = [];
            }
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push("");
            }
            wsData.push(currentWeek);
            rowHeights.push({ hpt: 90 });
            currentRow++;
        }

        // Jarak 2 baris kosong sebelum bulan berikutnya
        wsData.push([]);
        wsData.push([]);
        rowHeights.push({ hpt: 15 }, { hpt: 15 });
        currentRow += 2;

        currIter.setMonth(currIter.getMonth() + 1);
    }

    // 2. Worksheet & layout
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;
    ws['!cols'] = Array(7).fill({ wch: 18 });
    ws['!rows'] = rowHeights;

    // 3. Styling border dan warna
    for (let R = 0; R < wsData.length; ++R) {
        const rowData = wsData[R];

        // Lewati baris yang benar-benar kosong (spasi antar bulan)
        if (!rowData || rowData.length === 0 || rowData.every(val => val === "")) {
            continue;
        }

        for (let C = 0; C < 7; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

            if (R === 0) {
                // Judul utama
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "FF6B35" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === 1) {
                // Subtitle
                ws[cellAddress].s = {
                    font: { bold: true, sz: 11, color: { rgb: "64748b" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else {
                const isMonthHeader = rowData.length === 1 && rowData[0] && typeof rowData[0] === 'string' &&
                    MONTHS.some(m => rowData[0].toUpperCase().includes(m.toUpperCase()));
                const isDayHeader = rowData[0] === "Minggu" && rowData[1] === "Senin";

                if (isMonthHeader) {
                    ws[cellAddress].s = {
                        font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "0F766E" } },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: BORDER_MEDIUM
                    };
                } else if (isDayHeader) {
                    // Header hari (Minggu - Sabtu)
                    ws[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "2D3142" } },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: BORDER_MEDIUM
                    };
                } else {
                    // Kotak tanggal kalender
                    ws[cellAddress].s = {
                        alignment: { horizontal: "left", vertical: "top", wrapText: true },
                        border: BORDER_MEDIUM,
                        font: { sz: 10, color: { rgb: "2D3142" } }
                    };
                }
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Habit Tracker");
    XLSX.writeFile(wb, `Kalender_Habit_${cd.name.replace(/\s+/g, '_')}.xlsx`);
}


// ================================
// NAVIGATION HANDLER & INIT
// ================================
document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", function () {
        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
        this.classList.add("active");

        // Bersihkan pengaturan filter saat berganti menu
        specialSortOrder = 'asc';
        specialFilterDate = '';
        specialFilterStatus = 'all';
        specialFilterPriority = 'all';

        const page = this.dataset.page;

        // Halaman countdown mengatur tombol headernya sendiri
        if (page !== "countdown") {
            setHeaderAction("+ Tambah Agenda", openAgendaModal);
        }

        if (page === "dashboard") renderDashboard();
        else if (page === "agenda") renderAgendas();
        else if (page === "timeline") renderTimeline();
        else if (page === "all-targets") renderSpecialPage('all-targets');
        else if (page === "priority") renderSpecialPage('priority');
        else if (page === "completed") renderSpecialPage('completed');
        else if (page === "archive") renderArchive();
        else if (page === "countdown") renderCountdowns();
    });
});

window.addEventListener('resize', () => {
    if (document.getElementById("pageTitle").innerText === "Timeline Agenda") {
        fixTimelineLines();
    }
});
