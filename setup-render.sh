#!/bin/bash

# InstaBot Render Setup Script
# This script sets up the Render CLI and prepares the project for deployment

set -e

echo "🚀 InstaBot Render Setup Script"
echo "==============================="

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

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        echo "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    node_version=$(node --version)
    print_success "Node.js is installed: $node_version"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed!"
        echo "Please install npm or update Node.js"
        exit 1
    fi
    
    npm_version=$(npm --version)
    print_success "npm is installed: $npm_version"
}

# Install Render CLI
install_render_cli() {
    print_status "Installing Render CLI..."
    
    if command -v render &> /dev/null; then
        print_warning "Render CLI is already installed"
        render_version=$(render --version)
        echo "Current version: $render_version"
    else
        print_status "Installing Render CLI via npm..."
        npm install -g @render/cli
        
        if command -v render &> /dev/null; then
            print_success "Render CLI installed successfully"
        else
            print_error "Failed to install Render CLI"
            echo "Try installing manually:"
            echo "  npm install -g @render/cli"
            echo "  or"
            echo "  curl -fsSL https://cli.render.com/install.sh | sh"
            exit 1
        fi
    fi
}

# Check if user is logged in
check_render_auth() {
    print_status "Checking Render authentication..."
    
    if ! render auth whoami &> /dev/null; then
        print_warning "Not logged in to Render CLI"
        echo "Please log in:"
        echo "  render auth login"
        echo ""
        echo "This will open your browser to authenticate with Render."
        echo "You need a Render.com account to continue."
        echo ""
        read -p "Press Enter after logging in, or Ctrl+C to exit..."
        
        # Check again after user claims to have logged in
        if ! render auth whoami &> /dev/null; then
            print_error "Still not authenticated. Please run 'render auth login' and try again."
            exit 1
        fi
    fi
    
    user_info=$(render auth whoami)
    print_success "Authenticated as: $user_info"
}

# Create environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env.render.example" ]; then
            print_status "Creating .env from template..."
            cp env.render.example .env
            print_success "Created .env file from template"
        else
            print_warning "No environment template found"
            print_status "Creating basic .env file..."
            cat > .env << EOF
# InstaBot Environment Configuration
# Update these values with your actual configuration

# Server Configuration
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# JWT Configuration (Generate secure keys)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-change-this
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters-change-this

# Meta API Configuration
META_APP_ID=your-facebook-app-id
META_APP_SECRET=your-facebook-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PRICE_ID=price_your-monthly-subscription-price-id

# Application URLs (Will be updated after deployment)
FRONTEND_URL=https://instabot-frontend.onrender.com
BACKEND_URL=https://instabot-backend.onrender.com
EOF
            print_success "Created basic .env file"
        fi
    else
        print_warning ".env file already exists"
    fi
    
    echo ""
    print_warning "IMPORTANT: You must update the .env file with your actual values!"
    echo "Required values:"
    echo "  - META_APP_ID (from Facebook Developer Console)"
    echo "  - META_APP_SECRET (from Facebook Developer Console)"
    echo "  - STRIPE_SECRET_KEY (from Stripe Dashboard)"
    echo "  - STRIPE_PUBLISHABLE_KEY (from Stripe Dashboard)"
    echo "  - STRIPE_WEBHOOK_SECRET (from Stripe Dashboard)"
    echo "  - STRIPE_PRICE_ID (from Stripe Dashboard)"
    echo ""
}

# Verify project structure
verify_project() {
    print_status "Verifying project structure..."
    
    required_files=(
        "render.yaml"
        "backend/package.json"
        "frontend/package.json"
        "backend/Dockerfile"
        "frontend/Dockerfile"
    )
    
    missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All required files are present"
    else
        print_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    print_success "Setup Complete! 🎉"
    echo "========================"
    echo ""
    echo "Next Steps:"
    echo "1. Update .env file with your actual values:"
    echo "   nano .env"
    echo ""
    echo "2. Deploy to Render:"
    echo "   ./deploy-render.sh"
    echo ""
    echo "3. Or deploy manually:"
    echo "   render services create --file render.yaml"
    echo ""
    echo "4. Update Facebook App settings with new URLs"
    echo "5. Update Stripe webhook endpoint"
    echo "6. Test your deployment"
    echo ""
    echo "For detailed instructions, see:"
    echo "  RENDER_DEPLOYMENT_GUIDE.md"
    echo ""
}

# Main setup flow
main() {
    echo "Starting Render setup process..."
    echo ""
    
    check_node
    check_npm
    install_render_cli
    check_render_auth
    setup_environment
    verify_project
    show_next_steps
}

# Run main function
main "$@"

