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
    adminCredentials: [
        { USERNAME: 'admin', PASSWORD: 'admin@123' },
        { USERNAME: 'thurya', PASSWORD: 'thurya123' },
        { USERNAME: 'specialist2', PASSWORD: 'spec456' }
    ],
 
    
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
        
        // Initial dashboard update
        updateDashboard();
        
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
    
    // Date filter handlers - Set English input type
    const dateFrom = document.getElementById('date-from');
    if (dateFrom) {
        dateFrom.addEventListener('change', updateDashboard);
        dateFrom.setAttribute('lang', 'en');
    }
    
    const dateTo = document.getElementById('date-to');
    if (dateTo) {
        dateTo.addEventListener('change', updateDashboard);
        dateTo.setAttribute('lang', 'en');
    }
    
    // Setup overlay closing handlers
    setupOverlayHandlers(); 
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Export button listeners
    document.getElementById('export-excel-btn')?.addEventListener('click', exportToExcel);
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportToPDF);
    document.getElementById('export-kpi-excel-btn')?.addEventListener('click', exportKPIToExcel);
    document.getElementById('export-kpi-pdf-btn')?.addEventListener('click', exportKPIToPDF);
    
    // Import button listeners
    document.getElementById('import-csv-btn')?.addEventListener('click', () => {
        document.getElementById('csv-file-input').click();
    });
    document.getElementById('csv-file-input')?.addEventListener('change', handleFileUpload);
    
    console.log('🔗 Event listeners setup completed');
}

/**
 * Setup overlay closing handlers (missing function added)
 */
function setupOverlayHandlers() {
    const overlays = document.querySelectorAll('.form-overlay, .admin-overlay');
    overlays.forEach(overlay => {
        // Close when clicking outside the form container
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (overlay.classList.contains('admin-overlay')) {
                    hideAdmin();
                } else {
                    const formType = overlay.id.replace('-overlay', '');
                    hideForm(formType);
                }
            }
        });
    });
}


/**
 * Handle change in user type to show/hide volunteer opportunity
 */
function handleUserTypeChange() {
    const opportunityGroup = document.getElementById('opportunity-group');
    const opportunitySelect = document.getElementById('opportunity-name');
    const nationalIdGroup = document.getElementById('national-id-group');
    const nationalIdInput = document.getElementById('national-id');
    
    if (this.value === 'متطوع') {
        opportunityGroup.style.display = 'block';
        opportunitySelect.required = true;
        nationalIdGroup.style.display = 'block';
        nationalIdInput.required = true;
    } else {
        opportunityGroup.style.display = 'none';
        opportunitySelect.required = false;
        opportunitySelect.value = ''; // Reset value
        
        nationalIdGroup.style.display = 'none';
        nationalIdInput.required = false;
        nationalIdInput.value = ''; // Reset value
    }
}

/**
 * دالة تبديل نوع الهوية (سعودي / غير سعودي)
 */
function toggleIdType() {
    const isNonSaudi = document.getElementById('is-non-saudi').checked;
    const label = document.getElementById('national-id-label');
    const input = document.getElementById('national-id');

    if (isNonSaudi) {
        label.textContent = 'رقم الإقامة / جواز السفر';
        input.placeholder = 'أدخل رقم الإقامة أو الجواز';
        input.removeAttribute('pattern'); // إزالة شرط الـ 10 أرقام
    } else {
        label.textContent = 'رقم الهوية الوطنية';
        input.placeholder = ' (10 أرقام)';
        input.setAttribute('pattern', '^1\\d{9}$');
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
            
            const nationalIdGroup = document.getElementById('national-id-group');
            const nationalIdInput = document.getElementById('national-id');
            if (nationalIdGroup) nationalIdGroup.style.display = 'none';
            if (nationalIdInput) nationalIdInput.required = false;
            
            // Reset Non-Saudi checkbox UI
            const isNonSaudi = document.getElementById('is-non-saudi');
            if (isNonSaudi) {
                isNonSaudi.checked = false;
                toggleIdType(); // Reset label to default
            }
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
        showAlert(`✅ تم تسجيل حضور ${formData.name} بنجاح`);
        
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
        
        // Check credentials against the array
        const validUser = SYSTEM_CONFIG.adminCredentials.find(cred => 
            cred.USERNAME === USERNAME && cred.PASSWORD === PASSWORD
        );
        
        if (validUser) {
            
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
        showAlert(`✅ تم تسجيل خروج ${attendanceData[recordIndex].name} بنجاح`);
        
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
    let nationalId = '';
    
    if (userType === 'متطوع') {
        opportunity = document.getElementById('opportunity-name').value;
        nationalId = document.getElementById('national-id').value.trim();
    }
    
    return {
        city: selectedCity,
        name: document.getElementById('checkin-name').value.trim(),
        phone: document.getElementById('checkin-phone').value.trim(),
        type: userType,
        opportunity: opportunity,
        nationalId: nationalId
    };
}


/**
 * Find active attendance record for today (most recent without checkout)
 * @param {string} phone - Phone number to search
 * @returns {number} Record index or -1 if not found
 */
function findActiveRecord(phone) {
    const startOfDay = getLocalDateString(new Date());
    
    // Find all records for today without checkout, then get the most recent one
    const todayRecords = attendanceData
        .map((record, index) => ({ record, index }))
        .filter(({ record }) => {
            if (!record.checkIn) return false;
            const recordDateString = getLocalDateString(record.checkIn);
            return record.phone === phone && 
                   record.city === selectedCity &&
                   recordDateString === startOfDay && 
                   !record.checkOut;
        });
    
    if (todayRecords.length === 0) return -1;
    
    // Return the most recent record (last in the array)
    return todayRecords[todayRecords.length - 1].index;
}

/**
 * Validate check-in data (تم التحديث لدعم غير السعوديين)
 * @param {Object} data - Form data to validate
 * @returns {Object} Validation result
 */
function validateCheckInData(data) {
    if (!data.name || !data.phone || !data.type) {
        return { isValid: false, message: 'الرجاء إدخال جميع البيانات المطلوبة' };
    }
    
    // Validate opportunity and National ID if user is a volunteer
    if (data.type === 'متطوع') {
        if (!data.opportunity) {
            return { isValid: false, message: 'الرجاء اختيار مسمى الفرصة التطوعية' };
        }
        if (!data.nationalId) {
            return { isValid: false, message: 'الرجاء إدخال رقم الهوية/الإقامة' };
        }
        
        // التحقق بناءً على الجنسية
        const isNonSaudi = document.getElementById('is-non-saudi').checked;
        
        if (!isNonSaudi) {
            // للسعوديين: يجب أن يكون 10 أرقام ويبدأ بـ 1
            if (!/^1\d{9}$/.test(data.nationalId)) {
                return { isValid: false, message: 'رقم الهوية الوطنية يجب أن يتكون من 10 أرقام ويبدأ بالرقم 1' };
            }
        } else {
            // لغير السعوديين (إقامة/جواز)
            if (data.nationalId.length < 5) {
                return { isValid: false, message: 'الرجاء إدخال رقم إثبات صحيح' };
            }
        }
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
        opportunity: formData.opportunity || "", 
        nationalId: formData.nationalId || "",
        checkIn: getCurrentDateTime(),
        checkOut: null,
        notes: "",
        isImported: false // Default flag for new check-ins
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
            // Use local YYYY-MM-DD for uniqueness
            uniqueDaysSet.add(getLocalDateString(record.checkIn)); 
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
        completionRate 
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
        const hours = calculateSessionHoursRaw(record.checkIn, record.checkOut);
        return sum + hours; 
    }, 0);
    
    // Return as decimal, don't round to integer
    return totalHours;
}

/**
 * Calculate session hours between check-in and check-out (RAW numeric value)
 * @param {string} checkIn - Check-in datetime string
 * @param {string} checkOut - Check-out datetime string
 * @returns {number} Hours between check-in and check-out
 */
function calculateSessionHoursRaw(checkIn, checkOut) {
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
            // Get the record's local date for comparison
            const recordDate = getLocalDateString(record.checkIn);
            
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
    
    // Show imported data when any filter is active
    const cityFilter = document.getElementById('city-filter')?.value || 'all';
    const phoneFilter = document.getElementById('phone-filter')?.value.trim() || '';
    const dateFrom = document.getElementById('date-from')?.value || '';
    const dateTo = document.getElementById('date-to')?.value || '';
    const isFilterActive = cityFilter !== 'all' || phoneFilter || dateFrom || dateTo;

    // Only hide imported data if NO filters are active (showing all data)
    if (!isFilterActive) {
        displayData = displayData.filter(record => !record.isImported);
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
    
    // Add special styling for imported records
    if (record.isImported) {
        row.style.backgroundColor = '#f0f9ff'; // Light blue background
        row.style.borderLeft = '3px solid #546B68'; // Accent border
    }
    
    const opportunityCell = record.type === 'متطوع' ? (record.opportunity || '—') : '—';
    const nationalIdCell = record.type === 'متطوع' ? (record.nationalId || '—') : '—';
    
    // Add import indicator icon for imported records
    const importIndicator = record.isImported ? '<i class="fas fa-file-import" style="color: #546B68; margin-left: 5px;" title="مستورد من ملف"></i>' : '';
    
    row.innerHTML = `
        <td>${record.city}${importIndicator}</td>
        <td>${record.name}</td>
        <td>${record.phone}</td>
        <td>${nationalIdCell}</td> 
        <td>${record.type}</td>
        <td>${opportunityCell}</td>
        <td>${formatDate(record.checkIn)}</td>
        <td>${formatTime(record.checkIn)}</td>
        <td>${record.checkOut ? formatDate(record.checkOut) : '—'}</td>
        <td>${record.checkOut ? formatTime(record.checkOut) : '—'}</td>
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
    
    // Set the selected city if it exists
    if (selectedCity) {
        cityFilter.value = selectedCity;
    }
    
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
   DATE AND TIME UTILITY FUNCTIONS
   =============================================== */

/**
 * Converts standard Gregorian digits (0-9) to Arabic-Indic digits (٠-٩)
 * @param {number|string} num - Number or string containing numbers
 * @returns {string} String with Arabic-Indic digits
 */
function toArabicNumber(num) {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (digit) => arabicNumbers[digit]);
}

/**
 * Converts a Date object or ISO string to a local YYYY-MM-DD string
 * @param {Date|string} dateInput - The date to convert
 * @returns {string} YYYY-MM-DD formatted string
 */
function getLocalDateString(dateInput) {
    const date = (typeof dateInput === 'string') ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return ''; // Handle invalid dates
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}


/**
 * Get current date and time in ISO format (YYYY-MM-DDTHH:MM:SS.mmmZ) for robust storage.
 * @returns {string} Current date and time string.
 */
function getCurrentDateTime() {
    // Using ISO string for consistent storage across timezones, but it represents the local time of creation.
    return new Date().toISOString(); 
}

/**
 * Format date only (DD/MM/YYYY) with Arabic-Indic numerals for display
 * @param {string} isoDateTime - ISO datetime string
 * @returns {string} Formatted date string
 */
function formatDate(isoDateTime) {
    if (!isoDateTime) return '—';
    
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) return isoDateTime;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${toArabicNumber(day)}/${toArabicNumber(month)}/${toArabicNumber(year)}`;
}

/**
 * Format time only (HH:MM) with Arabic-Indic numerals for display
 * @param {string} isoDateTime - ISO datetime string
 * @returns {string} Formatted time string
 */
function formatTime(isoDateTime) {
    if (!isoDateTime) return '—';
    
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) return isoDateTime;
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${toArabicNumber(hours)}:${toArabicNumber(minutes)}`;
}

/**
 * Calculate duration between check-in and check-out (in HH:MM format with Arabic-Indic numerals)
 * @param {string} checkIn - Check-in datetime string
 * @param {string} checkOut - Check-out datetime string (can be null)
 * @returns {string} Formatted duration (ساعة / دقيقة)
 */
function calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '—';

    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    
    if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) return '—';

    let diffMs = checkOutTime - checkInTime;

    if (diffMs < 0) diffMs = 0; 
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const hoursText = diffHours > 0 ? `${toArabicNumber(diffHours)} ساعة` : '';
    const minutesText = diffMinutes > 0 ? `${toArabicNumber(diffMinutes)} دقيقة` : '';
    
    if (diffHours === 0 && diffMinutes === 0) {
        return 'أقل من دقيقة'; 
    }
    
    return `${hoursText} ${minutesText}`.trim();
}


/* ===============================================
   ALERTS AND LOADING UTILITY FUNCTIONS
   =============================================== */

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Type of alert (success/error/info)
 */
function showAlert(message, type = 'success') {
    const alertElement = document.getElementById('alert-message');
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.className = `alert show ${type}`;
        
        setTimeout(() => {
            alertElement.classList.remove('show');
        }, 5000);
    }
}

/**
 * Show or hide loading spinner
 * @param {boolean} show - True to show, false to hide
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        if (show) {
            spinner.classList.add('active');
        } else {
            spinner.classList.remove('active');
        }
    }
}

/* ===============================================
   IMPORT FUNCTIONS (NEW & UPDATED)
   =============================================== */

/**
 * Handle CSV or XLSX file import
 * @param {Event} event - File input change event
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Check if a city is selected
    const selectedCityFilter = document.getElementById('city-filter')?.value;
    if (!selectedCityFilter || selectedCityFilter === 'all') {
        showAlert('الرجاء اختيار فرع محدد من الفلاتر قبل استيراد الملف', 'error');
        event.target.value = null; // Reset file input
        return;
    }

    showLoading(true);
    
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop().toLowerCase();

    reader.onload = function(e) {
        try {
            let dataArray;
            if (fileExtension === 'csv') {
                dataArray = parseCSV(e.target.result);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                // Both XLSX and XLS are handled by the same function
                dataArray = parseXLSX(e.target.result);
            } else {
                throw new Error('Unsupported file type');
            }
            
            processDataArray(dataArray, selectedCityFilter);

        } catch (error) {
            console.error('❌ Error processing file:', error);
            showAlert('حدث خطأ أثناء معالجة الملف: ' + error.message, 'error');
        } finally {
            showLoading(false);
            event.target.value = null; // Reset file input
        }
    };
    
    reader.onerror = function() {
        console.error('❌ Error reading file');
        showAlert('لا يمكن قراءة الملف', 'error');
        showLoading(false);
        event.target.value = null; // Reset file input
    };

    // Read file based on its type
    if (fileExtension === 'csv') {
        reader.readAsText(file, 'UTF-8');
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.readAsArrayBuffer(file);
    } else {
        showAlert('نوع ملف غير مدعوم. الرجاء تحميل ملف .csv أو .xlsx أو .xls', 'error');
        showLoading(false);
        event.target.value = null; // Reset file input
    }
}

/**
 * Parses CSV content into an array of arrays
 * @param {string} csvContent - The CSV file content as a string
 * @returns {Array<Array<string>>} Array of rows, where each row is an array of cells
 */
function parseCSV(csvContent) {
    // Simple parser, still vulnerable to commas inside quoted fields
    const lines = csvContent.split(/\r?\n/);
    return lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
}

/**
 * FIXED: Parses XLSX ArrayBuffer into an array of arrays
 * @param {ArrayBuffer} dataBuffer - The XLSX file content as an ArrayBuffer
 * @returns {Array<Array<string>>} Array of rows, where each row is an array of cells
 */
function parseXLSX(dataBuffer) {
    // MODIFIED: Added { cellDates: true } to parse dates as JS Date objects
    const workbook = XLSX.read(dataBuffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // header: 1 makes it an array of arrays. defval: "" handles empty cells.
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    // Trim strings, but leave Date objects and numbers as-is
    return data.map(row => 
        row.map(cell => (typeof cell === 'string') ? cell.trim() : cell)
    );
}


/**
 * Process imported data (from CSV or XLSX) and add to attendanceData
 * @param {Array<Array<string>>} dataArray - Array of rows
 * @param {string} city - The city to associate records with
 */
function processDataArray(dataArray, city) {
    if (dataArray.length < 2) {
        showAlert('الملف فارغ أو لا يحتوي على صفوف بيانات', 'error');
        return;
    }
            
    const newRecords = [];
    let nextId = attendanceData.length > 0 ? Math.max(...attendanceData.map(r => r.id)) + 1 : 1;

    // Step 1: Process Header Row
    const headerRow = dataArray[0];
    // Standardize headers: trim and convert to lowercase for matching
    const headers = headerRow.map(cell => String(cell).trim().toLowerCase()); 

    // Step 2: Define required columns (Arabic and English)
    const columnMapping = {
        name: ['الاسم', 'name'],
        phone: ['رقم الجوال', 'phone', 'رقم جوال'],
        nationalId: ['رقم الهوية الوطنية', 'nationalid', 'رقم الهوية', 'هوية وطنية'],
        type: ['النوع', 'type', 'نوع'],
        opportunity: ['الفرصة التطوعية', 'opportunity', 'فرصة تطوعية', 'الفرصة'],
        date: ['التاريخ', 'date', 'تاريخ'],
        time: ['الساعة', 'time', 'وقت', 'ساعة'],
        duration: ['المدة', 'duration', 'مدة', 'الساعات', 'hours']
    };

    const indices = {};
    const missing = [];

    // Step 3: Find column indices by matching Arabic or English headers
    for (const key in columnMapping) {
        const possibleHeaders = columnMapping[key];
        let index = -1;
        
        for (const header of possibleHeaders) {
            index = headers.indexOf(header);
            if (index !== -1) break;
        }
        
        indices[key] = index;
        
        // Mark as missing only if truly required
        // Required: name, phone, date
        // Optional: nationalId, opportunity, type, time, duration
        if (index === -1 && !['nationalId', 'opportunity', 'type', 'time', 'duration'].includes(key)) {
            missing.push(possibleHeaders[0]); // Use Arabic name for error message
        }
    }

    // Step 4: Validate if all required headers were found
    if (missing.length > 0) {
        showAlert(`الملف المستورد يفتقد الأعمدة المطلوبة: ${missing.join('، ')}`, 'error');
        console.error('Missing CSV/XLSX headers:', missing);
        return;
    }

    // Step 5: Process data rows (start from i = 1)
    for (let i = 1; i < dataArray.length; i++) {
        const columns = dataArray[i];
        
        if (columns.length === 0 || columns.every(cell => cell === "" || cell === null || cell === undefined)) {
            continue; // Skip completely empty rows
        }
        
        // Step 6: Extract data using the mapped indices
        const name = String(columns[indices.name] || '').trim();
        const phone = String(columns[indices.phone] || '').trim();
        const nationalId = indices.nationalId !== -1 ? String(columns[indices.nationalId] || '').trim() : '';
        const type = indices.type !== -1 ? String(columns[indices.type] || '').trim() : 'متطوع';
        const opportunity = indices.opportunity !== -1 ? String(columns[indices.opportunity] || '').trim() : '';
        const date = columns[indices.date]; // Keep as number, string, or Date
        const time = indices.time !== -1 ? columns[indices.time] : null; // Keep as number, string, or Date
        const duration = indices.duration !== -1 ? columns[indices.duration] : null; // Duration in hours
        
        // Basic validation - require name, phone, date
        // Either time OR duration should exist
        if (!name || !phone || !date) {
            console.warn('⚠️ Skipping incomplete line (missing required data):', {
                row: i + 1, 
                name, 
                phone, 
                date
            });
            continue;
        }
        
        // Parse duration (المدة) - actual hours from file
        let durationHours = 8; // Default fallback
        if (duration !== null && duration !== undefined && duration !== '') {
            const parsedDuration = parseFloat(String(duration));
            if (!isNaN(parsedDuration) && parsedDuration > 0) {
                durationHours = parsedDuration;
            }
        }
        
        // Create check-in datetime
        let checkInDateTime;
        if (time !== null && time !== undefined && time !== '') {
            // If time exists, combine date and time
            checkInDateTime = combineDateAndTime(date, time);
        } else {
            // If no time, use date at 08:00 AM as default
            checkInDateTime = combineDateAndTime(date, 8);
        }
        
        if (!checkInDateTime) {
            console.warn('⚠️ Skipping line with invalid date/time:', {
                row: i + 1,
                date, 
                time
            });
            continue;
        }
        
        // Calculate checkout time using actual duration from file
        const checkInDate = new Date(checkInDateTime);
        const checkOutDate = new Date(checkInDate.getTime() + (durationHours * 60 * 60 * 1000));
        const checkOutDateTime = checkOutDate.toISOString();
        
        const newRecord = {
            id: nextId++,
            city: city,
            name: name,
            phone: phone,
            type: type, // Now reads from file or defaults to متطوع
            opportunity: opportunity || 'غير محدد',
            nationalId: nationalId || '',
            checkIn: checkInDateTime,
            checkOut: checkOutDateTime, // Calculated using actual duration
            notes: `تم الاستيراد من ملف (${durationHours} ساعة)`,
            isImported: true // Flag for imported records
        };
        
        newRecords.push(newRecord);
        console.log(`✅ Imported record ${newRecords.length}:`, {
            name: newRecord.name,
            phone: newRecord.phone,
            type: newRecord.type,
            duration: durationHours,
            checkIn: newRecord.checkIn,
            checkOut: newRecord.checkOut
        });
    }
    
    if (newRecords.length > 0) {
        attendanceData.push(...newRecords);
        saveApplicationData();
        
        // Log detailed import statistics
        const importStats = {
            totalRecords: newRecords.length,
            byType: {},
            uniqueDates: new Set(),
            totalHours: 0
        };
        
        newRecords.forEach(record => {
            importStats.byType[record.type] = (importStats.byType[record.type] || 0) + 1;
            importStats.uniqueDates.add(getLocalDateString(record.checkIn));
            // Calculate hours for this record
            const hours = calculateSessionHoursRaw(record.checkIn, record.checkOut);
            importStats.totalHours += hours;
        });
        
        console.log('📊 Import Statistics:', {
            totalRecords: importStats.totalRecords,
            byType: importStats.byType,
            uniqueDays: importStats.uniqueDates.size,
            totalHours: importStats.totalHours.toFixed(1),
            dates: Array.from(importStats.uniqueDates)
        });
        
        updateDashboard();
        showAlert(`✅ تم استيراد ${newRecords.length} سجل بنجاح (${importStats.totalHours.toFixed(1)} ساعة)`, 'success');
        console.log(`IMPORT: Added ${newRecords.length} records with ${importStats.totalHours.toFixed(1)} total hours`);
    } else {
        showAlert('لم يتم العثور على بيانات صالحة في الملف. تأكد من أن الصفوف تحتوي على البيانات المطلوبة (الاسم، رقم الجوال، التاريخ) وأن التواريخ بالتنسيق الصحيح.', 'error');
    }
}

/**
 * Converts Arabic-Indic or Eastern Arabic-Indic numerals to standard (0-9) digits
 * @param {string} str - String containing numerals
 * @returns {string} String with standard digits
 */
function toGregorianNumber(str) {
    if (typeof str !== 'string') return str;
    const arabicIndic = /[\u0660-\u0669]/g; // ٠١٢٣٤٥٦٧٨٩
    const eastArabicIndic = /[\u06F0-\u06F9]/g; // ۰۱۲۳۴۵۶۷۸۹ (Persian, Urdu)
    
    return str.replace(arabicIndic, (c) => c.charCodeAt(0) - 0x0660)
              .replace(eastArabicIndic, (c) => c.charCodeAt(0) - 0x06F0);
}


/**
 * FIXED: Helper to combine date and time into an ISO string
 * @param {string|number|Date} dateInput - Date (string, Excel number, or JS Date)
 * @param {string|number|Date} timeInput - Time (string, Excel number, or JS Date)
 * @returns {string|null} ISO string or null if invalid
 */
function combineDateAndTime(dateInput, timeInput) {
    try {
        let dateObj;

        // --- 0. Convert Arabic numerals (for CSV/string fallback) ---
        if (typeof dateInput === 'string') dateInput = toGregorianNumber(dateInput);
        if (typeof timeInput === 'string') timeInput = toGregorianNumber(timeInput);

        // --- 1. Handle Date Input ---
        if (dateInput instanceof Date) {
            // BEST CASE: XLSX gave us a real Date object
            dateObj = new Date(dateInput.getTime()); // Clone it
        } else if (typeof dateInput === 'number') {
            // Excel serial date (from CSV or non-cellDates XLSX)
            if (dateInput > 25568) {
                dateObj = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
                dateObj = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
            } else { throw new Error('Invalid Excel date number'); }
        } else if (typeof dateInput === 'string') {
            // String date (from CSV or formatted XLSX)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                dateObj = new Date(dateInput + "T00:00:00");
            } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateInput)) {
                const parts = dateInput.split('/');
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]); // DD/MM/YYYY
            } else { dateObj = new Date(dateInput); }
        } else { throw new Error('Unrecognized date type'); }

        if (isNaN(dateObj.getTime())) throw new Error('Failed to parse date input');

        // Reset time part of the parsed date
        dateObj.setHours(0, 0, 0, 0);

        // --- 2. Handle Time Input ---
        let hours = 0, minutes = 0;

        if (timeInput instanceof Date) {
            // BEST CASE: XLSX gave us a real Date object
            hours = timeInput.getHours();
            minutes = timeInput.getMinutes();
        } else if (typeof timeInput === 'number') {
            // Check if it's a simple hour number (1-24) or Excel time fraction
            if (timeInput >= 1 && timeInput <= 24 && Number.isInteger(timeInput)) {
                // Simple hour number like 1, 2, 3... 24
                hours = timeInput;
                minutes = 0;
            } else if (timeInput >= 0 && timeInput <= 1) {
                // Excel time (fraction of a day)
                const totalSeconds = Math.round(timeInput * 86400);
                hours = Math.floor(totalSeconds / 3600);
                minutes = Math.floor((totalSeconds % 3600) / 60);
            } else {
                throw new Error('Invalid time number');
            }
        } else if (typeof timeInput === 'string') {
            // String time (from CSV or formatted XLSX)
            
            // FIXED: Regex now supports 'م' and 'ص'
            const timeMatch = timeInput.match(/^(\d{1,2}):(\d{2})(:(\d{2}))?(\s*(AM|PM|ص|م))?$/i);
            
            if (timeMatch) {
                hours = parseInt(timeMatch[1], 10);
                minutes = parseInt(timeMatch[2], 10);
                
                const ampm = timeMatch[6];
                if (ampm) {
                    // FIXED: Logic now supports Arabic 'م' and 'ص'
                    const isPM = ampm.toLowerCase() === 'pm' || ampm === 'م';
                    const isAM = ampm.toLowerCase() === 'am' || ampm === 'ص';
                    
                    if (isPM && hours < 12) hours += 12;
                    if (isAM && hours === 12) hours = 0; // Midnight
                }
            } else { 
                // Try to parse as a simple number
                const simpleHour = parseInt(timeInput, 10);
                if (!isNaN(simpleHour) && simpleHour >= 0 && simpleHour <= 24) {
                    hours = simpleHour;
                    minutes = 0;
                } else {
                    throw new Error('Unrecognized time format string');
                }
            }
        } else { throw new Error('Unrecognized time type'); }

        // --- 3. Combine Date and Time ---
        dateObj.setHours(hours, minutes);

        if (isNaN(dateObj.getTime())) throw new Error('Invalid final date/time object');
        
        return dateObj.toISOString();
        
    } catch (error) {
        console.error('Error combining date and time:', { dateInput, timeInput, error: error.message });
        return null;
    }
}


/* ===============================================
   EXPORT FUNCTIONS (UPDATED FOR XLSX)
   =============================================== */

/**
 * Export data to Excel (.xlsx) using SheetJS (UPDATED)
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
        
        // 1. Prepare data rows
        const header = ['الفرع', 'الاسم', 'رقم الجوال', 'رقم الهوية/الإقامة', 'النوع', 'الفرصة التطوعية', 'تاريخ الدخول', 'وقت الدخول', 'تاريخ الخروج', 'وقت الخروج', 'المدة', 'ملاحظات'];
        
        const dataRows = exportData.map(record => [
            record.city,
            record.name,
            record.phone,
            record.nationalId || '',
            record.type,
            record.opportunity || '',
            formatDate(record.checkIn),
            formatTime(record.checkIn),
            record.checkOut ? formatDate(record.checkOut) : 'لم يخرج بعد',
            record.checkOut ? formatTime(record.checkOut) : '—',
            calculateDuration(record.checkIn, record.checkOut),
            record.notes || ''
        ]);

        const workSheetData = [header, ...dataRows];

        // 2. Create Workbook and Worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(workSheetData);

        // Column widths for better formatting
        ws['!cols'] = [
            {wch: 10}, {wch: 20}, {wch: 15}, {wch: 15}, 
            {wch: 10}, {wch: 20}, {wch: 15}, {wch: 10}, 
            {wch: 15}, {wch: 10}, {wch: 15}, {wch: 30}
        ];

        // 3. Append Sheet
        XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");

        // 4. Write File (XLSX)
        XLSX.writeFile(wb, `Attendance_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showAlert('تم تصدير ملف Excel بنجاح');
    } catch (error) {
        console.error('❌ Export error:', error);
        showAlert('حدث خطأ في تصدير البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Export data to PDF with filters applied and better formatting
 */
function exportToPDF() {
    showLoading(true);
    const { jsPDF } = window.jspdf;
    
    try {
        const categoryFilter = document.getElementById('category-filter')?.value || 'all';
        const filteredData = getFilteredAttendanceData();
        
        let exportData = filteredData;
        if (categoryFilter !== 'all') {
            exportData = filteredData.filter(record => record.type === categoryFilter);
        }
        
        // Sort by check-in time (newest first)
        exportData.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
        
        // Create a temporary table for export
        const tempTable = document.createElement('table');
        tempTable.style.width = '100%';
        tempTable.style.borderCollapse = 'collapse';
        tempTable.style.fontFamily = 'Arial, sans-serif';
        tempTable.style.fontSize = '10px';
        tempTable.style.direction = 'rtl';
        
        // Create header
        const thead = tempTable.createTHead();
        const headerRow = thead.insertRow();
        const headers = ['الفرع', 'الاسم', 'الجوال', 'الهوية', 'النوع', 'الفرصة', 'تاريخ الدخول', 'وقت الدخول', 'تاريخ الخروج', 'وقت الخروج', 'المدة', 'ملاحظات'];
        
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.backgroundColor = '#546B68';
            th.style.color = 'white';
            th.style.padding = '8px';
            th.style.border = '1px solid #ddd';
            th.style.textAlign = 'center';
            th.style.fontWeight = 'bold';
            headerRow.appendChild(th);
        });
        
        // Create body
        const tbody = tempTable.createTBody();
        exportData.forEach((record, index) => {
            const row = tbody.insertRow();
            row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
            
            const cells = [
                record.city,
                record.name,
                record.phone,
                record.type === 'متطوع' ? (record.nationalId || '—') : '—',
                record.type,
                record.type === 'متطوع' ? (record.opportunity || '—') : '—',
                formatDate(record.checkIn),
                formatTime(record.checkIn),
                record.checkOut ? formatDate(record.checkOut) : 'لم يخرج',
                record.checkOut ? formatTime(record.checkOut) : '—',
                calculateDuration(record.checkIn, record.checkOut),
                record.notes || ''
            ];
            
            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                td.style.padding = '6px';
                td.style.border = '1px solid #ddd';
                td.style.textAlign = 'center';
                td.style.whiteSpace = 'nowrap';
                row.appendChild(td);
            });
        });
        
        // Add temporary table to body (hidden)
        tempTable.style.position = 'absolute';
        tempTable.style.left = '-9999px';
        document.body.appendChild(tempTable);
        
        // Use html2canvas
        html2canvas(tempTable, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            // Remove temporary table
            document.body.removeChild(tempTable);
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a3'); // A3 landscape for more space
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / ratio;
            
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * ratio;
            }
            
            const x = (pdfWidth - imgWidth) / 2;
            const y = 10;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            
            const filename = `attendance_data_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            showAlert('تم تصدير البيانات إلى PDF بنجاح', 'success');
        }).catch(err => {
            console.error('❌ PDF export error (Data):', err);
            document.body.removeChild(tempTable);
            showAlert('حدث خطأ أثناء تصدير البيانات إلى PDF', 'error');
        }).finally(() => {
            showLoading(false);
        });
    } catch (error) {
        console.error('❌ PDF export error:', error);
        showAlert('حدث خطأ في تصدير PDF', 'error');
        showLoading(false);
    }
}

/**
 * Export KPIs to Excel with filters applied
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
        const header = ['الفئة', 'إجمالي الحضور', 'الأيام', 'إجمالي الساعات'];
        
        // Create CSV rows
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
 * Export KPIs to PDF with filters applied and better formatting
 */
function exportKPIToPDF() {
    showLoading(true);
    const { jsPDF } = window.jspdf;
    
    try {
        const filteredData = getFilteredAttendanceData();
        
        // Calculate KPIs for each category
        const volunteersData = filteredData.filter(r => r.type === 'متطوع');
        const traineesData = filteredData.filter(r => r.type === 'متدرب');
        const preparatoryData = filteredData.filter(r => r.type === 'تمهير');
        
        const volunteersStats = calculateCategoryStats(volunteersData, 'متطوع');
        const traineesStats = calculateCategoryStats(traineesData, 'متدرب');
        const preparatoryStats = calculateCategoryStats(preparatoryData, 'تمهير');
        
        // Create a temporary styled KPI display
        const tempDiv = document.createElement('div');
        tempDiv.style.padding = '30px';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.direction = 'rtl';
        tempDiv.style.width = '800px';
        
        tempDiv.innerHTML = `
            <h2 style="text-align: center; color: #546B68; margin-bottom: 30px; font-size: 28px;">تحليلات الحضور</h2>
            
            <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #96BCB7 0%, #7da8a3 100%); border-radius: 12px; color: white;">
                <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 22px;">المتطوعين</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${volunteersStats.totalSessions}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الحضور</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${volunteersStats.uniqueDays}</div>
                        <div style="font-size: 14px; margin-top: 5px;">الأيام</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${volunteersStats.totalHours.toFixed(1)}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الساعات</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #44556A 0%, #354252 100%); border-radius: 12px; color: white;">
                <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 22px;">المتدربين</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${traineesStats.totalSessions}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الحضور</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${traineesStats.uniqueDays}</div>
                        <div style="font-size: 14px; margin-top: 5px;">الأيام</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${traineesStats.totalHours.toFixed(1)}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الساعات</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px; background: linear-gradient(135deg, #E87853 0%, #d56542 100%); border-radius: 12px; color: white;">
                <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 22px;">التمهير</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${preparatoryStats.totalSessions}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الحضور</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${preparatoryStats.uniqueDays}</div>
                        <div style="font-size: 14px; margin-top: 5px;">الأيام</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: bold;">${preparatoryStats.totalHours.toFixed(1)}</div>
                        <div style="font-size: 14px; margin-top: 5px;">إجمالي الساعات</div>
                    </div>
                </div>
            </div>
        `;
        
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);
        
        html2canvas(tempDiv, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            document.body.removeChild(tempDiv);
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / ratio;
            
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * ratio;
            }
            
            const x = (pdfWidth - imgWidth) / 2;
            const y = 10;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            
            const filename = `kpi_analytics_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            showAlert('تم تصدير التحليلات إلى PDF بنجاح', 'success');
        }).catch(err => {
            console.error('❌ PDF export error (KPI):', err);
            document.body.removeChild(tempDiv);
            showAlert('حدث خطأ أثناء تصدير التحليلات إلى PDF', 'error');
        }).finally(() => {
            showLoading(false);
        });
    } catch (error) {
        console.error('❌ KPI PDF export error:', error);
        showAlert('حدث خطأ في تصدير التحليلات', 'error');
        showLoading(false);
    }
}

/**
 * Download CSV file
 * @param {string} csv - CSV content
 * @param {string} filename - Base filename
 */
function downloadCSVFile(csv, filename) {
    const bom = '\ufeff'; // BOM for Arabic support
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(bom + csv);
    
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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