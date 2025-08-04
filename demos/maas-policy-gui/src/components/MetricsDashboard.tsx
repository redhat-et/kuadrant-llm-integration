import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Toolbar,
} from '@mui/material';
import {
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { Request } from '../types';
import { generateRandomRequest, TEAMS, MODELS } from '../mockData';

const MetricsDashboard: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [teamFilter, setTeamFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Live data generation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newRequest = generateRandomRequest();
      setRequests(prev => [newRequest, ...prev].slice(0, 100)); // Keep only last 100 requests
    }, 2000); // Generate a new request every 2 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    if (teamFilter !== 'all') {
      filtered = filtered.filter(req => req.team === teamFilter);
    }

    if (modelFilter !== 'all') {
      filtered = filtered.filter(req => req.model === modelFilter);
    }

    if (decisionFilter !== 'all') {
      filtered = filtered.filter(req => req.decision === decisionFilter);
    }

    if (searchText) {
      filtered = filtered.filter(req => 
        req.queryText?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.id.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, teamFilter, modelFilter, decisionFilter, searchText]);

  const handleToggleLive = () => {
    setIsLive(!isLive);
  };

  const handleClearData = () => {
    setRequests([]);
  };

  const getTeamName = (teamId: string) => {
    return TEAMS.find(t => t.id === teamId)?.name || teamId;
  };

  const getModelName = (modelId: string) => {
    return MODELS.find(m => m.id === modelId)?.name || modelId;
  };

  const getTeamColor = (teamId: string) => {
    return TEAMS.find(t => t.id === teamId)?.color || '#1976d2';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStats = () => {
    const total = requests.length;
    const accepted = requests.filter(r => r.decision === 'accept').length;
    const rejected = requests.filter(r => r.decision === 'reject').length;
    const acceptanceRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0';

    return { total, accepted, rejected, acceptanceRate };
  };

  const stats = getStats();

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 400, color: '#333' }}>
          Live Metrics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={handleToggleLive}
            sx={{
              backgroundColor: isLive ? '#3fb950' : '#6e7681',
              color: 'white',
              '&:hover': {
                backgroundColor: isLive ? '#2da44e' : '#56606d',
              },
            }}
          >
            {isLive ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton 
            onClick={handleClearData} 
            sx={{
              backgroundColor: '#da3633',
              color: 'white',
              '&:hover': {
                backgroundColor: '#b91c1c',
              },
            }}
          >
            <ClearIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography sx={{ fontSize: '12px', color: '#656d76', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Requests
              </Typography>
              <Typography variant="h4" sx={{ color: '#24292f', fontWeight: 600 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography sx={{ fontSize: '12px', color: '#656d76', textTransform: 'uppercase', fontWeight: 600 }}>
                Accepted
              </Typography>
              <Typography variant="h4" sx={{ color: '#3fb950', fontWeight: 600 }}>
                {stats.accepted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography sx={{ fontSize: '12px', color: '#656d76', textTransform: 'uppercase', fontWeight: 600 }}>
                Rejected
              </Typography>
              <Typography variant="h4" sx={{ color: '#da3633', fontWeight: 600 }}>
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography sx={{ fontSize: '12px', color: '#656d76', textTransform: 'uppercase', fontWeight: 600 }}>
                Acceptance Rate
              </Typography>
              <Typography variant="h4" sx={{ color: '#24292f', fontWeight: 600 }}>
                {stats.acceptanceRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ mb: 3, border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ backgroundColor: '#f6f8fa', borderBottom: '1px solid #d1d9e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search requests..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#656d76' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Team</InputLabel>
              <Select
                value={teamFilter}
                label="Team"
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <MenuItem value="all">All Teams</MenuItem>
                {TEAMS.map(team => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Model</InputLabel>
              <Select
                value={modelFilter}
                label="Model"
                onChange={(e) => setModelFilter(e.target.value)}
              >
                <MenuItem value="all">All Models</MenuItem>
                {MODELS.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Decision</InputLabel>
              <Select
                value={decisionFilter}
                label="Decision"
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <MenuItem value="all">All Decisions</MenuItem>
                <MenuItem value="accept">Accept</MenuItem>
                <MenuItem value="reject">Reject</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Toolbar>
      </Paper>

      {/* Live indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <DotIcon
          sx={{
            color: isLive ? '#3fb950' : '#da3633',
            fontSize: 12,
            mr: 1,
            animation: isLive ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        />
        <Typography variant="body2" sx={{ color: '#656d76' }}>
          {isLive ? 'Live updates enabled' : 'Live updates paused'} • 
          Showing {filteredRequests.length} of {requests.length} requests
        </Typography>
      </Box>

      {/* Requests Table */}
      <Paper sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Timestamp
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Team
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Model
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Decision
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Tokens
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Query
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                  Request ID
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow 
                  key={request.id} 
                  hover
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f6f8fa',
                    },
                  }}
                >
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {formatTimestamp(request.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Chip
                      label={getTeamName(request.team)}
                      size="small"
                      sx={{
                        backgroundColor: getTeamColor(request.team),
                        color: 'white',
                        fontSize: '11px',
                        height: '20px',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Typography variant="body2" sx={{ color: '#24292f' }}>
                      {getModelName(request.model)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {request.decision === 'accept' ? (
                        <CheckCircleIcon sx={{ color: '#3fb950', fontSize: 16, mr: 1 }} />
                      ) : (
                        <CancelIcon sx={{ color: '#da3633', fontSize: 16, mr: 1 }} />
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: request.decision === 'accept' ? '#3fb950' : '#da3633',
                          fontWeight: 500,
                          textTransform: 'capitalize'
                        }}
                      >
                        {request.decision}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Typography variant="body2" sx={{ color: '#656d76' }}>
                      {request.tokens?.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, borderBottom: '1px solid #d1d9e0' }}>
                    <Typography variant="body2" noWrap sx={{ color: '#24292f' }}>
                      {request.queryText}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '12px', color: '#656d76' }}>
                      {request.id.split('-')[1]}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {filteredRequests.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" sx={{ color: '#656d76' }}>
            {requests.length === 0 
              ? 'No requests yet. Data will appear when live updates are enabled.'
              : 'No requests match the current filters.'
            }
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MetricsDashboard;