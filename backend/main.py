from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Mindmesh API", version="1.0.0")

# Production CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kimbleai.com",
        "https://www.kimbleai.com",
        "https://*.up.railway.app",  # Railway frontend URLs
        "http://localhost:3000"     # Development only
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration - Set to True to use OpenAI, False for mock mode
USE_REAL_AI = True

# Initialize OpenAI client
client = None
OPENAI_AVAILABLE = False

if USE_REAL_AI:
    try:
        import openai
        print(f"OpenAI version: {openai.__version__}")
        
        # Get API key from environment variables (SECURE)
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                OPENAI_AVAILABLE = True
                print("✅ OpenAI client initialized successfully")
            except Exception as e:
                print(f"OpenAI client failed: {e}")
                OPENAI_AVAILABLE = False
        else:
            print("❌ No OpenAI API key found in environment variables")
    except ImportError as e:
        print(f"❌ OpenAI import failed: {e}")
else:
    print("🤖 Running in MOCK MODE - using simulated AI responses")

class ChatRequest(BaseModel):
    message: str
    domain: str
    user_id: str

def get_domain_prompt(domain: str) -> str:
    """Get domain-specific system prompts"""
    domain_prompts = {
        "general": "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
        "legal": "You are a legal AI assistant providing general legal information. Always remind users to consult with qualified legal professionals for specific legal advice.",
        "dnd": "You are a D&D expert assistant helping with game mechanics, rules, lore, and character creation. Be creative and engaging while staying accurate to D&D 5e rules.",
        "cooking": "You are a culinary expert assistant helping with recipes, cooking techniques, ingredient substitutions, and food preparation tips.",
        "personal": "You are a personal assistant focused on productivity, self-improvement, goal setting, and life organization. Provide practical and actionable advice."
    }
    return domain_prompts.get(domain.lower(), domain_prompts["general"])

def get_ai_response(message: str, domain: str) -> str:
    """Get response from OpenAI"""
    if USE_REAL_AI and OPENAI_AVAILABLE and client:
        try:
            system_prompt = get_domain_prompt(domain)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI API Error: {e}")
            return f"[{domain.upper()} MODE] I'm experiencing technical difficulties. Please try again in a moment."
    
    # Fallback response when AI is unavailable
    return f"[{domain.upper()} MODE] AI service temporarily unavailable. Please check back soon!"

@app.post("/chat")
async def chat(request: ChatRequest):
    """Enhanced chat endpoint with OpenAI integration"""
    try:
        ai_response = get_ai_response(request.message, request.domain)
        
        return {
            "response": ai_response,
            "domain": request.domain,
            "timestamp": datetime.now().isoformat(),
            "ai_powered": USE_REAL_AI and OPENAI_AVAILABLE,
            "status": "success"
        }
    
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        fallback_response = f"[{request.domain.upper()} MODE] System temporarily unavailable. Please try again."
        return {
            "response": fallback_response,
            "domain": request.domain,
            "timestamp": datetime.now().isoformat(),
            "ai_powered": False,
            "status": "error",
            "error": str(e)
        }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ai_available": USE_REAL_AI and OPENAI_AVAILABLE,
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0"
    }

@app.get("/test-ai")
def test_ai():
    """Test endpoint to verify AI connection"""
    if USE_REAL_AI and OPENAI_AVAILABLE and client:
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Say hello and confirm you're working"}],
                max_tokens=50,
                temperature=0.5
            )
            return {
                "status": "success",
                "response": response.choices[0].message.content,
                "model": "gpt-3.5-turbo",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    else:
        return {
            "status": "error",
            "error": "OpenAI not available or not configured",
            "ai_available": OPENAI_AVAILABLE,
            "api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Mindmesh API is running",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/chat",
            "health": "/health",
            "test_ai": "/test-ai"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    # Get port from environment (Railway sets this automatically)
    port = int(os.getenv("PORT", 8000))
    
    print(f"🚀 Starting Mindmesh API")
    print(f"🤖 Real AI Mode: {USE_REAL_AI}")
    print(f"🤖 OpenAI Available: {OPENAI_AVAILABLE}")
    print(f"🔑 API Key Configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    print(f"🌐 Port: {port}")
    
    uvicorn.run(app, host="0.0.0.0", port=port)