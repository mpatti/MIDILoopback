# MIDI Loopback - Creative Performance Tool

A Chrome web application that creates a MIDI loopback/echo effect for creative musical performances. Designed for use with Bluetooth MIDI devices like the Yamaha Disklavier.

## Live Demo

**Try it now:** [https://mpatti.github.io/MIDILoopback/](https://mpatti.github.io/MIDILoopback/)

The app is automatically deployed via GitHub Actions. Simply open the link in Chrome, connect your MIDI device, and start creating!

> **Note:** You'll need to enable GitHub Pages in your repository settings if this is the first deployment:
> 1. Go to repository Settings → Pages
> 2. Under "Build and deployment", select Source: "GitHub Actions"
> 3. The workflow will automatically deploy on every push

## Features

### Core Functionality
- **Bluetooth MIDI Support**: Connect your Yamaha Disklavier or any MIDI device via Bluetooth
- **Real-time Echo/Loopback**: Create echoing notes with adjustable delay and repetitions
- **Web MIDI API**: Uses the native Web MIDI API for low-latency performance
- **Responsive UI**: Professional, modern interface that works on desktop and mobile

### Creative Parameters

#### Echo Controls
- **Delay Time**: Adjust the time between echoes (50ms - 2000ms)
- **Repetitions**: Number of echo repetitions (1-16)
- **Velocity Decay**: How much quieter each echo gets (0-100%)
- **Feedback**: Amount of signal feeding back into delays

#### Musical Parameters
- **Pitch Shift**: Transpose each echo up or down (±12 semitones/1 octave)
- **Time Spread**: Make echoes progressively faster or slower
- **Echo Probability**: Random chance of notes being echoed (0-100%)
- **Humanize**: Add natural timing variation to echoes
- **Velocity Variation**: Add natural velocity variation to echoes
- **Swing Amount**: Apply swing/groove to alternate echoes

#### Filter Controls
- **Min/Max Velocity**: Filter which notes are echoed based on velocity
- **Min/Max Note**: Filter note range for echoing

### Preset System
Six built-in presets designed for different creative effects:

1. **Subtle Echo**: Gentle 2-repetition echo with natural humanization
2. **Rhythmic Delay**: 4-beat delay with swing for rhythmic patterns
3. **Harmonic Cascade**: Ascending fifths creating harmonic layers
4. **Chaotic Swarm**: Dense, randomized echo cloud
5. **Ascending Spiral**: Upward spiraling melodic echoes
6. **Descending Fade**: Downward cascading echoes with gentle fade

Plus the ability to save your own custom presets!

## Getting Started

### Requirements
- Google Chrome browser (version 43+)
- Bluetooth MIDI device (e.g., Yamaha Disklavier)
- OR any MIDI device with USB connection

### Setup Instructions

1. **Enable Bluetooth MIDI** (if using Bluetooth):
   - On Windows: Ensure Bluetooth is enabled and MIDI device is paired
   - On macOS: Open Audio MIDI Setup > MIDI Studio > Bluetooth configuration
   - On Linux: Use `bluez` tools to pair MIDI device

2. **Open the Application**:
   - Simply open `index.html` in Google Chrome
   - OR serve with a local web server:
     ```bash
     python -m http.server 8000
     # Then open http://localhost:8000
     ```

3. **Connect Your MIDI Device**:
   - Select your MIDI input device (e.g., "Disklavier")
   - Select your MIDI output device (same device for loopback)
   - Click "Connect to MIDI"

4. **Start Playing**:
   - Play your keyboard
   - Adjust parameters in real-time
   - Try different presets
   - Save your favorite configurations

### Usage Tips

#### For Live Performance
- Start with the "Subtle Echo" preset and adjust to taste
- Use the **Bypass** button to quickly toggle the effect on/off
- Monitor the "Active Echoes" counter to avoid overwhelming the system
- Lower repetitions for faster passages, higher for sparse playing

#### For Creative Exploration
- Try **Harmonic Cascade** with different pitch shift values
- Combine **Time Spread** with **Swing Amount** for polyrhythmic effects
- Use **Probability** for controlled randomness
- Experiment with **Velocity Decay** and **Feedback** for different sustain characteristics

#### For Ambient/Textural Playing
- High repetitions (8-16) with low velocity decay
- Add pitch shift (±3-7 semitones) for harmonic interest
- Moderate humanization for organic feel
- Lower probability (60-80%) for sparse textures

## Technical Details

### Web MIDI API
This application uses the [Web MIDI API](https://www.w3.org/TR/webmidi/) which is supported in Chrome, Edge, and Opera. The API provides:
- Low-latency MIDI access
- Real-time message handling
- Support for Bluetooth MIDI devices

### Architecture
- **No dependencies**: Pure vanilla JavaScript
- **Event-driven**: Efficient MIDI message handling
- **Scheduled timing**: Uses `setTimeout` for precise echo timing
- **Note tracking**: Manages note-off messages to prevent stuck notes

### MIDI Message Handling
- Processes Note On/Off messages (0x80, 0x90)
- Passes through Control Change and Program Change messages
- Tracks active notes per channel
- Handles pitch-shifted note-off messages correctly

### Browser Compatibility
- **Chrome/Chromium**: Full support ✓
- **Edge**: Full support ✓
- **Opera**: Full support ✓
- **Firefox**: Not supported (no Web MIDI API)
- **Safari**: Limited support (requires flags)

## Troubleshooting

### MIDI Access Denied
- Ensure your browser supports Web MIDI API
- Check Chrome://flags for MIDI permissions
- Try reloading the page and granting permission

### Device Not Showing Up
- Check Bluetooth/USB connection
- Verify device is powered on
- On macOS, check Audio MIDI Setup
- On Windows, check Device Manager

### Echoes Sound Wrong
- Check your delay time isn't too short
- Verify velocity decay isn't set too low
- Reset parameters and start with a preset
- Check filter controls (min/max note/velocity)

### Performance Issues
- Reduce number of repetitions
- Increase delay time
- Lower probability setting
- Check "Active Echoes" monitor

## Advanced Features

### Custom Preset Saving
Click "Save Custom" to save your current settings. Custom presets are stored in browser localStorage and persist across sessions.

### MIDI Through
All MIDI messages are passed through, including:
- Control Change (CC) messages
- Program Change messages
- Pitch Bend
- Other system messages

### Note Range Filtering
Use Min/Max Note controls to:
- Echo only bass notes
- Echo only treble notes
- Create split keyboard effects

### Velocity Filtering
Use Min/Max Velocity to:
- Echo only loud notes
- Echo only soft notes
- Create dynamic-sensitive effects

## Performance Considerations

- **Latency**: Typical latency is <10ms for initial note, echoes are scheduled precisely
- **CPU Usage**: Minimal, uses native timer scheduling
- **Memory**: Tracks active echoes, cleans up automatically on note-off
- **Polyphony**: Supports full MIDI polyphony (128 notes × 16 channels)

## Future Enhancements

Potential features for future versions:
- MIDI recording and playback
- Pattern sequencing
- Arpeggiator modes
- Visual feedback of echoes
- More advanced filters (scale/chord filtering)
- MIDI learn for parameter control
- Multi-effect chains

## Credits

Created for creative musical performance with Yamaha Disklavier and other MIDI devices.

Built with:
- Web MIDI API
- Vanilla JavaScript
- CSS3
- HTML5

## License

MIT License - Feel free to use, modify, and distribute.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify your MIDI device is properly connected
3. Try a different browser (Chrome recommended)
4. Check browser console for error messages

---

Enjoy creating unique musical performances with MIDI Loopback!
