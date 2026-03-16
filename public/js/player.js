function loadAnimeGrid() {
    fetch('/api/anime')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById('anime-grid');
            grid.innerHTML = data.map(anime => `
                <div class="anime-card" onclick="selectAnime(${anime.jikanId})">
                    <div class="anime-poster-inner">
                        <img src="${anime.posterUrl}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="anime-card-overlay">
                        <div class="anime-card-title">${anime.title}</div>
                    </div>
                </div>
            `).join('');
        });
}

function selectAnime(id) {
    fetch(`/api/anime/${id}`)
        .then(res => res.json())
        .then(anime => {
            const videoArea = document.getElementById('video-area');
            const ep = anime.seasons[0]?.episodes[0];

            if (ep) {
                videoArea.innerHTML = `
                    <video id="main-player" controls style="width:100%; aspect-ratio:16/9;" autoplay>
                        <source src="/api/stream/${ep.telegramFileId}" type="video/mp4">
                    </video>
                    <div style="padding: 15px;">
                        <h3 style="margin:0">${anime.title}</h3>
                        <p style="color:var(--text-secondary); font-size:13px; margin-top:5px;">${anime.synopsis.substring(0, 200)}...</p>
                    </div>
                `;
            }
        });
}

document.getElementById('anime-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.anime-card');
    cards.forEach(card => {
        const title = card.querySelector('.anime-card-title').textContent.toLowerCase();
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
});

window.addEventListener('load', loadAnimeGrid);
