from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from .models import Job, STATUSES, SOURCES
# WORK IN PROGRESS — Profile, QATemplate, QAHistory imported when autofill is re-enabled
# from .models import Job, Profile, QATemplate, QAHistory, STATUSES, SOURCES

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="backend/static"), name="static")
templates = Jinja2Templates(directory="backend/templates")


# ── helpers ──────────────────────────────────────────────────────────────────

def job_to_dict(job: Job) -> dict:
    return {
        "id": job.id,
        "company": job.company,
        "role": job.role,
        "location": job.location,
        "url": job.url,
        "source": job.source,
        "status": job.status,
        "notes": job.notes,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


# WORK IN PROGRESS — profile and Q&A helpers removed until autofill is complete
# def profile_to_dict(p): ...
# def qa_template_to_dict(t): ...
# def qa_history_to_dict(h): ...


def status_counts(jobs: list[Job]) -> dict:
    counts = {s: 0 for s in STATUSES}
    for job in jobs:
        if job.status in counts:
            counts[job.status] += 1
    return counts


# ── dashboard pages ───────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def index(request: Request, filter: str = "all", db: Session = Depends(get_db)):
    all_jobs = db.query(Job).order_by(Job.updated_at.desc()).all()
    counts = status_counts(all_jobs)
    jobs = [j for j in all_jobs if j.status == filter] if filter != "all" and filter in STATUSES else all_jobs
    return templates.TemplateResponse(request, "index.html", {
        "jobs": jobs,
        "total": len(all_jobs),
        "counts": counts,
        "statuses": STATUSES,
        "sources": SOURCES,
        "active_filter": filter,
    })


# WORK IN PROGRESS — profile and answers pages removed until autofill is complete
# @app.get("/profile") -> profile.html
# @app.get("/answers") -> answers.html


# ── jobs API ──────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    company: str
    role: str
    location: str | None = None
    url: str
    source: str = "other"


class JobUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    location: str | None = None
    url: str | None = None
    source: str | None = None
    status: str | None = None
    notes: str | None = None


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/jobs")
def list_jobs(url: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(Job).order_by(Job.updated_at.desc())
    if url:
        q = q.filter(Job.url == url)
    return [job_to_dict(j) for j in q.all()]


@app.post("/api/jobs")
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    existing = db.query(Job).filter(Job.url == payload.url).first()
    if existing:
        return job_to_dict(existing)
    job = Job(
        company=payload.company, role=payload.role, location=payload.location,
        url=payload.url, source=payload.source if payload.source in SOURCES else "other",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_dict(job)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    return job_to_dict(job)


@app.patch("/api/jobs/{job_id}", response_class=HTMLResponse)
def update_job(job_id: int, request: Request, payload: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return templates.TemplateResponse(request, "partials/job_row.html", {
        "job": job, "statuses": STATUSES, "sources": SOURCES,
    })


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(job)
    db.commit()
    return Response(status_code=200)


# WORK IN PROGRESS — profile API, Q&A templates API, and Q&A history API
# removed until autofill feature is complete.
# See git history or original prompt for full implementation.
