let agendas = JSON.parse(localStorage.getItem("targetManager")) || [];
let currentAgendaId = null;
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();
let selectedFilterDate = null;

// ================================
// SAVE DATA & FORMAT DATE
// ================================
function saveData() {
    localStorage.setItem("targetManager", JSON.stringify(agendas));
}

function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
    });
}

function getCountdownText(dateString) {
    if (!dateString) return "-";
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hari Ini!";
    if (diffDays === 1) return "Besok";
    if (diffDays > 1) return `${diffDays} Hari Lagi`;
    if (diffDays < 0) return `Terlewat ${Math.abs(diffDays)} Hari`;
    return "-";
}

// ================================
// HALAMAN DASHBOARD (DENGAN PENGINGAT DEADLINE, FILTER ARSIP, & JAM)
// ================================
function renderDashboard() {
    document.getElementById("pageTitle").innerText = "Dashboard";
    document.getElementById("pageSubtitle").innerText = "Ringkasan progress target dan agenda Anda.";
    
    const content = document.getElementById("content");
    content.style.display = "block";

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari untuk komparasi akurat

    let overdueTargets = [];
    let totalTargets = 0;
    let completedCount = 0;

    // REVISI 1: Terapkan Filter Arsip (Hanya proses agenda yang belum diarsipkan)
    const activeAgendas = agendas.filter(a => !a.isArchived);

    // Filter target yang terlewat deadline & belum selesai
    activeAgendas.forEach(agenda => {
        agenda.targets.forEach(target => {
            totalTargets++;
            if (target.completed) completedCount++;

            if (!target.completed && target.deadline) {
                const deadlineDate = new Date(target.deadline);
                deadlineDate.setHours(0, 0, 0, 0);
                
                if (deadlineDate < today) {
                    overdueTargets.push({
                        ...target,
                        agendaName: agenda.name,
                        agendaId: agenda.id
                    });
                }
            }
        });
    });

    // Urutkan overdue dari tanggal yang paling lama terlewat
    overdueTargets.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // HTML Banner Pengingat Overdue
    let overdueHTML = "";
    if (overdueTargets.length > 0) {
        overdueHTML = `
            <div style="background: #fff1f2; border-left: 5px solid #e11d48; padding: 1.25rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.06);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h3 style="color: #be123c; margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
                        ⚠️ Perhatian: ${overdueTargets.length} Target Melewati Deadline!
                    </h3>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${overdueTargets.map(target => {
                        // REVISI 2: Menampilkan indikator Jam jika ada
                        const timeDisplay = target.time ? ` ⏰ ${target.time}` : "";
                        return `
                        <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #fecdd3;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <input type="checkbox" onchange="toggleTarget('${target.agendaId}', '${target.id}', 'dashboard')">
                                <div>
                                    <strong style="color: #1e293b; display: block; font-size: 0.95rem;">${target.name}</strong>
                                    <span style="font-size: 0.8rem; color: #64748b;">📁 ${target.agendaName}</span>
                                </div>
                            </div>
                            <span style="background: #ffe4e6; color: #e11d48; font-size: 0.78rem; font-weight: 600; padding: 4px 10px; border-radius: 20px;">
                                Terlewat: ${formatDate(target.deadline)}${timeDisplay}
                            </span>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Persentase Progress Keseluruhan
    const progressPercent = totalTargets > 0 ? Math.round((completedCount / totalTargets) * 100) : 0;

    // Tampilan Grid Kartu Ringkasan
    const statsHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <span style="color: #64748b; font-size: 0.85rem;">Total Agenda Aktif</span>
                <!-- REVISI 3: Menghitung activeAgendas, bukan semua agendas -->
                <h2 style="margin: 0.5rem 0 0; color: #1e293b; font-size: 1.8rem;">${activeAgendas.length}</h2>
            </div>
            <div style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <span style="color: #64748b; font-size: 0.85rem;">Total Target</span>
                <h2 style="margin: 0.5rem 0 0; color: #1e293b; font-size: 1.8rem;">${totalTargets}</h2>
            </div>
            <div style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <span style="color: #64748b; font-size: 0.85rem;">Target Selesai</span>
                <h2 style="margin: 0.5rem 0 0; color: #217346; font-size: 1.8rem;">${completedCount}</h2>
            </div>
            <div style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <span style="color: #64748b; font-size: 0.85rem;">Progress Keseluruhan</span>
                <h2 style="margin: 0.5rem 0 0; color: #2563eb; font-size: 1.8rem;">${progressPercent}%</h2>
            </div>
        </div>
    `;

    content.innerHTML = overdueHTML + statsHTML;
}


// ================================
// RENDER DAFTAR AGENDA (DENGAN COUNTDOWN & ARSIP)
// ================================
function renderAgendas() {
    document.getElementById("pageTitle").innerText = "Semua Agenda";
    document.getElementById("pageSubtitle").innerText = "Kelola agenda dan target pekerjaan Anda.";
    const content = document.getElementById("content");
    content.style.display = "grid"; // Kembalikan ke format Grid
    content.innerHTML = "";

    // FILTER: Hanya tampilkan agenda yang BELUM diarsipkan
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

        // 1. Hitung Countdown Agenda
        const agendaCountdown = getCountdownText(agenda.date);
        const isAgendaOverdue = agendaCountdown.includes("Terlewat");

        // 2. Ambil maksimal 3 target yang belum selesai, urutkan dari deadline terdekat
        const pendingTargets = agenda.targets
            .filter(t => !t.completed && t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 3); 

        // 3. Render HTML untuk List Target Terdekat di dalam Card
        let miniTargetHTML = "";
        if (pendingTargets.length > 0) {
            miniTargetHTML = `
                <div class="mini-target-list">
                    <p style="font-size:0.75rem; color:#9094A6; margin-bottom:0.2rem; font-weight:600; text-transform:uppercase;">⏳ Target Terdekat:</p>
                    ${pendingTargets.map(t => {
                        const tCountdown = getCountdownText(t.deadline);
                        const isTOverdue = tCountdown.includes("Terlewat");
                        // Tambahkan keterangan jam jika diisi
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

        // 4. Susun Card Utama
        const card = document.createElement("div");
        card.className = "agenda-card";
        card.innerHTML = `
            <div class="agenda-card-header">
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h2 style="margin-right:10px;">${agenda.name}</h2>
                        
                        <!-- Grup Tombol Aksi (Edit, Arsip, Hapus) -->
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
            
            <!-- Memasukkan list target terdekat di sini -->
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
// OPEN DETAIL AGENDA (DENGAN KALENDER FILTER & EXPORT)
// ================================
function openAgenda(id) {
    currentAgendaId = id;
    const agenda = agendas.find(item => item.id === id);
    if (!agenda) return;

    // Reset filter & kalender setiap membuka agenda baru
    currentCalMonth = new Date().getMonth();
    currentCalYear = new Date().getFullYear();
    selectedFilterDate = null;

    document.getElementById("pageTitle").innerText = agenda.name;
    document.getElementById("pageSubtitle").innerText = "Hari H: " + formatDate(agenda.date);
    
    const content = document.getElementById("content");
    content.style.display = "block";
    
    content.innerHTML = `
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
            <!-- Widget Kalender di Kiri -->
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
                
                <!-- Grup Tombol Bawah Kalender -->
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <button onclick="clearDateFilter()" style="background: transparent; border: 1px dashed #E5E7EB; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer; color: #9094A6; width: 100%; transition: 0.2s;">
                        Tampilkan Semua Target
                    </button>
                    <button onclick="exportCalendarToExcel()" style="background: #217346; color: white; border: none; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; width: 100%; transition: 0.2s; box-shadow: 0 4px 10px rgba(33, 115, 70, 0.2);">
                        📊 Cetak Jadwal (Excel)
                    </button>
                </div>
            </div>
            
            <!-- Daftar Target di Kanan -->
            <div>
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

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    calMonthYear.innerText = `${months[currentCalMonth]} ${currentCalYear}`;

    calGrid.innerHTML = "";

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

    // Mapping tanggal mana saja yang memiliki target
    const targetDates = {};
    agenda.targets.forEach(t => {
        if (t.deadline) targetDates[t.deadline] = true;
    });

    // Render kotak kosong sebelum tanggal 1
    for (let i = 0; i < firstDay; i++) {
        calGrid.innerHTML += `<div class="cal-date empty"></div>`;
    }

    // Render tanggal
    for (let i = 1; i <= daysInMonth; i++) {
        // Format YYYY-MM-DD agar sama dengan nilai input date HTML
        const dateStr = `${currentCalYear}-${String(currentCalMonth+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        let classes = "cal-date";
        if (targetDates[dateStr]) classes += " has-target";
        if (selectedFilterDate === dateStr) classes += " active";

        calGrid.innerHTML += `<div class="${classes}" onclick="filterByDate('${dateStr}')">${i}</div>`;
    }
}

// ================================
// RENDER TARGET (MENDUKUNG FILTER KALENDER)
// ================================
function renderTargets(agenda) {
    const list = document.getElementById("targetList");
    const title = document.getElementById("targetListTitle");
    if (!list) return;
    list.innerHTML = "";

    // Logika Filter
    let filteredTargets = agenda.targets;
    if (selectedFilterDate) {
        filteredTargets = agenda.targets.filter(t => t.deadline === selectedFilterDate);
        title.innerHTML = `Target untuk: <span style="color:#FF6B35;">${formatDate(selectedFilterDate)}</span>`;
    } else {
        title.innerText = "Semua Target";
        // Urutkan default dari deadline terdekat
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
                ${target.priority ? `<span class="priority-badge">⭐ Prioritas</span>` : `<button class="priority-btn" onclick="togglePriority('${agenda.id}', '${target.id}')">☆ Prioritas</button>`}
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
// HALAMAN REKAP TARGET (PRIORITAS, SELESAI, & SEMUA TARGET)
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
    
    // Tombol Export Excel khusus tab Rekap
    let exportBtn = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
            <button class="btn-primary" onclick="exportFilteredTargetsToExcel('${type}')" style="background-color: #217346; box-shadow: 0 6px 20px rgba(33, 115, 70, 0.3);">
                📊 Export Excel
            </button>
        </div>
    `;

    content.innerHTML = exportBtn + `<div class="target-list-page" style="display:flex; flex-direction:column; gap:1rem;"></div>`;
    const container = content.querySelector(".target-list-page");
    
    let filteredTargets = [];

    // Mengumpulkan target yang BELUM DIARSIP berdasarkan tab yang dibuka
    agendas.filter(a => !a.isArchived).forEach(agenda => {
        agenda.targets.forEach(target => {
            if (type === 'priority' && target.priority && !target.completed) {
                filteredTargets.push({...target, agendaName: agenda.name, agendaId: agenda.id});
            } else if (type === 'completed' && target.completed) {
                filteredTargets.push({...target, agendaName: agenda.name, agendaId: agenda.id});
            } else if (type === 'all-targets') {
                filteredTargets.push({...target, agendaName: agenda.name, agendaId: agenda.id});
            }
        });
    });

    // PENGURUTAN: Tanggal terdekat ke terjauh
    filteredTargets.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
    });

    if (filteredTargets.length === 0) {
        container.innerHTML = `<div class="empty-state"><h2>Belum ada target</h2><p>Tidak ada data untuk ditampilkan di sini.</p></div>`;
        return;
    }

    filteredTargets.forEach(target => {
        // Menyiapkan teks jam jika waktu diisi
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
// FORM SUMBITS (ADD & EDIT LOGIC)
// ================================

// FORM AGENDA
document.getElementById("agendaForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("editAgendaId").value;
    const name = document.getElementById("agendaName").value;
    const date = document.getElementById("agendaDate").value;
    const description = document.getElementById("agendaDescription").value;

    if(id) {
        // Mode Edit
        const agenda = agendas.find(a => a.id === id);
        agenda.name = name;
        agenda.date = date;
        agenda.description = description;
    } else {
        // Mode Tambah Baru
        agendas.push({ id: Date.now().toString(), name, date, description, targets: [] });
    }

    saveData();
    closeAgendaModal();
    renderAgendas(); // Langsung ke view agenda
    // Update nav aktif ke agenda jika sebelumnya di dashboard
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector('[data-page="agenda"]').classList.add("active");
});


// FORM TARGET (Menerima input jam)
document.getElementById("targetForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const agendaId = document.getElementById("targetAgendaId").value;
    const targetId = document.getElementById("editTargetId").value;
    const agenda = agendas.find(a => a.id === agendaId);
    
    if (!agenda) return;

    const name = document.getElementById("targetName").value;
    const deadline = document.getElementById("targetDeadline").value;
    const time = document.getElementById("targetTime").value; // Ambil nilai jam
    const priority = document.getElementById("targetPriority").checked;

    if(targetId) {
        // Mode Edit
        const target = agenda.targets.find(t => t.id === targetId);
        target.name = name;
        target.deadline = deadline;
        target.time = time; // Update jam
        target.priority = priority;
    } else {
        // Mode Tambah Baru
        agenda.targets.push({ id: Date.now().toString(), name, deadline, time, priority, completed: false });
    }

    saveData();
    closeTargetModal();
    openAgenda(agendaId);
});


// ================================
// EDIT TRIGGERS (MEMBUKA MODAL)
// ================================
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
    document.getElementById("targetTime").value = t.time || ""; // Isi jam jika ada
    document.getElementById("targetPriority").checked = t.priority;
    
    document.getElementById("targetModalTitle").innerText = "Edit Target";
    document.getElementById("targetModal").classList.remove("hidden");
}


// ================================
// MODAL CONTROLLERS (RESET SAAT CLOSE)
// ================================
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
    document.getElementById("targetTime").value = ""; // Kosongkan jam
    document.getElementById("targetModalTitle").innerText = "Tambah Target";
    document.getElementById("targetModal").classList.remove("hidden");
}

function closeTargetModal() {
    document.getElementById("targetModal").classList.add("hidden");
}


// ================================
// TOGGLE TARGET (DENGAN DUKUNGAN DASHBOARD)
// ================================
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
    renderAgendas();
}


// ================================
// NAVIGATION HANDLER
// ================================
document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", function() {
        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
        this.classList.add("active");
        
        const page = this.dataset.page;
        if (page === "dashboard") renderDashboard();
        else if (page === "agenda") renderAgendas();
        else if (page === "timeline") renderTimeline(); // <-- TAMBAHKAN BARIS INI
        else if (page === "all-targets") renderSpecialPage('all-targets');
        else if (page === "priority") renderSpecialPage('priority');
        else if (page === "completed") renderSpecialPage('completed');
        else if (page === "archive") renderArchive(); // <--- TAMBAHKAN BARIS INI 
    });
});


// ================================
// INITIAL LOAD
// ================================
renderDashboard();

// ================================
// EXPORT EXCEL SEMUA TARGET / PRIORITAS / SELESAI (SIAP CETAK)
// ================================
function exportFilteredTargetsToExcel(type) {
    let filteredTargets = [];
    let judulExcel = "";

    // 1. Kumpulkan data berdasarkan tipe tab yang sedang dibuka
    agendas.forEach(agenda => {
        agenda.targets.forEach(target => {
            if (type === 'priority' && target.priority && !target.completed) {
                filteredTargets.push({...target, agendaName: agenda.name});
            } else if (type === 'completed' && target.completed) {
                filteredTargets.push({...target, agendaName: agenda.name});
            } else if (type === 'all-targets') {
                filteredTargets.push({...target, agendaName: agenda.name});
            }
        });
    });

    if (filteredTargets.length === 0) {
        alert("Tidak ada data target untuk diekspor.");
        return;
    }

    // Urutkan berdasarkan tanggal terdekat
    filteredTargets.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
    });

    // Menentukan judul tabel di dalam Excel
    if (type === 'priority') judulExcel = "REKAP TARGET PRIORITAS";
    else if (type === 'completed') judulExcel = "REKAP TARGET SELESAI";
    else judulExcel = "REKAP SEMUA TARGET";

    // 2. Susun format Array of Arrays
    let wsData = [
        [judulExcel], // Baris 1: Judul
        [], // Baris 2: Kosong untuk spasi
        ["No", "Nama Agenda", "Target Pekerjaan", "Deadline", "Jam", "Prioritas", "Status"] // Baris 3: Header
    ];

    // Isi Data baris demi baris
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

    // Buat worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 3. Gabungkan Cell Judul (Merge kolom A sampai G)
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } 
    ];

    // 4. Atur Lebar Kolom agar rapi (Proporsional)
    ws['!cols'] = [
        {wch: 5},   // A: No
        {wch: 25},  // B: Nama Agenda
        {wch: 40},  // C: Target Pekerjaan
        {wch: 20},  // D: Deadline
        {wch: 10},  // E: Jam
        {wch: 12},  // F: Prioritas
        {wch: 15}   // G: Status
    ];

    // 5. Atur Tinggi Baris (Agar tidak terlalu mepet)
    ws['!rows'] = [{hpt: 35}, {hpt: 15}]; 
    for(let i = 2; i < wsData.length; i++) {
        ws['!rows'].push({hpt: 25});
    }

    // 6. STYLING: Tambahkan Border, Warna, dan Alignment
    const borderStyle = {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } }
    };

    for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < 7; ++C) {
            let cellAddress = XLSX.utils.encode_cell({r: R, c: C});
            
            // Generate cell kosong jika undifined (agar border tetap muncul sempurna)
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

            if (R === 0) {
                // Style Judul
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "FF6B35" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === 2) {
                // Style Header Tabel (Background Gelap, Teks Putih)
                ws[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2D3142" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: borderStyle
                };
            } else if (R > 2) {
                // Style Isi Data Tabel (Rata Kiri untuk Nama Agenda & Target)
                const isLeftAlign = (C === 1 || C === 2); 
                ws[cellAddress].s = {
                    alignment: { horizontal: isLeftAlign ? "left" : "center", vertical: "center", wrapText: true },
                    border: borderStyle
                };
            }
        }
    }

    // 7. Proses & Download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    
    // Nama file otomatis rapi menyesuaikan isi
    const fileName = `${judulExcel.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ================================
// HALAMAN TIMELINE AGENDA
// ================================
function renderTimeline() {
    document.getElementById("pageTitle").innerText = "Timeline Agenda";
    document.getElementById("pageSubtitle").innerText = "Visualisasi alur waktu agenda Anda. Klik lingkaran untuk menceklis agenda.";
    
    const content = document.getElementById("content");
    content.style.display = "block";

    // REVISI: Tambahkan filter agar agenda yang diarsipkan tidak muncul di Timeline
    const activeAgendas = agendas.filter(a => !a.isArchived);

    const sortedAgendas = activeAgendas.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Infinity;
        const dateB = b.date ? new Date(b.date).getTime() : Infinity;
        return dateA - dateB;
    });

    if (sortedAgendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada agenda aktif</h2><p>Tambahkan agenda terlebih dahulu.</p></div>`;
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
                overflow: hidden; /* Mencegah overflow visual */
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
        const isCompleted = agenda.timelineCompleted ? true : false;
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

    // --- Panggil fungsi perbaikan garis setelah HTML dirender ---
    setTimeout(fixTimelineLines, 10);
}

// ================================
// TOGGLE STATUS TIMELINE AGENDA
// ================================
function toggleTimelineStatus(agendaId) {
    const agenda = agendas.find(a => a.id === agendaId);
    if (agenda) {
        // Balikkan status timelineCompleted (true jadi false, false jadi true)
        agenda.timelineCompleted = !agenda.timelineCompleted;
        saveData(); 
        renderTimeline(); // Render ulang agar animasi UI berjalan
    }
}

// ================================
// PERBAIKAN GARIS TIMELINE (JS POTONG GARIS)
// ================================
function fixTimelineLines() {
    const items = document.querySelectorAll('.timeline-item');
    
    items.forEach((item, index) => {
        const line = item.querySelector('.timeline-line');
        if (line) line.style.display = 'block'; // Reset tampilkan semua garis dulu
        
        // Selalu sembunyikan garis pada item paling akhir di seluruh timeline
        if (index === items.length - 1) {
            if (line) line.style.display = 'none';
            return;
        }
        
        // Cek posisi vertikal: Jika item berikutnya ada di bawah item saat ini (turun baris)
        // Maka sembunyikan garis pada item saat ini
        if (item.offsetTop < items[index + 1].offsetTop) {
            if (line) line.style.display = 'none';
        }
    });
}

// Pastikan perhitungan ulang terjadi jika pengguna me-resize ukuran layar/browser
window.addEventListener('resize', () => {
    if (document.getElementById("pageTitle").innerText === "Timeline Agenda") {
        fixTimelineLines();
    }
});

// ================================
// EXPORT EXCEL JADWAL (SIAP CETAK DENGAN BORDER & JUDUL)
// ================================
function exportCalendarToExcel() {
    const agenda = agendas.find(a => a.id === currentAgendaId);
    if (!agenda) return;

    if (agenda.targets.length === 0) {
        alert("Belum ada target di agenda ini untuk dicetak.");
        return;
    }

    const sortedTargets = [...agenda.targets].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    // 1. Susun Data (Array of Arrays) agar bisa menempatkan Judul di atas
    let wsData = [
        [`JADWAL TARGET: ${agenda.name.toUpperCase()}`], // Baris 1: Judul
        [], // Baris 2: Kosong sebagai jarak
        ["No", "Tanggal", "Target Pekerjaan", "Prioritas", "Checklist", "Catatan"] // Baris 3: Header Tabel
    ];

    // Isi Data Target (Dimulai dari Baris 4)
    sortedTargets.forEach((t, index) => {
        // Gabungkan tanggal dan waktu (jika ada) untuk Excel
        const tanggalDanJam = t.time ? `${formatDate(t.deadline)} (Jam: ${t.time})` : formatDate(t.deadline);
        
        wsData.push([
            index + 1,
            tanggalDanJam,
            t.name,
            t.priority ? "⭐ Ya" : "-",
            "[    ]", // Kotak checklist fisik
            ""       // Catatan kosong
        ]);
    });

    // Buat Worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 2. Gabungkan Cell Judul (Merge dari kolom A sampai F)
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } 
    ];

    // 3. Atur Lebar Kolom agar proporsional di kertas A4
    ws['!cols'] = [
        {wch: 5},   // A: No
        {wch: 22},  // B: Tanggal
        {wch: 40},  // C: Target Pekerjaan
        {wch: 12},  // D: Prioritas
        {wch: 15},  // E: Checklist
        {wch: 25}   // F: Catatan
    ];

    // 4. Atur Tinggi Baris (Biar lega saat ditulis tangan)
    ws['!rows'] = [{hpt: 35}, {hpt: 15}]; // Baris judul (tinggi 35), jarak (tinggi 15)
    for(let i = 2; i < wsData.length; i++) {
        ws['!rows'].push({hpt: 25}); // Baris tabel (tinggi 25)
    }

    // 5. STYLING: Border dan Warna
    const borderStyle = {
        top: { style: "thin", color: { auto: 1 } },
        bottom: { style: "thin", color: { auto: 1 } },
        left: { style: "thin", color: { auto: 1 } },
        right: { style: "thin", color: { auto: 1 } }
    };

    // Menerapkan gaya (style) ke masing-masing cell
    for (let R = 0; R < wsData.length; ++R) {
        for (let C = 0; C < 6; ++C) {
            let cellAddress = XLSX.utils.encode_cell({r: R, c: C});
            
            // Buat cell kosong jika belum ada objeknya (dibutuhkan untuk render border)
            if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

            if (R === 0) {
                // Style Judul Utama
                ws[cellAddress].s = {
                    font: { bold: true, sz: 14, color: { rgb: "FF6B35" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === 2) {
                // Style Header Tabel (Gelap)
                ws[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2D3142" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: borderStyle
                };
            } else if (R > 2) {
                // Style Isi Data Tabel (Rata Kiri untuk Nama Target & Catatan)
                const isLeftAlign = (C === 2 || C === 5);
                ws[cellAddress].s = {
                    alignment: { horizontal: isLeftAlign ? "left" : "center", vertical: "center", wrapText: true },
                    border: borderStyle
                };
            }
        }
    }

    // 6. Buat File dan Download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal Target");
    
    const fileName = `Jadwal_${agenda.name.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ================================
// FITUR ARSIP AGENDA
// ================================
function toggleArchive(event, agendaId) {
    event.stopPropagation();
    const agenda = agendas.find(a => a.id === agendaId);
    if (agenda) {
        // Ubah status arsip (jika true jadi false, jika false jadi true)
        agenda.isArchived = !agenda.isArchived; 
        saveData();
        
        // Pindah halaman secara otomatis
        if (agenda.isArchived) {
            renderAgendas(); 
        } else {
            renderArchive();
        }
    }
}

function renderArchive() {
    document.getElementById("pageTitle").innerText = "Arsip Agenda";
    document.getElementById("pageSubtitle").innerText = "Agenda yang sudah selesai dan disimpan.";
    
    const content = document.getElementById("content");
    content.style.display = "grid"; 
    content.innerHTML = "";

    // Ambil HANYA agenda yang diarsipkan
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
        card.style.opacity = "0.8"; // Tampilan dibuat sedikit transparan agar terasa seperti arsip lama
        card.innerHTML = `
            <div class="agenda-card-header">
                <div>
                    <h2>${agenda.name}</h2>
                    <p style="color: #64748b; font-size:0.85rem; font-weight:600; margin-bottom: 0.3rem;">Hari H: ${formatDate(agenda.date)}</p>
                    <p>${agenda.description || "Tidak ada deskripsi"}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items:flex-start;">
                    <!-- Tombol Restore (Kembalikan) -->
                    <button onclick="toggleArchive(event, '${agenda.id}')" style="background:#EBF5FF; color:#3B82F6; border:none; width:36px; height:36px; border-radius:10px; cursor:pointer;" title="Kembalikan ke Semua Agenda">🔙</button>
                    <!-- Tombol Hapus Permanen -->
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
