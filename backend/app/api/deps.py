from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.crud import get_user_by_email
from app.db.session import get_db
from app.models import RoleEnum, User
from app.schemas import TokenData

# Use OAuth2 Bearer tokens for authentication.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(db: Session = Depends(get_db), token: str = Security(oauth2_scheme)) -> User:
    """Return the current authenticated user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: str | None = payload.get("sub")
    if email is None:
        raise credentials_exception

    token_data = TokenData(email=email)
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Return the current user with no additional checks."""
    return current_user


def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the current user is an admin before allowing access."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user
