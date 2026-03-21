"""
Pune Urban Shield — Database & Storage Layer
============================================
- MongoDB Atlas via motor (async)
- Cloudinary for citizen photo uploads
- Graceful fallback to in-memory when credentials not set
"""

import os, io, base64, logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("db")

# ─── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "")
_mongo_client = None
_db = None

def get_db():
    global _mongo_client, _db
    if _db is not None:
        return _db
    if not MONGO_URI:
        logger.warning("MONGO_URI not set — using in-memory fallback")
        return None
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        _mongo_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _db = _mongo_client["pune_urban_shield"]
        logger.info("✅ MongoDB Atlas connected")
        return _db
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        return None

# In-memory fallbacks
_mem_reports = []
_mem_alerts  = []

# ─── Citizen Reports ─────────────────────────────────────────────────────────
async def save_report(report: dict) -> bool:
    """Save a citizen report (text + photo_url + location) to Atlas or memory"""
    db = get_db()
    if db is not None:
        try:
            await db.citizen_reports.insert_one(report)
            return True
        except Exception as e:
            logger.error(f"DB write failed: {e}")
    _mem_reports.append(report)
    return False  # False = saved to memory, not Atlas

async def get_reports(limit: int = 50) -> list:
    """Fetch recent citizen reports"""
    db = get_db()
    if db is not None:
        try:
            cursor = db.citizen_reports.find().sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            for d in docs:
                d["_id"] = str(d["_id"])  # serialize ObjectId
            return docs
        except Exception as e:
            logger.error(f"DB read failed: {e}")
    return list(reversed(_mem_reports[-limit:]))

# ─── Alerts ──────────────────────────────────────────────────────────────────
async def save_alert(alert: dict) -> bool:
    db = get_db()
    if db is not None:
        try:
            await db.alerts.insert_one(alert)
            return True
        except Exception as e:
            logger.error(f"Alert DB write failed: {e}")
    _mem_alerts.append(alert)
    return False

async def get_alerts_from_db(limit: int = 100) -> list:
    db = get_db()
    if db is not None:
        try:
            cursor = db.alerts.find({"acknowledged": False}).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            for d in docs:
                d["_id"] = str(d["_id"])
            return docs
        except Exception as e:
            logger.error(f"DB read failed: {e}")
    return _mem_alerts

async def acknowledge_alert_db(alert_id: str) -> bool:
    db = get_db()
    if db is not None:
        try:
            await db.alerts.update_one({"id": alert_id}, {"$set": {"acknowledged": True}})
            return True
        except Exception as e:
            logger.error(f"Acknowledge failed: {e}")
    return False

# ─── Simulation History ───────────────────────────────────────────────────────
async def save_simulation(sim_type: str, params: dict, result: dict) -> None:
    db = get_db()
    doc = {
        "type": sim_type,
        "params": params,
        "result": result,
        "timestamp": datetime.now(),
    }
    if db is not None:
        try:
            await db.simulation_history.insert_one(doc)
        except Exception as e:
            logger.error(f"Simulation save failed: {e}")

async def get_simulation_history(sim_type: str, limit: int = 10) -> list:
    db = get_db()
    if db is not None:
        try:
            cursor = db.simulation_history.find({"type": sim_type}).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            for d in docs:
                d["_id"] = str(d["_id"])
                d["timestamp"] = d["timestamp"].isoformat()
            return docs
        except Exception as e:
            logger.error(f"Simulation history read failed: {e}")
    return []

# ─── Cloudinary Photo Upload ──────────────────────────────────────────────────
CLOUDINARY_CLOUD  = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_KEY    = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

_cloudinary_ready = False

def _init_cloudinary():
    global _cloudinary_ready
    if not all([CLOUDINARY_CLOUD, CLOUDINARY_KEY, CLOUDINARY_SECRET]):
        logger.warning("Cloudinary not configured — photo uploads disabled")
        return False
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD,
            api_key=CLOUDINARY_KEY,
            api_secret=CLOUDINARY_SECRET,
            secure=True,
        )
        _cloudinary_ready = True
        logger.info("✅ Cloudinary connected")
        return True
    except ImportError:
        logger.error("cloudinary package not installed — run: pip install cloudinary")
        return False

_init_cloudinary()

async def upload_photo(file_bytes: bytes, filename: str, report_id: str) -> Optional[str]:
    """
    Upload a citizen report photo to Cloudinary.
    Uses asyncio.to_thread so the sync Cloudinary SDK doesn't block FastAPI's event loop.
    Returns the secure CDN URL or None if upload failed / not configured.
    """
    if not _cloudinary_ready:
        return None
    try:
        import asyncio
        import cloudinary.uploader

        def _do_upload():
            return cloudinary.uploader.upload(
                file_bytes,
                folder=f"pune_urban_shield/reports/{report_id}",
                public_id=filename.replace(" ", "_"),
                resource_type="image",
                transformation=[
                    {"width": 1280, "height": 960, "crop": "limit"},
                    {"quality": "auto:good"},
                    {"fetch_format": "auto"},
                ],
                timeout=30,
            )

        result = await asyncio.to_thread(_do_upload)
        url = result.get("secure_url")
        logger.info(f"✅ Photo uploaded to Cloudinary: {url}")
        return url
    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {e}")
        return None


# ─── Status Check ─────────────────────────────────────────────────────────────
async def check_db_status() -> dict:
    db = get_db()
    mongo_ok = False
    if db is not None:
        try:
            await db.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False

    return {
        "mongodb": {
            "connected": mongo_ok,
            "uri_set": bool(MONGO_URI),
            "status": "CONNECTED" if mongo_ok else ("URI_MISSING" if not MONGO_URI else "ERROR"),
        },
        "cloudinary": {
            "connected": _cloudinary_ready,
            "status": "CONNECTED" if _cloudinary_ready else ("NOT_CONFIGURED" if not CLOUDINARY_CLOUD else "PKG_MISSING"),
        },
    }
