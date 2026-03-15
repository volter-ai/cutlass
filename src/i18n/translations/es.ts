import type { Translations } from './en';

export const es: Translations = {
  // Toolbar
  toolbar: {
    select: 'Seleccionar',
    razor: 'Cortar',
    text: 'Texto',
    snap: 'Ajuste',
    snapOn: 'Ajuste activado',
    snapOff: 'Ajuste desactivado',
    export: 'Exportar',
    goToStart: 'Ir al inicio',
    goToEnd: 'Ir al final',
    play: 'Reproducir (Espacio)',
    pause: 'Pausar (Espacio)',
    undo: 'Deshacer (Cmd+Z)',
    redo: 'Rehacer (Cmd+Shift+Z)',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    help: 'Ayuda (?)',
    projects: 'Proyectos (Cmd+O)',
    aiEdit: 'IA Editar',
  },

  // App tabs
  tabs: {
    media: 'medios',
    transcript: 'transcripci\u00f3n',
    ai: 'IA',
    settings: 'ajustes',
  },

  // Media Bin
  mediaBin: {
    title: 'Medios',
    import: 'Importar',
    dropFiles: 'Arrastra archivos aqu\u00ed',
    orClickImport: 'o haz clic en Importar',
  },

  // Viewer
  viewer: {
    title: 'Programa',
    noClip: 'Sin clip en el cabezal',
    importMedia: 'Importa medios y a\u00f1\u00e1delos a la l\u00ednea de tiempo',
  },

  // Timeline
  timeline: {
    title: 'L\u00ednea de tiempo',
    video: 'Video',
    audio: 'Audio',
    text: 'Texto',
  },

  // Track
  track: {
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    lock: 'Bloquear',
    unlock: 'Desbloquear',
  },

  // Clip
  clip: {
    dragFadeIn: 'Arrastra para ajustar fundido de entrada',
    dragFadeOut: 'Arrastra para ajustar fundido de salida',
    relink: 'Revincular',
    relinkTitle: 'Haz clic para revincular archivo de medios',
    enterText: 'Ingresa texto:',
  },

  // Context Menu
  contextMenu: {
    extractAudio: 'Extraer audio',
    unlink: 'Desvincular',
    speed: 'Velocidad',
    fitMode: 'Modo de ajuste',
    scale: 'Escala',
    animation: 'Animaci\u00f3n',
    fadeIn: 'Fundido de entrada',
    fadeOut: 'Fundido de salida',
    transitionIn: 'Transici\u00f3n de entrada',
    transitionOut: 'Transici\u00f3n de salida',
    volume: 'Volumen',
    editText: 'Editar texto',
    deleteClip: 'Eliminar clip',
    none: 'Ninguno',
    normal: '1x (Normal)',
    fitLetterbox: 'Ajustar (Letterbox)',
    fillCrop: 'Rellenar (Recortar)',
    stretch: 'Estirar',
    // Animation presets
    animNone: 'Ninguno',
    animFadeIn: 'Fundido entrada',
    animFadeOut: 'Fundido salida',
    animFadeInOut: 'Fundido entrada/salida',
    animSlideLeft: 'Deslizar izquierda',
    animSlideRight: 'Deslizar derecha',
    animSlideUp: 'Deslizar arriba',
    animSlideDown: 'Deslizar abajo',
    animZoomIn: 'Acercar',
    animZoomOut: 'Alejar',
    animKenBurns: 'Ken Burns',
    // Transitions
    crossDissolve: 'Disolvencia cruzada',
    fadeToBlack: 'Fundido a negro',
    fadeFromBlack: 'Fundido desde negro',
  },

  // Export
  export: {
    title: 'Exportar video',
    format: 'Formato',
    quality: 'Calidad',
    resolution: 'Resoluci\u00f3n',
    includeAudio: 'Incluir audio',
    burnCaptions: 'Incrustar subt\u00edtulos en el video',
    exportSubtitles: 'Exportar archivo de subt\u00edtulos',
    subtitleHint: 'Se descarga junto con el video',
    exporting: 'Exportando...',
    exportBtn: 'Exportar',
    cancel: 'Cancelar',
    exportFailed: 'La exportaci\u00f3n fall\u00f3. Revisa la consola del navegador para m\u00e1s detalles.',
    captionHint: 'Requiere subt\u00edtulos generados desde la pesta\u00f1a Transcripci\u00f3n.',
  },

  // Settings
  settings: {
    title: 'Ajustes',
    aspectRatio: 'Relaci\u00f3n de aspecto',
    deepgramKey: 'Clave API de Deepgram',
    keyPlaceholder: 'Ingresa la clave API para transcripci\u00f3n...',
    keySet: 'Clave configurada - transcripci\u00f3n real activada',
    noKey: 'Sin clave - usando transcripci\u00f3n de prueba',
    captionStyle: 'Estilo de subt\u00edtulos',
    position: 'Posici\u00f3n',
    fontSize: 'Tama\u00f1o de fuente',
    top: 'arriba',
    center: 'centro',
    bottom: 'abajo',
    backgroundColor: 'Fondo',
    // Aspect ratio descriptions
    landscape: 'YouTube / Horizontal',
    reels: 'Reels / TikTok / Shorts',
    instagram: 'Instagram Feed',
    instagramFb: 'Instagram / Facebook',
    // Caption presets
    default: 'Predeterminado',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    minimal: 'Minimal',
    // Text overlay style
    textStyle: 'Estilo de texto',
    fontFamily: 'Fuente',
    fontWeight: 'Peso',
    textColor: 'Color',
    bgColor: 'Fondo',
    textAlign: 'Alineación',
    textOutline: 'Contorno',
    // OpenAI
    openaiKey: 'Clave API de OpenAI',
    openaiKeyPlaceholder: 'Ingresa la clave API para edici\u00f3n con IA...',
    openaiKeySet: 'Clave configurada - edici\u00f3n con IA habilitada',
    noOpenaiKey: 'Sin clave - funciones de IA deshabilitadas',
  },

  // Transcript
  transcript: {
    title: 'Transcripci\u00f3n',
    selectMedia: 'Selecciona un medio para transcribir...',
    transcribed: '(transcrito)',
    transcribe: 'Transcribir',
    transcribing: 'Transcribiendo...',
    delete: 'Eliminar',
    replaceWithGap: 'Reemplazar con espacio',
    ignore: 'Ignorar',
    transcriptOnly: 'Solo transcripci\u00f3n',
    fillers: 'Muletillas',
    fillersTooltip: 'Eliminar muletillas (eh, um, etc.)',
    detectScenes: 'Detectar escenas',
    detectScenesTooltip: 'Detectar escenas desde la transcripci\u00f3n',
    scenes: 'Escenas',
    speaker: 'Hablante',
    importToStart: 'Importa medios para comenzar',
    selectAndTranscribe: 'Selecciona un medio y transcr\u00edbelo',
    addCaptionsToTimeline: 'A\u00f1adir subt\u00edtulos',
  },

  // AI Edit
  ai: {
    title: 'IA Editar',
    noKey: 'A\u00f1ade tu clave API de OpenAI en Ajustes para habilitar la edici\u00f3n con IA.',
    goToSettings: 'Ir a Ajustes',
    chatTab: 'Chat',
    docTab: 'Documento',
    chatHint: 'Dime c\u00f3mo editar tu video.',
    chatPlaceholder: 'Describe tu edici\u00f3n...',
    docHint: 'Pega tu documento de requisitos describiendo c\u00f3mo debe estructurarse el video final.',
    docPlaceholder: 'Pega el documento de requisitos aqu\u00ed...\n\nEjemplo:\n- Empezar con la discusi\u00f3n de precios (5:30)\n- Luego mostrar la demo (12:00-18:00)\n- Saltar la secci\u00f3n de preguntas\n- A\u00f1adir un t\u00edtulo "Revisi\u00f3n Q3" al inicio',
    analyze: 'Analizar y generar ediciones',
    thinking: 'Pensando...',
    example1: '"Eliminar todos los ums y pausas"',
    example2: '"Hacer la intro de 15 segundos"',
    example3: '"A\u00f1adir un t\u00edtulo que diga Revisi\u00f3n Q3"',
  },

  // Auth
  auth: {
    signIn: 'Iniciar sesi\u00f3n',
    signOut: 'Cerrar sesi\u00f3n',
    createAccount: 'Crear cuenta',
    email: 'Correo electr\u00f3nico',
    password: 'Contrase\u00f1a',
    loading: 'Cargando...',
    noAccount: '\u00bfNo tienes cuenta? Reg\u00edstrate',
    hasAccount: '\u00bfYa tienes cuenta? Inicia sesi\u00f3n',
  },

  // Projects
  projects: {
    title: 'Proyectos',
    savedLocally: 'Guardados localmente en este navegador',
    new: 'Nuevo',
    rename: 'Renombrar',
    delete: 'Eliminar',
    signInToSave: 'Inicia sesi\u00f3n para guardar y gestionar proyectos entre sesiones.',
    loadingProjects: 'Cargando proyectos...',
    noProjects: 'A\u00fan no hay proyectos. Haz clic en "Nuevo" para crear uno.',
    autoSaveHint: 'Tu sesi\u00f3n actual se guarda autom\u00e1ticamente cada pocos segundos.',
  },

  // Help Overlay
  help: {
    title: 'CUTLASS \u2014 Ayuda',
    basics: 'B\u00e1sico',
    advanced: 'Avanzado',
    quickStart: 'Inicio r\u00e1pido',
    keyboardShortcuts: 'Atajos de teclado',
    updates: 'Novedades',
    closeHint: 'Presiona ? o Esc para cerrar',

    // Quick Start steps
    steps: [
      { title: 'Importar medios', desc: 'Arrastra archivos de video o audio al panel de Medios, o haz clic en Importar.' },
      { title: 'Construir la l\u00ednea de tiempo', desc: 'Arrastra clips desde el panel de Medios a las pistas de la l\u00ednea de tiempo.' },
      { title: 'Cortar y organizar', desc: 'Usa la herramienta Cortar (C) para dividir clips. Seleccionar (V) para moverlos. Ajuste (S) alinea clips a bordes.' },
      { title: 'Ajustar audio y video', desc: 'Haz clic derecho en clips para volumen, fundidos, velocidad, transiciones, animaciones y m\u00e1s.' },
      { title: 'Transcribir y subtitular', desc: 'Abre la pesta\u00f1a Transcripci\u00f3n para auto-transcribir y generar subt\u00edtulos.' },
      { title: 'Exportar', desc: 'Haz clic en Exportar para renderizar tu video como MP4 o WebM a 720p, 1080p o 4K.' },
    ],

    // Keyboard shortcut sections
    shortcutSections: [
      {
        title: 'Reproducci\u00f3n',
        shortcuts: [
          { keys: 'Space', desc: 'Reproducir / Pausar' },
          { keys: '\u2190  \u2192', desc: 'Avanzar 1 fotograma' },
          { keys: '\u21e7 \u2190  \u21e7 \u2192', desc: 'Avanzar 5 fotogramas' },
        ],
      },
      {
        title: 'Herramientas',
        shortcuts: [
          { keys: 'V', desc: 'Herramienta Seleccionar' },
          { keys: 'C', desc: 'Cortar en el cabezal' },
          { keys: 'T', desc: 'Herramienta Texto' },
          { keys: 'S', desc: 'Alternar ajuste' },
        ],
      },
      {
        title: 'Edici\u00f3n',
        shortcuts: [
          { keys: '\u2318 K', desc: 'Dividir en el cabezal' },
          { keys: 'Delete', desc: 'Eliminar selecci\u00f3n' },
          { keys: '\u21e7 Delete', desc: 'Eliminaci\u00f3n con ondulaci\u00f3n' },
          { keys: 'U', desc: 'Extraer / desvincular audio' },
          { keys: 'Clic derecho', desc: 'Men\u00fa contextual del clip' },
          { keys: '\u2318 D', desc: 'Duplicar clips seleccionados' },
        ],
      },
      {
        title: 'Navegaci\u00f3n',
        shortcuts: [
          { keys: '\u2318 Z', desc: 'Deshacer' },
          { keys: '\u2318 \u21e7 Z', desc: 'Rehacer' },
          { keys: '\u2318 +', desc: 'Acercar' },
          { keys: '\u2318 \u2212', desc: 'Alejar' },
        ],
      },
      {
        title: 'Proyecto',
        shortcuts: [
          { keys: '\u2318 S', desc: 'Guardar proyecto' },
          { keys: '\u2318 O', desc: 'Abrir proyectos' },
          { keys: '?', desc: 'Mostrar esta ayuda' },
        ],
      },
    ],

    // Advanced sections
    advancedSections: [
      {
        title: 'Multi-selecci\u00f3n y edici\u00f3n en grupo',
        items: [
          { label: 'Selecci\u00f3n de marco', desc: 'Haz clic y arrastra en un espacio vac\u00edo de la l\u00ednea de tiempo para dibujar un cuadro de selecci\u00f3n alrededor de m\u00faltiples clips.' },
          { label: 'Shift-clic', desc: 'Mant\u00e9n Shift y haz clic en clips para agregarlos o quitarlos de la selecci\u00f3n uno por uno.' },
          { label: 'Mover juntos', desc: 'Cuando hay m\u00faltiples clips seleccionados, arrastra cualquiera de ellos para mover todo el grupo.' },
        ],
      },
      {
        title: 'Control de velocidad del clip',
        items: [
          { label: 'Cambiar velocidad', desc: 'Clic derecho en un clip > Velocidad. Elige desde 0.25x (c\u00e1mara lenta) hasta 4x (avance r\u00e1pido).' },
          { label: 'Duraci\u00f3n se ajusta', desc: 'La duraci\u00f3n del clip en la l\u00ednea de tiempo cambia autom\u00e1ticamente seg\u00fan la velocidad (2x = la mitad de la duraci\u00f3n).' },
          { label: 'Insignia', desc: 'Los clips con velocidad diferente a 1x muestran una insignia amarilla de velocidad (ej. "2x") en la esquina inferior izquierda.' },
        ],
      },
      {
        title: 'Recortar, redimensionar y modo de ajuste',
        items: [
          { label: 'Modo de ajuste', desc: 'Clic derecho en un clip > Modo de ajuste. Elige Ajustar (letterbox), Rellenar (recortar para llenar) o Estirar.' },
          { label: 'Escala', desc: 'Clic derecho en un clip > ajusta el control de Escala (10%\u2013400%) para acercar o alejar.' },
          { label: 'Relaciones de aspecto', desc: 'Ve a la pesta\u00f1a Ajustes para cambiar entre 16:9, 9:16 (vertical), 1:1 o 4:5.' },
        ],
      },
      {
        title: 'Animaciones y efectos',
        items: [
          { label: 'Aplicar animaci\u00f3n', desc: 'Clic derecho en un clip de video > Animaci\u00f3n. Elige entre 11 preajustes.' },
          { label: 'Preajustes de fundido', desc: 'Fundido de entrada, Fundido de salida, Fundido entrada/salida \u2014 transiciones suaves de opacidad.' },
          { label: 'Preajustes de movimiento', desc: 'Deslizar Izquierda/Derecha/Arriba/Abajo \u2014 el clip se desliza hacia el cuadro (solo vista previa).' },
          { label: 'Preajustes de zoom', desc: 'Acercar, Alejar \u2014 cambio gradual de escala. Ken Burns \u2014 zoom lento con paneo. Todos se exportan correctamente.' },
          { label: 'Vista previa', desc: 'Las animaciones se reproducen en tiempo real en el Visor al desplazar o reproducir la l\u00ednea de tiempo.' },
        ],
      },
      {
        title: 'Transiciones',
        items: [
          { label: 'Aplicar', desc: 'Clic derecho en un clip de video > Transici\u00f3n de entrada / Transici\u00f3n de salida.' },
          { label: 'Tipos', desc: 'Disolvencia cruzada, Fundido a negro, Fundido desde negro \u2014 cada una con 0.5s de duraci\u00f3n predeterminada.' },
          { label: 'Vista previa', desc: 'Las transiciones se previsualizan en tiempo real en el Visor como un efecto de fundido suave.' },
          { label: 'Audio vinculado', desc: 'Las transiciones de video aplican autom\u00e1ticamente fundidos de audio correspondientes a los clips de audio vinculados.' },
        ],
      },
      {
        title: 'Audio y volumen',
        items: [
          { label: 'Volumen del clip', desc: 'Clic derecho en un clip para ajustar el volumen (0\u2013200%). Una l\u00ednea amarilla en el clip muestra el nivel.' },
          { label: 'Volumen de la pista', desc: 'Haz clic en la etiqueta de porcentaje en el encabezado de cualquier pista para mostrar un control de volumen.' },
          { label: 'Fundidos', desc: 'Clic derecho > Fundido de entrada / Fundido de salida, o arrastra los peque\u00f1os controles blancos en las esquinas del clip.' },
          { label: 'Extraer audio', desc: 'Clic derecho en un clip de video > Extraer Audio para crear un clip de audio vinculado en una pista separada.' },
          { label: 'Desvincular', desc: 'Clic derecho en un clip vinculado > Desvincular para separar el audio de su video de origen.' },
        ],
      },
      {
        title: 'Ajuste a la cuadr\u00edcula',
        items: [
          { label: 'Alternar', desc: 'Presiona S o haz clic en el \u00edcono de im\u00e1n en la barra de herramientas para activar o desactivar el ajuste.' },
          { label: 'Comportamiento', desc: 'Cuando est\u00e1 activado, los bordes de los clips se ajustan a los bordes cercanos de otros clips o textos al arrastrar.' },
          { label: 'Funciona en', desc: 'Mover clips, recortar inicio/fin, y mover/redimensionar textos respetan el ajuste.' },
        ],
      },
      {
        title: 'Texto y subt\u00edtulos',
        items: [
          { label: 'A\u00f1adir texto', desc: 'Doble clic en una pista de Texto, o cambia a la herramienta Texto (T) y haz clic en una pista de texto. Escribe y presiona Enter.' },
          { label: 'Vista previa en vivo', desc: 'Los textos superpuestos aparecen en el Visor en tiempo real en su posici\u00f3n y estilo configurados.' },
          { label: 'Subt\u00edtulos autom\u00e1ticos', desc: 'En la pesta\u00f1a Transcripci\u00f3n, haz clic en Transcribir, luego usa "Generar subt\u00edtulos" para subt\u00edtulos autom\u00e1ticos.' },
          { label: 'Estilos de subt\u00edtulos', desc: 'Ajustes > Estilo de subt\u00edtulos: elige entre Predeterminado, TikTok, YouTube o Minimal.' },
          { label: 'Incrustar subt\u00edtulos', desc: 'Activa "Incrustar subt\u00edtulos" en el di\u00e1logo de Exportar para insertar subt\u00edtulos directamente en el video.' },
        ],
      },
      {
        title: 'Proyectos y autoguardado',
        items: [
          { label: 'Autoguardado', desc: 'Tu l\u00ednea de tiempo se guarda autom\u00e1ticamente en el navegador cada 3 segundos. Al actualizar se restaura tu trabajo.' },
          { label: 'Proyectos con nombre', desc: 'Presiona \u2318O o haz clic en el \u00edcono de carpeta para gestionar m\u00faltiples proyectos guardados localmente.' },
          { label: 'Revincular medios', desc: 'Si los clips muestran una insignia roja "Revincular" al restaurar, haz clic en ella para reimportar el archivo original.' },
        ],
      },
      {
        title: 'Ajustes de exportaci\u00f3n',
        items: [
          { label: 'Formato', desc: 'Elige MP4 (H.264, amplia compatibilidad) o WebM (VP9, archivos m\u00e1s peque\u00f1os).' },
          { label: 'Calidad', desc: '720p para borradores r\u00e1pidos, 1080p para HD est\u00e1ndar, 4K para calidad m\u00e1xima.' },
          { label: 'Audio', desc: 'Activa o desactiva "Incluir audio" para exportar con o sin la mezcla de audio.' },
          { label: 'Velocidad y efectos', desc: 'La velocidad del clip, animaciones de fundido y transiciones se incorporan al archivo exportado.' },
        ],
      },
    ],

    // Update log (most recent first)
    updateEntries: [
      {
        date: '2026-03-14 (v7)',
        items: [
          'Soporte de Claude: elige GPT-4o, Claude Sonnet 4.6 u Claude Opus 4.6 como modelo de IA en Configuración.',
          'Campo de clave de API de Anthropic en Configuración, visible al seleccionar un modelo Claude.',
          'Marcadores de capítulos con IA: el botón "Chapters" en la pestaña Transcripción genera títulos y los añade como superposiciones de texto.',
          'Detección de silencio: "Detect Silence" en la pestaña Transcripción encuentra pausas de ≥0,5 s y las elimina con un clic.',
          'Chat, Documento y Capítulos usan automáticamente el modelo seleccionado.',
        ],
      },
      {
        date: '2026-03-14 (v6)',
        items: [
          'Corregido el desbordamiento de reproducción — se detiene exactamente al final del contenido.',
          'Corregido ripple-delete que corrompía clips de video+audio vinculados.',
          'Corregida la URL del proxy de IA (llamaba a OpenAI directamente en lugar del proxy).',
          'Corregido: los estilos de subtítulos ya no sobreescriben superposiciones de texto manuales.',
          'Corregida la duplicación de subtítulos al hacer clic en "Añadir subtítulos" más de una vez.',
          'Corregido el contexto de conversación de IA — los mensajes previos se incluyen en cada solicitud.',
          'Corregidos los límites de recorte: los clips no pueden tener menos de 0,1 s de duración.',
          'Las operaciones de IA se validan antes de ejecutarse.',
          'FFmpeg se reinicia automáticamente tras un fallo del worker.',
          'Los archivos >500 MB muestran una advertencia antes de la extracción de audio.',
          'Los fallos de guardado automático muestran una insignia amarilla en la barra de herramientas.',
          'Las animaciones Ken Burns y zoom exportan con movimiento real (antes se congelaban en el primer fotograma).',
        ],
      },
      {
        date: '2026-03-11 (v5)',
        items: [
          'Panel de edici\u00f3n con IA: comandos de edici\u00f3n en lenguaje natural v\u00eda OpenAI (modo Chat).',
          'Modo documento: pega un documento de requisitos para generar ediciones autom\u00e1ticamente.',
          'Vista previa de operaciones con Aplicar/Descartar \u2014 todas las ediciones de IA se deshacen en un solo paso (Cmd+Z).',
          'Bot\u00f3n de edici\u00f3n IA en la barra de herramientas con \u00edcono de destellos.',
          'Gesti\u00f3n de clave API de OpenAI en el panel de Ajustes.',
        ],
      },
      {
        date: '2026-03-11 (v4)',
        items: [
          'Corregida eliminación con ondulación de múltiples clips que corrompía posiciones (ahora elimina de derecha a izquierda).',
          'Delta de reproducción limitado para evitar salto del cabezal al cambiar de pestaña del navegador.',
          'Función auxiliar compartida para dividir en el cabezal (C y Cmd+K usan la misma lógica).',
          'Errores de reproducción de video/audio ahora se registran en la consola para depuración.',
        ],
      },
      {
        date: '2026-03-11 (v3)',
        items: [
          'La tecla C ahora corta todos los clips en la posición del cabezal de reproducción.',
          'Ctrl/Cmd+D duplica los clips seleccionados, colocando copias justo después de los originales.',
          'La vista previa del visor ahora respeta la relación de aspecto (16:9, 9:16, 1:1, 4:5).',
          'Panel de estilo de texto en Ajustes: fuente, tamaño, peso, color, fondo, posición, alineación, contorno.',
          'Arrastre entre pistas: mueve clips entre pistas del mismo tipo.',
          'División visor/línea de tiempo redimensionable: arrastra el divisor para cambiar el tamaño.',
          'El diálogo de exportación muestra una nota cuando se habilitan subtítulos incrustados.',
          'Mejoras visuales en forma de onda: barras más densas con envolvente natural.',
          'Menú contextual en textos superpuestos para Editar y Eliminar.',
          'Tecla Delete/Backspace elimina textos superpuestos seleccionados.',
        ],
      },
      {
        date: '2026-03-11 (v2)',
        items: [
          'El ajuste ahora funciona: clips y textos se alinean a bordes cercanos al arrastrar, recortar o redimensionar.',
          'Los textos superpuestos ahora se muestran en vivo en el Visor con posici\u00f3n, fuente y estilo correctos.',
          'Las transiciones (Disolvencia cruzada, Fundido a/desde negro) ahora se previsualizan en el Visor en tiempo real.',
          'Animaciones Acercar, Alejar y Ken Burns ahora se exportan correctamente con filtros zoompan de FFmpeg.',
          'TransitionOut ahora se aplica en la exportaci\u00f3n (antes solo se exportaba transitionIn).',
          'Se reemplaz\u00f3 el di\u00e1logo prompt() con entrada de texto en l\u00ednea para crear textos en la l\u00ednea de tiempo.',
          'Se a\u00f1adieron secciones de Ajuste y Texto a Ayuda > Avanzado, se actualizaron docs de Transiciones y Animaciones.',
        ],
      },
      {
        date: '2026-03-10',
        items: [
          'Se corrigieron m\u00e1s de 12 problemas de correcci\u00f3n en 4 revisiones de c\u00f3digo.',
          'Todas las acciones del almac\u00e9n que cambian posiciones de clips ahora recalculan correctamente la duraci\u00f3n.',
          'Se corrigi\u00f3 el audio doble para clips de video+audio vinculados en reproducci\u00f3n y exportaci\u00f3n.',
          'Se corrigi\u00f3 el problema de clips fantasma al eliminar archivos de medios.',
          'Se corrigi\u00f3 el desplazamiento del men\u00fa contextual y posicionamiento relativo a la ventana.',
          'Se corrigi\u00f3 el problema de volumen afectando otras l\u00edneas de tiempo.',
          'Se memorizaron c\u00e1lculos costosos de React (atajos, regla, barras de onda, clip activo).',
          'Cach\u00e9 de conexi\u00f3n IndexedDB para recuperaci\u00f3n m\u00e1s r\u00e1pida de medios.',
          'El panel de transcripci\u00f3n ahora muestra mensajes de error cuando la transcripci\u00f3n falla.',
        ],
      },
    ],
  },
};
