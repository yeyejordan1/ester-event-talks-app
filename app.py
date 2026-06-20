import os
import re
import json
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from datetime import datetime

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "release_notes_cache.json"
CACHE_EXPIRY_SECONDS = 3600  # 1 hour

def strip_html_tags(html_content):
    """Utility to convert HTML content into plain text for searching/tweeting."""
    if not html_content:
        return ""
    # Replace links with text (URL)
    text = re.sub(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (\1)', html_content)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Replace HTML entities
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    # Normalise whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_release_notes():
    """Fetches and parses the BigQuery release notes XML feed."""
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        entries = []
        
        for entry in root.findall('atom:entry', ns):
            entry_title = entry.find('atom:title', ns)
            date_str = entry_title.text if entry_title is not None else "Unknown Date"
            
            entry_updated = entry.find('atom:updated', ns)
            updated_str = entry_updated.text if entry_updated is not None else ""
            
            entry_id = entry.find('atom:id', ns)
            id_str = entry_id.text if entry_id is not None else ""
            
            # Extract anchor link if possible
            link_elem = entry.find('atom:link', ns)
            link_href = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_elem = entry.find('atom:content', ns)
            html_content = content_elem.text if content_elem is not None else ""
            
            if not html_content:
                continue
                
            # Split html_content by <h3> headings
            headings = list(re.finditer(r'<h3>(.*?)</h3>', html_content))
            
            if not headings:
                # Fallback if no <h3> tags are found
                plain_text = strip_html_tags(html_content)
                entries.append({
                    "id": f"{id_str}-0",
                    "date": date_str,
                    "updated": updated_str,
                    "type": "General",
                    "content_html": html_content,
                    "content_text": plain_text,
                    "link": link_href
                })
            else:
                for idx, h_match in enumerate(headings):
                    h_type = h_match.group(1).strip()
                    
                    start_idx = h_match.end()
                    end_idx = headings[idx+1].start() if idx + 1 < len(headings) else len(html_content)
                    
                    item_html = html_content[start_idx:end_idx].strip()
                    plain_text = strip_html_tags(item_html)
                    
                    # Generate a clean anchor link using the date fragment if it's the default main page
                    anchor_fragment = date_str.replace(" ", "_").replace(",", "")
                    item_link = f"https://cloud.google.com/bigquery/docs/release-notes#{anchor_fragment}"
                    
                    entries.append({
                        "id": f"{id_str}-{idx}",
                        "date": date_str,
                        "updated": updated_str,
                        "type": h_type,
                        "content_html": item_html,
                        "content_text": plain_text,
                        "link": item_link
                    })
                    
        return {
            "success": True,
            "title": feed_title_text,
            "last_fetched": datetime.now().isoformat(),
            "notes": entries
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "notes": []
        }

def get_cached_notes(force_refresh=False):
    """Loads release notes from cache or fetches and caches them if expired."""
    now = time.time()
    
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            # Check cache age
            mtime = os.path.getmtime(CACHE_FILE)
            if now - mtime < CACHE_EXPIRY_SECONDS:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    # Make sure it's valid data
                    if cache_data.get("success"):
                        cache_data["from_cache"] = True
                        cache_data["cache_age_seconds"] = int(now - mtime)
                        return cache_data
        except Exception:
            # If reading cache fails, fall back to fetching
            pass
            
    # Fetch fresh data
    data = parse_release_notes()
    if data["success"]:
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error writing cache: {e}")
            
    data["from_cache"] = False
    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def api_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data = get_cached_notes(force_refresh)
    if data["success"]:
        return jsonify(data)
    else:
        return jsonify(data), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
