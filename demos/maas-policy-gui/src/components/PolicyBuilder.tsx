import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Chip,
  Paper,
  Divider,
  Tooltip,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Policy,
  PolicyItem,
  RequestLimits,
  TimeRange,
} from '../types';
import { TEAMS, MODELS } from '../mockData';

// Helper component for draggable chips
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

// Helper component for sortable policy items
interface SortablePolicyItemProps {
  item: PolicyItem;
  onRemove: (itemId: string) => void;
  getDisplayName: (item: PolicyItem) => string;
  teamSectionApprove: boolean;
  modelSectionApprove: boolean;
}

const SortablePolicyItem: React.FC<SortablePolicyItemProps> = ({
  item,
  onRemove,
  getDisplayName,
  teamSectionApprove,
  modelSectionApprove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `policy-${item.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Separate drag handle from interactive elements
  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{ mb: 1 }}
    >
      <Card 
        variant="outlined"
        sx={{
          backgroundColor: item.type === 'team' 
            ? (teamSectionApprove ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)')
            : (modelSectionApprove ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'),
          borderColor: item.type === 'team' 
            ? (teamSectionApprove ? '#4caf50' : '#f44336')
            : (modelSectionApprove ? '#4caf50' : '#f44336'),
          borderWidth: 2
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Remove button - moved to left */}
            <Button
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id);
              }}
              sx={{ 
                minWidth: 'auto', 
                p: 0.5,
                fontSize: '16px',
                lineHeight: 1
              }}
            >
              ×
            </Button>
            
            {/* Drag handle */}
            <Box 
              {...attributes}
              {...listeners}
              sx={{ 
                cursor: 'grab', 
                padding: '4px',
                '&:active': { cursor: 'grabbing' },
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ⋮⋮
            </Box>
            
            {item.type === 'model' ? (
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {MODELS.find(m => m.id === item.value)?.name || item.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#90CAF9', mb: 1, display: 'block' }}>
                      Provider: {MODELS.find(m => m.id === item.value)?.provider || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                      {MODELS.find(m => m.id === item.value)?.description || 'No description available'}
                    </Typography>
                  </Box>
                }
                arrow
                placement="top"
                enterDelay={500}
                leaveDelay={200}
              >
                <Chip
                  label={getDisplayName(item)}
                  size="small"
                  sx={{ 
                    backgroundColor: '#e0e0e0',
                    color: '#333',
                    fontWeight: 'bold',
                    maxWidth: 'none', // Prevent truncation
                    '& .MuiChip-label': {
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      textOverflow: 'unset'
                    }
                  }}
                />
              </Tooltip>
            ) : (
              <Chip
                label={getDisplayName(item)}
                size="small"
                sx={{ 
                  backgroundColor: TEAMS.find(t => t.id === item.value)?.color || '#1976d2',
                  color: 'white',
                  fontWeight: 'bold',
                  maxWidth: 'none', // Prevent truncation
                  '& .MuiChip-label': {
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textOverflow: 'unset'
                  }
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

interface PolicyBuilderProps {
  policy: Policy | null;
  onSave: (policy: Policy) => void;
  onCancel: () => void;
}

const PolicyBuilder: React.FC<PolicyBuilderProps> = ({ policy, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [teamSectionApprove, setTeamSectionApprove] = useState(true);
  const [modelSectionApprove, setModelSectionApprove] = useState(true);
  const [requestLimits, setRequestLimits] = useState<RequestLimits>({
    tokenLimit: null,
    timePeriod: 'hour',
  });
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startTime: '09:00',
    endTime: '17:00',
    unlimited: false,
  });

  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description);
      setPolicyItems(policy.items);
      setRequestLimits(policy.requestLimits);
      setTimeRange(policy.timeRange);
      
      // Set section toggles based on existing items
      const teamItems = policy.items.filter(item => item.type === 'team');
      const modelItems = policy.items.filter(item => item.type === 'model');
      
      if (teamItems.length > 0) {
        setTeamSectionApprove(teamItems[0].isApprove);
      }
      if (modelItems.length > 0) {
        setModelSectionApprove(modelItems[0].isApprove);
      }
    }
  }, [policy]);

  const availableTeams = TEAMS.filter(team => 
    !policyItems.some(item => item.type === 'team' && item.value === team.id)
  );

  const availableModels = MODELS.filter(model => 
    !policyItems.some(item => item.type === 'model' && item.value === model.id)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Handle adding items from available to policy
    if (active.id.toString().startsWith('available-')) {
      const parts = active.id.toString().split('-');
      const type = parts[1]; // 'team' or 'model'
      const id = parts.slice(2).join('-'); // rejoin the rest to handle IDs with hyphens
      // Check if item already exists
      const exists = policyItems.some(item => 
        item.type === type && item.value === id
      );
      if (!exists) {
        const newItem: PolicyItem = {
          id: `item-${Date.now()}`,
          type: type as 'team' | 'model',
          value: id,
          isApprove: type === 'team' ? teamSectionApprove : modelSectionApprove,
        };
        setPolicyItems([...policyItems, newItem]);
      }
    }
    // Handle reordering within policy items
    else if (active.id !== over.id && over.id.toString().startsWith('policy-')) {
      const oldIndex = policyItems.findIndex(item => `policy-${item.id}` === active.id);
      const newIndex = policyItems.findIndex(item => `policy-${item.id}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setPolicyItems(arrayMove(policyItems, oldIndex, newIndex));
      }
    }
  };

  const removeItem = (itemId: string) => {
    setPolicyItems(policyItems.filter(item => item.id !== itemId));
  };

  const toggleTeamSection = () => {
    const newApprove = !teamSectionApprove;
    setTeamSectionApprove(newApprove);
    // Update all team items
    setPolicyItems(policyItems.map(item => 
      item.type === 'team' ? { ...item, isApprove: newApprove } : item
    ));
  };

  const toggleModelSection = () => {
    const newApprove = !modelSectionApprove;
    setModelSectionApprove(newApprove);
    // Update all model items
    setPolicyItems(policyItems.map(item => 
      item.type === 'model' ? { ...item, isApprove: newApprove } : item
    ));
  };

  const handleSave = () => {
    const newPolicy: Policy = {
      id: policy?.id || '',
      name,
      description,
      items: policyItems,
      requestLimits,
      timeRange,
      created: policy?.created || new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    onSave(newPolicy);
  };

  const getItemDisplayName = (item: PolicyItem) => {
    if (item.type === 'team') {
      return TEAMS.find(t => t.id === item.value)?.name || item.value;
    }
    return MODELS.find(m => m.id === item.value)?.name || item.value;
  };

  const getDragOverlayLabel = (activeId: string) => {
    if (activeId.startsWith('available-')) {
      const parts = activeId.split('-');
      const type = parts[1]; // 'team' or 'model'
      const id = parts.slice(2).join('-'); // rejoin the rest to handle IDs with hyphens
      
      if (type === 'team') {
        return TEAMS.find(t => t.id === id)?.name || id;
      }
      return MODELS.find(m => m.id === id)?.name || id;
    }
    return 'Item';
  };

  const getDragOverlayColor = (activeId: string) => {
    if (activeId.startsWith('available-team-')) {
      const parts = activeId.split('-');
      const id = parts.slice(2).join('-'); // rejoin the rest to handle IDs with hyphens
      return TEAMS.find(t => t.id === id)?.color;
    } else if (activeId.startsWith('available-model-')) {
      return '#e0e0e0'; // Default model color
    }
    return undefined;
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Policy Evaluation Flow Info */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📋 Policy Evaluation Flow
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ 
                backgroundColor: '#1976d2', 
                color: 'white', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px' 
              }}>1</span>
              <Typography variant="body2">
                <strong>Check Team Rules</strong><br />
                Evaluate team-based policies first
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ 
                backgroundColor: '#1976d2', 
                color: 'white', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px' 
              }}>2</span>
              <Typography variant="body2">
                <strong>Check Model Rules</strong><br />
                Then evaluate model-specific policies
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ 
                backgroundColor: '#1976d2', 
                color: 'white', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px' 
              }}>3</span>
              <Typography variant="body2">
                <strong>Check Token Limits</strong><br />
                Verify token usage constraints
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ 
                backgroundColor: '#1976d2', 
                color: 'white', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px' 
              }}>4</span>
              <Typography variant="body2">
                <strong>Check Time Range</strong><br />
                Validate access time constraints
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ 
                backgroundColor: '#1976d2', 
                color: 'white', 
                borderRadius: '50%', 
                width: '24px', 
                height: '24px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '14px' 
              }}>5</span>
              <Typography variant="body2">
                <strong>Apply Decision</strong><br />
                Reject rules override approve rules
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Policy Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
        </Grid>
      </Grid>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Available Items
            </Typography>
            <Paper
              sx={{ p: 2, minHeight: 200, backgroundColor: '#f5f5f5' }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Teams
              </Typography>
              {availableTeams.map((team) => (
                <DraggableChip
                  key={`available-team-${team.id}`}
                  id={`available-team-${team.id}`}
                  label={team.name}
                  color={team.color}
                />
              ))}
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Models
              </Typography>
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
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Policy Rules
            </Typography>
            <Paper
              sx={{ p: 2, minHeight: 200, backgroundColor: 'rgba(33, 150, 243, 0.08)' }}
            >
              {policyItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Drag items here to build your policy
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    Teams will be checked first, then Models
                  </Typography>
                </Typography>
              ) : (
                <Box>
                  {/* Teams Section */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, backgroundColor: 'rgba(158, 158, 158, 0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 'bold', 
                        color: '#1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <span style={{ 
                          backgroundColor: '#4caf50', 
                          color: 'white', 
                          borderRadius: '50%', 
                          width: '20px', 
                          height: '20px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '12px',
                          pointerEvents: 'none'
                        }}>1</span>
                        Team Rules (Checked First)
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
                          {policyItems.filter(item => item.type === 'team').length} rule(s)
                        </Typography>
                        {policyItems.filter(item => item.type === 'team').length > 0 && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={teamSectionApprove}
                                onChange={toggleTeamSection}
                                size="small"
                                color="success"
                              />
                            }
                            label={teamSectionApprove ? 'Approve All' : 'Reject All'}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2
                    }}>
                      {policyItems.filter(item => item.type === 'team').length === 0 ? (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderStyle: 'dashed',
                            borderColor: '#4caf50'
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Drop team rules here
                            <br />
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              Use the section toggle to approve/reject all teams
                            </Typography>
                          </Typography>
                        </Paper>
                      ) : (
                        <SortableContext
                          items={policyItems.filter(item => item.type === 'team').map(item => `policy-${item.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {policyItems
                            .filter(item => item.type === 'team')
                            .map((item) => (
                              <SortablePolicyItem
                                key={item.id}
                                item={item}
                                onRemove={removeItem}
                                getDisplayName={getItemDisplayName}
                                teamSectionApprove={teamSectionApprove}
                                modelSectionApprove={modelSectionApprove}
                              />
                          ))}
                        </SortableContext>
                      )}
                    </Box>
                  </Box>

                  {/* Flow Arrow */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Typography variant="h6" sx={{ color: '#666', transform: 'rotate(90deg)' }}>
                      ⤵
                    </Typography>
                  </Box>

                  {/* Models Section */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, backgroundColor: 'rgba(158, 158, 158, 0.1)', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontWeight: 'bold', 
                        color: '#1976d2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <span style={{ 
                          backgroundColor: '#2196f3', 
                          color: 'white', 
                          borderRadius: '50%', 
                          width: '20px', 
                          height: '20px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '12px',
                          pointerEvents: 'none'
                        }}>2</span>
                        Model Rules (Checked Second)
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                        <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
                          {policyItems.filter(item => item.type === 'model').length} rule(s)
                        </Typography>
                        {policyItems.filter(item => item.type === 'model').length > 0 && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={modelSectionApprove}
                                onChange={toggleModelSection}
                                size="small"
                                color="primary"
                              />
                            }
                            label={modelSectionApprove ? 'Approve All' : 'Reject All'}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      p: 2
                    }}>
                      {policyItems.filter(item => item.type === 'model').length === 0 ? (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            borderStyle: 'dashed',
                            borderColor: '#4caf50'
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Drop model rules here
                            <br />
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              Use the section toggle to approve/reject all models
                            </Typography>
                          </Typography>
                        </Paper>
                      ) : (
                        <SortableContext
                          items={policyItems.filter(item => item.type === 'model').map(item => `policy-${item.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {policyItems
                            .filter(item => item.type === 'model')
                            .map((item) => (
                              <SortablePolicyItem
                                key={item.id}
                                item={item}
                                onRemove={removeItem}
                                getDisplayName={getItemDisplayName}
                                teamSectionApprove={teamSectionApprove}
                                modelSectionApprove={modelSectionApprove}
                              />
                          ))}
                        </SortableContext>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
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

      <Divider sx={{ my: 3 }} />



      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Token Limits
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Token Limit"
                type="number"
                value={requestLimits.tokenLimit || ''}
                onChange={(e) => setRequestLimits({
                  ...requestLimits,
                  tokenLimit: e.target.value ? parseInt(e.target.value) : null
                })}
                helperText="Leave empty for unlimited"
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel id="time-period-label">Per</InputLabel>
                <Select
                  labelId="time-period-label"
                  value={requestLimits.timePeriod}
                  label="Per"
                  onChange={(e) => setRequestLimits({
                    ...requestLimits,
                    timePeriod: e.target.value as 'hour' | 'day' | 'week' | 'month'
                  })}
                >
                  <MenuItem value="hour">Hour</MenuItem>
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Time Range
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={timeRange.unlimited}
                onChange={(e) => setTimeRange({
                  ...timeRange,
                  unlimited: e.target.checked
                })}
              />
            }
            label="24/7 Access"
          />
          {!timeRange.unlimited && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  value={timeRange.startTime}
                  onChange={(e) => setTimeRange({
                    ...timeRange,
                    startTime: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="time"
                  value={timeRange.endTime}
                  onChange={(e) => setTimeRange({
                    ...timeRange,
                    endTime: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Current Policy Description */}
      {policyItems.length > 0 && (
        <Box sx={{ 
          mt: 3, 
          p: 3, 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
          borderRadius: 2, 
          border: '2px solid #dee2e6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            {(() => {
              const teams = policyItems.filter(item => item.type === 'team').map(item => getItemDisplayName(item));
              const models = policyItems.filter(item => item.type === 'model').map(item => getItemDisplayName(item));
              
              return (
                <Box component="span">
                  <Box component="span" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.1em' }}>
                    📋 Policy Summary:{' '}
                  </Box>
                  
                  {/* Team part */}
                  {teams.length > 0 && (
                    <Box component="span">
                      <Box component="span" sx={{ 
                        color: teamSectionApprove ? '#2e7d32' : '#d32f2f', 
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        fontSize: '0.9em',
                        letterSpacing: '0.5px'
                      }}>
                        {teamSectionApprove ? '✅ APPROVE' : '❌ REJECT'}
                      </Box>
                      {' '}
                      <Box component="span" sx={{ color: '#6c757d', fontWeight: 'medium' }}>
                        teams{' '}
                      </Box>
                      <Box component="span" sx={{ display: 'inline-flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        👥{' '}
                        {teams.map((teamName) => {
                          const team = TEAMS.find(t => t.name === teamName);
                          return (
                            <Chip
                              key={teamName}
                              label={teamName}
                              size="small"
                              sx={{
                                backgroundColor: team?.color || '#e0e0e0',
                                color: 'white',
                                fontWeight: 'bold',
                                maxWidth: 'none',
                                '& .MuiChip-label': {
                                  whiteSpace: 'nowrap',
                                  overflow: 'visible',
                                  textOverflow: 'unset'
                                }
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Model part */}
                  {models.length > 0 && (
                    <Box component="span">
                      {teams.length > 0 ? (
                        <Box component="span" sx={{ color: '#6c757d', mx: 1 }}>
                          to access
                        </Box>
                      ) : (
                        <Box component="span">
                          <Box component="span" sx={{ 
                            color: modelSectionApprove ? '#2e7d32' : '#d32f2f', 
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            fontSize: '0.9em',
                            letterSpacing: '0.5px'
                          }}>
                            {modelSectionApprove ? '✅ APPROVE' : '❌ REJECT'}
                          </Box>
                          {' '}
                        </Box>
                      )}
                      <Box component="span" sx={{ color: '#6c757d', fontWeight: 'medium' }}>
                        model{models.length > 1 ? 's' : ''}{' '}
                      </Box>
                      <Box component="span" sx={{ display: 'inline-flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        🤖{' '}
                        {models.map((modelName) => (
                          <Chip
                            key={modelName}
                            label={modelName}
                            size="small"
                            sx={{
                              backgroundColor: '#e0e0e0',
                              color: '#333',
                              fontWeight: 'bold',
                              maxWidth: 'none',
                              '& .MuiChip-label': {
                                whiteSpace: 'nowrap',
                                overflow: 'visible',
                                textOverflow: 'unset'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {/* Token limits */}
                  <Box component="span" sx={{ color: '#6c757d', mx: 1 }}>
                    with
                  </Box>
                  <Box component="span" sx={{ 
                    fontWeight: 'bold', 
                    color: requestLimits.tokenLimit ? '#f57c00' : '#388e3c',
                    backgroundColor: requestLimits.tokenLimit ? 'rgba(245, 124, 0, 0.1)' : 'rgba(56, 142, 60, 0.1)',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.95em'
                  }}>
                    {requestLimits.tokenLimit ? (
                      <>🔢 {requestLimits.tokenLimit.toLocaleString()} tokens per {requestLimits.timePeriod}</>
                    ) : (
                      <>♾️ unlimited tokens</>
                    )}
                  </Box>
                  
                  {/* Time range */}
                  <Box component="span" sx={{ color: '#6c757d', mx: 1 }}>
                    during
                  </Box>
                  <Box component="span" sx={{ 
                    fontWeight: 'bold', 
                    color: timeRange.unlimited ? '#388e3c' : '#1976d2',
                    backgroundColor: timeRange.unlimited ? 'rgba(56, 142, 60, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.95em'
                  }}>
                    {timeRange.unlimited ? (
                      <>🌍 any time</>
                    ) : (
                      <>🕐 {timeRange.startTime}-{timeRange.endTime}</>
                    )}
                  </Box>
                  
                  <Box component="span" sx={{ color: '#6c757d', fontSize: '1.1em' }}>
                    .
                  </Box>
                </Box>
              );
            })()}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim() || policyItems.length === 0}
        >
          Save Policy
        </Button>
      </Box>
    </Box>
  );
};

export default PolicyBuilder;