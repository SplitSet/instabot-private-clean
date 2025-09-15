#!/bin/bash

# InstaBot Render Deployment Script
# This script helps deploy InstaBot to Render.com

set -e

echo "🚀 InstaBot Render Deployment Script"
echo "====================================="

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
        echo "  or"
        echo "  curl -fsSL https://cli.render.com/install.sh | sh"
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
        echo "Creating .env from template..."
        cp env.render.example .env
        print_warning "Please edit .env file with your actual values before deploying!"
        echo "Required values:"
        echo "  - META_APP_ID"
        echo "  - META_APP_SECRET"
        echo "  - STRIPE_SECRET_KEY"
        echo "  - STRIPE_PUBLISHABLE_KEY"
        echo "  - STRIPE_WEBHOOK_SECRET"
        echo "  - STRIPE_PRICE_ID"
        echo ""
        read -p "Press Enter after updating .env file..."
    fi
    
    print_success "Environment file ready"
}

# Deploy to Render
deploy_to_render() {
    print_status "Deploying to Render..."
    
    # Check if services already exist
    if render services list | grep -q "instabot-backend"; then
        print_warning "Services already exist. Updating existing services..."
        render services update --file render.yaml
    else
        print_status "Creating new services..."
        render services create --file render.yaml
    fi
    
    print_success "Deployment initiated!"
}

# Set up environment variables
setup_env_vars() {
    print_status "Setting up environment variables..."
    
    # Read from .env file and set in Render
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
    
    print_success "Environment variables configured"
}

# Get service URLs
get_service_urls() {
    print_status "Getting service URLs..."
    
    backend_url=$(render services get instabot-backend --format json | jq -r '.service.serviceDetails.url')
    frontend_url=$(render services get instabot-frontend --format json | jq -r '.service.serviceDetails.url')
    
    echo ""
    print_success "Deployment Complete! 🎉"
    echo "====================================="
    echo "Backend URL:  $backend_url"
    echo "Frontend URL: $frontend_url"
    echo ""
    echo "Next Steps:"
    echo "1. Update your Facebook App settings with the new URLs:"
    echo "   - Valid OAuth Redirect URIs: $frontend_url/auth/meta/callback"
    echo "   - Webhook URL: $backend_url/webhooks/meta"
    echo ""
    echo "2. Update your Stripe webhook endpoint:"
    echo "   - URL: $backend_url/webhooks/stripe"
    echo ""
    echo "3. Test your deployment:"
    echo "   - Visit: $frontend_url"
    echo "   - Check health: $backend_url/health"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting Render deployment process..."
    echo ""
    
    check_render_cli
    check_render_auth
    check_env_file
    
    echo ""
    print_status "Ready to deploy! This will:"
    echo "  - Create/update backend service"
    echo "  - Create/update frontend service"
    echo "  - Create MongoDB database"
    echo "  - Create Redis cache"
    echo "  - Set up environment variables"
    echo ""
    
    read -p "Continue with deployment? (y/N): " -n 1 -r
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

