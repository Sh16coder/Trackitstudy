// Firebase Initialization
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const elements = {
    app: document.getElementById('app'),
    authSection: document.getElementById('authSection'),
    dashboard: document.getElementById('dashboard'),
    authBtn: document.getElementById('authBtn'),
    shareBtn: document.getElementById('shareBtn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    showRegisterBtn: document.getElementById('showRegisterBtn'),
    showLoginBtn: document.getElementById('showLoginBtn'),
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    emailInput: document.getElementById('emailInput'),
    passwordInput: document.getElementById('passwordInput'),
    nameInput: document.getElementById('nameInput'),
    regEmailInput: document.getElementById('regEmailInput'),
    regPasswordInput: document.getElementById('regPasswordInput'),
    shareCodeInput: document.getElementById('shareCodeInput'),
    copyCodeBtn: document.getElementById('copyCodeBtn'),
    viewCodeInput: document.getElementById('viewCodeInput'),
    viewCodeBtn: document.getElementById('viewCodeBtn'),
    viewOthersContainer: document.getElementById('viewOthersContainer'),
    studyForm: document.getElementById('studyForm'),
    subjectSelect: document.getElementById('subjectSelect'),
    durationInput: document.getElementById('durationInput'),
    dateInput: document.getElementById('dateInput')
};

// Chart instances
let charts = {
    today: null,
    week: null,
    daily: null,
    subject: null
};

// Initialize the app
function initApp() {
    // Set today's date as default
    elements.dateInput.valueAsDate = new Date();
    
    // Auth state listener
    auth.onAuthStateChanged(handleAuthStateChange);
    
    // Event listeners
    setupEventListeners();
}

function handleAuthStateChange(user) {
    if (user) {
        // User signed in
        showDashboard(user);
        generateShareCode(user.uid);
        loadUserData(user.uid);
    } else {
        // User signed out
        showAuthSection();
    }
}

function showDashboard(user) {
    elements.authSection.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    elements.authBtn.textContent = 'Sign Out';
    elements.shareBtn.classList.remove('hidden');
}

function showAuthSection() {
    elements.authSection.classList.remove('hidden');
    elements.dashboard.classList.add('hidden');
    elements.authBtn.textContent = 'Sign In';
    elements.shareBtn.classList.add('hidden');
}

async function generateShareCode(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists && userDoc.data().shareCode) {
            elements.shareCodeInput.value = userDoc.data().shareCode;
        } else {
            await createShareCode(uid);
        }
    } catch (error) {
        showToast('Error generating share code');
        console.error(error);
    }
}

async function createShareCode(uid) {
    try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.collection('users').doc(uid).set({
            shareCode: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        elements.shareCodeInput.value = code;
        showToast('Share code generated!');
    } catch (error) {
        showToast('Error creating share code');
        console.error(error);
    }
}

async function loadUserData(uid) {
    try {
        // Real-time listener for study sessions
        db.collection('studySessions')
            .where('userId', '==', uid)
            .orderBy('date', 'desc')
            .limit(100)
            .onSnapshot(handleStudySessionsUpdate);
    } catch (error) {
        showToast('Error loading data');
        console.error(error);
    }
}

function handleStudySessionsUpdate(snapshot) {
    const studySessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    if (studySessions.length > 0) {
        updateCharts(studySessions);
    } else {
        initCharts([]);
    }
}

function processSessionData(sessions) {
    const dailyData = {};
    const subjectData = {};
    let totalHours = 0;
    const today = new Date().toISOString().split('T')[0];
    let todayHours = 0;
    
    // Process all sessions
    sessions.forEach(session => {
        const date = session.date;
        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        
        // Daily data
        if (!dailyData[date]) {
            dailyData[date] = { day, hours: 0 };
        }
        dailyData[date].hours += session.duration;
        
        // Subject data
        if (!subjectData[session.subject]) {
            subjectData[session.subject] = 0;
        }
        subjectData[session.subject] += session.duration;
        
        // Total hours
        totalHours += session.duration;
        
        // Today's hours
        if (date === today) {
            todayHours += session.duration;
        }
    });
    
    // Weekly hours (last 7 days)
    const weeklyHours = getLastNDaysHours(dailyData, 7);
    
    return {
        todayHours,
        weeklyHours,
        dailyData,
        subjectData,
        totalHours
    };
}

function getLastNDaysHours(dailyData, days) {
    let total = 0;
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        total += dailyData[dateStr] ? dailyData[dateStr].hours : 0;
    }
    return total;
}

function initCharts(sessions) {
    const { todayHours, weeklyHours, dailyData, subjectData } = processSessionData(sessions);
    
    // Today's study chart
    const todayCtx = document.getElementById('todayChart').getContext('2d');
    charts.today = new Chart(todayCtx, {
        type: 'doughnut',
        data: getTodayChartData(todayHours),
        options: getDoughnutOptions()
    });
    
    // Weekly study chart
    const weekCtx = document.getElementById('weekChart').getContext('2d');
    charts.week = new Chart(weekCtx, {
        type: 'doughnut',
        data: getWeeklyChartData(weeklyHours),
        options: getDoughnutOptions()
    });
    
    // Daily study hours chart
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    charts.daily = new Chart(dailyCtx, {
        type: 'bar',
        data: getDailyChartData(dailyData),
        options: getBarChartOptions()
    });
    
    // Subject distribution chart
    const subjectCtx = document.getElementById('subjectChart').getContext('2d');
    charts.subject = new Chart(subjectCtx, {
        type: 'pie',
        data: getSubjectChartData(subjectData),
        options: getPieChartOptions()
    });
}

function updateCharts(sessions) {
    const { todayHours, weeklyHours, dailyData, subjectData } = processSessionData(sessions);
    
    // Update charts if they exist, else initialize
    if (charts.today) {
        charts.today.data = getTodayChartData(todayHours);
        charts.today.update();
    } else {
        initCharts(sessions);
        return;
    }
    
    charts.week.data = getWeeklyChartData(weeklyHours);
    charts.week.update();
    
    charts.daily.data = getDailyChartData(dailyData);
    charts.daily.update();
    
    charts.subject.data = getSubjectChartData(subjectData);
    charts.subject.update();
}

// Chart data and options helpers
function getTodayChartData(hours) {
    return {
        labels: ['Completed', 'Remaining'],
        datasets: [{
            data: [hours, Math.max(0, 8 - hours)],
            backgroundColor: ['#4c51bf', '#e2e8f0'],
            borderWidth: 0
        }]
    };
}

function getWeeklyChartData(hours) {
    return {
        labels: ['Completed', 'Remaining'],
        datasets: [{
            data: [hours, Math.max(0, 40 - hours)],
            backgroundColor: ['#4299e1', '#e2e8f0'],
            borderWidth: 0
        }]
    };
}

function getDailyChartData(dailyData) {
    const last7Days = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = daysOfWeek[date.getDay()];
        last7Days.unshift({
            day: dayName,
            hours: dailyData[dateStr] ? dailyData[dateStr].hours : 0
        });
    }
    
    return {
        labels: last7Days.map(d => d.day),
        datasets: [{
            label: 'Study Hours',
            data: last7Days.map(d => d.hours),
            backgroundColor: '#667eea',
            borderRadius: 6
        }]
    };
}

function getSubjectChartData(subjectData) {
    const labels = Object.keys(subjectData);
    const data = Object.values(subjectData);
    const backgroundColors = [
        '#4c51bf', '#4299e1', '#48bb78', 
        '#ed8936', '#9f7aea', '#f56565'
    ].slice(0, labels.length);
    
    return {
        labels,
        datasets: [{
            data,
            backgroundColor: backgroundColors,
            borderWidth: 0
        }]
    };
}

function getDoughnutOptions() {
    return {
        cutout: '70%',
        plugins: { legend: { display: false } },
        maintainAspectRatio: false
    };
}

function getBarChartOptions() {
    return {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Hours' } }
        },
        maintainAspectRatio: false
    };
}

function getPieChartOptions() {
    return {
        responsive: true,
        plugins: { legend: { position: 'right' } },
        maintainAspectRatio: false
    };
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'bg-red-500' : 'bg-purple-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setupEventListeners() {
    // Auth buttons
    elements.authBtn.addEventListener('click', handleAuthButtonClick);
    elements.showRegisterBtn.addEventListener('click', () => toggleAuthForms(true));
    elements.showLoginBtn.addEventListener('click', () => toggleAuthForms(false));
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.registerBtn.addEventListener('click', handleRegister);
    
    // Share functionality
    elements.copyCodeBtn.addEventListener('click', copyShareCode);
    elements.viewCodeBtn.addEventListener('click', handleViewCode);
    
    // Study session form
    elements.studyForm.addEventListener('submit', handleStudySessionSubmit);
}

function toggleAuthForms(showRegister) {
    elements.loginForm.classList.toggle('hidden', showRegister);
    elements.registerForm.classList.toggle('hidden', !showRegister);
}

async function handleAuthButtonClick() {
    if (elements.authBtn.textContent === 'Sign Out') {
        try {
            await auth.signOut();
            showToast('Signed out successfully');
        } catch (error) {
            showToast('Error signing out', true);
            console.error(error);
        }
    }
}

async function handleLogin() {
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    
    if (!validateEmail(email) || !password) {
        showToast('Please enter valid email and password', true);
        return;
    }
    
    try {
        elements.loginBtn.innerHTML = '<div class="spinner"></div>';
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Signed in successfully');
    } catch (error) {
        handleAuthError(error);
        elements.loginBtn.textContent = 'Sign In';
    }
}

async function handleRegister() {
    const email = elements.regEmailInput.value.trim();
    const password = elements.regPasswordInput.value;
    const name = elements.nameInput.value.trim();
    
    if (!validateEmail(email) || password.length < 6 || !name) {
        showToast('Please fill all fields (password min 6 chars)', true);
        return;
    }
    
    try {
        elements.registerBtn.innerHTML = '<div class="spinner"></div>';
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        await db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Account created successfully');
    } catch (error) {
        handleAuthError(error);
        elements.registerBtn.textContent = 'Register';
    }
}

function handleAuthError(error) {
    let message = 'Authentication error';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Email already in use';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/weak-password':
            message = 'Password should be at least 6 characters';
            break;
        case 'auth/user-not-found':
            message = 'User not found';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
    }
    
    showToast(message, true);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function copyShareCode() {
    try {
        await navigator.clipboard.writeText(elements.shareCodeInput.value);
        showToast('Share code copied!');
    } catch (error) {
        showToast('Failed to copy code', true);
    }
}

async function handleViewCode() {
    const code = elements.viewCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a share code', true);
        return;
    }
    
    try {
        elements.viewCodeBtn.innerHTML = '<div class="spinner"></div>';
        elements.viewOthersContainer.classList.add('hidden');
        
        const userSnapshot = await db.collection('users')
            .where('shareCode', '==', code)
            .limit(1)
            .get();
        
        if (userSnapshot.empty) {
            throw new Error('No user found with this share code');
        }
        
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        const userName = userDoc.data().name || 'Anonymous';
        
        const sessionsSnapshot = await db.collection('studySessions')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        displaySharedStats(userName, sessionsSnapshot.docs.map(d => d.data()));
    } catch (error) {
        showToast(error.message, true);
    } finally {
        elements.viewCodeBtn.textContent = 'View';
    }
}

function displaySharedStats(userName, sessions) {
    if (sessions.length === 0) {
        elements.viewOthersContainer.innerHTML = `
            <div class="bg-purple-50 rounded-lg p-6">
                <p class="text-center text-gray-600">No study data available for ${userName}</p>
            </div>
        `;
        elements.viewOthersContainer.classList.remove('hidden');
        return;
    }
    
    const { totalHours, subjectData } = processSessionData(sessions);
    const favoriteSubject = getFavoriteSubject(subjectData);
    const weeklyAverage = calculateWeeklyAverage(sessions);
    
    elements.viewOthersContainer.innerHTML = `
        <div class="bg-purple-50 rounded-lg p-6 animate__animated animate__fadeIn">
            <h4 class="text-lg font-semibold text-purple-800 mb-4">${userName}'s Study Stats</h4>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-gray-500">Total Hours</p>
                    <p class="text-2xl font-bold text-purple-600">${totalHours.toFixed(1)}</p>
                </div>
                <div class="bg-white rounded-lg p-4 shadow">
                    <p class="text-gray-500">Favorite Subject</p>
                    <p class="text-2xl font-bold text-purple-600">${favoriteSubject}</p>
                </div>
            </div>
            <div class="mt-4 bg-white rounded-lg p-4 shadow">
                <p class="text-gray-500">Weekly Average</p>
                <p class="text-2xl font-bold text-purple-600">${weeklyAverage} hrs</p>
            </div>
            <div class="mt-4 bg-white rounded-lg p-4 shadow">
                <p class="text-gray-500">Subject Distribution</p>
                <div class="h-48 mt-2">
                    <canvas id="viewedSubjectChart"></canvas>
                </div>
            </div>
        </div>
    `;
    
    renderViewedSubjectChart(subjectData);
    elements.viewOthersContainer.classList.remove('hidden');
}

function getFavoriteSubject(subjectData) {
    let favorite = 'None';
    let maxHours = 0;
    
    for (const [subject, hours] of Object.entries(subjectData)) {
        if (hours > maxHours) {
            maxHours = hours;
            favorite = subject.charAt(0).toUpperCase() + subject.slice(1);
        }
    }
    
    return favorite;
}

function calculateWeeklyAverage(sessions) {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    const weeklyHours = sessions
        .filter(s => new Date(s.date) >= fourWeeksAgo)
        .reduce((sum, s) => sum + s.duration, 0);
    
    return (weeklyHours / 4).toFixed(1);
}

function renderViewedSubjectChart(subjectData) {
    const ctx = document.getElementById('viewedSubjectChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: getSubjectChartData(subjectData),
        options: {
            ...getDoughnutOptions(),
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

async function handleStudySessionSubmit(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showToast('Please sign in to add sessions', true);
        return;
    }
    
    const subject = elements.subjectSelect.value;
    const duration = parseFloat(elements.durationInput.value);
    const date = elements.dateInput.value;
    
    if (!subject || !duration || duration <= 0 || !date) {
        showToast('Please enter valid session details', true);
        return;
    }
    
    const submitBtn = elements.studyForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="spinner"></div>';
    submitBtn.disabled = true;
    
    try {
        await db.collection('studySessions').add({
            userId: user.uid,
            subject,
            duration,
            date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Added ${duration} hours of ${subject} study`);
        elements.durationInput.value = '1';
        elements.dateInput.valueAsDate = new Date();
    } catch (error) {
        showToast('Error adding session', true);
        console.error(error);
    } finally {
        submitBtn.textContent = 'Add Session';
        submitBtn.disabled = false;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);
