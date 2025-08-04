import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Container,
  Button,
} from '@mui/material';
import {
  Policy as PolicyIcon,
  Dashboard as DashboardIcon,
  PlayArrow as SimulatorIcon,
  AccountCircle,
  Apps as AppsIcon,
  Help as HelpIcon,
  Book as KnowledgeIcon,
  CheckCircle as StatusIcon,
} from '@mui/icons-material';
import PolicyManager from './components/PolicyManager';
import MetricsDashboard from './components/MetricsDashboard';
import RequestSimulator from './components/RequestSimulator';

const drawerWidth = 0; // No sidebar anymore

const navigationItems = [
  { text: 'Policy Manager', icon: <PolicyIcon />, id: 'policies' },
  { text: 'Live Metrics', icon: <DashboardIcon />, id: 'metrics' },
  { text: 'Request Simulator', icon: <SimulatorIcon />, id: 'simulator' },
];

function App() {
  const [currentView, setCurrentView] = useState('policies');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'policies':
        return <PolicyManager />;
      case 'metrics':
        return <MetricsDashboard />;
      case 'simulator':
        return <RequestSimulator />;
      default:
        return <PolicyManager />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#0f1419',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar sx={{ minHeight: '60px !important' }}>
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'transparent', // Clear background
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
                mr: 2,
              }}
            >
              {/* Red Hat fedora icon */}
              <Box
                sx={{
                  width: '32px',
                  height: '32px',
                  position: 'relative',
                }}
              >
                <img 
                  src="/redhat-fedora-logo.png"
                  alt="Red Hat"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            </Box>
            
            {/* Vertical line separator */}
            <Box
              sx={{
                width: '2px',
                height: '30px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                mr: 2,
              }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 600,
                  fontSize: '24px',
                  lineHeight: 1.2,
                  letterSpacing: '0.5px',
                  mr: 2,
                }}
              >
                MaaS
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                Inference Model as a Service
              </Typography>
            </Box>
          </Box>

          {/* Right side icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton sx={{ color: 'white' }}>
              <AppsIcon />
            </IconButton>
            <IconButton sx={{ color: 'white' }}>
              <HelpIcon />
            </IconButton>
            <IconButton onClick={handleMenuClick} sx={{ color: 'white', ml: 1 }}>
              <AccountCircle />
              <Typography variant="body2" sx={{ ml: 1, color: 'white' }}>
                admin
              </Typography>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              sx={{ mt: 1 }}
            >
              <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
              <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
              <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Horizontal Navigation Bar */}
      <Box
        sx={{
          backgroundColor: '#2b3138',
          borderBottom: '1px solid #3b4148',
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          height: '50px',
          zIndex: 1100,
        }}
      >
        <Container maxWidth={false} sx={{ height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 2 }}>
            {/* Policies */}
            <Box
              onClick={() => setCurrentView('policies')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                mr: 4,
                cursor: 'pointer',
                backgroundColor: currentView === 'policies' ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <KnowledgeIcon sx={{ fontSize: '18px', color: '#ffffff', mr: 1 }} />
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                Policies
              </Typography>
            </Box>
            
            {/* System Status with green dot */}
            <Box
              onClick={() => setCurrentView('metrics')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                mr: 4,
                cursor: 'pointer',
                backgroundColor: currentView === 'metrics' ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <Box
                sx={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#4caf50',
                  borderRadius: '50%',
                  mr: 1,
                }}
              />
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                System Status
              </Typography>
            </Box>
            
            {/* Simulator */}
            <Box
              onClick={() => setCurrentView('simulator')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                backgroundColor: currentView === 'simulator' ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <SimulatorIcon sx={{ fontSize: '18px', color: '#ffffff', mr: 1 }} />
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 400,
                }}
              >
                Simulator
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: '#f5f5f5',
          marginTop: '110px', // Account for header (60px) + nav bar (50px)
          overflow: 'auto',
          p: 3,
          minHeight: 'calc(100vh - 110px)',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}

export default App;