#!/bin/bash

# Configure Facebook App for InstaBot
# This script helps you configure your Facebook Developer App credentials

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}  🔧 Facebook App Configuration${NC}"
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Generate secure random string
generate_random() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${1:-32}
}

main() {
    print_header
    
    print_info "This script will configure your InstaBot with your Facebook Developer App."
    echo ""
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp backend/env.example .env
        print_success ".env file created!"
    fi
    
    print_step "1" "Facebook App Credentials"
    echo ""
    
    print_info "Go to your Facebook Developer App dashboard:"
    echo "https://developers.facebook.com/apps/"
    echo ""
    echo "Then go to: Settings → Basic"
    echo ""
    
    # Get App ID
    while true; do
        read -p "Enter your App ID: " APP_ID
        if [[ -n "$APP_ID" && "$APP_ID" =~ ^[0-9]+$ ]]; then
            break
        else
            print_warning "Please enter a valid numeric App ID"
        fi
    done
    
    # Get App Secret
    while true; do
        read -s -p "Enter your App Secret: " APP_SECRET
        echo ""
        if [[ -n "$APP_SECRET" && ${#APP_SECRET} -gt 20 ]]; then
            break
        else
            print_warning "Please enter a valid App Secret (should be a long string)"
        fi
    done
    
    print_step "2" "Webhook Configuration"
    echo ""
    
    # Generate webhook verify token
    WEBHOOK_TOKEN=$(generate_random 32)
    print_info "Generated webhook verify token: $WEBHOOK_TOKEN"
    echo ""
    
    print_step "3" "Required App Configuration"
    echo ""
    
    print_info "Now you need to configure your Facebook app with these settings:"
    echo ""
    
    echo "🔗 Instagram Basic Display Settings:"
    echo "   Valid OAuth Redirect URIs:"
    echo "   http://localhost:3000/auth/meta/callback"
    echo ""
    echo "   Deauthorize Callback URL:"
    echo "   http://localhost:5000/webhooks/meta/deauthorize"
    echo ""
    echo "   Data Deletion Request URL:"
    echo "   http://localhost:5000/webhooks/meta/data-deletion"
    echo ""
    
    echo "🔗 Facebook Login Settings:"
    echo "   Valid OAuth Redirect URIs:"
    echo "   http://localhost:3000/auth/meta/callback"
    echo ""
    echo "   Valid Domains:"
    echo "   localhost"
    echo ""
    
    echo "🔗 Webhooks Settings (if you want real-time updates):"
    echo "   Callback URL:"
    echo "   http://localhost:5000/webhooks/meta"
    echo ""
    echo "   Verify Token:"
    echo "   $WEBHOOK_TOKEN"
    echo ""
    echo "   Subscribed Fields:"
    echo "   comments, posts"
    echo ""
    
    read -p "Have you configured these settings in your Facebook app? (y/n): " configured
    
    if [[ "$configured" != "y" && "$configured" != "Y" ]]; then
        print_warning "Please configure your Facebook app first, then run this script again."
        exit 0
    fi
    
    print_step "4" "Updating Environment File"
    
    # Update .env file with the credentials
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/META_APP_ID=.*/META_APP_ID=$APP_ID/" .env
        sed -i '' "s/META_APP_SECRET=.*/META_APP_SECRET=$APP_SECRET/" .env
        sed -i '' "s/META_WEBHOOK_VERIFY_TOKEN=.*/META_WEBHOOK_VERIFY_TOKEN=$WEBHOOK_TOKEN/" .env
    else
        # Linux
        sed -i "s/META_APP_ID=.*/META_APP_ID=$APP_ID/" .env
        sed -i "s/META_APP_SECRET=.*/META_APP_SECRET=$APP_SECRET/" .env
        sed -i "s/META_WEBHOOK_VERIFY_TOKEN=.*/META_WEBHOOK_VERIFY_TOKEN=$WEBHOOK_TOKEN/" .env
    fi
    
    # Generate other secure keys if they're still default
    if grep -q "your-super-secure" .env; then
        print_info "Generating secure keys..."
        
        JWT_SECRET=$(generate_random 64)
        JWT_REFRESH_SECRET=$(generate_random 64)
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/your-super-secure-jwt-key-change-this-in-production/$JWT_SECRET/" .env
            sed -i '' "s/your-super-secure-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/" .env
        else
            sed -i "s/your-super-secure-jwt-key-change-this-in-production/$JWT_SECRET/" .env
            sed -i "s/your-super-secure-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/" .env
        fi
    fi
    
    print_success "Environment file updated with your Facebook app credentials!"
    
    print_step "5" "Next Steps"
    echo ""
    
    print_info "Your InstaBot is now configured with your Facebook app!"
    echo ""
    
    echo "🚀 To start testing:"
    echo "1. Start the development environment:"
    echo "   ./quick-test.sh"
    echo ""
    echo "2. Or start manually:"
    echo "   Terminal 1: cd backend && npm run dev"
    echo "   Terminal 2: cd frontend && npm run dev"
    echo ""
    echo "3. Open: http://localhost:3000"
    echo ""
    
    echo "📱 Testing your accounts:"
    echo "1. Register/Login to InstaBot"
    echo "2. Go to Settings → Connections"
    echo "3. Click 'Connect Instagram' - it will use your Facebook app"
    echo "4. Authorize with your Instagram Business account"
    echo "5. Same for Facebook Page connection"
    echo ""
    
    print_warning "Important Notes:"
    echo "• Make sure your Instagram account is a Business or Creator account"
    echo "• For Facebook, you need to be an admin of the page you want to connect"
    echo "• Start with monitoring only - keep comment deletion disabled initially"
    echo ""
    
    print_success "🎉 Configuration complete! Ready to test with your real accounts!"
}

main "$@"
