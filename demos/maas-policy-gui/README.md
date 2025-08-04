# MaaS Policy GUI - EC2 Deployment

A simple EC2 deployment for the MaaS (Model as a Service) Policy GUI demo application.

## Overview

This deployment creates a single EC2 instance with:
- ✅ **React Application**: Served via nginx on port 80
- ✅ **Node.js + PM2**: Process management for reliability  
- ✅ **Direct File Transfer**: No S3 dependencies, files copied via SCP
- ✅ **Simple Setup**: Uses default VPC, minimal infrastructure

## Prerequisites

1. **AWS CLI**: Installed and configured
2. **Ansible**: Installed for infrastructure automation
   - macOS: `brew install ansible`
   - RHEL/CentOS: `sudo yum install ansible`
   - Ubuntu: `sudo apt install ansible`
3. **EC2 Key Pair**: `router-team-us-east2` (or update `KEY_NAME` in script)
4. **Node.js**: For building the React application locally
5. **SSH Access**: Key file permissions set to 400

## Quick Start

### Deploy

```bash
./deploy-ec2.sh deploy
```

**What it does:**
1. Checks prerequisites (AWS CLI, Ansible, SSH key)
2. Builds the React app locally (`npm run build`)
3. Creates a security group allowing HTTP, SSH, and port 3000
4. Launches an EC2 instance with Ubuntu 22.04 LTS
5. Uses Ansible to configure the server (Node.js, nginx, PM2, firewall)
6. Copies build files to the instance via SCP
7. Starts the app with PM2 using ecosystem configuration
8. Saves VM state for future management

### Commands

```bash
# Deploy the application
./deploy-ec2.sh deploy

# Check VM status and get connection info
./deploy-ec2.sh status

# SSH into the VM
./deploy-ec2.sh ssh

# Sync updated files to VM (after making changes)
./deploy-ec2.sh sync

# Destroy VM and clean up all resources
./deploy-ec2.sh destroy
```

### Access

After deployment:
- **Web App**: `http://<PUBLIC_IP>` (from status command)
- **Direct App**: `http://<PUBLIC_IP>:3000`  
- **SSH**: `./deploy-ec2.sh ssh`

## Configuration

Edit `deploy-ec2.sh` to customize:

```bash
REGION="us-east-2"               # AWS region
INSTANCE_TYPE="t3.medium"        # EC2 instance type
KEY_NAME="router-team-us-east2"  # Your EC2 key pair name
SECURITY_GROUP_NAME="maas-policy-gui-sg"
INSTANCE_NAME="maas-policy-gui"
```

## Application Features

The MaaS Policy GUI includes:
- **Policy Builder**: Drag-and-drop interface for creating AI model access policies
- **Team Management**: Assign teams to different AI models
- **Rate Limiting**: Configure token limits per time period
- **Request Simulator**: Test policy rules with simulated requests
- **Metrics Dashboard**: View policy enforcement statistics
- **OpenShift UI Style**: Modern Red Hat design system

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Your Machine  │────│   EC2 Instance   │────│   React App    │
│                 │SCP │                  │    │                │
│ npm run build   │────│ nginx:80 ────────│────│ serve:3000     │
│                 │    │ PM2 Process Mgr  │    │                │
└─────────────────┘    └──────────────────┘    └────────────────┘
```

## Cost Estimation

**Monthly costs (us-east-2):**
- **t3.medium**: ~$30/month
- **t3.small**: ~$15/month  
- **t3.micro**: ~$8/month (free tier eligible)

## Troubleshooting

### Common Issues

1. **SSH Key Not Found**
   ```bash
   # Update the key name in deploy-ec2.sh
   KEY_NAME="your-key-name"
   ```

2. **Permission Denied**
   ```bash
   chmod 400 ~/.ssh/router-team-us-east2.pem
   ```

3. **Security Group Exists**
   ```bash
   # Clean up first
   ./deploy-ec2.sh destroy
   ```

4. **Instance Not Accessible**
   ```bash
   # Check security group allows HTTP traffic
   aws ec2 describe-security-groups --group-names maas-policy-gui-sg --region us-east-2
   ```

### Debug Commands

```bash
# SSH to instance and check services
./deploy-ec2.sh ssh

# Once connected, check services:
pm2 status
sudo systemctl status nginx
pm2 logs maas-policy-gui
curl localhost:3000
```

## Files

- `deploy-ec2.sh` - Main deployment script with subcommands
- `launch-maas-instance.yaml` - Ansible playbook for server configuration (includes embedded nginx and PM2 configs)
- `inventory.ini` - Ansible inventory (dynamically populated)
- `README.md` - This documentation
- `.vm-state` - VM state file (created after deployment)

## Support

For issues:
1. Check the troubleshooting section above
2. Verify AWS credentials and permissions
3. Ensure your key pair exists in the target region
4. Check EC2 instance logs in AWS Console