# MaaS Policy Management GUI

A full-featured Model as a Service (MaaS) policy management system built with React, demonstrating a comprehensive policy management interface for three different user personas.

## 🚀 Features

### 🧑‍💼 Policy Manager
- **Full CRUD Operations**: Create, read, update, and delete policies
- **Drag-and-Drop Policy Builder**: Intuitive interface for composing policies
- **Flexible Policy Rules**: Support for team-based and model-based policies
- **Request Limits**: Configure rate limiting by requests and tokens
- **Time Constraints**: Set allowed time ranges for policy execution
- **Approve/Reject Logic**: Define whether policies approve or reject matching requests

### 📊 Live Metrics Dashboard
- **Real-time Updates**: Live streaming of request data every 2 seconds
- **Comprehensive Filtering**: Filter by team, model, decision, and custom search
- **Statistics Overview**: Real-time acceptance rates and request counts
- **Interactive Controls**: Pause/resume live updates and clear data
- **Detailed Request History**: Complete audit trail with timestamps and reasoning

### ⚙️ Request Simulator
- **Interactive Request Composition**: Drag-and-drop interface for building requests
- **Bulk Simulation**: Test 1-100 requests at once
- **Policy Validation**: Real-time evaluation against existing policies
- **Detailed Results**: See exactly why requests are accepted or rejected
- **Performance Metrics**: Track acceptance rates across simulations

## 🛠️ Technologies Used

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Professional UI components and theming
- **React Beautiful DnD** - Smooth drag-and-drop interactions
- **React Router DOM** - Client-side routing
- **Day.js** - Date and time manipulation

## 📦 Installation

1. **Navigate to the project directory**:
   ```bash
   cd demos/maas-policy-gui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** and visit `http://localhost:3000`

## 🎯 Usage Guide

### Policy Manager
1. Click "Create Policy" to start building a new policy
2. Drag teams and models from the available items to the policy area
3. Toggle between "Approve" and "Reject" for each policy item
4. Set request limits and time constraints as needed
5. Save your policy to see it in the main list

### Live Metrics Dashboard
1. The dashboard automatically starts generating mock request data
2. Use the filters to narrow down the data view
3. Click the pause button to stop live updates
4. Use the search bar to find specific requests
5. Clear all data with the clear button

### Request Simulator
1. Drag a team and model to the request composer area
2. Set the time of day and enter a query
3. Choose how many requests to simulate (1-100)
4. Click "Simulate Request" to test against your policies
5. Review the results to understand policy behavior

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── PolicyManager.tsx    # Policy CRUD interface
│   ├── PolicyBuilder.tsx    # Drag-and-drop policy creator
│   ├── MetricsDashboard.tsx # Live metrics and filtering
│   └── RequestSimulator.tsx # Request testing interface
├── types.ts             # TypeScript type definitions
├── mockData.ts          # Sample data and generators
├── App.tsx              # Main application component
└── index.tsx            # Application entry point
```

## 🎨 Design Principles

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Intuitive UX**: Drag-and-drop interfaces for complex interactions
- **Real-time Feedback**: Live updates and immediate validation
- **Professional Styling**: Clean, modern interface suitable for demos
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🔧 Mock Data & Logic

The application uses sophisticated mock data including:

- **Teams**: Engineering, Product, Marketing, CTO with color coding
- **Models**: Popular LLM models from OpenAI, Anthropic, Meta, etc.
- **Policies**: Pre-configured examples showing different use cases
- **Request Generation**: Realistic random request generation
- **Policy Evaluation**: Complete logic for request approval/rejection

## 🚦 Policy Evaluation Logic

The simulator evaluates requests using this logic:

1. **Policy Matching**: Check if request matches any policy items
2. **Time Validation**: Verify request falls within allowed time ranges
3. **Rejection Rules**: Apply explicit rejection policies first
4. **Approval Rules**: Apply approval policies if no rejections
5. **Default Deny**: Reject requests with no matching policies

## 🎪 Demo Scenarios

The app comes with three pre-configured policies perfect for demonstrations:

1. **Engineering Access Policy**: Full access during business hours
2. **Premium Model Restriction**: Limits expensive models to CTO team
3. **Marketing Limited Access**: Restricted model access with rate limits

## 🔄 Future Enhancements

This demo application is designed to be plugged into a real system with:

- **Backend Integration**: Replace mock data with real API calls
- **Authentication**: Add user authentication and role-based access
- **Database Storage**: Persistent policy and metrics storage
- **Advanced Analytics**: Historical trends and detailed reporting
- **Webhook Integration**: Real-time notifications and alerts

## 📝 License

This project is part of the Kuadrant LLM Integration demos and follows the same licensing terms.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!