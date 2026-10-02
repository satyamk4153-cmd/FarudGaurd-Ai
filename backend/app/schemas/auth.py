from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from backend.app.models.user import UserRole

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr

class UserRegisterRequest(UserBase):
    password: str = Field(..., min_length=6, max_length=128)
    # Role cannot be set by public registration; default is strictly USER

class UserRoleUpdateRequest(BaseModel):
    role: UserRole

class UserStatusUpdateRequest(BaseModel):
    is_active: bool

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    name: str
    full_name: Optional[str] = None
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime

    @model_validator(mode="after")
    def populate_full_name(self):
        if not self.full_name:
            self.full_name = self.name
        return self

    model_config = ConfigDict(from_attributes=True)

TokenResponse.model_rebuild()
