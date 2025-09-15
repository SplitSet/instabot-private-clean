#!/bin/bash

# Shopify Configuration Script
# This script helps you configure your Shopify credentials interactively

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
    echo -e "${PURPLE}  🛍️  Shopify Bundle App Configuration${NC}"
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

# Function to prompt for input with validation
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="$3"
    local validation_pattern="$4"
    local validation_message="$5"
    
    while true; do
        if [ "$is_secret" = "true" ]; then
            echo -n -e "${BLUE}$prompt:${NC} "
            read -s input
            echo ""
        else
            echo -n -e "${BLUE}$prompt:${NC} "
            read input
        fi
        
        if [ -z "$input" ]; then
            print_error "This field is required. Please enter a value."
            continue
        fi
        
        if [ -n "$validation_pattern" ] && ! echo "$input" | grep -E "$validation_pattern" > /dev/null; then
            print_error "$validation_message"
            continue
        fi
        
        eval "$var_name='$input'"
        break
    done
}

# Main configuration function
main() {
    print_header
    
    print_info "This script will help you configure your Shopify Bundle App with your store credentials."
    echo ""
    
    print_step "1" "Shopify Store Information"
    echo ""
    echo "First, let's configure your Shopify store details:"
    echo ""
    
    prompt_input "Enter your Shopify store domain (e.g., my-store.myshopify.com)" "STORE_DOMAIN" "false" "\.myshopify\.com$" "Store domain must end with .myshopify.com"
    
    echo ""
    print_step "2" "Shopify App Credentials"
    echo ""
    echo "Now, let's configure your Shopify app credentials:"
    echo ""
    
    echo -e "${YELLOW}Choose your app type:${NC}"
    echo "1) Private App (Recommended for testing)"
    echo "2) Public App (For App Store distribution)"
    echo ""
    echo -n "Select option (1 or 2): "
    read app_type
    
    if [ "$app_type" = "1" ]; then
        echo ""
        print_info "Configuring Private App..."
        echo ""
        echo "For a Private App, you only need the Access Token:"
        echo ""
        
        prompt_input "Enter your Private App Access Token (starts with shppa_)" "ACCESS_TOKEN" "true" "^shppa_" "Access token must start with 'shppa_'"
        
        API_KEY=""
        API_SECRET=""
        
    elif [ "$app_type" = "2" ]; then
        echo ""
        print_info "Configuring Public App..."
        echo ""
        echo "For a Public App, you need API Key, Secret, and Access Token:"
        echo ""
        
        prompt_input "Enter your Shopify API Key" "API_KEY" "false" "^[a-f0-9]{32}$" "API Key should be a 32-character hexadecimal string"
        prompt_input "Enter your Shopify API Secret" "API_SECRET" "true" ".{32,}" "API Secret must be at least 32 characters"
        prompt_input "Enter your Access Token (starts with shpat_)" "ACCESS_TOKEN" "true" "^shpat_" "Access token must start with 'shpat_'"
        
    else
        print_error "Invalid selection. Please run the script again and choose 1 or 2."
        exit 1
    fi
    
    echo ""
    print_step "3" "Updating Configuration File"
    echo ""
    
    # Create backup of current .env
    if [ -f "backend/.env" ]; then
        cp backend/.env backend/.env.backup
        print_info "Created backup of existing .env file"
    fi
    
    # Update .env file
    cat > backend/.env << EOF
# Shopify App Configuration
SHOPIFY_API_KEY=${API_KEY}
SHOPIFY_API_SECRET=${API_SECRET}
SHOPIFY_SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers

# Shopify Store Configuration
SHOPIFY_STORE_DOMAIN=${STORE_DOMAIN}
SHOPIFY_ACCESS_TOKEN=${ACCESS_TOKEN}

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# App URLs
APP_URL=http://localhost:5000
REDIRECT_URI=http://localhost:5000/auth/callback

# Security
APP_SECRET=$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 16)

# Database (if needed for future features)
DATABASE_URL=sqlite://database.db

# Logging
LOG_LEVEL=info
EOF
    
    print_success "Configuration file updated successfully!"
    echo ""
    
    print_step "4" "Testing Connection"
    echo ""
    
    print_info "Testing your Shopify connection..."
    
    # Start backend server in background for testing
    cd backend
    npm start > /dev/null 2>&1 &
    SERVER_PID=$!
    cd ..
    
    # Wait for server to start
    sleep 5
    
    # Test connection
    response=$(curl -s -w "%{http_code}" http://localhost:5000/api/shopify/test-connection -o /tmp/shopify_test.json)
    
    if [ "$response" = "200" ]; then
        print_success "✅ Shopify connection successful!"
        
        # Show store info
        store_name=$(cat /tmp/shopify_test.json | grep -o '"store":"[^"]*' | cut -d'"' -f4)
        if [ -n "$store_name" ]; then
            echo "   Connected to: $store_name"
        fi
    else
        print_error "❌ Connection failed. Please check your credentials."
        if [ -f /tmp/shopify_test.json ]; then
            echo "Error details:"
            cat /tmp/shopify_test.json
        fi
    fi
    
    # Clean up
    kill $SERVER_PID 2>/dev/null || true
    rm -f /tmp/shopify_test.json
    
    echo ""
    print_step "5" "Next Steps"
    echo ""
    
    print_success "🎉 Configuration complete!"
    echo ""
    
    print_info "You can now start your Shopify Bundle App:"
    echo ""
    echo "  Development mode:"
    echo "  ./start-dev.sh"
    echo ""
    echo "  Production mode:"
    echo "  ./start-prod.sh"
    echo ""
    
    print_info "🔧 App URLs:"
    echo "  Frontend:  http://localhost:3000"
    echo "  Backend:   http://localhost:5000"
    echo "  Health:    http://localhost:5000/health"
    echo ""
    
    if [ "$app_type" = "1" ]; then
        print_info "📋 Private App Setup Checklist:"
        echo "  ✅ Store domain configured"
        echo "  ✅ Access token configured"
        echo "  ✅ Connection tested"
        echo ""
        print_warning "⚠️  Remember: Private apps have full access to your store data."
    else
        print_info "📋 Public App Setup Checklist:"
        echo "  ✅ API credentials configured"
        echo "  ✅ Access token configured"
        echo "  ✅ Connection tested"
        echo ""
        print_info "🔗 For public apps, also configure in Shopify Partner Dashboard:"
        echo "  - App URL: http://localhost:5000"
        echo "  - Redirect URI: http://localhost:5000/auth/callback"
        echo "  - Webhook URL: http://localhost:5000/api/shopify/webhook"
    fi
    
    echo ""
    print_success "Happy bundling! 🎁"
}

# Run main function
main "$@"
