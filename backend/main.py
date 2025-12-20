from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi.middleware.cors import CORSMiddleware

# 1. Database Configuration
# Make sure XAMPP MySQL is running!
# The @ symbol is replaced with %40
DATABASE_URL = "mysql+mysqlconnector://root:Gopi%407575@localhost/taskwave"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Define the Database Table
class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    status = Column(String(50), default="todo") # todo, doing, done

# Create the table if it doesn't exist
Base.metadata.create_all(bind=engine)

# 3. Initialize the App
app = FastAPI()

# Allow Frontend to talk to Backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Data Models (Pydantic)
class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    status: str

# 5. Dependency (THIS WAS MISSING BEFORE)
# This creates a fresh database session for every request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 6. API Routes

@app.post("/tasks")
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    new_task = Task(title=task.title)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.get("/tasks")
def read_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

@app.put("/tasks/{task_id}")
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = task_update.status
    db.commit()
    return task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        db.delete(task)
        db.commit()
    return {"message": "Task deleted"}