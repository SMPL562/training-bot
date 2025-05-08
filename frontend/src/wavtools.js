class WavRecorder {
    constructor({ sampleRate = 24000 } = {}) {
        this.sampleRate = sampleRate;
        this.audioContext = null;
        this.stream = null;
        this.sourceNode = null;
        this.workletNode = null;
        this.recording = false;
    }

    async begin() {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, sampleRate: this.sampleRate, noiseSuppression: true, echoCancellation: true }
        });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        await this.audioContext.audioWorklet.addModule(URL.createObjectURL(new Blob([`
            class AudioProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.buffer = [];
                    this.bufferSize = 8192;
                }

                process(inputs) {
                    const inputData = inputs[0][0];
                    if (inputData) {
                        this.buffer.push(...inputData);
                        while (this.buffer.length >= this.bufferSize) {
                            const chunk = this.buffer.slice(0, this.bufferSize);
                            this.buffer = this.buffer.slice(this.bufferSize);
                            const mono = new Int16Array(chunk.length);
                            for (let i = 0; i < chunk.length; i++) {
                                mono[i] = Math.max(-1, Math.min(1, chunk[i])) * 32767;
                            }
                            this.port.postMessage({ mono });
                        }
                    }
                    return true;
                }
            }

            registerProcessor('audio-processor', AudioProcessor);
        `], { type: 'application/javascript' }))));
        this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
    }

    async record(callback) {
        if (!this.audioContext) throw new Error('Recorder not initialized');
        this.recording = true;
        this.workletNode.port.onmessage = (event) => {
            if (this.recording) {
                callback(event.data);
            }
        };
        await this.audioContext.resume();
    }

    async pause() {
        this.recording = false;
        if (this.audioContext) {
            await this.audioContext.suspend();
        }
    }

    async end() {
        this.recording = false;
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

class WavStreamPlayer {
    constructor({ sampleRate = 24000 } = {}) {
        this.sampleRate = sampleRate;
        this.audioContext = null;
        this.queue = [];
        this.playing = false;
    }

    async connect() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.sampleRate });
    }

    async add16BitPCM(pcm16, trackId) {
        if (!this.audioContext) throw new Error('Player not connected');
        const buffer = this.audioContext.createBuffer(1, pcm16.length, this.sampleRate);
        const floatData = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            floatData[i] = pcm16[i] / 32768;
        }
        buffer.getChannelData(0).set(floatData);
        this.queue.push({ buffer, trackId });
        if (!this.playing) {
            this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.playing = false;
            return;
        }
        this.playing = true;
        const { buffer } = this.queue.shift();
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
        source.onended = () => this.playNext();
    }

    async interrupt() {
        this.queue = [];
        this.playing = false;
        return { trackId: 'bot-response', offset: 0, currentTime: 0 };
    }
}

export { WavRecorder, WavStreamPlayer };