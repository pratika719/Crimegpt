from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DIMENSIONS = 384

app = FastAPI(title="CrimeGPT Embedding Service")

model = SentenceTransformer(MODEL_NAME)


class EmbedRequest(BaseModel):
    texts: List[str] = Field(min_length=1, max_length=128)


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    embeddings: List[List[float]]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dimensions": DIMENSIONS,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    try:
        cleaned_texts = [text.strip() for text in request.texts if text.strip()]

        if not cleaned_texts:
            raise HTTPException(status_code=400, detail="No valid text provided.")

        embeddings = model.encode(
            cleaned_texts,
            normalize_embeddings=True,
        )

        return {
            "model": MODEL_NAME,
            "dimensions": DIMENSIONS,
            "embeddings": embeddings.tolist(),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {str(error)}",
        )