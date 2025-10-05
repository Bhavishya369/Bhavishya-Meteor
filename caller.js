// ================================
// COSMIC EXPLORER — MAIN SCRIPT
// ================================

// Audio context and state management
let audioContext;
let hoverSoundBuffer;
let clickSoundBuffer;
let audioEnabled = false;

// Initialize audio system
async function initAudio() {
    try {
        // Create audio context (suspended until user interaction)
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load audio files
        [hoverSoundBuffer, clickSoundBuffer] = await Promise.all([
            loadAudioFile('hover-button-287656-VEED.mp3'),
            loadAudioFile('casual click.mp3')
        ]);
        
        console.log('Audio system initialized successfully');
    } catch (error) {
        console.warn('Audio initialization failed:', error);
    }
}

// Load audio file as ArrayBuffer
async function loadAudioFile(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.warn(`Failed to load audio file: ${url}`, error);
        return null;
    }
}

// Play audio with Web Audio API
function playAudio(buffer, volume = 1.0) {
    if (!audioEnabled || !buffer || !audioContext) return;
    
    try {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        source.buffer = buffer;
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
}

// Enable audio on first user interaction
function enableAudio() {
    if (audioEnabled) return;
    
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            audioEnabled = true;
            console.log('Audio enabled');
            
            // Play welcome sound when audio is first enabled
            playAudio(clickSoundBuffer, 0.8); // Increased volume
            
            // Update terminal
            const terminal = document.getElementById('terminalContent');
            const newLine = document.createElement('div');
            newLine.className = 'terminal-line success';
            newLine.textContent = '> AUDIO SYSTEMS ONLINE';
            terminal.appendChild(newLine);
            terminal.scrollTop = terminal.scrollHeight;
            
            // Setup global click listener after audio is enabled
            setupGlobalClickSound();
        });
    } else {
        audioEnabled = true;
        setupGlobalClickSound();
    }
}

// Enable audio on any user interaction
function setupAudioEnable() {
    const enableEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
    
    enableEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
            enableAudio();
        }, { once: true, passive: true });
    });
}

// NEW: Play click sound on EVERY click anywhere on the page
function setupGlobalClickSound() {
    document.addEventListener('click', (event) => {
        // Play click sound for EVERY click with increased volume
        playAudio(clickSoundBuffer, 0.8); // Increased from 0.6 to 0.8
        
        // Add a small ripple effect to the click position for visual feedback
        createGlobalRipple(event);
    }, { passive: true });
}

// NEW: Create ripple effect at click position for visual feedback
function createGlobalRipple(event) {
    // Only create ripples on the main content area, not on interactive elements
    if (event.target.closest('.mission-card, .glass-btn, button, a')) {
        return; // Skip if clicking on interactive elements (they have their own ripples)
    }
    
    const ripple = document.createElement('div');
    ripple.classList.add('global-ripple');
    
    // Position the ripple at click coordinates
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    
    document.body.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add hover sound on mission cards and buttons
function addHoverSound() {
    const hoverables = document.querySelectorAll('.mission-card, .glass-btn');
    
    hoverables.forEach(item => {
        // Mouse enter event
        item.addEventListener('mouseenter', (event) => {
            playAudio(hoverSoundBuffer, 0.4);
            createRippleEffect(event, true); // Small ripple on hover
        });
        
        // Touch start for mobile devices
        item.addEventListener('touchstart', (event) => {
            playAudio(hoverSoundBuffer, 0.4);
        }, { passive: true });
    });
}

// Create animated background gradient
function createAnimatedBackground() {
    const bg = document.querySelector('.gradient-bg');
    const colors = [
        'rgba(30, 30, 30, 0.3)',
        'rgba(40, 40, 40, 0.2)',
        'rgba(50, 50, 50, 0.15)'
    ];
    
    let currentColorIndex = 0;
    
    setInterval(() => {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        bg.style.background = `
            radial-gradient(circle at 20% 30%, ${colors[currentColorIndex]} 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, ${colors[(currentColorIndex + 1) % colors.length]} 0%, transparent 40%),
            radial-gradient(circle at 40% 80%, ${colors[(currentColorIndex + 2) % colors.length]} 0%, transparent 40%),
            linear-gradient(135deg, #000000, #050505, #0a0a0a)
        `;
    }, 5000);
}

// Particle system for background
function initParticleSystem() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with HiDPI scaling
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle class
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.1;
            this.life = Math.random() * 100 + 50;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            
            if (this.life <= 0 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Create particles
    const particles = [];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw connecting lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        
        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Terminal simulation
function simulateTerminal() {
    const terminal = document.getElementById('terminalContent');
    const lines = [
        { text: '> SYSTEM BOOT COMPLETE', class: 'success', delay: 500 },
        { text: '> INITIALIZING COSMIC DATABASE...', class: 'command', delay: 1000 },
        { text: 'COSMIC DB v4.1.2 ONLINE', class: 'response', delay: 1500 },
        { text: '> SCANNING DATABASES...', class: 'command', delay: 2000 },
        { text: '3 ACTIVE DATABASES DETECTED', class: 'response', delay: 2500 },
        { text: '> RUNNING DIAGNOSTICS...', class: 'command', delay: 3000 },
        { text: 'ALL SYSTEMS NOMINAL', class: 'success', delay: 3500 },
        { text: '> ESTABLISHING COMM LINK...', class: 'command', delay: 4000 },
        { text: 'LINK ESTABLISHED - SIGNAL STRENGTH: 98%', class: 'success', delay: 4500 },
        { text: '> AWAITING USER COMMAND...', class: 'command', delay: 5000 },
    ];
    
    lines.forEach((line) => {
        setTimeout(() => {
            const lineElement = document.createElement('div');
            lineElement.className = `terminal-line ${line.class}`;
            lineElement.textContent = line.text;
            terminal.appendChild(lineElement);
            
            // Auto scroll to bottom
            terminal.scrollTop = terminal.scrollHeight;
        }, line.delay);
    });
}

// Debug console
function initializeDebugConsole() {
    const debugContent = document.getElementById('debugContent');
    const debugInfo = [
        { title: 'SYSTEM STATUS', value: 'NOMINAL', status: 'success' },
        { title: 'NETWORK LATENCY', value: '18ms', status: 'success' },
        { title: 'MEMORY USAGE', value: '64%', status: 'warning' },
        { title: 'CPU LOAD', value: '42%', status: 'success' },
        { title: 'POWER SYSTEMS', value: 'STABLE', status: 'success' },
        { title: 'TEMPERATURE', value: '32°C', status: 'success' },
        { title: 'DATA THROUGHPUT', value: '1.2 Gb/s', status: 'success' },
    ];
    
    debugInfo.forEach(info => {
        const item = document.createElement('div');
        item.className = 'debug-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <span>${info.title}</span>
                <span style="color: ${info.status === 'success' ? '#00ff9d' : info.status === 'warning' ? '#ffcc00' : '#ff2a6d'}">${info.value}</span>
            </div>
        `;
        debugContent.appendChild(item);
    });
}

// Ripple effect for buttons
function createRippleEffect(event, isHover = false) {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2; 
    
    circle.style.width = circle.style.height = `${isHover ? diameter * 0.3 : diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');
    
    if (isHover) {
        circle.style.animationDuration = '0.3s';
        circle.style.background = 'rgba(255, 255, 255, 0.04)';
    }
    
    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) ripple.remove();
    
    button.appendChild(circle);

    // Auto remove ripple after animation
    circle.addEventListener('animationend', () => {
        circle.remove();
    });
}

// Launch sequence
function initiateLaunch(mission) {
    const overlay = document.getElementById('launchOverlay');
    const countdownElement = document.getElementById('countdown');
    
    // Play launch sound
    playAudio(clickSoundBuffer, 0.9); // Increased volume for launch
    
    // Show launch overlay
    overlay.style.display = 'flex';
    
    // Countdown from 3
    let count = 3;
    const countdownInterval = setInterval(() => {
        countdownElement.textContent = count;
        playAudio(clickSoundBuffer, 0.6); // Play countdown sound
        count--;
        
        if (count < 0) {
            clearInterval(countdownInterval);
            countdownElement.textContent = 'ACCESSING';
            playAudio(clickSoundBuffer, 0.9); // Final sound with increased volume
            
            // Redirect to mission page
            setTimeout(() => {
                window.location.href = `${mission}.html`;
            }, 1500);
        }
    }, 1000);
}

// Mission card interactions
function setupMissionCards() {
    const missionCards = document.querySelectorAll('.mission-card');
    
    missionCards.forEach(card => {
        // Add ripple effect on click
        card.addEventListener('click', function(event) {
            createRippleEffect(event);
            
            // Remove active class from all cards
            missionCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            card.classList.add('active');
            
            // Update terminal with mission details
            const mission = card.getAttribute('data-mission');
            const missionName = card.querySelector('.mission-name').textContent;
            
            const terminal = document.getElementById('terminalContent');
            const newLine = document.createElement('div');
            newLine.className = 'terminal-line command';
            newLine.textContent = `> SELECTED DATABASE: ${missionName}`;
            terminal.appendChild(newLine);
            
            // Auto scroll to bottom
            terminal.scrollTop = terminal.scrollHeight;
            
            // Initiate launch sequence after a short delay
            setTimeout(() => {
                initiateLaunch(mission);
            }, 1000);
        });
    });
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize audio first
    await initAudio();
    setupAudioEnable();
    
    // Then initialize other systems
    createAnimatedBackground();
    initParticleSystem();
    simulateTerminal();
    initializeDebugConsole();
    setupMissionCards();
    
    // Add audio to hover events
    addHoverSound();
    
    // Add ripple effect to all glass buttons
    const glassButtons = document.querySelectorAll('.glass-btn');
    glassButtons.forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });
    
    // Navigation button events
    document.getElementById('systemsBtn').addEventListener('click', () => {
        const terminal = document.getElementById('terminalContent');
        const newLine = document.createElement('div');
        newLine.className = 'terminal-line command';
        newLine.textContent = '> SYSTEMS OVERVIEW REQUESTED';
        terminal.appendChild(newLine);
        terminal.scrollTop = terminal.scrollHeight;
    });
    
    document.getElementById('databaseBtn').addEventListener('click', () => {
        const terminal = document.getElementById('terminalContent');
        const newLine = document.createElement('div');
        newLine.className = 'terminal-line command';
        newLine.textContent = '> DATABASE MANAGEMENT PANEL OPENED';
        terminal.appendChild(newLine);
        terminal.scrollTop = terminal.scrollHeight;
    });
    
    document.getElementById('debugBtn').addEventListener('click', () => {
        const debugPanel = document.querySelector('.debug-panel');
        debugPanel.style.transform = debugPanel.style.transform === 'translateY(0px)' ? 
            'translateY(calc(100% - 40px))' : 'translateY(0)';
            
        const terminal = document.getElementById('terminalContent');
        const newLine = document.createElement('div');
        newLine.className = 'terminal-line command';
        newLine.textContent = '> DEBUG CONSOLE TOGGLED';
        terminal.appendChild(newLine);
        terminal.scrollTop = terminal.scrollHeight;
    });
});