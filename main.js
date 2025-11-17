/**
 * 3D Rolling Ball Game
 * A third-person 3D rolling ball interaction game with multiple scenes and ball transformations
 */

import * as THREE from 'three';

// ============================================================================
// GAME CONSTANTS
// ============================================================================
const BALL_TYPES = {
    INITIAL: 'initial',
    FIRE: 'fire',
    GLASS: 'glass',
    BOUNCY: 'bouncy'
};

const SCENES = {
    A: 'scene_a',
    B: 'scene_b',
    DARK: 'scene_dark',
    RED: 'scene_red',
    BLUE: 'scene_blue'
};

const BALL_RADIUS = 1;
const MOVE_SPEED = 0.02;
const ROTATION_SPEED = 0.05;
const CAMERA_DISTANCE = 10;
const CAMERA_HEIGHT = 6;
const GRAVITY = -0.02;
const BOUNCE_FACTOR = 0.7;

// ============================================================================
// GAME STATE
// ============================================================================
let gameState = {
    currentBallType: BALL_TYPES.INITIAL,
    currentScene: SCENES.A,
    inputEnabled: true,
    isTransitioning: false,
    velocity: new THREE.Vector3(),
    onGround: true
};

// ============================================================================
// NARRATIVE & CHOICE TRACKING SYSTEM
// ============================================================================
let choiceState = {
    ballsChosen: [],
    holesEntered: [],
    survivedScenes: 0,
    totalDeaths: 0,
    exploredLore: [],
    atmosphericIntensity: 0, // 0-100 scale
    windStrength: 0,
    stormApproaching: false
};

// Resource management system
let resources = {
    energy: 100,      // Ball's core energy (0-100)
    stability: 100,   // Structural integrity (0-100)
    harmony: 50       // Balance with environment (0-100)
};

// Visual state for lighting and weather transitions
let visualState = {
    targetFogDensity: 0,
    currentFogDensity: 0,
    targetLightIntensity: 1,
    currentLightIntensity: 1,
    targetAmbientIntensity: 0.4,
    currentAmbientIntensity: 0.4,
    targetLightColor: new THREE.Color(0xffffff),
    currentLightColor: new THREE.Color(0xffffff),
    targetAmbientColor: new THREE.Color(0xffffff),
    currentAmbientColor: new THREE.Color(0xffffff),
    cameraShakeIntensity: 0,
    idleAnimationPhase: 0,
    timeOfDay: 'day' // 'day', 'dusk', 'storm'
};

// Background environment objects
let backgroundObjects = [];

// Lore and world-building data
const LORE_DATA = {
    fire_origin: {
        title: "Fire Ball Origin",
        text: "Forged in the heart of a dying star, Fire Balls carry the essence of cosmic energy. They thrive in warmth but fear the cold void.",
        discovered: false
    },
    glass_mystery: {
        title: "Glass Ball Mystery",
        text: "Glass Balls are remnants of an ancient civilization that mastered light itself. Pure yet fragile, they shatter when darkness overwhelms them.",
        discovered: false
    },
    bouncy_legend: {
        title: "Bouncy Ball Legend",
        text: "Bouncy Balls contain the spirit of resilience. They can withstand impacts that would destroy others, bouncing back from adversity.",
        discovered: false
    },
    dark_realm: {
        title: "The Dark Realm",
        text: "A dimension where light itself is consumed. Only those with the power to bounce back can escape its grasp.",
        discovered: false
    },
    red_void: {
        title: "The Red Void",
        text: "An endless crimson expanse where only the flame of determination can survive. All else is swallowed.",
        discovered: false
    },
    blue_abyss: {
        title: "The Blue Abyss",
        text: "Waters of pure ice magic. Fire melts away, resilience freezes, but clarity of glass finds harmony.",
        discovered: false
    }
};

let loreHotspots = [];
let weatherParticles = null;
let narrativeTimer = 0;

// ============================================================================
// THREE.JS SETUP
// ============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// ============================================================================
// LIGHTING
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
scene.add(directionalLight);

// ============================================================================
// INPUT HANDLING
// ============================================================================
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// ============================================================================
// GAME OBJECTS
// ============================================================================
let playerBall = null;
let selectableBalls = [];
let sceneObjects = [];
let particles = [];
let fragments = [];
let ripples = [];
let trailParticles = [];

// ============================================================================
// UI ELEMENTS
// ============================================================================
const ballTypeText = document.getElementById('ball-type-text');
const sceneText = document.getElementById('scene-text');
const restartBtn = document.getElementById('restart-btn');
const loadingScreen = document.getElementById('loading-screen');
const musicBtn = document.getElementById('music-btn');

// Create fade overlay
const fadeOverlay = document.createElement('div');
fadeOverlay.id = 'fade-overlay';
document.body.appendChild(fadeOverlay);

// Create message display
const messageDiv = document.createElement('div');
messageDiv.id = 'message';
document.body.appendChild(messageDiv);

// Create lore popup display
const lorePopup = document.createElement('div');
lorePopup.id = 'lore-popup';
lorePopup.className = 'hidden';
lorePopup.innerHTML = `
    <div class="lore-content">
        <h4 id="lore-title"></h4>
        <p id="lore-text"></p>
        <button id="lore-close">Close</button>
    </div>
`;
document.body.appendChild(lorePopup);

// Create atmospheric narration display
const atmosphericText = document.createElement('div');
atmosphericText.id = 'atmospheric-text';
document.body.appendChild(atmosphericText);

// Create wind indicator
const windIndicator = document.createElement('div');
windIndicator.id = 'wind-indicator';
windIndicator.innerHTML = 'Wind: <span id="wind-level">Calm</span>';
document.body.appendChild(windIndicator);

// Create resource panel
const resourcePanel = document.createElement('div');
resourcePanel.id = 'resource-panel';
resourcePanel.innerHTML = `
    <div class="resource-title">Resources</div>
    <div class="resource-item">
        <span class="resource-label">Energy</span>
        <div class="resource-bar">
            <div id="energy-bar" class="resource-fill energy"></div>
        </div>
        <span id="energy-value" class="resource-value">100</span>
    </div>
    <div class="resource-item">
        <span class="resource-label">Stability</span>
        <div class="resource-bar">
            <div id="stability-bar" class="resource-fill stability"></div>
        </div>
        <span id="stability-value" class="resource-value">100</span>
    </div>
    <div class="resource-item">
        <span class="resource-label">Harmony</span>
        <div class="resource-bar">
            <div id="harmony-bar" class="resource-fill harmony"></div>
        </div>
        <span id="harmony-value" class="resource-value">50</span>
    </div>
`;
document.body.appendChild(resourcePanel);

// Create ending screen
const endingScreen = document.createElement('div');
endingScreen.id = 'ending-screen';
endingScreen.innerHTML = `
    <div id="ending-title" class="ending-title"></div>
    <div id="ending-description" class="ending-description"></div>
    <div class="ending-stats">
        <p>Scenes Survived: <span id="stat-survived">0</span></p>
        <p>Total Falls: <span id="stat-deaths">0</span></p>
        <p>Lore Discovered: <span id="stat-lore">0</span></p>
        <p>Final Energy: <span id="stat-energy">0</span></p>
        <p>Final Stability: <span id="stat-stability">0</span></p>
        <p>Final Harmony: <span id="stat-harmony">0</span></p>
    </div>
    <button id="ending-restart">Play Again</button>
`;
document.body.appendChild(endingScreen);

// Ending restart button handler
document.getElementById('ending-restart').addEventListener('click', () => {
    endingScreen.classList.remove('show');
    resetGame();
});

// Lore popup close handler
document.getElementById('lore-close').addEventListener('click', () => {
    lorePopup.classList.add('hidden');
    gameState.inputEnabled = true;
});

// ============================================================================
// NARRATIVE SYSTEM FUNCTIONS
// ============================================================================
function showAtmosphericText(text, duration = 3000) {
    atmosphericText.textContent = text;
    atmosphericText.classList.add('show');
    setTimeout(() => {
        atmosphericText.classList.remove('show');
    }, duration);
}

function showLorePopup(loreKey) {
    if (!LORE_DATA[loreKey]) return;

    const lore = LORE_DATA[loreKey];
    document.getElementById('lore-title').textContent = lore.title;
    document.getElementById('lore-text').textContent = lore.text;
    lorePopup.classList.remove('hidden');

    if (!lore.discovered) {
        lore.discovered = true;
        choiceState.exploredLore.push(loreKey);
        showMessage(`Lore Discovered: ${lore.title}`);
    }

    gameState.inputEnabled = false;
}

function updateWindIndicator() {
    const windLevel = document.getElementById('wind-level');
    if (choiceState.windStrength < 20) {
        windLevel.textContent = 'Calm';
        windLevel.style.color = '#81c784';
    } else if (choiceState.windStrength < 50) {
        windLevel.textContent = 'Breezy';
        windLevel.style.color = '#ffd54f';
    } else if (choiceState.windStrength < 80) {
        windLevel.textContent = 'Strong';
        windLevel.style.color = '#ff9800';
    } else {
        windLevel.textContent = 'Storm';
        windLevel.style.color = '#f44336';
    }
}

function updateResourceUI() {
    // Clamp values between 0 and 100
    resources.energy = Math.max(0, Math.min(100, resources.energy));
    resources.stability = Math.max(0, Math.min(100, resources.stability));
    resources.harmony = Math.max(0, Math.min(100, resources.harmony));

    // Update bars
    document.getElementById('energy-bar').style.width = resources.energy + '%';
    document.getElementById('stability-bar').style.width = resources.stability + '%';
    document.getElementById('harmony-bar').style.width = resources.harmony + '%';

    // Update values
    document.getElementById('energy-value').textContent = Math.round(resources.energy);
    document.getElementById('stability-value').textContent = Math.round(resources.stability);
    document.getElementById('harmony-value').textContent = Math.round(resources.harmony);

    // Color coding based on levels
    const energyBar = document.getElementById('energy-bar');
    const stabilityBar = document.getElementById('stability-bar');
    const harmonyBar = document.getElementById('harmony-bar');

    // Energy color
    if (resources.energy < 30) energyBar.style.background = '#f44336';
    else if (resources.energy < 60) energyBar.style.background = '#ff9800';
    else energyBar.style.background = '#4caf50';

    // Stability color
    if (resources.stability < 30) stabilityBar.style.background = '#f44336';
    else if (resources.stability < 60) stabilityBar.style.background = '#ff9800';
    else stabilityBar.style.background = '#2196f3';

    // Harmony color
    if (resources.harmony < 30) harmonyBar.style.background = '#f44336';
    else if (resources.harmony < 70) harmonyBar.style.background = '#9c27b0';
    else harmonyBar.style.background = '#e91e63';
}

function modifyResources(energyDelta, stabilityDelta, harmonyDelta) {
    resources.energy += energyDelta;
    resources.stability += stabilityDelta;
    resources.harmony += harmonyDelta;
    updateResourceUI();

    // Check for ending conditions
    checkEndingCondition();
}

function checkEndingCondition() {
    // Trigger ending after 3 survived scenes or if resources are critically low/high
    const totalExperiences = choiceState.survivedScenes + choiceState.totalDeaths;

    if (totalExperiences >= 3) {
        setTimeout(() => {
            determineEnding();
        }, 2000);
    }
}

function determineEnding() {
    let endingType = 'neutral';
    let title = '';
    let description = '';
    let titleColor = '#fff';

    // Calculate overall performance
    const avgResource = (resources.energy + resources.stability + resources.harmony) / 3;
    const survivalRate = choiceState.survivedScenes / Math.max(1, choiceState.survivedScenes + choiceState.totalDeaths);

    if (survivalRate >= 0.66 && avgResource >= 70) {
        // Enlightened Ending - High survival, good resources
        endingType = 'enlightened';
        title = 'Enlightened Traveler';
        description = 'Through wisdom and careful choices, you have mastered the art of transformation. Your journey through the realms has strengthened your essence, achieving perfect harmony between energy, stability, and the world around you. The paths are no longer mysteries, but familiar friends.';
        titleColor = '#ffd700';
    } else if (survivalRate <= 0.33 || avgResource <= 30) {
        // Shattered Ending - Low survival or depleted resources
        endingType = 'shattered';
        title = 'Shattered Essence';
        description = 'The realms have taken their toll. Each transformation pushed you further from your core, and the void has claimed more than you could spare. Your essence is scattered across dimensions, a cautionary tale for future travelers. Perhaps another path awaits...';
        titleColor = '#f44336';
    } else {
        // Wanderer Ending - Mixed results
        endingType = 'wanderer';
        title = 'Eternal Wanderer';
        description = 'Neither master nor victim, you walk the middle path. Some victories, some losses, but always moving forward. The realms respect your persistence, and though harmony eludes you, your journey continues. There are still secrets to uncover...';
        titleColor = '#64b5f6';
    }

    showEnding(title, description, titleColor);
}

function showEnding(title, description, titleColor) {
    gameState.inputEnabled = false;

    // Update ending screen content
    const endingTitle = document.getElementById('ending-title');
    endingTitle.textContent = title;
    endingTitle.style.color = titleColor;

    document.getElementById('ending-description').textContent = description;

    // Update stats
    document.getElementById('stat-survived').textContent = choiceState.survivedScenes;
    document.getElementById('stat-deaths').textContent = choiceState.totalDeaths;
    document.getElementById('stat-lore').textContent = choiceState.exploredLore.length;
    document.getElementById('stat-energy').textContent = Math.round(resources.energy);
    document.getElementById('stat-stability').textContent = Math.round(resources.stability);
    document.getElementById('stat-harmony').textContent = Math.round(resources.harmony);

    // Show the ending screen
    endingScreen.classList.add('show');
}

function resetGame() {
    // Reset all game state
    gameState.currentBallType = BALL_TYPES.INITIAL;
    gameState.currentScene = SCENES.A;
    gameState.inputEnabled = true;
    gameState.isTransitioning = false;
    gameState.velocity.set(0, 0, 0);
    gameState.onGround = true;

    // Reset choice state
    choiceState.ballsChosen = [];
    choiceState.holesEntered = [];
    choiceState.survivedScenes = 0;
    choiceState.totalDeaths = 0;
    choiceState.exploredLore = [];
    choiceState.atmosphericIntensity = 0;
    choiceState.windStrength = 0;
    choiceState.stormApproaching = false;

    // Reset resources
    resources.energy = 100;
    resources.stability = 100;
    resources.harmony = 50;
    updateResourceUI();

    // Reset visual state
    visualState.cameraShakeIntensity = 0;
    visualState.idleAnimationPhase = 0;
    scene.fog = null;

    // Reset lore discovery
    Object.keys(LORE_DATA).forEach(key => {
        LORE_DATA[key].discovered = false;
    });

    // Reset wind indicator
    updateWindIndicator();

    // Restart Scene A
    createSceneA();
}

function triggerAtmosphericEvent(eventType) {
    switch (eventType) {
        case 'storm_approaching':
            choiceState.stormApproaching = true;
            showAtmosphericText('Dark clouds gather on the horizon...', 4000);
            choiceState.windStrength = Math.min(100, choiceState.windStrength + 30);
            updateWindIndicator();
            break;
        case 'calm_before':
            showAtmosphericText('An eerie stillness fills the air...', 3000);
            choiceState.windStrength = 0;
            updateWindIndicator();
            break;
        case 'tension_rising':
            showAtmosphericText('You sense something watching from the shadows...', 3500);
            choiceState.atmosphericIntensity += 20;
            break;
        case 'relief':
            showAtmosphericText('A wave of warmth washes over you...', 3000);
            choiceState.atmosphericIntensity = Math.max(0, choiceState.atmosphericIntensity - 30);
            break;
    }
}

// ============================================================================
// VISUAL ENHANCEMENT SYSTEM
// ============================================================================
function setWeatherLighting(preset) {
    switch (preset) {
        case 'day':
            visualState.targetLightIntensity = 1.0;
            visualState.targetAmbientIntensity = 0.4;
            visualState.targetLightColor.setHex(0xffffff);
            visualState.targetAmbientColor.setHex(0xffffff);
            visualState.targetFogDensity = 0;
            visualState.timeOfDay = 'day';
            break;
        case 'dusk':
            visualState.targetLightIntensity = 0.7;
            visualState.targetAmbientIntensity = 0.3;
            visualState.targetLightColor.setHex(0xffa07a);
            visualState.targetAmbientColor.setHex(0xffe4b5);
            visualState.targetFogDensity = 0.01;
            visualState.timeOfDay = 'dusk';
            break;
        case 'storm':
            visualState.targetLightIntensity = 0.4;
            visualState.targetAmbientIntensity = 0.2;
            visualState.targetLightColor.setHex(0x8888aa);
            visualState.targetAmbientColor.setHex(0x666688);
            visualState.targetFogDensity = 0.03;
            visualState.timeOfDay = 'storm';
            break;
        case 'cold':
            visualState.targetLightIntensity = 0.8;
            visualState.targetAmbientIntensity = 0.35;
            visualState.targetLightColor.setHex(0xaaddff);
            visualState.targetAmbientColor.setHex(0xccddff);
            visualState.targetFogDensity = 0.015;
            visualState.timeOfDay = 'cold';
            break;
        case 'warm':
            visualState.targetLightIntensity = 1.1;
            visualState.targetAmbientIntensity = 0.45;
            visualState.targetLightColor.setHex(0xffddaa);
            visualState.targetAmbientColor.setHex(0xffeedd);
            visualState.targetFogDensity = 0.005;
            visualState.timeOfDay = 'warm';
            break;
    }
}

function updateLightingTransitions() {
    const lerpSpeed = 0.02;

    // Smooth transition for light intensities
    visualState.currentLightIntensity += (visualState.targetLightIntensity - visualState.currentLightIntensity) * lerpSpeed;
    visualState.currentAmbientIntensity += (visualState.targetAmbientIntensity - visualState.currentAmbientIntensity) * lerpSpeed;

    // Apply to lights
    directionalLight.intensity = visualState.currentLightIntensity;
    ambientLight.intensity = visualState.currentAmbientIntensity;

    // Smooth color transitions
    visualState.currentLightColor.lerp(visualState.targetLightColor, lerpSpeed);
    visualState.currentAmbientColor.lerp(visualState.targetAmbientColor, lerpSpeed);

    directionalLight.color.copy(visualState.currentLightColor);
    ambientLight.color.copy(visualState.currentAmbientColor);

    // Smooth fog transition
    visualState.currentFogDensity += (visualState.targetFogDensity - visualState.currentFogDensity) * lerpSpeed;

    if (visualState.currentFogDensity > 0.001) {
        if (!scene.fog) {
            scene.fog = new THREE.FogExp2(0x888888, visualState.currentFogDensity);
        }
        scene.fog.density = visualState.currentFogDensity;
        // Tint fog color based on lighting
        scene.fog.color.lerp(visualState.currentAmbientColor, 0.5);
    } else if (scene.fog) {
        scene.fog = null;
    }
}

function createBackgroundEnvironment() {
    // Clear existing background objects
    backgroundObjects.forEach(obj => scene.remove(obj));
    backgroundObjects = [];

    // Create distant mountains (low-poly for performance)
    const mountainColors = [0x5d6d7e, 0x566573, 0x4d5656];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 80 + Math.random() * 20;
        const height = 15 + Math.random() * 25;

        const mountainGeometry = new THREE.ConeGeometry(12 + Math.random() * 8, height, 6);
        const mountainMaterial = new THREE.MeshLambertMaterial({
            color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
            flatShading: true
        });
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);

        mountain.position.set(
            Math.cos(angle) * distance,
            height / 2 - 5,
            Math.sin(angle) * distance
        );
        mountain.rotation.y = Math.random() * Math.PI;

        scene.add(mountain);
        backgroundObjects.push(mountain);
    }

    // Create simple buildings/structures for scale
    const buildingPositions = [
        { x: -60, z: -40 },
        { x: 50, z: -55 },
        { x: -45, z: 60 },
        { x: 65, z: 35 }
    ];

    buildingPositions.forEach(pos => {
        const buildingHeight = 8 + Math.random() * 12;
        const buildingGeometry = new THREE.BoxGeometry(4, buildingHeight, 4);
        const buildingMaterial = new THREE.MeshLambertMaterial({
            color: 0x424242,
            flatShading: true
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(pos.x, buildingHeight / 2, pos.z);
        building.castShadow = true;
        scene.add(building);
        backgroundObjects.push(building);
    });

    // Add floating clouds
    for (let i = 0; i < 6; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 120,
            25 + Math.random() * 15,
            (Math.random() - 0.5) * 120
        );
        cloud.userData.driftSpeed = (Math.random() - 0.5) * 0.02;
        scene.add(cloud);
        backgroundObjects.push(cloud);
    }
}

function createCloud() {
    const cloudGroup = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });

    // Create cloud from multiple spheres
    for (let i = 0; i < 5; i++) {
        const size = 2 + Math.random() * 3;
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 6),
            cloudMaterial
        );
        sphere.position.set(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 6
        );
        cloudGroup.add(sphere);
    }

    return cloudGroup;
}

function updateBackgroundAnimations() {
    backgroundObjects.forEach(obj => {
        // Animate clouds
        if (obj.userData.driftSpeed !== undefined) {
            obj.position.x += obj.userData.driftSpeed;
            // Wrap around
            if (obj.position.x > 70) obj.position.x = -70;
            if (obj.position.x < -70) obj.position.x = 70;
        }
    });
}

function updateBallIdleAnimation() {
    if (!playerBall || !gameState.inputEnabled) return;

    // Only animate when not moving
    const isMoving = gameState.velocity.length() > 0.01;

    if (!isMoving) {
        visualState.idleAnimationPhase += 0.05;

        // Subtle breathing/pulse animation
        const pulseScale = 1 + Math.sin(visualState.idleAnimationPhase) * 0.02;
        playerBall.scale.setScalar(pulseScale);

        // Gentle hover effect
        const hoverOffset = Math.sin(visualState.idleAnimationPhase * 0.5) * 0.05;
        playerBall.position.y = Math.max(BALL_RADIUS, playerBall.position.y + hoverOffset * 0.1);
    } else {
        // Reset scale when moving
        playerBall.scale.setScalar(1);
    }
}

function applyCameraShake() {
    if (visualState.cameraShakeIntensity <= 0) return;

    const shakeX = (Math.random() - 0.5) * visualState.cameraShakeIntensity * 0.3;
    const shakeY = (Math.random() - 0.5) * visualState.cameraShakeIntensity * 0.2;
    const shakeZ = (Math.random() - 0.5) * visualState.cameraShakeIntensity * 0.3;

    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.position.z += shakeZ;

    // Decay shake intensity
    visualState.cameraShakeIntensity *= 0.95;
    if (visualState.cameraShakeIntensity < 0.01) {
        visualState.cameraShakeIntensity = 0;
    }
}

function triggerCameraShake(intensity = 1) {
    visualState.cameraShakeIntensity = Math.min(3, visualState.cameraShakeIntensity + intensity);
}

function updateWeatherBasedEffects() {
    // Apply camera shake during strong winds
    if (choiceState.windStrength > 60) {
        if (Math.random() < 0.02) {
            triggerCameraShake(choiceState.windStrength / 100);
        }
    }

    // Automatically adjust lighting based on atmospheric intensity
    if (choiceState.stormApproaching && visualState.timeOfDay !== 'storm') {
        setWeatherLighting('storm');
    }
}

function createLoreHotspot(position, loreKey, color = 0xffeb3b) {
    // Create glowing orb as hotspot
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
    });
    const hotspot = new THREE.Mesh(geometry, material);
    hotspot.position.copy(position);
    hotspot.userData.isLoreHotspot = true;
    hotspot.userData.loreKey = loreKey;
    hotspot.userData.pulsePhase = Math.random() * Math.PI * 2;

    // Add outer glow
    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    hotspot.add(glow);

    scene.add(hotspot);
    loreHotspots.push(hotspot);
    sceneObjects.push(hotspot);

    return hotspot;
}

function updateLoreHotspots() {
    const time = Date.now() * 0.003;
    loreHotspots.forEach(hotspot => {
        // Pulse animation
        const pulse = Math.sin(time + hotspot.userData.pulsePhase) * 0.3 + 1;
        hotspot.scale.setScalar(pulse);
        hotspot.material.opacity = 0.4 + Math.sin(time + hotspot.userData.pulsePhase) * 0.3;
    });
}

function checkLoreHotspotCollision() {
    if (!playerBall || !gameState.inputEnabled) return;

    for (let i = loreHotspots.length - 1; i >= 0; i--) {
        const hotspot = loreHotspots[i];
        const distance = playerBall.position.distanceTo(hotspot.position);

        if (distance < BALL_RADIUS + 1) {
            showLorePopup(hotspot.userData.loreKey);
            // Remove hotspot after discovery
            scene.remove(hotspot);
            loreHotspots.splice(i, 1);
            break;
        }
    }
}

function createWeatherParticles(type = 'dust') {
    if (weatherParticles) {
        scene.remove(weatherParticles);
    }

    const particleCount = type === 'snow' ? 800 : 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount); // For smooth motion

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

        if (type === 'snow') {
            // Slower, more gentle snow motion
            velocities[i * 3] = (Math.random() - 0.5) * 0.03;
            velocities[i * 3 + 1] = -Math.random() * 0.03 - 0.01;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
        } else {
            velocities[i * 3] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 1] = -Math.random() * 0.05 - 0.02;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }

        // Random phase for varied motion
        phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData.velocities = velocities;
    geometry.userData.phases = phases;
    geometry.userData.time = 0;

    const color = type === 'snow' ? 0xffffff : type === 'dust' ? 0xd4c4a8 : 0x888888;
    const material = new THREE.PointsMaterial({
        size: type === 'snow' ? 0.2 : 0.12,
        color: color,
        transparent: true,
        opacity: type === 'snow' ? 0.8 : 0.6,
        sizeAttenuation: true
    });

    weatherParticles = new THREE.Points(geometry, material);
    weatherParticles.userData.type = type;
    scene.add(weatherParticles);
}

function updateWeatherParticles() {
    if (!weatherParticles) return;

    const positions = weatherParticles.geometry.attributes.position.array;
    const velocities = weatherParticles.geometry.userData.velocities;
    const phases = weatherParticles.geometry.userData.phases;
    const windEffect = choiceState.windStrength / 100;
    const isSnow = weatherParticles.userData.type === 'snow';

    // Increment time for smooth animation
    weatherParticles.geometry.userData.time += 0.02;
    const time = weatherParticles.geometry.userData.time;

    for (let i = 0; i < positions.length / 3; i++) {
        const idx = i * 3;

        if (isSnow) {
            // Smooth swaying motion for snow using sine waves
            const phase = phases[i];
            const swayX = Math.sin(time + phase) * 0.02;
            const swayZ = Math.cos(time * 0.7 + phase) * 0.015;

            positions[idx] += velocities[idx] + windEffect * 0.05 + swayX;
            positions[idx + 1] += velocities[idx + 1];
            positions[idx + 2] += velocities[idx + 2] + swayZ;
        } else {
            positions[idx] += velocities[idx] + windEffect * 0.1;
            positions[idx + 1] += velocities[idx + 1];
            positions[idx + 2] += velocities[idx + 2];
        }

        // Reset particle if it falls below ground
        if (positions[idx + 1] < 0) {
            positions[idx + 1] = 40;
            positions[idx] = (Math.random() - 0.5) * 80;
            positions[idx + 2] = (Math.random() - 0.5) * 80;
        }

        // Wrap around boundaries
        if (positions[idx] > 40) positions[idx] = -40;
        if (positions[idx] < -40) positions[idx] = 40;
        if (positions[idx + 2] > 40) positions[idx + 2] = -40;
        if (positions[idx + 2] < -40) positions[idx + 2] = 40;
    }

    weatherParticles.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// AUDIO SYSTEM
// ============================================================================
let backgroundMusic = null;
let musicPlaying = false;

// Configuration for custom music
// To use your own music, place your audio file in the assets folder
// Supported formats: MP3, OGG, WAV
// Example: assets/background-music.mp3
const MUSIC_FILE = 'assets/1-13. Wet Hands.mp3'; // Change this to your music file path
const MUSIC_VOLUME = 0.5; // Volume from 0.0 to 1.0

function initAudio() {
    if (!backgroundMusic) {
        backgroundMusic = new Audio(MUSIC_FILE);
        backgroundMusic.loop = true; // Loop the music
        backgroundMusic.volume = MUSIC_VOLUME;

        // Handle audio loading errors
        backgroundMusic.addEventListener('error', (e) => {
            console.warn('Could not load music file:', MUSIC_FILE);
            console.warn('Falling back to procedural music');
            useFallbackMusic();
        });

        // Update button when music ends (if not looping)
        backgroundMusic.addEventListener('ended', () => {
            if (!backgroundMusic.loop) {
                musicPlaying = false;
                musicBtn.textContent = '🔇 Music Off';
                musicBtn.classList.remove('playing');
            }
        });
    }
}

// Fallback procedural music if no file is found
let audioContext = null;
let musicNodes = [];
let usingFallback = false;

function useFallbackMusic() {
    usingFallback = true;
}

function createOscillator(freq, type = 'sine', gain = 0.1) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime);

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return { osc, gainNode };
}

function startFallbackMusic() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const notes = [261.63, 329.63, 392.00, 523.25];
    const bassNotes = [130.81, 164.81, 196.00];

    const pad1 = createOscillator(notes[0], 'sine', 0.05);
    const pad2 = createOscillator(notes[1], 'sine', 0.04);
    const pad3 = createOscillator(notes[2], 'sine', 0.03);
    const bass = createOscillator(bassNotes[0], 'triangle', 0.06);

    pad1.osc.start();
    pad2.osc.start();
    pad3.osc.start();
    bass.osc.start();

    musicNodes = [pad1, pad2, pad3, bass];

    let noteIndex = 0;
    const musicInterval = setInterval(() => {
        if (!musicPlaying) {
            clearInterval(musicInterval);
            return;
        }

        noteIndex = (noteIndex + 1) % notes.length;
        const bassIndex = noteIndex % bassNotes.length;
        const now = audioContext.currentTime;

        pad1.osc.frequency.linearRampToValueAtTime(notes[noteIndex], now + 2);
        pad2.osc.frequency.linearRampToValueAtTime(notes[(noteIndex + 1) % notes.length], now + 2);
        pad3.osc.frequency.linearRampToValueAtTime(notes[(noteIndex + 2) % notes.length], now + 2);
        bass.osc.frequency.linearRampToValueAtTime(bassNotes[bassIndex], now + 2);
    }, 4000);
}

function stopFallbackMusic() {
    musicNodes.forEach(node => {
        const now = audioContext.currentTime;
        node.gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        setTimeout(() => {
            node.osc.stop();
        }, 600);
    });
    musicNodes = [];
}

function startMusic() {
    if (musicPlaying) return;

    initAudio();

    if (usingFallback) {
        startFallbackMusic();
    } else {
        backgroundMusic.play().catch(err => {
            console.warn('Audio play failed:', err);
            useFallbackMusic();
            startFallbackMusic();
        });
    }

    musicPlaying = true;
    musicBtn.textContent = '🔊 Music On';
    musicBtn.classList.add('playing');
}

function stopMusic() {
    if (!musicPlaying) return;

    if (usingFallback) {
        stopFallbackMusic();
    } else if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }

    musicPlaying = false;
    musicBtn.textContent = '🔇 Music Off';
    musicBtn.classList.remove('playing');
}

function toggleMusic() {
    if (musicPlaying) {
        stopMusic();
    } else {
        startMusic();
    }
}

// Music button event listener
musicBtn.addEventListener('click', toggleMusic);

// ============================================================================
// BALL CREATION FUNCTIONS
// ============================================================================
function createInitialBall(position = new THREE.Vector3(0, BALL_RADIUS, 0)) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x90a4ae,
        roughness: 0.5,
        metalness: 0.3
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.copy(position);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.userData.type = BALL_TYPES.INITIAL;
    return ball;
}

function createFireBall(position = new THREE.Vector3(0, BALL_RADIUS, 0)) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff3d00,
        roughness: 0.3,
        metalness: 0.1,
        emissive: 0xff5722,
        emissiveIntensity: 0.3
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.copy(position);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.userData.type = BALL_TYPES.FIRE;
    ball.userData.particles = createFireParticles(ball);
    return ball;
}

function createFireParticles(parent) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = Math.random() * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

        colors[i * 3] = 1;
        colors[i * 3 + 1] = Math.random() * 0.5;
        colors[i * 3 + 2] = 0;

        sizes[i] = Math.random() * 0.3 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    parent.add(points);
    return points;
}

function createGlassBall(position = new THREE.Vector3(0, BALL_RADIUS, 0)) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        ior: 1.5
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.copy(position);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.userData.type = BALL_TYPES.GLASS;
    return ball;
}

function createBouncyBall(position = new THREE.Vector3(0, BALL_RADIUS, 0)) {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x00ff00,
        emissiveIntensity: 0.2
    });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.copy(position);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.userData.type = BALL_TYPES.BOUNCY;

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(BALL_RADIUS * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    ball.add(glow);
    ball.userData.glow = glow;

    return ball;
}

function createBallByType(type, position) {
    switch (type) {
        case BALL_TYPES.FIRE:
            return createFireBall(position);
        case BALL_TYPES.GLASS:
            return createGlassBall(position);
        case BALL_TYPES.BOUNCY:
            return createBouncyBall(position);
        default:
            return createInitialBall(position);
    }
}

// ============================================================================
// SCENE CREATION FUNCTIONS
// ============================================================================
function clearScene() {
    // Remove all scene objects
    sceneObjects.forEach(obj => scene.remove(obj));
    sceneObjects = [];

    // Remove selectable balls
    selectableBalls.forEach(ball => scene.remove(ball));
    selectableBalls = [];

    // Clear particles, fragments, ripples
    particles.forEach(p => scene.remove(p));
    particles = [];
    fragments.forEach(f => scene.remove(f));
    fragments = [];
    ripples.forEach(r => scene.remove(r));
    ripples = [];

    // Clear trail particles
    trailParticles.forEach(t => scene.remove(t));
    trailParticles = [];

    // Clear lore hotspots
    loreHotspots = [];

    // Clear weather particles
    if (weatherParticles) {
        scene.remove(weatherParticles);
        weatherParticles = null;
    }

    // Remove player ball
    if (playerBall) {
        scene.remove(playerBall);
        playerBall = null;
    }
}

function createSceneA() {
    clearScene();
    gameState.currentScene = SCENES.A;
    scene.background = new THREE.Color(0x87ceeb);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x8fbc8f,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    sceneObjects.push(ground);

    // Create player ball (Initial)
    playerBall = createInitialBall(new THREE.Vector3(0, BALL_RADIUS, 0));
    scene.add(playerBall);
    gameState.currentBallType = BALL_TYPES.INITIAL;

    // Create selectable balls
    const fireBall = createFireBall(new THREE.Vector3(-5, BALL_RADIUS, 0));
    fireBall.userData.selectable = true;
    scene.add(fireBall);
    selectableBalls.push(fireBall);

    const glassBall = createGlassBall(new THREE.Vector3(5, BALL_RADIUS, 0));
    glassBall.userData.selectable = true;
    scene.add(glassBall);
    selectableBalls.push(glassBall);

    const bouncyBall = createBouncyBall(new THREE.Vector3(0, BALL_RADIUS, -5));
    bouncyBall.userData.selectable = true;
    scene.add(bouncyBall);
    selectableBalls.push(bouncyBall);

    // Create ramp/path indicator to Scene B (in front of player)
    const rampGeometry = new THREE.BoxGeometry(10, 0.2, 20);
    const rampMaterial = new THREE.MeshStandardMaterial({
        color: 0x795548,
        emissive: 0x4e342e,
        emissiveIntensity: 0.2
    });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.position.set(0, 0.1, -18);
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    scene.add(ramp);
    sceneObjects.push(ramp);

    // Add indicator for Scene B
    const arrowGeometry = new THREE.ConeGeometry(1, 3, 4);
    const arrowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd54f,
        emissive: 0xffab00,
        emissiveIntensity: 0.3
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(0, 3, -20);
    arrow.rotation.x = -Math.PI / 2;
    scene.add(arrow);
    sceneObjects.push(arrow);

    // Portal visual for Scene B entrance
    const portalGeometry = new THREE.TorusGeometry(3, 0.3, 16, 32);
    const portalMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c6bc0,
        emissive: 0x3f51b5,
        emissiveIntensity: 0.5
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.position.set(0, 3, -24);
    portal.rotation.x = Math.PI / 2;
    scene.add(portal);
    sceneObjects.push(portal);

    // Trigger zone for Scene B (at ground level where ball can reach)
    const triggerGeometry = new THREE.BoxGeometry(8, 4, 4);
    const triggerMaterial = new THREE.MeshBasicMaterial({
        visible: false
    });
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0, 2, -24);
    trigger.userData.isTrigger = true;
    trigger.userData.targetScene = SCENES.B;
    scene.add(trigger);
    sceneObjects.push(trigger);

    // Add lore hotspots near selectable balls
    if (!LORE_DATA.fire_origin.discovered) {
        createLoreHotspot(new THREE.Vector3(-7, 1.5, 2), 'fire_origin', 0xff5722);
    }
    if (!LORE_DATA.glass_mystery.discovered) {
        createLoreHotspot(new THREE.Vector3(7, 1.5, 2), 'glass_mystery', 0xe0e0e0);
    }
    if (!LORE_DATA.bouncy_legend.discovered) {
        createLoreHotspot(new THREE.Vector3(2, 1.5, -7), 'bouncy_legend', 0x4caf50);
    }

    // Add atmospheric dust particles
    createWeatherParticles('dust');

    // Create background environment (mountains, buildings, clouds)
    createBackgroundEnvironment();

    // Set weather lighting for daytime
    setWeatherLighting('day');

    // Atmospheric intro
    setTimeout(() => {
        showAtmosphericText('The journey begins... Choose your path wisely.', 4000);
    }, 1500);

    updateUI();
}

function createSceneB() {
    clearScene();
    gameState.currentScene = SCENES.B;
    scene.background = new THREE.Color(0x5c6bc0);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(60, 60);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7986cb,
        roughness: 0.7
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    sceneObjects.push(ground);

    // Create player ball with current type (start at back, holes in front)
    playerBall = createBallByType(gameState.currentBallType, new THREE.Vector3(0, BALL_RADIUS, 15));
    scene.add(playerBall);

    // Create three holes (in front of player - negative z direction)
    const holeColors = [0x424242, 0xc62828, 0x1565c0];
    const holePositions = [
        new THREE.Vector3(-10, 0, -10),
        new THREE.Vector3(0, 0, -10),
        new THREE.Vector3(10, 0, -10)
    ];
    const holeScenes = [SCENES.DARK, SCENES.RED, SCENES.BLUE];

    for (let i = 0; i < 3; i++) {
        // Hole visual - smooth circular shape with high segments
        const holeGeometry = new THREE.CylinderGeometry(3, 3, 1, 64);
        const holeMaterial = new THREE.MeshStandardMaterial({
            color: holeColors[i],
            emissive: holeColors[i],
            emissiveIntensity: 0.3
        });
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.position.copy(holePositions[i]);
        hole.position.y = -0.5;
        scene.add(hole);
        sceneObjects.push(hole);

        // Inner ring for visual depth
        const innerRingGeometry = new THREE.TorusGeometry(2.5, 0.3, 16, 64);
        const innerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: holeColors[i],
            emissiveIntensity: 0.1
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.position.copy(holePositions[i]);
        innerRing.position.y = 0.1;
        innerRing.rotation.x = -Math.PI / 2;
        scene.add(innerRing);
        sceneObjects.push(innerRing);

        // Trigger zone - smooth circular cylinder with high segments
        const triggerGeometry = new THREE.CylinderGeometry(2.5, 2.5, 2, 64);
        const triggerMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
        trigger.position.copy(holePositions[i]);
        trigger.userData.isTrigger = true;
        trigger.userData.targetScene = holeScenes[i];
        trigger.userData.isHole = true;
        scene.add(trigger);
        sceneObjects.push(trigger);

        // Label
        const labelGeometry = new THREE.PlaneGeometry(4, 1);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Hole ${i + 1}`, 128, 45);
        const labelTexture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.copy(holePositions[i]);
        label.position.y = 3;
        label.rotation.x = -Math.PI / 4;
        scene.add(label);
        sceneObjects.push(label);
    }

    // Add lore hotspots for realm information
    if (!LORE_DATA.dark_realm.discovered) {
        createLoreHotspot(new THREE.Vector3(-12, 1.5, -8), 'dark_realm', 0x757575);
    }
    if (!LORE_DATA.red_void.discovered) {
        createLoreHotspot(new THREE.Vector3(0, 1.5, -12), 'red_void', 0xef5350);
    }
    if (!LORE_DATA.blue_abyss.discovered) {
        createLoreHotspot(new THREE.Vector3(12, 1.5, -8), 'blue_abyss', 0x42a5f5);
    }

    // Track choice
    choiceState.holesEntered.push('scene_b_visited');

    // Atmospheric tension before choice
    setTimeout(() => {
        triggerAtmosphericEvent('tension_rising');
    }, 2000);

    // Add stronger wind effect
    choiceState.windStrength = 40;
    updateWindIndicator();
    createWeatherParticles('dust');

    // Create background and set dusk lighting for scene B
    createBackgroundEnvironment();
    setWeatherLighting('dusk');

    updateUI();
}

function createDarkScene() {
    clearScene();
    gameState.currentScene = SCENES.DARK;
    scene.background = new THREE.Color(0x212121);

    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x424242,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    sceneObjects.push(ground);

    playerBall = createBallByType(gameState.currentBallType, new THREE.Vector3(0, BALL_RADIUS + 5, 0));
    scene.add(playerBall);

    // Track choice and consequence
    choiceState.holesEntered.push('dark_scene');

    // Atmospheric pacing before effect
    triggerAtmosphericEvent('calm_before');
    setTimeout(() => {
        showAtmosphericText('Darkness consumes all light...', 3000);
    }, 1500);

    // Set storm lighting for dark scene
    setWeatherLighting('storm');
    triggerCameraShake(0.5); // Initial impact shake

    // Handle ball type specific behavior
    handleDarkSceneEffect();

    updateUI();
}

function createRedScene() {
    clearScene();
    gameState.currentScene = SCENES.RED;
    scene.background = new THREE.Color(0xb71c1c);

    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xc62828,
        roughness: 0.6
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    sceneObjects.push(ground);

    playerBall = createBallByType(gameState.currentBallType, new THREE.Vector3(0, BALL_RADIUS + 5, 0));
    scene.add(playerBall);

    // Add exit ramp for Fire Ball
    if (gameState.currentBallType === BALL_TYPES.FIRE) {
        const rampGeometry = new THREE.BoxGeometry(8, 0.5, 12);
        const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
        const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.position.set(0, -2, 15);
        ramp.rotation.x = Math.PI / 10;
        scene.add(ramp);
        sceneObjects.push(ramp);

        const trigger = new THREE.Mesh(
            new THREE.BoxGeometry(8, 2, 2),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trigger.position.set(0, -3, 20);
        trigger.userData.isTrigger = true;
        trigger.userData.targetScene = SCENES.A;
        trigger.userData.resetBall = true;
        scene.add(trigger);
        sceneObjects.push(trigger);
    }

    // Track choice and consequence
    choiceState.holesEntered.push('red_scene');

    // Atmospheric pacing
    triggerAtmosphericEvent('storm_approaching');
    setTimeout(() => {
        showAtmosphericText('The crimson void hungers...', 3000);
    }, 1500);

    // Set warm/hot lighting for red scene
    setWeatherLighting('warm');
    triggerCameraShake(0.8); // Strong entry shake

    handleRedSceneEffect();

    updateUI();
}

function createBlueScene() {
    clearScene();
    gameState.currentScene = SCENES.BLUE;
    scene.background = new THREE.Color(0x0d47a1);

    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1565c0,
        roughness: 0.4
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    sceneObjects.push(ground);

    playerBall = createBallByType(gameState.currentBallType, new THREE.Vector3(0, BALL_RADIUS + 5, 0));
    scene.add(playerBall);

    // Add exit ramp for Glass Ball
    if (gameState.currentBallType === BALL_TYPES.GLASS) {
        const rampGeometry = new THREE.BoxGeometry(8, 0.5, 12);
        const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x546e7a });
        const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
        ramp.position.set(0, -2, 15);
        ramp.rotation.x = Math.PI / 10;
        scene.add(ramp);
        sceneObjects.push(ramp);

        const trigger = new THREE.Mesh(
            new THREE.BoxGeometry(8, 2, 2),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trigger.position.set(0, -3, 20);
        trigger.userData.isTrigger = true;
        trigger.userData.targetScene = SCENES.A;
        trigger.userData.resetBall = true;
        scene.add(trigger);
        sceneObjects.push(trigger);
    }

    // Track choice and consequence
    choiceState.holesEntered.push('blue_scene');

    // Atmospheric pacing - cold and serene
    showAtmosphericText('The icy waters reflect your true nature...', 4000);
    choiceState.windStrength = 10;
    updateWindIndicator();

    // Add snow particles for blue scene
    createWeatherParticles('snow');

    // Set cold lighting for blue scene
    setWeatherLighting('cold');
    triggerCameraShake(0.3); // Gentle entry shake

    handleBlueSceneEffect();

    updateUI();
}

// ============================================================================
// SCENE EFFECTS
// ============================================================================
function handleDarkSceneEffect() {
    if (gameState.currentBallType === BALL_TYPES.GLASS) {
        // Glass Ball shatters
        gameState.inputEnabled = false;
        choiceState.totalDeaths++;
        modifyResources(-20, -50, -10); // Massive stability loss
        setTimeout(() => {
            createShatterEffect(playerBall.position.clone());
            triggerCameraShake(2); // Strong shake on shatter
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Glass Ball Shattered!');
            setTimeout(() => showRestartButton(), 1500);
        }, 1000);
    } else if (gameState.currentBallType === BALL_TYPES.FIRE) {
        // Fire Ball extinguishes
        gameState.inputEnabled = false;
        choiceState.totalDeaths++;
        modifyResources(-30, -10, -15); // Energy drained
        setTimeout(() => {
            createExtinguishEffect(playerBall.position.clone());
            triggerCameraShake(1.5); // Moderate shake on extinguish
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Fire Ball Extinguished!');
            setTimeout(() => showRestartButton(), 1500);
        }, 1000);
    } else if (gameState.currentBallType === BALL_TYPES.BOUNCY) {
        // Bouncy Ball bounces twice then can exit
        choiceState.survivedScenes++;
        modifyResources(5, 10, 15); // Resilience rewarded
        let bounceCount = 0;
        const bounceInterval = setInterval(() => {
            if (bounceCount < 2) {
                gameState.velocity.y = 0.5;
                bounceCount++;
            } else {
                clearInterval(bounceInterval);
                // Add exit
                const ramp = new THREE.Mesh(
                    new THREE.BoxGeometry(8, 0.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0x616161 })
                );
                ramp.position.set(0, -2, 15);
                ramp.rotation.x = Math.PI / 10;
                scene.add(ramp);
                sceneObjects.push(ramp);

                const trigger = new THREE.Mesh(
                    new THREE.BoxGeometry(8, 2, 2),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                trigger.position.set(0, -3, 20);
                trigger.userData.isTrigger = true;
                trigger.userData.targetScene = SCENES.A;
                trigger.userData.resetBall = true;
                scene.add(trigger);
                sceneObjects.push(trigger);

                showMessage('Bouncy Ball survived! Roll to exit.');
            }
        }, 800);
    }
}

function handleRedSceneEffect() {
    if (gameState.currentBallType === BALL_TYPES.GLASS ||
        gameState.currentBallType === BALL_TYPES.BOUNCY) {
        // Glass or Bouncy falls through
        gameState.inputEnabled = false;
        choiceState.totalDeaths++;
        modifyResources(-15, -25, -20); // Lost in the void
        setTimeout(() => {
            createRippleEffect(playerBall.position.clone());
            setTimeout(() => {
                scene.remove(playerBall);
                playerBall = null;
                showMessage('Ball disappeared into the red void!');
                setTimeout(() => transitionToScene(SCENES.A, true), 1500);
            }, 500);
        }, 1000);
    } else if (gameState.currentBallType === BALL_TYPES.FIRE) {
        // Fire Ball survives and can continue moving
        choiceState.survivedScenes++;
        modifyResources(20, 5, 25); // Fire thrives in red
    }
}

function handleBlueSceneEffect() {
    if (gameState.currentBallType === BALL_TYPES.FIRE ||
        gameState.currentBallType === BALL_TYPES.BOUNCY) {
        // Fire or Bouncy disappears instantly
        gameState.inputEnabled = false;
        choiceState.totalDeaths++;
        modifyResources(-25, -15, -30); // Harmony disrupted
        setTimeout(() => {
            createDisappearEffect(playerBall.position.clone());
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Ball vanished instantly!');
            setTimeout(() => transitionToScene(SCENES.A, true), 1500);
        }, 500);
    } else if (gameState.currentBallType === BALL_TYPES.GLASS) {
        // Glass Ball bounces and survives
        choiceState.survivedScenes++;
        modifyResources(10, 15, 30); // Glass finds harmony in blue
        let bounced = false;
        const checkBounce = () => {
            if (!bounced && playerBall && playerBall.position.y <= BALL_RADIUS + 0.1) {
                bounced = true;
                gameState.velocity.y = 0.3;
                showMessage('Glass Ball bounced! Roll to exit.');
            }
        };
        setTimeout(checkBounce, 1000);
    }
}

// ============================================================================
// VISUAL EFFECTS
// ============================================================================
function createShatterEffect(position) {
    const fragmentCount = 30;
    for (let i = 0; i < fragmentCount; i++) {
        const size = Math.random() * 0.3 + 0.1;
        const geometry = new THREE.TetrahedronGeometry(size);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.8,
            transparent: true
        });
        const fragment = new THREE.Mesh(geometry, material);
        fragment.position.copy(position);
        fragment.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        fragment.userData.rotationSpeed = new THREE.Vector3(
            Math.random() * 0.1,
            Math.random() * 0.1,
            Math.random() * 0.1
        );
        fragment.userData.life = 100;
        scene.add(fragment);
        fragments.push(fragment);
    }
}

function createExtinguishEffect(position) {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = position.y + Math.random() * 2;
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;
        colors[i * 3] = 1;
        colors[i * 3 + 1] = Math.random() * 0.3;
        colors[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.userData.life = 60;
    scene.add(points);
    particles.push(points);
}

function createRippleEffect(position) {
    const rippleGeometry = new THREE.RingGeometry(0.1, 0.5, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.position.set(position.x, 0.1, position.z);
    ripple.rotation.x = -Math.PI / 2;
    ripple.userData.life = 60;
    ripple.userData.maxScale = 10;
    scene.add(ripple);
    ripples.push(ripple);
}

function createDisappearEffect(position) {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        color: 0x42a5f5,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.userData.life = 40;
    points.userData.expand = true;
    scene.add(points);
    particles.push(points);
}

// ============================================================================
// TRAIL SYSTEM
// ============================================================================
function getTrailColor(ballType) {
    switch (ballType) {
        case BALL_TYPES.FIRE:
            return 0xff3300; // Red trail
        case BALL_TYPES.GLASS:
            return 0x888888; // Grey trail
        case BALL_TYPES.BOUNCY:
            return 0x00ff00; // Green trail
        default:
            return 0xcccccc; // Default grey
    }
}

function spawnTrailParticle() {
    if (!playerBall || gameState.currentBallType === BALL_TYPES.INITIAL) return;

    // Only spawn trail if ball is moving
    const speed = Math.sqrt(
        gameState.velocity.x * gameState.velocity.x +
        gameState.velocity.z * gameState.velocity.z
    );

    if (speed < 0.005) return; // Don't spawn trail if barely moving

    const trailColor = getTrailColor(gameState.currentBallType);

    // Create a small sphere for the trail particle
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: trailColor,
        transparent: true,
        opacity: 0.7
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.position.copy(playerBall.position);
    particle.position.y = 0.2; // Slightly above ground
    particle.userData.life = 60; // Lifetime in frames
    particle.userData.maxLife = 60;

    scene.add(particle);
    trailParticles.push(particle);

    // Limit trail particles to avoid performance issues
    if (trailParticles.length > 100) {
        const oldParticle = trailParticles.shift();
        scene.remove(oldParticle);
    }
}

function updateTrailParticles() {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        const particle = trailParticles[i];
        particle.userData.life--;

        // Fade out and shrink
        const lifeRatio = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = lifeRatio * 0.7;
        particle.scale.setScalar(lifeRatio);

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            trailParticles.splice(i, 1);
        }
    }
}

function clearTrailParticles() {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        scene.remove(trailParticles[i]);
    }
    trailParticles = [];
}

function updateEffects() {
    // Update fragments
    for (let i = fragments.length - 1; i >= 0; i--) {
        const frag = fragments[i];
        frag.position.add(frag.userData.velocity);
        frag.userData.velocity.y -= 0.01;
        frag.rotation.x += frag.userData.rotationSpeed.x;
        frag.rotation.y += frag.userData.rotationSpeed.y;
        frag.userData.life--;
        frag.material.opacity = frag.userData.life / 100;

        if (frag.userData.life <= 0) {
            scene.remove(frag);
            fragments.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.userData.life--;
        p.material.opacity = p.userData.life / 60;

        if (p.userData.expand) {
            const positions = p.geometry.attributes.position.array;
            for (let j = 0; j < positions.length; j += 3) {
                positions[j] += (Math.random() - 0.5) * 0.2;
                positions[j + 1] += Math.random() * 0.1;
                positions[j + 2] += (Math.random() - 0.5) * 0.2;
            }
            p.geometry.attributes.position.needsUpdate = true;
        }

        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    // Update ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.userData.life--;
        const scale = (60 - r.userData.life) / 60 * r.userData.maxScale;
        r.scale.set(scale, scale, 1);
        r.material.opacity = r.userData.life / 60;

        if (r.userData.life <= 0) {
            scene.remove(r);
            ripples.splice(i, 1);
        }
    }
}

// ============================================================================
// GAME LOGIC
// ============================================================================
function handleMovement() {
    if (!gameState.inputEnabled || !playerBall) return;

    const moveDir = new THREE.Vector3();

    if (keys['w'] || keys['arrowup']) moveDir.z -= 1;
    if (keys['s'] || keys['arrowdown']) moveDir.z += 1;
    if (keys['a'] || keys['arrowleft']) moveDir.x -= 1;
    if (keys['d'] || keys['arrowright']) moveDir.x += 1;

    if (moveDir.length() > 0) {
        moveDir.normalize();
        moveDir.multiplyScalar(MOVE_SPEED);

        gameState.velocity.x += moveDir.x;
        gameState.velocity.z += moveDir.z;

        // Apply friction
        gameState.velocity.x *= 0.95;
        gameState.velocity.z *= 0.95;

        // Rotate ball based on movement
        const rotationAxis = new THREE.Vector3(-moveDir.z, 0, moveDir.x).normalize();
        const rotationAngle = moveDir.length() * ROTATION_SPEED;
        playerBall.rotateOnWorldAxis(rotationAxis, rotationAngle);
    } else {
        // Apply stronger friction when not moving
        gameState.velocity.x *= 0.9;
        gameState.velocity.z *= 0.9;
    }

    // Apply gravity
    if (!gameState.onGround) {
        gameState.velocity.y += GRAVITY;
    }

    // Update position
    playerBall.position.x += gameState.velocity.x;
    playerBall.position.z += gameState.velocity.z;
    playerBall.position.y += gameState.velocity.y;

    // Ground collision
    if (playerBall.position.y < BALL_RADIUS) {
        playerBall.position.y = BALL_RADIUS;
        if (gameState.velocity.y < 0) {
            if (gameState.currentBallType === BALL_TYPES.BOUNCY) {
                gameState.velocity.y *= -BOUNCE_FACTOR;
            } else {
                gameState.velocity.y = 0;
            }
        }
        gameState.onGround = true;
    } else {
        gameState.onGround = false;
    }

    // Boundary check
    const boundary = 25;
    playerBall.position.x = Math.max(-boundary, Math.min(boundary, playerBall.position.x));
    playerBall.position.z = Math.max(-boundary, Math.min(boundary, playerBall.position.z));
}

function checkCollisions() {
    if (!playerBall || gameState.isTransitioning) return;

    // Check selectable balls in Scene A
    if (gameState.currentScene === SCENES.A && gameState.currentBallType === BALL_TYPES.INITIAL) {
        for (let i = selectableBalls.length - 1; i >= 0; i--) {
            const ball = selectableBalls[i];
            const distance = playerBall.position.distanceTo(ball.position);

            if (distance < BALL_RADIUS * 2.2) {
                // Transform into selected ball type
                const newType = ball.userData.type;
                const pos = playerBall.position.clone();

                scene.remove(playerBall);
                playerBall = createBallByType(newType, pos);
                scene.add(playerBall);
                gameState.currentBallType = newType;

                // Track this choice in narrative system
                choiceState.ballsChosen.push(newType);

                // Micro-choice consequences based on ball type
                if (newType === BALL_TYPES.FIRE) {
                    choiceState.atmosphericIntensity += 10;
                    choiceState.windStrength = Math.min(100, choiceState.windStrength + 15);
                    updateWindIndicator();
                    modifyResources(15, -10, 10); // Fire: high energy, less stability, more harmony
                    setTimeout(() => {
                        showAtmosphericText('You feel the heat of determination coursing through you...', 3500);
                    }, 1500);
                } else if (newType === BALL_TYPES.GLASS) {
                    choiceState.atmosphericIntensity -= 5;
                    modifyResources(-5, -15, 20); // Glass: fragile but harmonious
                    setTimeout(() => {
                        showAtmosphericText('Clarity fills your mind, but fragility shadows your path...', 3500);
                    }, 1500);
                } else if (newType === BALL_TYPES.BOUNCY) {
                    choiceState.atmosphericIntensity += 5;
                    modifyResources(10, 20, -5); // Bouncy: resilient and stable
                    setTimeout(() => {
                        showAtmosphericText('Resilience becomes your shield against the unknown...', 3500);
                    }, 1500);
                }

                // Remove all selectable balls
                selectableBalls.forEach(b => scene.remove(b));
                selectableBalls = [];

                showMessage(`Transformed into ${newType.charAt(0).toUpperCase() + newType.slice(1)} Ball!`);
                updateUI();
                break;
            }
        }
    }

    // Check triggers
    sceneObjects.forEach(obj => {
        if (obj.userData.isTrigger) {
            const distance = playerBall.position.distanceTo(obj.position);
            const threshold = obj.userData.isHole ? 2 : 5;

            if (distance < threshold) {
                const targetScene = obj.userData.targetScene;
                const resetBall = obj.userData.resetBall || false;
                transitionToScene(targetScene, resetBall);
            }
        }
    });
}

function updateFireParticles() {
    if (playerBall && playerBall.userData.particles) {
        const positions = playerBall.userData.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2;
            positions[i + 1] = Math.random() * 2;
            positions[i + 2] = (Math.random() - 0.5) * 2;
        }
        playerBall.userData.particles.geometry.attributes.position.needsUpdate = true;
    }
}

function updateBouncyGlow() {
    if (playerBall && playerBall.userData.glow) {
        const time = Date.now() * 0.003;
        playerBall.userData.glow.material.opacity = 0.1 + Math.sin(time) * 0.1;
    }
}

function updateCamera() {
    if (!playerBall) return;

    const targetPosition = new THREE.Vector3(
        playerBall.position.x,
        playerBall.position.y + CAMERA_HEIGHT,
        playerBall.position.z + CAMERA_DISTANCE
    );

    camera.position.lerp(targetPosition, 0.05);
    camera.lookAt(playerBall.position);
}

// ============================================================================
// SCENE TRANSITIONS
// ============================================================================
function transitionToScene(targetScene, resetBall = false) {
    if (gameState.isTransitioning) return;

    gameState.isTransitioning = true;
    gameState.inputEnabled = false;

    // Fade out
    fadeOverlay.style.opacity = '1';

    setTimeout(() => {
        if (resetBall) {
            gameState.currentBallType = BALL_TYPES.INITIAL;
        }

        gameState.velocity.set(0, 0, 0);

        switch (targetScene) {
            case SCENES.A:
                createSceneA();
                break;
            case SCENES.B:
                createSceneB();
                break;
            case SCENES.DARK:
                createDarkScene();
                break;
            case SCENES.RED:
                createRedScene();
                break;
            case SCENES.BLUE:
                createBlueScene();
                break;
        }

        // Fade in
        setTimeout(() => {
            fadeOverlay.style.opacity = '0';
            gameState.isTransitioning = false;
            if (playerBall) {
                gameState.inputEnabled = true;
            }
        }, 100);
    }, 500);
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================
function updateUI() {
    const ballNames = {
        [BALL_TYPES.INITIAL]: 'Initial Ball',
        [BALL_TYPES.FIRE]: 'Fire Ball',
        [BALL_TYPES.GLASS]: 'Glass Ball',
        [BALL_TYPES.BOUNCY]: 'Bouncy Ball'
    };

    const sceneNames = {
        [SCENES.A]: 'Scene A - Selection',
        [SCENES.B]: 'Scene B - Three Holes',
        [SCENES.DARK]: 'Dark Gray Scene',
        [SCENES.RED]: 'Red Scene',
        [SCENES.BLUE]: 'Blue Scene'
    };

    ballTypeText.textContent = ballNames[gameState.currentBallType];
    ballTypeText.className = `ball-${gameState.currentBallType}`;

    sceneText.textContent = sceneNames[gameState.currentScene];
}

function showMessage(text) {
    messageDiv.textContent = text;
    messageDiv.classList.add('show');
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 2000);
}

function showRestartButton() {
    restartBtn.classList.remove('hidden');
}

function hideRestartButton() {
    restartBtn.classList.add('hidden');
}

restartBtn.addEventListener('click', () => {
    hideRestartButton();
    transitionToScene(SCENES.A, true);
});

// ============================================================================
// ANIMATION LOOP
// ============================================================================
let trailSpawnCounter = 0;

function animate() {
    requestAnimationFrame(animate);

    handleMovement();
    checkCollisions();
    updateCamera();
    updateEffects();
    updateFireParticles();
    updateBouncyGlow();

    // Spawn trail particles every 3 frames for smooth trail
    trailSpawnCounter++;
    if (trailSpawnCounter >= 3) {
        spawnTrailParticle();
        trailSpawnCounter = 0;
    }
    updateTrailParticles();

    // Update narrative systems
    updateLoreHotspots();
    checkLoreHotspotCollision();
    updateWeatherParticles();

    // Update visual enhancements
    updateLightingTransitions();
    updateBackgroundAnimations();
    updateBallIdleAnimation();
    applyCameraShake();
    updateWeatherBasedEffects();

    renderer.render(scene, camera);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
    // Hide loading screen
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 1000);

    // Initialize resource UI
    updateResourceUI();
    updateWindIndicator();

    // Initialize Scene A
    createSceneA();

    // Start animation loop
    animate();
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
init();
