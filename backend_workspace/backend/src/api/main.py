import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

# Load environment variables from .env if present
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")  # not used; only for direct postgres access

# Check required env vars
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables are required.")

SUPABASE_API_BASE = f"{SUPABASE_URL}/rest/v1"
SUPABASE_TABLE = "notes"


# Pydantic models
class NoteBase(BaseModel):
    title: Optional[str] = Field("", description="Note title, may be blank")
    content: Optional[str] = Field("", description="Note content, may be blank")


class NoteCreate(NoteBase):
    pass


class NoteUpdate(NoteBase):
    pass


class NoteInDB(NoteBase):
    id: int = Field(..., description="Primary key of the note")
    updated_at: Optional[str] = Field(None, description="Last updated timestamp (ISO8601)")


# OpenAPI metadata
tags_metadata = [
    {
        "name": "notes",
        "description": "CRUD and search operations for notes stored in Supabase.",
    }
]

app = FastAPI(
    title="Notemaster Notes API",
    description="RESTful API for Notemaster notes app using Supabase as backend datastore.\n"
                "All endpoints require appropriate Supabase service key access.",
    version="1.0.0",
    openapi_tags=tags_metadata,
)

# Allow CORS for frontend origin (set to "*" for dev; restrict in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Utility function for Supabase REST API
def supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


# PUBLIC_INTERFACE
@app.get("/", tags=["health"], summary="Health check", response_model=dict)
def health_check():
    """
    Health endpoint to check API status.
    Returns a simple JSON object with message.
    """
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.get("/notes", response_model=List[NoteInDB], tags=["notes"], summary="List all notes", description="Get all notes, sorted by updated_at (descending)")
async def list_notes():
    """
    Returns all notes from the Supabase 'notes' table, ordered by last updated.
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}?order=updated_at.desc"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=supabase_headers())
        r.raise_for_status()
        return r.json()


# PUBLIC_INTERFACE
@app.get(
    "/notes/search",
    response_model=List[NoteInDB],
    tags=["notes"],
    summary="Search notes",
    description="Search notes by text in title or content."
)
async def search_notes(q: str = Query(..., description="Search term (matches in title or content)")):
    """
    Search for notes whose title or content contain the given substring (case-insensitive).
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}"
    # RLS policies may need to be unrestricted for anon or service roles if used
    filter_ = f"or(title.ilike.*{q}*,content.ilike.*{q}*)"
    params = {"or": f"title.ilike.*{q}*,content.ilike.*{q}*", "order": "updated_at.desc"}
    async with httpx.AsyncClient() as client:
        # Manually construct query string for or filter
        r = await client.get(f"{url}?order=updated_at.desc&or=title.ilike.*{q}*,content.ilike.*{q}*", headers=supabase_headers())
        r.raise_for_status()
        return r.json()


# PUBLIC_INTERFACE
@app.get(
    "/notes/{note_id}",
    response_model=NoteInDB,
    tags=["notes"],
    summary="Get note by ID"
)
async def get_note(note_id: int):
    """
    Retrieve a single note by its id.
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}?id=eq.{note_id}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=supabase_headers())
        r.raise_for_status()
        results = r.json()
        if not results:
            raise HTTPException(status_code=404, detail="Note not found")
        return results[0]


# PUBLIC_INTERFACE
@app.post(
    "/notes",
    response_model=NoteInDB,
    status_code=status.HTTP_201_CREATED,
    tags=["notes"],
    summary="Create a new note"
)
async def create_note(note: NoteCreate):
    """
    Create a new note in Supabase.
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}"
    async with httpx.AsyncClient() as client:
        r = await client.post(url, headers=supabase_headers(), json=note.dict())
        r.raise_for_status()
        created = r.json()
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create note")
        return created[0]


# PUBLIC_INTERFACE
@app.put(
    "/notes/{note_id}",
    response_model=NoteInDB,
    tags=["notes"],
    summary="Update a note"
)
async def update_note(note_id: int, updated: NoteUpdate):
    """
    Edit a note in Supabase by id.
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}?id=eq.{note_id}"
    async with httpx.AsyncClient() as client:
        r = await client.patch(url, headers=supabase_headers(), json=updated.dict())
        r.raise_for_status()
        results = r.json()
        if not results:
            raise HTTPException(status_code=404, detail="Note not found or not updated")
        return results[0]


# PUBLIC_INTERFACE
@app.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["notes"],
    summary="Delete a note"
)
async def delete_note(note_id: int):
    """
    Delete a note by id from Supabase.
    """
    url = f"{SUPABASE_API_BASE}/{SUPABASE_TABLE}?id=eq.{note_id}"
    async with httpx.AsyncClient() as client:
        r = await client.delete(url, headers=supabase_headers())
        if r.status_code == 204:
            return
        elif r.status_code == 404 or not r.json():
            raise HTTPException(status_code=404, detail="Note not found")
        r.raise_for_status()


# PUBLIC_INTERFACE
@app.get(
    "/openapi_tags",
    tags=["meta"],
    summary="List API tags"
)
def get_openapi_tags():
    """
    List all OpenAPI tag entries for documentation/discovery.
    """
    return tags_metadata

