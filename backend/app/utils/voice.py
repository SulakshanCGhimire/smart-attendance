import pyttsx3
import threading

def _speak_worker(text: str):
    """Background worker that actually plays the audio."""
    try:
        # Initialize engine inside the thread to prevent COM errors on Windows
        engine = pyttsx3.init()
        engine.setProperty('rate', 150) # Speed of speech
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"Voice engine error: {e}")

def trigger_voice(text: str):
    """Spawns a new thread to speak the text asynchronously."""
    thread = threading.Thread(target=_speak_worker, args=(text,))
    thread.daemon = True
    thread.start()