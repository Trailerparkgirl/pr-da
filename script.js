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

// Using EmailJS for submission 

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
    const now = Date.now();
    pageTimes[`Screen${current}`] = ((now - lastPageTime) / 1000).toFixed(1);
    lastPageTime = now;

    if (current === 1) {
        timeAskOpened = now;
    }
    if (current === 2) {
        hasAnsweredYes = true;
        timeAnswered = now;
    }
    if (current === 3) {
        const dp1 = document.getElementById('date-picker-1').value;
        const dp2 = document.getElementById('date-picker-2').value;
        const dp3 = document.getElementById('date-picker-3').value;
        
        let dates = [];
        if (dp1) dates.push(new Date(dp1).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        if (dp2) dates.push(new Date(dp2).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        if (dp3) dates.push(new Date(dp3).toLocaleString(navigator.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        
        if (dates.length === 0) {
            selectedDate = "No date selected"; // not mandatory
        } else {
            selectedDate = dates.join(' | ');
        }
    }

    const currentEl = document.getElementById(`screen-${current}`);
    const nextEl = document.getElementById(`screen-${current + 1}`);

    if (currentEl && nextEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('past');

        setTimeout(() => {
            nextEl.classList.add('active');
        }, 300); // Wait a bit for smooth timing
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

function moveButton() {
    noAttempts++;

    // Switch to fixed position for reliable boundary checking relative to viewport
    if (btnNo.style.position !== 'fixed') {
        const rect = btnNo.getBoundingClientRect();
        btnNo.style.position = 'fixed';
        btnNo.style.left = rect.left + 'px';
        btnNo.style.top = rect.top + 'px';
        btnNo.style.transform = 'none'; // reset translation
        // Use timeout to let the browser apply position fixed before moving
        setTimeout(moveButton, 50);
        return;
    }

    const btnWidth = btnNo.offsetWidth || 100;
    const btnHeight = btnNo.offsetHeight || 50;

    const padding = 20;
    const maxLeft = window.innerWidth - btnWidth - padding;
    const maxTop = window.innerHeight - btnHeight - padding;
    
    let newLeft, newTop;
    let currLeft = parseInt(btnNo.style.left) || 0;
    let currTop = parseInt(btnNo.style.top) || 0;

    do {
        newLeft = Math.max(padding, Math.floor(Math.random() * maxLeft));
        newTop = Math.max(padding, Math.floor(Math.random() * maxTop));
    } while (Math.abs(newLeft - currLeft) < 80 && Math.abs(newTop - currTop) < 80);

    btnNo.style.left = newLeft + 'px';
    btnNo.style.top = newTop + 'px';
}

// Support for mouse and touch
if (btnNo) {
    btnNo.addEventListener('mouseover', moveButton);
    btnNo.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent standard touch
        moveButton();
    });
    btnNo.addEventListener('click', moveButton);
}


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
        // If closed while on Ask page or before answering YES
        if (timeAskOpened && !hasAnsweredYes && !emailSentStatus) {
            emailSentStatus = true; // Prevent multiple sends

            const timeDiff = ((Date.now() - timeAskOpened) / 1000).toFixed(1);
            const pageTimingStr = Object.entries(pageTimes).map(([k, v]) => `${k}:${v}s`).join(', ');
            const templateParams = {
                date_proposed: "No (App Closed/Left)",
                food_preferences: "N/A",
                other_food: `[Stats: Left Ask page after ${timeDiff}s. Timings: ${pageTimingStr} | 'No' evaded ${noAttempts} times]`
            };

            // Use fetch with keepalive to reliably send during page unload
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
