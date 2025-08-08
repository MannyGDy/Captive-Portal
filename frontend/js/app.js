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

        // Modal events
        const modalClose = document.getElementById('modal-close');
        const modalOk = document.getElementById('modal-ok');
        const errorModal = document.getElementById('error-modal');

        modalClose.addEventListener('click', () => {
            this.hideModal();
        });

        modalOk.addEventListener('click', () => {
            this.hideModal();
        });

        // Close modal when clicking outside
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                this.hideModal();
            }
        });

        // Form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        // Username validation
        const usernameInputs = document.querySelectorAll('input[name="username"]');
        usernameInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(value);
                this.toggleFieldValidation(e.target, isValid);
            });
        });

        // Email validation
        const emailInput = document.getElementById('register-email');
        emailInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            this.toggleFieldValidation(e.target, isValid);
        });

        // Password confirmation
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        
        [passwordInput, confirmPasswordInput].forEach(input => {
            input.addEventListener('input', () => {
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                const isValid = password === confirmPassword && password.length >= 6;
                this.toggleFieldValidation(confirmPasswordInput, isValid);
            });
        });
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
        const successMessage = document.getElementById('success-message');
        const usernameDisplay = document.getElementById('username-display');
        const connectionTime = document.getElementById('connection-time');

        // Update success message
        usernameDisplay.textContent = user.username;
        connectionTime.textContent = new Date().toLocaleTimeString();

        // Hide form and show success message
        formContainer.style.display = 'none';
        successMessage.style.display = 'block';
        successMessage.classList.add('fade-in');

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

        // Show a message that user is being redirected
        const successMessage = document.getElementById('success-message');
        successMessage.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-globe"></i>
            </div>
            <h2>Redirecting to Internet...</h2>
            <p>You should now have internet access. If not, please contact support.</p>
        `;

        // Try to redirect
        setTimeout(() => {
            window.location.href = testUrls[0];
        }, 1000);
    }

    showError(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorModal.classList.add('active');
    }

    hideModal() {
        const errorModal = document.getElementById('error-modal');
        errorModal.classList.remove('active');
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'none';
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
