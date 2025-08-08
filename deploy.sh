#!/bin/bash

# MikroTik Captive Portal Deployment Script
# This script automates the deployment process

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
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("Docker Compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and try again."
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
            print_warning "Please edit .env file with your configuration"
        else
            print_error "env.example not found"
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database configuration exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run setup first."
        exit 1
    fi
    
    # Run database setup
    npm run setup
    print_success "Database setup completed"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    npm test
    print_success "Tests completed"
}

# Function to build Docker images
build_docker() {
    print_status "Building Docker images..."
    docker-compose build
    print_success "Docker images built"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    docker-compose up -d
    print_success "Services started"
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to show logs
show_logs() {
    print_status "Showing logs..."
    docker-compose logs -f
}

# Function to generate reports
generate_reports() {
    print_status "Generating reports..."
    node reports/generate-reports.js all
    print_success "Reports generated"
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    
    local backup_dir="backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_dir}/captive_portal_${timestamp}.sql"
    
    mkdir -p "$backup_dir"
    
    # Get database credentials from .env
    source .env
    
    docker-compose exec mysql mysqldump -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$backup_file"
    
    print_success "Database backup created: $backup_file"
}

# Function to restore database
restore_database() {
    if [ -z "$1" ]; then
        print_error "Please specify backup file to restore"
        exit 1
    fi
    
    print_status "Restoring database from $1..."
    
    # Get database credentials from .env
    source .env
    
    docker-compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$1"
    
    print_success "Database restored from $1"
}

# Function to show status
show_status() {
    print_status "Checking service status..."
    docker-compose ps
}

# Function to show help
show_help() {
    echo "MikroTik Captive Portal Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup           - Initial setup (check prerequisites, create .env)"
    echo "  install         - Install dependencies"
    echo "  db-setup        - Setup database"
    echo "  test            - Run tests"
    echo "  build           - Build Docker images"
    echo "  start           - Start services"
    echo "  stop            - Stop services"
    echo "  restart         - Restart services"
    echo "  logs            - Show logs"
    echo "  status          - Show service status"
    echo "  reports         - Generate reports"
    echo "  backup          - Backup database"
    echo "  restore <file>  - Restore database from backup"
    echo "  deploy          - Full deployment (setup + install + db-setup + build + start)"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup        # Initial setup"
    echo "  $0 deploy       # Full deployment"
    echo "  $0 backup       # Create database backup"
    echo "  $0 restore backups/captive_portal_20240101_120000.sql"
}

# Main script logic
case "${1:-help}" in
    setup)
        check_prerequisites
        setup_environment
        ;;
    install)
        install_dependencies
        ;;
    db-setup)
        setup_database
        ;;
    test)
        run_tests
        ;;
    build)
        build_docker
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    reports)
        generate_reports
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    deploy)
        check_prerequisites
        setup_environment
        install_dependencies
        setup_database
        build_docker
        start_services
        print_success "Deployment completed successfully!"
        print_status "Portal should be available at: http://localhost:3000"
        print_status "Admin panel: http://localhost:3000/admin"
        ;;
    help|*)
        show_help
        ;;
esac

