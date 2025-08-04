import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Policy } from '../types';
import { INITIAL_POLICIES, TEAMS, MODELS } from '../mockData';
import PolicyBuilder from './PolicyBuilder';

const PolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreatePolicy = () => {
    setSelectedPolicy(null);
    setIsEditing(false);
    setIsBuilderOpen(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsEditing(true);
    setIsBuilderOpen(true);
    handleMenuClose();
  };

  const handleDeletePolicy = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId));
    handleMenuClose();
  };

  const handleSavePolicy = (policy: Policy) => {
    if (isEditing) {
      setPolicies(policies.map(p => p.id === policy.id ? policy : p));
    } else {
      setPolicies([...policies, { ...policy, id: `policy-${Date.now()}` }]);
    }
    setIsBuilderOpen(false);
    setSelectedPolicy(null);
  };

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false);
    setSelectedPolicy(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, policyId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPolicyId(policyId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPolicyId(null);
  };

  const getTeamName = (teamId: string) => {
    return TEAMS.find(t => t.id === teamId)?.name || teamId;
  };

  const getModelName = (modelId: string) => {
    return MODELS.find(m => m.id === modelId)?.name || modelId;
  };

  const renderPolicyRules = (policy: Policy) => {
    const teamItems = policy.items.filter(item => item.type === 'team');
    const modelItems = policy.items.filter(item => item.type === 'model');
    
    const rules = [];
    
    if (teamItems.length > 0) {
      rules.push(
        teamItems.map(item => (
          <Chip
            key={`team-${item.id}`}
            label={getTeamName(item.value)}
            size="small"
            sx={{ 
              mr: 0.5, 
              mb: 0.5,
              backgroundColor: TEAMS.find(t => t.id === item.value)?.color || '#1976d2',
              color: 'white',
              fontSize: '11px',
              height: '20px'
            }}
          />
        ))
      );
    }
    
    if (modelItems.length > 0) {
      rules.push(
        modelItems.map(item => (
          <Chip
            key={`model-${item.id}`}
            label={getModelName(item.value)}
            size="small"
            sx={{ 
              mr: 0.5, 
              mb: 0.5,
              backgroundColor: '#e0e0e0',
              color: '#333',
              fontSize: '11px',
              height: '20px'
            }}
          />
        ))
      );
    }
    
    return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{rules}</Box>;
  };

  const renderLimits = (policy: Policy) => {
    const { requestLimits, timeRange } = policy;
    const limits = [];
    
    if (requestLimits.tokenLimit) {
      limits.push(`${requestLimits.tokenLimit.toLocaleString()} tokens/${requestLimits.timePeriod}`);
    } else {
      limits.push('Unlimited');
    }
    
    if (!timeRange.unlimited) {
      limits.push(`${timeRange.startTime}-${timeRange.endTime}`);
    } else {
      limits.push('24/7');
    }
    
    return limits.join(', ');
  };

  const filteredPolicies = policies.filter(policy =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 400, color: '#333' }}>
          Policies
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePolicy}
          sx={{
            backgroundColor: '#0066cc',
            '&:hover': {
              backgroundColor: '#0052a3',
            },
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Create Policy
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Filter Policies by Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Table */}
      <Paper sx={{ width: '100%', mb: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#f8f8f8', fontWeight: 600, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Name
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f8f8f8', fontWeight: 600, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Status
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f8f8f8', fontWeight: 600, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Rules
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f8f8f8', fontWeight: 600, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>
                  Limits
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f8f8f8', width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPolicies.map((policy) => (
                <TableRow
                  key={policy.id}
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f9f9f9',
                    },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#0066cc', mb: 0.5 }}>
                        {policy.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {policy.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ color: '#3fb950', fontSize: 16, mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#3fb950', fontWeight: 500 }}>
                        Active
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {renderPolicyRules(policy)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {renderLimits(policy)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, policy.id)}
                      sx={{ color: '#666' }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const policy = policies.find(p => p.id === selectedPolicyId);
          if (policy) handleEditPolicy(policy);
        }}>
          <EditIcon sx={{ fontSize: 16, mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedPolicyId) handleDeletePolicy(selectedPolicyId);
          }}
          sx={{ color: '#d73a49' }}
        >
          <DeleteIcon sx={{ fontSize: 16, mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Dialog */}
      <Dialog
        open={isBuilderOpen}
        onClose={handleCloseBuilder}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? 'Edit Policy' : 'Create New Policy'}
          <IconButton
            aria-label="close"
            onClick={handleCloseBuilder}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <PolicyBuilder
            policy={selectedPolicy}
            onSave={handleSavePolicy}
            onCancel={handleCloseBuilder}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PolicyManager;