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
import { 
  Plus, 
  Play, 
  Pause, 
  Trash, 
  DotsSixVertical, 
  CheckCircle, 
  XCircle, 
  ArrowClockwise 
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

function App() {
  const [queue, setQueue] = useKV<QueuedPrompt[]>('prompt-queue', [])
  const [history, setHistory] = useKV<PromptResponse[]>('prompt-history', [])
  const [newPrompt, setNewPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [selectedResponse, setSelectedResponse] = useState<PromptResponse | null>(null)

  const currentPrompt = queue?.find(p => p.id === currentPromptId)
  const completedCount = queue?.filter(p => p.status === 'completed').length || 0
  const totalCount = queue?.length || 0

  const addPrompt = () => {
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
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={addPrompt}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    <Plus weight="bold" />
                  </Button>
                </div>
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
      </div>
    </>
  )
}

export default App
