"""Convenience launcher: `uv run python main.py` starts the API on port 8010."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8010, reload=True)
