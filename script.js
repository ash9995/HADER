/* ===============================================
   SMART ATTENDANCE SYSTEM - JAVASCRIPT
   =============================================== */

/* ===============================================
   SYSTEM CONFIGURATION & CONSTANTS
   =============================================== */

const SYSTEM_CONFIG = {
    // List of available cities/branches
    cities: [
        'الدمام', 'الرياض', 'جيزان', 'نجران', 
        'حايل', 'احد رفيده', 'بريدة', 'سكاكا'
    ],
    
    // Volunteer Opportunities
    volunteerOpportunities: [
        'دعم امين مكتبة',
        'دعم تقني',
        'دعم علاقات العملاء',
        'منسق فعاليات ثقافية',
        'منسق شراكات ميداني',
        'دعم مرافق',
        'مصمم جرافيك',
        'مصور فوتوغرافي'
    ],
    
    // Admin credentials (in production, this should be handled server-side)
    adminCredentials: {
        USERNAME: 'admin',
        PASSWORD: 'admin123456'
    },
 
    // Default data initialization
    defaultData: [],
    
    // User data storage keys
    storageKeys: {
        attendanceData: 'attendanceData',
        savedUsers: 'savedUsers',
        selectedCity: 'selectedCity'
    }
};

/* ===============================================
   GLOBAL VARIABLES
   =============================================== */

let attendanceData = []; // Main attendance records
let savedUsers = {}; // Saved user data for trainees and preparatory
let selectedCity = null; // Currently selected city

/* ===============================================
   APPLICATION INITIALIZATION
   =============================================== */

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
});

/**
 * Main application initialization function
 */
function initializeApplication() {
    try {
        // Set current year in footer
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
        
        // Check if city is selected
        selectedCity = localStorage.getItem(SYSTEM_CONFIG.storageKeys.selectedCity);
        
        if (!selectedCity) {
            console.log('🏢 No city selected - user needs to select from index.html');
            // If we're on main.html without a city, redirect to index.html
            if (window.location.pathname.includes('main.html')) {
                window.location.href = 'index.html';
            }
            return;
        }
        
        // City is already selected, load application
        loadApplicationData();
        setupEventListeners();
        populateCityFilter();
        populateOpportunitiesDropdown(); // Populate volunteer opportunities
        initializeSavedUsers();
        
        console.log('✅ Application initialized successfully for city:', selectedCity);
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showAlert('حدث خطأ في تحميل النظام', 'error');
    }
}

/**
 * Load application data from localStorage or use defaults
 */
function loadApplicationData() {
    try {
        // Load attendance data
        const storedData = localStorage.getItem(SYSTEM_CONFIG.storageKeys.attendanceData);
        attendanceData = storedData ? JSON.parse(storedData) : [];
        
        // Initialize saved users from actual attendance data
        savedUsers = initializeSavedUsersFromData();
        
        console.log('📊 Data loaded - Attendance records:', attendanceData.length);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        // Fallback to empty array
        attendanceData = [];
        savedUsers = { 'متدرب': [], 'تمهير': [] };
    }
}

/**
 * Initialize saved users from actual attendance data
 * @returns {Object} Saved users object
 */
function initializeSavedUsersFromData() {
    const users = { 'متدرب': [], 'تمهير': [] };
    
    // Extract unique users from attendance data
    const userMap = new Map();
    
    attendanceData.forEach(record => {
        if (record.type === 'متدرب' || record.type === 'تمهير') {
            const key = `${record.phone}-${record.type}`;
            if (!userMap.has(key)) {
                userMap.set(key, {
                    name: record.name,
                    phone: record.phone,
                    type: record.type
                });
            }
        }
    });
    
    // Group by type
    userMap.forEach(user => {
        users[user.type].push({
            name: user.name,
            phone: user.phone
        });
    });
    
    return users;
}

/**
 * Save application data to localStorage
 */
function saveApplicationData() {
    try {
        localStorage.setItem(SYSTEM_CONFIG.storageKeys.attendanceData, JSON.stringify(attendanceData));
        localStorage.setItem(SYSTEM_CONFIG.storageKeys.savedUsers, JSON.stringify(savedUsers));
        console.log('💾 Data saved successfully');
    } catch (error) {
        console.error('❌ Error saving data:', error);
        showAlert('حدث خطأ في حفظ البيانات', 'error');
    }
}

/* ===============================================
   EVENT LISTENERS SETUP
   =============================================== */

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Form submission handlers
    const checkinForm = document.getElementById('checkin-form');
    if (checkinForm) {
        checkinForm.addEventListener('submit', handleCheckInSubmission);
    }
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckOutSubmission);
    }
    
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLoginSubmission);
    }
    
    // Conditional form field listener
    const userTypeSelect = document.getElementById('user-type');
    if (userTypeSelect) {
        userTypeSelect.addEventListener('change', handleUserTypeChange);
    }
    
    // Filter change handlers
    const cityFilter = document.getElementById('city-filter');
    if (cityFilter) {
        cityFilter.addEventListener('change', updateDashboard);
    }
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', updateAttendanceTable);
    }
    
    // Phone filter handler
    const phoneFilter = document.getElementById('phone-filter');
    if (phoneFilter) {
        phoneFilter.addEventListener('input', updateDashboard);
    }
    
    // Date filter handlers
    const dateFrom = document.getElementById('date-from');
    if (dateFrom) {
        dateFrom.addEventListener('change', updateDashboard);
    }
    
    const dateTo = document.getElementById('date-to');
    if (dateTo) {
        dateTo.addEventListener('change', updateDashboard);
    }
    
    // Setup overlay closing handlers
    setupOverlayHandlers();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('🔗 Event listeners setup completed');
}

/**
 * Handle change in user type to show/hide volunteer opportunity
 */
function handleUserTypeChange() {
    const opportunityGroup = document.getElementById('opportunity-group');
    const userType = document.getElementById('user-type').value;
    
    if (userType === 'متطوع') {
        opportunityGroup.style.display = 'block';
        document.getElementById('opportunity-name').required = true;
    } else {
        opportunityGroup.style.display = 'none';
        document.getElementById('opportunity-name').required = false;
    }
}

/**
 * Initialize saved users dropdown
 */
function initializeSavedUsers() {
    savedUsers = { 'متدرب': [], 'تمهير': [] };
}

/**
 * Populate city filter dropdown in admin panel
 */
function populateCityFilter() {
    const cityFilter = document.getElementById('city-filter');
    if (!cityFilter) return;
    
    // Clear existing options except "All Cities"
    cityFilter.innerHTML = '<option value="all">جميع الفروع</option>';
    
    // Add all configured cities
    SYSTEM_CONFIG.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    // Set current city as selected
    if (selectedCity) {
        cityFilter.value = selectedCity;
    }
}

/**
 * Populate volunteer opportunities dropdown
 */
function populateOpportunitiesDropdown() {
    const opportunitySelect = document.getElementById('opportunity-name');
    if (!opportunitySelect) return;
    
    // Clear existing options except default
    opportunitySelect.innerHTML = '<option value="" disabled selected>اختر الفرصة</option>';
    
    // Add all opportunities
    SYSTEM_CONFIG.volunteerOpportunities.forEach(opportunity => {
        const option = document.createElement('option');
        option.value = opportunity;
        option.textContent = opportunity;
        opportunitySelect.appendChild(option);
    });
}

/* ===============================================
   FORM DISPLAY MANAGEMENT
   =============================================== */

/**
 * Show specific form overlay
 * @param {string} formType - Type of form to show (checkin/checkout/admin-login)
 */
function showForm(formType) {
    const overlay = document.getElementById(`${formType}-overlay`);
    if (!overlay) return;
    
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus on first input
    setTimeout(() => {
        const firstInput = overlay.querySelector('input, select');
        if (firstInput) firstInput.focus();
    }, 100);
    
    console.log(`📋 Form opened: ${formType}`);
}

/**
 * Hide specific form overlay
 * @param {string} formType - Type of form to hide
 */
function hideForm(formType) {
    const overlay = document.getElementById(`${formType}-overlay`);
    if (!overlay) return;
    
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form
    const form = overlay.querySelector('form');
    if (form) form.reset();
    
    // Hide opportunity field if visible
    const opportunityGroup = document.getElementById('opportunity-group');
    if (opportunityGroup) {
        opportunityGroup.style.display = 'none';
    }
    
    console.log(`📋 Form closed: ${formType}`);
}

/**
 * Show admin dashboard
 */
function showAdmin() {
    const overlay = document.getElementById('admin-overlay');
    if (!overlay) return;
    
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Update dashboard with latest data
    updateDashboard();
    
    console.log('📊 Admin dashboard opened');
}

/**
 * Hide admin dashboard
 */
function hideAdmin() {
    const overlay = document.getElementById('admin-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    console.log('📊 Admin dashboard closed');
}

/* ===============================================
   FORM SUBMISSION HANDLERS
   =============================================== */

/**
 * Handle check-in form submission
 * @param {Event} e - Form submission event
 */
function handleCheckInSubmission(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const name = document.getElementById('checkin-name').value.trim();
        const phone = document.getElementById('checkin-phone').value.trim();
        const type = document.getElementById('user-type').value;
        const opportunity = type === 'متطوع' ? document.getElementById('opportunity-name').value : '';
        
        // Validate phone number
        if (!validatePhone(phone)) {
            throw new Error('رقم الجوال غير صحيح');
        }
        
        // Check if user already has an active session
        const activeSession = attendanceData.find(
            record => record.phone === phone && 
                     record.city === selectedCity && 
                     !record.checkOut
        );
        
        if (activeSession) {
            throw new Error('لديك جلسة حضور مفتوحة بالفعل');
        }
        
        // Create new attendance record
        const newRecord = {
            id: generateId(),
            city: selectedCity,
            name: name,
            phone: phone,
            type: type,
            opportunity: opportunity,
            checkIn: getCurrentDateTime(),
            checkOut: null,
            duration: null,
            notes: ''
        };
        
        // Save user data for trainees and preparatory
        if (type === 'متدرب' || type === 'تمهير') {
            saveUser(name, phone, type);
        }
        
        // Add to attendance data
        attendanceData.push(newRecord);
        saveApplicationData();
        
        // Show success message
        showAlert(`✅ تم تسجيل حضور ${name} بنجاح`, 'success');
        hideForm('checkin');
        
        console.log('✅ Check-in successful:', newRecord);
    } catch (error) {
        console.error('❌ Check-in error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle check-out form submission
 * @param {Event} e - Form submission event
 */
function handleCheckOutSubmission(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const phone = document.getElementById('checkout-phone').value.trim();
        
        // Validate phone number
        if (!validatePhone(phone)) {
            throw new Error('رقم الجوال غير صحيح');
        }
        
        // Find active session for this phone number and city
        const activeSession = attendanceData.find(
            record => record.phone === phone && 
                     record.city === selectedCity && 
                     !record.checkOut
        );
        
        if (!activeSession) {
            throw new Error('لا يوجد سجل حضور نشط لهذا الرقم');
        }
        
        // Update check-out time and duration
        activeSession.checkOut = getCurrentDateTime();
        activeSession.duration = calculateDuration(activeSession.checkIn, activeSession.checkOut);
        
        saveApplicationData();
        
        // Show success message
        showAlert(`✅ تم تسجيل خروج ${activeSession.name} بنجاح`, 'success');
        hideForm('checkout');
        
        console.log('✅ Check-out successful:', activeSession);
    } catch (error) {
        console.error('❌ Check-out error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle admin login form submission
 * @param {Event} e - Form submission event
 */
function handleAdminLoginSubmission(e) {
    e.preventDefault();
    showLoading(true);
    
    try {
        const username = document.getElementById('admin-USERNAME').value.trim();
        const password = document.getElementById('admin-PASSWORD').value;
        
        // Validate credentials
        if (username === SYSTEM_CONFIG.adminCredentials.USERNAME && 
            password === SYSTEM_CONFIG.adminCredentials.PASSWORD) {
            
            hideForm('admin-login');
            showAdmin();
            showAlert('مرحباً بك في لوحة التحكم', 'success');
            
            console.log('✅ Admin login successful');
        } else {
            throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    } catch (error) {
        console.error('❌ Admin login error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/* ===============================================
   USER DATA MANAGEMENT
   =============================================== */

/**
 * Save user data for trainees and preparatory
 * @param {string} name - User name
 * @param {string} phone - User phone
 * @param {string} type - User type
 */
function saveUser(name, phone, type) {
    if (!savedUsers[type]) {
        savedUsers[type] = [];
    }
    
    // Check if user already exists
    const exists = savedUsers[type].some(user => user.phone === phone);
    
    if (!exists) {
        savedUsers[type].push({ name, phone });
        console.log(`👤 User saved: ${name} (${type})`);
    }
}

/* ===============================================
   VALIDATION FUNCTIONS
   =============================================== */

/**
 * Validate Saudi phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function validatePhone(phone) {
    // Saudi phone number pattern: starts with 05 and has 10 digits
    const phoneRegex = /^05\d{8}$/;
    return phoneRegex.test(phone);
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/* ===============================================
   DASHBOARD & ADMIN PANEL
   =============================================== */

/**
 * Update admin dashboard with filtered data
 */
function updateDashboard() {
    const filteredData = getFilteredData();
    
    // Update category statistics
    updateCategoryStats(filteredData);
    
    // Update attendance table
    updateAttendanceTable();
}

/**
 * Get filtered data based on current filter settings
 * @returns {Array} Filtered attendance data
 */
function getFilteredData() {
    let filtered = [...attendanceData];
    
    // City filter
    const cityFilter = document.getElementById('city-filter');
    if (cityFilter && cityFilter.value !== 'all') {
        filtered = filtered.filter(record => record.city === cityFilter.value);
    }
    
    // Phone filter
    const phoneFilter = document.getElementById('phone-filter');
    if (phoneFilter && phoneFilter.value.trim()) {
        const searchPhone = phoneFilter.value.trim();
        filtered = filtered.filter(record => record.phone.includes(searchPhone));
    }
    
    // Date range filter
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    
    if (dateFrom && dateFrom.value) {
        const fromDate = new Date(dateFrom.value);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.checkIn);
            return recordDate >= fromDate;
        });
    }
    
    if (dateTo && dateTo.value) {
        const toDate = new Date(dateTo.value);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(record => {
            const recordDate = new Date(record.checkIn);
            return recordDate <= toDate;
        });
    }
    
    return filtered;
}

/**
 * Update category statistics in dashboard
 * @param {Array} data - Filtered attendance data
 */
function updateCategoryStats(data) {
    const stats = {
        'متطوع': { sessions: 0, totalHours: 0, uniqueDays: new Set() },
        'متدرب': { sessions: 0, totalHours: 0, uniqueDays: new Set() },
        'تمهير': { sessions: 0, totalHours: 0, uniqueDays: new Set() }
    };
    
    data.forEach(record => {
        if (record.checkOut && stats[record.type]) {
            stats[record.type].sessions++;
            
            // Calculate hours
            const hours = calculateHours(record.checkIn, record.checkOut);
            stats[record.type].totalHours += hours;
            
            // Track unique days
            const day = new Date(record.checkIn).toDateString();
            stats[record.type].uniqueDays.add(day);
        }
    });
    
    // Update volunteer stats
    updateStatDisplay('volunteers', stats['متطوع']);
    
    // Update trainee stats
    updateStatDisplay('trainees', stats['متدرب']);
    
    // Update preparatory stats
    updateStatDisplay('preparatory', stats['تمهير']);
}

/**
 * Update stat display for a category
 * @param {string} category - Category name (volunteers/trainees/preparatory)
 * @param {Object} stat - Statistics object
 */
function updateStatDisplay(category, stat) {
    const sessionsEl = document.getElementById(`${category}-sessions`);
    const daysEl = document.getElementById(`${category}-total-days`);
    const hoursEl = document.getElementById(`${category}-total-hours`);
    
    if (sessionsEl) sessionsEl.textContent = stat.sessions;
    if (daysEl) daysEl.textContent = stat.uniqueDays.size;
    if (hoursEl) hoursEl.textContent = stat.totalHours.toFixed(1);
}

/**
 * Calculate hours between two datetime strings
 * @param {string} checkIn - Check-in datetime
 * @param {string} checkOut - Check-out datetime
 * @returns {number} Hours
 */
function calculateHours(checkIn, checkOut) {
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    return diffMs / (1000 * 60 * 60);
}

/**
 * Update attendance table
 */
function updateAttendanceTable() {
    const tbody = document.querySelector('#attendance-table tbody');
    if (!tbody) return;
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Get filtered data
    let filteredData = getFilteredData();
    
    // Apply category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter && categoryFilter.value !== 'all') {
        filteredData = filteredData.filter(record => record.type === categoryFilter.value);
    }
    
    // Sort by check-in time (most recent first)
    filteredData.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    
    // Populate table
    filteredData.forEach(record => {
        const row = createTableRow(record);
        tbody.appendChild(row);
    });
    
    console.log('📋 Table updated with', filteredData.length, 'records');
}

/**
 * Create table row for attendance record
 * @param {Object} record - Attendance record
 * @returns {HTMLElement} Table row element
 */
function createTableRow(record) {
    const row = document.createElement('tr');
    
    // Determine status class
    let statusClass = '';
    if (!record.checkOut) {
        statusClass = 'status-active';
    }
    
    row.className = statusClass;
    row.innerHTML = `
        <td>${record.city}</td>
        <td>${record.name}</td>
        <td>${record.phone}</td>
        <td><span class="badge badge-${record.type}">${record.type}</span></td>
        <td>${record.opportunity || '-'}</td>
        <td>${formatDateTime(record.checkIn)}</td>
        <td>${record.checkOut ? formatDateTime(record.checkOut) : '<span class="status-badge active">نشط</span>'}</td>
        <td>${record.duration || 'لم يخرج بعد'}</td>
        <td><input type="text" value="${record.notes || ''}" onchange="updateNotes('${record.id}', this.value)" placeholder="أضف ملاحظة"></td>
        <td>
            <button class="btn-icon btn-delete" onclick="deleteRecord('${record.id}')" title="حذف">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Update notes for a record
 * @param {string} id - Record ID
 * @param {string} notes - New notes
 */
function updateNotes(id, notes) {
    const record = attendanceData.find(r => r.id === id);
    if (record) {
        record.notes = notes;
        saveApplicationData();
        console.log('📝 Notes updated for record:', id);
    }
}

/**
 * Delete attendance record
 * @param {string} id - Record ID
 */
function deleteRecord(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        return;
    }
    
    const index = attendanceData.findIndex(r => r.id === id);
    if (index !== -1) {
        const record = attendanceData[index];
        attendanceData.splice(index, 1);
        saveApplicationData();
        updateDashboard();
        showAlert(`تم حذف سجل ${record.name}`, 'success');
        console.log('🗑️ Record deleted:', id);
    }
}

/* ===============================================
   EXPORT FUNCTIONS
   =============================================== */

/**
 * Export data to Excel
 */
function exportToExcel() {
    try {
        showLoading(true);
        
        const filteredData = getFilteredData();
        
        // Apply category filter
        const categoryFilter = document.getElementById('category-filter');
        let dataToExport = filteredData;
        if (categoryFilter && categoryFilter.value !== 'all') {
            dataToExport = filteredData.filter(record => record.type === categoryFilter.value);
        }
        
        if (dataToExport.length === 0) {
            throw new Error('لا توجد بيانات للتصدير');
        }
        
        // Create CSV content
        let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        csv += 'الفرع,الاسم,رقم الجوال,النوع,الفرصة التطوعية,وقت الدخول,وقت الخروج,المدة,ملاحظات\n';
        
        dataToExport.forEach(record => {
            csv += `"${record.city}","${record.name}","${record.phone}","${record.type}","${record.opportunity || '-'}","${formatDateTime(record.checkIn)}","${record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد'}","${record.duration || '-'}","${record.notes || ''}"\n`;
        });
        
        // Download file
        downloadFile(csv, 'attendance-data.csv', 'text/csv;charset=utf-8;');
        
        showAlert('تم تصدير البيانات بنجاح', 'success');
        console.log('📊 Data exported to Excel');
    } catch (error) {
        console.error('❌ Export error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export data to PDF
 */
function exportToPDF() {
    try {
        showLoading(true);
        
        const filteredData = getFilteredData();
        
        // Apply category filter
        const categoryFilter = document.getElementById('category-filter');
        let dataToExport = filteredData;
        if (categoryFilter && categoryFilter.value !== 'all') {
            dataToExport = filteredData.filter(record => record.type === categoryFilter.value);
        }
        
        if (dataToExport.length === 0) {
            throw new Error('لا توجد بيانات للتصدير');
        }
        
        // Generate HTML content for PDF
        const htmlContent = generatePDFContent(dataToExport);
        
        // Create a new window and print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        showAlert('جاري تجهيز ملف PDF', 'success');
        console.log('📄 PDF export initiated');
    } catch (error) {
        console.error('❌ PDF export error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export KPI data to Excel
 */
function exportKPIToExcel() {
    try {
        showLoading(true);
        
        const filteredData = getFilteredData();
        const stats = calculateDetailedStats(filteredData);
        
        // Create CSV content
        let csv = '\uFEFF'; // UTF-8 BOM
        csv += 'تقرير التحليلات - نظام الحضور الذكي\n\n';
        
        // Volunteers
        csv += 'المتطوعين\n';
        csv += 'المؤشر,القيمة\n';
        csv += `إجمالي الحضور,${stats.volunteers.totalSessions}\n`;
        csv += `الجلسات المكتملة,${stats.volunteers.completedSessions}\n`;
        csv += `إجمالي الساعات,${stats.volunteers.totalHours.toFixed(1)}\n`;
        csv += `متوسط الجلسة,${stats.volunteers.avgSessionHours}\n`;
        csv += `الأيام الفريدة,${stats.volunteers.uniqueDays}\n`;
        csv += `نسبة الإنجاز,${stats.volunteers.completionRate}%\n\n`;
        
        // Trainees
        csv += 'المتدربين\n';
        csv += 'المؤشر,القيمة\n';
        csv += `إجمالي الحضور,${stats.trainees.totalSessions}\n`;
        csv += `الجلسات المكتملة,${stats.trainees.completedSessions}\n`;
        csv += `إجمالي الساعات,${stats.trainees.totalHours.toFixed(1)}\n`;
        csv += `متوسط الجلسة,${stats.trainees.avgSessionHours}\n`;
        csv += `الأيام الفريدة,${stats.trainees.uniqueDays}\n`;
        csv += `نسبة الإنجاز,${stats.trainees.completionRate}%\n\n`;
        
        // Preparatory
        csv += 'التمهير\n';
        csv += 'المؤشر,القيمة\n';
        csv += `إجمالي الحضور,${stats.preparatory.totalSessions}\n`;
        csv += `الجلسات المكتملة,${stats.preparatory.completedSessions}\n`;
        csv += `إجمالي الساعات,${stats.preparatory.totalHours.toFixed(1)}\n`;
        csv += `متوسط الجلسة,${stats.preparatory.avgSessionHours}\n`;
        csv += `الأيام الفريدة,${stats.preparatory.uniqueDays}\n`;
        csv += `نسبة الإنجاز,${stats.preparatory.completionRate}%\n`;
        
        // Download file
        downloadFile(csv, 'kpi-analytics.csv', 'text/csv;charset=utf-8;');
        
        showAlert('تم تصدير التحليلات بنجاح', 'success');
        console.log('📊 KPI exported to Excel');
    } catch (error) {
        console.error('❌ KPI export error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export KPI data to PDF
 */
function exportKPIToPDF() {
    try {
        showLoading(true);
        
        const filteredData = getFilteredData();
        const stats = calculateDetailedStats(filteredData);
        
        // Generate HTML content for KPI PDF
        const htmlContent = generateKPIPDFContent(stats);
        
        // Create a new window and print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        showAlert('جاري تجهيز تقرير التحليلات', 'success');
        console.log('📄 KPI PDF export initiated');
    } catch (error) {
        console.error('❌ KPI PDF export error:', error);
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Calculate detailed statistics for KPI
 * @param {Array} data - Filtered attendance data
 * @returns {Object} Statistics object
 */
function calculateDetailedStats(data) {
    const stats = {
        volunteers: { totalSessions: 0, completedSessions: 0, totalHours: 0, uniqueDays: new Set(), avgSessionHours: 0, completionRate: 0 },
        trainees: { totalSessions: 0, completedSessions: 0, totalHours: 0, uniqueDays: new Set(), avgSessionHours: 0, completionRate: 0 },
        preparatory: { totalSessions: 0, completedSessions: 0, totalHours: 0, uniqueDays: new Set(), avgSessionHours: 0, completionRate: 0 }
    };
    
    const typeMap = {
        'متطوع': 'volunteers',
        'متدرب': 'trainees',
        'تمهير': 'preparatory'
    };
    
    data.forEach(record => {
        const category = typeMap[record.type];
        if (!category) return;
        
        stats[category].totalSessions++;
        
        if (record.checkOut) {
            stats[category].completedSessions++;
            const hours = calculateHours(record.checkIn, record.checkOut);
            stats[category].totalHours += hours;
            
            const day = new Date(record.checkIn).toDateString();
            stats[category].uniqueDays.add(day);
        }
    });
    
    // Calculate averages and completion rates
    Object.keys(stats).forEach(category => {
        const cat = stats[category];
        cat.avgSessionHours = cat.completedSessions > 0 
            ? (cat.totalHours / cat.completedSessions).toFixed(1) 
            : 0;
        cat.completionRate = cat.totalSessions > 0 
            ? Math.round((cat.completedSessions / cat.totalSessions) * 100) 
            : 0;
        cat.uniqueDays = cat.uniqueDays.size;
    });
    
    return stats;
}

/**
 * Download file helper function
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate PDF HTML content
 * @param {Array} data - Data to include in PDF
 * @returns {string} HTML content
 */
function generatePDFContent(data) {
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الحضور</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid #36E39B; padding-bottom: 10px; }
                .header h1 { color: #333; margin-bottom: 5px; }
                .header p { color: #666; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #36E39B; color: #000; padding: 10px; font-weight: bold; border: 1px solid #ddd; }
                td { padding: 8px; border: 1px solid #ddd; text-align: center; }
                tr:nth-child(even) { background: #f9f9f9; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 2px solid #ddd; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير الحضور والانصراف</h1>
                <p>نظام الحضور الذكي | حــاضــر</p>
                <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>الفرع</th>
                        <th>الاسم</th>
                        <th>رقم الجوال</th>
                        <th>النوع</th>
                        <th>الفرصة التطوعية</th>
                        <th>وقت الدخول</th>
                        <th>وقت الخروج</th>
                        <th>المدة</th>
                        <th>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(record => `
                        <tr>
                            <td>${record.city}</td>
                            <td>${record.name}</td>
                            <td>${record.phone}</td>
                            <td>${record.type}</td>
                            <td>${record.opportunity || '-'}</td>
                            <td>${formatDateTime(record.checkIn)}</td>
                            <td>${record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
                            <td>${record.duration || '-'}</td>
                            <td>${record.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p><strong>تم إنشاء التقرير بواسطة نظام الحضور الذكي | حــاضــر</strong></p>
                <p>تطوير: عائشة راشد الشمري | يوسف الأحمر</p>
                <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate KPI PDF HTML content
 * @param {Object} stats - Statistics data
 * @returns {string} HTML content
 */
function generateKPIPDFContent(stats) {
    const volunteersStats = stats.volunteers;
    const traineesStats = stats.trainees;
    const preparatoryStats = stats.preparatory;
    
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير التحليلات</title>
            <style>
                @page { size: A4; margin: 15mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #36E39B; padding-bottom: 15px; }
                .header h1 { color: #333; margin-bottom: 5px; font-size: 28px; }
                .header p { color: #666; font-size: 14px; }
                .kpi-container { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 20px; }
                .kpi-card { border: 2px solid #ddd; border-radius: 10px; padding: 20px; background: #f9f9f9; }
                .kpi-card.volunteers { border-color: #96BCB7; }
                .kpi-card.trainees { border-color: #44556A; }
                .kpi-card.preparatory { border-color: #E87853; }
                .kpi-title { font-size: 24px; font-weight: bold; margin-bottom: 15px; text-align: center; }
                .kpi-details { margin-top: 10px; }
                .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                .detail-label { font-weight: bold; color: #555; }
                .detail-value { color: #333; font-size: 18px; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 2px solid #ddd; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير التحليلات والإحصائيات</h1>
                <p>نظام الحضور الذكي | حــاضــر</p>
                <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
            </div>
            
            <div class="kpi-container">
                <div class="kpi-card volunteers">
                    <div class="kpi-title">👋 المتطوعين</div>
                    <div class="kpi-details">
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الحضور</span>
                            <span class="detail-value">${volunteersStats.totalSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الجلسات المكتملة</span>
                            <span class="detail-value">${volunteersStats.completedSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الساعات</span>
                            <span class="detail-value">${volunteersStats.totalHours.toFixed(1)} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">متوسط الجلسة</span>
                            <span class="detail-value">${volunteersStats.avgSessionHours} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الأيام الفريدة</span>
                            <span class="detail-value">${volunteersStats.uniqueDays} يوم</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">نسبة الإنجاز</span>
                            <span class="detail-value">${volunteersStats.completionRate}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card trainees">
                    <div class="kpi-title">🎓 المتدربين</div>
                    <div class="kpi-details">
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الحضور</span>
                            <span class="detail-value">${traineesStats.totalSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الجلسات المكتملة</span>
                            <span class="detail-value">${traineesStats.completedSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الساعات</span>
                            <span class="detail-value">${traineesStats.totalHours.toFixed(1)} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">متوسط الجلسة</span>
                            <span class="detail-value">${traineesStats.avgSessionHours} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الأيام الفريدة</span>
                            <span class="detail-value">${traineesStats.uniqueDays} يوم</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">نسبة الإنجاز</span>
                            <span class="detail-value">${traineesStats.completionRate}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card preparatory">
                    <div class="kpi-title">👨‍🎓 التمهير</div>
                    <div class="kpi-details">
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الحضور</span>
                            <span class="detail-value">${preparatoryStats.totalSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الجلسات المكتملة</span>
                            <span class="detail-value">${preparatoryStats.completedSessions}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">إجمالي الساعات</span>
                            <span class="detail-value">${preparatoryStats.totalHours.toFixed(1)} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">متوسط الجلسة</span>
                            <span class="detail-value">${preparatoryStats.avgSessionHours} ساعة</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">الأيام الفريدة</span>
                            <span class="detail-value">${preparatoryStats.uniqueDays} يوم</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">نسبة الإنجاز</span>
                            <span class="detail-value">${preparatoryStats.completionRate}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>تم إنشاء التقرير بواسطة نظام الحضور الذكي | حــاضــر</strong></p>
                <p>تطوير: عائشة راشد الشمري | يوسف الأحمر</p>
                <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}
/* ===============================================
   UTILITY FUNCTIONS
   =============================================== */

/**
 * Get current date and time as formatted string
 * @returns {string} Current datetime in YYYY-MM-DD HH:MM:SS format
 */
function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Format datetime string for display
 * @param {string} dateTimeString - Datetime string to format
 * @returns {string} Formatted datetime
 */
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const dateTime = new Date(dateTimeString);
    
    // Format time (12-hour format)
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Format date
    const day = dateTime.getDate();
    const month = dateTime.getMonth() + 1;
    const year = dateTime.getFullYear();
    const formattedDate = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
    
    return `${formattedDate} ${formattedTime}`;
}

/**
 * Calculate duration between check-in and check-out
 * @param {string} checkIn - Check-in datetime
 * @param {string} checkOut - Check-out datetime
 * @returns {string} Duration string
 */
function calculateDuration(checkIn, checkOut) {
    if (!checkOut) return 'لم يخرج بعد';
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    
    const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
    
    return `${diffHrs} ساعات و ${diffMins} دقائق`;
}

/* ===============================================
   UI UTILITY FUNCTIONS
   =============================================== */

/**
 * Show alert message
 * @param {string} message - Alert message
 * @param {string} type - Alert type (success/error)
 */
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alert-message');
    if (!alert) return;
    
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, type === 'error' ? 5000 : 3000);
    
    console.log(`${type === 'error' ? '⚠️' : '✅'} Alert:`, message);
}

/**
 * Show/hide loading spinner
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (!spinner) return;
    
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

/* ===============================================
   EVENT HANDLERS FOR OVERLAYS & SHORTCUTS
   =============================================== */

/**
 * Setup overlay closing handlers
 */
function setupOverlayHandlers() {
    // Close overlays when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('form-overlay')) {
            const overlayId = e.target.id;
            const formType = overlayId.replace('-overlay', '');
            hideForm(formType);
        }
        
        if (e.target.classList.contains('admin-overlay')) {
            hideAdmin();
        }
    });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Close overlays with Escape key
        if (e.key === 'Escape') {
            const activeOverlay = document.querySelector('.form-overlay.active, .admin-overlay.active');
            if (activeOverlay) {
                if (activeOverlay.classList.contains('admin-overlay')) {
                    hideAdmin();
                } else {
                    const formType = activeOverlay.id.replace('-overlay', '');
                    hideForm(formType);
                }
            }
        }
        
        // Quick shortcuts (Ctrl/Cmd + key)
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    showForm('checkin');
                    break;
                case '2':
                    e.preventDefault();
                    showForm('checkout');
                    break;
                case '3':
                    e.preventDefault();
                    showForm('admin-login');
                    break;
            }
        }
    });
}

/* ===============================================
   INITIALIZATION COMPLETE
   =============================================== */

console.log('🚀 Smart Attendance System JavaScript loaded successfully');
console.log('📋 Available shortcuts: Ctrl+1 (Check-in), Ctrl+2 (Check-out), Ctrl+3 (Admin), ESC (Close)');
