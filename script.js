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
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        // Check if city is selected
        selectedCity = localStorage.getItem(SYSTEM_CONFIG.storageKeys.selectedCity);
        
        if (!selectedCity) {
            console.log('🏢 No city selected - user needs to select from index.html');
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
        attendanceData = storedData ? JSON.parse(storedData) : []; // Removed default data
        
        // Initialize saved users from actual attendance data
        savedUsers = initializeSavedUsersFromData();
        
        console.log('📊 Data loaded - Attendance records:', attendanceData.length);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        // Fallback to empty data
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
    const opportunitySelect = document.getElementById('opportunity-name');
    
    if (this.value === 'متطوع') {
        opportunityGroup.style.display = 'block';
        opportunitySelect.required = true;
    } else {
        opportunityGroup.style.display = 'none';
        opportunitySelect.required = false;
        opportunitySelect.value = ''; // Reset value
    }
}

/* ===============================================
   FORM MANAGEMENT FUNCTIONS
   =============================================== */

/**
 * Show form overlay
 * @param {string} formType - Type of form to show (checkin/checkout/admin-login)
 */
function showForm(formType) {
    const overlay = document.getElementById(formType + '-overlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input field
        const firstInput = overlay.querySelector('input, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
        
        console.log('📝 Form opened:', formType);
    }
}

/**
 * Hide form overlay
 * @param {string} formType - Type of form to hide (checkin/checkout/admin-login)
 */
function hideForm(formType) {
    const overlay = document.getElementById(formType + '-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset form
        const form = overlay.querySelector('form');
        if (form) form.reset();
        
        // Specifically hide conditional fields
        if (formType === 'checkin') {
            const opportunityGroup = document.getElementById('opportunity-group');
            const opportunitySelect = document.getElementById('opportunity-name');
            if (opportunityGroup) opportunityGroup.style.display = 'none';
            if (opportunitySelect) opportunitySelect.required = false;
        }
        
        console.log('❌ Form closed:', formType);
    }
}

/**
 * Hide admin panel
 */
function hideAdmin() {
    const overlay = document.getElementById('admin-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        console.log('❌ Admin panel closed');
    }
}

/* ===============================================
   AUTO-COMPLETE FUNCTIONALITY
   =============================================== */

/**
 * Initialize saved users for faster check-in
 */
function initializeSavedUsers() {
    // Ensure saved users structure exists
    if (!savedUsers['متدرب']) savedUsers['متدرب'] = [];
    if (!savedUsers['تمهير']) savedUsers['تمهير'] = [];
    
    console.log('📄 Saved users initialized');
}

/* ===============================================
   CHECK-IN/CHECK-OUT PROCESSING
   =============================================== */

/**
 * Handle check-in form submission
 * @param {Event} event - Form submission event
 */
function handleCheckInSubmission(event) {
    event.preventDefault();
    showLoading(true);
    
    try {
        const formData = getCheckInFormData();
        
        // Validate form data
        const validation = validateCheckInData(formData);
        if (!validation.isValid) {
            showAlert(validation.message, 'error');
            showLoading(false);
            return;
        }
        
        // Check for existing check-in
        if (hasExistingCheckIn(formData.phone)) {
            showAlert('هذا الرقم مسجل بالفعل اليوم ولم يسجل خروج', 'error');
            showLoading(false);
            return;
        }
        
        // Save user for future reference (trainees and preparatory only)
        if (formData.type === 'متدرب' || formData.type === 'تمهير') {
            saveUserData(formData);
        }
        
        // Create and save new attendance record
        const newRecord = createAttendanceRecord(formData);
        attendanceData.push(newRecord);
        saveApplicationData();
        
        // Update UI and show success message
        hideForm('checkin');
        showAlert(`تم تسجيل حضور ${formData.name} بنجاح`);
        
        console.log('✅ Check-in successful for:', formData.name);
        
    } catch (error) {
        console.error('❌ Check-in error:', error);
        showAlert('حدث خطأ أثناء تسجيل الحضور', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle admin login form submission
 * @param {Event} event - Form submission event
 */
function handleAdminLoginSubmission(event) {
    event.preventDefault();
    showLoading(true);
    
    try {
        const USERNAME = document.getElementById('admin-USERNAME').value;
        const PASSWORD = document.getElementById('admin-PASSWORD').value;
        
        // Check credentials
        if (USERNAME === SYSTEM_CONFIG.adminCredentials.USERNAME && 
            PASSWORD === SYSTEM_CONFIG.adminCredentials.PASSWORD) {
            
            hideForm('admin-login'); // Hide the login modal
            
            // Show the admin dashboard
            const overlay = document.getElementById('admin-overlay');
            if (overlay) {
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                updateDashboard(); // Load dashboard data
                console.log('🔧 Admin panel opened');
            }
        } else {
            showAlert('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
            console.log('❌ Invalid credentials');
        }
        
    } catch (error) {
        console.error('❌ Admin login error:', error);
        showAlert('حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle check-out form submission
 * @param {Event} event - Form submission event
 */
function handleCheckOutSubmission(event) {
    event.preventDefault();
    showLoading(true);
    
    try {
        const phone = document.getElementById('checkout-phone').value.trim();
        
        // Validate phone number
        if (!phone) {
            showAlert('الرجاء إدخال رقم الجوال', 'error');
            showLoading(false);
            return;
        }
        
        // Find active attendance record
        const recordIndex = findActiveRecord(phone);
        
        if (recordIndex === -1) {
            showAlert('لا يوجد حضور مسجل لهذا الرقم أو تم تسجيل الخروج مسبقاً', 'error');
            showLoading(false);
            return;
        }
        
        // Update record with check-out time
        attendanceData[recordIndex].checkOut = getCurrentDateTime();
        saveApplicationData();
        
        // Update UI and show success message
        hideForm('checkout');
        showAlert(`تم تسجيل خروج ${attendanceData[recordIndex].name} بنجاح`);
        
        console.log('✅ Check-out successful for:', attendanceData[recordIndex].name);
        
    } catch (error) {
        console.error('❌ Check-out error:', error);
        showAlert('حدث خطأ أثناء تسجيل الخروج', 'error');
    } finally {
        showLoading(false);
    }
}
/**
 * Get check-in form data
 * @returns {Object} Form data object
 */
function getCheckInFormData() {
    const userType = document.getElementById('user-type').value;
    let opportunity = '';
    
    if (userType === 'متطوع') {
        opportunity = document.getElementById('opportunity-name').value;
    }
    
    return {
        city: selectedCity,
        name: document.getElementById('checkin-name').value.trim(),
        phone: document.getElementById('checkin-phone').value.trim(),
        type: userType,
        opportunity: opportunity
    };
}

/**
 * Check if user already has an active check-in today
 * @param {string} phone - Phone number to check
 * @returns {boolean} True if has existing check-in
 */
function hasExistingCheckIn(phone) {
    const today = new Date().toISOString().split('T')[0];
    return attendanceData.some(record => 
        record.phone === phone && 
        record.city === selectedCity &&
        record.checkIn && 
        record.checkIn.startsWith(today) && 
        !record.checkOut
    );
}

/**
 * Find active attendance record for today
 * @param {string} phone - Phone number to search
 * @returns {number} Record index or -1 if not found
 */
function findActiveRecord(phone) {
    const today = new Date().toISOString().split('T')[0];
    return attendanceData.findIndex(record => 
        record.phone === phone && 
        record.city === selectedCity &&
        record.checkIn && 
        record.checkIn.startsWith(today) && 
        !record.checkOut
    );
}

/**
 * Validate check-in data
 * @param {Object} data - Form data to validate
 * @returns {Object} Validation result
 */
function validateCheckInData(data) {
    if (!data.name || !data.phone || !data.type) {
        return { isValid: false, message: 'الرجاء إدخال جميع البيانات المطلوبة' };
    }
    
    // Validate opportunity if user is a volunteer
    if (data.type === 'متطوع' && !data.opportunity) {
        return { isValid: false, message: 'الرجاء اختيار مسمى الفرصة التطوعية' };
    }
    
    if (!/^05\d{8}$/.test(data.phone)) {
        return { isValid: false, message: 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام' };
    }
    
    return { isValid: true };
}

/**
 * Save user data for future reference
 * @param {Object} formData - User data to save
 */
function saveUserData(formData) {
    const userType = formData.type;
    const existingUser = savedUsers[userType].find(user => user.phone === formData.phone);
    
    if (!existingUser) {
        savedUsers[userType].push({
            name: formData.name,
            phone: formData.phone
        });
        console.log('💾 User saved for reference:', formData.name);
    }
}

/**
 * Create new attendance record
 * @param {Object} formData - Form data
 * @returns {Object} New attendance record
 */
function createAttendanceRecord(formData) {
    return {
        id: attendanceData.length > 0 ? Math.max(...attendanceData.map(r => r.id)) + 1 : 1,
        city: formData.city,
        name: formData.name,
        phone: formData.phone,
        type: formData.type,
        opportunity: formData.opportunity || "", // Add opportunity
        checkIn: getCurrentDateTime(),
        checkOut: null,
        notes: ""
    };
}

/* ===============================================
   DASHBOARD UPDATE FUNCTIONS
   =============================================== */

/**
 * Update entire dashboard including KPIs and table
 */
function updateDashboard() {
    updateCategoryKPIs();
    updateAttendanceTable();
    console.log('📊 Dashboard updated');
}

/**
 * Update detailed category KPIs
 */
function updateCategoryKPIs() {
    const filteredData = getFilteredAttendanceData();
    
    // Calculate volunteers KPIs
    const volunteersData = filteredData.filter(r => r.type === 'متطوع');
    const volunteersStats = calculateCategoryStats(volunteersData, 'متطوع');
    
    updateKPIElement('volunteers-sessions', volunteersStats.totalSessions);
    updateKPIElement('volunteers-total-days', volunteersStats.uniqueDays);
    updateKPIElement('volunteers-total-hours', volunteersStats.totalHours.toFixed(1));
    
    // Calculate trainees KPIs
    const traineesData = filteredData.filter(r => r.type === 'متدرب');
    const traineesStats = calculateCategoryStats(traineesData, 'متدرب');
    
    updateKPIElement('trainees-sessions', traineesStats.totalSessions);
    updateKPIElement('trainees-total-days', traineesStats.uniqueDays);
    updateKPIElement('trainees-total-hours', traineesStats.totalHours.toFixed(1));
    
    // Calculate preparatory KPIs
    const preparatoryData = filteredData.filter(r => r.type === 'تمهير');
    const preparatoryStats = calculateCategoryStats(preparatoryData, 'تمهير');
    
    updateKPIElement('preparatory-sessions', preparatoryStats.totalSessions);
    updateKPIElement('preparatory-total-days', preparatoryStats.uniqueDays);
    updateKPIElement('preparatory-total-hours', preparatoryStats.totalHours.toFixed(1));
    
    console.log('📈 Category KPIs updated');
}

/**
 * Calculate detailed statistics for a category
 * @param {Array} data - Category data
 * @param {string} type - Category type
 * @returns {Object} Category statistics
 */
function calculateCategoryStats(data, type) {
    const totalSessions = data.length;
    const completedSessions = data.filter(r => r.checkOut).length;
    const totalHours = calculateTotalHours(data);
    const avgSessionHours = completedSessions > 0 ? (totalHours / completedSessions).toFixed(1) : 0;
    
    // Calculate unique days
    const uniqueDaysSet = new Set();
    data.forEach(record => {
        if (record.checkIn) {
            uniqueDaysSet.add(record.checkIn.split(' ')[0]);
        }
    });
    const uniqueDays = uniqueDaysSet.size;
    
    // Calculate completion rate based on expected program duration
    let completionRate = 0;
    if (type === 'متدرب' || type === 'تمهير') {
        // Assuming 6-month program (approximately 180 days)
        const expectedDays = 180;
        completionRate = Math.min(Math.round((uniqueDays / expectedDays) * 100), 100);
    } else if (type === 'متطوع') {
        // For volunteers, completion rate is based on completed sessions
        completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    }
    
    return {
        totalSessions,
        completedSessions,
        totalHours,
        avgSessionHours,
        uniqueDays,
        completionRate // This is still calculated but just not displayed for trainees/preparatory
    };
}

/**
 * Update KPI element
 * @param {string} elementId - Element ID
 * @param {string|number} value - Value to display
 */
function updateKPIElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

/* ===============================================
   CALCULATION FUNCTIONS
   =============================================== */

/**
 * Calculate total hours for all records
 * @param {Array} records - All records
 * @returns {number} Total hours
 */
function calculateTotalHours(records) {
    const completedRecords = records.filter(r => r.checkOut);
    const totalHours = completedRecords.reduce((sum, record) => {
        return sum + calculateSessionHours(record.checkIn, record.checkOut);
    }, 0);
    
    return Math.round(totalHours);
}

/**
 * Calculate session hours between check-in and check-out
 * @param {string} checkIn - Check-in datetime string
 * @param {string} checkOut - Check-out datetime string
 * @returns {number} Hours between check-in and check-out
 */
function calculateSessionHours(checkIn, checkOut) {
    if (!checkOut) return 0;
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diffMs = checkOutTime - checkInTime;
    
    return diffMs / (1000 * 60 * 60); // Convert to hours
}

/* ===============================================
   DATA FILTERING FUNCTIONS
   =============================================== */

/**
 * Get filtered attendance data based on current filters
 * @returns {Array} Filtered attendance data
 */
function getFilteredAttendanceData() {
    const cityFilter = document.getElementById('city-filter')?.value || 'all';
    const phoneFilter = document.getElementById('phone-filter')?.value.trim() || '';
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';
    
    let filteredData = attendanceData;
    
    // Filter by city
    if (cityFilter !== 'all') {
        filteredData = filteredData.filter(record => record.city === cityFilter);
    }
    
    // Filter by phone number
    if (phoneFilter) {
        filteredData = filteredData.filter(record => 
            record.phone.includes(phoneFilter)
        );
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
        filteredData = filteredData.filter(record => {
            if (!record.checkIn) return false;
            const recordDate = record.checkIn.split(' ')[0];
            
            if (dateFrom && dateTo) {
                return recordDate >= dateFrom && recordDate <= dateTo;
            } else if (dateFrom) {
                return recordDate >= dateFrom;
            } else if (dateTo) {
                return recordDate <= dateTo;
            }
            return true;
        });
    }
    
    return filteredData;
}
/* ===============================================
   TABLE MANAGEMENT FUNCTIONS
   =============================================== */

/**
 * Update attendance table
 */
function updateAttendanceTable() {
    const filteredData = getFilteredAttendanceData();
    const categoryFilter = document.getElementById('category-filter')?.value || 'all';
    
    let displayData = filteredData;
    if (categoryFilter !== 'all') {
        displayData = filteredData.filter(record => record.type === categoryFilter);
    }
    
    const tableBody = document.querySelector('#attendance-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Sort by check-in time (newest first)
    displayData.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
    
    displayData.forEach(record => {
        const row = createTableRow(record);
        tableBody.appendChild(row);
    });
    
    console.log('📋 Table updated with', displayData.length, 'records');
}

/**
 * Create table row element
 * @param {Object} record - Attendance record
 * @returns {HTMLElement} Table row element
 */
function createTableRow(record) {
    const row = document.createElement('tr');
    
    const opportunityCell = record.type === 'متطوع' ? (record.opportunity || '—') : '—';
    
    row.innerHTML = `
        <td>${record.city}</td>
        <td>${record.name}</td>
        <td>${record.phone}</td>
        <td>${record.type}</td>
        <td>${opportunityCell}</td>
        <td>${formatDateTime(record.checkIn)}</td>
        <td>${record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
        <td>${calculateDuration(record.checkIn, record.checkOut)}</td>
        <td contenteditable="true" onfocusout="updateNotes(${record.id}, this.textContent)">${record.notes || ''}</td>
        <td>
            <button class="btn btn-reset" onclick="deleteRecord(${record.id})" style="padding: 8px 12px; font-size: 0.9rem; min-width: auto;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return row;
}

/**
 * Update notes for a record
 * @param {number} id - Record ID
 * @param {string} notes - New notes text
 */
function updateNotes(id, notes) {
    const record = attendanceData.find(r => r.id === id);
    if (record) {
        record.notes = notes.trim();
        saveApplicationData();
        console.log('📝 Notes updated for record:', id);
    }
}

/**
 * Delete specific record
 * @param {number} id - Record ID to delete
 */
function deleteRecord(id) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
        const recordIndex = attendanceData.findIndex(record => record.id === id);
        if (recordIndex !== -1) {
            const deletedRecord = attendanceData[recordIndex];
            attendanceData.splice(recordIndex, 1);
            saveApplicationData();
            updateDashboard();
            showAlert('تم حذف السجل بنجاح', 'success');
            console.log('🗑️ Record deleted:', deletedRecord.name);
        }
    }
}

/**
 * Populate city filter dropdown
 */
function populateCityFilter() {
    const cityFilter = document.getElementById('city-filter');
    if (!cityFilter) return;
    
    cityFilter.innerHTML = '<option value="all">جميع الفروع</option>';
    
    SYSTEM_CONFIG.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    console.log('🏢 City filter populated');
}

/**
 * Populate volunteer opportunities dropdown
 */
function populateOpportunitiesDropdown() {
    const opportunitySelect = document.getElementById('opportunity-name');
    if (!opportunitySelect) return;
    
    // Clear existing options except the first one
    opportunitySelect.innerHTML = '<option value="" disabled selected>اختر الفرصة</option>';
    
    SYSTEM_CONFIG.volunteerOpportunities.forEach(opportunity => {
        const option = document.createElement('option');
        option.value = opportunity;
        option.textContent = opportunity;
        opportunitySelect.appendChild(option);
    });
    
    console.log('💼 Volunteer opportunities populated');
}

/* ===============================================
   EXPORT FUNCTIONS
   =============================================== */

/**
 * Export data to Excel (CSV format)
 */
function exportToExcel() {
    showLoading(true);
    
    try {
        const categoryFilter = document.getElementById('category-filter')?.value || 'all';
        const filteredData = getFilteredAttendanceData();
        
        let exportData = filteredData;
        if (categoryFilter !== 'all') {
            exportData = filteredData.filter(record => record.type === categoryFilter);
        }
        
        // Create CSV header
        const header = ['الفرع', 'الاسم', 'رقم الجوال', 'النوع', 'الفرصة التطوعية', 'وقت الدخول', 'وقت الخروج', 'المدة', 'ملاحظات'];
        
        // Create CSV rows
        const rows = exportData.map(record => [
            record.city,
            record.name,
            record.phone,
            record.type,
            record.opportunity || '',
            formatDateTime(record.checkIn),
            record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد',
            calculateDuration(record.checkIn, record.checkOut),
            record.notes || ''
        ]);
        
        // Combine header and rows
        const csvContent = [header, ...rows]
            .map(row => row.join(','))
            .join('\n');
        
        // Download file
        downloadCSVFile(csvContent, 'attendance_data');
        showAlert('تم تصدير البيانات بنجاح');
    } catch (error) {
        console.error('❌ Export error:', error);
        showAlert('حدث خطأ في تصدير البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export data to PDF using jsPDF and html2canvas
 */
function exportToPDF() {
    showLoading(true);
    
    try {
        const categoryFilter = document.getElementById('category-filter')?.value || 'all';
        const filteredData = getFilteredAttendanceData();
        
        let exportData = filteredData;
        if (categoryFilter !== 'all') {
            exportData = filteredData.filter(record => record.type === categoryFilter);
        }
        
        // Generate PDF HTML content
        const htmlContent = generatePDFHTML(exportData);
        
        // Create a temporary, off-screen element to render the HTML
        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.top = '-9999px';
        printContainer.style.left = '0';
        printContainer.style.width = '210mm'; // A4 width
        printContainer.innerHTML = htmlContent;
        document.body.appendChild(printContainer);

        // Use html2canvas to capture the rendered HTML
        html2canvas(printContainer, { 
            scale: 2, // Higher scale for better quality
            useCORS: true 
        }).then(canvas => {
            // A4 page dimensions in mm [width, height]
            const pageHeight = 297; 
            const pageWidth = 210;
            
            // Canvas dimensions
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Add first page
            pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add new pages if content is longer than one page
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Download the PDF
            pdf.save(`تقرير_الحضور_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // Clean up
            document.body.removeChild(printContainer);
            showLoading(false);
            showAlert('تم تحميل التقرير بنجاح');
            
        }).catch(err => {
            console.error('❌ PDF capture error:', err);
            document.body.removeChild(printContainer);
            showLoading(false);
            showAlert('حدث خطأ أثناء إنشاء ملف PDF', 'error');
        });

    } catch (error) {
        console.error('❌ PDF export error:', error);
        showAlert('حدث خطأ في إنشاء التقرير', 'error');
        showLoading(false);
    }
}

/**
 * Export KPIs to Excel
 */
function exportKPIToExcel() {
    showLoading(true);
    
    try {
        const filteredData = getFilteredAttendanceData();
        
        // Calculate KPIs for each category
        const volunteersData = filteredData.filter(r => r.type === 'متطوع');
        const traineesData = filteredData.filter(r => r.type === 'متدرب');
        const preparatoryData = filteredData.filter(r => r.type === 'تمهير');
        
        const volunteersStats = calculateCategoryStats(volunteersData, 'متطوع');
        const traineesStats = calculateCategoryStats(traineesData, 'متدرب');
        const preparatoryStats = calculateCategoryStats(preparatoryData, 'تمهير');
        
        // Create CSV header - simplified to match PDF
        const header = ['الفئة', 'إجمالي الحضور', 'الأيام', 'إجمالي الساعات'];
        
        // Create CSV rows - simplified to match PDF
        const rows = [
            ['المتطوعين', volunteersStats.totalSessions, volunteersStats.uniqueDays, volunteersStats.totalHours.toFixed(1)],
            ['المتدربين', traineesStats.totalSessions, traineesStats.uniqueDays, traineesStats.totalHours.toFixed(1)],
            ['التمهير', preparatoryStats.totalSessions, preparatoryStats.uniqueDays, preparatoryStats.totalHours.toFixed(1)]
        ];
        
        // Combine header and rows
        const csvContent = [header, ...rows]
            .map(row => row.join(','))
            .join('\n');
        
        // Download file with BOM for Arabic support
        downloadCSVFile(csvContent, 'kpi_analytics');
        showAlert('تم تصدير التحليلات بنجاح');
    } catch (error) {
        console.error('❌ KPI export error:', error);
        showAlert('حدث خطأ في تصدير التحليلات', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export KPIs to PDF using jsPDF and html2canvas
 */
function exportKPIToPDF() {
    showLoading(true);
    
    try {
        const filteredData = getFilteredAttendanceData();
        
        const volunteersData = filteredData.filter(r => r.type === 'متطوع');
        const traineesData = filteredData.filter(r => r.type === 'متدرب');
        const preparatoryData = filteredData.filter(r => r.type === 'تمهير');
        
        const volunteersStats = calculateCategoryStats(volunteersData, 'متطوع');
        const traineesStats = calculateCategoryStats(traineesData, 'متدرب');
        const preparatoryStats = calculateCategoryStats(preparatoryData, 'تمهير');
        
        // Generate PDF HTML content
        const htmlContent = generateKPIPDFHTML(volunteersStats, traineesStats, preparatoryStats);
        
        // Create a temporary, off-screen element to render the HTML
        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.top = '-9999px';
        printContainer.style.left = '0';
        printContainer.style.width = '800px';
        printContainer.innerHTML = htmlContent;
        document.body.appendChild(printContainer);
        
        // Use html2canvas to capture the rendered HTML
        html2canvas(printContainer, { 
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 800
        }).then(canvas => {
            // A4 page dimensions in mm
            const pageWidth = 210;
            const pageHeight = 297;
            
            // Canvas dimensions
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            let position = 10; // Start 10mm from top
            
            // Add image to PDF
            pdf.addImage(canvas, 'PNG', 10, position, imgWidth, imgHeight);
            
            // Download the PDF
            pdf.save(`تحليلات_المؤشرات_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // Clean up
            document.body.removeChild(printContainer);
            showLoading(false);
            showAlert('تم تحميل تقرير التحليلات بنجاح');
            
        }).catch(err => {
            console.error('❌ KPI PDF capture error:', err);
            document.body.removeChild(printContainer);
            showLoading(false);
            showAlert('حدث خطأ أثناء إنشاء ملف PDF', 'error');
        });

    } catch (error) {
        console.error('❌ KPI PDF export error:', error);
        showAlert('حدث خطأ في إنشاء تقرير التحليلات', 'error');
        showLoading(false);
    }
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - Base filename
 */
function downloadCSVFile(csv, filename) {
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Generate PDF HTML content for attendance data
 * @param {Array} data - Attendance data
 * @returns {string} HTML content
 */
function generatePDFHTML(data) {
    const tableRows = data.map((record, index) => `
        <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : 'background-color: white;'}">
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.city}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.name}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.phone}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.type}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.opportunity || '—'}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${formatDateTime(record.checkIn)}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${calculateDuration(record.checkIn, record.checkOut)}</td>
            <td style="padding: 12px 10px; border: 1px solid #ddd; text-align: right; font-size: 11px;">${record.notes || ''}</td>
        </tr>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الحضور والانصراف</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body { 
                    font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                    direction: rtl; 
                    padding: 30px;
                    background: white;
                    color: #333;
                    line-height: 1.6;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #546B68;
                }
                .logo-section {
                    margin-bottom: 15px;
                }
                .logo-section h1 {
                    color: #546B68;
                    font-size: 32px;
                    margin-bottom: 8px;
                    font-weight: 700;
                }
                .report-title {
                    color: #333;
                    font-size: 24px;
                    margin: 15px 0 10px 0;
                    font-weight: 600;
                }
                .date-info {
                    color: #666;
                    font-size: 14px;
                    margin-top: 10px;
                }
                .summary-section {
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                    border: 1px solid #ddd;
                }
                .summary-section h3 {
                    color: #546B68;
                    margin-bottom: 12px;
                    font-size: 16px;
                    font-weight: 600;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                }
                .summary-item {
                    background: white;
                    padding: 12px;
                    border-radius: 5px;
                    text-align: center;
                    border: 1px solid #e0e0e0;
                }
                .summary-item .number {
                    font-size: 24px;
                    font-weight: bold;
                    color: #546B68;
                    display: block;
                    margin-bottom: 5px;
                }
                .summary-item .label {
                    font-size: 12px;
                    color: #666;
                }
                .table-section {
                    margin-top: 25px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                thead {
                    background: #546B68;
                    color: white;
                }
                th { 
                    padding: 14px 10px;
                    text-align: right;
                    font-weight: 600;
                    font-size: 12px;
                    border: 1px solid #546B68;
                }
                td {
                    padding: 12px 10px;
                    border: 1px solid #ddd;
                    text-align: right;
                    font-size: 11px;
                }
                tr:nth-child(even) { 
                    background-color: #f9f9f9;
                }
                .footer { 
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e0e0e0;
                    text-align: center;
                }
                .footer p {
                    color: #666;
                    font-size: 11px;
                    margin: 5px 0;
                }
                .footer .system-name {
                    color: #546B68;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    <h1>حـــاضــر | Hader</h1>
                </div>
                <div class="report-title">تقرير الحضور والانصراف</div>
                <div class="date-info">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')} | ${new Date().toLocaleTimeString('ar-SA')}</div>
            </div>
            
            <div class="summary-section">
                <h3>ملخص البيانات</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="number">${data.length}</span>
                        <span class="label">إجمالي السجلات</span>
                    </div>
                    <div class="summary-item">
                        <span class="number">${data.filter(r => r.checkOut).length}</span>
                        <span class="label">تم تسجيل الخروج</span>
                    </div>
                    <div class="summary-item">
                        <span class="number">${data.filter(r => !r.checkOut).length}</span>
                        <span class="label">لم يخرج بعد</span>
                    </div>
                </div>
            </div>
            
            <div class="table-section">
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
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            
            <div class="footer">
                <p class="system-name">نظام الحضور الذكي | حـــاضــر</p>
                <p>تطوير: عائشة راشد الشمري | يوسف الأحمر</p>
                <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate KPI PDF HTML content - FIXED VERSION WITH NO OVERLAPPING
 * @param {Object} volunteersStats - Volunteers statistics
 * @param {Object} traineesStats - Trainees statistics
 * @param {Object} preparatoryStats - Preparatory statistics
 * @returns {string} HTML content
 */
function generateKPIPDFHTML(volunteersStats, traineesStats, preparatoryStats) {
    // Get filter information for display
    const cityFilter = document.getElementById('city-filter')?.value || 'all';
    const phoneFilter = document.getElementById('phone-filter')?.value.trim() || '';
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';
    
    let filterInfo = '';
    const filters = [];
    if (cityFilter !== 'all') filters.push(`<strong>الفرع:</strong> ${cityFilter}`);
    if (phoneFilter) filters.push(`<strong>رقم الجوال:</strong> ${phoneFilter}`);
    if (dateFrom) filters.push(`<strong>من تاريخ:</strong> ${dateFrom}`);
    if (dateTo) filters.push(`<strong>إلى تاريخ:</strong> ${dateTo}`);
    
    if (filters.length > 0) {
        filterInfo = `<div class="filter-info">${filters.join(' | ')}</div>`;
    } else {
        filterInfo = '<div class="filter-info"><strong>الفلتر:</strong> جميع السجلات</div>';
    }
    
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير مؤشرات الأداء الرئيسية</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body { 
                    font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
                    direction: rtl; 
                    padding: 30px;
                    background: white;
                    color: #333;
                    line-height: 1.4;
                    width: 800px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #546B68;
                }
                
                .logo-section h1 {
                    color: #546B68;
                    font-size: 28px;
                    margin-bottom: 8px;
                    font-weight: 700;
                }
                
                .report-title {
                    color: #333;
                    font-size: 18px;
                    margin: 10px 0;
                    font-weight: 600;
                }
                
                .date-info {
                    color: #666;
                    font-size: 12px;
                    margin-top: 8px;
                }
                
                .filter-info {
                    background: #f5f5f5;
                    padding: 12px 20px;
                    border-radius: 6px;
                    margin: 15px 0 25px 0;
                    font-size: 11px;
                    color: #555;
                    border: 1px solid #ddd;
                }
                
                .kpi-section {
                    margin-bottom: 20px;
                }
                
                .kpi-card {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    border: 2px solid #e0e0e0;
                    margin-bottom: 15px;
                    page-break-inside: avoid;
                }
                
                .kpi-card.volunteers {
                    border-top: 4px solid #96BCB7;
                }
                
                .kpi-card.trainees {
                    border-top: 4px solid #44556A;
                }
                
                .kpi-card.preparatory {
                    border-top: 4px solid #E87853;
                }
                
                .kpi-header {
                    padding: 12px 20px;
                    text-align: center;
                    color: white;
                    font-weight: 600;
                }
                
                .kpi-card.volunteers .kpi-header {
                    background: #96BCB7;
                }
                
                .kpi-card.trainees .kpi-header {
                    background: #44556A;
                }
                
                .kpi-card.preparatory .kpi-header {
                    background: #E87853;
                }
                
                .kpi-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .kpi-body {
                    display: flex;
                    justify-content: space-around;
                    padding: 15px;
                    background: white;
                }
                
                .kpi-item {
                    text-align: center;
                    flex: 1;
                    padding: 10px;
                }
                
                .kpi-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #333;
                    display: block;
                    margin-bottom: 5px;
                }
                
                .kpi-label {
                    font-size: 11px;
                    color: #666;
                    font-weight: 500;
                }
                
                .summary-table {
                    width: 100%;
                    margin: 25px 0;
                    border-collapse: collapse;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    page-break-inside: avoid;
                }
                
                .summary-table thead {
                    background: #546B68;
                    color: white;
                }
                
                .summary-table th {
                    padding: 12px 10px;
                    text-align: center;
                    font-size: 12px;
                    font-weight: 600;
                    border: 1px solid #546B68;
                }
                
                .summary-table td {
                    padding: 12px 10px;
                    border: 1px solid #e0e0e0;
                    font-size: 13px;
                    text-align: center;
                }
                
                .summary-table tbody tr:nth-child(even) {
                    background: #f9f9f9;
                }
                
                .category-volunteers {
                    border-right: 3px solid #96BCB7;
                }
                
                .category-trainees {
                    border-right: 3px solid #44556A;
                }
                
                .category-preparatory {
                    border-right: 3px solid #E87853;
                }
                
                .footer { 
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #e0e0e0;
                    text-align: center;
                }
                
                .footer p {
                    color: #666;
                    font-size: 10px;
                    margin: 4px 0;
                }
                
                .footer .system-name {
                    color: #546B68;
                    font-weight: 700;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    <h1>حـــاضــر | Hader</h1>
                </div>
                <div class="report-title">تقرير مؤشرات الأداء الرئيسية</div>
                <div class="date-info">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')} | ${new Date().toLocaleTimeString('ar-SA')}</div>
                ${filterInfo}
            </div>
            
            <div class="kpi-section">
                <div class="kpi-card volunteers">
                    <div class="kpi-header">
                        <h3>المتطوعين</h3>
                    </div>
                    <div class="kpi-body">
                        <div class="kpi-item">
                            <span class="kpi-value">${volunteersStats.totalSessions}</span>
                            <span class="kpi-label">إجمالي الحضور</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${volunteersStats.uniqueDays}</span>
                            <span class="kpi-label">الأيام</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${volunteersStats.totalHours.toFixed(1)}</span>
                            <span class="kpi-label">إجمالي الساعات</span>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card trainees">
                    <div class="kpi-header">
                        <h3>المتدربين</h3>
                    </div>
                    <div class="kpi-body">
                        <div class="kpi-item">
                            <span class="kpi-value">${traineesStats.totalSessions}</span>
                            <span class="kpi-label">إجمالي الحضور</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${traineesStats.uniqueDays}</span>
                            <span class="kpi-label">الأيام</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${traineesStats.totalHours.toFixed(1)}</span>
                            <span class="kpi-label">إجمالي الساعات</span>
                        </div>
                    </div>
                </div>
                
                <div class="kpi-card preparatory">
                    <div class="kpi-header">
                        <h3>التمهير</h3>
                    </div>
                    <div class="kpi-body">
                        <div class="kpi-item">
                            <span class="kpi-value">${preparatoryStats.totalSessions}</span>
                            <span class="kpi-label">إجمالي الحضور</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${preparatoryStats.uniqueDays}</span>
                            <span class="kpi-label">الأيام</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${preparatoryStats.totalHours.toFixed(1)}</span>
                            <span class="kpi-label">إجمالي الساعات</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>الفئة</th>
                        <th>إجمالي الحضور</th>
                        <th>الأيام</th>
                        <th>إجمالي الساعات</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="category-volunteers">
                        <td><strong>المتطوعين</strong></td>
                        <td>${volunteersStats.totalSessions}</td>
                        <td>${volunteersStats.uniqueDays}</td>
                        <td>${volunteersStats.totalHours.toFixed(1)}</td>
                    </tr>
                    <tr class="category-trainees">
                        <td><strong>المتدربين</strong></td>
                        <td>${traineesStats.totalSessions}</td>
                        <td>${traineesStats.uniqueDays}</td>
                        <td>${traineesStats.totalHours.toFixed(1)}</td>
                    </tr>
                    <tr class="category-preparatory">
                        <td><strong>التمهير</strong></td>
                        <td>${preparatoryStats.totalSessions}</td>
                        <td>${preparatoryStats.uniqueDays}</td>
                        <td>${preparatoryStats.totalHours.toFixed(1)}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="footer">
                <p class="system-name">نظام الحضور الذكي | حـــاضــر</p>
                <p>تطوير: عائشة راشد الشمري | يوسف الأحمر</p>
                <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}

/* ===============================================
   HELPER FUNCTIONS - DATE & TIME (MODIFIED)
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
 * Formats a Date object into a readable time string for the table
 * @param {Date} dateObj - The Date object to format
 * @returns {string} The formatted time string (e.g., "١:٣٠:٠٠ رهش" or "١:٣٠:٠٠ موي")
 */
function formatTimeForTable(dateObj) {
    // استخدم 'ar-SA' للإعدادات المحلية العربية السعودية لضمان الأرقام العربية
    // وتنسيق الوقت
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true, // للتأكد من استخدام ص/م أو مؤشر مشابه
    });

    let formattedTime = timeFormatter.format(dateObj);
    
    // التعديل ليناسب (رهش / موي)
    // 1. استبدال "ص" بـ "موي" (صباحاً)
    // 2. استبدال "م" بـ "رهش" (مساءً)
    formattedTime = formattedTime.replace(/ص/g, 'موي').replace(/م/g, 'رهش');

    return formattedTime;
}


/**
 * Formats a Date object into a readable date string
 * @param {Date} dateObj - The Date object to format
 * @returns {string} The formatted date string (e.g., "٠٤/٢٠/٢٠٢٣")
 */
function formatDateForTable(dateObj) {
    // استخدم 'ar-SA' للحصول على التنسيق باللغة العربية، وتنسيق (شهر/يوم/سنة)
    const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: '2-digit', // الشهر (مقدم)
        day: '2-digit',   // اليوم
    });
    
    const dateString = dateFormatter.format(dateObj);
    const dateParts = dateString.split('/'); 
    
    // يتم تنسيق التاريخ في 'ar-SA' عادةً كـ (يوم/شهر/سنة)، لكن في هذه الحالة نضمن عرضه كـ (شهر/يوم/سنة)
    // عبر استخدام ترتيب المكونات إذا لزم الأمر، لكننا نعتمد على toLocaleString/Intl.DateTimeFormat للحصول على الأرقام العربية.
    // وبما أن تنسيق ar-SA هو ي/م/س (عادة)، سنقوم بترتيبه ليصبح م/ي/س.
    if (dateParts.length === 3) {
        return `${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`; // الترتيب: شهر/يوم/سنة
    }

    return dateString;
}


/**
 * Format datetime string for display (جدول الإدارة وعمليات التصدير)
 * **التنسيق:** شهر/يوم/سنة HH:MM:SS رهش/موي
 * @param {string} dateTimeString - Datetime string to format
 * @returns {string} Formatted datetime
 */
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    
    const dateTime = new Date(dateTimeString);
    
    // --- تنسيق الوقت مع رهش / موي ---
    const timeFormatter = new Intl.DateTimeFormat('ar-SA', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });

    let formattedTime = timeFormatter.format(dateTime);
    // استبدال "ص" بـ "موي" و "م" بـ "رهش"
    formattedTime = formattedTime.replace(/ص/g, 'موي').replace(/م/g, 'رهش');
    
    // --- تنسيق التاريخ (شهر/يوم/سنة) ---
    const dateFormatter = new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: '2-digit', // الشهر
        day: '2-digit',   // اليوم
    });
    
    const dateString = dateFormatter.format(dateTime);
    const dateParts = dateString.split('/'); 
    
    // يتم تنسيق 'ar-SA' عادةً كـ ي/م/س، نريده م/ي/س
    const formattedDate = dateParts.length === 3 ? `${dateParts[1]}/${dateParts[0]}/${dateParts[2]}` : dateString;
    
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