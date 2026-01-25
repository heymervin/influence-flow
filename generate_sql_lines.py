import csv

csv_file = "influencers_data.csv"
user_id = "eff94470-6759-4490-9c94-8277546e8ea9"

columns = [
    "user_id", "name", "category", "status", 
    "avatar_url", "instagram_handle", "followers", 
    "tiktok_handle", "tiktok_followers", "source_url", 
    "bio"
]

print("DELETE FROM public.talents;")

with open(csv_file, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['Name'].replace("'", "''") 
        source_url = row['Page URL'].replace("'", "''")
        avatar_url = row['Image URL'].replace("'", "''")
        bio = row['Bio'].replace("'", "''")
        
        ig_handle = row['Instagram'].replace("'", "''")
        ig_followers = row['Instagram Followers'].replace("'", "''")
        
        tt_handle = row['TikTok'].replace("'", "''")
        tt_followers = row['TikTok Followers'].replace("'", "''")
        
        category = "Influencer"
        if "sports" in source_url: category = "Sports"
        elif "beauty" in source_url: category = "Beauty"
        elif "fashion" in source_url: category = "Fashion"
        elif "food" in source_url: category = "Food"
        elif "lifestyle" in source_url: category = "Lifestyle"
        
        status = "active"
        
        # Create individual INSERT statement
        val_str = f"('{user_id}', '{name}', '{category}', '{status}', '{avatar_url}', '{ig_handle}', '{ig_followers}', '{tt_handle}', '{tt_followers}', '{source_url}', '{bio}')"
        
        sql = f"INSERT INTO public.talents ({', '.join(columns)}) VALUES {val_str};"
        print(sql)
