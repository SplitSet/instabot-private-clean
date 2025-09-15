#!/bin/bash

# InstaBot Lightweight Render Deployment Script
# This script helps deploy InstaBot to Render.com for private use

set -e

echo "🚀 InstaBot Lightweight Render Deployment"
echo "========================================"

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

# Check if Render CLI is installed
check_render_cli() {
    print_status "Checking Render CLI installation..."
    
    if ! command -v render &> /dev/null; then
        print_error "Render CLI is not installed!"
        echo "Please install it first:"
        echo "  npm install -g @render/cli"
        exit 1
    fi
    
    print_success "Render CLI is installed"
}

# Check if user is logged in to Render
check_render_auth() {
    print_status "Checking Render authentication..."
    
    if ! render auth whoami &> /dev/null; then
        print_warning "Not logged in to Render CLI"
        echo "Please log in first:"
        echo "  render auth login"
        exit 1
    fi
    
    print_success "Authenticated with Render"
}

# Check if environment file exists
check_env_file() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        print_warning "No .env file found"
        echo "Creating .env from lightweight template..."
        cp env.render.lightweight .env
        print_warning "Please edit .env file with your actual values before deploying!"
        echo "Required values:"
        echo "  - META_APP_ID (from Facebook Developer Console)"
        echo "  - META_APP_SECRET (from Facebook Developer Console)"
        echo ""
        read -p "Press Enter after updating .env file..."
    fi
    
    print_success "Environment file ready"
}

# Deploy to Render
deploy_to_render() {
    print_status "Deploying lightweight InstaBot to Render..."
    
    # Check if services already exist
    if render services list | grep -q "instabot-backend"; then
        print_warning "Services already exist. Updating existing services..."
        render services update --file render.yaml
    else
        print_status "Creating new lightweight services..."
        render services create --file render.yaml
    fi
    
    print_success "Deployment initiated!"
}

# Set up environment variables (lightweight)
setup_env_vars() {
    print_status "Setting up environment variables for private use..."
    
    # Read from .env file and set in Render (skip Stripe and other unnecessary vars)
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # Extract key=value pairs
        if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            
            # Skip database URLs as they're set automatically by Render
            if [[ $key == "MONGODB_URI" ]] || [[ $key == "REDIS_URL" ]]; then
                continue
            fi
            
            # Skip Stripe and payment-related variables
            if [[ $key == "STRIPE_"* ]] || [[ $key == "SMTP_"* ]] || [[ $key == "EMAIL_"* ]]; then
                continue
            fi
            
            # Set environment variable for backend service
            if [[ $key == "VITE_"* ]]; then
                # Frontend environment variables
                render env set "$key=$value" --service instabot-frontend
            else
                # Backend environment variables
                render env set "$key=$value" --service instabot-backend
            fi
            
            print_status "Set $key for service"
        fi
    done < .env
    
    print_success "Environment variables configured for private use"
}

# Get service URLs
get_service_urls() {
    print_status "Getting service URLs..."
    
    backend_url=$(render services get instabot-backend --format json | jq -r '.service.serviceDetails.url')
    frontend_url=$(render services get instabot-frontend --format json | jq -r '.service.serviceDetails.url')
    
    echo ""
    print_success "Lightweight Deployment Complete! 🎉"
    echo "=========================================="
    echo "Backend URL:  $backend_url"
    echo "Frontend URL: $frontend_url"
    echo ""
    echo "Private Use Configuration:"
    echo "✅ Registration disabled (private use only)"
    echo "✅ Email verification disabled"
    echo "✅ Two-factor auth disabled"
    echo "✅ Bot monitoring enabled (deletion disabled)"
    echo "✅ Stripe/payment features removed"
    echo ""
    echo "Next Steps:"
    echo "1. Update your Facebook App settings with the new URLs:"
    echo "   - Valid OAuth Redirect URIs: $frontend_url/auth/meta/callback"
    echo "   - Webhook URL: $backend_url/webhooks/meta"
    echo ""
    echo "2. Test your private deployment:"
    echo "   - Visit: $frontend_url"
    echo "   - Check health: $backend_url/health"
    echo ""
    echo "3. Access your private InstaBot:"
    echo "   - Create a single user account manually"
    echo "   - Connect your Instagram/Facebook accounts"
    echo "   - Enable monitoring (deletion disabled for safety)"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting lightweight Render deployment process..."
    echo ""
    
    check_render_cli
    check_render_auth
    check_env_file
    
    echo ""
    print_status "Ready to deploy lightweight InstaBot! This will:"
    echo "  - Create/update backend service (no payments)"
    echo "  - Create/update frontend service (simplified)"
    echo "  - Create MongoDB database (minimal)"
    echo "  - Create Redis cache (minimal)"
    echo "  - Set up environment variables (private use)"
    echo ""
    
    read -p "Continue with lightweight deployment? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_render
        setup_env_vars
        get_service_urls
    else
        print_warning "Deployment cancelled"
        exit 0
    fi
}

# Run main function
main "$@"

