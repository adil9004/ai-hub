def web_search(query: str) -> list:
    """Search DuckDuckGo for a query and return top 5 results."""
    import time
    from ddgs import DDGS

    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            with DDGS() as ddgs:
                raw_results = ddgs.text(query, max_results=5, region="in-en")
            formatted = []
            for r in raw_results:
                title = r.get("title")
                url = r.get("href")
                snippet = r.get("body")
                formatted.append({"title": title, "url": url, "snippet": snippet})
            return formatted
        except Exception as e:
            print(f"web_search error for '{query}' (attempt {attempt + 1}/{max_attempts}): {e}")
            if attempt < max_attempts - 1:
                time.sleep(2)
    return []


def fetch_page(url: str) -> str:
    """Fetch visible text from a URL, trimmed to first 3000 characters."""
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError as e:
        return f"Error: Missing required package - {e}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise an exception for bad status codes
        soup = BeautifulSoup(response.text, 'html.parser')
        # Get visible text
        text = soup.get_text()
        # Clean up whitespace: split and rejoin to remove excessive whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        # Trim to first 3000 characters
        if len(text) > 3000:
            text = text[:3000]
        return text
    except Exception as e:
        return f"Error: {e}"
