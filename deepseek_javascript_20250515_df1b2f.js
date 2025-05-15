// DOM Elements
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const authBtn = document.getElementById('authBtn');
const shareBtn = document.getElementById('shareBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const nameInput = document.getElementById('nameInput');
const regEmailInput = document.getElementById('regEmailInput');
const regPasswordInput = document.getElementById('regPasswordInput');
const shareCodeInput = document.getElementById('shareCodeInput');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const viewCodeInput = document.getElementById('viewCodeInput');
const viewCodeBtn = document.getElementById('viewCodeBtn');
const viewOthersContainer = document.getElementById('viewOthersContainer');
const studyForm = document.getElementById('studyForm');
const subjectSelect = document.getElementById('subjectSelect');
const durationInput = document.getElementById('durationInput');
const dateInput = document.getElementById('dateInput');

// Set today's date as default
dateInput.valueAsDate = new Date();

// Chart variables
let todayChart, weekChart, dailyChart, subjectChart;

// Initialize the app
function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            authSection.classList.add('hidden');
            dashboard.classList.remove('hidden');
            authBtn.textContent = 'Sign Out';
            shareBtn.classList.remove('hidden');
            
            // Generate or get share code
            generateShareCode(user.uid);
            
            // Load user data
            loadUserData(user.uid);
        } else {
            // User is signed out
            authSection.classList.remove('hidden');
            dashboard.classList.add('hidden');
            authBtn.textContent = 'Sign In';
            shareBtn.classList.add('hidden');
        }
    });
}

// Generate or get share code for user
function generateShareCode(uid) {
    db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) {
                if (doc.data().shareCode) {
                    shareCodeInput.value = doc.data().shareCode;
                } else {
                    createShareCode(uid);
                }
            } else {
                createShareCode(uid);
            }
        });
}

// Create a new share code
function createShareCode(uid) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.collection('users').doc(uid).set({
        shareCode: code
    }, { merge: true })
    .then(() => {
        shareCodeInput.value = code;
        showToast('Share code generated!');
    });
}

// Load user data and initialize charts
function loadUserData(uid) {
    // In a real app, you would fetch data from Firestore
    // For this example, we'll use mock data
    
    // Mock study sessions data
    const studySessions = [
        { subject: 'math', duration: 2, date: '2023-06-01' },
        { subject: 'science', duration: 1.5, date: '2023-06-02' },
        { subject: 'history', duration: 1, date: '2023-06-02' },
        { subject: 'math', duration: 3, date: '2023-06-03' },
        { subject: 'language', duration: 2, date: '2023-06-04' },
        { subject: 'other', duration: 1, date: '2023-06-05' },
        { subject: 'math', duration: 2.5, date: '2023-06-05' },
        { subject: 'science', duration: 2, date: '2023-06-06' },
    ];
    
    // Initialize charts with mock data
    initCharts(studySessions);
}

// Initialize all charts
function initCharts(sessions) {
    // Today's study chart (doughnut)
    const todayCtx = document.getElementById('todayChart').getContext('2d');
    todayChart = new Chart(todayCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [3.5, 4.5],
                backgroundColor: ['#4c51bf', '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Weekly study chart (doughnut)
    const weekCtx = document.getElementById('weekChart').getContext('2d');
    weekChart = new Chart(weekCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [18.2, 11.8],
                backgroundColor: ['#4299e1', '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Daily study hours chart (bar)
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    dailyChart = new Chart(dailyCtx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Study Hours',
                data: [2.5, 3, 4.5, 2, 3.5, 1.5, 1.2],
                backgroundColor: '#667eea',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
    
    // Subject distribution chart (pie)
    const subjectCtx = document.getElementById('subjectChart').getContext('2d');
    subjectChart = new Chart(subjectCtx, {
        type: 'pie',
        data: {
            labels: ['Math', 'Science', 'History', 'Language', 'Other'],
            datasets: [{
                data: [7.5, 3.5, 1, 2, 1],
                backgroundColor: [
                    '#4c51bf',
                    '#4299e1',
                    '#48bb78',
                    '#ed8936',
                    '#9f7aea'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Event Listeners
authBtn.addEventListener('click', () => {
    if (authBtn.textContent === 'Sign Out') {
        auth.signOut()
            .then(() => showToast('Signed out successfully'))
            .catch(error => showToast('Error signing out: ' + error.message));
    }
});

showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showToast('Please enter both email and password');
        return;
    }
    
    loginBtn.innerHTML = '<div class="spinner"></div>';
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showToast('Signed in successfully');
        })
        .catch(error => {
            showToast('Error signing in: ' + error.message);
            loginBtn.textContent = 'Sign In';
        });
});

registerBtn.addEventListener('click', () => {
    const email = regEmailInput.value;
    const password = regPasswordInput.value;
    const name = nameInput.value;
    
    if (!email || !password || !name) {
        showToast('Please fill all fields');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters');
        return;
    }
    
    registerBtn.innerHTML = '<div class="spinner"></div>';
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Add user to Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showToast('Account created successfully');
        })
        .catch(error => {
            showToast('Error creating account: ' + error.message);
            registerBtn.textContent = 'Register';
        });
});

copyCodeBtn.addEventListener('click', () => {
    shareCodeInput.select();
    document.execCommand('copy');
    showToast('Share code copied to clipboard!');
});

viewCodeBtn.addEventListener('click', () => {
    const code = viewCodeInput.value.trim();
    
    if (!code) {
        showToast('Please enter a share code');
        return;
    }
    
    viewCodeBtn.innerHTML = '<div class="spinner"></div>';
    
    // In a real app, you would query Firestore for this code
    // For this example, we'll simulate a successful query
    
    setTimeout(() => {
        viewCodeBtn.textContent = 'View';
        
        // Mock data for viewed user
        const mockData = {
            name: "John Doe",
            totalHours: 28.7,
            favoriteSubject: "Mathematics",
            weeklyAverage: 18.2
        };
        
        viewOthersContainer.innerHTML = `
            <div class="bg-purple-50 rounded-lg p-6 animate__animated animate__fadeIn">
                <h4 class="text-lg font-semibold text-purple-800 mb-4">${mockData.name}'s Study Stats</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white rounded-lg p-4 shadow">
                        <p class="text-gray-500">Total Hours</p>
                        <p class="text-2xl font-bold text-purple-600">${mockData.totalHours}</p>
                    </div>
                    <div class="bg-white rounded-lg p-4 shadow">
                        <p class="text-gray-500">Favorite Subject</p>
                        <p class="text-2xl font-bold text-purple-600">${mockData.favoriteSubject}</p>
                    </div>
                </div>
                <div class="mt-4 bg-white rounded-lg p-4 shadow">
                    <p class="text-gray-500">Weekly Average</p>
                    <p class="text-2xl font-bold text-purple-600">${mockData.weeklyAverage} hrs</p>
                </div>
            </div>
        `;
        
        viewOthersContainer.classList.remove('hidden');
    }, 1000);
});

studyForm.addEventListener('submit', e => {
    e.preventDefault();
    
    const subject = subjectSelect.value;
    const duration = parseFloat(durationInput.value);
    const date = dateInput.value;
    
    if (!subject || !duration || !date) {
        showToast('Please fill all fields');
        return;
    }
    
    // In a real app, you would save this to Firestore
    showToast(`Added ${duration} hours of ${subject} study for ${date}`);
    
    // Reset form
    durationInput.value = '1';
    dateInput.valueAsDate = new Date();
});

// Initialize the app
initApp();