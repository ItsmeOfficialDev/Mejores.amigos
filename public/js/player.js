let playerState = {
    currentAnime: null
};

async function loadAnimeGrid() {
    const res = await fetch('/api/anime');
    const data = await res.json();
    const grid = document.getElementById('anime-grid');
    grid.innerHTML = data.map(a => `
        <div class="anime-card" onclick="startStreaming('${a.jikanId}')">
            <div class="anime-poster-inner"><img src="${a.posterUrl}" style="width:100%;height:100%;object-fit:cover;"></div>
            <div class="anime-card-overlay"><div class="anime-card-title">${a.title}</div></div>
        </div>
    `).join('');
}

async function startStreaming(jikanId) {
    const res = await fetch(`/api/anime/${jikanId}`);
    playerState.currentAnime = await res.json();
    new MejoresPlayer('video-area', { anime: playerState.currentAnime, ep: 1 });
}

class MejoresPlayer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.anime = options.anime;
        this.ep = options.ep || 1;
        this.player = null;
        this.init();
    }

    async init() {
        this.renderLayout();
        await this.loadStream();
        this.setupKeyboardShortcuts();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="heaven-player-wrapper">
                <div class="vlc-loading" id="p-loader">Resolving Ani-Cli Links...</div>
                <video id="h-video" class="vlc-style-video" playsinline></video>
                <div class="h-controls">
                    <div class="h-progress-bar" id="h-progress"><div class="h-progress-fill" id="h-fill"></div></div>
                    <div class="h-btns">
                        <button id="h-play"><i class="fas fa-play"></i></button>
                        <span id="h-time">00:00 / 00:00</span>
                        <div class="h-spacer"></div>
                        <select id="h-quality" class="h-select"></select>
                        <select id="h-audio" class="h-select"><option>Japanese</option><option>English (Dub)</option></select>
                        <button id="h-fullscreen"><i class="fas fa-expand"></i></button>
                    </div>
                </div>
            </div>
            <div class="p-details">
                <h2 style="font-family:Syne; color:var(--accent-gold);">${this.anime.title}</h2>
                <p style="color:var(--text-secondary); font-size:14px;">Episode ${this.ep}</p>
                <div class="p-ep-nav">
                    <button onclick="changeEpisode(${this.ep - 1})" ${this.ep <= 1 ? 'disabled' : ''}>PREV</button>
                    <button onclick="changeEpisode(${this.ep + 1})">NEXT</button>
                </div>
                <div style="margin-top:20px; font-size:13px; color:var(--text-muted); line-height:1.6;">${this.anime.synopsis}</div>
            </div>
        `;
        this.player = document.getElementById('h-video');
        this.setupEvents();
    }

    async loadStream() {
        try {
            const res = await fetch(`/api/anime/stream/${this.anime.jikanId}/${this.ep}`);
            const links = await res.json();
            const qSelect = document.getElementById('h-quality');
            qSelect.innerHTML = links.qualities.map(q => `<option value="${q.url}">${q.quality}</option>`).join('');
            this.player.src = links.qualities[0].url;
            this.player.oncanplay = () => document.getElementById('p-loader').style.display = 'none';
            this.player.play();
        } catch (e) {
            document.getElementById('p-loader').textContent = 'Scraper Link Error';
        }
    }

    setupEvents() {
        const playBtn = document.getElementById('h-play');
        playBtn.onclick = () => this.player.paused ? (this.player.play(), playBtn.innerHTML='<i class="fas fa-pause"></i>') : (this.player.pause(), playBtn.innerHTML='<i class="fas fa-play"></i>');
        this.player.ontimeupdate = () => {
            const percent = (this.player.currentTime / this.player.duration) * 100;
            document.getElementById('h-fill').style.width = percent + '%';
            document.getElementById('h-time').textContent = `${this.fmt(this.player.currentTime)} / ${this.fmt(this.player.duration || 0)}`;
            if (Math.floor(this.player.currentTime) % 10 === 0) this.save();
        };
        document.getElementById('h-progress').onclick = (e) => {
            const rect = e.target.getBoundingClientRect();
            this.player.currentTime = ((e.clientX - rect.left) / rect.width) * this.player.duration;
        };
        document.getElementById('h-quality').onchange = (e) => {
            const t = this.player.currentTime;
            this.player.src = e.target.value;
            this.player.currentTime = t;
            this.player.play();
        };
        document.getElementById('h-fullscreen').onclick = () => this.player.requestFullscreen();
    }

    setupKeyboardShortcuts() {
        document.onkeydown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') { e.preventDefault(); document.getElementById('h-play').click(); }
            if (e.code === 'ArrowRight') this.player.currentTime += 10;
            if (e.code === 'ArrowLeft') this.player.currentTime -= 10;
        };
    }

    fmt(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    }

    async save() {
        fetch('/api/user/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animeId: this.anime.jikanId, title: this.anime.title, ep: this.ep, ts: this.player.currentTime, dur: this.player.duration })
        });
    }
}

function changeEpisode(n) {
    new MejoresPlayer('video-area', { anime: playerState.currentAnime, ep: n });
}

window.addEventListener('load', loadAnimeGrid);
