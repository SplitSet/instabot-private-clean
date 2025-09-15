#!/bin/bash

# Direct Render Deployment Script
# This script helps deploy InstaBot directly to Render using API calls

set -e

echo "🚀 Direct Render Deployment for InstaBot"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if curl is available
check_curl() {
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed!"
        exit 1
    fi
    print_success "curl is available"
}

# Get Render API token
get_api_token() {
    print_status "You need a Render API token to deploy via CLI"
    echo ""
    echo "To get your API token:"
    echo "1. Go to: https://dashboard.render.com/"
    echo "2. Click on your profile → Account Settings"
    echo "3. Go to 'API Keys' section"
    echo "4. Create a new API key"
    echo ""
    read -p "Enter your Render API token: " RENDER_API_TOKEN
    
    if [ -z "$RENDER_API_TOKEN" ]; then
        print_error "API token is required!"
        exit 1
    fi
    
    print_success "API token received"
}

# Create backend service
create_backend_service() {
    print_status "Creating backend service..."
    
    # Service configuration
    SERVICE_CONFIG='{
        "name": "instabot-backend",
        "type": "web_service",
        "repo": "https://github.com/SplitSet/instabot-private",
        "branch": "main",
        "rootDir": "backend",
        "buildCommand": "npm install --production",
        "startCommand": "npm start",
        "plan": "free",
        "region": "oregon",
        "autoDeploy": true,
        "envVars": [
            {"key": "NODE_ENV", "value": "production"},
            {"key": "PORT", "value": "10000"},
            {"key": "MONGODB_URI", "value": "mongodb+srv://instabot-user:instabot123@cluster0.vuv.mongodb.net/instabot-private?retryWrites=true&w=majority"},
            {"key": "REDIS_URL", "value": "redis://default:bjDz54jWIyNvHDF8uRm8CyW5CiDFVa01@redis-11735.c245.us-east-1-3.ec2.redns.redis-cloud.com:11735"},
            {"key": "JWT_SECRET", "value": "your-super-secret-jwt-key-for-private-app"},
            {"key": "META_APP_ID", "value": "1419703882459970"},
            {"key": "META_APP_SECRET", "value": "75cfd3595ac08e9397565d93eaf0b193"},
            {"key": "META_WEBHOOK_VERIFY_TOKEN", "value": "fraudprotect-webhook-token-2024"},
            {"key": "FACEBOOK_ACCESS_TOKEN", "value": "EAAULNpGZAq0IBPcZBtBlu4ZAFd2I0ySP7xEmr24m3PxczSAzAwRsLEJWAxqI0Da8AJAhZA8E0dVLw0eoenwqPIv0elgU6JCuqcvZCZABfZCg3qgn07xj3rtJtzXnZCofnps339TPmHYtwjOwKo4QQnPvOdL3nOpgRj8KavgL8x7W5kIvtHfza6uoZAoOZBVO8QeEzv3FPaAQkAcUWs3SDcht9Xu2cewYQZBivGNsRwL0apZA"},
            {"key": "FACEBOOK_PAGE_ID", "value": "1935878793391260"},
            {"key": "INSTAGRAM_APP_ID", "value": "628630250112579"},
            {"key": "INSTAGRAM_APP_SECRET", "value": "77387e4f58158b619bbee9d6906979bb"},
            {"key": "ENCRYPTION_KEY", "value": "be77388d322e34a1e7ae6cc39d360cbec52cdb850b560d3dc147b031a21c4e1d"},
            {"key": "DISABLE_SUBSCRIPTION_BILLING", "value": "true"},
            {"key": "DISABLE_USER_AUTHENTICATION", "value": "true"},
            {"key": "PRIVATE_APP_MODE", "value": "true"},
            {"key": "TEST_MODE", "value": "true"},
            {"key": "TEST_POST_ID", "value": "1705521123601620"},
            {"key": "BOT_ENABLED", "value": "true"},
            {"key": "BOT_DELETE_ENABLED", "value": "false"},
            {"key": "ENABLE_REGISTRATION", "value": "false"},
            {"key": "ENABLE_EMAIL_VERIFICATION", "value": "false"},
            {"key": "ENABLE_TWO_FACTOR_AUTH", "value": "false"},
            {"key": "LOG_LEVEL", "value": "info"},
            {"key": "HEALTH_CHECK_ENABLED", "value": "true"}
        ]
    }'
    
    # Create service via API
    RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
        -H "Authorization: Bearer $RENDER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$SERVICE_CONFIG")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Failed to create backend service"
        echo "$RESPONSE"
        exit 1
    fi
    
    print_success "Backend service created!"
    BACKEND_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "Backend URL: $BACKEND_URL"
}

# Create frontend service
create_frontend_service() {
    print_status "Creating frontend service..."
    
    # Service configuration
    SERVICE_CONFIG='{
        "name": "instabot-frontend",
        "type": "static_site",
        "repo": "https://github.com/SplitSet/instabot-private",
        "branch": "main",
        "rootDir": "frontend",
        "buildCommand": "npm install && npm run build",
        "publishPath": "dist",
        "plan": "free",
        "region": "oregon",
        "autoDeploy": true,
        "envVars": [
            {"key": "VITE_API_URL", "value": "'$BACKEND_URL'"}
        ]
    }'
    
    # Create service via API
    RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
        -H "Authorization: Bearer $RENDER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$SERVICE_CONFIG")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Failed to create frontend service"
        echo "$RESPONSE"
        exit 1
    fi
    
    print_success "Frontend service created!"
    FRONTEND_URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
    echo "Frontend URL: $FRONTEND_URL"
}

# Main deployment flow
main() {
    echo "Starting direct Render deployment..."
    echo ""
    
    check_curl
    get_api_token
    
    echo ""
    print_status "Ready to deploy! This will:"
    echo "  - Create backend service with all your environment variables"
    echo "  - Create frontend service"
    echo "  - Deploy from your GitHub repository"
    echo ""
    
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_backend_service
        create_frontend_service
        
        echo ""
        print_success "Deployment Complete! 🎉"
        echo "=========================="
        echo "Backend URL:  $BACKEND_URL"
        echo "Frontend URL: $FRONTEND_URL"
        echo ""
        echo "Next Steps:"
        echo "1. Wait for services to deploy (2-3 minutes)"
        echo "2. Test backend: curl $BACKEND_URL/health"
        echo "3. Test frontend: Visit $FRONTEND_URL"
        echo "4. Update Facebook App with new URLs"
        echo ""
    else
        print_warning "Deployment cancelled"
        exit 0
    fi
}

# Run main function
main "$@"
