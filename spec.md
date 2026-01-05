# Red Light, Green Light - Game Specification

## Overview

A team-based accelerometer game where players shake their phones to advance their team's avatar toward a trophy on the presenter screen. When the Guard Eye scans the room, players must freeze—any team with 5%+ members moving gets penalized.

## Game Modes

| Mode          | Device        | Role                                      |
| ------------- | ------------- | ----------------------------------------- |
| **Host**      | Laptop/tablet | Game control, team management, start/stop |
| **Player**    | Phone         | Shake to move, freeze when scanned        |
| **Presenter** | TV/projector  | Shows Guard Eye, team race, trophy        |

## Teams

- **Red Thieves** - Red team racing to the trophy
- **Blue Bandits** - Blue team racing to the trophy
- Players choose their team (host can reassign for balance)
- Both teams race simultaneously toward the same trophy

## Game Phases

```
┌───────────────────────────────────────────────────────────────────┐
│ LOBBY → PREVIEW (3s) → GO (3-7s) → WARNING (1.5s) → FREEZE (2-5s) │
│                                                           ↓        │
│                                                        VICTORY      │
└───────────────────────────────────────────────────────────────────┘
```

Each round cycles through PREVIEW → GO → WARNING → FREEZE, then repeats with a new input mode.

### 1. LOBBY

- Players join and select teams
- Host can reassign players for balance
- Motion permission must be granted before joining team
- Game starts when host clicks "Start Game"

### 2. PREVIEW Phase (3 seconds, configurable)

- Screen shows the input mode icon and instructions for this round
- Examples: "🤲 SHAKE", "👆 TAP", "🔄 SWIPE", "🔊 CLAP", "🎯 TAP", "⬅️➡️ TILT", "🎡 SPIN"
- Gives players time to understand what they need to do
- Countdown timer shows when GO phase will start
- Changes each round to keep gameplay fresh

### 3. GO Phase (3-7 seconds, variable)

- Screen shows green "GO!" and the current input mode
- Guard Eye is asleep/looking away
- Players perform the active input mode to contribute to team progress
- Input data accumulated locally, submitted at phase end
- **MVP Spotlight**: Top performer from each team displayed on presenter

### 4. WARNING Phase (1.5 seconds)

- Screen shows yellow "WARNING!"
- Guard Eye begins waking up animation
- Players should prepare to freeze
- Team progress calculated from GO phase input data

### 5. FREEZE Phase (2-5 seconds, variable)

- Screen shows red "FREEZE!"
- Guard Eye actively scanning
- **Laser Grid**: Animated scanning lasers across presenter screen
- Any phone movement detected = violation
- If ≥5% of team members move, entire team penalized

### 5. VICTORY

- First team to reach `totalDistance` wins
- Simple "Team X Wins!" announcement
- Confetti celebration on all screens
- **Traitor Reveal**: If traitor mode enabled, traitor identity shown

## Input Modes

Each round cycles through a different input mode. The PREVIEW phase shows what to do before each round starts.

### Available Input Modes

1. **SHAKE** 🤲 - Shake device (accelerometer)
   - Magnitude = √(x² + y² + z²) - 9.8
   - Progress: `totalMagnitude * magnitudeWeight + activeCount * activeCountWeight`

2. **TAP** 👆 - Tap the screen as fast as possible
   - Progress: `tapCount * tapSensitivity`

3. **TILT** ⬅️➡️ - Tilt phone side-to-side
   - Uses X/Y acceleration axes
   - Progress: `tiltMagnitude * tiltWeight`

4. **SWIPE** 🔄 - Swipe across the screen repeatedly
   - Directional swipes (up/down/left/right)
   - Progress: `swipeCount * swipeWeight`

5. **SOUND** 🔊 - Clap and cheer (microphone detection)
   - Loudness threshold: -50dB (configurable)
   - Progress: `volumeLevel * soundWeight`

6. **TARGET** 🎯 - Tap targets that appear on screen
   - Skill-based: targets appear briefly, tap to score
   - Progress: `hitCount * targetWeight`

7. **SPINNER** 🎡 - Flick to spin a wheel
   - Spin momentum accumulates
   - Progress: `spinMomentum * spinnerWeight`

### Input Mode Rotation

- **Sequential** (default): Cycles through modes in order (SHAKE → TAP → TILT → SWIPE → SOUND → TARGET → SPINNER)
- **Random**: Randomly selects a mode each round

Configure via `inputModeRotation: 'sequential'` or `'random'`

### Progress Detection

All input modes report their contribution during the GO phase:

- Players accumulate data locally during GO phase
- Single batched report submitted when phase transitions
- Report contains: `{ totalMagnitude, wasActive }`
- Team progress calculated: `totalProgress + activeCount`

## Penalty System

### Freeze Violation Detection

- During FREEZE, any input detected = violation (sensitivity depends on mode)
- Violations tracked per player

### Team Penalty

- If `violators / teamSize >= freezeViolationThreshold` (default: 5%)
- Entire team position reduced by `penaltyDistance * penaltyMultiplier`
- Penalty scales with difficulty: `violationDetectionMode` ('strict', 'moderate', 'relaxed')
- Minimum position is 0 (can't go negative)
- Visual penalty flash on presenter screen

## Special Features

### Variable Phase Lengths

- GO phase duration randomized between `goPhaseMinMs` and `goPhaseMaxMs`
- FREEZE phase duration randomized between `freezePhaseMinMs` and `freezePhaseMaxMs`
- Keeps players on their toes, prevents timing patterns
- Can be disabled with `variablePhasesEnabled: false`

### MVP Spotlight

- During GO phase, shows top shaker from each team on presenter screen
- Updates at end of each GO phase based on shake magnitude
- Adds competitive element and recognition
- Enabled by default, configurable via `mvpSpotlightEnabled`

### Laser Grid (FREEZE Visual)

- Animated scanning laser beams overlay during FREEZE phase
- Creates tension and urgency
- Horizontal and vertical lasers with staggered timing
- Corner glow effects and subtle grid pattern

### Traitor Mode (Optional)

- One random player secretly becomes the traitor
- Traitor sees secret message on their screen only
- Traitor's goal: shake during FREEZE to help opposing team
- Traitor's movement doesn't count toward their team's violation
- Instead, traitor's shake gives small boost to opposing team
- Traitor identity revealed on victory screen
- Requires minimum 4 players
- Disabled by default, enable with `traitorModeEnabled: true`

## iOS Motion Permission

iOS 13+ requires explicit user permission for accelerometer:

1. Player sees "Enable Motion Sensor" button in team select
2. Must tap button (user gesture required)
3. iOS permission dialog appears
4. Only after granting can player join a team
5. Android/desktop auto-granted

## State Structure

### Global Store

```typescript
interface GlobalState {
  // Existing
  controllerConnectionId: string;
  started: boolean;
  startTimestamp: number;
  players: Record<string, { name: string }>;
  showPresenterQr: boolean;

  // Game-specific
  gamePhase: 'lobby' | 'go' | 'warning' | 'freeze' | 'victory';
  phaseStartTimestamp: number;
  currentPhaseDuration: number; // Variable phase length

  teams: {
    red: TeamState;
    blue: TeamState;
  };

  playerTeams: Record<string, 'red' | 'blue'>; // clientId -> team
  shakeReports: Record<string, ShakeReport>; // clientId -> report
  winningTeam: 'red' | 'blue' | null;

  // MVP Spotlight
  mvpPlayers: {
    red: MvpPlayer | null;
    blue: MvpPlayer | null;
  };

  // Traitor Mode
  traitorEnabled: boolean;
  traitorId: string | null;
  traitorRevealed: boolean;
}

interface TeamState {
  name: string;
  color: string;
  position: number; // 0 to totalDistance
  lastPenaltyTimestamp: number;
}

interface MvpPlayer {
  clientId: string;
  name: string;
  magnitude: number;
}

interface ShakeReport {
  totalMagnitude: number;
  maxMagnitude: number;
  shakeCount: number;
  wasActive: boolean;
  timestamp: number;
}
```

### Player Store

```typescript
interface PlayerState {
  name: string;
  currentView: 'lobby' | 'team-select' | 'game' | 'victory';
  motionPermissionGranted: boolean;
}
```

## Configuration

| Setting                    | Default | Description                        |
| -------------------------- | ------- | ---------------------------------- |
| `goPhaseDurationMs`        | 5000    | GO phase fallback duration         |
| `warningPhaseDurationMs`   | 1500    | WARNING phase duration             |
| `freezePhaseDurationMs`    | 3000    | FREEZE phase fallback duration     |
| `goPhaseMinMs`             | 3000    | Min GO phase (variable mode)       |
| `goPhaseMaxMs`             | 7000    | Max GO phase (variable mode)       |
| `freezePhaseMinMs`         | 2000    | Min FREEZE phase (variable mode)   |
| `freezePhaseMaxMs`         | 5000    | Max FREEZE phase (variable mode)   |
| `variablePhasesEnabled`    | true    | Enable randomized phase lengths    |
| `shakeThreshold`           | 12      | m/s² threshold for shake detection |
| `freezeViolationThreshold` | 0.05    | 5% of team = penalty               |
| `penaltyDistance`          | 10      | Units team sent back               |
| `totalDistance`            | 100     | Distance to trophy                 |
| `magnitudeWeight`          | 0.01    | Progress per magnitude unit        |
| `activeCountWeight`        | 0.5     | Progress per active shaker         |
| `mvpSpotlightEnabled`      | true    | Show top shaker spotlight          |
| `traitorModeEnabled`       | false   | Enable traitor mode                |

## UI Elements

### Player Screen

- **Team Select**: Permission button + Red/Blue team buttons with counts
- **Game**: Large phase indicator (GO/WARNING/FREEZE), shake meter, team positions
- **Traitor Message**: Secret message shown only to traitor during game (if enabled)
- **Victory**: Winning team announcement

### Presenter Screen

- **Guard Eye**: Animated eye/robot that sleeps (GO), wakes (WARNING), scans (FREEZE)
- **Laser Grid**: Animated scanning lasers during FREEZE phase
- **Race Track**: Horizontal track with Red/Blue avatars moving toward trophy
- **Trophy**: Goal at end of track
- **Phase Timer**: Countdown for current phase
- **MVP Spotlight**: Top shaker names during GO phase
- **Penalty Alert**: Flash when team penalized
- **Traitor Reveal**: Shows traitor identity on victory (if enabled)

### Host Screen

- **Team Manager**: Two columns showing Red/Blue players, click to reassign
- **Balance Indicator**: Shows team size difference
- **Game Controls**: Start/Stop game buttons
- **QR Toggle**: Show/hide presenter QR code
