from typing import Optional
from app.core.config import settings
from app.core.logging import logger

_supabase_client = None


def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY):
        logger.info("Supabase credentials not configured in .env. Running with local in-memory storage repository.")
        return None

    try:
        from supabase import create_client, Client
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        _supabase_client = create_client(settings.SUPABASE_URL, key)
        logger.info("Successfully connected to Supabase client.")
        return _supabase_client
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to in-memory repository.")
        return None
