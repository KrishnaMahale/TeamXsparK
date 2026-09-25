from typing import Optional
from fastapi import Header, HTTPException, status
from app.core.config import settings
from app.core.logging import logger


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extracts user ID from Supabase Bearer token if provided.
    For local development/demo, returns a default mock demo user if no token is passed.
    """
    if not authorization:
        return "demo-user-default"

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return "demo-user-default"
        # If Supabase client is configured, we can verify the JWT
        # For now, return a placeholder or decoded sub
        return "authenticated-user"
    except Exception as e:
        logger.warning(f"Error parsing authorization header: {e}")
        return "demo-user-default"
