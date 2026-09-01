let agendas = JSON.parse(localStorage.getItem("targetManager")) || [];
let currentAgendaId = null;

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

// ================================
// DASHBOARD (PENGINGAT)
// ================================
function renderDashboard() {
    document.getElementById("pageTitle").innerText = "Dashboard Pengingat";
    document.getElementById("pageSubtitle").innerText = "Ringkasan agenda dan target terdekat Anda.";
    
    const content = document.getElementById("content");
    
    let upcomingAgendas = [];
    let pendingTargets = [];
    
    const today = new Date();
    today.setHours(0,0,0,0);

    agendas.forEach(a => {
        // Cek Agenda Terdekat
        if(a.date) {
            const aDate = new Date(a.date);
            if(aDate >= today) upcomingAgendas.push(a);
        }
        // Cek Target Terdekat yang belum selesai
        a.targets.forEach(t => {
            if(!t.completed && t.deadline) {
                const tDate = new Date(t.deadline);
                if(tDate >= today) pendingTargets.push({...t, agendaName: a.name, agendaId: a.id});
            }
        });
    });

    // Urutkan dari yang paling dekat dengan hari ini
    upcomingAgendas.sort((a,b) => new Date(a.date) - new Date(b.date));
    pendingTargets.sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

    // Ambil 5 teratas
    upcomingAgendas = upcomingAgendas.slice(0, 5);
    pendingTargets = pendingTargets.slice(0, 5);

    content.style.display = "block"; // Hapus grid agar full width
    
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            
            <!-- WIDGET AGENDA MENDESAK -->
            <div style="background: #fff; padding: 2rem; border-radius: 24px; border: 1px solid #F4F5F7; box-shadow: 0 10px 40px rgba(0,0,0,0.03);">
                <h2 style="margin-bottom: 1.5rem; font-size: 1.3rem; color: #111;">📅 Agenda Terdekat (Hari H)</h2>
                ${upcomingAgendas.length === 0 ? '<p style="color:#9094A6; font-size: 0.95rem;">Tidak ada agenda di masa mendatang.</p>' : ''}
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${upcomingAgendas.map(a => `
                        <div style="padding: 1.2rem; background: #FAFBFC; border-radius: 16px; border: 1px solid #E5E7EB; cursor:pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#FF6B35'" onmouseout="this.style.borderColor='#E5E7EB'" onclick="openAgenda('${a.id}')">
                            <h3 style="font-size: 1.1rem; color: #2D3142; margin-bottom: 0.3rem;">${a.name}</h3>
                            <p style="font-size: 0.9rem; color: #FF6B35; font-weight: 600;">Hari H: ${formatDate(a.date)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- WIDGET TARGET MENDESAK -->
            <div style="background: #fff; padding: 2rem; border-radius: 24px; border: 1px solid #F4F5F7; box-shadow: 0 10px 40px rgba(0,0,0,0.03);">
                <h2 style="margin-bottom: 1.5rem; font-size: 1.3rem; color: #111;">🎯 Deadline Target Terdekat</h2>
                ${pendingTargets.length === 0 ? '<p style="color:#9094A6; font-size: 0.95rem;">Tidak ada deadline target dalam waktu dekat.</p>' : ''}
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${pendingTargets.map(t => `
                        <div style="padding: 1.2rem; background: #FAFBFC; border-radius: 16px; border: 1px solid #E5E7EB;">
                            <h3 style="font-size: 1.1rem; color: #2D3142; margin-bottom: 0.3rem;">${t.name}</h3>
                            <p style="font-size: 0.85rem; color: #9094A6; margin-bottom: 0.3rem;">📁 Agenda: ${t.agendaName}</p>
                            <p style="font-size: 0.9rem; color: #FF4D4D; font-weight: 600;">Batas: ${formatDate(t.deadline)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

        </div>
    `;
}


// ================================
// RENDER DAFTAR AGENDA
// ================================
function renderAgendas() {
    document.getElementById("pageTitle").innerText = "Semua Agenda";
    document.getElementById("pageSubtitle").innerText = "Kelola agenda dan target pekerjaan Anda.";
    const content = document.getElementById("content");
    content.style.display = "grid"; // Kembalikan ke format Grid
    content.innerHTML = "";

    if (agendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada agenda</h2><p>Tambahkan agenda pertama Anda.</p></div>`;
        return;
    }

    agendas.forEach(agenda => {
        const total = agenda.targets.length;
        const completed = agenda.targets.filter(t => t.completed).length;
        const priority = agenda.targets.filter(t => t.priority).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

        const card = document.createElement("div");
        card.className = "agenda-card";
        card.innerHTML = `
            <div class="agenda-card-header">
                <div>
                    <h2>${agenda.name}</h2>
                    <p style="color: #FF6B35; font-size:0.85rem; font-weight:600; margin-bottom: 0.3rem;">Hari H: ${formatDate(agenda.date)}</p>
                    <p>${agenda.description || "Tidak ada deskripsi"}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items:flex-start;">
                    <button class="edit-btn" onclick="openEditAgenda(event, '${agenda.id}')" style="background:#FFF0E5; color:#FF6B35; border:none; width:36px; height:36px; border-radius:10px; cursor:pointer;">✏️</button>
                    <button class="delete-btn" onclick="deleteAgenda(event, '${agenda.id}')">🗑</button>
                </div>
            </div>
            <div class="agenda-info">
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
// OPEN DETAIL AGENDA
// ================================
function openAgenda(id) {
    currentAgendaId = id;
    const agenda = agendas.find(item => item.id === id);
    if (!agenda) return;

    document.getElementById("pageTitle").innerText = agenda.name;
    document.getElementById("pageSubtitle").innerText = "Hari H: " + formatDate(agenda.date);
    
    const content = document.getElementById("content");
    content.style.display = "block"; // Reset ke block untuk halaman detail
    content.innerHTML = `
        <div class="back-button">
            <button onclick="renderAgendas()">← Kembali ke Daftar Agenda</button>
        </div>
        <div class="agenda-detail">
            <div class="detail-header">
                <div>
                    <h1>${agenda.name}</h1>
                    <p>${agenda.description || "Tidak ada deskripsi"}</p>
                </div>
                <button class="btn-primary" onclick="openTargetModal('${agenda.id}')">+ Tambah Target</button>
            </div>
            <div id="targetList"></div>
        </div>
    `;
    renderTargets(agenda);
}


// ================================
// RENDER TARGET DALAM AGENDA
// ================================
function renderTargets(agenda) {
    const list = document.getElementById("targetList");
    if (!list) return;
    list.innerHTML = "";

    if (agenda.targets.length === 0) {
        list.innerHTML = `<div class="empty-state"><h3>Belum ada target</h3><p>Tambahkan target untuk agenda ini.</p></div>`;
        return;
    }

    agenda.targets.forEach(target => {
        const item = document.createElement("div");
        item.className = "target-item";
        item.innerHTML = `
            <div class="target-left">
                <input type="checkbox" ${target.completed ? "checked" : ""} onchange="toggleTarget('${agenda.id}', '${target.id}')">
                <div>
                    <h3 class="${target.completed ? "completed" : ""}">${target.name}</h3>
                    <p>Deadline: ${formatDate(target.deadline)}</p>
                </div>
            </div>
            <div class="target-right">
                ${target.priority ? `<span class="priority-badge">⭐ Prioritas</span>` : `<button class="priority-btn" onclick="togglePriority('${agenda.id}', '${target.id}')">☆ Prioritas</button>`}
                
                <!-- Tombol Edit & Delete Target -->
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
// HALAMAN PRIORITAS & SELESAI
// ================================
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
    
    // Tombol Export Excel khusus tab Prioritas
    let exportBtn = "";
    if (type === 'priority') {
        exportBtn = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
                <button class="btn-primary" onclick="exportPriorityToExcel()" style="background-color: #217346; box-shadow: 0 6px 20px rgba(33, 115, 70, 0.3);">
                    📊 Export Excel
                </button>
            </div>
        `;
    }

    content.innerHTML = exportBtn + `<div class="target-list-page" style="display:flex; flex-direction:column; gap:1rem;"></div>`;
    const container = content.querySelector(".target-list-page");
    
    let filteredTargets = [];

    // Mengumpulkan target berdasarkan tab yang dibuka
    agendas.forEach(agenda => {
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
        container.innerHTML += `
            <div class="target-item">
                <div class="target-left">
                    <input type="checkbox" ${target.completed ? "checked" : ""} onchange="toggleTarget('${target.agendaId}', '${target.id}', '${type}')">
                    <div>
                        <h3 class="${target.completed ? "completed" : ""}">${target.name}</h3>
                        <p>📁 ${target.agendaName} | Deadline: ${formatDate(target.deadline)}</p>
                    </div>
                </div>
                ${target.priority ? `<span class="priority-badge">⭐ Prioritas</span>` : ''}
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


// FORM TARGET
document.getElementById("targetForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const agendaId = document.getElementById("targetAgendaId").value;
    const targetId = document.getElementById("editTargetId").value;
    const agenda = agendas.find(a => a.id === agendaId);
    
    if (!agenda) return;

    const name = document.getElementById("targetName").value;
    const deadline = document.getElementById("targetDeadline").value;
    const priority = document.getElementById("targetPriority").checked;

    if(targetId) {
        // Mode Edit
        const target = agenda.targets.find(t => t.id === targetId);
        target.name = name;
        target.deadline = deadline;
        target.priority = priority;
    } else {
        // Mode Tambah Baru
        agenda.targets.push({ id: Date.now().toString(), name, deadline, priority, completed: false });
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
    document.getElementById("targetModalTitle").innerText = "Tambah Target";
    document.getElementById("targetModal").classList.remove("hidden");
}
function closeTargetModal() {
    document.getElementById("targetModal").classList.add("hidden");
}


// ================================
// TOGGLE TARGET (DENGAN RE-RENDER TAB TERKAIT)
// ================================
function toggleTarget(agendaId, targetId, currentView = 'agenda') {
    const agenda = agendas.find(a => a.id === agendaId);
    const target = agenda.targets.find(t => t.id === targetId);
    target.completed = !target.completed;
    saveData();
    
    if(['priority', 'completed', 'all-targets'].includes(currentView)) {
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
    });
});


// ================================
// INITIAL LOAD
// ================================
renderDashboard();

// ================================
// EXPORT EXCEL TARGET PRIORITAS
// ================================
function exportPriorityToExcel() {
    // 1. Kumpulkan data mentah terlebih dahulu
    let priorityDataRaw = [];

    agendas.forEach(agenda => {
        agenda.targets.forEach(target => {
            if (target.priority) {
                priorityDataRaw.push({
                    agendaName: agenda.name,
                    agendaDate: agenda.date,
                    targetName: target.name,
                    targetDeadline: target.deadline,
                    completed: target.completed
                });
            }
        });
    });

    if (priorityDataRaw.length === 0) {
        alert("Tidak ada target prioritas untuk diekspor.");
        return;
    }

    // 2. --- LOGIKA PENGURUTAN TANGGAL UNTUK EXCEL ---
    // Mengurutkan berdasarkan Target Deadline (dari yang terdekat)
    priorityDataRaw.sort((a, b) => new Date(a.targetDeadline) - new Date(b.targetDeadline));

    // 3. Format ulang data mentah yang sudah terurut menjadi format rapi untuk Excel
    let priorityData = priorityDataRaw.map((data, index) => ({
        "No": index + 1,
        "Nama Agenda": data.agendaName,
        "Hari H Agenda": formatDate(data.agendaDate),
        "Nama Target": data.targetName,
        "Deadline Target": formatDate(data.targetDeadline),
        "Status": data.completed ? "Selesai" : "Belum Selesai"
    }));

    // 4. Ubah data ke format Worksheet (SheetJS)
    const ws = XLSX.utils.json_to_sheet(priorityData);

    // 5. Atur lebar kolom agar rapi saat dibuka di Excel
    const wscols = [
        {wch: 5},  // No
        {wch: 25}, // Nama Agenda
        {wch: 20}, // Hari H
        {wch: 35}, // Nama Target
        {wch: 20}, // Deadline Target
        {wch: 15}  // Status
    ];
    ws['!cols'] = wscols;

    // 6. Buat file Excel dan Trigger Download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Prioritas");
    XLSX.writeFile(wb, "Rekap_Target_Prioritas.xlsx");
}

// ================================
// HALAMAN TIMELINE AGENDA
// ================================
function renderTimeline() {
    document.getElementById("pageTitle").innerText = "Timeline Agenda";
    document.getElementById("pageSubtitle").innerText = "Visualisasi alur waktu agenda Anda. Klik lingkaran untuk menceklis agenda.";
    
    const content = document.getElementById("content");
    content.style.display = "block";

    // Urutkan agenda berdasarkan tanggal (terdekat ke terjauh)
    const sortedAgendas = [...agendas].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : Infinity;
        const dateB = b.date ? new Date(b.date).getTime() : Infinity;
        return dateA - dateB;
    });

    if (sortedAgendas.length === 0) {
        content.innerHTML = `<div class="empty-state"><h2>Belum ada agenda</h2><p>Tambahkan agenda terlebih dahulu.</p></div>`;
        return;
    }

    // CSS Khusus untuk Timeline (Disuntikkan langsung agar mudah)
    const timelineCSS = `
        <style>
            .timeline-container {
                display: flex;
                overflow-x: auto;
                padding: 40px 20px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                margin-top: 20px;
            }
            .timeline-item {
                min-width: 180px;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
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
            .timeline-item:last-child .timeline-line {
                display: none; /* Hilangkan garis di item terakhir */
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
            /* Scrollbar styling */
            .timeline-container::-webkit-scrollbar { height: 8px; }
            .timeline-container::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
        </style>
    `;

    let timelineHTML = `<div class="timeline-container">`;

    sortedAgendas.forEach((agenda, index) => {
        const isCompleted = agenda.timelineCompleted ? true : false;
        
        // Format Tanggal (contoh: 20 Jan)
        let dateStr = "Tanpa Tanggal";
        if (agenda.date) {
            dateStr = new Date(agenda.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        }

        timelineHTML += `
            <div class="timeline-item ${isCompleted ? 'completed' : ''}">
                <div class="timeline-date">${dateStr}</div>
                <div class="timeline-node-wrapper">
                    <div class="timeline-line"></div>
                    <!-- Node Checklist yang bisa diklik -->
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
