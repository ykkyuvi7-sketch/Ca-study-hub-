const app = {
    state: {
        view: 'home',
        subject: null,
        chapter: null,
        lectureId: null,
        history: ['home']
    },

    init() {
        this.render();
        this.updateOverallProgress();
    },

    // --- DATA HANDLING ---
    getUserData(id) {
        const data = localStorage.getItem(`ca_hub_${id}`);
        return data ? JSON.parse(data) : { completed: false, notes: "" };
    },

    saveUserData(id, status, notes) {
        localStorage.setItem(`ca_hub_${id}`, JSON.stringify({ completed: status, notes: notes }));
        this.updateOverallProgress();
    },

    // --- NAVIGATION ---
    navigateTo(view, params = {}) {
        this.state.view = view;
        this.state.subject = params.subject || null;
        this.state.chapter = params.chapter || null;
        this.state.lectureId = params.lectureId || null;
        this.state.history.push({ ...this.state });
        this.render();
    },

    goBack() {
        if (this.state.history.length > 1) {
            this.state.history.pop();
            const prevState = this.state.history[this.state.history.length - 1];
            this.state.view = prevState.view;
            this.state.subject = prevState.subject;
            this.state.chapter = prevState.chapter;
            this.state.lectureId = prevState.lectureId;
            this.render();
        }
    },

    // --- RENDERING ---
    render() {
        const container = document.getElementById('main-content');
        const backBtn = document.getElementById('back-btn');
        const title = document.getElementById('page-title');
        
        backBtn.className = this.state.history.length > 1 ? "" : "hidden";

        let html = "";

        if (this.state.view === 'home') {
            title.innerText = "CA Study Hub";
            html = this.renderHome();
        } else if (this.state.view === 'subject') {
            title.innerText = this.state.subject;
            html = this.renderSubject();
        } else if (this.state.view === 'chapter') {
            title.innerText = this.state.chapter;
            html = this.renderChapter();
        } else if (this.state.view === 'lecture') {
            html = this.renderLectureView();
        } else if (this.state.view === 'search') {
            title.innerText = "Search";
            html = this.renderSearchUI();
        }

        container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    renderHome() {
        let cards = `<div class="grid">`;
        subjects.forEach(sub => {
            const count = lecturesData.filter(l => l.subject === sub).length;
            cards += `
                <div class="card" onclick="app.navigateTo('subject', {subject: '${sub}'})">
                    <h3>${sub}</h3>
                    <p style="font-size:0.7rem; color:var(--text-dim); margin-top:5px;">${count} Topics</p>
                </div>
            `;
        });
        cards += `</div>`;
        return cards;
    },

    renderSubject() {
        const chapters = [...new Set(lecturesData
            .filter(l => l.subject === this.state.subject)
            .map(l => l.chapter))];

        return chapters.map(ch => `
            <div class="list-item" onclick="app.navigateTo('chapter', {subject: '${this.state.subject}', chapter: '${ch}'})">
                <div class="list-item-info">
                    <strong>${ch}</strong>
                </div>
                <span>→</span>
            </div>
        `).join('');
    },

    renderChapter() {
        const lectures = lecturesData.filter(l => l.subject === this.state.subject && l.chapter === this.state.chapter);
        
        return lectures.map((l) => {
            const userData = this.getUserData(l.id);
            return `
                <div class="list-item" onclick="app.navigateTo('lecture', {lectureId: '${l.id}'})">
                    <div class="list-item-info">
                        <strong>${l.title}</strong>
                        <span>${l.playlistId ? '📁 Full Playlist' : '🎥 Single Video'} • ${userData.completed ? '✅ Done' : '🕒 Pending'}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderLectureView() {
        const lecture = lecturesData.find(l => l.id === this.state.lectureId);
        const userData = this.getUserData(lecture.id);
        
        // LOGIC: If playlistId exists, use the videoseries URL. Otherwise use standard embed.
        const embedUrl = lecture.playlistId 
            ? `https://www.youtube-nocookie.com/embed/videoseries?list=${lecture.playlistId}&rel=0`
            : `https://www.youtube-nocookie.com/embed/${lecture.youtubeId}?rel=0`;

        document.getElementById('page-title').innerText = lecture.title;

        return `
            <div class="video-container">
                <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="lecture-content">
                <h2>${lecture.title}</h2>
                <p>${lecture.subject} • ${lecture.chapter}</p>
                
                <label>MY NOTES</label>
                <textarea id="note-area" placeholder="Notes for this section..." onblur="app.saveNotes('${lecture.id}')">${userData.notes}</textarea>
                
                <button id="complete-btn" class="complete-btn ${userData.completed ? 'btn-done' : 'btn-not-done'}" 
                    onclick="app.toggleComplete('${lecture.id}')">
                    ${userData.completed ? 'Section Completed' : 'Mark Section as Completed'}
                </button>
            </div>
        `;
    },

    renderSearchUI() {
        return `
            <div class="search-container">
                <input type="text" id="search-input" autofocus placeholder="Search topics..." oninput="app.handleSearch(this.value)">
                <div id="search-results" style="margin-top: 10px;"></div>
            </div>
        `;
    },

    handleSearch(query) {
        const resultsDiv = document.getElementById('search-results');
        if (!query || query.length < 2) { resultsDiv.innerHTML = ""; return; }
        
        const filtered = lecturesData.filter(l => 
            l.title.toLowerCase().includes(query.toLowerCase()) || 
            l.chapter.toLowerCase().includes(query.toLowerCase())
        );

        resultsDiv.innerHTML = filtered.map(l => `
            <div class="list-item" onclick="app.navigateTo('lecture', {lectureId: '${l.id}'})">
                <div class="list-item-info">
                    <strong>${l.title}</strong>
                    <span>${l.subject}</span>
                </div>
            </div>
        `).join('');
    },

    toggleComplete(id) {
        const userData = this.getUserData(id);
        const notes = document.getElementById('note-area').value;
        this.saveUserData(id, !userData.completed, notes);
        this.render();
    },

    saveNotes(id) {
        const notes = document.getElementById('note-area').value;
        const userData = this.getUserData(id);
        this.saveUserData(id, userData.completed, notes);
    },

    updateOverallProgress() {
        const total = lecturesData.length;
        if (total === 0) return;
        let completed = 0;
        lecturesData.forEach(l => {
            if (this.getUserData(l.id).completed) completed++;
        });
        const percent = Math.round((completed / total) * 100);
        document.getElementById('overall-fill').style.width = percent + "%";
        document.getElementById('overall-percent').innerText = percent + "%";
    }
};

app.init();
