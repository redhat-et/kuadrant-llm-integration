import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Policy as PolicyIcon,
  Dashboard as DashboardIcon,
  PlayArrow as SimulatorIcon,
  AccountCircle,
  Apps as AppsIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import PolicyManager from './components/PolicyManager';
import MetricsDashboard from './components/MetricsDashboard';
import RequestSimulator from './components/RequestSimulator';

const drawerWidth = 240;

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
    <Box sx={{ display: 'flex' }}>
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

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#212427',
            borderRight: 'none',
            marginTop: '60px', // Height of the header
          },
        }}
      >
        <List sx={{ pt: 2 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={() => setCurrentView(item.id)}
                sx={{
                  color: currentView === item.id ? '#ffffff' : '#b1b3b6',
                  backgroundColor: currentView === item.id ? '#3d4147' : 'transparent',
                  mx: 1,
                  mb: 0.5,
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: currentView === item.id ? '#3d4147' : '#2c2f33',
                    color: '#ffffff',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: currentView === item.id ? '#ffffff' : '#b1b3b6',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '14px',
                    fontWeight: currentView === item.id ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginTop: '60px',
          backgroundColor: '#f5f5f5',
          minHeight: 'calc(100vh - 60px)',
          overflow: 'auto',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}

export default App;