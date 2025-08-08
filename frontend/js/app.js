// Captive Portal Application JavaScript
class CaptivePortal {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPortalSettings();
        this.checkConnectionStatus();
    }

    setupEventListeners() {
        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Modal events removed - using alerts instead

        // Form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Email validation for both login and register forms
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                this.toggleFieldValidation(e.target, isValid);
            });
        });

        // Phone number validation
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/\D/g, '');
                const isValid = /^(070|080|081|090|091)\d{8}$/.test(value);
                this.toggleFieldValidation(e.target, isValid);
            });
        });

        // Name validation
        const nameInputs = document.querySelectorAll('input[name="first_name"], input[name="last_name"]');
        nameInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = value.length >= 2 && value.length <= 100;
                this.toggleFieldValidation(e.target, isValid);
            });
        });

        // Company validation
        const companyInput = document.getElementById('register-company');
        if (companyInput) {
            companyInput.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = value.length >= 2 && value.length <= 200;
                this.toggleFieldValidation(e.target, isValid);
            });
        }
    }

    toggleFieldValidation(field, isValid) {
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update form tabs
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadPortalSettings() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (response.ok) {
                console.log('Portal API is accessible');
            }
        } catch (error) {
            console.warn('Portal API not accessible:', error);
        }
    }

    async handleLogin() {
        const form = document.getElementById('login-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        this.showLoading();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.currentUser = result.user;
                this.showSuccess(result.user);
                this.storeUserToken(result.token);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister() {
        const form = document.getElementById('register-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validate password confirmation
        if (data.password !== data.confirm_password) {
            this.showError('Passwords do not match');
            return;
        }

        // Remove confirm_password from data
        delete data.confirm_password;

        this.showLoading();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.currentUser = result.user;
                this.showSuccess(result.user);
                this.storeUserToken(result.token);
            } else {
                if (result.errors) {
                    const errorMessages = result.errors.map(err => err.msg).join(', ');
                    this.showError(errorMessages);
                } else {
                    this.showError(result.message);
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    showSuccess(user) {
        const formContainer = document.querySelector('.form-container');
        
        // Create success message dynamically
        const successMessage = document.createElement('div');
        successMessage.className = 'success-container';
        successMessage.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h1>Welcome, ${user.first_name}!</h1>
            <p>You have successfully logged in and now have internet access.</p>
            <p>Connection time: ${new Date().toLocaleTimeString()}</p>
        `;

        // Hide form and show success message
        formContainer.style.display = 'none';
        formContainer.parentNode.appendChild(successMessage);

        // Redirect to internet after a delay
        setTimeout(() => {
            this.redirectToInternet();
        }, 3000);
    }

    redirectToInternet() {
        // Try to redirect to a common website to test internet access
        const testUrls = [
            'http://www.google.com',
            'http://www.bing.com',
            'http://www.yahoo.com'
        ];

        // Update the success message to show redirecting
        const successContainer = document.querySelector('.success-container');
        if (successContainer) {
            successContainer.innerHTML = `
                <div class="success-icon">
                    <i class="fas fa-globe"></i>
                </div>
                <h1>Redirecting to Internet...</h1>
                <p>You should now have internet access. If not, please contact support.</p>
            `;
        }

        // Try to redirect
        setTimeout(() => {
            window.location.href = testUrls[0];
        }, 1000);
    }

    showError(message) {
        // Remove existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create new alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;

        // Insert alert before form container
        const formContainer = document.querySelector('.form-container');
        formContainer.parentNode.insertBefore(alert, formContainer);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    hideModal() {
        // This function is no longer needed as we use alerts instead of modals
        console.log('Modal functionality deprecated');
    }

    showLoading() {
        // Show loading state on submit buttons
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        submitButtons.forEach(btn => {
            const btnText = btn.querySelector('.btn-text');
            const loading = btn.querySelector('.loading');
            if (btnText && loading) {
                btnText.classList.add('hidden');
                loading.classList.remove('hidden');
                btn.disabled = true;
            }
        });
    }

    hideLoading() {
        // Hide loading state on submit buttons
        const submitButtons = document.querySelectorAll('button[type="submit"]');
        submitButtons.forEach(btn => {
            const btnText = btn.querySelector('.btn-text');
            const loading = btn.querySelector('.loading');
            if (btnText && loading) {
                btnText.classList.remove('hidden');
                loading.classList.add('hidden');
                btn.disabled = false;
            }
        });
    }

    storeUserToken(token) {
        // Store token in localStorage for future use
        localStorage.setItem('portal_token', token);
    }

    getUserToken() {
        return localStorage.getItem('portal_token');
    }

    clearUserToken() {
        localStorage.removeItem('portal_token');
    }

    async checkConnectionStatus() {
        // Check if user is already authenticated
        const token = this.getUserToken();
        if (token) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/auth/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    this.currentUser = result.user;
                    this.showSuccess(result.user);
                } else {
                    this.clearUserToken();
                }
            } catch (error) {
                console.warn('Token validation failed:', error);
                this.clearUserToken();
            }
        }
    }

    // Utility methods
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CaptivePortal();
});

// Add some CSS for form validation
const style = document.createElement('style');
style.textContent = `
    .form-group input.error {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .form-group input.valid {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
    
    .form-group input.error:focus {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .form-group input.valid:focus {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }
`;
document.head.appendChild(style);
