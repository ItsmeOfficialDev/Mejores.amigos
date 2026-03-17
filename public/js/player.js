let playerState = {
    currentAnime: null,
    currentEp: 1
};

async function loadAnimeGrid() {
    const res = await fetch('/api/anime');
    const data = await res.json();
    const grid = document.getElementById('anime-grid');
    grid.innerHTML = data.map(a => `
        <div class="anime-card" onclick="selectAnime('${a.title}', ${a.jikanId})">
            <div class="anime-poster-inner"><img src="${a.posterUrl}" style="width:100%;height:100%;object-fit:cover;"></div>
            <div class="anime-card-overlay"><div class="anime-card-title">${a.title}</div></div>
        </div>
    `).join('');
}

async function selectAnime(title, id) {
    const res = await fetch(`/api/anime/${id}`);
    const anime = await res.json();
    playerState.currentAnime = anime;
    showEpisodeSelector(anime);
}

function showEpisodeSelector(anime) {
    const videoArea = document.getElementById('video-area');
    // Assume 24 episodes if not specified, for UI demo
    const totalEps = anime.totalEpisodes || 24;

    let epButtons = '';
    for(let i=1; i<=totalEps; i++) {
        epButtons += `<button class="ep-btn" onclick="playEpisode(${i})">${i}</button>`;
    }

    videoArea.innerHTML = `
        <style>
            .selector-box { padding: 30px; background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-subtle); animation: fadeSlideUp 0.4s; }
            .sel-header { display: flex; gap: 20px; margin-bottom: 30px; }
            .sel-poster { width: 120px; height: 180px; border-radius: 12px; object-fit: cover; }
            .sel-info h2 { font-family: 'Syne'; font-size: 28px; margin-bottom: 10px; color: var(--accent-gold); }
            .ep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto; padding-right: 10px; }
            .ep-btn { background: var(--bg-elevated); border: 1px solid var(--border-subtle); color: #fff; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: bold; transition: 0.2s; }
            .ep-btn:hover { background: var(--accent-gold); color: #000; border-color: transparent; }
        </style>
        <div class="selector-box">
            <div class="sel-header">
                <img src="${anime.posterUrl}" class="sel-poster">
                <div class="sel-info">
                    <h2>${anime.title}</h2>
                    <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.5;">${anime.synopsis.substring(0, 250)}...</p>
                </div>
            </div>
            <div class="section-label" style="margin-bottom:15px;">Select Episode</div>
            <div class="ep-grid">${epButtons}</div>
        </div>
    `;
}

async function playEpisode(epNum) {
    if (!playerState.currentAnime) return;
    const anime = playerState.currentAnime;
    playerState.currentEp = epNum;

    const videoArea = document.getElementById('video-area');
    videoArea.innerHTML = `
        <style>
            .vlc-container { position: relative; background: #000; border-radius: 20px; overflow: hidden; border: 1px solid var(--border-subtle); box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
            .vlc-ui { padding: 25px; display: flex; justify-content: space-between; align-items: center; background: #0a0a0f; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; }
            .vlc-title { font-family: 'Syne'; font-weight: 800; color: var(--accent-gold); font-size: 20px; }
            .vlc-btns button { background: var(--bg-surface); border: 1px solid var(--border-subtle); color: #fff; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: bold; transition: 0.2s; margin-left: 10px; }
            .vlc-btns button:hover { background: var(--accent-gold); color: #000; }
            .vlc-btns button:disabled { opacity: 0.3; cursor: not-allowed; }
            .vlc-loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: 'Syne'; color: var(--accent-gold); font-weight: 800; pointer-events: none; z-index: 5; font-size: 20px; text-shadow: 0 0 20px rgba(245,185,66,0.5); }
            .vlc-back { cursor: pointer; opacity: 0.6; transition: 0.2s; margin-bottom: 15px; display: inline-block; }
            .vlc-back:hover { opacity: 1; color: var(--accent-gold); }
        </style>
        <div class="vlc-back" onclick="showEpisodeSelector(playerState.currentAnime)"><i class="fas fa-chevron-left"></i> Back to Episodes</div>
        <div class="vlc-container">
            <div class="vlc-loading" id="loader">Resolving ani-cli stream...</div>
            <video id="vlc" controls style="width:100%; display:block; aspect-ratio:16/9;"></video>
        </div>
        <div class="vlc-ui">
            <div class="vlc-title">${anime.title} <span style="opacity:0.4; font-size:15px; margin-left:15px;">EP ${epNum}</span></div>
            <div class="vlc-btns">
                <button onclick="playEpisode(${epNum - 1})" ${epNum <= 1 ? 'disabled' : ''}><i class="fas fa-backward"></i></button>
                <button onclick="playEpisode(${epNum + 1})"><i class="fas fa-forward"></i></button>
                <button onclick="vlc.requestFullscreen()"><i class="fas fa-expand"></i></button>
            </div>
        </div>
    `;

    try {
        const res = await fetch(`/api/stream/resolve?title=${encodeURIComponent(anime.title)}&ep=${epNum}`);
        const data = await res.json();
        const v = document.getElementById('vlc');
        window.vlc = v; // Global for buttons
        v.src = data.url;
        v.onplay = () => document.getElementById('loader').style.display = 'none';
        v.play();

        document.onkeydown = (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') { e.preventDefault(); v.paused ? v.play() : v.pause(); }
            if (e.code === 'ArrowRight') v.currentTime += 10;
            if (e.code === 'ArrowLeft') v.currentTime -= 10;
            if (e.code === 'KeyF') v.requestFullscreen();
            if (e.code === 'KeyM') v.muted = !v.muted;
        };
    } catch (e) {
        document.getElementById('loader').textContent = 'Link Resolution Error';
    }
}

document.getElementById('anime-search').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('.anime-card').forEach(c => {
        const t = c.querySelector('.anime-card-title').textContent.toLowerCase();
        c.style.display = t.includes(val) ? 'block' : 'none';
    });
};

window.onload = loadAnimeGrid;
