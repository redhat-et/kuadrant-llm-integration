#!/bin/bash

# MaaS Policy GUI - EC2 Deployment
# Creates an EC2 instance and deploys the React app directly via SCP

set -e

# Ensure no editors are opened
export EDITOR=""
export VISUAL=""
export GIT_EDITOR=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
REGION="us-east-2"
INSTANCE_TYPE="t3.medium"
KEY_NAME="router-team-us-east2"
SECURITY_GROUP_NAME="maas-policy-gui-sg"
INSTANCE_NAME="maas-policy-gui"
STATE_FILE=".vm-state"

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Show usage
show_usage() {
    echo "Usage: $0 [deploy|destroy|status|ssh|sync]"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy the MaaS Policy GUI to EC2 with all files and make it work"
    echo "  destroy  - Terminate the VM"
    echo "  status   - Show VM status and connection info"
    echo "  ssh      - Connect to the VM via SSH"
    echo "  sync     - Synchronize project files to VM (excluding node_modules)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy    # Deploy the application"
    echo "  $0 status    # Check VM status"
    echo "  $0 ssh       # SSH into the VM"
    echo "  $0 sync      # Update files on VM"
    echo "  $0 destroy   # Clean up all resources"
    exit 1
}

# Save VM state
save_state() {
    cat > $STATE_FILE << EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
VPC_ID=$VPC_ID
SG_ID=$SG_ID
AMI_ID=$AMI_ID
REGION=$REGION
EOF
}

# Load VM state
load_state() {
    if [ -f $STATE_FILE ]; then
        source $STATE_FILE
        return 0
    else
        return 1
    fi
}

# Get the default VPC
get_default_vpc() {
    print_status "Getting default VPC..."
    VPC_ID=$(aws ec2 describe-vpcs --region $REGION --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
    if [ "$VPC_ID" = "None" ]; then
        print_error "No default VPC found. Please create one first."
        exit 1
    fi
    print_success "Using VPC: $VPC_ID"
}

# Create or get security group
setup_security_group() {
    print_status "Setting up security group..."
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups --region $REGION --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" = "None" ]; then
        print_status "Creating security group..."
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Security group for MaaS Policy GUI" \
            --vpc-id $VPC_ID \
            --region $REGION \
            --query 'GroupId' --output text)
        
        # Add rules
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0 \
            --region $REGION
            
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --region $REGION
            
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 3000 \
            --cidr 0.0.0.0/0 \
            --region $REGION
            
        print_success "Security group created: $SG_ID"
    else
        print_success "Using existing security group: $SG_ID"
    fi
}

# Get latest Ubuntu 22.04 LTS AMI
get_latest_ami() {
    print_status "Getting latest Ubuntu 22.04 LTS AMI..."
    AMI_ID=$(aws ec2 describe-images \
        --region $REGION \
        --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)
    print_success "Using AMI: $AMI_ID"
}

# Create EC2 instance
create_instance() {
    print_status "Creating EC2 instance..."
    
    # Create user data script
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs nginx
npm install -g pm2 serve
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app

# Configure nginx
cat > /etc/nginx/conf.d/maas-policy-gui.conf << 'NGINXEOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

systemctl enable nginx
systemctl start nginx
EOF

    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
        --region $REGION \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    print_success "Instance created: $INSTANCE_ID"
    
    # Clean up user data file
    rm user-data.sh
}

# Wait for instance
wait_for_instance() {
    print_status "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    
    print_status "Waiting for status checks..."
    aws ec2 wait instance-status-ok --instance-ids $INSTANCE_ID --region $REGION
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    print_success "Instance ready! Public IP: $PUBLIC_IP"
}

# Build React app
build_app() {
    print_status "Building React application..."
    npm install
    npm run build
    print_success "Application built"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Ansible is installed
    if ! command -v ansible-playbook &> /dev/null; then
        print_error "Ansible is not installed. Please install it first."
        print_status "On macOS: brew install ansible"
        print_status "On RHEL/CentOS: sudo yum install ansible"
        print_status "On Ubuntu: sudo apt install ansible"
        exit 1
    fi
    
    # Check if AWS is configured
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if key file exists
    if [ ! -f ~/.ssh/$KEY_NAME.pem ]; then
        print_error "SSH key file ~/.ssh/$KEY_NAME.pem not found."
        exit 1
    fi
    
    # Check key file permissions
    KEY_PERMS=$(stat -c %a ~/.ssh/$KEY_NAME.pem 2>/dev/null || stat -f %A ~/.ssh/$KEY_NAME.pem)
    if [ "$KEY_PERMS" != "400" ]; then
        print_error "SSH key file must have 400 permissions. Run: chmod 400 ~/.ssh/$KEY_NAME.pem"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Wait for SSH to be available
wait_for_ssh() {
    print_status "Waiting for SSH to be available..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z $PUBLIC_IP 22 2>/dev/null; then
            print_success "SSH is available"
            return 0
        fi
        print_status "Attempt $attempt/$max_attempts: Waiting for SSH..."
        sleep 10
        ((attempt++))
    done
    
    print_error "SSH not available after $max_attempts attempts"
    exit 1
}

# Create dynamic inventory for Ansible
create_inventory() {
    print_status "Creating Ansible inventory..."
    cat > inventory.ini << EOF
[ec2_instances]
$PUBLIC_IP ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/$KEY_NAME.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR'

[all:vars]
ansible_python_interpreter=/usr/bin/python3
EOF
}

# Deploy app using Ansible
deploy_app() {
    wait_for_ssh
    create_inventory
    
    print_status "Configuring server with Ansible..."
    ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook -i inventory.ini launch-maas-instance.yaml --timeout=30 -v
    
    print_status "Copying application files..."
    scp -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem -r build/* ubuntu@$PUBLIC_IP:~/app/
    
    print_status "Creating logs directory..."
    ssh -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP "mkdir -p ~/app/logs"
    
    print_status "Starting application with PM2..."
    ssh -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP << 'EOF'
cd ~/app
pm2 delete maas-policy-gui 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 startup
pm2 save
EOF
    
    print_success "Application deployed and running!"
}

# Deploy command - Full deployment
cmd_deploy() {
    echo "🚀 MaaS Policy GUI - EC2 Deployment"
    echo "===================================="
    
    # Check prerequisites first
    check_prerequisites
    
    # Check if already deployed
    if load_state; then
        print_error "VM already exists (Instance ID: $INSTANCE_ID)"
        print_status "Use '$0 status' to check or '$0 destroy' to clean up first"
        exit 1
    fi
    
    get_default_vpc
    setup_security_group
    get_latest_ami
    build_app
    create_instance
    wait_for_instance
    deploy_app
    
    # Save state
    save_state
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "📱 Access your app at: http://$PUBLIC_IP"
    echo "🔗 Direct access: http://$PUBLIC_IP:3000"
    echo "🖥️  SSH access: $0 ssh"
    echo ""
    echo "📋 Resources created:"
    echo "   Instance ID: $INSTANCE_ID"
    echo "   Security Group: $SG_ID"
    echo "   Public IP: $PUBLIC_IP"
}

# Destroy command - Clean up all resources
cmd_destroy() {
    echo "🗑️  MaaS Policy GUI - EC2 Cleanup"
    echo "=================================="
    
    if ! load_state; then
        print_error "No VM state found. Nothing to destroy."
        exit 1
    fi
    
    print_status "Destroying VM and resources..."
    
    # Terminate instance
    if [ -n "$INSTANCE_ID" ]; then
        print_status "Terminating instance: $INSTANCE_ID"
        aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION >/dev/null
        
        print_status "Waiting for instance termination..."
        aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID --region $REGION
        print_success "Instance terminated"
    fi
    
    # Delete security group
    if [ -n "$SG_ID" ]; then
        print_status "Deleting security group: $SG_ID"
        aws ec2 delete-security-group --group-id $SG_ID --region $REGION >/dev/null
        print_success "Security group deleted"
    fi
    
    # Clean up local files
    rm -f $STATE_FILE user-data.sh
    
    print_success "Cleanup complete!"
}

# Status command - Show VM status and connection info
cmd_status() {
    echo "📋 MaaS Policy GUI - VM Status"
    echo "=============================="
    
    if ! load_state; then
        print_error "No VM deployed. Use '$0 deploy' to create one."
        exit 1
    fi
    
    # Get current instance state
    INSTANCE_STATE=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "not-found")
    
    # Get current public IP
    CURRENT_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null || echo "none")
    
    echo "Instance ID: $INSTANCE_ID"
    echo "State: $INSTANCE_STATE"
    echo "Public IP: $CURRENT_IP"
    echo "Region: $REGION"
    echo "Security Group: $SG_ID"
    echo ""
    
    if [ "$INSTANCE_STATE" = "running" ]; then
        echo "🌐 Access URLs:"
        echo "   Web App: http://$CURRENT_IP"
        echo "   Direct: http://$CURRENT_IP:3000"
        echo ""
        echo "🖥️  SSH Command:"
        echo "   $0 ssh"
        echo ""
        echo "📁 Sync Files:"
        echo "   $0 sync"
    else
        echo "⚠️  Instance is not running"
    fi
}

# SSH command - Connect to VM
cmd_ssh() {
    if ! load_state; then
        print_error "No VM deployed. Use '$0 deploy' to create one."
        exit 1
    fi
    
    # Get current public IP
    CURRENT_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null)
    
    if [ "$CURRENT_IP" = "None" ] || [ "$CURRENT_IP" = "" ]; then
        print_error "No public IP found. Instance may not be running."
        exit 1
    fi
    
    print_status "Connecting to $CURRENT_IP..."
    ssh -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem ubuntu@$CURRENT_IP
}

# Sync command - Synchronize project files
cmd_sync() {
    check_prerequisites
    
    if ! load_state; then
        print_error "No VM deployed. Use '$0 deploy' to create one."
        exit 1
    fi
    
    # Get current public IP
    CURRENT_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null)
    
    if [ "$CURRENT_IP" = "None" ] || [ "$CURRENT_IP" = "" ]; then
        print_error "No public IP found. Instance may not be running."
        exit 1
    fi
    
    print_status "Building application..."
    build_app
    
    print_status "Syncing files to $CURRENT_IP..."
    
    # Sync build files
    scp -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem -r build/* ubuntu@$CURRENT_IP:~/app/
    
    # Restart application using PM2 ecosystem
    ssh -o StrictHostKeyChecking=no -i ~/.ssh/$KEY_NAME.pem ubuntu@$CURRENT_IP << 'EOF'
cd ~/app
pm2 restart maas-policy-gui || pm2 start ecosystem.config.js
EOF
    
    print_success "Files synced and application restarted!"
    print_status "Access your app at: http://$CURRENT_IP"
}

# Main function - Parse commands
main() {
    case "${1:-}" in
        deploy)
            cmd_deploy
            ;;
        destroy)
            cmd_destroy
            ;;
        status)
            cmd_status
            ;;
        ssh)
            cmd_ssh
            ;;
        sync)
            cmd_sync
            ;;
        *)
            show_usage
            ;;
    esac
}

main "$@"