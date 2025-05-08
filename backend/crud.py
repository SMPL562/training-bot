from sqlalchemy.orm import Session
from models import Template, Team, User
from schemas import TemplateCreate, TeamCreate, UserCreate

def create_template(db: Session, template: TemplateCreate):
    db_template = Template(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

def get_templates(db: Session):
    return db.query(Template).all()

def create_team(db: Session, team: TeamCreate):
    db_team = Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

def get_teams(db: Session):
    return db.query(Team).all()

def create_user(db: Session, user: UserCreate):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_users(db: Session):
    return db.query(User).all()