"""
Backup of the example AI service. Keep this file safe — delete if unused.

Updated example to use current LangChain v1 imports and a safe initialization path.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AIService:
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        k: int = 3,
        temperature: float = 0.2,
        model_name: str = "gpt-4o",
        embedding_model: str = "text-embedding-3-small",
    ):
        self.enabled = False
        self._qa = None

        if "OPENAI_API_KEY" not in os.environ:
            logger.warning("OPENAI_API_KEY not set; AIService disabled")
            return

        try:
            from langchain.embeddings.openai import OpenAIEmbeddings
            from langchain.chat_models import ChatOpenAI
            from langchain.vectorstores import Chroma
            from langchain.chains import RetrievalQA
            from langchain.prompts.chat import (
                ChatPromptTemplate,
                SystemMessagePromptTemplate,
                HumanMessagePromptTemplate,
            )
        except Exception as e:
            logger.warning("Required LangChain imports failed: %s", e)
            return

        try:
            self.embeddings = OpenAIEmbeddings(model=embedding_model)
            self.vector_store = Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embeddings,
            )
            self.retriever = self.vector_store.as_retriever(search_kwargs={"k": k})
            self.llm = ChatOpenAI(model_name=model_name, temperature=temperature)

            system = SystemMessagePromptTemplate.from_template(
                "Answer the user's question based strictly on the following context:\n\n{context}"
            )
            human = HumanMessagePromptTemplate.from_template("{input}")
            prompt = ChatPromptTemplate.from_messages([system, human])

            self._qa = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.retriever,
                chain_type_kwargs={"prompt": prompt},
            )

            self.enabled = True
        except Exception as e:
            logger.exception("Failed to initialize AIService: %s", e)
            self.enabled = False

    def ask_question(self, user_query: str) -> Optional[str]:
        if not self.enabled or self._qa is None:
            logger.warning("AIService is disabled or not initialized")
            return None

        try:
            return self._qa.run(user_query)
        except Exception as e:
            logger.exception("Error while running RAG query: %s", e)
            return None


__all__ = ["AIService"]
