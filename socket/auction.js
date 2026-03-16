const PLAYER_LIST = [
    { name: "Emiliano Martinez", position: "GK" }, { name: "Victor Valdes", position: "GK" },
    { name: "Manuel Neuer", position: "GK" }, { name: "Ter Stegen", position: "GK" },
    { name: "Oliver Kahn", position: "GK" }, { name: "Thibaut Courtois", position: "GK" },
    { name: "Dida", position: "GK" }, { name: "Gigi Donnarumma", position: "GK" },
    { name: "Gigi Buffon", position: "GK" }, { name: "Allison Becker", position: "GK" },
    { name: "Ederson", position: "GK" }, { name: "David De Gea", position: "GK" },
    { name: "Van Der Sar", position: "GK" }, { name: "David Raya", position: "GK" },
    { name: "Iker Casillas", position: "GK" }, { name: "Sommer", position: "GK" },
    { name: "Yasin Bonou", position: "GK" }, { name: "Livakovich", position: "GK" },
    { name: "Hugo Loris", position: "GK" }, { name: "Mike Maignan", position: "GK" },
    { name: "Lev Yashin", position: "GK" }, { name: "Peter Schemichel", position: "GK" },
    { name: "Dinor Zoff", position: "GK" }, { name: "Peter Cech", position: "GK" },
    { name: "Jan Oblak", position: "GK" }, { name: "Gregor Kobel", position: "GK" },
    { name: "Unai Simon", position: "GK" }, { name: "Jordan Pickford", position: "GK" },
    { name: "Schzency", position: "GK" }, { name: "Diago Costa", position: "GK" },
    { name: "Andre Onana", position: "GK" }, { name: "Kepa", position: "GK" },
    { name: "Lenin", position: "GK" }, { name: "Robert Sanchez", position: "GK" },
    { name: "Sachin Suresh", position: "GK" }, { name: "Gordon Banks", position: "GK" },

    { name: "Harry Maguire", position: "DEF" }, { name: "John Stones", position: "DEF" },
    { name: "Kyle Walker", position: "DEF" }, { name: "Luke Shaw", position: "DEF" },
    { name: "Ashley Cole", position: "DEF" }, { name: "Trent Alexander Arnold", position: "DEF" },
    { name: "Carlos Alberto", position: "DEF" }, { name: "Roberto Carlos", position: "DEF" },
    { name: "Cafu", position: "DEF" }, { name: "Marquinhos", position: "DEF" },
    { name: "Saliba", position: "DEF" }, { name: "Thiago Hernandez", position: "DEF" },
    { name: "Raphael Varane", position: "DEF" }, { name: "Upamecano", position: "DEF" },
    { name: "Joules Kounde", position: "DEF" }, { name: "Thuram", position: "DEF" },
    { name: "Marscel Dessaily", position: "DEF" }, { name: "Carlos Puyol", position: "DEF" },
    { name: "Jordi Alba", position: "DEF" }, { name: "Gerrard Pique", position: "DEF" },
    { name: "Sergio Ramos", position: "DEF" }, { name: "Pepe", position: "DEF" },
    { name: "Jaoa Cancelo", position: "DEF" }, { name: "Paolo Maldini", position: "DEF" },
    { name: "Fabio Cannavaro", position: "DEF" }, { name: "Allesandro Nesta", position: "DEF" },
    { name: "Franco Baresi", position: "DEF" }, { name: "Giorgio Chellini", position: "DEF" },
    { name: "Allesandro CoastCurta", position: "DEF" }, { name: "Leornado Bonnucci", position: "DEF" },
    { name: "Virgil Vandijk", position: "DEF" }, { name: "De Ligt", position: "DEF" },
    { name: "Christian Romero", position: "DEF" }, { name: "Franz Beckanbaur", position: "DEF" },
    { name: "Philip Lahm", position: "DEF" }, { name: "Marcelo", position: "DEF" },
    { name: "Dani Alves", position: "DEF" }, { name: "Stam", position: "DEF" },
    { name: "Rio Ferdinard", position: "DEF" }, { name: "Antonine Rudigier", position: "DEF" },
    { name: "Bobby Moor", position: "DEF" }, { name: "Thiago Silva", position: "DEF" },
    { name: "Matt Hummels", position: "DEF" }, { name: "Allen Hansen", position: "DEF" },
    { name: "John Terry", position: "DEF" }, { name: "Janis Zannetti", position: "DEF" },
    { name: "Donald Koeman", position: "DEF" }, { name: "Andy Robertson", position: "DEF" },

    { name: "Kroos", position: "MID" }, { name: "Modric", position: "MID" },
    { name: "Casemeiro", position: "MID" }, { name: "Kaka", position: "MID" },
    { name: "Guti", position: "MID" }, { name: "Griezmann", position: "MID" },
    { name: "Iniesta", position: "MID" }, { name: "Xavi", position: "MID" },
    { name: "Xabi", position: "MID" }, { name: "Busquets", position: "MID" },
    { name: "Rice", position: "MID" }, { name: "Palmer", position: "MID" },
    { name: "Kevin De Bruyne", position: "MID" }, { name: "Pogba", position: "MID" },
    { name: "Pirlo", position: "MID" }, { name: "Piero", position: "MID" },
    { name: "Gattuso", position: "MID" }, { name: "De Jong", position: "MID" },
    { name: "Rakitic", position: "MID" }, { name: "Pele", position: "MID" },
    { name: "Maradona", position: "MID" }, { name: "Ozil", position: "MID" },
    { name: "Gavi", position: "MID" }, { name: "Pedri", position: "MID" },
    { name: "Rodri", position: "MID" }, { name: "Bellingam", position: "MID" },
    { name: "Beckham", position: "MID" }, { name: "Zidane", position: "MID" },
    { name: "Mac Allister", position: "MID" }, { name: "Mashcerano", position: "MID" },
    { name: "Mathaus", position: "MID" }, { name: "Steven Gerrard", position: "MID" },
    { name: "Lampard", position: "MID" }, { name: "Zico", position: "MID" },
    { name: "Baggio", position: "MID" }, { name: "Viera", position: "MID" },
    { name: "Scholes", position: "MID" }, { name: "Kante", position: "MID" },
    { name: "Verratti", position: "MID" }, { name: "Juninho", position: "MID" },
    { name: "Platini", position: "MID" }, { name: "Cruyff", position: "MID" },
    { name: "Gullit", position: "MID" }, { name: "Stefano", position: "MID" },
    { name: "Rijkaard", position: "MID" }, { name: "Makalele", position: "MID" },
    { name: "Socrates", position: "MID" }, { name: "Keane", position: "MID" },
    { name: "Toure", position: "MID" }, { name: "Valverade", position: "MID" },
    { name: "Odegaard", position: "MID" }, { name: "Muller", position: "MID" },
    { name: "Sneijder", position: "MID" }, { name: "Deco", position: "MID" },
    { name: "Giggs", position: "MID" }, { name: "Okocha", position: "MID" },

    { name: "Raul", position: "FWD" }, { name: "Totti", position: "FWD" },
    { name: "Sanchez", position: "FWD" }, { name: "Berkamp", position: "FWD" },
    { name: "David Villa", position: "FWD" }, { name: "Kane", position: "FWD" },
    { name: "Richarlison", position: "FWD" }, { name: "Mbeumo", position: "FWD" },
    { name: "Bruno", position: "FWD" }, { name: "Rivaldo", position: "FWD" },
    { name: "Mbappe", position: "FWD" }, { name: "Haaland", position: "FWD" },
    { name: "Yamal", position: "FWD" }, { name: "Ronaldo Nazario", position: "FWD" },
    { name: "Ronaldo", position: "FWD" }, { name: "Son", position: "FWD" },
    { name: "Lewandowski", position: "FWD" }, { name: "Zlatan", position: "FWD" },
    { name: "Ronaldinho", position: "FWD" }, { name: "Neymar", position: "FWD" },
    { name: "Salah", position: "FWD" }, { name: "Bale", position: "FWD" },
    { name: "Messi", position: "FWD" }, { name: "Gerd Muller", position: "FWD" },
    { name: "Henry", position: "FWD" }, { name: "Puskas Cole", position: "FWD" },
    { name: "Van Basten", position: "FWD" }, { name: "Romario", position: "FWD" },
    { name: "Suarez", position: "FWD" }, { name: "Best", position: "FWD" },
    { name: "Batistuta", position: "FWD" }, { name: "Ruminiegge", position: "FWD" },
    { name: "Schevchenko", position: "FWD" }, { name: "Nistelrooy", position: "FWD" },
    { name: "Eto'o", position: "FWD" }, { name: "Drogba", position: "FWD" },
    { name: "Benzema", position: "FWD" }, { name: "Rooney", position: "FWD" },
    { name: "Fernando Torres", position: "FWD" }, { name: "Van Persie", position: "FWD" },
    { name: "Robben", position: "FWD" }, { name: "Ribery", position: "FWD" },
    { name: "Owen", position: "FWD" }, { name: "Zola", position: "FWD" },
    { name: "Hazard", position: "FWD" }, { name: "Mane", position: "FWD" },
    { name: "Di Maria", position: "FWD" }, { name: "Inzaghi", position: "FWD" },
    { name: "Crespo", position: "FWD" }, { name: "Sunil Chettri", position: "FWD" },
    { name: "Siva", position: "FWD" }
];

const MAX_POS = { GK: 3, DEF: 5, MID: 5, FWD: 5 };

module.exports = (io) => {
    const ns = io.of('/auction');

    let players = [];
    let auctionQueue = [];
    let gameStatus = 'lobby';
    let currentIdx = -1;
    let currentBid = 5;
    let currentBidder = null;
    let timerEnd = 0;

    function shuffle(a) { return a.sort(() => Math.random() - 0.5); }

    function broadcast() {
        ns.emit('stateUpdate', {
            gameStatus,
            currentBid,
            currentBidder,
            timerEnd,
            currentPlayer: auctionQueue[currentIdx] || null,
            players: players.map(p => ({ name: p.name, isAdmin: p.isAdmin, budget: p.budget, teamSize: p.team.length }))
        });
    }

    ns.on('connection', (socket) => {
        socket.on('joinAuction', ({ name, isAdmin }) => {
            let p = players.find(x => x.name === name);
            if (!p) {
                p = { id: socket.id, name, isAdmin, budget: 1500, team: [], positions: { GK: 0, DEF: 0, MID: 0, FWD: 0 } };
                players.push(p);
            } else p.id = socket.id;
            broadcast();
        });

        socket.on('startAuction', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby') {
                auctionQueue = [
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'GK')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'DEF')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'MID')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'FWD'))
                ];
                gameStatus = 'active';
                currentIdx = 0;
                currentBid = 5;
                currentBidder = null;
                timerEnd = Date.now() + 10000;
                broadcast();
            }
        });

        socket.on('bid', (amount) => {
            const p = players.find(x => x.id === socket.id);
            if (!p || gameStatus !== 'active' || amount <= currentBid || amount % 5 !== 0) return;
            if (p.name === currentBidder) return;
            const player = auctionQueue[currentIdx];
            if (p.positions[player.position] >= MAX_POS[player.position]) return;
            if (p.budget - amount < (18 - p.team.length) * 10) return;

            currentBid = amount;
            currentBidder = p.name;
            timerEnd = Date.now() + 10000;
            broadcast();
        });

        socket.on('dismiss', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && !currentBidder) {
                currentIdx++;
                if (currentIdx >= auctionQueue.length) gameStatus = 'finished';
                else { currentBid = 5; currentBidder = null; timerEnd = Date.now() + 10000; }
                broadcast();
            }
        });

        socket.on('emergencyEnd', (confirm) => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && confirm === 'END') {
                const unsold = auctionQueue.slice(currentIdx);
                for (const player of unsold) {
                    const eligible = shuffle(players.filter(x =>
                        x.team.length < 18 &&
                        x.budget >= 10 &&
                        x.positions[player.position] < MAX_POS[player.position]
                    ));
                    if (eligible.length > 0) {
                        const winner = eligible[0];
                        winner.budget -= 10;
                        winner.team.push({ ...player, price: 10, random: true });
                        winner.positions[player.position]++;
                    }
                }
                gameStatus = 'finished';
                broadcast();
            }
        });
    });

    setInterval(() => {
        if (gameStatus === 'active' && Date.now() > timerEnd) {
            if (currentBidder) {
                const winner = players.find(x => x.name === currentBidder);
                const player = auctionQueue[currentIdx];
                winner.budget -= currentBid;
                winner.team.push({ ...player, price: currentBid });
                winner.positions[player.position]++;
            }
            currentIdx++;
            if (currentIdx >= auctionQueue.length) gameStatus = 'finished';
            else { currentBid = 5; currentBidder = null; timerEnd = Date.now() + 10000; }
            broadcast();
        }
    }, 1000);
};
