from pydantic import BaseModel
from typing import List, Dict

class TemplateCreate(BaseModel):
    title: str
    call_context: str
    goals: List[str]
    objections: List[str]
    persona: Dict

class TeamCreate(BaseModel):
    name: str
    members: List[int]

class UserCreate(BaseModel):
    name: str
    role: str
    team_id: int