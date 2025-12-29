import webview
import threading
import uvicorn
import base64
import os
from app.main import app  # Import the FastAPI app

class JsApi:
    def save_file(self, filename, content_base64):
        try:
            # Decode base64 content
            content = base64.b64decode(content_base64)
            
            # Open save dialog
            file_types = ('PDF Files (*.pdf)', 'All Files (*.*)')
            # Handle deprecation of SAVE_DIALOG in newer pywebview versions
            dialog_type = getattr(webview, 'FileDialog', None)
            save_mode = dialog_type.SAVE if dialog_type else webview.SAVE_DIALOG
            
            save_path = webview.windows[0].create_file_dialog(
                save_mode, 
                directory='/', 
                save_filename=filename,
                file_types=file_types
            )
            
            if save_path:
                # If user selected a path, write the file
                # save_path is typically a string, but sometimes a tuple/list depending on OS/version, handle carefully
                if isinstance(save_path, (list, tuple)):
                    save_path = save_path[0]
                    
                with open(save_path, 'wb') as f:
                    f.write(content)
                return {'success': True, 'path': save_path}
            return {'success': False, 'reason': 'cancelled'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

def start_server():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")  # Use port 8000 to match main.py

if __name__ == "__main__":
    # Start FastAPI server in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait a moment for server to start
    import time
    time.sleep(1)

    # Initialize API
    js_api = JsApi()

    # Open PyWebView window pointing to the root URL which serves index.html
    webview.create_window(
        'Blue Gold Investment',
        'http://127.0.0.1:8000/',  # Point to root URL where index.html is served
        width=1400,
        height=900,
        resizable=True,
        fullscreen=False,
        js_api=js_api
    )
    webview.start()