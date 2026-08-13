import logging
import os
from typing import Any, Dict, List, Optional, Sequence

logger = logging.getLogger(__name__)


class AIService:
    """Lightweight RAG wrapper using OpenAI and Chroma.

    If required dependencies or `OPENAI_API_KEY` are missing, the service remains disabled.
    This implementation avoids LangChain vectorstore wrappers and uses Chroma directly.
    """

    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        k: int = 3,
        temperature: float = 0.2,
        model: str = "gpt-4o",
        embedding_model: str = "text-embedding-3-small",
        collection_name: str = "docfetcher_collection",
    ):
        self.enabled = False
        self._collection = None
        self._openai_client = None
        self._k = k
        self._model = model
        self._temperature = temperature

        if "OPENAI_API_KEY" not in os.environ:
            logger.warning("OPENAI_API_KEY not set; AIService disabled")
            return

        try:
            from chromadb import PersistentClient
            from chromadb.utils.embedding_functions.openai_embedding_function import (
                OpenAIEmbeddingFunction,
            )
            from openai import OpenAI as OpenAIClient
        except Exception as e:
            logger.warning("Required AI dependencies missing: %s", e)
            return

        try:
            self.embedding_function = OpenAIEmbeddingFunction(
                api_key=os.environ["OPENAI_API_KEY"],
                model_name=embedding_model,
            )
            self._client = PersistentClient(path=persist_directory)
            self._collection = self._client.get_or_create_collection(
                name=collection_name,
                embedding_function=self.embedding_function,
            )
            self._openai_client = OpenAIClient(api_key=os.environ["OPENAI_API_KEY"])
            self.enabled = True
        except Exception as e:
            logger.exception("Failed to initialize AIService: %s", e)
            self.enabled = False

    def add_texts(
        self,
        texts: Sequence[str],
        ids: Optional[Sequence[str]] = None,
        metadatas: Optional[Sequence[Dict[str, Any]]] = None,
    ) -> bool:
        """Add text documents to the Chroma collection."""
        if not self.enabled or self._collection is None:
            logger.warning("AIService is disabled or not initialized")
            return False

        if ids is None:
            ids = [str(i) for i in range(1, len(texts) + 1)]

        if len(ids) != len(texts):
            raise ValueError("The number of ids must match the number of texts.")

        try:
            self._collection.add(
                ids=list(ids),
                documents=list(texts),
                metadatas=list(metadatas) if metadatas is not None else None,
            )
            return True
        except Exception as e:
            logger.exception("Failed to add texts to Chroma collection: %s", e)
            return False

    def ask_question(self, user_query: str) -> Optional[str]:
        """Query the RAG system and return an answer string."""
        if not self.enabled or self._collection is None or self._openai_client is None:
            logger.warning("AIService is disabled or not initialized")
            return None

        try:
            results = self._collection.query(
                query_texts=[user_query],
                n_results=self._k,
                include=["documents", "metadatas", "distances"],
            )
            context = self._build_context(results)
            return self._run_openai_chat(user_query, context)
        except Exception as e:
            logger.exception("Error while running RAG query: %s", e)
            return None

    def _build_context(self, query_result: Any) -> str:
        documents = []
        metadatas = []
        distances = []

        if isinstance(query_result, dict):
            documents = query_result.get("documents", [[]])
            metadatas = query_result.get("metadatas", [[]])
            distances = query_result.get("distances", [[]])
        else:
            documents = getattr(query_result, "documents", [[]])
            metadatas = getattr(query_result, "metadatas", [[]])
            distances = getattr(query_result, "distances", [[]])

        documents = documents[0] if documents and isinstance(documents[0], list) else documents
        metadatas = metadatas[0] if metadatas and isinstance(metadatas[0], list) else metadatas
        distances = distances[0] if distances and isinstance(distances[0], list) else distances

        if not documents:
            return ""

        context_lines: List[str] = []
        for index, document in enumerate(documents):
            metadata = metadatas[index] if metadatas and index < len(metadatas) else None
            distance = distances[index] if distances and index < len(distances) else None
            context_lines.append(f"Document {index + 1}:")
            context_lines.append(str(document))
            if metadata:
                context_lines.append(f"Metadata: {metadata}")
            if distance is not None:
                context_lines.append(f"Distance: {distance}")
            context_lines.append("")

        return "\n".join(context_lines).strip()

    def _run_openai_chat(self, question: str, context: str) -> str:
        system_message = (
            "You are a helpful assistant. Answer the user's question using only the provided "
            "context. If the context does not contain the answer, say that you do not know."
        )
        user_message = question
        if context:
            user_message = f"Context:\n{context}\n\nQuestion:\n{question}"

        response = self._openai_client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            temperature=self._temperature,
        )

        return self._extract_text(response)

    def _extract_text(self, response: Any) -> str:
        if response is None:
            return ""

        choices = []
        if isinstance(response, dict):
            choices = response.get("choices", [])
        else:
            choices = getattr(response, "choices", [])

        if not choices:
            return ""

        first_choice = choices[0]
        message = None
        if isinstance(first_choice, dict):
            message = first_choice.get("message") or first_choice.get("text")
        else:
            message = getattr(first_choice, "message", None) or getattr(first_choice, "text", None)

        if isinstance(message, dict):
            return message.get("content", "") or ""

        if hasattr(message, "content"):
            return getattr(message, "content", "") or ""

        return str(message or "")


__all__ = ["AIService"]
