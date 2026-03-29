#!/bin/bash

# 🚀 Stokpile Production Deployment Script
# This script helps automate the deployment process

set -e  # Exit on error

echo "🚀 Starting Stokpile Deployment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if required tools are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    print_success "Node.js installed"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm installed"
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Install with: npm install -g supabase"
    else
        print_success "Supabase CLI installed"
    fi
    
    echo ""
}

# Check environment variables
check_env_vars() {
    print_info "Checking environment variables..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Copy .env.example to .env and fill in values"
        echo ""
        read -p "Do you want to continue? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Environment variables file exists"
    fi
    echo ""
}

# Run tests (if you have any)
run_tests() {
    print_info "Running tests..."
    
    # Uncomment when you add tests
    # npm test
    
    print_success "Tests passed (skipped - no tests defined)"
    echo ""
}

# Build the application
build_app() {
    print_info "Building application..."
    
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Build successful"
    else
        print_error "Build failed"
        exit 1
    fi
    echo ""
}

# Deploy Edge Function to Supabase
deploy_edge_function() {
    print_info "Deploying Edge Function to Supabase..."
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not installed. Skipping Edge Function deployment"
        print_info "Install with: npm install -g supabase"
        echo ""
        return
    fi
    
    read -p "Deploy Edge Function? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd supabase/functions
        supabase functions deploy server
        cd ../..
        print_success "Edge Function deployed"
    else
        print_info "Edge Function deployment skipped"
    fi
    echo ""
}

# Deploy to Vercel
deploy_vercel() {
    print_info "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not installed"
        print_info "Install with: npm install -g vercel"
        echo ""
        return
    fi
    
    read -p "Deploy to Vercel? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel --prod
        print_success "Deployed to Vercel"
    else
        print_info "Vercel deployment skipped"
    fi
    echo ""
}

# Deploy to Netlify
deploy_netlify() {
    print_info "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not installed"
        print_info "Install with: npm install -g netlify-cli"
        echo ""
        return
    fi
    
    read -p "Deploy to Netlify? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        netlify deploy --prod
        print_success "Deployed to Netlify"
    else
        print_info "Netlify deployment skipped"
    fi
    echo ""
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "  Stokpile Production Deployment"
    echo "=========================================="
    echo ""
    
    check_dependencies
    check_env_vars
    
    # Ask deployment type
    echo "Select deployment target:"
    echo "1) Vercel"
    echo "2) Netlify"
    echo "3) Both"
    echo "4) Build only (no deployment)"
    read -p "Enter choice [1-4]: " choice
    echo ""
    
    run_tests
    build_app
    deploy_edge_function
    
    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            deploy_netlify
            ;;
        3)
            deploy_vercel
            deploy_netlify
            ;;
        4)
            print_info "Build complete. Skipping deployment."
            ;;
        *)
            print_warning "Invalid choice. Skipping deployment."
            ;;
    esac
    
    echo "=========================================="
    print_success "Deployment process complete! 🎉"
    echo "=========================================="
    echo ""
    print_info "Next steps:"
    echo "1. Verify deployment at your production URL"
    echo "2. Test critical user flows"
    echo "3. Monitor error logs"
    echo "4. Check database performance"
    echo ""
}

# Run main function
main
