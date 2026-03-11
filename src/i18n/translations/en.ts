export const en = {
  // Toolbar
  toolbar: {
    select: 'Select',
    razor: 'Razor',
    text: 'Text',
    snap: 'Snap',
    snapOn: 'Snap On',
    snapOff: 'Snap Off',
    export: 'Export',
    goToStart: 'Go to start',
    goToEnd: 'Go to end',
    play: 'Play (Space)',
    pause: 'Pause (Space)',
    undo: 'Undo (Cmd+Z)',
    redo: 'Redo (Cmd+Shift+Z)',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    help: 'Help (?)',
    projects: 'Projects (Cmd+O)',
  },

  // App tabs
  tabs: {
    media: 'media',
    transcript: 'transcript',
    settings: 'settings',
  },

  // Media Bin
  mediaBin: {
    title: 'Media',
    import: 'Import',
    dropFiles: 'Drop media files here',
    orClickImport: 'or click Import',
  },

  // Viewer
  viewer: {
    title: 'Program',
    noClip: 'No clip at playhead',
    importMedia: 'Import media and add to the timeline',
  },

  // Timeline
  timeline: {
    title: 'Timeline',
    video: 'Video',
    audio: 'Audio',
    text: 'Text',
  },

  // Track
  track: {
    mute: 'Mute',
    unmute: 'Unmute',
    lock: 'Lock',
    unlock: 'Unlock',
  },

  // Clip
  clip: {
    dragFadeIn: 'Drag to set fade in',
    dragFadeOut: 'Drag to set fade out',
    relink: 'Re-link',
    relinkTitle: 'Click to re-link media file',
    enterText: 'Enter text:',
  },

  // Context Menu
  contextMenu: {
    extractAudio: 'Extract Audio',
    unlink: 'Unlink',
    speed: 'Speed',
    fitMode: 'Fit Mode',
    scale: 'Scale',
    animation: 'Animation',
    fadeIn: 'Fade In',
    fadeOut: 'Fade Out',
    transitionIn: 'Transition In',
    transitionOut: 'Transition Out',
    volume: 'Volume',
    deleteClip: 'Delete Clip',
    none: 'None',
    normal: '1x (Normal)',
    fitLetterbox: 'Fit (Letterbox)',
    fillCrop: 'Fill (Crop)',
    stretch: 'Stretch',
    // Animation presets
    animNone: 'None',
    animFadeIn: 'Fade In',
    animFadeOut: 'Fade Out',
    animFadeInOut: 'Fade In/Out',
    animSlideLeft: 'Slide Left',
    animSlideRight: 'Slide Right',
    animSlideUp: 'Slide Up',
    animSlideDown: 'Slide Down',
    animZoomIn: 'Zoom In',
    animZoomOut: 'Zoom Out',
    animKenBurns: 'Ken Burns',
    // Transitions
    crossDissolve: 'Cross Dissolve',
    fadeToBlack: 'Fade to Black',
    fadeFromBlack: 'Fade from Black',
  },

  // Export
  export: {
    title: 'Export Video',
    format: 'Format',
    quality: 'Quality',
    resolution: 'Resolution',
    includeAudio: 'Include audio',
    burnCaptions: 'Burn captions into video',
    exporting: 'Exporting...',
    exportBtn: 'Export',
    cancel: 'Cancel',
    exportFailed: 'Export failed. Check the browser console for details.',
  },

  // Settings
  settings: {
    title: 'Settings',
    aspectRatio: 'Aspect Ratio',
    deepgramKey: 'Deepgram API Key',
    keyPlaceholder: 'Enter API key for transcription...',
    keySet: 'Key set - real transcription enabled',
    noKey: 'No key - using demo transcript',
    captionStyle: 'Caption Style',
    position: 'Position',
    fontSize: 'Font Size',
    top: 'top',
    center: 'center',
    bottom: 'bottom',
    // Aspect ratio descriptions
    landscape: 'YouTube / Landscape',
    reels: 'Reels / TikTok / Shorts',
    instagram: 'Instagram Feed',
    instagramFb: 'Instagram / Facebook',
    // Caption presets
    default: 'Default',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    minimal: 'Minimal',
  },

  // Transcript
  transcript: {
    title: 'Transcript',
    selectMedia: 'Select media to transcribe...',
    transcribed: '(transcribed)',
    transcribe: 'Transcribe',
    transcribing: 'Transcribing...',
    delete: 'Delete',
    replaceWithGap: 'Replace with gap',
    ignore: 'Ignore',
    transcriptOnly: 'Transcript only',
    fillers: 'Fillers',
    fillersTooltip: 'Remove filler words (um, uh, etc.)',
    detectScenes: 'Detect Scenes',
    detectScenesTooltip: 'Detect scenes from transcript',
    scenes: 'Scenes',
    speaker: 'Speaker',
    importToStart: 'Import media to get started',
    selectAndTranscribe: 'Select media and transcribe',
  },

  // Auth
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Sign in',
  },

  // Projects
  projects: {
    title: 'Projects',
    savedLocally: 'Saved locally in this browser',
    new: 'New',
    rename: 'Rename',
    delete: 'Delete',
    signInToSave: 'Sign in to save and manage projects across sessions.',
    loadingProjects: 'Loading projects...',
    noProjects: 'No projects yet. Click "New" to create one.',
    autoSaveHint: 'Your current session auto-saves every few seconds.',
  },

  // Help Overlay
  help: {
    title: 'CUTLASS — Help',
    basics: 'Basics',
    advanced: 'Advanced',
    quickStart: 'Quick Start',
    keyboardShortcuts: 'Keyboard Shortcuts',
    updates: 'Updates',
    closeHint: 'Press ? or Esc to close',

    // Quick Start steps
    steps: [
      { title: 'Import media', desc: 'Drag video or audio files into the Media panel, or click Import.' },
      { title: 'Build your timeline', desc: 'Drag clips from the Media panel onto timeline tracks.' },
      { title: 'Cut and arrange', desc: 'Use the Razor tool (C) to cut clips. Select tool (V) to move them. Snap (S) aligns clips to edges.' },
      { title: 'Fine-tune audio & video', desc: 'Right-click clips for volume, fades, speed, transitions, animations, and more.' },
      { title: 'Transcribe & caption', desc: 'Open the Transcript tab to auto-transcribe and generate captions.' },
      { title: 'Export', desc: 'Click Export to render your video as MP4 or WebM at 720p, 1080p, or 4K.' },
    ],

    // Keyboard shortcut sections
    shortcutSections: [
      {
        title: 'Playback',
        shortcuts: [
          { keys: 'Space', desc: 'Play / Pause' },
          { keys: '\u2190  \u2192', desc: 'Step 1 frame' },
          { keys: '\u21e7 \u2190  \u21e7 \u2192', desc: 'Step 5 frames' },
        ],
      },
      {
        title: 'Tools',
        shortcuts: [
          { keys: 'V', desc: 'Select tool' },
          { keys: 'C', desc: 'Razor tool' },
          { keys: 'T', desc: 'Text tool' },
          { keys: 'S', desc: 'Toggle snap' },
        ],
      },
      {
        title: 'Editing',
        shortcuts: [
          { keys: '\u2318 K', desc: 'Split at playhead' },
          { keys: 'Delete', desc: 'Remove selected' },
          { keys: '\u21e7 Delete', desc: 'Ripple delete' },
          { keys: 'U', desc: 'Extract / unlink audio' },
          { keys: 'Right-click', desc: 'Clip context menu' },
        ],
      },
      {
        title: 'Navigation',
        shortcuts: [
          { keys: '\u2318 Z', desc: 'Undo' },
          { keys: '\u2318 \u21e7 Z', desc: 'Redo' },
          { keys: '\u2318 +', desc: 'Zoom in' },
          { keys: '\u2318 \u2212', desc: 'Zoom out' },
        ],
      },
      {
        title: 'Project',
        shortcuts: [
          { keys: '\u2318 S', desc: 'Save project' },
          { keys: '\u2318 O', desc: 'Open projects' },
          { keys: '?', desc: 'Toggle this help' },
        ],
      },
    ],

    // Advanced sections
    advancedSections: [
      {
        title: 'Multi-Select & Group Editing',
        items: [
          { label: 'Marquee select', desc: 'Click and drag on empty timeline space to draw a selection box around multiple clips.' },
          { label: 'Shift-click', desc: 'Hold Shift and click clips to add/remove them from the selection one by one.' },
          { label: 'Move together', desc: 'When multiple clips are selected, drag any one of them to move the entire group.' },
        ],
      },
      {
        title: 'Clip Speed Control',
        items: [
          { label: 'Change speed', desc: 'Right-click a clip > Speed. Choose from 0.25x (slow motion) to 4x (fast forward).' },
          { label: 'Duration adjusts', desc: 'The clip\'s timeline duration changes automatically to match the speed (2x = half the length).' },
          { label: 'Badge', desc: 'Clips with non-1x speed show a yellow speed badge (e.g. "2x") in the bottom-left corner.' },
        ],
      },
      {
        title: 'Crop, Resize & Fit Mode',
        items: [
          { label: 'Fit Mode', desc: 'Right-click a clip > Fit Mode. Choose Fit (letterbox), Fill (crop to fill), or Stretch.' },
          { label: 'Scale', desc: 'Right-click a clip > adjust the Scale slider (10%\u2013400%) to zoom in or out.' },
          { label: 'Aspect ratios', desc: 'Go to Settings tab to switch between 16:9, 9:16 (vertical), 1:1, or 4:5 canvas presets.' },
        ],
      },
      {
        title: 'Animations & Effects',
        items: [
          { label: 'Apply animation', desc: 'Right-click a video clip > Animation. Choose from 11 presets.' },
          { label: 'Fade presets', desc: 'Fade In, Fade Out, Fade In/Out \u2014 smooth opacity transitions.' },
          { label: 'Motion presets', desc: 'Slide Left/Right/Up/Down \u2014 clip slides into frame from the chosen direction (preview only).' },
          { label: 'Zoom presets', desc: 'Zoom In, Zoom Out \u2014 gradual scale change. Ken Burns \u2014 slow zoom with pan. All export correctly.' },
          { label: 'Preview', desc: 'Animations play in real-time in the Viewer as you scrub or play the timeline.' },
        ],
      },
      {
        title: 'Transitions',
        items: [
          { label: 'Apply', desc: 'Right-click a video clip > Transition In / Transition Out.' },
          { label: 'Types', desc: 'Cross Dissolve, Fade to Black, Fade from Black \u2014 each with a 0.5s default duration.' },
          { label: 'Preview', desc: 'Transitions preview in real-time in the Viewer as a smooth fade effect.' },
          { label: 'Linked audio', desc: 'Video transitions automatically apply matching audio fades to linked audio clips.' },
        ],
      },
      {
        title: 'Audio & Volume',
        items: [
          { label: 'Clip volume', desc: 'Right-click a clip to adjust volume (0\u2013200%). A yellow line on the clip shows the level.' },
          { label: 'Track volume', desc: 'Click the percentage label on any track header to show a volume slider.' },
          { label: 'Fades', desc: 'Right-click > Fade In / Fade Out, or drag the small white handles at clip corners.' },
          { label: 'Extract audio', desc: 'Right-click a video clip > Extract Audio to create a linked audio clip on a separate track.' },
          { label: 'Unlink', desc: 'Right-click a linked clip > Unlink to separate audio from its source video.' },
        ],
      },
      {
        title: 'Snap to Grid',
        items: [
          { label: 'Toggle', desc: 'Press S or click the magnet icon in the toolbar to turn Snap on or off.' },
          { label: 'Behavior', desc: 'When enabled, clip edges snap to nearby clip or text overlay boundaries while dragging.' },
          { label: 'Works on', desc: 'Clip move, trim start/end, and text overlay move/resize all respect snap.' },
        ],
      },
      {
        title: 'Text & Captions',
        items: [
          { label: 'Add text', desc: 'Double-click on a Text track, or switch to the Text tool (T) and click a text track. Type and press Enter.' },
          { label: 'Live preview', desc: 'Text overlays appear in the Viewer in real-time at their configured position and style.' },
          { label: 'Auto-captions', desc: 'In Transcript tab, click Transcribe, then use "Generate Captions" for auto-placed subtitles.' },
          { label: 'Caption styles', desc: 'Settings > Caption Style: choose Default, TikTok, YouTube, or Minimal presets.' },
          { label: 'Burn captions', desc: 'Enable "Burn Captions" in the Export dialog to embed subtitles directly in the video.' },
        ],
      },
      {
        title: 'Projects & Auto-Save',
        items: [
          { label: 'Auto-save', desc: 'Your timeline auto-saves to the browser every 3 seconds. Refreshing restores your work.' },
          { label: 'Named projects', desc: 'Press \u2318O or click the folder icon to manage multiple projects, each saved locally.' },
          { label: 'Re-link media', desc: 'If clips show a red "Re-link" badge after restoring, click it to re-import the original file.' },
        ],
      },
      {
        title: 'Export Settings',
        items: [
          { label: 'Format', desc: 'Choose MP4 (H.264, widely compatible) or WebM (VP9, smaller files).' },
          { label: 'Quality', desc: '720p for quick drafts, 1080p for standard HD, 4K for maximum quality.' },
          { label: 'Audio', desc: 'Toggle "Include Audio" to export with or without the audio mix.' },
          { label: 'Speed & effects', desc: 'Clip speed, fade animations, and transitions are baked into the exported file.' },
        ],
      },
    ],

    // Update log (most recent first)
    updateEntries: [
      {
        date: '2026-03-11',
        items: [
          'Snap now works: clips and text overlays snap to nearby edges while dragging, trimming, or resizing.',
          'Text overlays now render live in the Viewer preview with correct position, font, and style.',
          'Transitions (Cross Dissolve, Fade to/from Black) now preview in the Viewer in real-time.',
          'Zoom-in, Zoom-out, and Ken Burns animations now export correctly via FFmpeg zoompan filters.',
          'TransitionOut now applied in export (previously only transitionIn was exported).',
          'Replaced blocking prompt() with inline text input for creating text overlays on timeline.',
          'Added Snap and Text sections to Help > Advanced, updated Transitions and Animations docs.',
        ],
      },
      {
        date: '2026-03-10',
        items: [
          'Fixed 12+ correctness issues across 4 code review passes.',
          'All store actions that change clip positions now correctly recalculate timeline duration.',
          'Fixed double-audio for linked video+audio clips in both playback and export.',
          'Fixed ghost clips remaining after media file deletion.',
          'Fixed context menu scrolling and viewport-aware positioning.',
          'Fixed volume changes affecting other timelines via linked clips.',
          'Memoized expensive React computations (keyboard shortcuts, ruler ticks, waveform bars, activeClip).',
          'IndexedDB connection caching for faster media recovery.',
          'Transcript panel now shows error messages when transcription fails.',
        ],
      },
    ],
  },
};

export type Translations = typeof en;
