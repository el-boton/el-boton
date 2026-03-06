import os
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Load the app icon for reference
icon = Image.open("/home/lee/apps/boton/assets/images/icon.png")

prompt = """Create a Google Play Store feature graphic for an emergency safety app called "EL BOTON" (The Button).

EXACT REQUIREMENTS:
- Landscape orientation, wide banner format (approximately 2:1 ratio)
- Clean, professional, modern design

DESIGN SPECIFICATIONS:
- Deep dark navy-black background (#0A0E14 to #050507 gradient)
- On the LEFT side: A large, glowing red emergency button (matching the app icon I'm providing - a bold red circle with a subtle curved line/highlight at top). The button should have a dramatic red glow/aura radiating outward against the dark background, like an emergency signal.
- On the RIGHT side: The app name "EL BOTON" in large, bold white text (clean sans-serif, uppercase). Below it in smaller text: "Your Safety Circle" in a muted gray or soft gold (#d4a574) color.
- Subtle concentric rings or signal waves emanating from the button to suggest alerting/broadcasting
- The overall feel should be: premium, tactical, urgent but trustworthy - like high-end emergency equipment
- No busy patterns or clutter - keep it minimal and impactful
- The red button should be the visual hero, immediately drawing the eye

COLOR PALETTE:
- Background: Deep black/navy (#050507 to #0A0E14)
- Button: Signal red (#ef4444 / #dc2626) with glowing edges
- Text: Clean white (#fafafa) for title
- Subtitle: Warm gold (#d4a574) or light gray
- Accent glow: Red (#f87171) radiating from button

STYLE: Modern, minimalist, dark premium aesthetic. Think high-end safety tech product. Professional app store quality."""

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt, icon],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="21:9",
            image_size="2K"
        ),
    ),
)

output_path = "/home/lee/apps/boton/assets/store/feature_graphic.png"

for part in response.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        # Save to temp file first, then resize with PIL
        temp_path = "/tmp/feature_graphic_raw.jpg"
        img = part.as_image()
        img.save(temp_path)

        # Open with PIL and resize to exact Play Store requirements: 1024x500
        from PIL import Image as PILImage
        pil_img = PILImage.open(temp_path)
        pil_img = pil_img.resize((1024, 500), PILImage.LANCZOS)
        pil_img.save(output_path, format="PNG")
        print(f"Feature graphic saved to {output_path}")
        print(f"Size: {pil_img.size}")
