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
        attendanceData = storedData ? JSON.parse(storedData) : [...SYSTEM_CONFIG.defaultData];
        
        // Initialize saved users from actual attendance data
        savedUsers = initializeSavedUsersFromData();
        
        console.log('📊 Data loaded - Attendance records:', attendanceData.length);
    } catch (error) {
        console.error('❌ Error loading data:', error);
        // Fallback to default data
        attendanceData = [...SYSTEM_CONFIG.defaultData];
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
    
    console.log('🔄 Saved users initialized');
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
        if (USERNAME === SYSTEM_CONFIG.adminCredentials. USERNAME && 
            PASSWORD === SYSTEM_CONFIG.adminCredentials. PASSWORD) {
            
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
    
    console.log('👷 Volunteer opportunities populated');
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
 * Export data to PDF
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
        
        // Create and download HTML file (PDF functionality would require additional library)
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `تقرير_الحضور_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showAlert('تم إنشاء التقرير بنجاح');
    } catch (error) {
        console.error('❌ PDF export error:', error);
        showAlert('حدث خطأ في إنشاء التقرير', 'error');
    } finally {
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
        
        // Create CSV header
        const header = ['الفئة', 'إجمالي الجلسات', 'الجلسات المكتملة', 'إجمالي الساعات', 'متوسط الجلسة', 'الأيام الفريدة', 'نسبة الإنجاز', 'المستخدمين النشطين'];
        
        // Create CSV rows
        const rows = [
            ['المتطوعين', volunteersStats.totalSessions, volunteersStats.completedSessions, 
             volunteersStats.totalHours.toFixed(1), volunteersStats.avgSessionHours, 
             volunteersStats.uniqueDays, volunteersStats.completionRate + '%', volunteersData.length],
            ['المتدربين', traineesStats.totalSessions, traineesStats.completedSessions, 
             traineesStats.totalHours.toFixed(1), traineesStats.avgSessionHours, 
             traineesStats.uniqueDays, traineesStats.completionRate + '%', traineesData.length],
            ['التمهير', preparatoryStats.totalSessions, preparatoryStats.completedSessions, 
             preparatoryStats.totalHours.toFixed(1), preparatoryStats.avgSessionHours, 
             preparatoryStats.uniqueDays, preparatoryStats.completionRate + '%', preparatoryData.length]
        ];
        
        // Combine header and rows
        const csvContent = [header, ...rows]
            .map(row => row.join(','))
            .join('\n');
        
        // Download file
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
 * Export KPIs to PDF
 */
function exportKPIToPDF() {
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
        
        // Generate PDF HTML content
        const htmlContent = generateKPIPDFHTML(volunteersStats, traineesStats, preparatoryStats);
        
        // Create and download HTML file
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = `تحليلات_المؤشرات_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showAlert('تم إنشاء تقرير التحليلات بنجاح');
    } catch (error) {
        console.error('❌ KPI PDF export error:', error);
        showAlert('حدث خطأ في إنشاء تقرير التحليلات', 'error');
    } finally {
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
    const tableRows = data.map(record => `
        <tr>
            <td>${record.city}</td>
            <td>${record.name}</td>
            <td>${record.phone}</td>
            <td>${record.type}</td>
            <td>${record.opportunity || '—'}</td>
            <td>${formatDateTime(record.checkIn)}</td>
            <td>${record.checkOut ? formatDateTime(record.checkOut) : 'لم يخرج بعد'}</td>
            <td>${calculateDuration(record.checkIn, record.checkOut)}</td>
            <td>${record.notes || ''}</td>
        </tr>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الحضور والانصراف</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
                h1 { color: #333; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                th { background-color: #546B68; color: white; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>تقرير الحضور والانصراف</h1>
            <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
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
            <div class="footer">
                <p>تم إنشاء التقرير بواسطة نظام الحضور الذكي | حــاضــر</p>
                <p>© ${new Date().getFullYear()} جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate KPI PDF HTML content
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
    
    let filterInfo = '<p style="color: #666; margin-bottom: 20px;">';
    if (cityFilter !== 'all') {
        filterInfo += `<strong>الفرع:</strong> ${cityFilter} | `;
    }
    if (phoneFilter) {
        filterInfo += `<strong>رقم الجوال:</strong> ${phoneFilter} | `;
    }
    if (dateFrom) {
        filterInfo += `<strong>من تاريخ:</strong> ${dateFrom} | `;
    }
    if (dateTo) {
        filterInfo += `<strong>إلى تاريخ:</strong> ${dateTo}`;
    }
    if (filterInfo === '<p style="color: #666; margin-bottom: 20px;">') {
        filterInfo += '<strong>الفلتر:</strong> جميع السجلات';
    }
    filterInfo += '</p>';
    
    return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير مؤشرات الأداء (KPIs)</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body { 
                    font-family: Arial, sans-serif; 
                    direction: rtl; 
                    padding: 30px;
                    background: #F0F0F0;
                }
                
                .header {
                    text-align: center;
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                h1 { 
                    color: #333; 
                    margin-bottom: 15px;
                    font-size: 32px;
                }
                
                .date-info {
                    color: #666;
                    font-size: 16px;
                    margin-top: 10px;
                }
                
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .kpi-card {
                    background: white;
                    padding: 25px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                    border-right: 5px solid #333;
                }
                
                .kpi-card.volunteers {
                    border-right-color: #96BCB7;
                }
                
                .kpi-card.trainees {
                    border-right-color: #44556A;
                }
                
                .kpi-card.preparatory {
                    border-right-color: #E87853;
                }
                
                .kpi-icon {
                    font-size: 40px;
                    margin-bottom: 15px;
                }
                
                .kpi-card.volunteers .kpi-icon { color: #96BCB7; }
                .kpi-card.trainees .kpi-icon { color: #44556A; }
                .kpi-card.preparatory .kpi-icon { color: #E87853; }
                
                .kpi-title {
                    font-size: 18px;
                    color: #666;
                    margin-bottom: 10px;
                }
                
                .kpi-value {
                    font-size: 36px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 15px;
                }
                
                .kpi-details {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                }
                
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .detail-row:last-child {
                    border-bottom: none;
                }
                
                .detail-label {
                    color: #666;
                    font-size: 14px;
                }
                
                .detail-value {
                    color: #333;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .footer { 
                    margin-top: 40px; 
                    text-align: center; 
                    color: #666; 
                    font-size: 14px;
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                }
                
                .footer p {
                    margin: 5px 0;
                }
                
                @media print {
                    body {
                        background: white;
                        padding: 20px;
                    }
                    
                    .kpi-card {
                        break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 تقرير مؤشرات الأداء الرئيسية (KPIs)</h1>
                <p class="date-info">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
                ${filterInfo}
            </div>
            
            <div class="kpi-grid">
                <div class="kpi-card volunteers">
                    <div class="kpi-icon">🤝</div>
                    <div class="kpi-title">المتطوعين</div>
                    <div class="kpi-value">${volunteersStats.totalSessions}</div>
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
                    <div class="kpi-icon">🎓</div>
                    <div class="kpi-title">المتدربين</div>
                    <div class="kpi-value">${traineesStats.totalSessions}</div>
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
                    <div class="kpi-icon">👨‍🎓</div>
                    <div class="kpi-title">التمهير</div>
                    <div class="kpi-value">${preparatoryStats.totalSessions}</div>
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
                            <span class_name="detail-value">${preparatoryStats.completionRate}%</span>
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
                    showForm('admin-login'); // Changed from showAdmin()
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