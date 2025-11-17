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

// ============================================================================
// UI ELEMENTS
// ============================================================================
const ballTypeText = document.getElementById('ball-type-text');
const sceneText = document.getElementById('scene-text');
const restartBtn = document.getElementById('restart-btn');
const loadingScreen = document.getElementById('loading-screen');

// Create fade overlay
const fadeOverlay = document.createElement('div');
fadeOverlay.id = 'fade-overlay';
document.body.appendChild(fadeOverlay);

// Create message display
const messageDiv = document.createElement('div');
messageDiv.id = 'message';
document.body.appendChild(messageDiv);

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
        setTimeout(() => {
            createShatterEffect(playerBall.position.clone());
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Glass Ball Shattered!');
            setTimeout(() => showRestartButton(), 1500);
        }, 1000);
    } else if (gameState.currentBallType === BALL_TYPES.FIRE) {
        // Fire Ball extinguishes
        gameState.inputEnabled = false;
        setTimeout(() => {
            createExtinguishEffect(playerBall.position.clone());
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Fire Ball Extinguished!');
            setTimeout(() => showRestartButton(), 1500);
        }, 1000);
    } else if (gameState.currentBallType === BALL_TYPES.BOUNCY) {
        // Bouncy Ball bounces twice then can exit
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
        setTimeout(() => {
            createRippleEffect(playerBall.position.clone());
            setTimeout(() => {
                scene.remove(playerBall);
                playerBall = null;
                showMessage('Ball disappeared into the red void!');
                setTimeout(() => transitionToScene(SCENES.A, true), 1500);
            }, 500);
        }, 1000);
    }
    // Fire Ball can continue moving
}

function handleBlueSceneEffect() {
    if (gameState.currentBallType === BALL_TYPES.FIRE ||
        gameState.currentBallType === BALL_TYPES.BOUNCY) {
        // Fire or Bouncy disappears instantly
        gameState.inputEnabled = false;
        setTimeout(() => {
            createDisappearEffect(playerBall.position.clone());
            scene.remove(playerBall);
            playerBall = null;
            showMessage('Ball vanished instantly!');
            setTimeout(() => transitionToScene(SCENES.A, true), 1500);
        }, 500);
    } else if (gameState.currentBallType === BALL_TYPES.GLASS) {
        // Glass Ball bounces
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
function animate() {
    requestAnimationFrame(animate);

    handleMovement();
    checkCollisions();
    updateCamera();
    updateEffects();
    updateFireParticles();
    updateBouncyGlow();

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
