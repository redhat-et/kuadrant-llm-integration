feat: Add MaaS Policy Management GUI Demo

A comprehensive Proof-of-Concept (PoC) GUI application for Model-as-a-Service (MaaS) 
policy management, designed to be integrated with existing Kuadrant demos.

## Features

### 🧑‍💼 Policy Manager
- Full CRUD operations for MaaS policies
- Drag-and-drop policy builder with Team and Model blocks
- Visual policy evaluation flow (Team → Model → Limits → Time → Decision)
- Token-based rate limiting (hour/day/week/month)
- Time-of-day restrictions with unlimited option
- Rich policy summary with colored chips and emoticons

### 📊 Live Metrics Dashboard  
- Real-time request monitoring with live data streaming
- Filterable metrics by Team, Model, Decision, and Time range
- OpenShift-style data tables with status indicators
- Request statistics and acceptance rate tracking

### ⚙️ Request Simulator
- Interactive drag-and-drop request composition
- Policy simulation with mock evaluation logic
- Burst request testing (1-100 requests)
- Detailed simulation results with timestamps and decisions
- Tooltip information for model details

## Technical Implementation

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) with OpenShift-inspired styling
- **Drag & Drop**: @dnd-kit for modern, accessible DND functionality
- **Mock Data**: Comprehensive enterprise AI models and team configurations
- **Architecture**: Modular component-based design with local state management

## Integration Ready

This PoC demonstrates the complete policy management workflow and can be 
easily integrated with existing Kuadrant demos by replacing mock data 
with real API endpoints and policy evaluation logic.

## UI/UX Highlights

- Red Hat branding with fedora hat icon
- OpenShift Container Platform-inspired design
- Professional dark sidebar navigation
- Responsive layout with clean data presentation
- Visual feedback for drag-and-drop interactions 