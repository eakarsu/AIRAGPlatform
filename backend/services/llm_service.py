import time
from openai import OpenAI
from config import settings


def get_client() -> OpenAI:
    return OpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
    )


def chat_with_context(
    query: str,
    context_chunks: list[str],
    conversation_history: list[dict] = None,
    source_info: list[dict] = None,
) -> dict:
    client = get_client()

    context_text = ""
    if context_chunks:
        context_text = "\n\n---\n\n".join(
            [f"[Source {i+1}]: {chunk}" for i, chunk in enumerate(context_chunks)]
        )

    system_prompt = """You are an intelligent AI assistant for a document knowledge base platform.
You help users understand and extract information from their uploaded documents.

When answering questions:
- Use the provided context to give accurate, relevant answers
- Reference specific sources when possible (e.g., "According to Source 1...")
- If the context doesn't contain enough information, say so honestly
- Format your responses with clear structure using markdown
- Be concise but thorough"""

    if context_text:
        system_prompt += f"\n\nRelevant document context:\n{context_text}"

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        for msg in conversation_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": query})

    start_time = time.time()
    response = client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=messages,
        max_tokens=2000,
        temperature=0.7,
    )
    elapsed = time.time() - start_time

    answer = response.choices[0].message.content
    return {
        "answer": answer,
        "model_used": settings.OPENROUTER_MODEL,
        "response_time": round(elapsed, 2),
        "tokens_used": response.usage.total_tokens if response.usage else None,
    }


def summarize_document(content: str, title: str = "") -> dict:
    client = get_client()

    prompt = f"""Please provide a comprehensive summary of the following document.

Document Title: {title}

Document Content:
{content[:8000]}

Provide a well-structured summary that includes:
1. **Main Topic**: What is this document about?
2. **Key Points**: List the most important points
3. **Details**: Provide relevant details and findings
4. **Conclusion**: Summarize the main takeaways

Format your response in clear, readable markdown."""

    start_time = time.time()
    response = client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": "You are a document analysis expert. Provide clear, structured summaries."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2000,
        temperature=0.5,
    )
    elapsed = time.time() - start_time

    return {
        "summary": response.choices[0].message.content,
        "model_used": settings.OPENROUTER_MODEL,
        "response_time": round(elapsed, 2),
    }


def smart_search_answer(query: str, search_results: list[dict]) -> dict:
    client = get_client()

    context = "\n\n".join(
        [f"[From: {r['document_title']}]\n{r['chunk_text']}" for r in search_results]
    )

    prompt = f"""Based on the following search results from a document knowledge base,
provide a comprehensive answer to the user's query.

Search Query: {query}

Search Results:
{context}

Provide a clear, well-structured answer that:
- Synthesizes information from multiple sources
- References which documents the information comes from
- Highlights the most relevant findings
- Uses markdown formatting for readability"""

    start_time = time.time()
    response = client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": "You are a knowledge base search assistant. Synthesize search results into clear answers."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=2000,
        temperature=0.5,
    )
    elapsed = time.time() - start_time

    return {
        "answer": response.choices[0].message.content,
        "model_used": settings.OPENROUTER_MODEL,
        "response_time": round(elapsed, 2),
    }
