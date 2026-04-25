// --- STATE ---
let currentScreen = 1;
let selectedDate = '';
let selectedFoods = [];
let otherFood = '';
let noAttempts = 0;
let pageTimes = {};
let lastPageTime = Date.now();
let timeAskOpened = null;
let timeAnswered = null;
let hasAnsweredYes = false;
let emailSentStatus = false;

// Screen order — defines the full flow including the 2 new foreword pages
const SCREEN_ORDER = ['1', '1a', '1b', '2', '3', '4', '5'];

// --- BACKGROUND PARTICLES ---
function createParticles() {
    const container = document.querySelector('.background-particles');
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
        let heart = document.createElement('div');
        heart.classList.add('heart-particle');
        const emojis = ['❤️', '💖', '✨', '💕', '🌸', '🦋', '🐱', '🍒', '🍓', '🥑', '🎈', '🎉', '🌟', '🦄', '🐝', '🍄', '🪐', '🍭', '🎀', '🧸'];
        heart.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];

        // Random positioning and duration
        let leftPx = Math.floor(Math.random() * 100);
        let duration = Math.floor(Math.random() * 10) + 10;
        let delay = Math.floor(Math.random() * 10);

        heart.style.left = `${leftPx}%`;
        heart.style.animationDuration = `${duration}s`;
        heart.style.animationDelay = `${delay}s`;

        container.appendChild(heart);
    }
}
createParticles();


// --- MINIMUM DATE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    ['date-picker-1', 'date-picker-2', 'date-picker-3'].forEach(id => {
        const dp = document.getElementById(id);
        if (dp) {
            const today = new Date();
            today.setDate(today.getDate() + 3); // At least 3 days ahead
            const minDateStr = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0') + 'T00:00';
            dp.min = minDateStr;
        }
    });
});


// --- SCREEN NAVIGATION ---
function nextScreen(current) {
    const currentId = String(current);
    const idx = SCREEN_ORDER.indexOf(currentId);
    if (idx === -1 || idx >= SCREEN_ORDER.length - 1) return;

    const nextId = SCREEN_ORDER[idx + 1];

    const now = Date.now();
    pageTimes[`Screen${currentId}`] = ((now - lastPageTime) / 1000).toFixed(1);
    lastPageTime = now;

    // Special actions on certain screen transitions
    if (currentId === '1') {
        timeAskOpened = now;
    }
    if (currentId === '2') {
        hasAnsweredYes = true;
        timeAnswered = now;
    }
    if (currentId === '3') {
        const dp1 = document.getElementById('date-picker-1').value;
        const dp2 = document.getElementById('date-picker-2').value;
        const dp3 = document.getElementById('date-picker-3').value;

        let dates = [];
        if (dp1) dates.push(new Date(dp1).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        if (dp2) dates.push(new Date(dp2).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        if (dp3) dates.push(new Date(dp3).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));

        selectedDate = dates.length === 0 ? "No date selected" : dates.join(' | ');
    }

    const currentEl = document.getElementById(`screen-${currentId}`);
    const nextEl = document.getElementById(`screen-${nextId}`);

    if (currentEl && nextEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('past');

        setTimeout(() => {
            nextEl.classList.add('active');
        }, 300);
    }
}

function prevScreen(target) {
    const activeScreens = document.querySelectorAll('.screen.active');
    activeScreens.forEach(s => s.classList.remove('active'));

    const targetEl = document.getElementById(`screen-${target}`);
    if (targetEl) {
        targetEl.classList.remove('past');
        targetEl.classList.add('active');
    }
}


// --- RUNNING 'NO' BUTTON TRICK ---
const btnNo = document.getElementById('btn-no');
const btnYes = document.getElementById('btn-yes');
const dateAsk = document.querySelector('.date-ask');
let lastNoMoveAt = 0;

function rectsOverlap(a, b, buffer = 0) {
    return (
        a.left < b.right + buffer &&
        a.right > b.left - buffer &&
        a.top < b.bottom + buffer &&
        a.bottom > b.top - buffer
    );
}

function moveButton() {
    if (!btnNo || !dateAsk) return;

    const now = Date.now();
    if (now - lastNoMoveAt < 160) return;
    lastNoMoveAt = now;

    const padding = 10;
    const areaRect = dateAsk.getBoundingClientRect();
    const yesRect = btnYes ? btnYes.getBoundingClientRect() : null;
    const bw = btnNo.offsetWidth;
    const bh = btnNo.offsetHeight;

    const maxLeft = Math.max(padding, areaRect.width - bw - padding);
    const maxTop = Math.max(padding, areaRect.height - bh - padding);
    const currentLeft = parseFloat(btnNo.style.left);
    const currentTop = parseFloat(btnNo.style.top);
    const hasCurrentPosition = Number.isFinite(currentLeft) && Number.isFinite(currentTop);
    const minTravel = Math.min(120, Math.max(70, Math.min(maxLeft, maxTop) * 0.45));

    let left = padding;
    let top = padding;
    let bestLeft = padding;
    let bestTop = padding;
    let bestDistance = -1;
    let attempts = 0;

    while (attempts < 100) {
        left = padding + Math.random() * Math.max(1, maxLeft - padding);
        top = padding + Math.random() * Math.max(1, maxTop - padding);

        const candidate = {
            left: areaRect.left + left,
            top: areaRect.top + top,
            right: areaRect.left + left + bw,
            bottom: areaRect.top + top + bh
        };
        const overlapsYes = yesRect && rectsOverlap(candidate, yesRect, 16);
        const distance = hasCurrentPosition ? Math.hypot(left - currentLeft, top - currentTop) : Infinity;

        if (!overlapsYes && distance > bestDistance) {
            bestDistance = distance;
            bestLeft = left;
            bestTop = top;
        }

        if (!overlapsYes && distance >= minTravel) {
            break;
        }

        attempts++;
    }

    if (attempts >= 100) {
        left = bestLeft;
        top = bestTop;
    }

    btnNo.style.left = `${Math.round(left)}px`;
    btnNo.style.top = `${Math.round(top)}px`;
    noAttempts++;
}

if (btnNo) {
    btnNo.addEventListener('pointerenter', moveButton);
    btnNo.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        moveButton();
    });
    btnNo.addEventListener('click', (e) => {
        e.preventDefault();
        moveButton();
    });
    btnNo.addEventListener('touchstart', (e) => {
        e.preventDefault();
        moveButton();
    }, { passive: false });
}

window.addEventListener('resize', () => {
    if (!btnNo || !dateAsk) return;

    const areaRect = dateAsk.getBoundingClientRect();
    const left = parseFloat(btnNo.style.left || '0');
    const top = parseFloat(btnNo.style.top || '0');
    const maxLeft = Math.max(10, areaRect.width - btnNo.offsetWidth - 10);
    const maxTop = Math.max(10, areaRect.height - btnNo.offsetHeight - 10);

    btnNo.style.left = `${Math.min(Math.max(10, left), maxLeft)}px`;
    btnNo.style.top = `${Math.min(Math.max(10, top), maxTop)}px`;
});

// --- FOOD SELECTION ---
function selectFood(foodName, element) {
    if (selectedFoods.includes(foodName)) {
        selectedFoods = selectedFoods.filter(f => f !== foodName);
        element.classList.remove('selected');
    } else {
        selectedFoods.push(foodName);
        element.classList.add('selected');
    }
}


// --- BACKEND SUBMISSION ---
async function submitForm() {
    otherFood = document.getElementById('food-other').value.trim();

    if (selectedFoods.length === 0 && otherFood === '') {
        alert('Please choose something to eat or type it below! 🍔');
        return;
    }

    // Move to final loading screen
    nextScreen(4);

    emailSentStatus = true;
    const pageTimingStr = Object.entries(pageTimes).map(([k, v]) => `${k}:${v}s`).join(', ');
    const timeDiff = timeAskOpened && timeAnswered ? ((timeAnswered - timeAskOpened) / 1000).toFixed(1) : 0;
    const stats = `[Stats: Answered YES in ${timeDiff}s. Timings: ${pageTimingStr} | 'No' evaded ${noAttempts} times]`;

    const templateParams = {
        answer: 'Yes',
        is_yes: true,
        is_no: false,
        date_proposed: selectedDate,
        food_preferences: selectedFoods.join(', ') || 'None',
        other_food: otherFood ? `${otherFood} • ${stats}` : stats
    };

    try {
        const response = await emailjs.send('service_abirelg', 'template_wy3v75n', templateParams);
        document.getElementById('loader').style.display = 'none';
        document.getElementById('success-msg').style.display = 'block';
    } catch (error) {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('error-msg').style.display = 'block';
        console.error('EmailJS sending failed:', error);
    }
}


// --- TRACKING APP CLOSE/LEAVE ---
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (timeAskOpened && !hasAnsweredYes && !emailSentStatus) {
            emailSentStatus = true;

            const timeDiff = ((Date.now() - timeAskOpened) / 1000).toFixed(1);
            const pageTimingStr = Object.entries(pageTimes).map(([k, v]) => `${k}:${v}s`).join(', ');
            const templateParams = {
                answer: "No",
                is_yes: false,
                is_no: true,
                date_proposed: "No (App Closed/Left)",
                food_preferences: "N/A",
                other_food: `[Stats: Left Ask page after ${timeDiff}s. Timings: ${pageTimingStr} | 'No' evaded ${noAttempts} times]`
            };

            fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: 'service_abirelg',
                    template_id: 'template_wy3v75n',
                    user_id: 'OMqCZZMrlRnsV8xYt',
                    template_params: templateParams
                })
            }).catch(e => console.error('Error sending beacon:', e));
        }
    }
});
