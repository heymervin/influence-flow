import requests
from bs4 import BeautifulSoup
import csv
import re
import time
from urllib.parse import urljoin

base_url = "https://www.liquorice.co.nz"
main_list_url = "https://www.liquorice.co.nz/influencers-nz"

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def clean_followers(text):
    text = text.strip()
    if re.search(r'^[\d,]+(\.\d+)?[kKmM]?$', text):
        return text
    return ""

print("Step 1: Scraping main list for URLs and Images...")
response = requests.get(main_list_url, headers=headers)
soup = BeautifulSoup(response.content, 'html.parser')

profiles_to_scrape = {} # URL -> Image URL

# Find all links that contain images
for link in soup.find_all('a', href=True):
    href = link['href']
    full_url = urljoin(base_url, href)
    
    # Filter for likely profile links
    # Must be on the same domain
    if not full_url.startswith(base_url): continue
    
    # Exclude common non-profile pages
    path = full_url.replace(base_url, "")
    if path in ['', '/', '/influencers-nz', '/contact', '/who-are-we', '/how-influencer-marketing-works']: continue
    if 'mailto:' in href or 'tel:' in href: continue

    # Check if inside contact/nav/footer areas (improved check)
    # Convert parents generator to list of tag names/classes to check
    is_nav_footer = False
    for p in link.parents:
        if p.name in ['header', 'footer', 'nav']:
            is_nav_footer = True
            break
        if p.get('id') in ['header', 'footer', 'mobileNav']:
            is_nav_footer = True
            break
    if is_nav_footer: continue

    # Check for image inside
    img = link.find('img')
    if img:
        img_src = img.get('data-src') or img.get('src')
        if img_src:
            if img_src.startswith('//'):
                img_src = 'https:' + img_src
            
            profiles_to_scrape[full_url] = img_src
        # print(f"Found profile: {full_url} with image {img_src}")

print(f"Found {len(profiles_to_scrape)} profiles to process.")

data = []

print("Step 2: Scraping individual profiles...")
for i, (url, image_url) in enumerate(profiles_to_scrape.items()):
    print(f"[{i+1}/{len(profiles_to_scrape)}] Scraping: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"Failed to retrieve {url}")
            continue
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Name
        name_tag = soup.find('h1')
        name = name_tag.get_text(strip=True) if name_tag else "Unknown"
        
        # Bio
        bio_text = ""
        content_divs = soup.find_all(class_='sqs-html-content')
        paragraphs = []
        for div in content_divs:
            for p in div.find_all('p'):
                text = p.get_text(strip=True)
                if not text: continue
                upper_text = text.upper()
                if "TIKTOK" in upper_text or "INSTAGRAM" in upper_text: continue
                if "FOLLOWERS" in upper_text or "CONTACT" in upper_text: continue
                if re.match(r'^[\d,.]+[kKmM]?$', text): continue
                paragraphs.append(text)
        bio_text = " ".join(paragraphs[:5])

        # Socials
        ig_handle = ""
        ig_followers = ""
        tt_handle = ""
        tt_followers = ""
        
        all_links = soup.find_all('a', href=True)
        for link in all_links:
            href = link['href'].lower()
            
            # Instagram
            if "instagram.com" in href:
                 if not ig_followers:
                     found_followers = ""
                     
                     next_node = link.next_sibling
                     if next_node and isinstance(next_node, str):
                         cleaned = clean_followers(next_node)
                         if cleaned: found_followers = cleaned
                     
                     if not found_followers and link.parent:
                         for sibling in link.parent.find_next_siblings():
                            if hasattr(sibling, 'get_text'):
                                stext = sibling.get_text(strip=True)
                            else:
                                stext = str(sibling).strip() 
                            cleaned = clean_followers(stext)
                            if cleaned: 
                                found_followers = cleaned
                                break
                            if len(stext) > 20: break
                     
                     if found_followers:
                         ig_followers = found_followers
                         ig_handle = link['href'] 
                     elif not ig_handle:
                         ig_handle = link['href']

            # TikTok
            if "tiktok.com" in href:
                 if not tt_followers:
                     found_followers = ""
                     next_node = link.next_sibling
                     if next_node and isinstance(next_node, str):
                         cleaned = clean_followers(next_node)
                         if cleaned: found_followers = cleaned
                     
                     if not found_followers and link.parent:
                         for sibling in link.parent.find_next_siblings():
                            if hasattr(sibling, 'get_text'):
                                stext = sibling.get_text(strip=True)
                            else:
                                stext = str(sibling).strip()
                            cleaned = clean_followers(stext)
                            if cleaned: 
                                found_followers = cleaned
                                break
                            if len(stext) > 20: break
                     
                     if found_followers:
                         tt_followers = found_followers
                         tt_handle = link['href']
                     elif not tt_handle:
                         tt_handle = link['href']

        record = {
            "Name": name,
            "Page URL": url,
            "Bio": bio_text,
            "Instagram": ig_handle,
            "Instagram Followers": ig_followers,
            "TikTok": tt_handle,
            "TikTok Followers": tt_followers,
            "Image URL": image_url
        }
        data.append(record)
        time.sleep(0.5)

    except Exception as e:
        print(f"Error scraping {url}: {e}")

# Save to CSV
csv_file = "influencers_data.csv"
fieldnames = ["Name", "Page URL", "Image URL", "Bio", "Instagram", "Instagram Followers", "TikTok", "TikTok Followers"]

with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    for row in data:
        writer.writerow(row)

print(f"Successfully scraped {len(data)} profiles. Saved to {csv_file}")
