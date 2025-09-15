#!/bin/bash

# Shopify Bundle App Setup Script
# This script helps you set up the complete bundle app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  🛍️  Shopify Bundle App Setup${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup function
main() {
    print_header
    
    print_info "This script will set up your Shopify Bundle App with all dependencies and configurations."
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_environment
    
    # Create startup scripts
    create_startup_scripts
    
    # Show final instructions
    show_instructions
}

# Check prerequisites
check_prerequisites() {
    print_step "1" "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Please install the missing dependencies:"
        echo "  - Node.js 18+: https://nodejs.org/"
        echo "  - npm (comes with Node.js)"
        exit 1
    fi
    
    print_success "All prerequisites are installed!"
}

# Install dependencies
install_dependencies() {
    print_step "2" "Installing dependencies..."
    
    # Install root dependencies
    print_info "Installing root package dependencies..."
    npm install
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    print_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed successfully!"
}

# Setup environment
setup_environment() {
    print_step "3" "Setting up environment configuration..."
    
    if [ ! -f backend/.env ]; then
        cp backend/env.example backend/.env
        print_success "Created backend/.env file from template"
        
        print_warning "IMPORTANT: You need to configure your Shopify credentials in backend/.env"
        echo ""
        echo "Required configuration:"
        echo "  1. SHOPIFY_STORE_DOMAIN=your-store.myshopify.com"
        echo "  2. SHOPIFY_ACCESS_TOKEN=your-private-app-access-token"
        echo "  3. SHOPIFY_API_KEY=your-api-key (if using public app)"
        echo "  4. SHOPIFY_API_SECRET=your-api-secret (if using public app)"
        echo ""
    else
        print_info "Environment file already exists"
    fi
}

# Create startup scripts
create_startup_scripts() {
    print_step "4" "Creating startup scripts..."
    
    # Create development start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Shopify Bundle App in development mode..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5000"
echo "📊 Health:   http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
EOF

    chmod +x start-dev.sh
    
    # Create production start script
    cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Shopify Bundle App in production mode..."

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm run build
cd ..

# Start backend
echo "📦 Starting backend server..."
cd backend
npm start
EOF

    chmod +x start-prod.sh
    
    print_success "Startup scripts created!"
}

# Show final instructions
show_instructions() {
    print_step "5" "Setup complete!"
    echo ""
    
    print_success "🎉 Your Shopify Bundle App is ready!"
    echo ""
    
    print_info "Next Steps:"
    echo ""
    echo "1. 📝 Configure your Shopify credentials:"
    echo "   Edit backend/.env with your store details"
    echo ""
    echo "2. 🏪 Set up Shopify Private App:"
    echo "   - Go to your Shopify Admin → Settings → Apps and sales channels"
    echo "   - Click 'Develop apps' → 'Create an app'"
    echo "   - Configure permissions: read_products, write_products, read_orders, write_orders"
    echo "   - Install the app and copy the access token"
    echo ""
    echo "3. 🚀 Start the application:"
    echo "   ./start-dev.sh    (Development mode)"
    echo "   ./start-prod.sh   (Production mode)"
    echo ""
    
    print_info "🔧 Development URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:5000"
    echo "   API Health: http://localhost:5000/health"
    echo ""
    
    print_info "📚 Features:"
    echo "   ✅ Product browsing and search"
    echo "   ✅ Bundle creation with upsells"
    echo "   ✅ Cart transformation (like FastBundle)"
    echo "   ✅ Product duplication with custom titles"
    echo "   ✅ Order tracking and analytics"
    echo "   ✅ Shopify API integration"
    echo ""
    
    print_warning "⚠️  Remember to:"
    echo "   - Configure your Shopify credentials in backend/.env"
    echo "   - Test the Shopify connection before creating bundles"
    echo "   - Ensure your Shopify app has the required permissions"
    echo ""
    
    print_success "Happy bundling! 🎁"
}

# Run main function
main "$@"
