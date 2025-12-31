# Installing pdf2htmlEX via Docker (Recommended for macOS)

Due to compatibility issues between pdf2htmlEX and newer Poppler versions from Homebrew, using Docker is the most reliable approach on macOS.

## Quick Setup

1. **Ensure Docker is running:**
   ```bash
   docker --version
   ```

2. **Build the Docker image** (this builds pdf2htmlEX with compatible dependencies):
   ```bash
   cd backend
   docker build -f Dockerfile.pdf2htmlex -t pdf2htmlex:local .
   ```
   
   **Note:** This may take 30-60 minutes as it builds Poppler and Fontforge from source. The build is successful when you see "exporting to image" and "done" messages.

3. **Verify the build worked:**
   ```bash
   docker run --rm pdf2htmlex:local pdf2htmlEX --version
   ```
   
   You should see the pdf2htmlEX version number.

3. **Set environment variable:**
   
   Add to your `backend/.env` file:
   ```
   PDF2HTMLEX_USE_DOCKER=true
   ```

4. **Test the installation:**
   ```bash
   docker run --rm pdf2htmlex:local pdf2htmlEX --version
   ```

## Using the Docker Image

Once built, the backend will automatically use Docker when `PDF2HTMLEX_USE_DOCKER=true` is set. The `/latex/render-html` endpoint will use the Docker container to convert PDFs to HTML.

## Troubleshooting

- **Docker build fails:** Check that you have enough disk space (the build requires several GB)
- **Permission errors:** Make sure Docker has permission to access volumes
- **Slow builds:** The build process is slow because it compiles Poppler and Fontforge from source - this is normal

