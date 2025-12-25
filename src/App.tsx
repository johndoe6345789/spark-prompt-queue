import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Toaster } from '@/components/ui/sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Play, 
  Pause, 
  Trash, 
  DotsSixVertical, 
  CheckCircle, 
  XCircle, 
  ArrowClockwise,
  Folder,
  FolderOpen,
  CloudArrowDown,
  Spinner,
  Gear,
  Cookie
} from '@phosphor-icons/react'
import { toast } from 'sonner'

type PromptStatus = 'idle' | 'processing' | 'completed' | 'error'

type QueuedPrompt = {
  id: string
  text: string
  status: PromptStatus
  addedAt: number
}

type PromptResponse = {
  id: string
  promptId: string
  promptText: string
  response: string
  timestamp: number
  success: boolean
}

type SparkProject = {
  id: string
  name: string
  description?: string
}

const DEFAULT_HEADERS = {
  "accept": "application/json",
  "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
  "content-type": "application/json",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"macOS\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin"
}

function App() {
  const [queue, setQueue] = useKV<QueuedPrompt[]>('prompt-queue', [])
  const [history, setHistory] = useKV<PromptResponse[]>('prompt-history', [])
  const [projects, setProjects] = useKV<SparkProject[]>('spark-projects', [])
  const [selectedProjectId, setSelectedProjectId] = useKV<string | null>('selected-project-id', null)
  const [customHeaders, setCustomHeaders] = useKV<Record<string, string>>('workbench-headers', DEFAULT_HEADERS)
  const [includeCookies, setIncludeCookies] = useKV<boolean>('include-cookies', true)
  const [newPrompt, setNewPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<PromptResponse | null>(null)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showOptionsDialog, setShowOptionsDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [isFetchingWorkbench, setIsFetchingWorkbench] = useState(false)
  const [headersText, setHeadersText] = useState('')

  const currentPrompt = queue?.find(p => p.id === currentPromptId)
  const completedCount = queue?.filter(p => p.status === 'completed').length || 0
  const totalCount = queue?.length || 0
  const selectedProject = projects?.find(p => p.id === selectedProjectId)

  useEffect(() => {
    if (showOptionsDialog) {
      setHeadersText(JSON.stringify(customHeaders || DEFAULT_HEADERS, null, 2))
    }
  }, [showOptionsDialog, customHeaders])

  const saveHeaders = () => {
    try {
      const parsed = JSON.parse(headersText)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        toast.error('Headers must be a JSON object')
        return
      }
      setCustomHeaders(parsed)
      setShowOptionsDialog(false)
      toast.success('Headers configuration saved')
    } catch (error) {
      toast.error('Invalid JSON format')
    }
  }

  const resetHeaders = () => {
    setHeadersText(JSON.stringify(DEFAULT_HEADERS, null, 2))
    toast.info('Reset to default headers')
  }

  const fetchWorkbenchData = async () => {
    setIsFetchingWorkbench(true)
    try {
      const user = await window.spark.user()
      const headers = customHeaders || DEFAULT_HEADERS
      
      const response = await fetch('https://github.com/copilot/spark/workbench', {
        headers: {
          ...headers,
          'Accept': 'application/json',
        },
        credentials: includeCookies ? 'include' : 'omit'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch workbench: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.sparks && Array.isArray(data.sparks)) {
        const fetchedProjects: SparkProject[] = data.sparks.map((spark: any) => ({
          id: spark.id || `spark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: spark.name || spark.title || 'Untitled Spark',
          description: spark.description || spark.summary || undefined
        }))

        if (fetchedProjects.length > 0) {
          setProjects(current => {
            const existingIds = new Set((current || []).map(p => p.id))
            const newProjects = fetchedProjects.filter(p => !existingIds.has(p.id))
            return [...(current || []), ...newProjects]
          })
          toast.success(`Loaded ${fetchedProjects.length} projects from workbench`)
        } else {
          toast.info('No projects found in workbench')
        }
      } else {
        toast.info('Workbench data structure not as expected')
      }
    } catch (error) {
      console.error('Error fetching workbench:', error)
      toast.error(`Failed to fetch workbench data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsFetchingWorkbench(false)
    }
  }

  const addProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    const project: SparkProject = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined
    }

    setProjects(current => [...(current || []), project])
    setSelectedProjectId(project.id)
    setNewProjectName('')
    setNewProjectDescription('')
    setShowProjectDialog(false)
    toast.success('Project created and selected')
  }

  const deleteProject = (id: string) => {
    setProjects(current => (current || []).filter(p => p.id !== id))
    if (selectedProjectId === id) {
      setSelectedProjectId(null)
    }
    toast.success('Project deleted')
  }

  const addPrompt = () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first')
      return
    }
    
    if (!newPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    const prompt: QueuedPrompt = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newPrompt.trim(),
      status: 'idle',
      addedAt: Date.now()
    }

    setQueue(current => [...(current || []), prompt])
    setNewPrompt('')
    toast.success('Prompt added to queue')
  }

  const deletePrompt = (id: string) => {
    if (id === currentPromptId) {
      toast.error('Cannot delete prompt currently being processed')
      return
    }
    setQueue(current => (current || []).filter(p => p.id !== id))
    toast.success('Prompt removed from queue')
  }

  const processQueue = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first')
      return
    }
    
    if (!queue) return
    
    const pendingPrompts = queue.filter(p => p.status === 'idle' || p.status === 'error')
    
    if (pendingPrompts.length === 0) {
      toast.info('No prompts to process')
      return
    }

    setIsProcessing(true)

    for (const prompt of pendingPrompts) {
      if (!isProcessing) break

      setCurrentPromptId(prompt.id)
      setQueue(current => 
        (current || []).map(p => p.id === prompt.id ? { ...p, status: 'processing' as PromptStatus } : p)
      )

      try {
        const promptText = prompt.text
        const response = await window.spark.llm(promptText, 'gpt-4o-mini')

        const responseRecord: PromptResponse = {
          id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          promptId: prompt.id,
          promptText: prompt.text,
          response,
          timestamp: Date.now(),
          success: true
        }

        setHistory(current => [responseRecord, ...(current || [])])
        setQueue(current =>
          (current || []).map(p => p.id === prompt.id ? { ...p, status: 'completed' as PromptStatus } : p)
        )
        
        toast.success('Prompt processed successfully')
      } catch (error) {
        const errorResponse: PromptResponse = {
          id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          promptId: prompt.id,
          promptText: prompt.text,
          response: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: Date.now(),
          success: false
        }

        setHistory(current => [errorResponse, ...(current || [])])
        setQueue(current =>
          (current || []).map(p => p.id === prompt.id ? { ...p, status: 'error' as PromptStatus } : p)
        )
        
        toast.error('Failed to process prompt')
        break
      }
    }

    setCurrentPromptId(null)
    setIsProcessing(false)
    toast.success('Queue processing complete')
  }

  const pauseQueue = () => {
    setIsProcessing(false)
    toast.info('Queue paused')
  }

  const clearCompleted = () => {
    setQueue(current => (current || []).filter(p => p.status !== 'completed'))
    toast.success('Completed prompts cleared')
  }

  const retryPrompt = (id: string) => {
    setQueue(current =>
      (current || []).map(p => p.id === id ? { ...p, status: 'idle' as PromptStatus } : p)
    )
    toast.info('Prompt reset to idle')
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index || !queue) return

    setQueue(current => {
      if (!current) return []
      const newQueue = [...current]
      const draggedItem = newQueue[draggedIndex]
      newQueue.splice(draggedIndex, 1)
      newQueue.splice(index, 0, draggedItem)
      return newQueue
    })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const getStatusColor = (status: PromptStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-600/20 text-green-400 border-green-600/30'
      case 'processing': return 'bg-accent/20 text-accent border-accent/30'
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Spark Prompt Queue
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide uppercase">
            Automated Prompt Execution System
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">Project Selection</CardTitle>
                <CardDescription className="text-xs font-mono">
                  Choose or create a Spark project
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowOptionsDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  <Gear weight="bold" className="mr-2" />
                  Options
                </Button>
                <Button 
                  onClick={fetchWorkbenchData}
                  variant="outline"
                  size="sm"
                  disabled={isFetchingWorkbench}
                >
                  {isFetchingWorkbench ? (
                    <>
                      <Spinner weight="bold" className="mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CloudArrowDown weight="bold" className="mr-2" />
                      Load from Workbench
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setShowProjectDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  <Plus weight="bold" className="mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(projects?.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                <Folder size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No projects yet</p>
                <p className="text-xs mt-1">Create a project to get started</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Select value={selectedProjectId || undefined} onValueChange={(value) => setSelectedProjectId(value)}>
                  <SelectTrigger className="flex-1 font-mono">
                    <SelectValue placeholder="Select a project">
                      {selectedProject && (
                        <div className="flex items-center gap-2">
                          <FolderOpen size={16} className="text-accent" />
                          <span>{selectedProject.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="font-mono">
                        <div className="flex items-center gap-2">
                          <Folder size={16} className="text-muted-foreground" />
                          <div>
                            <div>{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground">{project.description}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedProjectId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (selectedProjectId) {
                        deleteProject(selectedProjectId)
                      }
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/20 shrink-0"
                  >
                    <Trash size={16} />
                  </Button>
                )}
              </div>
            )}
            
            {selectedProject?.description && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md font-mono">
                {selectedProject.description}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`border-2 transition-all duration-300 ${
          isProcessing ? 'border-accent animate-pulse-border' : 'border-border'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl">Status Monitor</CardTitle>
                <CardDescription className="text-xs font-mono">
                  {isProcessing ? 'ACTIVE' : 'IDLE'}
                </CardDescription>
              </div>
              <Badge 
                variant="outline" 
                className={`px-3 py-1 text-sm ${
                  isProcessing 
                    ? 'bg-accent/20 text-accent border-accent/30' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {completedCount} / {totalCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPrompt && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground tracking-wide uppercase">
                  Current Prompt
                </p>
                <p className="text-sm bg-muted p-3 rounded-md font-mono">
                  {currentPrompt.text}
                </p>
              </div>
            )}
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex gap-2 flex-wrap">
              {!isProcessing ? (
                <Button 
                  onClick={processQueue}
                  disabled={(queue?.filter(p => p.status === 'idle' || p.status === 'error').length || 0) === 0}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Play weight="fill" className="mr-2" />
                  Start Queue
                </Button>
              ) : (
                <Button 
                  onClick={pauseQueue}
                  variant="destructive"
                >
                  <Pause weight="fill" className="mr-2" />
                  Pause
                </Button>
              )}
              <Button 
                onClick={clearCompleted}
                variant="outline"
                disabled={completedCount === 0}
              >
                Clear Completed
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    id="new-prompt"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPrompt()}
                    placeholder="Enter your prompt..."
                    className="font-mono text-sm"
                    disabled={isProcessing || !selectedProjectId}
                  />
                  <Button 
                    onClick={addPrompt}
                    disabled={isProcessing || !selectedProjectId}
                    className="shrink-0"
                  >
                    <Plus weight="bold" />
                  </Button>
                </div>
                {!selectedProjectId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Select a project first
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Queue ({queue?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {(queue?.length || 0) === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No prompts in queue</p>
                      <p className="text-xs mt-1">Add a prompt to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queue?.map((prompt, index) => (
                        <div
                          key={prompt.id}
                          draggable={!isProcessing}
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`group bg-card border border-border rounded-lg p-3 transition-all ${
                            prompt.id === currentPromptId ? 'ring-2 ring-accent' : ''
                          } ${
                            prompt.status === 'error' ? 'animate-shake' : ''
                          } ${
                            draggedIndex === index ? 'opacity-50' : ''
                          } ${
                            !isProcessing ? 'hover:border-accent cursor-move' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!isProcessing && (
                              <div className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                <DotsSixVertical size={18} />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getStatusColor(prompt.status)}`}
                                >
                                  {prompt.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(prompt.addedAt)}
                                </span>
                              </div>
                              <p className="text-sm font-mono break-words">
                                {prompt.text}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              {prompt.status === 'error' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => retryPrompt(prompt.id)}
                                  disabled={isProcessing}
                                  className="h-8 w-8"
                                >
                                  <ArrowClockwise size={16} />
                                </Button>
                              )}
                              {prompt.status === 'completed' && (
                                <CheckCircle 
                                  size={20} 
                                  weight="fill" 
                                  className="text-green-400"
                                />
                              )}
                              {prompt.status === 'error' && (
                                <XCircle 
                                  size={20} 
                                  weight="fill" 
                                  className="text-destructive"
                                />
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deletePrompt(prompt.id)}
                                disabled={prompt.id === currentPromptId}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
                              >
                                <Trash size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Response History ({history?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[632px] pr-4">
                {(history?.length || 0) === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No responses yet</p>
                    <p className="text-xs mt-1">Process prompts to see responses</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history?.map((response) => (
                      <div
                        key={response.id}
                        onClick={() => setSelectedResponse(response)}
                        className="bg-card border border-border rounded-lg p-3 hover:border-accent transition-all cursor-pointer"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {response.success ? (
                              <CheckCircle size={16} weight="fill" className="text-green-400" />
                            ) : (
                              <XCircle size={16} weight="fill" className="text-destructive" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(response.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-xs font-mono text-muted-foreground line-clamp-1">
                            {response.promptText}
                          </p>
                          
                          <Separator />
                          
                          <p className="text-sm font-mono line-clamp-3">
                            {response.response}
                          </p>
                          
                          <p className="text-xs text-accent">
                            Click to view full response →
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">Response Details</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedResponse && formatDate(selectedResponse.timestamp)}
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 tracking-wide uppercase">
                  Prompt
                </p>
                <p className="text-sm font-mono bg-muted p-3 rounded-md">
                  {selectedResponse.promptText}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground mb-2 tracking-wide uppercase">
                  Response
                </p>
                <ScrollArea className="h-[300px]">
                  <p className="text-sm font-mono bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {selectedResponse.response}
                  </p>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">Create New Project</DialogTitle>
            <DialogDescription className="text-xs">
              Add a new Spark project to organize your prompts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="project-name" className="text-xs text-muted-foreground tracking-wide uppercase">
                Project Name
              </label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    addProject()
                  }
                }}
                placeholder="My Spark Project"
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="project-description" className="text-xs text-muted-foreground tracking-wide uppercase">
                Description (Optional)
              </label>
              <Input
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="A brief description..."
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProjectDialog(false)
                  setNewProjectName('')
                  setNewProjectDescription('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={addProject}
                disabled={!newProjectName.trim()}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus weight="bold" className="mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">Workbench Configuration</DialogTitle>
            <DialogDescription className="text-xs">
              Configure HTTP headers and request options for workbench API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Checkbox
                id="include-cookies"
                checked={includeCookies}
                onCheckedChange={(checked) => setIncludeCookies(checked === true)}
              />
              <div className="flex items-center gap-2 flex-1">
                <Cookie size={18} className="text-accent" />
                <div className="flex-1">
                  <label 
                    htmlFor="include-cookies" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Include Cookies
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Send cookies with workbench fetch requests (credentials: include)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="headers-json" className="text-xs text-muted-foreground tracking-wide uppercase">
                Headers (JSON Format)
              </label>
              <Textarea
                id="headers-json"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                placeholder='{"accept": "application/json"}'
                className="font-mono text-xs h-[350px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Enter headers as a JSON object. Sensitive headers are automatically filtered for security.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={resetHeaders}
              >
                <ArrowClockwise weight="bold" className="mr-2" />
                Reset to Default
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowOptionsDialog(false)
                  setHeadersText(JSON.stringify(customHeaders || DEFAULT_HEADERS, null, 2))
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveHeaders}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <CheckCircle weight="bold" className="mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}

export default App
