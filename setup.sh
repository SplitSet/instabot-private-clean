#!/bin/bash

# InstaBot Setup Script
# This script helps you set up InstaBot for development or production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${1:-32}
}

# Main setup function
main() {
    print_status "🚀 Starting InstaBot Setup..."
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Setup development or production
    if [[ "$1" == "production" ]]; then
        setup_production
    else
        setup_development
    fi
    
    # Final instructions
    show_final_instructions "$1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists openssl; then
        missing_deps+=("openssl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Please install the missing dependencies and run the script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed!"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f backend/env.example ]; then
            cp backend/env.example .env
            print_success "Created .env file from template"
        else
            print_error "env.example file not found!"
            exit 1
        fi
    else
        print_warning ".env file already exists, skipping creation"
    fi
    
    # Generate secure keys if they don't exist
    if ! grep -q "your-super-secure" .env; then
        print_status "Environment already configured"
        return
    fi
    
    print_status "Generating secure keys..."
    
    # Generate JWT secrets
    JWT_SECRET=$(generate_random_string 64)
    JWT_REFRESH_SECRET=$(generate_random_string 64)
    MONGO_PASSWORD=$(generate_random_string 24)
    REDIS_PASSWORD=$(generate_random_string 24)
    WEBHOOK_TOKEN=$(generate_random_string 32)
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secure-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
        sed -i '' "s/your-super-secure-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/g" .env
        sed -i '' "s/changeme123/$MONGO_PASSWORD/g" .env
        sed -i '' "s/your-webhook-verify-token/$WEBHOOK_TOKEN/g" .env
    else
        # Linux
        sed -i "s/your-super-secure-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
        sed -i "s/your-super-secure-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/g" .env
        sed -i "s/changeme123/$MONGO_PASSWORD/g" .env
        sed -i "s/your-webhook-verify-token/$WEBHOOK_TOKEN/g" .env
    fi
    
    # Update docker-compose.yml with generated passwords
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/changeme123/$MONGO_PASSWORD/g" docker-compose.yml
    else
        sed -i "s/changeme123/$MONGO_PASSWORD/g" docker-compose.yml
    fi
    
    print_success "Secure keys generated and configured!"
}

# Setup development environment
setup_development() {
    print_status "Setting up development environment..."
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Start development services
    print_status "Starting development services (MongoDB and Redis)..."
    docker-compose up -d mongodb redis
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    print_success "Development environment setup complete!"
    
    # Create development scripts
    create_dev_scripts
}

# Setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    # Create required directories
    mkdir -p deployment/nginx/ssl
    mkdir -p deployment/nginx/logs
    mkdir -p backend/logs
    mkdir -p backend/uploads
    
    print_warning "Production setup requires additional configuration:"
    print_status "1. Update .env with your production values (domains, API keys, etc.)"
    print_status "2. Configure SSL certificates"
    print_status "3. Set up Meta Developer App"
    print_status "4. Configure Stripe account"
    print_status "5. Run: docker-compose up -d"
    
    print_success "Production environment prepared!"
}

# Create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "Starting InstaBot development environment..."

# Start database services
docker-compose up -d mongodb redis

# Wait for services
sleep 5

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"

# Wait for Ctrl+C
wait
EOF

    chmod +x start-dev.sh
    
    # Create stop script
    cat > stop-dev.sh << 'EOF'
#!/bin/bash
echo "Stopping InstaBot development environment..."

# Kill Node.js processes
pkill -f "npm run dev"
pkill -f "node.*server.js"
pkill -f "vite"

# Stop Docker services
docker-compose down

echo "Development environment stopped."
EOF

    chmod +x stop-dev.sh
    
    print_success "Development scripts created!"
}

# Show final instructions
show_final_instructions() {
    local mode=$1
    
    echo ""
    print_success "🎉 InstaBot setup complete!"
    echo ""
    
    if [[ "$mode" == "production" ]]; then
        print_status "Production Setup Next Steps:"
        echo "1. Edit .env file with your production configuration:"
        echo "   - Update FRONTEND_URL and BACKEND_URL"
        echo "   - Add Meta API credentials (META_APP_ID, META_APP_SECRET)"
        echo "   - Add Stripe credentials (STRIPE_SECRET_KEY, etc.)"
        echo "   - Configure email settings for notifications"
        echo ""
        echo "2. Set up SSL certificates:"
        echo "   sudo certbot certonly --standalone -d yourdomain.com"
        echo ""
        echo "3. Deploy the application:"
        echo "   docker-compose up -d"
        echo ""
        echo "4. Monitor the deployment:"
        echo "   docker-compose ps"
        echo "   docker-compose logs -f"
        echo ""
        print_warning "Don't forget to configure your Meta Developer App and Stripe webhooks!"
    else
        print_status "Development Setup Complete!"
        echo "Quick Start:"
        echo "  ./start-dev.sh    # Start development servers"
        echo "  ./stop-dev.sh     # Stop development servers"
        echo ""
        echo "Manual Start:"
        echo "  Backend:  cd backend && npm run dev"
        echo "  Frontend: cd frontend && npm run dev"
        echo ""
        echo "URLs:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:5000"
        echo "  API Docs: http://localhost:5000/api/docs"
        echo ""
        print_warning "Remember to configure your Meta Developer App for testing!"
    fi
    
    echo ""
    print_status "📚 Documentation:"
    echo "  - README.md - Project overview"
    echo "  - DEPLOYMENT_GUIDE.md - Detailed deployment instructions"
    echo "  - backend/src/ - Backend source code"
    echo "  - frontend/src/ - Frontend source code"
    echo ""
    print_status "🔧 Configuration:"
    echo "  - .env - Environment variables"
    echo "  - docker-compose.yml - Container configuration"
    echo ""
    print_success "Happy coding! 🚀"
}

# Run main function with arguments
main "$@"
