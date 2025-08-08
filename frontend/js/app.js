// Portal Configuration
const API_BASE = '/api';

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active form tab
        document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// Form submission handlers
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('register-form').addEventListener('submit', handleRegister);

async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            phone_number: formData.get('phone_number')
        };

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Login successful! You now have internet access.');
            // Store token for future use
            localStorage.setItem('auth_token', result.token);
        } else {
            showError(result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const loading = submitBtn.querySelector('.loading');
    
    // Show loading state
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone_number: formData.get('phone_number'),
            company: formData.get('company')
        };

        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Registration successful! You can now login with your email and phone number.');
            // Switch to login tab
            document.querySelector('[data-tab="login"]').click();
            form.reset();
        } else {
            showError(result.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        // Reset button state
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'error');
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
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

// Phone number formatting
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        // Limit to 11 digits
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        e.target.value = value;
    });
});

// Load portal configuration
async function loadPortalConfig() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            // Portal is running, you can load additional config here
            console.log('Portal is running');
        }
    } catch (error) {
        console.log('Portal configuration not available');
    }
}

// Initialize
loadPortalConfig();


