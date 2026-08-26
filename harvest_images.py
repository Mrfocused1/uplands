#!/usr/bin/env python3
"""Politely crawl uplandsretail.co.uk and download every image into site/uplandsretail.co.uk/.
Run only after the temporary IP ban lifts. Keeps 4s between requests."""
import os, re, sys, time, urllib.request, urllib.error, ssl, posixpath

ROOT = "/Users/paulbridges/Desktop/Uplands/site/uplandsretail.co.uk"
BASE = "https://uplandsretail.co.uk"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,image/*,*/*;q=0.8"}
DELAY = 4
IMG_RE = re.compile(r"https?://uplandsretail\.co\.uk/wp-content/uploads/[^\s\"'()<>\\]+\.(?:jpe?g|png|webp|gif|svg)(?:\?[^\s\"'()<>\\]*)?", re.I)
PAGE_RE = re.compile(r"href=[\"'](https?://uplandsretail\.co\.uk/[^\"'#?]*/)[\"']", re.I)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE

def get(url, binary=False):
    time.sleep(DELAY)
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), context=ctx, timeout=40).read()
    return data if binary else data.decode("utf-8", "replace")

def local_path(url):
    rel = url[len(BASE):].split("?")[0]
    return os.path.join(ROOT, rel.lstrip("/"))

def save(url):
    p = local_path(url)
    if os.path.exists(p):
        return "HAVE"
    os.makedirs(os.path.dirname(p), exist_ok=True)
    try:
        data = get(url, binary=True)
        open(p, "wb").write(data)
        print(f"GOT  {url} ({len(data)}b)")
        return True
    except Exception as e:
        print(f"FAIL {url} -> {e}")
        return False

# seed pages: homepage + known sections + sitemaps if available
pages = {BASE + "/" + s for s in [
    "", "projects/", "news/", "clients/", "people/", "our-story/", "careers/",
    "sustainability/", "insurance/", "contact/", "accreditations-awards/",
    "policies/", "mission-statement/", "cco-policy-statement/",
]}
for sm in ["sitemap.xml", "wp-sitemap.xml", "sitemap_index.xml"]:
    try:
        xml = get(BASE + "/" + sm)
        pages |= set(re.findall(r"<loc>(https?://uplandsretail\.co\.uk/[^<]*)</loc>", xml))
        print(f"SITEMAP OK: {sm}")
        break
    except Exception:
        pass

seen, queue = set(), list(pages)
while queue:
    page = queue.pop()
    if page in seen:
        continue
    seen.add(page)
    try:
        html = get(page)
    except Exception as e:
        print(f"SKIP PAGE {page} -> {e}")
        continue
    print(f"CRAWL {page}")
    for m in IMG_RE.findall(html):
        save(m)
    if len(seen) < 400:
        for link in PAGE_RE.findall(html):
            if link not in seen and "/wp-" not in link and "/feed" not in link:
                queue.append(link)

total = sum(len(f) for f in [[os.path.join(d, x) for x in fs if re.search(r"\.(jpe?g|png|webp|gif|svg)$", x, re.I)] for d, _, fs in os.walk(os.path.join(ROOT, "wp-content/uploads"))])
print(f"DONE. images under uploads/: {sum(len(fs) for _,_,fs in os.walk(os.path.join(ROOT,'wp-content/uploads')))}")
