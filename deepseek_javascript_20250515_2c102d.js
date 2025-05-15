// DOM Elements (same as before)
// ...

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
async function generateShareCode(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists && userDoc.data().shareCode) {
            shareCodeInput.value = userDoc.data().shareCode;
        } else {
            await createShareCode(uid);
        }
    } catch (error) {
        showToast('Error generating share code: ' + error.message);
    }
}

// Create a new share code
async function createShareCode(uid) {
    try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await db.collection('users').doc(uid).set({
            shareCode: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        shareCodeInput.value = code;
        showToast('Share code generated!');
    } catch (error) {
        showToast('Error creating share code: ' + error.message);
    }
}

// Load user data and initialize charts
async function loadUserData(uid) {
    try {
        // Get study sessions
        const snapshot = await db.collection('studySessions')
            .where('userId', '==', uid)
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        const studySessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Initialize charts with real data
        initCharts(studySessions);
        
        // Set up real-time listener for new sessions
        db.collection('studySessions')
            .where('userId', '==', uid)
            .orderBy('date', 'desc')
            .limit(100)
            .onSnapshot(snapshot => {
                const updatedSessions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                updateCharts(updatedSessions);
            });
    } catch (error) {
        showToast('Error loading data: ' + error.message);
    }
}

// Process session data for charts
function processSessionData(sessions) {
    // Group by date for daily chart
    const dailyData = {};
    const subjectData = {};
    let totalHours = 0;
    
    // Get last 7 days for weekly data
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    sessions.forEach(session => {
        const date = session.date;
        const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        
        // Daily data
        if (!dailyData[date]) {
            dailyData[date] = {
                day,
                hours: 0
            };
        }
        dailyData[date].hours += session.duration;
        
        // Subject data
        if (!subjectData[session.subject]) {
            subjectData[session.subject] = 0;
        }
        subjectData[session.subject] += session.duration;
        
        // Total hours
        totalHours += session.duration;
    });
    
    // Today's hours
    const today = new Date().toISOString().split('T')[0];
    const todayHours = dailyData[today] ? dailyData[today].hours : 0;
    
    // Weekly hours (last 7 days)
    const weeklyHours = last7Days.reduce((sum, date) => {
        return sum + (dailyData[date] ? dailyData[date].hours : 0);
    }, 0);
    
    return {
        todayHours,
        weeklyHours,
        dailyData,
        subjectData,
        totalHours
    };
}

// Initialize all charts with real data
function initCharts(sessions) {
    const { todayHours, weeklyHours, dailyData, subjectData } = processSessionData(sessions);
    
    // Today's study chart (doughnut)
    const todayCtx = document.getElementById('todayChart').getContext('2d');
    todayChart = new Chart(todayCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [todayHours, Math.max(0, 8 - todayHours)],
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
                data: [weeklyHours, Math.max(0, 40 - weeklyHours)],
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
                data: getLast7DaysData(dailyData),
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
            labels: Object.keys(subjectData),
            datasets: [{
                data: Object.values(subjectData),
                backgroundColor: [
                    '#4c51bf',
                    '#4299e1',
                    '#48bb78',
                    '#ed8936',
                    '#9f7aea',
                    '#f56565'
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

// Update charts with new data
function updateCharts(sessions) {
    const { todayHours, weeklyHours, dailyData, subjectData } = processSessionData(sessions);
    
    // Update today's chart
    todayChart.data.datasets[0].data = [todayHours, Math.max(0, 8 - todayHours)];
    todayChart.update();
    
    // Update weekly chart
    weekChart.data.datasets[0].data = [weeklyHours, Math.max(0, 40 - weeklyHours)];
    weekChart.update();
    
    // Update daily chart
    dailyChart.data.datasets[0].data = getLast7DaysData(dailyData);
    dailyChart.update();
    
    // Update subject chart
    subjectChart.data.labels = Object.keys(subjectData);
    subjectChart.data.datasets[0].data = Object.values(subjectData);
    subjectChart.update();
}

// Helper to get last 7 days data
function getLast7DaysData(dailyData) {
    const last7Days = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        last7Days.unshift({
            day: dayName,
            hours: dailyData[dateStr] ? dailyData[dateStr].hours : 0
        });
    }
    
    return last7Days.map(day => day.hours);
}

// View other user's stats by share code
viewCodeBtn.addEventListener('click', async () => {
    const code = viewCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a share code');
        return;
    }
    
    viewCodeBtn.innerHTML = '<div class="spinner"></div>';
    viewOthersContainer.classList.add('hidden');
    
    try {
        // Find user with this share code
        const snapshot = await db.collection('users')
            .where('shareCode', '==', code)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            showToast('No user found with this share code');
            viewCodeBtn.textContent = 'View';
            return;
        }
        
        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;
        const userName = userDoc.data().name || 'Anonymous';
        
        // Get their study sessions
        const sessionsSnapshot = await db.collection('studySessions')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        const sessions = sessionsSnapshot.docs.map(doc => doc.data());
        const { totalHours, subjectData } = processSessionData(sessions);
        
        // Find favorite subject
        let favoriteSubject = 'None';
        let maxHours = 0;
        for (const [subject, hours] of Object.entries(subjectData)) {
            if (hours > maxHours) {
                maxHours = hours;
                favoriteSubject = subject;
            }
        }
        
        // Calculate weekly average (last 4 weeks)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        
        const weeklySessions = sessions.filter(session => 
            new Date(session.date) >= fourWeeksAgo
        );
        
        const weeklyHours = weeklySessions.reduce((sum, session) => 
            sum + session.duration, 0
        );
        
        const weeklyAverage = (weeklyHours / 4).toFixed(1);
        
        // Display the data
        viewOthersContainer.innerHTML = `
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
        
        // Render subject chart for viewed user
        const viewedSubjectCtx = document.getElementById('viewedSubjectChart').getContext('2d');
        new Chart(viewedSubjectCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(subjectData),
                datasets: [{
                    data: Object.values(subjectData),
                    backgroundColor: [
                        '#4c51bf',
                        '#4299e1',
                        '#48bb78',
                        '#ed8936',
                        '#9f7aea',
                        '#f56565'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        viewOthersContainer.classList.remove('hidden');
    } catch (error) {
        showToast('Error viewing stats: ' + error.message);
    }
    
    viewCodeBtn.textContent = 'View';
});

// Add new study session
studyForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showToast('Please sign in to add sessions');
        return;
    }
    
    const subject = subjectSelect.value;
    const duration = parseFloat(durationInput.value);
    const date = dateInput.value;
    
    if (!subject || !duration || !date) {
        showToast('Please fill all fields');
        return;
    }
    
    if (duration <= 0) {
        showToast('Duration must be positive');
        return;
    }
    
    const submitBtn = studyForm.querySelector('button[type="submit"]');
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
        
        showToast(`Added ${duration} hours of ${subject} study for ${date}`);
        durationInput.value = '1';
        dateInput.valueAsDate = new Date();
    } catch (error) {
        showToast('Error adding session: ' + error.message);
    } finally {
        submitBtn.textContent = 'Add Session';
        submitBtn.disabled = false;
    }
});

// Rest of the code (event listeners for auth, etc.) remains the same
// ...

// Initialize the app
initApp();