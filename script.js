// ====== State ======
let players = [];
let cards = [];
let totalTurns = 3;

// Game progress state
let currentTurn = 1;
let turnPlayers = [];
let currentPlayerIndex = 0;

let currentIconBase64 = null;
let currentCardBase64 = null;

// ====== DOM Elements ======
const screenTitle = document.getElementById('screen-title');
const screenSetup = document.getElementById('screen-setup');
const screenGame = document.getElementById('screen-game');
const screenResult = document.getElementById('screen-result');

const btnToSetup = document.getElementById('btn-to-setup');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');

// Cards
const uploadCardIcon = document.getElementById('upload-card-icon');
const previewCardImage = document.getElementById('preview-card-image');
const uploadCardPlaceholder = document.getElementById('upload-card-placeholder');
const btnAddCard = document.getElementById('btn-add-card');
const cardList = document.getElementById('card-list');

// Players
const inputPlayerName = document.getElementById('input-player-name');
const uploadPlayerIcon = document.getElementById('upload-player-icon');
const previewPlayerImage = document.getElementById('preview-player-image');
const uploadPlayerPlaceholder = document.getElementById('upload-player-placeholder');
const btnAddPlayer = document.getElementById('btn-add-player');
const playerList = document.getElementById('player-list');

// Turns
const inputTurns = document.getElementById('input-turns');

// Game Board
const turnDisplay = document.getElementById('turn-display');
const targetsLayer = document.getElementById('targets-layer');
const draggablesLayer = document.getElementById('draggables-layer');
const feedbackMessage = document.getElementById('feedback-message');
const rankingContainer = document.getElementById('ranking-container');

// ====== Sound Manager ======
const SoundManager = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playTone(freq, type, duration, vol = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playTurn() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        setTimeout(() => this.playTone(523.25, 'sine', 0.5, 0.1), 0);
        setTimeout(() => this.playTone(659.25, 'sine', 0.5, 0.1), 100);
        setTimeout(() => this.playTone(783.99, 'sine', 0.8, 0.1), 200);
    },
    playCorrect() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        setTimeout(() => this.playTone(880, 'sine', 0.3, 0.15), 0);
        setTimeout(() => this.playTone(1760, 'sine', 0.6, 0.15), 150);
    },
    playWrong() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.playTone(150, 'sawtooth', 0.3, 0.1);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.5, 0.1), 150);
    }
};

// ====== Initialization ======
function init() {
    const storedPlayers = localStorage.getItem('sizeQuizPlayers_v2');
    const storedCards = localStorage.getItem('sizeQuizCards_v2');

    if (storedPlayers) {
        try { players = JSON.parse(storedPlayers); renderPlayerList(); } catch (e) { }
    }
    if (storedCards) {
        try { cards = JSON.parse(storedCards); renderCardList(); } catch (e) { }
    }

    checkStartState();
}

// ====== Title Screen ======
btnToSetup.addEventListener('click', () => {
    switchScreen(screenTitle, screenSetup);
});

// ====== Setup: Cards ======
uploadCardIcon.addEventListener('change', (e) => handleImageUpload(e, 'card'));

function checkAddCardState() {
    btnAddCard.disabled = !currentCardBase64;
}

btnAddCard.addEventListener('click', () => {
    if (cards.length >= 6) {
        alert("カードは6枚までです！");
        return;
    }
    cards.push({ id: Date.now(), image: currentCardBase64 });
    currentCardBase64 = null;
    previewCardImage.style.display = 'none';
    uploadCardPlaceholder.style.display = 'flex';
    uploadCardIcon.value = '';

    checkAddCardState();
    saveData();
    renderCardList();
});

window.removeCard = function (id) {
    cards = cards.filter(c => c.id !== id);
    saveData();
    renderCardList();
}

function renderCardList() {
    cardList.innerHTML = '';
    cards.forEach((c, idx) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <img src="${c.image}" alt="Card ${idx + 1}">
            <span>カード${idx + 1}</span>
            <div class="delete-btn" onclick="removeCard(${c.id})">×</div>
        `;
        cardList.appendChild(div);
    });
}

// ====== Setup: Players ======
uploadPlayerIcon.addEventListener('change', (e) => handleImageUpload(e, 'player'));
inputPlayerName.addEventListener('input', checkAddPlayerState);

function checkAddPlayerState() {
    btnAddPlayer.disabled = !(inputPlayerName.value.trim() !== '' && currentIconBase64);
}

btnAddPlayer.addEventListener('click', () => {
    if (players.length >= 6) {
        alert("プレイヤーは6人までです！");
        return;
    }
    players.push({ id: Date.now(), name: inputPlayerName.value.trim(), icon: currentIconBase64, score: 0 });

    inputPlayerName.value = '';
    currentIconBase64 = null;
    previewPlayerImage.style.display = 'none';
    uploadPlayerPlaceholder.style.display = 'flex';
    uploadPlayerIcon.value = '';

    checkAddPlayerState();
    saveData();
    renderPlayerList();
});

window.removePlayer = function (id) {
    players = players.filter(p => p.id !== id);
    saveData();
    renderPlayerList();
}

function renderPlayerList() {
    playerList.innerHTML = '';
    players.forEach(p => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <img src="${p.icon}" alt="${p.name}">
            <span>${p.name}</span>
            <div class="delete-btn" onclick="removePlayer(${p.id})">×</div>
        `;
        playerList.appendChild(div);
    });
}

// Upload helper
function handleImageUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 400; // max resolution
            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;

            const finalSize = Math.min(size, maxDim);
            canvas.width = finalSize;
            canvas.height = finalSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, size, size, 0, 0, finalSize, finalSize);

            const base64 = canvas.toDataURL('image/jpeg', 0.8);

            if (type === 'card') {
                currentCardBase64 = base64;
                previewCardImage.src = base64;
                previewCardImage.style.display = 'block';
                uploadCardPlaceholder.style.display = 'none';
                checkAddCardState();
            } else {
                currentIconBase64 = base64;
                previewPlayerImage.src = base64;
                previewPlayerImage.style.display = 'block';
                uploadPlayerPlaceholder.style.display = 'none';
                checkAddPlayerState();
            }
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

// Setup common
function saveData() {
    try {
        localStorage.setItem('sizeQuizPlayers_v2', JSON.stringify(players));
        localStorage.setItem('sizeQuizCards_v2', JSON.stringify(cards));
    } catch (e) { }
    checkStartState();
}

function checkStartState() {
    btnStart.disabled = (players.length === 0 || cards.length === 0);
}

// ====== Game Logic ======
btnStart.addEventListener('click', startGame);

function startGame() {
    SoundManager.init();
    if (SoundManager.ctx.state === 'suspended') SoundManager.ctx.resume();

    // Read turns
    totalTurns = parseInt(inputTurns.value) || 3;

    // Reset all scores
    players.forEach(p => { p.score = 0; });

    currentTurn = 1;
    switchScreen(screenSetup, screenGame);
    startTurn();
}

function startTurn() {
    if (currentTurn > totalTurns) {
        showResult();
        return;
    }

    turnDisplay.textContent = `ターン ${currentTurn}/${totalTurns}`;

    // Shuffle players for this turn
    turnPlayers = [...players];
    for (let i = turnPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [turnPlayers[i], turnPlayers[j]] = [turnPlayers[j], turnPlayers[i]];
    }

    currentPlayerIndex = 0;
    nextPlayer();
}

function nextPlayer() {
    if (currentPlayerIndex >= turnPlayers.length) {
        // End of turn
        currentTurn++;
        startTurn();
        return;
    }

    const player = turnPlayers[currentPlayerIndex];
    document.getElementById('current-player-name').textContent = player.name;
    document.getElementById('current-player-icon').src = player.icon;
    document.getElementById('current-score').textContent = player.score;

    feedbackMessage.className = 'hidden';

    // Cleanup previous draggables/targets so they don't show during overlay
    draggablesLayer.innerHTML = '';
    targetsLayer.querySelectorAll('.target-slot').forEach(slot => slot.innerHTML = '');

    // Show Turn Overlay
    const overlay = document.getElementById('turn-overlay');
    document.getElementById('turn-overlay-name').textContent = player.name;
    document.getElementById('turn-overlay-icon').src = player.icon;

    SoundManager.playTurn();

    overlay.classList.remove('hidden');

    // Wait for tap to start
    overlay.onclick = () => {
        SoundManager.init();
        if (SoundManager.ctx.state === 'suspended') SoundManager.ctx.resume();
        overlay.classList.add('hidden');
        overlay.onclick = null;
        generateLevel(player);
    };
}

// ====== Shape Math & Config ======
function getDodecagonPath() {
    const points = [];
    for (let i = 0; i < 12; i++) {
        const angle = i * 30 * (Math.PI / 180) - Math.PI / 2;
        const x = 50 + 50 * Math.cos(angle);
        const y = 50 + 50 * Math.sin(angle);
        points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    return `polygon(${points.join(', ')})`;
}

// Triangle, Square, Rectangle, Circle, Dodecagon
const shapes = [
    { name: 'triangle', path: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
    { name: 'square', path: 'inset(0)' },
    { name: 'rectangle', path: 'inset(20% 0%)' }, // horizontal rect
    { name: 'circle', path: 'circle(50% at 50% 50%)' },
    { name: 'dodecagon', path: getDodecagonPath() }
];

const sizes = [140, 100, 60];

// ====== Level Generation ======
function generateLevel(player) {
    // 5 slots total horizontally
    for (let i = 0; i < 5; i++) {
        document.getElementById(`slot-${i}`).innerHTML = '';
    }
    draggablesLayer.innerHTML = '';

    // 1. Pick a random Card
    const card = cards[Math.floor(Math.random() * cards.length)];

    // 2. Pick a correct Shape & Size
    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
    const targetSizeIndex = Math.floor(Math.random() * sizes.length);
    const targetSize = sizes[targetSizeIndex];

    // 3. Prepare 5 Targets
    // - 1 Correct
    let answerPool = [
        { shape: targetShape, size: targetSize, isCorrect: true, cardImage: card.image }
    ];

    // - 2 Same shape, wrong sizes
    const wrongSizeIndices = [0, 1, 2].filter(i => i !== targetSizeIndex);
    answerPool.push({ shape: targetShape, size: sizes[wrongSizeIndices[0]], isCorrect: false, cardImage: card.image });
    if (wrongSizeIndices.length > 1) {
        answerPool.push({ shape: targetShape, size: sizes[wrongSizeIndices[1]], isCorrect: false, cardImage: card.image });
    } else {
        answerPool.push({ shape: targetShape, size: sizes[(targetSizeIndex + 1) % 3], isCorrect: false, cardImage: card.image });
    }

    // - 2 Different shapes, same size
    const wrongShapes = shapes.filter(s => s.name !== targetShape.name).sort(() => Math.random() - 0.5);
    answerPool.push({ shape: wrongShapes[0], size: targetSize, isCorrect: false, cardImage: card.image });
    answerPool.push({ shape: wrongShapes[1], size: targetSize, isCorrect: false, cardImage: card.image });

    // Shuffle the 5 answers
    answerPool.sort(() => Math.random() - 0.5);

    // Slot them
    for (let i = 0; i < 5; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        const data = answerPool[i];

        const silWrapper = document.createElement('div');
        silWrapper.style.display = 'flex';
        silWrapper.style.justifyContent = 'center';
        silWrapper.style.alignItems = 'center';
        silWrapper.style.width = '100%';
        silWrapper.style.height = '100%';

        // We style .silhouette in JS to look like a shadow version
        const sil = document.createElement('div');
        sil.className = 'silhouette';
        sil.style.width = `${data.size}px`;
        sil.style.height = `${data.size}px`;
        sil.style.clipPath = data.shape.path;

        sil.style.backgroundImage = 'none';
        sil.style.border = '3px dashed rgba(255,255,255,0.8)';
        sil.style.background = 'rgba(0,0,0,0.25)';

        if (data.isCorrect) {
            sil.classList.add('correct-target');
            sil.dataset.isCorrect = "true";
        } else {
            sil.classList.add('wrong-target');
        }

        silWrapper.appendChild(sil);
        slotEl.appendChild(silWrapper);
    }

    // 4. Create Draggable Answer (Card Image wrapped in Shape)
    const dragItem = document.createElement('div');
    dragItem.className = 'draggable-item';
    dragItem.style.width = `${targetSize}px`;
    dragItem.style.height = `${targetSize}px`;
    dragItem.style.clipPath = targetShape.path;

    // Place in middle of bottom half area
    dragItem.style.left = '50%';
    dragItem.style.top = '50%'; // relative to draggables-layer

    const img = document.createElement('img');
    img.src = card.image;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.pointerEvents = 'none';
    dragItem.appendChild(img);

    draggablesLayer.appendChild(dragItem);

    setupDragAndDrop(dragItem, player);
}

// ====== Drag & Drop Logic ======
function setupDragAndDrop(dragElement, player) {
    let startX, startY;
    let locked = false;

    dragElement.addEventListener('pointerdown', (e) => {
        if (locked) return;
        dragElement.setPointerCapture(e.pointerId);

        const layerRect = draggablesLayer.getBoundingClientRect();
        let curLeft = parseFloat(dragElement.style.left);
        let curTop = parseFloat(dragElement.style.top);

        if (dragElement.style.left.includes('%')) {
            curLeft = layerRect.width * (parseFloat(dragElement.style.left) / 100);
            curTop = layerRect.height * (parseFloat(dragElement.style.top) / 100);
            dragElement.style.left = curLeft + 'px';
            dragElement.style.top = curTop + 'px';
        }

        dragElement.dataset.isDragging = "true";
        startX = e.clientX;
        startY = e.clientY;
        dragElement.dataset.startLeft = curLeft;
        dragElement.dataset.startTop = curTop;

        dragElement.style.zIndex = 1000;
        dragElement.style.transition = 'none';
        dragElement.style.transform = 'translate(-50%, -50%) scale(1.1)';
    });

    dragElement.addEventListener('pointermove', (e) => {
        if (!dragElement.dataset.isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        dragElement.style.left = `${parseFloat(dragElement.dataset.startLeft) + dx}px`;
        dragElement.style.top = `${parseFloat(dragElement.dataset.startTop) + dy}px`;
    });

    dragElement.addEventListener('pointerup', (e) => {
        if (!dragElement.dataset.isDragging) return;
        delete dragElement.dataset.isDragging;
        dragElement.releasePointerCapture(e.pointerId);

        dragElement.style.zIndex = 10;
        dragElement.style.transition = 'top 0.3s, left 0.3s, transform 0.1s';
        dragElement.style.transform = 'translate(-50%, -50%) scale(1)';

        // Let the checkHit function decide what to do
        const snapped = checkHit(dragElement, player);
        if (snapped) {
            locked = true;
        } else {
            // Did not match any target distance. Go back to origin.
            dragElement.style.left = '50%';
            dragElement.style.top = '50%';
        } // Wait for next turn
    });
}

function checkHit(dragElement, player) {
    const dragRect = dragElement.getBoundingClientRect();
    const dragCX = dragRect.left + dragRect.width / 2;
    const dragCY = dragRect.top + dragRect.height / 2;

    const targets = document.querySelectorAll('.silhouette');
    let hitTarget = null;
    let minDistance = Infinity;

    // Check distance to all targets
    targets.forEach(t => {
        const tRect = t.getBoundingClientRect();
        const tCX = tRect.left + tRect.width / 2;
        const tCY = tRect.top + tRect.height / 2;

        const dist = Math.hypot(dragCX - tCX, dragCY - tCY);
        // User drops exactly on a silhouette
        if (dist <= 60 && dist < minDistance) {
            hitTarget = t;
            minDistance = dist;
        }
    });

    if (hitTarget) {
        // Snapped to a target (Right or Wrong)
        dragElement.style.pointerEvents = 'none';

        // Calculate offset difference
        const layerRect = draggablesLayer.getBoundingClientRect();
        const hitRect = hitTarget.getBoundingClientRect();

        const targetGlobalCX = hitRect.left + hitRect.width / 2;
        const targetGlobalCY = hitRect.top + hitRect.height / 2;

        dragElement.style.left = `${targetGlobalCX - layerRect.left}px`;
        dragElement.style.top = `${targetGlobalCY - layerRect.top}px`;

        // Hide silhouette behind
        hitTarget.classList.add('matched');

        // Check correct/wrong
        if (hitTarget.dataset.isCorrect === "true") {
            handleResult(true, player);
        } else {
            handleResult(false, player);
        }
        return true;
    }
    return false;
}

function handleResult(isCorrect, player) {
    feedbackMessage.className = '';
    if (isCorrect) {
        SoundManager.playCorrect();
        feedbackMessage.textContent = 'せいかい！🎉';
        feedbackMessage.classList.add('success');
        player.score += 1;
        document.getElementById('current-score').textContent = player.score;
    } else {
        SoundManager.playWrong();
        feedbackMessage.textContent = 'ざんねん…';
        feedbackMessage.classList.add('failure');
    }

    saveData();

    setTimeout(() => {
        currentPlayerIndex++;
        nextPlayer();
    }, 2000);
}

// ====== Result Screen ======
function showResult() {
    switchScreen(screenGame, screenResult);
    rankingContainer.innerHTML = '';

    // Sort array in ascending rank
    const sorted = [...players].sort((a, b) => {
        return a.score - b.score;
    });

    sorted.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'rank-item';

        // Highest score gets lowest rank number (e.g. 1位 if last in sorted array)
        // Wait, what if there's a tie? We don't need complex tie-breakers for a simple layout,
        // rank is just based on sorting order.
        let rank = sorted.length - index;

        const isWinner = rank === 1;
        if (isWinner) item.classList.add('winner');

        item.innerHTML = `
            <div style="width: 50px">${rank}位</div>
            <img src="${p.icon}" alt="${p.name}">
            <span>${p.name}</span>
            <div class="score-badge">${p.score} pt</div>
        `;
        // Prepend to show highest at the top
        rankingContainer.prepend(item);

        setTimeout(() => {
            item.classList.add('visible');
            if (isWinner && p.score > 0) {
                createConfetti();
            }
        }, index * 800 + 500);
    });
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#1a535c', '#f7fff7'];
    for (let i = 0; i < 80; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = (Math.random() * 100) + '%';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDelay = (Math.random() * 2) + 's';
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        const size = (Math.random() * 8 + 5) + 'px';
        conf.style.width = size;
        conf.style.height = size;
        if (Math.random() > 0.5) conf.style.borderRadius = '50%';
        container.appendChild(conf);
    }
}

btnRestart.addEventListener('click', () => {
    switchScreen(screenResult, screenTitle);
    document.getElementById('confetti-container').innerHTML = '';
});

// ====== Utilities ======
function switchScreen(from, to) {
    if (from) from.classList.remove('active');
    if (to) to.classList.add('active');
}

// Start
init();
