import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Tooltip,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { SimulationRequest } from '../types';
import { TEAMS, MODELS, INITIAL_POLICIES } from '../mockData';

// Helper component for draggable chips in simulator
interface DraggableChipProps {
  id: string;
  label: string;
  color?: string;
}

const DraggableChip: React.FC<DraggableChipProps> = ({ id, label, color }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Chip
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      label={label}
      sx={{
        m: 0.5,
        backgroundColor: color || '#e0e0e0',
        color: color ? 'white' : '#333',
        cursor: 'grab',
        fontWeight: 'bold',
        maxWidth: 'none',
        '&:active': { cursor: 'grabbing' },
        '& .MuiChip-label': {
          whiteSpace: 'nowrap',
          overflow: 'visible',
          textOverflow: 'unset'
        }
      }}
    />
  );
};

// Helper component for droppable zones
interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  sx?: any;
}

const DroppableZone: React.FC<DroppableZoneProps> = ({ id, children, sx }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        ...sx,
        border: isOver ? '2px dashed #0066cc' : '2px dashed #d1d9e0',
        backgroundColor: isOver ? 'rgba(0, 102, 204, 0.1)' : sx?.backgroundColor || '#ffffff',
      }}
    >
      {children}
    </Paper>
  );
};

interface SimulationResult {
  id: string;
  timestamp: string;
  request: SimulationRequest;
  decision: 'accept' | 'reject';
  reason: string;
}

const RequestSimulator: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState('12:00');
  const [queryText, setQueryText] = useState('');
  const [numRequests, setNumRequests] = useState(1);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const availableTeams = TEAMS.filter(team => team.id !== selectedTeam);
  const availableModels = MODELS.filter(model => model.id !== selectedModel);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith('available-team-') && overId === 'team-dropzone') {
      const parts = activeId.split('-');
      const teamId = parts.slice(2).join('-');
      setSelectedTeam(teamId);
    }

    if (activeId.startsWith('available-model-') && overId === 'model-dropzone') {
      const parts = activeId.split('-');
      const modelId = parts.slice(2).join('-');
      setSelectedModel(modelId);
    }
  };

  const simulatePolicy = (request: SimulationRequest): { decision: 'accept' | 'reject'; reason: string } => {
    const policies = INITIAL_POLICIES;
    
    for (const policy of policies) {
      const teamItems = policy.items.filter(item => item.type === 'team');
      const modelItems = policy.items.filter(item => item.type === 'model');
      
      // Check team rules
      const teamMatch = teamItems.find(item => item.value === request.team);
      if (teamMatch && !teamMatch.isApprove) {
        return { decision: 'reject', reason: 'Team not approved by policy' };
      }
      
      // Check model rules
      const modelMatch = modelItems.find(item => item.value === request.model);
      if (modelMatch && !modelMatch.isApprove) {
        return { decision: 'reject', reason: 'Model not approved by policy' };
      }
      
      // Check time constraints
      if (!policy.timeRange.unlimited) {
        const requestTime = new Date(`2024-01-01 ${request.timeOfDay}`);
        const startTime = new Date(`2024-01-01 ${policy.timeRange.startTime}`);
        const endTime = new Date(`2024-01-01 ${policy.timeRange.endTime}`);
        
        if (requestTime < startTime || requestTime > endTime) {
          return { decision: 'reject', reason: 'Request outside allowed time range' };
        }
      }
    }
    
    return { decision: 'accept', reason: 'Request meets all policy requirements' };
  };

  const handleSimulate = () => {
    if (!selectedTeam || !selectedModel) {
      alert('Please select both a team and a model');
      return;
    }

    const newResults: SimulationResult[] = [];
    
    for (let i = 0; i < numRequests; i++) {
      const request: SimulationRequest = {
        team: selectedTeam,
        model: selectedModel,
        timeOfDay,
        queryText,
        count: 1,
      };
      
      const { decision, reason } = simulatePolicy(request);
      
      newResults.push({
        id: `sim-${Date.now()}-${i}`,
        timestamp: new Date().toISOString(),
        request,
        decision,
        reason,
      });
    }
    
    setResults([...newResults, ...results]);
  };

  const handleClearResults = () => {
    setResults([]);
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
    return new Date(timestamp).toLocaleTimeString();
  };

  const getDragOverlayLabel = (id: string | null) => {
    if (!id) return '';
    
    if (id.startsWith('available-team-')) {
      const parts = id.split('-');
      const teamId = parts.slice(2).join('-');
      return getTeamName(teamId);
    }
    
    if (id.startsWith('available-model-')) {
      const parts = id.split('-');
      const modelId = parts.slice(2).join('-');
      return getModelName(modelId);
    }
    
    return '';
  };

  const getDragOverlayColor = (id: string | null) => {
    if (!id) return '#e0e0e0';
    
    if (id.startsWith('available-team-')) {
      const parts = id.split('-');
      const teamId = parts.slice(2).join('-');
      return getTeamColor(teamId);
    }
    
    return '#e0e0e0';
  };

  const stats = {
    total: results.length,
    accepted: results.filter(r => r.decision === 'accept').length,
    rejected: results.filter(r => r.decision === 'reject').length,
    acceptanceRate: results.length > 0 ? ((results.filter(r => r.decision === 'accept').length / results.length) * 100).toFixed(1) : '0',
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 400, color: '#333' }}>
          Request Simulator
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {results.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearResults}
              sx={{
                borderColor: '#da3633',
                color: '#da3633',
                '&:hover': {
                  backgroundColor: '#da3633',
                  color: 'white',
                },
              }}
            >
              Clear Results
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={handleSimulate}
            disabled={!selectedTeam || !selectedModel}
            sx={{
              backgroundColor: '#0066cc',
              '&:hover': {
                backgroundColor: '#0052a3',
              },
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Run Simulation
          </Button>
        </Box>
      </Box>

      {/* Request Composer */}
      <Paper sx={{ mb: 3, border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #d1d9e0', backgroundColor: '#f6f8fa' }}>
          <Typography variant="h6" sx={{ color: '#24292f', fontWeight: 600 }}>
            Compose Request
          </Typography>
          <Typography variant="body2" sx={{ color: '#656d76', mt: 1 }}>
            Drag a team and model, then configure your simulation parameters
          </Typography>
        </Box>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Available Items */}
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#24292f' }}>
                  Available Items
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#656d76', mb: 1, textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                    Teams
                  </Typography>
                  <Paper sx={{ p: 2, minHeight: 80, border: '1px solid #d1d9e0', backgroundColor: '#f6f8fa' }}>
                    {availableTeams.map((team) => (
                      <DraggableChip
                        key={`available-team-${team.id}`}
                        id={`available-team-${team.id}`}
                        label={team.name}
                        color={team.color}
                      />
                    ))}
                  </Paper>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#656d76', mb: 1, textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                    Models
                  </Typography>
                  <Paper sx={{ p: 2, minHeight: 120, border: '1px solid #d1d9e0', backgroundColor: '#f6f8fa' }}>
                    {availableModels.map((model) => (
                      <Tooltip
                        key={`tooltip-${model.id}`}
                        title={
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                              {model.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#90CAF9', mb: 1, display: 'block' }}>
                              Provider: {model.provider}
                            </Typography>
                            <Typography variant="body2" sx={{ maxWidth: 400 }}>
                              {model.description}
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                        enterDelay={500}
                        leaveDelay={200}
                      >
                        <span>
                          <DraggableChip
                            key={`available-model-${model.id}`}
                            id={`available-model-${model.id}`}
                            label={model.name}
                          />
                        </span>
                      </Tooltip>
                    ))}
                  </Paper>
                </Box>
              </Grid>

              {/* Request Composition */}
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#24292f' }}>
                  Request Configuration
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#656d76', mb: 1, textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                        Selected Team
                      </Typography>
                      <DroppableZone 
                        id="team-dropzone"
                        sx={{ 
                          p: 2, 
                          minHeight: 60, 
                          backgroundColor: selectedTeam ? '#f6f8fa' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {selectedTeam ? (
                          <Chip
                            label={getTeamName(selectedTeam)}
                            onDelete={() => setSelectedTeam('')}
                            sx={{
                              backgroundColor: getTeamColor(selectedTeam),
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          />
                        ) : (
                          <Typography variant="body2" sx={{ color: '#656d76' }}>
                            Drop a team here
                          </Typography>
                        )}
                      </DroppableZone>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#656d76', mb: 1, textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                        Selected Model
                      </Typography>
                      <DroppableZone 
                        id="model-dropzone"
                        sx={{ 
                          p: 2, 
                          minHeight: 60, 
                          backgroundColor: selectedModel ? '#f6f8fa' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {selectedModel ? (
                          <Tooltip
                            title={
                              <Box sx={{ p: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                  {MODELS.find(m => m.id === selectedModel)?.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#90CAF9', mb: 1, display: 'block' }}>
                                  Provider: {MODELS.find(m => m.id === selectedModel)?.provider}
                                </Typography>
                                <Typography variant="body2" sx={{ maxWidth: 400 }}>
                                  {MODELS.find(m => m.id === selectedModel)?.description}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                            enterDelay={500}
                            leaveDelay={200}
                          >
                            <Chip
                              label={getModelName(selectedModel)}
                              onDelete={() => setSelectedModel('')}
                              sx={{
                                backgroundColor: '#e0e0e0',
                                color: '#333',
                                fontWeight: 'bold',
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#656d76' }}>
                            Drop a model here
                          </Typography>
                        )}
                      </DroppableZone>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Time of Day"
                          type="time"
                          value={timeOfDay}
                          onChange={(e) => setTimeOfDay(e.target.value)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Query Text"
                          multiline
                          rows={2}
                          value={queryText}
                          onChange={(e) => setQueryText(e.target.value)}
                          placeholder="Enter your query here..."
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: '#656d76', mb: 1 }}>
                          Number of Requests: {numRequests}
                        </Typography>
                        <Slider
                          value={numRequests}
                          onChange={(_, value) => setNumRequests(value as number)}
                          min={1}
                          max={100}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 50, label: '50' },
                            { value: 100, label: '100' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>

          <DragOverlay>
            {activeId ? (
              <Chip
                label={getDragOverlayLabel(activeId)}
                sx={{
                  opacity: 0.8,
                  transform: 'rotate(5deg)',
                  backgroundColor: getDragOverlayColor(activeId),
                  color: activeId.startsWith('available-team-') ? 'white' : '#333',
                  fontWeight: 'bold',
                  maxWidth: 'none',
                  '& .MuiChip-label': {
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textOverflow: 'unset'
                  }
                }}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Paper>

      {/* Results */}
      {results.length > 0 && (
        <>
          <Typography variant="h5" sx={{ mb: 3, color: '#24292f', fontWeight: 600 }}>
            Simulation Results
          </Typography>
          
          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Typography sx={{ fontSize: '12px', color: '#656d76', textTransform: 'uppercase', fontWeight: 600 }}>
                    Total Simulated
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

          {/* Results Table */}
          <Paper sx={{ border: '1px solid #d1d9e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                      Time
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
                      Reason
                    </TableCell>
                    <TableCell sx={{ backgroundColor: '#f6f8fa', fontWeight: 600, fontSize: '12px', color: '#656d76', textTransform: 'uppercase', borderBottom: '1px solid #d1d9e0' }}>
                      Query
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result) => (
                    <TableRow 
                      key={result.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f6f8fa',
                        },
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '13px' }}>
                          {formatTimestamp(result.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                        <Chip
                          label={getTeamName(result.request.team)}
                          size="small"
                          sx={{
                            backgroundColor: getTeamColor(result.request.team),
                            color: 'white',
                            fontSize: '11px',
                            height: '20px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                        <Typography variant="body2" sx={{ color: '#24292f' }}>
                          {getModelName(result.request.model)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #d1d9e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {result.decision === 'accept' ? (
                            <CheckCircleIcon sx={{ color: '#3fb950', fontSize: 16, mr: 1 }} />
                          ) : (
                            <CancelIcon sx={{ color: '#da3633', fontSize: 16, mr: 1 }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: result.decision === 'accept' ? '#3fb950' : '#da3633',
                              fontWeight: 500,
                              textTransform: 'capitalize'
                            }}
                          >
                            {result.decision}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300, borderBottom: '1px solid #d1d9e0' }}>
                        <Typography variant="body2" sx={{ color: '#24292f' }}>
                          {result.reason}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, borderBottom: '1px solid #d1d9e0' }}>
                        <Typography variant="body2" noWrap sx={{ color: '#656d76' }}>
                          {result.request.queryText}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default RequestSimulator;