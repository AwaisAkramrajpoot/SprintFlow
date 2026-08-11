from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import Base, engine
from app.models.todo import Todo
from app.routers.todo import router as todo_router



Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Todo API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(todo_router)


@app.get("/")
def home():
    return {
        "message": "Todo API is running"
    }