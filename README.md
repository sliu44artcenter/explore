# 3D Rolling Ball Game

A third-person 3D rolling ball interaction game built with Three.js. Features multiple scenes, ball-type transformations, and unique interactions based on ball properties.

## Play the Game

Simply open `index.html` in a modern web browser, or deploy to GitHub Pages for online play.

## Controls

- **WASD** or **Arrow Keys** - Roll the ball
- **Mouse** - Camera follows automatically in third-person view

## Game Mechanics

### Scene A - Initial Scene

You start as an **Initial Ball** (gray sphere). Around you are three selectable balls:

- **Fire Ball** (Red) - Has floating red particle effects
- **Glass Ball** (White) - Smooth glossy sphere with reflective effect
- **Bouncy Ball** (Green) - Glowing sphere with higher elasticity

Roll into one of these balls to transform into that type. The other two will disappear. Then roll down the ramp to proceed to Scene B.

### Scene B - Three Holes

Scene B contains three colored holes. Each hole leads to a different sub-scene with unique interactions based on your ball type.

#### Hole 1 - Dark Gray Scene

- **Glass Ball** - Shatters into fragments, then restart
- **Fire Ball** - Extinguishes into red particles, then restart
- **Bouncy Ball** - Performs two bounces, then can roll to exit and return to Scene A

#### Hole 2 - Red Scene

- **Glass or Bouncy Ball** - Falls through with a ground ripple effect, ball disappears, returns to Scene A
- **Fire Ball** - Can keep moving freely, roll downward to return to Scene A

#### Hole 3 - Blue Scene

- **Fire or Bouncy Ball** - Instant disappearance effect, returns to Scene A
- **Glass Ball** - Small bounce animation, can roll downward to return to Scene A

### Important Rules

- All returns to Scene A reset your ball type back to the Initial Ball
- Smooth fade transitions between scenes
- When your ball "disappears" due to an effect, input is disabled until restart

## Visual Effects

- **Particle Systems** - Fire particles, extinguish effects, disappear effects
- **Shatter Effect** - Glass fragments with physics
- **Ripple Effect** - Expanding transparent rings on ground
- **Glow Effects** - Bouncy ball pulsating glow
- **Smooth Transitions** - Fade overlays between scenes

## Technical Details

### Built With

- **Three.js** (v0.157.0) - 3D graphics library
- **Pure JavaScript** - No build tools required
- **CSS3** - Modern styling with blur effects and animations

### Features

- Third-person camera with smooth following
- Ball rotation synchronized with distance traveled
- Physics-based movement with friction and gravity
- Collision detection for triggers and interactions
- Dynamic scene loading and cleanup
- Responsive design

### File Structure

```
/
├── index.html      # Main HTML entry point
├── style.css       # UI styling and effects
├── main.js         # Complete game logic
└── README.md       # This documentation
```

### No Dependencies Required

- Uses ES6 modules with import maps
- Three.js loaded from CDN
- No Node.js, npm, or bundlers needed
- Ready for static hosting

## Deployment

### GitHub Pages

1. Push all files to a GitHub repository
2. Go to repository Settings > Pages
3. Select source branch (usually `main` or `master`)
4. Your game will be available at `https://username.github.io/repository-name/`

### Local Development

Simply open `index.html` in a web browser. For best results, use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (if installed)
npx serve .
```

Then visit `http://localhost:8000`

## Browser Compatibility

Requires a modern browser with:
- WebGL support
- ES6 modules support
- Import maps support

Recommended: Chrome 89+, Firefox 108+, Safari 16.4+, Edge 89+

## Performance Notes

- Particle systems optimized for smooth performance
- Efficient scene cleanup prevents memory leaks
- Shadow mapping enabled for visual quality
- Automatic window resize handling

## License

This project is open source and available for educational purposes.

---

Enjoy rolling through the different scenes and discovering how each ball type interacts with the environment!
