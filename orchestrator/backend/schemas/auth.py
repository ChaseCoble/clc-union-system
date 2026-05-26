from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenPayload(BaseModel):
    sub: str       # user_id
    username: str
    exp: int
