# Planning Guide

An automation tool for GitHub Spark that allows users to queue multiple prompts and send them sequentially with visual status tracking.

**Experience Qualities**: 
1. **Efficient** - Streamlined workflow for managing multiple prompts without manual intervention
2. **Transparent** - Clear visual feedback on what's happening with each prompt in real-time
3. **Controlled** - Easy to pause, resume, or manage the queue at any moment

**Complexity Level**: Light Application (multiple features with basic state)
This is a queue management system with basic CRUD operations and sequential processing logic, making it a straightforward application without complex data relationships.

## Essential Features

**Queue Management**
- Functionality: Add, edit, delete, and reorder prompts in a queue
- Purpose: Organize multiple prompts before execution
- Trigger: User clicks "Add Prompt" button or input field
- Progression: Click add → Enter prompt text → Prompt appears in queue list → Can drag to reorder or delete
- Success criteria: Prompts persist in queue, can be reordered via drag-and-drop, and deleted individually

**Prompt Execution**
- Functionality: Send queued prompts to Spark LLM sequentially
- Purpose: Automate sending multiple prompts without manual intervention
- Trigger: User clicks "Start Queue" button
- Progression: Click start → First prompt sends → Status updates to "Processing" → Response received → Next prompt sends automatically → Repeats until queue empty
- Success criteria: Prompts send one at a time, responses are received and displayed, queue progresses automatically

**Status Card**
- Functionality: Display current execution status at the top of the interface
- Purpose: Provide immediate visibility into what's happening
- Trigger: Automatically updates as queue processes
- Progression: Shows idle state → Displays current prompt being processed → Shows progress (X of Y) → Updates to completed or error states
- Success criteria: Always visible, updates in real-time, shows meaningful status information

**Response History**
- Functionality: Store and display responses from executed prompts
- Purpose: Review results of processed prompts
- Trigger: Automatically captures responses as they arrive
- Progression: Prompt completes → Response saved with timestamp → Displayed in history panel → Can be expanded to view full response
- Success criteria: All responses persisted, can be viewed individually, paired with original prompt

## Edge Case Handling

- **Empty Queue Start**: Disable start button and show helpful message when no prompts exist
- **API Errors**: Pause queue execution, display error message, allow retry or skip
- **Duplicate Prompts**: Allow duplicates but show visual indicator
- **Long Responses**: Truncate in list view with expand option for full content
- **Page Refresh**: Persist queue and history using KV storage
- **Queue Modification During Execution**: Allow adding new prompts but prevent deletion of currently processing prompt

## Design Direction

The design should feel like a mission control center - technical, efficient, and confidence-inspiring. Users should feel in command of an automated workflow with clear visibility into the process.

## Color Selection

A tech-forward palette with vibrant accents that communicate automation and progress.

- **Primary Color**: Deep blue `oklch(0.35 0.15 250)` - Represents technical sophistication and reliability
- **Secondary Colors**: Dark slate backgrounds `oklch(0.18 0.02 250)` for depth, lighter slate `oklch(0.25 0.02 250)` for elevated surfaces
- **Accent Color**: Electric cyan `oklch(0.75 0.15 200)` - Energetic color for active states and CTAs
- **Foreground/Background Pairings**: 
  - Background (Dark Slate oklch(0.18 0.02 250)): Light gray text (oklch(0.95 0.01 250)) - Ratio 13.2:1 ✓
  - Primary (Deep Blue oklch(0.35 0.15 250)): White text (oklch(0.98 0 0)) - Ratio 7.1:1 ✓
  - Accent (Electric Cyan oklch(0.75 0.15 200)): Dark slate text (oklch(0.18 0.02 250)) - Ratio 8.9:1 ✓
  - Card (Elevated Slate oklch(0.25 0.02 250)): Light gray text (oklch(0.95 0.01 250)) - Ratio 9.8:1 ✓

## Font Selection

Typography should convey precision and technical capability with excellent readability for code-like content.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold/32px/tight letter-spacing for technical aesthetic
  - H2 (Section Headers): Space Grotesk Semibold/20px/normal for clear hierarchy
  - Body (Prompts/Content): JetBrains Mono Regular/14px/relaxed for code-friendly readability
  - UI Labels: Space Grotesk Medium/13px/wide for interface elements
  - Status Text: JetBrains Mono Medium/12px/mono for technical precision

## Animations

Animations should emphasize workflow progression and system responsiveness - use motion to communicate state changes and guide attention to active processes.

- **Queue Processing**: Subtle pulse animation on active prompt card
- **Status Updates**: Smooth color transitions as status changes (idle → processing → complete)
- **Card Entry**: Gentle slide-up animation when new prompts are added
- **Progress Indicator**: Smooth fill animation showing queue completion percentage
- **Error States**: Attention-grabbing shake animation for failed prompts
- **Drag & Drop**: Smooth reordering with ghost element following cursor

## Component Selection

- **Components**: 
  - Card for status display and prompt items (with border glow for active state)
  - Input + Button for adding new prompts
  - ScrollArea for queue list and response history
  - Badge for status indicators (Processing/Complete/Error/Idle)
  - Button variants (default for secondary actions, accent background for primary CTA)
  - Separator to divide sections
  - Dialog for viewing full responses
  - Progress bar for queue completion
  
- **Customizations**: 
  - Custom drag-and-drop prompt cards with reorder handles
  - Status card with gradient border and glowing effect when processing
  - Collapsible response history items with syntax highlighting for responses
  
- **States**: 
  - Buttons: Hover state with brightness increase, active with scale down slightly, disabled with reduced opacity
  - Prompt cards: Default with subtle border, hover with elevated shadow, dragging with increased opacity and scale
  - Status card: Idle (muted), processing (pulsing accent border), complete (success green tint), error (destructive red tint)
  
- **Icon Selection**: 
  - Plus for add prompt
  - Play for start queue
  - Pause for pause execution
  - Trash for delete prompt
  - DotsSixVertical for drag handle
  - CheckCircle for completed
  - XCircle for errors
  - ArrowClockwise for retry
  
- **Spacing**: 
  - Container padding: p-6
  - Section gaps: gap-6
  - Card padding: p-4
  - Button padding: px-4 py-2
  - Tight groupings: gap-2
  - List items: gap-3
  
- **Mobile**: 
  - Stack status card and queue vertically
  - Reduce font sizes slightly (H1 to 24px, body to 13px)
  - Full-width buttons
  - Disable drag-and-drop, replace with up/down buttons for reordering
  - Hide response history by default, show via toggle button
  - Reduce padding to p-4 on containers
