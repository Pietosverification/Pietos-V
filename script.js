// --- GLOBAL STATE & USER DATABASE ---
let userToken = localStorage.getItem('userToken');
let currentUser = null;
let startTime = null;
let pendingVerification = null;

// PASTE YOUR NEW GOOGLE APPS SCRIPT WEB APP URL HERE
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxh8qdrEByoHdQaFz-Vwc6wk3tlguFjLN2Jhq6qtZTUGeaCweSGTZlZ5oQY8JN2Oe2-VA/exec';

// --- AUTHENTICATION LOGIC ---
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = event.target.querySelector('.submit-btn');
    const messageDiv = document.getElementById('authMessage');
    
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    messageDiv.innerHTML = '';
    
    try {
        const url = `${GAS_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.status === 'success') {
            userToken = data.token;
            localStorage.setItem('userToken', userToken);
            currentUser = { name: data.name, email: email };
            startTime = new Date();
            updateAuthUI();
            showMainContent();
            messageDiv.innerHTML = '<div class="message success">Login successful! Redirecting to home page...</div>';
            setTimeout(() => { 
                closeModal('authModal');
                if (pendingVerification) {
                    alert(`You are now performing a ${pendingVerification} verification.`);
                    logUserActivity('Verification', `Verified ${pendingVerification}`);
                    pendingVerification = null;
                }
            }, 1000);
        } else {
            messageDiv.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = '<div class="message error">An error occurred. Please try again.</div>';
    } finally {
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = event.target.querySelector('.submit-btn');
    const messageDiv = document.getElementById('authMessage');
    
    if (password !== confirmPassword) {
        messageDiv.innerHTML = '<div class="message error">Passwords do not match.</div>';
        return;
    }
    if (password.length < 6) {
        messageDiv.innerHTML = '<div class="message error">Password must be at least 6 characters.</div>';
        return;
    }
    
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    messageDiv.innerHTML = '';
    
    try {
        const url = `${GAS_URL}?action=register&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.status === 'success') {
            userToken = data.token;
            localStorage.setItem('userToken', userToken);
            currentUser = { name, email };
            startTime = new Date();
            updateAuthUI();
            showMainContent();
            messageDiv.innerHTML = '<div class="message success">Account created successfully! Welcome!</div>';
            setTimeout(() => { closeModal('authModal'); }, 1500);
        } else {
            messageDiv.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.innerHTML = '<div class="message error">An error occurred. Please try again.</div>';
    } finally {
        submitBtn.textContent = 'Register';
        submitBtn.disabled = false;
    }
}

function logout() {
    if (userToken && startTime) {
        const duration = Math.floor((new Date() - startTime) / 1000);
        logUserActivity('Logout', `Session Duration: ${duration}s`);
    }

    userToken = null;
    currentUser = null;
    localStorage.removeItem('userToken');
    updateAuthUI();
    showMainContent();
    const message = document.createElement('div');
    message.className = 'message success';
    message.textContent = 'Logged out successfully!';
    message.style.position = 'fixed';
    message.style.top = '100px';
    message.style.right = '20px';
    message.style.zIndex = '3000';
    document.body.appendChild(message);
    setTimeout(() => { message.remove(); }, 3000);
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    
    if (userToken) {
        try {
            const payload = JSON.parse(atob(userToken.split('.')[1]));
            userName.textContent = payload.name;
            currentUser = payload;
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
        } catch (e) {
            console.error("Failed to decode token", e);
            logout();
        }
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
    }
}

async function logUserActivity(eventType, details) {
    if (userToken) {
        try {
            const url = `${GAS_URL}?action=logActivity&token=${encodeURIComponent(userToken)}&eventType=${encodeURIComponent(eventType)}&details=${encodeURIComponent(details)}`;
            await fetch(url);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }
}

function handleVerificationClick(event, serviceName, requiresNoLogin) {
    if (requiresNoLogin) {
        alert(`You are now performing a ${serviceName} verification without needing to log in.`);
        // For demonstration, we'll just log the activity. In a real scenario, this would trigger the verification logic.
        if (userToken) {
            logUserActivity('Verification', `Verified ${serviceName}`);
        }
    } else if (!userToken) {
        event.preventDefault(); // Prevent default link behavior
        pendingVerification = serviceName;
        openAuthModal('login');
    } else {
        alert(`You are now performing a ${serviceName} verification.`);
        logUserActivity('Verification', `Verified ${serviceName}`);
    }
}

// --- PAGE NAVIGATION & LOGIC ---
function showMainContent() {
    document.getElementById('mainPageContent').classList.remove('hidden');
    document.getElementById('dashboardPageContent').classList.add('hidden');
    window.scrollTo(0, 0);
}

async function showDashboard() {
    if (!userToken) {
        openAuthModal('login');
        return;
    }

    const mainPage = document.getElementById('mainPageContent');
    const dashboardPage = document.getElementById('dashboardPageContent');
    mainPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    
    dashboardPage.innerHTML = `
        <div class="dashboard-page">
            <h2>Hello, ${currentUser.name}! 🚀</h2>
            <p style="text-align: center; margin-bottom: 2rem;">Welcome to your personalized dashboard. Below you can find your recent activity and statistics.</p>
            <div id="dashboardData">Loading your dashboard data...</div>
            <button class="login-btn" style="margin-top: 2rem;" onclick="showMainContent()">Back to Main Page</button>
        </div>
    `;
    window.scrollTo(0, 0);

    try {
        const url = `${GAS_URL}?action=getDashboard&token=${encodeURIComponent(userToken)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const dashboardDataElement = document.getElementById('dashboardData');
        if (data.status === 'success') {
            let activityHtml = '<h3>Recent Activity:</h3><ul class="activity-list">';
            if (data.activity.length > 0) {
                data.activity.forEach(entry => {
                    activityHtml += `<li><strong>${entry.timestamp}</strong>: ${entry.eventType} - ${entry.details}</li>`;
                });
            } else {
                activityHtml += '<li>No recent activity found. Start a verification to see your history!</li>';
            }
            activityHtml += '</ul>';
            dashboardDataElement.innerHTML = `
                <div class="info-box">
                    <h3>Last Login:</h3>
                    <p>${data.lastLogin || 'N/A'}</p>
                </div>
                <div class="info-box">
                    <h3>Session Statistics:</h3>
                    <p>${data.additionalDetails}</p>
                </div>
                <div class="info-box">
                    ${activityHtml}
                </div>
            `;
        } else {
            dashboardDataElement.innerHTML = `<div class="message error">${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        document.getElementById('dashboardData').innerHTML = `<div class="message error">Failed to load dashboard data. Please try again later.</div>`;
    }
}

// --- MODAL CONTROLS ---
function openAuthModal(mode) {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    switchAuthTab(mode);
}

function switchAuthTab(mode) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const modalTitle = document.getElementById('authModalTitle');
    if (mode === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden'); 
        registerForm.classList.add('hidden');
        modalTitle.textContent = 'Login to Your Account';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden'); 
        loginForm.classList.add('hidden');
        modalTitle.textContent = 'Create New Account';
    }
    document.getElementById('authMessage').innerHTML = '';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === document.getElementById('authModal')) {
        closeModal('authModal');
    }
}

// --- ANIMATIONS & EVENT LISTENERS ---
function createParticles() {
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = particle.style.height = Math.random() * 5 + 2 + 'px';
            particle.style.animationDuration = Math.random() * 3 + 5 + 's';
            particle.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(particle);
            setTimeout(() => { particle.remove(); }, 8000);
        }, i * 200);
    }
}

let text = "Trust, But Verify — with Pietos.", i = 0, dir = 1;
function type() {
    document.getElementById("t").textContent = text.slice(0, i);
    if (dir > 0 && i++ === text.length) {
        dir = -1;
        setTimeout(type, 1000);
        return;
    }
    if (dir < 0 && --i < 0) {
        dir = 1;
        i = 0;
    }
    setTimeout(type, dir > 0 ? 120 : 60);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        card.style.transition = 'all 0.6s ease';
    });
    setTimeout(() => {
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }, 500);
});

window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    header.style.background = (window.scrollY > 100) ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetElement = document.getElementById(this.getAttribute('href').substring(1));
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

createParticles();
setInterval(createParticles, 10000);
type();
updateAuthUI();