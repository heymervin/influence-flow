import csv
import json

csv_file = "influencers_data.csv"
user_id = "eff94470-6759-4490-9c94-8277546e8ea9"

# We first clear the table (optional, but requested "replace it")
# We will output the delete command first
print("DELETE FROM public.talents;")

columns = [
    "user_id", "name", "category", "status", 
    "avatar_url", "instagram_handle", "followers", 
    "tiktok_handle", "tiktok_followers", "source_url", 
    "bio"
]

sql_template = "INSERT INTO public.talents ({cols}) VALUES {vals};"

values = []

with open(csv_file, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Map CSV fields to DB columns
        # CSV: Name, Page URL, Image URL, Bio, Instagram, Instagram Followers, TikTok, TikTok Followers
        
        name = row['Name'].replace("'", "''") # Basic SQL escaping
        source_url = row['Page URL'].replace("'", "''")
        avatar_url = row['Image URL'].replace("'", "''")
        bio = row['Bio'].replace("'", "''")
        
        # Instagram
        ig_url = row['Instagram']
        ig_handle = ig_url # Store full URL as requested/implied or extract? 
        # Existing column is 'instagram_handle'. I'll populate it with the URL or handle. 
        # For now I will put the full URL because that's what we have and it's safer than guessing parsing logic unless I'm sure.
        # But 'handle' usually implies just the username. 
        # Let's try to be smart? No, safe is better. The CSV has URLs.
        ig_handle = ig_handle.replace("'", "''")
        
        ig_followers = row['Instagram Followers'].replace("'", "''")
        
        # TikTok
        tt_url = row['TikTok']
        tt_handle = tt_url.replace("'", "''")
        tt_followers = row['TikTok Followers'].replace("'", "''")
        
        # Category - Default to 'Influencer' or derive? 
        # The URL often has categories e.g. /talent/name-sports-fitness-influencer
        # We can try to extract from URL or just set default.
        category = "Influencer"
        if "sports" in source_url: category = "Sports"
        elif "beauty" in source_url: category = "Beauty"
        elif "fashion" in source_url: category = "Fashion"
        elif "food" in source_url: category = "Food"
        elif "lifestyle" in source_url: category = "Lifestyle"
        
        status = "active"
        
        val_str = f"('{user_id}', '{name}', '{category}', '{status}', '{avatar_url}', '{ig_handle}', '{ig_followers}', '{tt_handle}', '{tt_followers}', '{source_url}', '{bio}')"
        values.append(val_str)

# Join all values
# To avoid huge query limit issues (though 43 is small), we can chunk.
# But 43 should be fine.
all_vals = ",\n".join(values)

full_query = sql_template.format(cols=", ".join(columns), vals=all_vals)
print(full_query)
