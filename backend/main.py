import os
import json
import base64
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import aiohttp
from collections import deque
from database import SessionLocal, init_db
from models import Template, Session, Team, User
from schemas import TemplateCreate, TeamCreate, UserCreate
from crud import create_template, get_templates, create_team, get_teams, create_user, get_users
from feedback import calculate_feedback
from fastapi import Depends
from sqlalchemy.orm import Session

# Set up logging
logging.basicConfig(
    filename='chatbot.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

logger.info("Python version: %s", sys.version)

load_dotenv()

# Adjust DATABASE_URL for Codespaces
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/hinglish_chatbot" if os.getenv("CODESPACES") else "postgresql://user:password@db:5432/hinglish_chatbot")

app = FastAPI()
app.mount("/static", StaticFiles(directory="../frontend/build"), name="static")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize database
init_db()

# System prompt for Hinglish
SYSTEM_PROMPT = """
You are {persona_name}, a {job_title} with a {demeanor} demeanor, speaking casual Hinglish popular among younger urban users. Respond in a natural mix of Hindi and English, adapting to the user's language and maintaining a friendly, engaging tone. The call context is: {call_context}. Focus on these goals: {goals}. Handle these objections: {objections}. Example: User: "Yeh product kitna reliable hai?" Assistant: "Bohot reliable hai, bhai! One-year warranty ke saath top-notch performance." If you don't understand the input, respond with: "Sorry, thoda clearly bol sakte ho?" Keep responses concise for low latency.
"""

@app.post("/templates")
async def create_template_endpoint(template: TemplateCreate, db: Session = Depends(get_db)):
    db_template = create_template(db, template)
    return {"id": db_template.id}

@app.get("/templates")
async def get_templates_endpoint(db: Session = Depends(get_db)):
    templates = get_templates(db)
    return templates

@app.post("/teams")
async def create_team_endpoint(team: TeamCreate, db: Session = Depends(get_db)):
    db_team = create_team(db, team)
    return {"id": db_team.id}

@app.get("/teams")
async def get_teams_endpoint(db: Session = Depends(get_db)):
    teams = get_teams(db)
    return teams

@app.post("/users")
async def create_user_endpoint(user: UserCreate, db: Session = Depends(get_db)):
    db_user = create_user(db, user)
    return {"id": db_user.id}

@app.get("/users")
async def get_users_endpoint(db: Session = Depends(get_db)):
    users = get_users(db)
    return users

@app.websocket("/stream/{template_id}")
async def websocket_endpoint(websocket: WebSocket, template_id: int, db: Session = Depends(get_db)):
    await websocket.accept()
    logger.info("WebSocket connection accepted from client")
    openai_ws = None
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            await websocket.send_json({"type": "error", "message": "Template not found"})
            return

        prompt = SYSTEM_PROMPT.format(
            persona_name=template.persona.get("name", "Sales Assistant"),
            job_title=template.persona.get("job_title", "Sales Representative"),
            demeanor=template.persona.get("demeanor", "friendly"),
            call_context=template.call_context,
            goals=", ".join(template.goals),
            objections=", ".join(template.objections)
        )

        logger.info("Connecting to OpenAI Realtime API...")
        headers = {
            "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
            "openai-beta": "realtime=v1"
        }
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(
                "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview",
                headers=headers
            ) as openai_ws:
                logger.info("Connected to OpenAI Realtime API")
                session_update = {
                    "type": "session.update",
                    "session": {
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.1,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 1200,
                            "create_response": True,
                            "interrupt_response": True
                        },
                        "input_audio_transcription": {
                            "model": "whisper-1",
                            "language": "hi"
                        },
                        "voice": "alloy",
                        "instructions": prompt,
                        "modalities": ["text", "audio"]
                    }
                }
                await openai_ws.send_json(session_update)
                logger.info("Sent session update to OpenAI: %s", json.dumps(session_update))

                is_closed = False
                rate_limit_delay = 0
                last_speech_start = None
                SPEECH_TIMEOUT = 5
                has_active_response = False
                response_queue = deque()
                last_response_end = 0
                RESPONSE_DELAY = 1.0
                conversation_history = []
                session_transcript = []

                async def force_commit_speech():
                    nonlocal last_speech_start
                    while not is_closed:
                        if last_speech_start and (asyncio.get_event_loop().time() - last_speech_start > SPEECH_TIMEOUT):
                            await openai_ws.send_json({"type": "input_audio_buffer.commit"})
                            logger.info("Forced speech turn commit due to timeout")
                            last_speech_start = None
                        await asyncio.sleep(1)

                async def process_response_queue():
                    while not is_closed and not openai_ws.closed:
                        if response_queue and not has_active_response:
                            current_time = asyncio.get_event_loop().time()
                            if current_time - last_response_end < RESPONSE_DELAY:
                                await asyncio.sleep(RESPONSE_DELAY - (current_time - last_response_end))
                            response_queue.popleft()
                            for attempt in range(3):
                                try:
                                    if not has_active_response and not openai_ws.closed:
                                        await openai_ws.send_json({
                                            "type": "response.create",
                                            "response": {"modalities": ["text", "audio"]}
                                        })
                                        logger.info("Sent response.create from queue")
                                        break
                                except Exception as e:
                                    logger.error(f"Failed to send response.create (attempt {attempt + 1}): {str(e)}")
                                    if openai_ws.closed:
                                        logger.info("WebSocket closed, stopping response queue")
                                        is_closed = True
                                        break
                                    await asyncio.sleep(0.5 * (2 ** attempt))
                        await asyncio.sleep(0.01)

                async def receive_from_client():
                    nonlocal is_closed, rate_limit_delay
                    try:
                        while not is_closed:
                            message = await websocket.receive_text()
                            data = json.loads(message)
                            if data["type"] == "audio":
                                logger.info("Received audio chunk from client: %s bytes", len(data["data"]))
                                audio_data = base64.b64decode(data["data"])
                                if openai_ws.closed:
                                    logger.info("OpenAI WebSocket is closed, stopping client receive")
                                    is_closed = True
                                    break
                                if rate_limit_delay > 0:
                                    logger.info(f"Rate limit delay: waiting {rate_limit_delay}s")
                                    await asyncio.sleep(rate_limit_delay)
                                await openai_ws.send_json({
                                    "type": "input_audio_buffer.append",
                                    "audio": data["data"]
                                })
                                logger.info("Sent audio chunk to OpenAI Realtime API")
                            elif data["type"] == "interrupt":
                                if has_active_response:
                                    await openai_ws.send_json({
                                        "type": "response.cancel",
                                        "sampleCount": data.get("sampleCount", 0)
                                    })
                                    logger.info("Sent response.cancel with sampleCount to interrupt current response")
                            elif data["type"] == "log":
                                logger.info(data["message"])
                    except WebSocketDisconnect:
                        logger.info("Client WebSocket disconnected gracefully")
                        is_closed = True
                    except Exception as e:
                        logger.error("Error receiving from client: %s", str(e))
                        is_closed = True
                        if websocket.state == WebSocket.OPEN and not openai_ws.closed:
                            try:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": f"Backend error: {str(e)}"
                                })
                            except Exception as send_error:
                                logger.error("Failed to send error to client: %s", str(send_error))

                async def receive_from_openai():
                    nonlocal is_closed, rate_limit_delay, last_speech_start, has_active_response, last_response_end
                    try:
                        async for msg in openai_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                response_data = json.loads(msg.data)
                                logger.info("Received response from OpenAI: %s", response_data)
                                if response_data["type"] == "response.audio.delta":
                                    if is_closed:
                                        break
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": response_data["delta"]
                                    })
                                    logger.info("Sent audio delta to client")
                                    session_transcript.append({"type": "audio", "content": response_data["delta"]})
                                elif response_data["type"] == "input_audio_buffer.speech_started":
                                    last_speech_start = asyncio.get_event_loop().time()
                                    if is_closed:
                                        break
                                    await websocket.send_json({
                                        "type": "text",
                                        "text": "Listening..."
                                    })
                                    logger.info("Sent 'Listening...' message to client")
                                elif response_data["type"] == "response.created":
                                    has_active_response = True
                                    logger.info("Active response started")
                                elif response_data["type"] == "response.done":
                                    has_active_response = False
                                    last_response_end = asyncio.get_event_loop().time()
                                    if response_data["response"]["status"] == "cancelled":
                                        logger.info("Response cancelled successfully")
                                    else:
                                        logger.info("Active response ended")
                                    if response_data["response"]["output"]:
                                        if is_closed:
                                            break
                                        await websocket.send_json({
                                            "type": "text",
                                            "text": response_data["response"]["output"]
                                        })
                                        logger.info("Sent response text to client: %s", response_data["response"]["output"][0]["content"])
                                        conversation_history.append({
                                            "role": "assistant",
                                            "content": response_data["response"]["output"][0]["content"]
                                        })
                                        session_transcript.append({"role": "assistant", "content": response_data["response"]["output"][0]["content"]})
                                elif response_data["type"] == "input_audio_buffer.speech_done":
                                    last_speech_start = None
                                    if response_data.get("transcript"):
                                        if is_closed:
                                            break
                                        transcript = response_data["transcript"] if response_data["transcript"] else "Transcription failed"
                                        await websocket.send_json({
                                            "type": "user_text",
                                            "text": transcript
                                        })
                                        logger.info("Sent user transcription to client: %s", transcript)
                                        if transcript != "Transcription failed":
                                            conversation_history.append({"role": "user", "content": transcript})
                                            session_transcript.append({"role": "user", "content": transcript})
                                        else:
                                            session_transcript.append({"role": "user", "content": "Transcription failed"})
                                    else:
                                        await websocket.send_json({
                                            "type": "user_text",
                                            "text": "Transcription failed"
                                        })
                                        logger.info("Sent transcription failure to client")
                                elif response_data["type"] == "input_audio_buffer.committed":
                                    response_queue.append(True)
                                    logger.info("Added response.create request to queue")
                                elif response_data["type"] == "error":
                                    logger.error("OpenAI Realtime API error: %s", json.dumps(response_data, indent=2))
                                    if "429" in response_data.get("error", {}).get("message", ""):
                                        rate_limit_delay = min(rate_limit_delay + 1, 10)
                                        logger.info(f"Rate limit hit, setting delay to {rate_limit_delay}s")
                                    if is_closed:
                                        break
                                    if websocket.state == WebSocket.OPEN:
                                        await websocket.send_json({
                                            "type": "error",
                                            "message": f"OpenAI error: {json.dumps(response_data, indent=2)}"
                                        })
                                    raise aiohttp.ClientConnectionError(f"OpenAI error: {json.dumps(response_data, indent=2)}")
                            elif msg.type == aiohttp.WSMsgType.CLOSED:
                                logger.info("OpenAI WebSocket connection closed")
                                is_closed = True
                                break
                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                logger.error("OpenAI WebSocket error: %s", msg.data)
                                is_closed = True
                                if websocket.state == WebSocket.OPEN:
                                    await websocket.send_json({
                                        "type": "error",
                                        "message": f"OpenAI WebSocket error: {msg.data}"
                                    })
                                raise aiohttp.ClientConnectionError("WebSocket error")
                    except Exception as e:
                        logger.error("Error receiving from OpenAI: %s", str(e))
                        is_closed = True

                # Save session transcript and feedback
                if session_transcript:
                    feedback = calculate_feedback(session_transcript, template.goals)
                    db_session = Session(
                        template_id=template_id,
                        transcript=json.dumps(session_transcript),
                        feedback=feedback
                    )
                    db.add(db_session)
                    db.commit()

                await asyncio.gather(receive_from_client(), receive_from_openai(), force_commit_speech(), process_response_queue())
    except Exception as e:
        logger.error("Backend WebSocket error: %s", str(e))
        if websocket.state == WebSocket.OPEN:
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Backend error: {str(e)}. Reconnecting..."
                })
            except Exception as send_error:
                logger.error("Failed to send error to client: %s", str(send_error))
    finally:
        if openai_ws and not openai_ws.closed:
            await openai_ws.close()
            logger.info("Closed OpenAI WebSocket connection")