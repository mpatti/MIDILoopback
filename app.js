// MIDI Loopback Application
class MIDILoopback {
    constructor() {
        this.midiAccess = null;
        this.inputDevice = null;
        this.outputDevice = null;
        this.bypass = false;

        // Scheduled echoes
        this.scheduledEchoes = [];
        this.activeNotes = new Map(); // Track active notes for note-off handling

        // Statistics
        this.stats = {
            inputCount: 0,
            echoCount: 0,
            activeEchoes: 0
        };

        // Parameters
        this.params = {
            delayTime: 500,
            repetitions: 3,
            velocityDecay: 0.80,
            feedback: 0.50,
            pitchShift: 0,
            timeSpread: 0,
            probability: 1.0,
            humanize: 0,
            velocityHumanize: 0,
            swingAmount: 0.5,
            minVelocity: 1,
            maxVelocity: 127,
            minNote: 0,
            maxNote: 127
        };

        // Presets
        this.presets = {
            'subtle-echo': {
                delayTime: 300,
                repetitions: 2,
                velocityDecay: 0.70,
                feedback: 0.30,
                pitchShift: 0,
                timeSpread: 0,
                probability: 1.0,
                humanize: 5,
                velocityHumanize: 3,
                swingAmount: 0.5
            },
            'rhythmic-delay': {
                delayTime: 500,
                repetitions: 4,
                velocityDecay: 0.85,
                feedback: 0.60,
                pitchShift: 0,
                timeSpread: 0,
                probability: 1.0,
                humanize: 0,
                velocityHumanize: 0,
                swingAmount: 0.65
            },
            'harmonic-cascade': {
                delayTime: 400,
                repetitions: 6,
                velocityDecay: 0.75,
                feedback: 0.40,
                pitchShift: 7,
                timeSpread: -30,
                probability: 0.95,
                humanize: 10,
                velocityHumanize: 5,
                swingAmount: 0.5
            },
            'chaotic-swarm': {
                delayTime: 150,
                repetitions: 8,
                velocityDecay: 0.60,
                feedback: 0.70,
                pitchShift: 0,
                timeSpread: 50,
                probability: 0.75,
                humanize: 25,
                velocityHumanize: 15,
                swingAmount: 0.7
            },
            'ascending-spiral': {
                delayTime: 600,
                repetitions: 5,
                velocityDecay: 0.80,
                feedback: 0.50,
                pitchShift: 5,
                timeSpread: 20,
                probability: 1.0,
                humanize: 8,
                velocityHumanize: 4,
                swingAmount: 0.55
            },
            'descending-fade': {
                delayTime: 450,
                repetitions: 7,
                velocityDecay: 0.65,
                feedback: 0.35,
                pitchShift: -3,
                timeSpread: 15,
                probability: 0.90,
                humanize: 12,
                velocityHumanize: 8,
                swingAmount: 0.45
            }
        };

        this.init();
    }

    async init() {
        this.setupUI();
        await this.requestMIDIAccess();
    }

    async requestMIDIAccess() {
        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            this.updateStatus('MIDI Access Granted', 'success');
            this.populateDeviceSelectors();
            document.getElementById('connectBtn').disabled = false;
        } catch (error) {
            this.updateStatus('MIDI Access Denied: ' + error.message, 'error');
            console.error('MIDI Access Error:', error);
        }
    }

    populateDeviceSelectors() {
        const inputSelect = document.getElementById('midiInput');
        const outputSelect = document.getElementById('midiOutput');

        // Clear existing options
        inputSelect.innerHTML = '<option value="">-- Select Input --</option>';
        outputSelect.innerHTML = '<option value="">-- Select Output --</option>';

        // Populate inputs
        const inputs = Array.from(this.midiAccess.inputs.values());
        inputs.forEach(input => {
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            inputSelect.appendChild(option);
        });

        // Populate outputs
        const outputs = Array.from(this.midiAccess.outputs.values());
        outputs.forEach(output => {
            const option = document.createElement('option');
            option.value = output.id;
            option.textContent = output.name;
            outputSelect.appendChild(option);
        });

        inputSelect.disabled = false;
        outputSelect.disabled = false;

        // Auto-select first available devices
        if (inputs.length > 0) inputSelect.selectedIndex = 1;
        if (outputs.length > 0) outputSelect.selectedIndex = 1;
    }

    connectDevices() {
        const inputSelect = document.getElementById('midiInput');
        const outputSelect = document.getElementById('midiOutput');

        const inputId = inputSelect.value;
        const outputId = outputSelect.value;

        if (!inputId || !outputId) {
            alert('Please select both input and output devices');
            return;
        }

        // Disconnect previous devices
        if (this.inputDevice) {
            this.inputDevice.onmidimessage = null;
        }

        // Connect new devices
        this.inputDevice = this.midiAccess.inputs.get(inputId);
        this.outputDevice = this.midiAccess.outputs.get(outputId);

        if (this.inputDevice && this.outputDevice) {
            this.inputDevice.onmidimessage = (event) => this.handleMIDIMessage(event);
            this.updateStatus(`Connected: ${this.inputDevice.name} → ${this.outputDevice.name}`, 'connected');
        } else {
            this.updateStatus('Connection failed', 'error');
        }
    }

    handleMIDIMessage(event) {
        if (this.bypass) return;

        const [status, note, velocity] = event.data;
        const command = status >> 4;
        const channel = status & 0x0F;

        // Only process note on/off messages
        if (command === 0x09 || command === 0x08) {
            this.stats.inputCount++;
            this.updateStats();

            // Check if note is in range
            if (note < this.params.minNote || note > this.params.maxNote) {
                return;
            }

            // Check if velocity is in range (for note on)
            if (command === 0x09 && (velocity < this.params.minVelocity || velocity > this.params.maxVelocity)) {
                return;
            }

            // Send original note immediately
            this.outputDevice.send([status, note, velocity]);

            // Schedule echoes for note on only
            // Note: echoes continue playing even after note-off to support short notes
            if (command === 0x09 && velocity > 0) {
                this.scheduleEchoes(status, note, velocity, channel);
            }
        } else {
            // Pass through other MIDI messages (CC, program change, etc.)
            this.outputDevice.send(event.data);
        }
    }

    scheduleEchoes(status, note, velocity, channel) {
        const noteKey = `${note}-${channel}`;

        // Track this note's echoes
        const noteEchoes = [];
        this.activeNotes.set(noteKey, noteEchoes);

        let currentDelay = this.params.delayTime;
        let currentVelocity = velocity;

        for (let i = 0; i < this.params.repetitions; i++) {
            // Apply probability
            if (Math.random() > this.params.probability) {
                continue;
            }

            // Calculate delay with time spread and humanization
            const spreadAmount = this.params.timeSpread * i;
            const humanizeAmount = this.params.humanize > 0 ?
                (Math.random() - 0.5) * 2 * this.params.humanize : 0;

            // Apply swing (alternate delays)
            const swingFactor = i % 2 === 0 ? 1.0 : this.params.swingAmount;

            const delay = currentDelay + spreadAmount + humanizeAmount;

            // Calculate velocity with decay and humanization
            currentVelocity = Math.floor(currentVelocity * this.params.velocityDecay);
            const velocityVariation = this.params.velocityHumanize > 0 ?
                (Math.random() - 0.5) * 2 * this.params.velocityHumanize : 0;
            const finalVelocity = Math.max(1, Math.min(127, currentVelocity + velocityVariation));

            // Calculate pitch shift
            const shiftedNote = note + (this.params.pitchShift * (i + 1));
            if (shiftedNote < 0 || shiftedNote > 127) {
                continue;
            }

            // Schedule note on
            const noteOnTimeout = setTimeout(() => {
                if (this.outputDevice) {
                    this.outputDevice.send([status, shiftedNote, finalVelocity]);
                    this.stats.echoCount++;
                    this.updateStats();
                }
            }, delay);

            // Schedule note off (same duration as delay for next echo)
            const noteOffDelay = delay + (this.params.delayTime * swingFactor);
            const noteOffTimeout = setTimeout(() => {
                if (this.outputDevice) {
                    this.outputDevice.send([0x80 | channel, shiftedNote, 0]);
                    this.stats.activeEchoes = Math.max(0, this.stats.activeEchoes - 1);
                    this.updateStats();
                }
            }, noteOffDelay);

            noteEchoes.push({ noteOnTimeout, noteOffTimeout, note: shiftedNote });
            this.stats.activeEchoes++;

            // Update delay for next repetition with feedback
            currentDelay += this.params.delayTime * this.params.feedback;
        }
    }

    handleNoteOff(note, channel) {
        const noteKey = `${note}-${channel}`;
        const echoes = this.activeNotes.get(noteKey);

        if (echoes) {
            // Cancel all scheduled echoes for this note
            echoes.forEach(echo => {
                clearTimeout(echo.noteOnTimeout);
                clearTimeout(echo.noteOffTimeout);
                // Send immediate note off for any pitch-shifted versions
                if (this.outputDevice) {
                    this.outputDevice.send([0x80 | channel, echo.note, 0]);
                }
            });

            this.stats.activeEchoes = Math.max(0, this.stats.activeEchoes - echoes.length);
            this.updateStats();
            this.activeNotes.delete(noteKey);
        }
    }

    setupUI() {
        // Connection button
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.connectDevices();
        });

        // Bypass button
        document.getElementById('bypassBtn').addEventListener('click', (e) => {
            this.bypass = !this.bypass;
            e.target.classList.toggle('active', this.bypass);
            e.target.textContent = this.bypass ? 'Bypassed' : 'Bypass';
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetParameters();
        });

        // Save preset button
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            this.saveCustomPreset();
        });

        // Preset selector
        document.getElementById('presetSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadPreset(e.target.value);
            }
        });

        // Parameter controls
        this.setupParameterControl('delayTime', (value) => {
            this.params.delayTime = parseInt(value);
            document.getElementById('delayTimeValue').textContent = value + 'ms';
        });

        this.setupParameterControl('repetitions', (value) => {
            this.params.repetitions = parseInt(value);
            document.getElementById('repetitionsValue').textContent = value;
        });

        this.setupParameterControl('velocityDecay', (value) => {
            this.params.velocityDecay = parseFloat(value) / 100;
            document.getElementById('velocityDecayValue').textContent = (parseFloat(value) / 100).toFixed(2);
        });

        this.setupParameterControl('feedback', (value) => {
            this.params.feedback = parseFloat(value) / 100;
            document.getElementById('feedbackValue').textContent = (parseFloat(value) / 100).toFixed(2);
        });

        this.setupParameterControl('pitchShift', (value) => {
            this.params.pitchShift = parseInt(value);
            const semitones = parseInt(value);
            const text = semitones === 0 ? '0 semitones' :
                        semitones > 0 ? `+${semitones} semitones` : `${semitones} semitones`;
            document.getElementById('pitchShiftValue').textContent = text;
        });

        this.setupParameterControl('timeSpread', (value) => {
            this.params.timeSpread = parseInt(value);
            document.getElementById('timeSpreadValue').textContent = value + 'ms';
        });

        this.setupParameterControl('probability', (value) => {
            this.params.probability = parseFloat(value) / 100;
            document.getElementById('probabilityValue').textContent = value + '%';
        });

        this.setupParameterControl('humanize', (value) => {
            this.params.humanize = parseInt(value);
            document.getElementById('humanizeValue').textContent = value + 'ms';
        });

        this.setupParameterControl('velocityHumanize', (value) => {
            this.params.velocityHumanize = parseInt(value);
            document.getElementById('velocityHumanizeValue').textContent = value;
        });

        this.setupParameterControl('swingAmount', (value) => {
            this.params.swingAmount = parseFloat(value) / 100;
            document.getElementById('swingAmountValue').textContent = value + '%';
        });

        this.setupParameterControl('minVelocity', (value) => {
            this.params.minVelocity = parseInt(value);
            document.getElementById('minVelocityValue').textContent = value;
        });

        this.setupParameterControl('maxVelocity', (value) => {
            this.params.maxVelocity = parseInt(value);
            document.getElementById('maxVelocityValue').textContent = value;
        });

        this.setupParameterControl('minNote', (value) => {
            this.params.minNote = parseInt(value);
            document.getElementById('minNoteValue').textContent = `${value} (${this.noteToName(parseInt(value))})`;
        });

        this.setupParameterControl('maxNote', (value) => {
            this.params.maxNote = parseInt(value);
            document.getElementById('maxNoteValue').textContent = `${value} (${this.noteToName(parseInt(value))})`;
        });
    }

    setupParameterControl(id, callback) {
        const element = document.getElementById(id);
        element.addEventListener('input', (e) => {
            callback(e.target.value);
        });
    }

    noteToName(note) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(note / 12) - 1;
        const noteName = noteNames[note % 12];
        return `${noteName}${octave}`;
    }

    updateStatus(message, status) {
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');

        statusText.textContent = message;
        statusIndicator.className = 'status-indicator ' + status;
    }

    updateStats() {
        document.getElementById('inputCount').textContent = this.stats.inputCount;
        document.getElementById('echoCount').textContent = this.stats.echoCount;
        document.getElementById('activeEchoes').textContent = this.stats.activeEchoes;
    }

    resetParameters() {
        this.params = {
            delayTime: 500,
            repetitions: 3,
            velocityDecay: 0.80,
            feedback: 0.50,
            pitchShift: 0,
            timeSpread: 0,
            probability: 1.0,
            humanize: 0,
            velocityHumanize: 0,
            swingAmount: 0.5,
            minVelocity: 1,
            maxVelocity: 127,
            minNote: 0,
            maxNote: 127
        };

        this.updateUIFromParams();
        document.getElementById('presetSelect').value = '';
    }

    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (preset) {
            Object.assign(this.params, preset);
            this.updateUIFromParams();
        }
    }

    updateUIFromParams() {
        document.getElementById('delayTime').value = this.params.delayTime;
        document.getElementById('delayTimeValue').textContent = this.params.delayTime + 'ms';

        document.getElementById('repetitions').value = this.params.repetitions;
        document.getElementById('repetitionsValue').textContent = this.params.repetitions;

        document.getElementById('velocityDecay').value = this.params.velocityDecay * 100;
        document.getElementById('velocityDecayValue').textContent = this.params.velocityDecay.toFixed(2);

        document.getElementById('feedback').value = this.params.feedback * 100;
        document.getElementById('feedbackValue').textContent = this.params.feedback.toFixed(2);

        document.getElementById('pitchShift').value = this.params.pitchShift;
        const semitones = this.params.pitchShift;
        const text = semitones === 0 ? '0 semitones' :
                    semitones > 0 ? `+${semitones} semitones` : `${semitones} semitones`;
        document.getElementById('pitchShiftValue').textContent = text;

        document.getElementById('timeSpread').value = this.params.timeSpread;
        document.getElementById('timeSpreadValue').textContent = this.params.timeSpread + 'ms';

        document.getElementById('probability').value = this.params.probability * 100;
        document.getElementById('probabilityValue').textContent = (this.params.probability * 100) + '%';

        document.getElementById('humanize').value = this.params.humanize;
        document.getElementById('humanizeValue').textContent = this.params.humanize + 'ms';

        document.getElementById('velocityHumanize').value = this.params.velocityHumanize;
        document.getElementById('velocityHumanizeValue').textContent = this.params.velocityHumanize;

        document.getElementById('swingAmount').value = this.params.swingAmount * 100;
        document.getElementById('swingAmountValue').textContent = (this.params.swingAmount * 100) + '%';
    }

    saveCustomPreset() {
        const name = prompt('Enter preset name:');
        if (name) {
            const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
            customPresets[name] = { ...this.params };
            localStorage.setItem('customPresets', JSON.stringify(customPresets));

            // Add to preset selector
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name + ' (Custom)';
            document.getElementById('presetSelect').appendChild(option);

            alert('Preset saved!');
        }
    }

    loadCustomPresets() {
        const customPresets = JSON.parse(localStorage.getItem('customPresets') || '{}');
        const presetSelect = document.getElementById('presetSelect');

        Object.keys(customPresets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name + ' (Custom)';
            presetSelect.appendChild(option);
            this.presets[name] = customPresets[name];
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new MIDILoopback();
    app.loadCustomPresets();
});
