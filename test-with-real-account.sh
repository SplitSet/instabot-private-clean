#!/bin/bash

# InstaBot Real Account Testing Script
# This script helps you quickly set up testing with your real Instagram/Facebook accounts

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
    echo -e "${PURPLE}  🧪 InstaBot Real Account Testing${NC}"
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

# Check if services are running
check_services() {
    print_step "1" "Checking if development services are running..."
    
    if ! docker-compose ps | grep -q "Up"; then
        print_warning "Services not running. Starting them now..."
        docker-compose up -d mongodb redis
        sleep 5
        print_success "Database services started!"
    else
        print_success "Database services are already running!"
    fi
    
    # Check if backend is running
    if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
        print_warning "Backend not running. You'll need to start it manually:"
        echo "  cd backend && npm run dev"
    else
        print_success "Backend is running!"
    fi
    
    # Check if frontend is running
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_warning "Frontend not running. You'll need to start it manually:"
        echo "  cd frontend && npm run dev"
    else
        print_success "Frontend is running!"
    fi
}

# Guide user through Meta app setup
setup_meta_app() {
    print_step "2" "Setting up Meta Developer App..."
    echo ""
    
    print_info "You need to create a Facebook Developer App to test with real accounts."
    print_info "Follow these steps:"
    echo ""
    
    echo "1. Go to: https://developers.facebook.com/"
    echo "2. Click 'Get Started' or 'My Apps'"
    echo "3. Click 'Create App' → 'Business' → Continue"
    echo "4. App Name: 'InstaBot Test' (or any name you prefer)"
    echo "5. Contact Email: your email address"
    echo ""
    
    echo "6. Add Products:"
    echo "   - Instagram Basic Display"
    echo "   - Facebook Login"
    echo ""
    
    echo "7. Configure Instagram Basic Display:"
    echo "   - Valid OAuth Redirect URIs: http://localhost:3000/auth/meta/callback"
    echo "   - Deauthorize Callback URL: http://localhost:5000/webhooks/meta/deauthorize"
    echo "   - Data Deletion Request URL: http://localhost:5000/webhooks/meta/data-deletion"
    echo ""
    
    echo "8. Configure Facebook Login:"
    echo "   - Valid OAuth Redirect URIs: http://localhost:3000/auth/meta/callback"
    echo "   - Valid Domains: localhost"
    echo ""
    
    read -p "Press Enter when you've completed the Meta app setup..."
    
    print_success "Meta app setup completed!"
}

# Help user update environment variables
update_environment() {
    print_step "3" "Updating environment variables..."
    echo ""
    
    if [ ! -f .env ]; then
        print_error ".env file not found! Run ./setup.sh first."
        exit 1
    fi
    
    print_info "You need to add your Meta app credentials to the .env file."
    echo ""
    
    echo "In your Meta Developer App dashboard:"
    echo "1. Go to Settings → Basic"
    echo "2. Copy your App ID and App Secret"
    echo ""
    
    read -p "Enter your Meta App ID: " META_APP_ID
    read -p "Enter your Meta App Secret: " META_APP_SECRET
    
    if [[ -n "$META_APP_ID" && -n "$META_APP_SECRET" ]]; then
        # Update .env file
        if grep -q "META_APP_ID=" .env; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/META_APP_ID=.*/META_APP_ID=$META_APP_ID/" .env
                sed -i '' "s/META_APP_SECRET=.*/META_APP_SECRET=$META_APP_SECRET/" .env
            else
                sed -i "s/META_APP_ID=.*/META_APP_ID=$META_APP_ID/" .env
                sed -i "s/META_APP_SECRET=.*/META_APP_SECRET=$META_APP_SECRET/" .env
            fi
        else
            echo "META_APP_ID=$META_APP_ID" >> .env
            echo "META_APP_SECRET=$META_APP_SECRET" >> .env
        fi
        
        print_success "Environment variables updated!"
    else
        print_warning "Skipping environment update. You can manually edit .env later."
    fi
}

# Create test user guide
create_test_guide() {
    print_step "4" "Creating your test plan..."
    echo ""
    
    cat > TEST_PLAN.md << 'EOF'
# 🧪 Your Personal InstaBot Test Plan

## Quick Start
1. Open: http://localhost:3000
2. Register a new account
3. Go to Settings → Connections
4. Connect your Instagram Business account
5. Connect your Facebook Page

## Test Scenarios

### Scenario 1: Account Connection ✅
- [ ] Instagram connection works
- [ ] Facebook connection works
- [ ] Connection status shows correctly
- [ ] Can disconnect and reconnect

### Scenario 2: Comment Monitoring 👀
- [ ] Post something on Instagram/Facebook
- [ ] Have someone comment on it
- [ ] Check if comment appears in dashboard
- [ ] Verify comment details are correct

### Scenario 3: Bot Settings ⚙️
- [ ] Enable/disable bot monitoring
- [ ] Add trusted users to whitelist
- [ ] Set custom keywords to filter
- [ ] Adjust monitoring frequency

### Scenario 4: Safe Comment Testing 🛡️
**IMPORTANT: Only test with secondary accounts!**
- [ ] Create test comment with secondary account
- [ ] Enable bot with deletion disabled (monitoring only)
- [ ] Verify comment is detected and analyzed
- [ ] Check suspicious score calculation

## Safety Checklist
- [ ] Added your own accounts to whitelist
- [ ] Testing with secondary/test accounts only
- [ ] Bot deletion is DISABLED for initial testing
- [ ] Monitoring backend logs for errors

## Test Data
- Instagram Business Account: ________________
- Facebook Page: ________________
- Test Account 1: ________________
- Test Account 2: ________________

## Notes
Write any observations or issues here:
_________________________________________________
_________________________________________________
_________________________________________________
EOF

    print_success "Created TEST_PLAN.md - your personal testing checklist!"
}

# Show testing instructions
show_testing_instructions() {
    print_step "5" "Ready to test!"
    echo ""
    
    print_info "Your testing environment is ready. Here's what to do next:"
    echo ""
    
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:5000"
    echo "📊 Health:   http://localhost:5000/health"
    echo ""
    
    echo "📋 Testing Steps:"
    echo "1. Register/Login at http://localhost:3000"
    echo "2. Go to Settings → Connections"
    echo "3. Connect your Instagram Business account"
    echo "4. Connect your Facebook Page"
    echo "5. Enable bot monitoring (keep deletion DISABLED initially)"
    echo "6. Post content and monitor comment detection"
    echo ""
    
    print_warning "SAFETY FIRST:"
    echo "- Add your own accounts to the whitelist"
    echo "- Test comment deletion with secondary accounts only"
    echo "- Keep 'Delete Unauthorized Comments' OFF initially"
    echo "- Monitor logs: tail -f backend/logs/combined.log"
    echo ""
    
    print_info "📖 Detailed guide: See TESTING_GUIDE.md"
    print_info "📋 Your test plan: See TEST_PLAN.md"
}

# Start backend and frontend
start_servers() {
    print_step "6" "Starting development servers..."
    
    echo ""
    print_info "Choose how to start the servers:"
    echo "1. Automatic (recommended) - starts both servers"
    echo "2. Manual - you start them yourself"
    echo "3. Skip - servers already running"
    
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            print_info "Starting servers automatically..."
            
            # Check if start-dev.sh exists
            if [ -f "start-dev.sh" ]; then
                ./start-dev.sh &
                SERVER_PID=$!
                sleep 3
                print_success "Servers started! PID: $SERVER_PID"
                echo "To stop: kill $SERVER_PID"
            else
                print_info "Starting servers manually..."
                echo "Terminal 1: cd backend && npm run dev"
                echo "Terminal 2: cd frontend && npm run dev"
            fi
            ;;
        2)
            print_info "Start servers manually:"
            echo "Terminal 1: cd backend && npm run dev"
            echo "Terminal 2: cd frontend && npm run dev"
            ;;
        3)
            print_info "Assuming servers are already running..."
            ;;
    esac
}

# Test API endpoints
test_endpoints() {
    print_step "7" "Testing API endpoints..."
    
    sleep 2
    
    echo "Testing backend health..."
    if curl -s http://localhost:5000/health > /dev/null; then
        print_success "✅ Backend is healthy!"
    else
        print_warning "⚠️  Backend not responding (may still be starting)"
    fi
    
    echo "Testing frontend..."
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "✅ Frontend is accessible!"
    else
        print_warning "⚠️  Frontend not responding (may still be starting)"
    fi
}

# Main execution
main() {
    print_header
    
    print_info "This script will help you test InstaBot with your real Instagram/Facebook accounts safely."
    echo ""
    
    read -p "Ready to start? (y/n): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        print_info "Exiting. Run this script again when you're ready!"
        exit 0
    fi
    
    check_services
    echo ""
    
    setup_meta_app
    echo ""
    
    update_environment
    echo ""
    
    create_test_guide
    echo ""
    
    start_servers
    echo ""
    
    test_endpoints
    echo ""
    
    show_testing_instructions
    echo ""
    
    print_success "🎉 Your InstaBot testing environment is ready!"
    print_info "Open http://localhost:3000 to start testing!"
}

# Run main function
main "$@"
