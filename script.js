// --- STATE ---
let currentScreen = 1;
let selectedDate = '';
let selectedFoods = [];
let otherFood = '';
let noAttempts = 0;
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
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        const today = new Date();
        today.setDate(today.getDate() + 3); // At least 3 days ahead
        const minDateStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0') + 'T00:00';
        datePicker.min = minDateStr;
    }
});

// --- SCREEN NAVIGATION ---
function nextScreen(current) {
    if (current === 1) {
        timeAskOpened = Date.now();
    }
    if (current === 2) {
        hasAnsweredYes = true;
        timeAnswered = Date.now();
    }
    if (current === 3) {
        // Validate date string
        const dp = document.getElementById('date-picker').value;
        if (!dp) {
            alert('Please pick a date first! 🥺');
            return;
        }
        selectedDate = new Date(dp).toLocaleString();
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
let lastX = 0;
let lastY = 0;

function moveButton() {
    noAttempts++;

    // Widen scope based on screen size, ensure it moves far from previous position
    const maxRange = Math.min(window.innerWidth / 2 - 40, 220);
    let x, y;
    do {
        x = Math.floor(Math.random() * maxRange * 2) - maxRange;
        y = Math.floor(Math.random() * maxRange * 2) - maxRange;
    } while (Math.abs(x - lastX) < 120 && Math.abs(y - lastY) < 120);

    lastX = x;
    lastY = y;
    btnNo.style.transform = `translate(${x}px, ${y}px)`;
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
    const timeDiff = timeAskOpened && timeAnswered ? ((timeAnswered - timeAskOpened) / 1000).toFixed(1) : 0;
    const stats = `[Stats: Answered YES in ${timeDiff}s. 'No' evaded ${noAttempts} times]`;

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
            const templateParams = {
                date_proposed: "No (App Closed/Left)",
                food_preferences: "N/A",
                other_food: `[Stats: Left Ask page after ${timeDiff}s. 'No' evaded ${noAttempts} times]`
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
