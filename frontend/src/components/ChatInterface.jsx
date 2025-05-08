import React, { useState, useEffect, useRef } from 'react';
import { WavRecorder, WavStreamPlayer } from '../wavtools';

const ChatInterface = ({ templateId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState('Stopped');
    const [logs, setLogs] = useState([]);
    const wavRecorder = useRef(new WavRecorder({ sampleRate: 24000 }));
    const wavPlayer = useRef(new WavStreamPlayer({ sampleRate: 24000 }));
    const websocket = useRef(null);
    const sampleCount = useRef(0);
    const transcriptionFailures = useRef(0);
    const VAD_THRESHOLD = 0.015; // Adjusted for smoother detection
    const VAD_WINDOW = 9600; // ~0.4s at 24kHz
    const vadHistory = useRef([]);
    const vadBuffer = useRef([]);

    const log = (message, toUI = true) => {
        const timestamp = new Date().toISOString();
        console.log(`[Frontend ${timestamp}] ${message}`);
        if (toUI) {
            setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
        }
        if (websocket.current?.readyState === WebSocket.OPEN) {
            websocket.current.send(JSON.stringify({ type: 'log', message: `[Frontend ${timestamp}] ${message}` }));
        }
    };

    const addMessage = (sender, text, bgClass) => {
        setMessages(prev => [...prev, { sender, text, bgClass }]);
        log(`Added message to chat: ${sender}: ${text}`);
    };

    const detectSpeech = (floatData) => {
        const maxAmplitude = Math.max(...floatData.map(Math.abs));
        vadHistory.current.push(maxAmplitude > VAD_THRESHOLD);
        if (vadHistory.current.length > 10) vadHistory.current.shift();
        return vadHistory.current.filter(d => d).length >= 7; // Majority detection
    };

    const connectWebSocket = () => {
        if (websocket.current?.readyState === WebSocket.OPEN) {
            websocket.current.close();
        }

        log(`Connecting to WebSocket at ws://localhost:8000/stream/${templateId}...`);
        websocket.current = new WebSocket(`ws://localhost:8000/stream/${templateId}`);
        websocket.current.onopen = () => {
            log("WebSocket connection opened");
            setStatus('Waiting for your speech... (Pause briefly after speaking)');
        };

        websocket.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'audio') {
                log("Received audio delta from backend");
                const audioData = new Uint8Array(atob(data.data).split('').map(c => c.charCodeAt(0)));
                const pcm16 = new Int16Array(audioData.buffer);
                await wavPlayer.current.add16BitPCM(pcm16, 'bot-response');
                setIsSpeaking(true);
            } else if (data.type === 'text') {
                log(`Received text message: ${JSON.stringify(data.text)}`);
                let transcript = '';
                if (Array.isArray(data.text) && data.text.length > 0) {
                    const responseObj = data.text[0];
                    if (responseObj.content && Array.isArray(responseObj.content) && responseObj.content.length > 0) {
                        transcript = responseObj.content[0].transcript || data.text.toString();
                    } else {
                        transcript = data.text.toString();
                    }
                } else {
                    transcript = data.text.toString();
                }
                if (transcript === 'Listening...') {
                    setStatus('Waiting for your speech... (Pause briefly after speaking)');
                    setIsSpeaking(false);
                } else {
                    addMessage('Bot', transcript, 'bg-blue-100');
                    setStatus('Bot is speaking... (Please wait)');
                    setIsSpeaking(true);
                }
            } else if (data.type === 'user_text') {
                log(`Received user transcription: ${data.text}`);
                if (data.text === 'Transcription failed') {
                    transcriptionFailures.current++;
                    if (transcriptionFailures.current >= 3) {
                        addMessage('Bot', 'Sorry, main samajh nahi paaya. Call khatam karte hain.', 'bg-red-100');
                        stopRecording();
                    } else {
                        addMessage('Bot', 'Sorry, thoda clearly bol sakte ho?', 'bg-yellow-100');
                    }
                } else {
                    addMessage('You', data.text, 'bg-green-100');
                    transcriptionFailures.current = 0;
                }
            } else if (data.type === 'error') {
                log(`Received error from backend: ${data.message}`);
                addMessage('Bot', `Error: ${data.message}`, 'bg-red-100');
                stopRecording();
            }
        };

        websocket.current.onerror = (error) => {
            log(`WebSocket error: ${error}`);
            addMessage('Bot', 'WebSocket error occurred. Trying to reconnect...', 'bg-red-100');
            setTimeout(connectWebSocket, 2000);
        };

        websocket.current.onclose = () => {
            log("WebSocket connection closed");
            setStatus('Disconnected');
            if (isRecording) {
                setTimeout(connectWebSocket, 2000);
            }
        };
    };

    const startRecording = async () => {
        if (isRecording) return;
        setIsRecording(true);
        sampleCount.current = 0;
        transcriptionFailures.current = 0;
        vadHistory.current = [];
        vadBuffer.current = [];
        log("User clicked 'Start Talking' button");

        setStatus('Waiting for your speech... (Pause briefly after speaking)');
        setMessages([]);
        setLogs([]);

        try {
            await wavRecorder.current.begin();
            await wavRecorder.current.record(async (data) => {
                const floatData = data.mono.map(sample => sample / 32768);
                const inputAmplitude = Math.max(...floatData.map(Math.abs));
                const normalizedData = floatData.map(sample => sample * 0.5 / (inputAmplitude || 1));
                const outputAmplitude = Math.max(...normalizedData.map(Math.abs));
                log(`Input amplitude: ${inputAmplitude}, Output amplitude: ${outputAmplitude}`);

                vadBuffer.current = vadBuffer.current.concat(normalizedData);
                let speechDetected = false;
                while (vadBuffer.current.length >= VAD_WINDOW) {
                    const chunk = vadBuffer.current.slice(0, VAD_WINDOW);
                    vadBuffer.current = vadBuffer.current.slice(VAD_WINDOW);
                    speechDetected = detectSpeech(chunk);
                    log(`Client-side VAD: Speech ${speechDetected ? 'detected' : 'not detected'}`);
                }

                if (speechDetected) {
                    const pcm16 = data.mono;
                    sampleCount.current += pcm16.length;
                    const buffer = new Uint8Array(pcm16.buffer);
                    const base64Audio = btoa(String.fromCharCode.apply(null, buffer));
                    log(`Processed audio chunk: ${buffer.length} bytes`);
                    if (websocket.current?.readyState === WebSocket.OPEN) {
                        websocket.current.send(JSON.stringify({ type: 'audio', data: base64Audio }));
                        log("Sent audio chunk to backend");
                    }
                }
            });
            log("Started recording");
            await wavPlayer.current.connect();
            connectWebSocket();
        } catch (error) {
            log(`Error starting recording: ${error.name}: ${error.message}`);
            setStatus(`Error: ${error.message}`);
            addMessage('Bot', `Oops, mic nahi chal raha! Error: ${error.message}`, 'bg-red-100');
            stopRecording();
        }
    };

    const interruptSpeaking = async () => {
        if (!isSpeaking || !websocket.current || websocket.current.readyState !== WebSocket.OPEN) return;
        log("User clicked 'Interrupt' button");
        websocket.current.send(JSON.stringify({ type: 'interrupt', sampleCount: sampleCount.current }));
        await wavPlayer.current.interrupt();
        setIsSpeaking(false);
        setStatus('Waiting for your speech... (Pause briefly after speaking)');
        log("Sent interrupt request with sampleCount and cleared audio queue");
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        setIsRecording(false);
        log("User clicked 'Stop Talking' button");

        await wavRecorder.current.end();
        await wavPlayer.current.interrupt();
        if (websocket.current?.readyState === WebSocket.OPEN) {
            websocket.current.close();
            log("WebSocket connection closed manually");
        }
        setStatus('Stopped');
        log("UI updated: Showing start screen");
    };

    useEffect(() => {
        return () => {
            if (isRecording) stopRecording();
        };
    }, []);

    return (
        <div className="bg-gray-100 p-6 rounded-lg shadow-lg w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Roleplay Session</h2>
            <div className="h-48 overflow-y-auto mb-4 p-4 bg-gray-50 rounded">
                {messages.map((msg, index) => (
                    <div key={index} className={`p-2 my-1 rounded ${msg.bgClass}`}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <div className="h-24 overflow-y-auto mb-4 p-4 bg-gray-100 rounded">
                {logs.map((log, index) => (
                    <div key={index} className="text-xs text-gray-600">{log}</div>
                ))}
            </div>
            <div className={isRecording ? "hidden" : "text-center"}>
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={startRecording}
                >
                    Start Talking
                </button>
            </div>
            <div className={isRecording ? "text-center space-y-2" : "hidden"}>
                <div className="flex justify-center space-x-2">
                    <button
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        onClick={stopRecording}
                    >
                        Stop Talking
                    </button>
                    <button
                        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                        onClick={interruptSpeaking}
                    >
                        Interrupt
                    </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">{status}</p>
            </div>
            <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-4 w-full"
                onClick={onClose}
            >
                Close Session
            </button>
        </div>
    );
};

export default ChatInterface;