#!/bin/bash

# MikroTik Captive Portal - Complete Setup Script
# This script will set up the entire application from scratch

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists psql; then
        missing_deps+=("PostgreSQL client")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies:"
        print_status "  Node.js: https://nodejs.org/"
        print_status "  PostgreSQL: https://www.postgresql.org/download/"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from template"
            print_warning "Please edit .env file with your configuration before continuing"
            
            # Ask user to configure environment
            read -p "Do you want to configure the environment now? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                configure_environment
            fi
        else
            print_error "env.example not found"
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
}

# Function to configure environment interactively
configure_environment() {
    print_status "Configuring environment variables..."
    
    # Database configuration
    echo
    print_status "Database Configuration:"
    read -p "Database host [localhost]: " db_host
    db_host=${db_host:-localhost}
    
    read -p "Database user [postgres]: " db_user
    db_user=${db_user:-postgres}
    
    read -s -p "Database password: " db_password
    echo
    
    read -p "Database name [captive_portal]: " db_name
    db_name=${db_name:-captive_portal}
    
    read -p "Database port [5432]: " db_port
    db_port=${db_port:-5432}
    
    # Server configuration
    echo
    print_status "Server Configuration:"
    read -p "Server port [3000]: " server_port
    server_port=${server_port:-3000}
    
    # JWT configuration
    echo
    print_status "Security Configuration:"
    read -s -p "JWT secret (leave empty to generate): " jwt_secret
    echo
    
    if [ -z "$jwt_secret" ]; then
        jwt_secret=$(openssl rand -base64 32)
        print_success "Generated JWT secret"
    fi
    
    # Admin configuration
    echo
    print_status "Admin Configuration:"
    read -p "Admin username [admin]: " admin_username
    admin_username=${admin_username:-admin}
    
    read -s -p "Admin password: " admin_password
    echo
    
    read -p "Admin email: " admin_email
    
    # Company configuration
    echo
    print_status "Company Configuration:"
    read -p "Company name: " company_name
    read -p "Portal title [Welcome to Our WiFi Network]: " portal_title
    portal_title=${portal_title:-Welcome to Our WiFi Network}
    
    # Update .env file
    sed -i.bak "s/DB_HOST=.*/DB_HOST=$db_host/" .env
    sed -i.bak "s/DB_USER=.*/DB_USER=$db_user/" .env
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$db_password/" .env
    sed -i.bak "s/DB_NAME=.*/DB_NAME=$db_name/" .env
    sed -i.bak "s/DB_PORT=.*/DB_PORT=$db_port/" .env
    sed -i.bak "s/PORT=.*/PORT=$server_port/" .env
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
    sed -i.bak "s/ADMIN_USERNAME=.*/ADMIN_USERNAME=$admin_username/" .env
    sed -i.bak "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$admin_password/" .env
    sed -i.bak "s/ADMIN_EMAIL=.*/ADMIN_EMAIL=$admin_email/" .env
    sed -i.bak "s/COMPANY_NAME=.*/COMPANY_NAME=$company_name/" .env
    sed -i.bak "s/PORTAL_TITLE=.*/PORTAL_TITLE=$portal_title/" .env
    
    rm .env.bak
    print_success "Environment configuration updated"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "Creating database..."
        createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"
        print_success "Database created"
    else
        print_status "Database already exists"
    fi
    
    # Run database setup
    print_status "Running database setup..."
    npm run setup
    print_success "Database setup completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    if npm test; then
        print_success "Tests passed"
    else
        print_warning "Some tests failed, but continuing with setup"
    fi
}

# Function to start application
start_application() {
    print_status "Starting application..."
    
    # Check if application is already running
    if pgrep -f "node.*server.js" >/dev/null; then
        print_warning "Application is already running"
        return
    fi
    
    # Start in background
    nohup npm start > app.log 2>&1 &
    local pid=$!
    
    # Wait a moment for startup
    sleep 3
    
    # Check if started successfully
    if kill -0 $pid 2>/dev/null; then
        print_success "Application started (PID: $pid)"
        print_status "Logs are being written to app.log"
    else
        print_error "Failed to start application"
        print_status "Check app.log for details"
        exit 1
    fi
}

# Function to show final instructions
show_final_instructions() {
    echo
    print_success "🎉 Setup completed successfully!"
    echo
    print_status "Your MikroTik Captive Portal is now ready!"
    echo
    print_status "Access URLs:"
    print_status "  📱 Captive Portal: http://localhost:$PORT"
    print_status "  🖥️  Admin Dashboard: http://localhost:$PORT/admin"
    print_status "  🔍 API Health: http://localhost:$PORT/api/health"
    echo
    print_status "Admin Credentials:"
    print_status "  Username: $ADMIN_USERNAME"
    print_status "  Password: $ADMIN_PASSWORD"
    echo
    print_status "Next Steps:"
    print_status "  1. Configure your MikroTik router (see mikrotik/configuration.rsc)"
    print_status "  2. Customize the portal branding in the admin dashboard"
    print_status "  3. Set up FreeRADIUS integration (optional)"
    print_status "  4. Configure SSL certificates for production"
    echo
    print_status "Useful Commands:"
    print_status "  npm start          - Start the application"
    print_status "  npm run dev        - Start in development mode"
    print_status "  npm test           - Run tests"
    print_status "  ./deploy.sh deploy - Full deployment with Docker"
    echo
    print_warning "⚠️  Remember to change the default admin password!"
    echo
}

# Function to show help
show_help() {
    echo "MikroTik Captive Portal - Complete Setup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help              - Show this help message"
    echo "  --skip-db           - Skip database setup"
    echo "  --skip-tests        - Skip running tests"
    echo "  --no-start          - Don't start the application"
    echo "  --configure         - Configure environment interactively"
    echo ""
    echo "Examples:"
    echo "  $0                  # Complete setup"
    echo "  $0 --configure      # Setup with interactive configuration"
    echo "  $0 --skip-tests     # Setup without running tests"
    echo ""
}

# Parse command line arguments
SKIP_DB=false
SKIP_TESTS=false
NO_START=false
CONFIGURE_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-start)
            NO_START=true
            shift
            ;;
        --configure)
            CONFIGURE_ONLY=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main setup process
main() {
    echo "🚀 MikroTik Captive Portal - Complete Setup"
    echo "=========================================="
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    if [ "$CONFIGURE_ONLY" = true ]; then
        print_success "Configuration completed"
        exit 0
    fi
    
    # Load environment variables
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup database
    if [ "$SKIP_DB" = false ]; then
        setup_database
    fi
    
    # Run tests
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    # Start application
    if [ "$NO_START" = false ]; then
        start_application
    fi
    
    # Show final instructions
    show_final_instructions
}

# Run main function
main "$@"
